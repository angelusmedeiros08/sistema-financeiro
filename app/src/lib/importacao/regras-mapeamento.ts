import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { normalizarTexto } from "./locale-br";

type Cliente = SupabaseClient<Database>;

export type RegraMapeamentoColuna = {
  id: string;
  cabecalhoNormalizado: string;
  chaveColuna: string;
  criadoEm: string;
};

export async function buscarRegrasMapeamento(supabase: Cliente, tenantId: string, tipoWizard: "financeiro" | "pessoas"): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("regras_mapeamento_coluna")
    .select("cabecalho_normalizado, chave_coluna")
    .eq("tenant_id", tenantId)
    .eq("tipo_wizard", tipoWizard);

  const mapa: Record<string, string> = {};
  for (const r of data ?? []) mapa[r.cabecalho_normalizado] = r.chave_coluna;
  return mapa;
}

// Chamado depois que o usuário confirma um mapeamento que corrigiu à mão
// (diferente do que a sugestão automática — rótulo ou sinônimo — já tinha
// preenchido) — nasce sozinha, sem tela dedicada de criação, mesmo modelo
// de `criarRegraSeNaoExiste` em lib/conciliacao/regras.ts. Nunca sobrescreve
// uma regra já existente pro mesmo cabeçalho.
export async function salvarRegraMapeamentoSeNaoExiste(
  supabase: Cliente,
  params: { tenantId: string; tipoWizard: "financeiro" | "pessoas"; cabecalho: string; chaveColuna: string },
): Promise<void> {
  const cabecalhoNormalizado = normalizarTexto(params.cabecalho);
  if (!cabecalhoNormalizado) return;

  const { data: existente } = await supabase
    .from("regras_mapeamento_coluna")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("tipo_wizard", params.tipoWizard)
    .eq("cabecalho_normalizado", cabecalhoNormalizado)
    .maybeSingle();

  // Existe de verdade: uma correção pontual num arquivo não pode reescrever
  // silenciosamente uma regra que vale pro tenant inteiro (mudar a regra de
  // propósito é ação explícita, na tela de Configurações → Mapeamento de
  // colunas, com apagarRegraMapeamento). Bate com o próprio nome da função.
  if (existente) return;

  await supabase.from("regras_mapeamento_coluna").insert({
    tenant_id: params.tenantId,
    tipo_wizard: params.tipoWizard,
    cabecalho_normalizado: cabecalhoNormalizado,
    chave_coluna: params.chaveColuna,
  });
}

export async function listarRegrasMapeamento(supabase: Cliente, tenantId: string): Promise<(RegraMapeamentoColuna & { tipoWizard: string })[]> {
  const { data } = await supabase
    .from("regras_mapeamento_coluna")
    .select("id, tipo_wizard, cabecalho_normalizado, chave_coluna, criado_em")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    tipoWizard: r.tipo_wizard,
    cabecalhoNormalizado: r.cabecalho_normalizado,
    chaveColuna: r.chave_coluna,
    criadoEm: r.criado_em,
  }));
}

export async function apagarRegraMapeamento(supabase: Cliente, tenantId: string, regraId: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from("regras_mapeamento_coluna").delete().eq("id", regraId).eq("tenant_id", tenantId);
  return error ? { erro: error.message } : {};
}

// Compara a sugestão automática (rótulo/sinônimo/regra já aplicada) contra
// o mapeamento final que o usuário confirmou — toda coluna cujo destino
// final difere do que a sugestão tinha proposto (inclusive as que a
// sugestão deixou sem mapear) é uma correção manual, candidata a virar
// regra aprendida. Chaves dinâmicas (`campo:...`, campo personalizado do
// wizard de pessoas) nunca entram — já são 1:1 por definição do próprio
// tenant, e uma regra apontando pra um id de campo apagado ficaria órfã.
export function detectarCorrecoesMapeamento(
  colunasArquivo: string[],
  sugestaoAutomatica: Partial<Record<string, number>>,
  mapeamentoFinal: Partial<Record<string, number>>,
): { cabecalho: string; chaveColuna: string }[] {
  const chavePorIdxAuto = new Map<number, string>();
  for (const [chave, idx] of Object.entries(sugestaoAutomatica)) {
    if (idx !== undefined) chavePorIdxAuto.set(idx, chave);
  }

  const correcoes: { cabecalho: string; chaveColuna: string }[] = [];
  for (const [chave, idx] of Object.entries(mapeamentoFinal)) {
    if (idx === undefined || chave.startsWith("campo:")) continue;
    if (chavePorIdxAuto.get(idx) !== chave) {
      correcoes.push({ cabecalho: colunasArquivo[idx], chaveColuna: chave });
    }
  }
  return correcoes;
}
