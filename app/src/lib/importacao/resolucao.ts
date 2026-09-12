import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { EntidadeExistente, TipoEntidadeImportacao } from "./tipos";
import { criarCategoria } from "@/lib/contabil/categorias";
import { buscarContaGenericaPorTipo } from "@/lib/contabil/plano-contas";
import { validarCpfCnpj } from "@/lib/pagamentos/cpf-cnpj";
import type { PessoaExistente } from "@/lib/pessoas/importacao/correspondencia";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];
type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];

export type EntidadesExistentes = {
  categorias: (EntidadeExistente & { tipo: TipoCategoria })[];
  centrosCusto: EntidadeExistente[];
  // Tipo mais rico que EntidadeExistente (documento/email/telefone) —
  // reaproveita o mesmo formato do import de Clientes/Fornecedores, já que
  // a correspondência de pessoa agora usa a mesma função dos dois wizards
  // (Seção "Mudanças concretas" da spec de homônimos).
  pessoas: PessoaExistente[];
  formasPagamento: EntidadeExistente[];
};

// Busca tudo já cadastrado no tenant, pras 4 dimensões que a planilha pode
// referenciar por nome — base pra resolverCorrespondencia() (fuzzy.ts) rodar
// no cliente, valor por valor, na tela de revisão de entidades.
export async function buscarEntidadesExistentes(supabase: Cliente, tenantId: string): Promise<EntidadesExistentes> {
  const [{ data: categorias }, { data: centrosCusto }, { data: pessoas }, { data: formasPagamento }] = await Promise.all([
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("tenant_id", tenantId),
    supabase.from("centros_custo").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true),
    supabase.from("pessoas").select("id, nome, documento, email, telefone, perfis").eq("tenant_id", tenantId),
    supabase.from("formas_pagamento").select("id, nome").eq("tenant_id", tenantId).eq("ativo", true),
  ]);

  return {
    categorias: categorias ?? [],
    centrosCusto: centrosCusto ?? [],
    pessoas: pessoas ?? [],
    formasPagamento: formasPagamento ?? [],
  };
}

export type EntidadeNova = { tipo: TipoEntidadeImportacao; nome: string; tipoCategoria?: TipoCategoria; documento?: string; perfis?: PerfilPessoa[] };

// Cria os poucos registros novos aprovados na tela de revisão (Seção 6/8 —
// volume baixo, sequencial, sem RPC atômica própria). Pessoa nova recebe o
// perfil que quem chama já inferiu a partir do tipo (RECEITA/DESPESA) das
// linhas em que ela aparece na planilha — cliente numa linha de receita,
// fornecedor numa de despesa, os dois se aparecer nas duas (mesmo raciocínio
// que despesas/receitas actions e o Chat IA já usam via resolverPessoaId,
// achado real 11/09/2026: antes gravava os dois perfis sempre, sem olhar
// pra isso, e toda pessoa nova criada aqui — inclusive pela Importação com
// IA, que reaproveita esta mesma função — nascia em /clientes E
// /fornecedores ao mesmo tempo). `?? ["CLIENTE", "FORNECEDOR"]` fica só como
// rede de segurança pra um chamador que não resolveu o perfil.
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
      const perfis = entidade.perfis && entidade.perfis.length > 0 ? entidade.perfis : (["CLIENTE", "FORNECEDOR"] as PerfilPessoa[]);
      const documentoBruto = entidade.documento?.trim() || null;
      // Achado em revisão, 12/09/2026: este caminho (Importação por planilha
      // e por IA) gravava documento sem NENHUMA validação de dígito
      // verificador, diferente do wizard dedicado de Pessoas (validarDocumento
      // em lib/pessoas/importacao/validacao.ts, mesmo algoritmo reaproveitado
      // aqui). Um CPF/CNPJ mal lido pela IA (dígito trocado por falha de
      // OCR/visão) nascia permanente no cadastro sem aviso — nunca bloqueia o
      // import por isso (documento é campo secundário aqui, diferente do
      // wizard de Pessoas onde é obrigatório), só descarta o valor claramente
      // errado em vez de persistir um documento inválido.
      const documento = documentoBruto && validarCpfCnpj(documentoBruto) ? documentoBruto : null;
      const { data, error } = await supabase.from("pessoas").insert({ tenant_id: tenantId, nome: entidade.nome, documento, perfis }).select("id").single();
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
