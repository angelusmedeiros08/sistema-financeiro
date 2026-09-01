import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type Cliente = SupabaseClient<Database>;

export type TipoNotificacao = "resumo_equipe" | "vencimento_pagar" | "vencimento_receber" | "erro_importacao";

export type NotificacaoItem = {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  subtitulo: string;
  href: string;
  quando: string;
};

const LIMITE = 8;

// Amplia a central de notificações de 1 tipo de evento (resumo diário por
// e-mail) pra cobrir o que o dossiê UX pediu: vencimento e erro de
// importação, cada um com ação embutida (o item já é o link pra resolver,
// não só um aviso). "Conciliação pendente" ficou de fora — diferente de
// vencimento/erro de importação, não existe hoje nenhum estado persistido
// de "conciliação pendente" pra consultar (a tela de conciliar é um
// wizard sem estado gravado entre sessões); inventar esse rastreamento é
// escopo maior que esta fatia, fica pra uma fatia própria se for pedido.
export async function buscarNotificacoes(
  supabase: Cliente,
  tenantId: string,
  usuarioId: string,
): Promise<NotificacaoItem[]> {
  const hoje = hojeIsoBrasil();

  const [alertas, vencidasPagar, vencidasReceber, importacoesComErro] = await Promise.all([
    supabase
      .from("alertas_enviados")
      .select("id, tipo, enviado_em")
      .eq("tenant_id", tenantId)
      .eq("destinatario_id", usuarioId)
      .order("enviado_em", { ascending: false })
      .limit(5),
    supabase
      .from("parcelas")
      .select("id, data_vencimento, eventos_financeiros!inner(tipo)", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("eventos_financeiros.tipo", "DESPESA")
      .in("status", ["PENDENTE", "RENEGOCIADO"])
      .lt("data_vencimento", hoje),
    supabase
      .from("parcelas")
      .select("id, data_vencimento, eventos_financeiros!inner(tipo)", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("eventos_financeiros.tipo", "RECEITA")
      .in("status", ["PENDENTE", "RENEGOCIADO"])
      .lt("data_vencimento", hoje),
    supabase
      .from("importacoes")
      .select("id, nome_arquivo, criado_em, importacoes_itens!inner(status)")
      .eq("tenant_id", tenantId)
      .eq("importacoes_itens.status", "erro")
      .order("criado_em", { ascending: false })
      .limit(3),
  ]);

  const itens: NotificacaoItem[] = [];

  for (const a of alertas.data ?? []) {
    itens.push({
      id: `alerta-${a.id}`,
      tipo: "resumo_equipe",
      titulo: "Resumo diário de vencimentos enviado por e-mail",
      subtitulo: "",
      href: "/painel",
      quando: a.enviado_em,
    });
  }

  if ((vencidasPagar.count ?? 0) > 0) {
    itens.push({
      id: "vencimento-pagar",
      tipo: "vencimento_pagar",
      titulo: `${vencidasPagar.count} conta${vencidasPagar.count === 1 ? "" : "s"} a pagar vencida${vencidasPagar.count === 1 ? "" : "s"}`,
      subtitulo: "Ver contas a pagar",
      href: "/contas-a-pagar?situacao=vencido",
      quando: new Date().toISOString(),
    });
  }

  if ((vencidasReceber.count ?? 0) > 0) {
    itens.push({
      id: "vencimento-receber",
      tipo: "vencimento_receber",
      titulo: `${vencidasReceber.count} conta${vencidasReceber.count === 1 ? "" : "s"} a receber vencida${vencidasReceber.count === 1 ? "" : "s"}`,
      subtitulo: "Ver contas a receber",
      href: "/contas-a-receber?situacao=vencido",
      quando: new Date().toISOString(),
    });
  }

  const importacoesUnicas = new Map<string, { nome: string; criadoEm: string }>();
  for (const i of importacoesComErro.data ?? []) {
    if (!importacoesUnicas.has(i.id)) importacoesUnicas.set(i.id, { nome: i.nome_arquivo, criadoEm: i.criado_em });
  }
  for (const [id, info] of importacoesUnicas) {
    itens.push({
      id: `importacao-erro-${id}`,
      tipo: "erro_importacao",
      titulo: `Erros na importação de "${info.nome}"`,
      subtitulo: "Ver detalhes",
      href: `/importacao/historico/${id}`,
      quando: info.criadoEm,
    });
  }

  return itens.sort((a, b) => (a.quando < b.quando ? 1 : -1)).slice(0, LIMITE);
}
