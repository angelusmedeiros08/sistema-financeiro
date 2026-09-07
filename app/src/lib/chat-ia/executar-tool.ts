import "server-only";
import type { Cliente } from "@/lib/relatorios/regime";
import type { ContextoChat } from "./tipos";
import { TOOLS_LEITURA } from "./tools-leitura";
import { TOOLS_ACAO } from "./tools-acao";

// Despachante único de tools — o nome vem do modelo, mas só é aceito se
// bater com um dos dois catálogos fechados abaixo (nunca lookup dinâmico
// livre tipo eval/require por nome). `contexto.tenantId` sempre vem da
// sessão autenticada de quem chamou a rota, nunca do próprio modelo. As
// tools de ação (TOOLS_ACAO) nunca escrevem no banco — só montam uma
// proposta (Seção 3 da spec); a escrita real é a Fatia 6, fora deste loop.
const TODAS_TOOLS = [...TOOLS_LEITURA, ...TOOLS_ACAO];

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
