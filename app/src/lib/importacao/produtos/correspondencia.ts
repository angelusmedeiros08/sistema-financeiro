import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { candidatosPorSimilaridade, LIMIAR_DICA, LIMIAR_SIMILARIDADE } from "@/lib/importacao/fuzzy";
import { normalizarTexto } from "@/lib/importacao/locale-br";
import type { CandidatoProduto, CorrespondenciaProduto } from "./tipos";

type Cliente = SupabaseClient<Database>;

export type ProdutoExistente = {
  id: string;
  nome: string;
  codigoReferencia: string | null;
  precoVenda: number;
  tipo: "PRODUTO" | "SERVICO";
};

export async function buscarProdutosExistentes(supabase: Cliente, tenantId: string): Promise<ProdutoExistente[]> {
  const { data } = await supabase
    .from("produtos_servicos")
    .select("id, nome, codigo_referencia, preco_venda, tipo")
    .eq("tenant_id", tenantId);

  return (data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    codigoReferencia: p.codigo_referencia,
    precoVenda: Number(p.preco_venda),
    tipo: p.tipo,
  }));
}

function paraCandidato(p: ProdutoExistente): CandidatoProduto {
  return { id: p.id, nome: p.nome, codigoReferencia: p.codigoReferencia, precoVenda: p.precoVenda, tipo: p.tipo };
}

// Mesma estrutura em camadas de resolverCorrespondenciaPessoa
// (lib/pessoas/importacao/correspondencia.ts), trocando documento por
// código/SKU: código exato decide sozinho SE só um cadastro bater (dois ou
// mais com o mesmo código é dado sujo, nunca decide sozinho — mesma razão
// de segurança). Sem código na linha ou sem bater, cai pro nome exato,
// depois aproximado (dica forte) e fraco (só sugestão, nunca pré-seleciona).
export function resolverCorrespondenciaProduto(linha: { nome: string; codigoReferencia: string }, existentes: ProdutoExistente[]): CorrespondenciaProduto {
  const codigoLinha = linha.codigoReferencia.trim();

  if (codigoLinha) {
    const porCodigo = existentes.filter((e) => e.codigoReferencia && normalizarTexto(e.codigoReferencia) === normalizarTexto(codigoLinha));
    if (porCodigo.length > 0) {
      return { tipo: "exata_codigo", candidatos: porCodigo.map(paraCandidato) };
    }
  }

  if (!linha.nome.trim()) {
    return { tipo: "nenhuma", candidatos: [] };
  }

  const porNomeExato = existentes.filter((e) => normalizarTexto(e.nome) === normalizarTexto(linha.nome));
  if (porNomeExato.length > 0) {
    return { tipo: codigoLinha ? "codigo_conflito" : "exata_nome", candidatos: porNomeExato.map(paraCandidato) };
  }

  const aproximados = candidatosPorSimilaridade(linha.nome, existentes, LIMIAR_SIMILARIDADE);
  if (aproximados.length > 0) {
    return { tipo: "aproximada", candidatos: aproximados.map((c) => paraCandidato(c.entidade)) };
  }

  const fracos = candidatosPorSimilaridade(linha.nome, existentes, LIMIAR_DICA);
  if (fracos.length > 0) {
    return { tipo: "fraca", candidatos: fracos.map((c) => paraCandidato(c.entidade)) };
  }

  return { tipo: "nenhuma", candidatos: [] };
}
