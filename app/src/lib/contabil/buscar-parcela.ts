import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { DadosParcela } from "@/components/lancamentos/detalhe-parcela";

type Cliente = SupabaseClient<Database>;

const SELECT_PARCELA = `
  id, numero, valor, data_vencimento, status, motivo_cancelamento,
  eventos_financeiros!inner (
    id, descricao, data_competencia, tipo,
    pessoas (nome),
    rateio_categoria (
      valor,
      categorias_financeiras (nome),
      rateio_centro_custo (valor, centros_custo (nome))
    ),
    anexos (id, forma, tipo, descricao, nome_arquivo, mime_type, url)
  ),
  baixas (
    id, data_pagamento, valor_pago, valor_juros, valor_multa, valor_desconto, valor_taxa, estornado_em,
    anexos (id, forma, tipo, descricao, nome_arquivo, mime_type, url)
  ),
  renegociacoes (id, data_vencimento_anterior, data_vencimento_nova, motivo, criado_em)
`;

// Busca e formata os dados da página de detalhe da parcela — usada tanto
// por /contas-a-pagar/[parcelaId] quanto /contas-a-receber/[parcelaId],
// só muda o tipo de evento financeiro esperado (DESPESA/RECEITA).
export async function buscarDadosParcela(
  supabase: Cliente,
  params: { tenant_id: string; parcela_id: string; tipo: "RECEITA" | "DESPESA" },
): Promise<DadosParcela | null> {
  const { data, error } = await supabase
    .from("parcelas")
    .select(SELECT_PARCELA)
    .eq("id", params.parcela_id)
    .eq("tenant_id", params.tenant_id)
    .eq("eventos_financeiros.tipo", params.tipo)
    .single();

  if (error || !data || !data.eventos_financeiros) return null;

  const evento = data.eventos_financeiros;

  return {
    id: data.id,
    numero: data.numero,
    valor: Number(data.valor),
    data_vencimento: data.data_vencimento,
    status: data.status,
    motivo_cancelamento: data.motivo_cancelamento,
    descricao: evento.descricao ?? "Sem descrição",
    pessoaNome: evento.pessoas?.nome ?? null,
    dataCompetencia: evento.data_competencia,
    categorias: (evento.rateio_categoria ?? []).map((r) => ({
      nome: r.categorias_financeiras?.nome ?? "-",
      valor: Number(r.valor),
      centrosCusto: (r.rateio_centro_custo ?? []).map((cc) => ({
        nome: cc.centros_custo?.nome ?? "-",
        valor: Number(cc.valor),
      })),
    })),
    eventoFinanceiroId: evento.id,
    anexosEvento: evento.anexos ?? [],
    baixas: (data.baixas ?? [])
      .map((b) => ({
        id: b.id,
        data_pagamento: b.data_pagamento,
        valor_pago: Number(b.valor_pago),
        valor_juros: Number(b.valor_juros),
        valor_multa: Number(b.valor_multa),
        valor_desconto: Number(b.valor_desconto),
        valor_taxa: Number(b.valor_taxa),
        estornado_em: b.estornado_em,
        anexos: b.anexos ?? [],
      }))
      .sort((a, b) => a.data_pagamento.localeCompare(b.data_pagamento)),
    renegociacoes: (data.renegociacoes ?? []).sort((a, b) => a.criado_em.localeCompare(b.criado_em)),
  };
}
