import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { criarProdutoServico, editarProdutoServico } from "@/lib/produtos-servicos/produtos-servicos";

type Cliente = SupabaseClient<Database>;
type TipoProdutoServico = Database["public"]["Enums"]["tipo_produto_servico"];

export type ParametrosCommitLinhaProduto = {
  tenantId: string;
  acao: "criar" | "atualizar";
  produtoIdExistente: string | null;
  nome: string;
  tipo: TipoProdutoServico;
  descricao: string | null;
  precoVenda: number;
  categoriaFinanceiraId: string;
  unidadeMedida: string | null;
  codigoReferencia: string | null;
};

export async function commitarLinhaProduto(supabase: Cliente, params: ParametrosCommitLinhaProduto): Promise<{ produto_id: string } | { erro: string }> {
  if (params.acao === "criar") {
    const resultado = await criarProdutoServico(supabase, {
      tenantId: params.tenantId,
      nome: params.nome,
      descricao: params.descricao,
      tipo: params.tipo,
      precoVenda: params.precoVenda,
      categoriaFinanceiraId: params.categoriaFinanceiraId,
      unidadeMedida: params.unidadeMedida,
      codigoReferencia: params.codigoReferencia,
    });
    if ("erro" in resultado) return resultado;
    return { produto_id: resultado.id };
  }

  if (!params.produtoIdExistente) return { erro: "Linha marcada como atualização sem um produto correspondente." };

  // editarProdutoServico exige o objeto inteiro (não aceita parcial) — busca
  // o valor atual primeiro e mescla por cima só os 3 campos genuinamente
  // opcionais (descrição/unidade/código — vazio nunca apaga o que já
  // existe, mesma regra que commitarLinhaPessoa aplica pra pessoa). Os
  // demais campos são obrigatórios na validação da linha (Seção 5 da spec),
  // então sempre chegam aqui preenchidos — não precisam de fallback.
  const { data: atual, error: erroAtual } = await supabase
    .from("produtos_servicos")
    .select("descricao, unidade_medida, codigo_referencia, ativo")
    .eq("id", params.produtoIdExistente)
    .eq("tenant_id", params.tenantId)
    .single();
  if (erroAtual || !atual) return { erro: "Produto correspondente não encontrado." };

  // "||" de propósito, não "??" — célula vazia chega aqui como "" (string
  // vazia), não null/undefined, então "??" deixava passar direto e apagava
  // o dado existente (achado ao vivo testando: unidade_medida "pacote"
  // virou null com uma linha de atualização sem essa coluna preenchida).
  const resultado = await editarProdutoServico(supabase, {
    tenantId: params.tenantId,
    produtoServicoId: params.produtoIdExistente,
    nome: params.nome,
    descricao: params.descricao || atual.descricao,
    tipo: params.tipo,
    precoVenda: params.precoVenda,
    categoriaFinanceiraId: params.categoriaFinanceiraId,
    unidadeMedida: params.unidadeMedida || atual.unidade_medida,
    codigoReferencia: params.codigoReferencia || atual.codigo_referencia,
    ativo: atual.ativo,
  });
  if ("erro" in resultado) return resultado;
  return { produto_id: params.produtoIdExistente };
}
