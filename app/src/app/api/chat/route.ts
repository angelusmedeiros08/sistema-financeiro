import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { verificarOrcamento, registrarCustoIA, obterUso } from "@/lib/ia/orcamento-ia";
import { calcularCustoUsd } from "@/lib/ia/precos-anthropic";
import { criarConversa, listarConversas, buscarMensagens, gravarMensagem, conversaPertenceAoTenant } from "@/lib/chat-ia/conversas";
import { executarLoopChat, type EventoLoopChat } from "@/lib/chat-ia/loop";
import type Anthropic from "@anthropic-ai/sdk";

// GET sem query: devolve a conversa mais recente do usuário (ou null, se
// nunca conversou). GET ?conversaId=X: devolve as mensagens dela — RLS
// garante que só volta algo se a conversa for do próprio usuário.
export async function GET(request: Request) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return Response.json({ erro: contexto.erro }, { status: 401 });

  const supabase = await createClient();
  const conversaId = new URL(request.url).searchParams.get("conversaId");

  if (conversaId) {
    const mensagens = await buscarMensagens(supabase, contexto.tenantId, conversaId);
    return Response.json({ mensagens });
  }

  const [conversas, uso] = await Promise.all([listarConversas(supabase, contexto.tenantId, contexto.user.id), obterUso(contexto.tenantId)]);
  return Response.json({ conversaId: conversas[0]?.id ?? null, uso });
}

