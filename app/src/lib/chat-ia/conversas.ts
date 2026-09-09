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

// tenant_id filtrado explicitamente, não só usuario_id — a RLS permite
// qualquer tenant que o usuário tenha vínculo (private.tenants_do_usuario_
// atual(), plural), não só o tenant ativo no momento. Sem este filtro, um
// usuário com acesso a mais de uma empresa via a mesma conta (troca de
// tenant no topbar) via a conversa da OUTRA empresa aqui (achado real,
// 09/09/2026: usuário trocou de empresa e o chat continuou mostrando a
// conversa de antes).
export async function listarConversas(supabase: Cliente, tenantId: string, usuarioId: string): Promise<Conversa[]> {
  const { data } = await supabase
    .from("chat_conversas")
    .select("id, titulo, criado_em, atualizado_em")
    .eq("tenant_id", tenantId)
    .eq("usuario_id", usuarioId)
    .order("atualizado_em", { ascending: false })
    .limit(30);

  return (data ?? []).map((c) => ({ id: c.id, titulo: c.titulo, criadoEm: c.criado_em, atualizadoEm: c.atualizado_em }));
}

// Mesmo motivo do filtro em listarConversas: sem o tenant_id aqui, um
// conversaId de outra empresa do mesmo usuário (vindo de estado antigo no
// cliente, ou até de query string manual) devolveria mensagens da empresa
// errada em vez de vir vazio.
//
// Teto de 100 linhas (mais recentes) — sem isso, uma conversa antiga e
// longa era buscada por inteiro em toda troca de mensagem (recarregarMensagens
// roda depois de cada envio) e o histórico inteiro, sem limite, era
// reenviado como contexto pro modelo em route.ts a cada turno novo — custo e
// latência crescendo sem parar com o tamanho da conversa, e em tese o
// próprio limite de contexto da API sendo alcançável um dia (achado real,
// 09/09/2026). Busca as mais recentes em ordem decrescente e inverte, já
// que quem chama esperando ordem cronológica.
export async function buscarMensagens(supabase: Cliente, tenantId: string, conversaId: string): Promise<MensagemChat[]> {
  const { data } = await supabase
    .from("chat_mensagens")
    .select("id, conversa_id, papel, conteudo, ferramenta_nome, ferramenta_input, ferramenta_output, proposta_confirmada, criado_em")
    .eq("tenant_id", tenantId)
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: false })
    .limit(100);

  return (data ?? []).reverse().map((m) => ({
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

// Usada no POST antes de reaproveitar um conversaId vindo do cliente
// (estado do painel pode estar desatualizado se o usuário trocou de
// empresa com o painel aberto) — nunca reaproveita um id sem confirmar que
// pertence ao tenant ativo.
export async function conversaPertenceAoTenant(supabase: Cliente, tenantId: string, conversaId: string): Promise<boolean> {
  const { data } = await supabase.from("chat_conversas").select("id").eq("id", conversaId).eq("tenant_id", tenantId).maybeSingle();
  return data !== null;
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
