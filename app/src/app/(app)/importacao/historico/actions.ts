"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import {
  buscarItensParaRetomar,
  marcarImportacaoRetomando,
  reivindicarProcessamento,
  finalizarImportacao,
  preverDesfazerImportacaoPessoas,
  desfazerImportacaoPessoas,
  type PreviaDesfazerImportacaoPessoas,
  type ResultadoDesfazerImportacaoPessoas,
} from "@/lib/importacoes/importacoes";
import { importarLinhaPessoaAction, finalizarImportacaoPessoasAction } from "../pessoas/actions";
import type { ParametrosImportarLinhaPessoa } from "../pessoas/actions";
import { retomarItemFinanceiroAction } from "../planilha/actions";
import type { LinhaParaImportar } from "../planilha/actions";
import { retomarItemProdutoAction } from "../produtos/actions";
import type { LinhaParaImportarProduto } from "../produtos/actions";
import {
  preverDesfazerImportacaoFinanceira,
  desfazerImportacaoFinanceira,
  finalizarImportacaoFinanceira,
  type PreviaDesfazerFinanceira,
  type ResultadoDesfazerFinanceira,
} from "@/lib/importacoes/importacoes-financeiro";

// Roda o lote inteiro de retomada dentro de UMA Server Action, do início
// ao fim — antes, "Retomar" era um loop client-side (uma chamada por item)
// exatamente igual ao padrão que o resto desta leva eliminou pra
// importação normal (achado em revisão de código: sair da tela no meio de
// um Retomar reintroduzia o mesmo risco). `tipo` é derivado aqui, no
// servidor, a partir do próprio registro — nunca de um parâmetro vindo do
// cliente (achado em revisão de código: um `tipo` adulterado ou
// desatualizado podia rodar o commit errado sobre o item errado). O lock
// de reivindicarProcessamento garante que uma segunda aba/sessão não possa
// rodar isto ao mesmo tempo que a importação original ainda está em voo.
export async function retomarImportacaoAction(importacaoId: string): Promise<{ processados: number } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  const { data: importacao } = await supabase
    .from("importacoes")
    .select("tipo")
    .eq("id", importacaoId)
    .eq("tenant_id", contexto.tenantId)
    .maybeSingle();
  if (!importacao) return { erro: "Importação não encontrada." };

  const lock = await reivindicarProcessamento(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
  if ("erro" in lock) return lock;

  const itens = await buscarItensParaRetomar(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
  if (itens.length === 0) return { erro: "Não há linhas pendentes ou com erro pra retomar." };

  await marcarImportacaoRetomando(supabase, { importacao_id: importacaoId });

  // 3 ramos explícitos (não mais if/else binário) — o binário assumia
  // "não-financeiro = pessoas", e um produtos import retomado caía por
  // engano no branch de pessoas (achado em revisão de código: dado de
  // produto sendo lido como se fosse pessoa, corrompendo ou quebrando a
  // retomada). Cada tipo agora tem seu próprio caminho, sem fallback.
  for (const item of itens) {
    if (importacao.tipo === "financeiro") {
      await retomarItemFinanceiroAction(item.id, item.dadosNormalizados as unknown as LinhaParaImportar);
    } else if (importacao.tipo === "pessoas") {
      await importarLinhaPessoaAction(item.id, item.dadosNormalizados as unknown as ParametrosImportarLinhaPessoa);
    } else {
      await retomarItemProdutoAction(item.id, item.dadosNormalizados as unknown as LinhaParaImportarProduto);
    }
  }

  if (importacao.tipo === "financeiro") {
    await finalizarImportacaoFinanceira(supabase, { importacao_id: importacaoId });
  } else if (importacao.tipo === "pessoas") {
    await finalizarImportacaoPessoasAction(importacaoId, "concluida");
  } else {
    await finalizarImportacao(supabase, { importacao_id: importacaoId, status: "concluida" });
  }

  return { processados: itens.length };
}

export async function preverDesfazerImportacaoAction(importacaoId: string): Promise<PreviaDesfazerImportacaoPessoas | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return preverDesfazerImportacaoPessoas(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
}

// Mesmo princípio do desfazer financeiro: a prévia é sempre recalculada no
// servidor a partir só de importacaoId/tenant — o snapshot do cliente serve
// só pra comparar (nada mudou desde que a tela carregou) e decidir se a
// chamada segue, nunca pra decidir o que executar.
export async function desfazerImportacaoAction(
  importacaoId: string,
  previa: PreviaDesfazerImportacaoPessoas,
): Promise<ResultadoDesfazerImportacaoPessoas | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await desfazerImportacaoPessoas(supabase, {
    tenant_id: contexto.tenantId,
    importacao_id: importacaoId,
    criado_por: contexto.user.id,
    previa,
  });

  if (!("erro" in resultado)) {
    // Lançamento vinculado agora pode ser revertido junto — o efeito se
    // espalha pelo razão inteiro (relatório, indicador), mesmo raciocínio
    // já aplicado ao desfazer financeiro: 'layout' na raiz invalida o app
    // inteiro em vez de listar rota por rota.
    revalidatePath("/", "layout");
  }

  return resultado;
}

export async function preverDesfazerImportacaoFinanceiraAction(importacaoId: string): Promise<PreviaDesfazerFinanceira | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return preverDesfazerImportacaoFinanceira(supabase, { tenant_id: contexto.tenantId, importacao_id: importacaoId });
}

// A prévia é sempre recalculada no servidor a partir do que o cliente
// confirmou (não confia em nada calculado no browser) — mas nunca
// reavalia a classificação, só executa exatamente o snapshot recebido,
// como já documentado em desfazerImportacaoFinanceira().
export async function desfazerImportacaoFinanceiraAction(
  importacaoId: string,
  previa: PreviaDesfazerFinanceira,
  incluirModificados: boolean,
): Promise<ResultadoDesfazerFinanceira | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await desfazerImportacaoFinanceira(supabase, {
    tenant_id: contexto.tenantId,
    importacao_id: importacaoId,
    criado_por: contexto.user.id,
    previa,
    incluirModificados,
  });

  if (!("erro" in resultado)) {
    // Desfazer importação agora reverte tudo, quitado ou não (baixa
    // incluída) — o efeito se espalha pelo razão inteiro, então listar
    // rota por rota (relatórios, indicadores, DRE, aging...) é frágil e
    // some silenciosamente do dia que alguém adicionar um relatório novo.
    // 'layout' na raiz invalida o app inteiro pro próximo acesso, do jeito
    // documentado pra "revalidar tudo" (ver node_modules/next/dist/docs).
    revalidatePath("/", "layout");
  }

  return resultado;
}