// Primeira rota do projeto com streaming (Seção 6 da spec) — Route Handler
// devolvendo um ReadableStream em text/event-stream, sem precedente a
// seguir no código; esta é a convenção que fica estabelecida daqui pra
// frente. Corpo: { conversaId?: string; mensagem: string }.
export async function POST(request: Request) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    return new Response(JSON.stringify({ erro: contexto.erro }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const corpo: unknown = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object" || typeof (corpo as { mensagem?: unknown }).mensagem !== "string" || !(corpo as { mensagem: string }).mensagem.trim()) {
    return new Response(JSON.stringify({ erro: "Mensagem ausente." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const mensagemUsuario = (corpo as { mensagem: string }).mensagem.trim();
  // Sem teto, uma colagem gigante custaria muito mais que o normal numa
  // única mensagem — 8000 caracteres já cobre folgado qualquer pergunta ou
  // descrição de lançamento real (achado real, 09/09/2026). O orçamento
  // por custo real (ver lib/ia/orcamento-ia.ts) já protege a margem no
  // agregado, mas esse teto evita uma mensagem isolada anormal.
  if (mensagemUsuario.length > 8000) {
    return new Response(JSON.stringify({ erro: "Mensagem muito longa (máximo 8000 caracteres)." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const conversaIdRecebido = typeof (corpo as { conversaId?: unknown }).conversaId === "string" ? (corpo as { conversaId: string }).conversaId : undefined;

  // Checagem prévia por custo real (spec 2026-09-10) — só lê, não registra
  // nada ainda. Orçamento compartilhado com a Importação com IA.
  const { permitido, usadoUsd, limiteUsd } = await verificarOrcamento(contexto.tenantId);
  if (!permitido) {
    return new Response(
      JSON.stringify({ erro: "Limite de uso de IA do mês atingido. Tente de novo mais tarde ou contate o suporte.", uso: { usadoUsd, limiteUsd } }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = await createClient();

  // Nunca reaproveita o conversaId do corpo sem confirmar que é do tenant
  // ativo: o painel no cliente é um componente que pode continuar montado
  // depois de uma troca de empresa, com o conversaId de antes da troca
  // ainda em memória. Sem esta checagem, a mensagem nova entraria com
  // tenant_id certo mas presa a uma conversa de outra empresa (achado
  // real, 09/09/2026).
  let conversaId = conversaIdRecebido && (await conversaPertenceAoTenant(supabase, contexto.tenantId, conversaIdRecebido)) ? conversaIdRecebido : undefined;
  if (!conversaId) {
    const nova = await criarConversa(supabase, { tenantId: contexto.tenantId, usuarioId: contexto.user.id });
    if ("erro" in nova) return new Response(JSON.stringify({ erro: nova.erro }), { status: 500, headers: { "Content-Type": "application/json" } });
    conversaId = nova.conversaId;
  }

  // Histórico replay pro modelo é só o texto das rodadas anteriores (papel
  // usuario/assistente) — mensagens de ferramenta ficam salvas pra exibição/
  // auditoria (Seção 7 da spec), mas não são reconstruídas como pares
  // tool_use/tool_result de uma requisição anterior: cada turno resolve
  // dado fresco pelas próprias ferramentas quando precisa, mais simples e
  // sem risco de montar um par tool_use/tool_result inconsistente ao
  // reidratar de linhas do banco.
  const mensagensSalvas = await buscarMensagens(supabase, contexto.tenantId, conversaId);
  const turnosBrutos: Anthropic.MessageParam[] = [
    ...mensagensSalvas
      .filter((m) => m.papel === "usuario" || m.papel === "assistente")
      .map((m): Anthropic.MessageParam => ({ role: m.papel === "usuario" ? "user" : "assistant", content: m.conteudo ?? "" })),
    { role: "user", content: mensagemUsuario },
  ];
  // A API exige alternância estrita entre "user" e "assistant". Se uma
  // rodada anterior falhou antes de gerar texto (erro da IA, ou o loop
  // bateu no teto de iterações sem responder — ver loop.ts), a mensagem do
  // usuário daquela vez fica salva sem par de resposta: sem esta fusão, a
  // rodada de agora empilharia dois turnos "user" seguidos e a Anthropic
  // devolveria 400 pra sempre nesta conversa, travando o chat
  // permanentemente sem nenhuma forma de recuperação na tela (achado real,
  // 09/09/2026). Fundir turnos consecutivos do mesmo papel corrige o
  // histórico de qualquer quantidade de rodadas órfãs acumuladas, não só a
  // mais recente.
  const historico: Anthropic.MessageParam[] = [];
  for (const turno of turnosBrutos) {
    const ultimo = historico[historico.length - 1];
    if (ultimo && ultimo.role === turno.role) {
      ultimo.content = `${ultimo.content as string}\n\n${turno.content as string}`;
    } else {
      historico.push({ ...turno });
    }
  }

  await gravarMensagem(supabase, { conversaId, tenantId: contexto.tenantId, usuarioId: contexto.user.id, papel: "usuario", conteudo: mensagemUsuario });

  const encoder = new TextEncoder();
  const conversaIdFinal = conversaId;

  const stream = new ReadableStream({
    async start(controller) {
      function enviar(evento: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evento)}\n\n`));
      }

      enviar({ tipo: "inicio", conversaId: conversaIdFinal });

      const resultado = await executarLoopChat({
        historico,
        contexto: { tenantId: contexto.tenantId, usuarioId: contexto.user.id },
        supabase,
        aoEmitir: (evento: EventoLoopChat) => enviar(evento),
      });

      // Registrado DEPOIS do loop, com o custo de verdade (soma de todas
      // as iterações) — antes da resposta voltar não tem como saber
      // quanto essa mensagem vai custar. Mesmo uma chamada que falhou no
      // meio pode ter gasto token em iterações anteriores, por isso
      // sempre registra, erro ou não.
      const custoUsd = calcularCustoUsd(resultado.usageTotal);
      await registrarCustoIA({ tenantId: contexto.tenantId, usuarioId: contexto.user.id, recurso: "chat", custoUsd });
      enviar({ tipo: "uso", usadoUsd: Math.min(usadoUsd + custoUsd, limiteUsd), limiteUsd });

      if (resultado.textoFinal) {
        await gravarMensagem(supabase, { conversaId: conversaIdFinal, tenantId: contexto.tenantId, usuarioId: contexto.user.id, papel: "assistente", conteudo: resultado.textoFinal });
      }

      for (const chamada of resultado.ferramentasExecutadas) {
        await gravarMensagem(supabase, {
          conversaId: conversaIdFinal,
          tenantId: contexto.tenantId,
          usuarioId: contexto.user.id,
          papel: "ferramenta",
          ferramentaNome: chamada.nome,
          ferramentaInput: chamada.input,
          ferramentaOutput: chamada.output,
        });
      }

      enviar({ tipo: "fim" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
