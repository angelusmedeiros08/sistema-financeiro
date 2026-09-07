import "server-only";
import type { Cliente } from "@/lib/relatorios/regime";
import type { ContextoChat } from "./tipos";
import { TOOLS_LEITURA } from "./tools-leitura";

// Despachante único de tools — o nome vem do modelo, mas só é aceito se
// bater com o catálogo fechado abaixo (nunca lookup dinâmico livre tipo
// eval/require por nome). `contexto.tenantId` sempre vem da sessão
// autenticada de quem chamou a rota, nunca do próprio modelo.
// TOOLS_ACAO (propor_criar_lancamento etc., Fatia 5) entra nesta lista
// quando existir — ainda não é código desta fatia.
const TODAS_TOOLS = [...TOOLS_LEITURA];

export const DEFINICOES_TOOLS = TODAS_TOOLS.map((t) => t.definicao);

export async function executarTool(supabase: Cliente, nome: string, input: Record<string, unknown>, contexto: ContextoChat): Promise<{ resultado: unknown } | { erro: string }> {
  const tool = TODAS_TOOLS.find((t) => t.definicao.name === nome);
  if (!tool) return { erro: `Ferramenta desconhecida: ${nome}` };

  try {
    const resultado = await tool.executar(supabase, input, contexto);
    return { resultado };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao executar a ferramenta." };
  }
}
