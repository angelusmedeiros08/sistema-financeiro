import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { EntidadeExistente, TipoEntidadeImportacao } from "./tipos";
import { criarCategoria } from "@/lib/contabil/categorias";
import { buscarContaGenericaPorTipo } from "@/lib/contabil/plano-contas";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

export type EntidadesExistentes = {
  categorias: (EntidadeExistente & { tipo: TipoCategoria })[];
  centrosCusto: EntidadeExistente[];
  pessoas: EntidadeExistente[];
  formasPagamento: EntidadeExistente[];
};

// Busca tudo já cadastrado no tenant, pras 4 dimensões que a planilha pode
// referenciar por nome — base pra resolverCorrespondencia() (fuzzy.ts) rodar
// no cliente, valor por valor, na tela de revisão de entidades.
export async function buscarEntidadesExistentes(supabase: Cliente, tenantId: string): Promise<EntidadesExistentes> {
  const [{ data: categorias }, { data: centrosCusto }, { data: pessoas }, { data: formasPagamento }] = await Promise.all([
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("tenant_id", tenantId),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true),
    supabase.from("pessoas").select("id, nome").eq("tenant_id", tenantId),
    supabase.from("formas_pagamento").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true),
  ]);

  return {
    categorias: categorias ?? [],
    centrosCusto: centrosCusto ?? [],
    pessoas: pessoas ?? [],
    formasPagamento: formasPagamento ?? [],
  };
}

export type EntidadeNova = { tipo: TipoEntidadeImportacao; nome: string; tipoCategoria?: TipoCategoria; documento?: string };

// Cria os poucos registros novos aprovados na tela de revisão (Seção 6/8 —
// volume baixo, sequencial, sem RPC atômica própria). Pessoa nova nasce com
// os dois perfis: a planilha não distingue cliente de fornecedor por linha
// (o tipo vem só da categoria), e uma mesma pessoa pode legitimamente
// aparecer em ambos os papéis ao longo do histórico importado.
export async function criarEntidadeAprovada(supabase: Cliente, tenantId: string, entidade: EntidadeNova): Promise<{ id: string } | { erro: string }> {
  switch (entidade.tipo) {
    case "categoria": {
      if (!entidade.tipoCategoria) return { erro: `Informe se "${entidade.nome}" é Receita ou Despesa.` };
      const contaContabilId = await buscarContaGenericaPorTipo(supabase, { tenantId, tipo: entidade.tipoCategoria });
      if (!contaContabilId) return { erro: "Conta contábil genérica não encontrada para essa categoria." };
      return criarCategoria(supabase, { tenantId, nome: entidade.nome, tipo: entidade.tipoCategoria, contaContabilId });
    }
    case "centro_custo": {
      const { data, error } = await supabase.from("centros_custo").insert({ tenant_id: tenantId, nome: entidade.nome }).select("id").single();
      if (error || !data) return { erro: error?.message ?? "Falha ao criar centro de custo." };
      return { id: data.id };
    }
    case "pessoa": {
      const { data, error } = await supabase
        .from("pessoas")
        .insert({ tenant_id: tenantId, nome: entidade.nome, documento: entidade.documento?.trim() || null, perfis: ["CLIENTE", "FORNECEDOR"] })
        .select("id")
        .single();
      if (error || !data) return { erro: error?.message ?? "Falha ao criar pessoa." };
      return { id: data.id };
    }
    case "forma_pagamento": {
      const { data, error } = await supabase.from("formas_pagamento").insert({ tenant_id: tenantId, nome: entidade.nome }).select("id").single();
      if (error || !data) return { erro: error?.message ?? "Falha ao criar forma de pagamento." };
      return { id: data.id };
    }
  }
}
