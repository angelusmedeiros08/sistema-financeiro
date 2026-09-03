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
//
// Paginação real via `vw_trilha_auditoria` (achado em varredura de
// melhorias) — antes fazia duas buscas `.range(0, inicio+tamanhoPagina-1)`
// (uma por fonte) toda vez, rebuscando do zero a cada página avançada, só
// pra intercalar por data em JS depois. A view unifica as duas fontes com
// UNION ALL, permitindo um único `.range()` de verdade na consulta final.
export async function buscarTrilhaAuditoria(
  supabase: Cliente,
  tenantId: string,
  params: { pagina: number; tamanhoPagina: number },
): Promise<{ eventos: EventoAuditoria[]; total: number }> {
  const inicio = (params.pagina - 1) * params.tamanhoPagina;

  const { data, count } = await supabase
    .from("vw_trilha_auditoria")
    .select("id, quando, usuario_id, acao, descricao", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("quando", { ascending: false })
    .range(inicio, inicio + params.tamanhoPagina - 1);

  const idsUsuarios = new Set<string>();
  (data ?? []).forEach((e) => e.usuario_id && idsUsuarios.add(e.usuario_id));

  const { data: usuarios } = idsUsuarios.size
    ? await supabase.from("usuarios").select("id, nome").in("id", Array.from(idsUsuarios))
    : { data: [] as { id: string; nome: string }[] };
  const nomePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));

  const eventos: EventoAuditoria[] = (data ?? []).map((e) => ({
    id: e.id ?? "",
    quando: e.quando ?? "",
    quemNome: (e.usuario_id && nomePorId.get(e.usuario_id)) || (e.acao === "membro" ? "Alguém" : "Sistema"),
    acao: (e.acao ?? "lancamento") as EventoAuditoria["acao"],
    descricao: e.descricao ?? "",
  }));

  return { eventos, total: count ?? 0 };
}
