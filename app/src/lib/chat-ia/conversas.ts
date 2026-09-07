import "server-only";
import type { Cliente } from "@/lib/relatorios/regime";
import type { Conversa, MensagemChat, PapelMensagem } from "./tipos";

export async function criarConversa(supabase: Cliente, params: { tenantId: string; usuarioId: string }): Promise<{ conversaId: string } | { erro: string }> {
  const { data, error } = await supabase
    .from("chat_conversas")
    .insert({ tenant_id: params.tenantId, usuario_id: params.usuarioId })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao criar conversa." };
  return { conversaId: data.id };
}

export async function listarConversas(supabase: Cliente, usuarioId: string): Promise<Conversa[]> {
  const { data } = await supabase.from("chat_conversas").select("id, titulo, criado_em, atualizado_em").eq("usuario_id", usuarioId).order("atualizado_em", { ascending: false }).limit(30);

  return (data ?? []).map((c) => ({ id: c.id, titulo: c.titulo, criadoEm: c.criado_em, atualizadoEm: c.atualizado_em }));
}

export async function buscarMensagens(supabase: Cliente, conversaId: string): Promise<MensagemChat[]> {
  const { data } = await supabase
    .from("chat_mensagens")
    .select("id, conversa_id, papel, conteudo, ferramenta_nome, ferramenta_input, ferramenta_output, proposta_confirmada, criado_em")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    conversaId: m.conversa_id,
    papel: m.papel as PapelMensagem,
    conteudo: m.conteudo,
    ferramentaNome: m.ferramenta_nome,
    ferramentaInput: m.ferramenta_input,
    ferramentaOutput: m.ferramenta_output,
    propostaConfirmada: m.proposta_confirmada,
    criadoEm: m.criado_em,
  }));
}

export async function gravarMensagem(
  supabase: Cliente,
  params: {
    conversaId: string;
    tenantId: string;
    usuarioId: string;
    papel: PapelMensagem;
    conteudo?: string | null;
    ferramentaNome?: string | null;
    ferramentaInput?: unknown;
    ferramentaOutput?: unknown;
    propostaConfirmada?: boolean | null;
  },
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from("chat_mensagens")
    .insert({
      conversa_id: params.conversaId,
      tenant_id: params.tenantId,
      usuario_id: params.usuarioId,
      papel: params.papel,
      conteudo: params.conteudo ?? null,
      ferramenta_nome: params.ferramentaNome ?? null,
      ferramenta_input: (params.ferramentaInput ?? null) as never,
      ferramenta_output: (params.ferramentaOutput ?? null) as never,
      proposta_confirmada: params.propostaConfirmada ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao gravar mensagem." };

  await supabase.from("chat_conversas").update({ atualizado_em: new Date().toISOString() }).eq("id", params.conversaId);

  return { id: data.id };
}
