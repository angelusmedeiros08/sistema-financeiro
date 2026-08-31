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
//
// O saldo acumulado é agregado no Postgres (RPC movimento_liquido_por_conta),
// não somado em JS a partir de buscarMovimento("1900-01-01", ...) — achado
// de auditoria (30/08/2026): essa função ficou de fora quando
// saldo-projetado.ts corrigiu o mesmo padrão (commit 5a3a947), apesar de já
// ter sido citada como relatório de risco na auditoria de escalabilidade.
// Buscar todo o histórico linha a linha sem paginação arrisca truncamento
// silencioso pelo limite padrão de linhas do PostgREST em tenants com muito
// volume — o saldo acumulado ficaria errado sem nenhum erro visível.
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

  const [movimentoPeriodo, { data: movimentoDesdeInicio }] = await Promise.all([
    buscarMovimento(supabase, params),
    supabase.rpc("movimento_liquido_por_conta", { p_tenant_id: params.tenantId, p_regime: params.regime, p_data_fim: params.dataFim }),
  ]);

  const porContaPeriodo = new Map<string, { credito: number; debito: number }>();
  for (const linha of movimentoPeriodo) {
    if (!linha.contaFinanceiraId) continue;
    const atual = porContaPeriodo.get(linha.contaFinanceiraId) ?? { credito: 0, debito: 0 };
    if (linha.tipo === "RECEITA") atual.credito += linha.valor;
    else atual.debito += linha.valor;
    porContaPeriodo.set(linha.contaFinanceiraId, atual);
  }

  const porContaDesdeInicio = new Map((movimentoDesdeInicio ?? []).map((l) => [l.conta_financeira_id, l]));

  return contas.map((conta) => {
    const { credito, debito } = porContaPeriodo.get(conta.id) ?? { credito: 0, debito: 0 };
    const totalDesdeInicio = porContaDesdeInicio.get(conta.id);
    return {
      contaFinanceiraId: conta.id,
      nome: conta.nome,
      credito,
      debito,
      saldoPeriodo: credito - debito,
      saldoAcumulado: Number(conta.saldo_inicial) + (Number(totalDesdeInicio?.credito ?? 0) - Number(totalDesdeInicio?.debito ?? 0)),
    };
  });
}
