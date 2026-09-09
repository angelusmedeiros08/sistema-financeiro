import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { registrarTentativaChatIA, obterUsoChatIA } from "@/lib/chat-ia/rate-limit";
import { criarConversa, listarConversas, buscarMensagens, gravarMensagem } from "@/lib/chat-ia/conversas";
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
    const mensagens = await buscarMensagens(supabase, conversaId);
    return Response.json({ mensagens });
  }

  const [conversas, uso] = await Promise.all([listarConversas(supabase, contexto.user.id), obterUsoChatIA(contexto.tenantId)]);
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
  const conversaIdRecebido = typeof (corpo as { conversaId?: unknown }).conversaId === "string" ? (corpo as { conversaId: string }).conversaId : undefined;

  const { permitido, usado, limite } = await registrarTentativaChatIA({ tenantId: contexto.tenantId, usuarioId: contexto.user.id });
  if (!permitido) {
    return new Response(JSON.stringify({ erro: "Limite de uso do Chat IA atingido — tente de novo mais tarde.", uso: { usado, limite } }), { status: 429, headers: { "Content-Type": "application/json" } });
  }

  const supabase = await createClient();

  let conversaId = conversaIdRecebido;
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
  const mensagensSalvas = await buscarMensagens(supabase, conversaId);
  const historico: Anthropic.MessageParam[] = mensagensSalvas
    .filter((m) => m.papel === "usuario" || m.papel === "assistente")
    .map((m) => ({ role: m.papel === "usuario" ? "user" : "assistant", content: m.conteudo ?? "" }));
  historico.push({ role: "user", content: mensagemUsuario });

  await gravarMensagem(supabase, { conversaId, tenantId: contexto.tenantId, usuarioId: contexto.user.id, papel: "usuario", conteudo: mensagemUsuario });

  const encoder = new TextEncoder();
  const conversaIdFinal = conversaId;

  const stream = new ReadableStream({
    async start(controller) {
      function enviar(evento: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evento)}\n\n`));
      }

      enviar({ tipo: "inicio", conversaId: conversaIdFinal });
      enviar({ tipo: "uso", usado, limite });

      const resultado = await executarLoopChat({
        historico,
        contexto: { tenantId: contexto.tenantId, usuarioId: contexto.user.id },
        supabase,
        aoEmitir: (evento: EventoLoopChat) => enviar(evento),
      });

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
