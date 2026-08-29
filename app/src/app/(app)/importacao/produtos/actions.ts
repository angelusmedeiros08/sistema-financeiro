"use server";

import { revalidatePath } from "next/cache";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { createClient } from "@/utils/supabase/server";
import { criarEntidadeAprovada } from "@/lib/importacao/resolucao";
import { iniciarImportacao, reivindicarProcessamento, finalizarImportacao } from "@/lib/importacoes/importacoes";
import { commitarLinhaProduto, type ParametrosCommitLinhaProduto } from "@/lib/importacao/produtos/commit";
import type { Json } from "@/utils/supabase/database.types";

// Reaproveita criarEntidadeAprovada (lib/importacao/resolucao.ts) — mesma
// função que a etapa Cadastros de Lançamentos já usa pra criar categoria
// nova, sempre com tipoCategoria "RECEITA" aqui (produto só referencia
// categoria de receita, mesma exigência do cadastro manual).
export async function criarCategoriaReceitaProdutoAction(nome: string): Promise<{ id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return criarEntidadeAprovada(supabase, contexto.tenantId, { tipo: "categoria", nome, tipoCategoria: "RECEITA" });
}

export type LinhaParaImportarProduto = Omit<ParametrosCommitLinhaProduto, "tenantId"> & { linhaNumero: number };
export type ResultadoLinhaImportacaoProduto = { sucesso: boolean; erro?: string };

// Uma Server Action só, do início ao fim (mesmo padrão de
// executarImportacaoFinanceiraAction em ../planilha/actions.ts — ver spec
// 2026-08-26-importacao-execucao-servidor): sair da tela no meio nunca
// interrompe o lote, porque é uma única requisição. Registra em
// importacoes/importacoes_itens pra aparecer na Central de Importações
// (Seção 4 da spec de Produtos), mas sem produto_servico_id na linha do
// item — essa coluna não existe pra este domínio (só pessoa_id/
// evento_financeiro_id, específicos dos outros 2 fluxos) porque não há
// tela de Desfazer nesta versão (fora de escopo), então nada precisa
// encontrar o produto de volta a partir do item.
export async function executarImportacaoProdutosAction(
  nomeArquivo: string,
  linhas: LinhaParaImportarProduto[],
): Promise<{ importacaoId: string; resultados: ResultadoLinhaImportacaoProduto[] } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };
  const supabase = await createClient();

  const inicio = await iniciarImportacao(supabase, {
    tenant_id: contexto.tenantId,
    tipo: "produtos",
    nome_arquivo: nomeArquivo || "importação sem nome",
    criado_por: contexto.user.id,
    itens: linhas.map((l) => ({ linha_numero: l.linhaNumero, acao: l.acao, dados_normalizados: l as unknown as Json })),
  });
  if ("erro" in inicio) return inicio;

  const lock = await reivindicarProcessamento(supabase, { tenant_id: contexto.tenantId, importacao_id: inicio.importacao_id });
  if ("erro" in lock) return lock;

  const itemIdPorLinha = new Map(inicio.itens.map((i) => [i.linha_numero, i.item_id]));
  const resultados: ResultadoLinhaImportacaoProduto[] = [];

  for (const linha of linhas) {
    const { linhaNumero, ...paramsCommit } = linha;
    const resultado = await commitarLinhaProduto(supabase, { ...paramsCommit, tenantId: contexto.tenantId });
    const itemId = itemIdPorLinha.get(linhaNumero);
    if (itemId) {
      await supabase
        .from("importacoes_itens")
        .update({ status: "erro" in resultado ? "erro" : "sucesso", erro: "erro" in resultado ? resultado.erro : null })
        .eq("id", itemId);
    }
    resultados.push("erro" in resultado ? { sucesso: false, erro: resultado.erro } : { sucesso: true });
  }

  await finalizarImportacao(supabase, { importacao_id: inicio.importacao_id, status: "concluida" });
  return { importacaoId: inicio.importacao_id, resultados };
}

export async function revalidarPosImportacaoProdutosAction(): Promise<void> {
  revalidatePath("/produtos-servicos");
}
