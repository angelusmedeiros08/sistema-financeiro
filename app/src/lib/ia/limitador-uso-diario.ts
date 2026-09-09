import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

// Fábrica genérica pro padrão repetido em chat-ia/rate-limit.ts e
// importacao/rate-limit-ia.ts (achado em revisão de código, 09/09/2026):
// tabela dedicada no Postgres, só service_role, janela deslizante por
// tenant_id, sempre registra a tentativa mesmo negando (impede burlar a
// contagem só não persistindo quando нега). Consolidado aqui porque as duas
// cópias eram idênticas byte a byte fora do nome da tabela/limite — um
// ajuste de comportamento (ex.: a janela, ou o cálculo de `usado`) tinha que
// ser repetido nos dois lugares por igual.
//
// Escopo desta fábrica: só os limitadores de custo de IA (proteção de
// margem). lib/pagamentos/rate-limit.ts e lib/seguranca/rate-limit-auth.ts
// têm o mesmo formato de tabela mas resolvem outro problema (força bruta de
// login, tentativa de assinatura) — mantidos separados de propósito, não
// migrados pra esta fábrica.
type TabelaLimitada = "tentativas_chat_ia" | "tentativas_importacao_ia";

export type UsoDiario = { usado: number; limite: number };

export function criarLimitadorDiario(params: { tabela: TabelaLimitada; limite: number }) {
  const janelaMs = 24 * 60 * 60 * 1000;

  async function registrarTentativa(args: { tenantId: string; usuarioId: string }): Promise<{ permitido: boolean } & UsoDiario> {
    const admin = createAdminClient();
    const desde = new Date(Date.now() - janelaMs).toISOString();

    const { count } = await admin.from(params.tabela).select("id", { count: "exact", head: true }).eq("tenant_id", args.tenantId).gte("criado_em", desde);

    const antes = count ?? 0;
    const permitido = antes < params.limite;

    await admin.from(params.tabela).insert({ tenant_id: args.tenantId, usuario_id: args.usuarioId });

    // usado reflete a tentativa atual (já registrada), não só o que veio
    // antes dela — é o número que a UI deve mostrar depois desta chamada.
    return { permitido, usado: Math.min(antes + 1, params.limite), limite: params.limite };
  }

  // Leitura pura, sem registrar tentativa nenhuma — usada só pra UI mostrar
  // o consumo atual (ex.: ao abrir a tela, antes de qualquer chamada nova).
  async function obterUso(tenantId: string): Promise<UsoDiario> {
    const admin = createAdminClient();
    const desde = new Date(Date.now() - janelaMs).toISOString();

    const { count } = await admin.from(params.tabela).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("criado_em", desde);

    return { usado: Math.min(count ?? 0, params.limite), limite: params.limite };
  }

  return { registrarTentativa, obterUso };
}
