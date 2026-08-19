import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;

export const PAPEIS_EQUIPE = ["admin", "financeiro_senior", "financeiro_junior", "contador"] as const;

export type ParcelaVencimento = {
  tenantId: string;
  tipo: "RECEITA" | "DESPESA";
  saldo: number;
  dataVencimento: string;
  descricao: string;
  pessoaId: string | null;
  pessoaNome: string | null;
  pessoaEmail: string | null;
};

// Só D-3 e D-0 — duas datas exatas, não uma janela contínua (o lembrete é
// "vence em 3 dias" e "vence hoje", não "vence algum dia dessa semana").
export async function buscarVencimentosProximos(supabase: Cliente, hojeIso: string, d3Iso: string): Promise<ParcelaVencimento[]> {
  const { data } = await supabase
    .from("parcelas")
    .select(
      "tenant_id, valor, data_vencimento, eventos_financeiros!inner(tipo, descricao, pessoa_id, pessoas(nome, email)), baixas(valor_pago, estornado_em)",
    )
    .in("status", ["PENDENTE", "RECEBIDO_PARCIAL", "ATRASADO"])
    .in("data_vencimento", [hojeIso, d3Iso]);

  return (data ?? []).map((parcela) => {
    const pago = (parcela.baixas ?? []).filter((b) => !b.estornado_em).reduce((soma, b) => soma + Number(b.valor_pago), 0);
    const evento = parcela.eventos_financeiros;
    return {
      tenantId: parcela.tenant_id,
      tipo: evento.tipo,
      saldo: Number(parcela.valor) - pago,
      dataVencimento: parcela.data_vencimento,
      descricao: evento.descricao ?? "(sem descrição)",
      pessoaId: evento.pessoa_id,
      pessoaNome: evento.pessoas?.nome ?? null,
      pessoaEmail: evento.pessoas?.email ?? null,
    };
  });
}

export type MembroEquipe = { usuarioId: string; nome: string; email: string };

export async function buscarMembrosEquipeAtivos(supabase: Cliente, tenantId: string): Promise<MembroEquipe[]> {
  const { data } = await supabase
    .from("usuario_tenant")
    .select("usuario_id, usuarios(nome, email)")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .in("papel", PAPEIS_EQUIPE);

  return (data ?? [])
    .filter((m): m is typeof m & { usuarios: NonNullable<(typeof m)["usuarios"]> } => m.usuarios !== null)
    .map((m) => ({ usuarioId: m.usuario_id, nome: m.usuarios.nome, email: m.usuarios.email }));
}
