"use server";

import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { salvarRegraMapeamentoSeNaoExiste, detectarCorrecoesMapeamento } from "./regras-mapeamento";

// Chamado ao avançar da etapa "Colunas" nos dois wizards — silencioso de
// propósito (nunca bloqueia o avanço do usuário por causa disso, é só
// aprendizado em segundo plano). Erro aqui não deve impedir a importação.
export async function salvarCorrecoesMapeamentoAction(params: {
  tipoWizard: "financeiro" | "pessoas";
  colunasArquivo: string[];
  sugestaoAutomatica: Partial<Record<string, number>>;
  mapeamentoFinal: Partial<Record<string, number>>;
}): Promise<void> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return;

  const correcoes = detectarCorrecoesMapeamento(params.colunasArquivo, params.sugestaoAutomatica, params.mapeamentoFinal);
  if (correcoes.length === 0) return;

  const supabase = await createClient();
  await Promise.all(
    correcoes.map((c) =>
      salvarRegraMapeamentoSeNaoExiste(supabase, { tenantId: contexto.tenantId, tipoWizard: params.tipoWizard, cabecalho: c.cabecalho, chaveColuna: c.chaveColuna }),
    ),
  );
}
