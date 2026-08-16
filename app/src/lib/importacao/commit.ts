import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { criarEventoFinanceiro } from "@/lib/contabil/evento-financeiro";
import { registrarBaixa } from "@/lib/contabil/baixa";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

export type ParametrosCommitLinha = {
  tenant_id: string;
  criado_por: string;
  conta_financeira_id: string;
  import_key: string;
  descricao: string;
  valor_total: number;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento: string | null;
  tipo: TipoCategoria;
  categoria_id: string;
  pessoa_id: string | null;
  centro_custo_id: string | null;
  forma_pagamento_id: string | null;
};

// Cada linha vira sempre 1 parcela à vista (Seção 2: parcelamento vindo da
// planilha é escopo futuro). Se veio data de pagamento, dá baixa em seguida
// — mas só quando a parcela ainda está pendente: um reimport com o mesmo
// import_key faz o RPC devolver o evento já existente sem recriar nada, e
// dar baixa de novo duplicaria o lançamento de baixa (registrarBaixa não é
// idempotente por chave, só criarEventoFinanceiro é — Seção 3 da spec).
export async function commitarLinhaImportacao(supabase: Cliente, params: ParametrosCommitLinha): Promise<{ evento_id: string } | { erro: string }> {
  const resultadoEvento = await criarEventoFinanceiro(supabase, {
    tenant_id: params.tenant_id,
    tipo: params.tipo,
    descricao: params.descricao,
    valor_total: params.valor_total,
    data_competencia: params.data_competencia,
    categorias: [{ categoria_id: params.categoria_id, valor: params.valor_total, centro_custo_id: params.centro_custo_id ?? undefined }],
    pessoa_id: params.pessoa_id,
    numero_parcelas: 1,
    primeiro_vencimento: params.data_vencimento,
    criado_por: params.criado_por,
    import_key: params.import_key,
  });

  if ("erro" in resultadoEvento) return resultadoEvento;

  if (params.data_pagamento) {
    const { data: parcela } = await supabase
      .from("parcelas")
      .select("id, status")
      .eq("evento_financeiro_id", resultadoEvento.evento_id)
      .eq("tenant_id", params.tenant_id)
      .single();

    if (parcela && (parcela.status === "PENDENTE" || parcela.status === "ATRASADO")) {
      const resultadoBaixa = await registrarBaixa(supabase, {
        tenant_id: params.tenant_id,
        parcela_id: parcela.id,
        data_pagamento: params.data_pagamento,
        valor_pago: params.valor_total,
        conta_financeira_id: params.conta_financeira_id,
        forma_pagamento_id: params.forma_pagamento_id ?? undefined,
        criado_por: params.criado_por,
      });
      if ("erro" in resultadoBaixa) {
        return { erro: `Lançamento criado, mas a baixa automática falhou: ${resultadoBaixa.erro}` };
      }
    }
  }

  return { evento_id: resultadoEvento.evento_id };
}
