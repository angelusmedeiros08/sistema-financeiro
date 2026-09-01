import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;

export type EventoAuditoria = {
  id: string;
  quando: string;
  quemNome: string;
  acao: "lancamento" | "estorno" | "membro";
  descricao: string;
};

// "Quem fez o quê, quando" a partir de dado que já existe e já é imutável
// — não cria tabela nem trigger novos. `lancamentos` é o próprio livro-razão
// (nunca é alterado nem apagado depois de criado, ver bloquear_alteracao_ledger),
// então já é o registro de auditoria mais confiável que existe no sistema;
// só faltava uma tela expondo isso pro usuário final. `usuario_tenant`
// completa com o outro tipo de evento que o dossiê pediu (mudança de
// equipe), que não vive no ledger.
export async function buscarTrilhaAuditoria(
  supabase: Cliente,
  tenantId: string,
  params: { pagina: number; tamanhoPagina: number },
): Promise<{ eventos: EventoAuditoria[]; total: number }> {
  const inicio = (params.pagina - 1) * params.tamanhoPagina;

  // Busca as duas fontes com folga (tamanho de página inteiro em cada) e
  // intercala por data — nenhuma das duas pagina "de verdade" em conjunto
  // com a outra, então a página exibida corta no ponto certo depois do
  // merge, não antes.
  const [{ data: lancamentos, count: totalLancamentos }, { data: membros, count: totalMembros }] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("id, descricao, criado_em, criado_por, estornado_de_id", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: false })
      .range(0, inicio + params.tamanhoPagina - 1),
    supabase
      .from("usuario_tenant")
      .select("usuario_id, convidado_em", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("convidado_em", { ascending: false })
      .range(0, inicio + params.tamanhoPagina - 1),
  ]);

  const idsUsuarios = new Set<string>();
  (lancamentos ?? []).forEach((l) => l.criado_por && idsUsuarios.add(l.criado_por));
  (membros ?? []).forEach((m) => m.usuario_id && idsUsuarios.add(m.usuario_id));

  const { data: usuarios } = idsUsuarios.size
    ? await supabase.from("usuarios").select("id, nome").in("id", Array.from(idsUsuarios))
    : { data: [] as { id: string; nome: string }[] };
  const nomePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));

  const eventosLancamento: EventoAuditoria[] = (lancamentos ?? []).map((l) => ({
    id: `lanc-${l.id}`,
    quando: l.criado_em,
    quemNome: (l.criado_por && nomePorId.get(l.criado_por)) || "Sistema",
    acao: l.estornado_de_id ? "estorno" : "lancamento",
    descricao: l.descricao,
  }));

  const eventosEquipe: EventoAuditoria[] = (membros ?? []).map((m) => ({
    id: `equipe-${m.usuario_id}-${m.convidado_em}`,
    quando: m.convidado_em,
    quemNome: nomePorId.get(m.usuario_id) || "Alguém",
    acao: "membro",
    descricao: "entrou pra equipe",
  }));

  const todos = [...eventosLancamento, ...eventosEquipe].sort((a, b) => (a.quando < b.quando ? 1 : -1));
  const pagina = todos.slice(inicio, inicio + params.tamanhoPagina);

  return { eventos: pagina, total: (totalLancamentos ?? 0) + (totalMembros ?? 0) };
}
