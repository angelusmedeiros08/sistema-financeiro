import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { criarEventoFinanceiro, confirmarPosseDePessoa } from "@/lib/contabil/evento-financeiro";
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
  numero_parcelas: number;
  tipo: TipoCategoria;
  categoria_id: string;
  pessoa_id: string | null;
  centro_custo_id: string | null;
  forma_pagamento_id: string | null;
};

// Vazio na planilha vira numero_parcelas=1 (à vista) — quando preenchido,
// gera o parcelamento real (Seção 2 da spec original tratava isso como
// "escopo futuro"; achado numa auditoria de ampliação: o RPC já suporta
// N parcelas desde sempre, o único motivo de sempre mandar 1 aqui era a
// planilha nunca ter tido a coluna). Se veio data de pagamento, dá baixa em
// seguida — mas só na 1ª parcela (a única leitura sem ambiguidade de "qual
// parcela já foi paga" quando a linha representa uma compra parcelada), e
// só quando ela ainda está pendente: um reimport com o mesmo import_key faz
// o RPC devolver o evento já existente sem recriar nada, e dar baixa de
// novo duplicaria o lançamento de baixa (registrarBaixa não é idempotente
// por chave, só criarEventoFinanceiro é — Seção 3 da spec).
export async function commitarLinhaImportacao(supabase: Cliente, params: ParametrosCommitLinha): Promise<{ evento_id: string } | { erro: string }> {
  // pessoa_id vem da linha da planilha (resolvida na etapa de Cadastros do
  // wizard, mas ainda assim um valor externo chegando na Server Action) —
  // nunca aceito sem confirmar posse, mesmo padrão que o fluxo manual de
  // Nova Despesa/Receita já usa (achado em revisão de código: a importação
  // pulava essa checagem, diferente do resto do sistema).
  const pessoaId = params.pessoa_id ? await confirmarPosseDePessoa(supabase, params.tenant_id, params.pessoa_id) : null;

  const resultadoEvento = await criarEventoFinanceiro(supabase, {
    tenant_id: params.tenant_id,
    tipo: params.tipo,
    descricao: params.descricao,
    valor_total: params.valor_total,
    data_competencia: params.data_competencia,
    categorias: [{ categoria_id: params.categoria_id, valor: params.valor_total, centro_custo_id: params.centro_custo_id ?? undefined }],
    pessoa_id: pessoaId,
    numero_parcelas: params.numero_parcelas,
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
      .eq("numero", 1)
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
