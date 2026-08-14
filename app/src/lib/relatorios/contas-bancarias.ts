import type { Cliente, Regime } from "./regime";
import { buscarMovimento } from "./regime";

export type ExtratoContaBancaria = {
  contaFinanceiraId: string;
  nome: string;
  credito: number;
  debito: number;
  saldoPeriodo: number;
  saldoAcumulado: number;
};

// Extrato gerencial por conta: crédito/débito/saldo do período (na janela
// pedida) e saldo acumulado (desde o saldo inicial cadastrado da conta até
// o fim do período) — mesma dupla de números da aba Relat_Contas_Bancarias
// da planilha (Seção 3.9 do mapeamento).
export async function buscarContasBancarias(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
): Promise<ExtratoContaBancaria[]> {
  const { data: contas } = await supabase
    .from("contas_financeiras")
    .select("id, nome, saldo_inicial, saldo_inicial_data")
    .eq("tenant_id", params.tenantId)
    .eq("ativo", true);

  if (!contas || contas.length === 0) return [];

  const [movimentoPeriodo, movimentoDesdeInicio] = await Promise.all([
    buscarMovimento(supabase, params),
    buscarMovimento(supabase, {
      tenantId: params.tenantId,
      regime: params.regime,
      dataInicio: "1900-01-01",
      dataFim: params.dataFim,
    }),
  ]);

  function agregarPorConta(movimento: Awaited<ReturnType<typeof buscarMovimento>>) {
    const porConta = new Map<string, { credito: number; debito: number }>();
    for (const linha of movimento) {
      if (!linha.contaFinanceiraId) continue;
      const atual = porConta.get(linha.contaFinanceiraId) ?? { credito: 0, debito: 0 };
      if (linha.tipo === "RECEITA") atual.credito += linha.valor;
      else atual.debito += linha.valor;
      porConta.set(linha.contaFinanceiraId, atual);
    }
    return porConta;
  }

  const porContaPeriodo = agregarPorConta(movimentoPeriodo);
  const porContaDesdeInicio = agregarPorConta(movimentoDesdeInicio);

  return contas.map((conta) => {
    const { credito, debito } = porContaPeriodo.get(conta.id) ?? { credito: 0, debito: 0 };
    const totalDesdeInicio = porContaDesdeInicio.get(conta.id) ?? { credito: 0, debito: 0 };
    return {
      contaFinanceiraId: conta.id,
      nome: conta.nome,
      credito,
      debito,
      saldoPeriodo: credito - debito,
      saldoAcumulado: Number(conta.saldo_inicial) + (totalDesdeInicio.credito - totalDesdeInicio.debito),
    };
  });
}
