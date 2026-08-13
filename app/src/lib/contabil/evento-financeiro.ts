import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { registrarLancamento } from "./ledger";
import { CODIGO_CONTAS_A_RECEBER, CODIGO_CONTAS_A_PAGAR } from "./plano-padrao";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

// Soma 1 mês de calendário a uma data ISO (YYYY-MM-DD), com o dia grudado no
// último dia do mês de destino quando ele não existir (ex.: 31/jan + 1 mês
// não vira 3/mar, vira 28 ou 29/fev) — sem isso, parcelamento com
// vencimento no fim do mês desliza de forma silenciosamente errada.
function adicionarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const primeiroDiaAlvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDiaDoMesAlvo = new Date(
    Date.UTC(primeiroDiaAlvo.getUTCFullYear(), primeiroDiaAlvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDiaDoMesAlvo);
  return new Date(Date.UTC(primeiroDiaAlvo.getUTCFullYear(), primeiroDiaAlvo.getUTCMonth(), diaFinal))
    .toISOString()
    .slice(0, 10);
}

function calcularParcelas(valorTotal: number, numeroParcelas: number, primeiroVencimento: string) {
  const valorBase = Math.floor((valorTotal / numeroParcelas) * 100) / 100;
  let somaAlocada = 0;
  const parcelas = [];
  for (let i = 0; i < numeroParcelas; i++) {
    const ultima = i === numeroParcelas - 1;
    // a diferença de arredondamento da divisão inteira vai inteira na
    // última parcela — nunca fica escondida/perdida em nenhuma delas.
    const valor = ultima ? Math.round((valorTotal - somaAlocada) * 100) / 100 : valorBase;
    somaAlocada += valor;
    parcelas.push({ numero: i + 1, valor, data_vencimento: adicionarMeses(primeiroVencimento, i) });
  }
  return parcelas;
}

// Resolve o pessoa_id de um lançamento: usa o existente se veio um ID, cria
// um cadastro mínimo se veio só um nome digitado (fluxo de "criar na hora"
// do combobox), ou retorna null se nenhum dos dois foi informado — pessoa é
// sempre opcional, nunca bloqueia o lançamento.
export async function resolverPessoaId(
  supabase: Cliente,
  tenantId: string,
  params: { pessoaId?: string; nomeNovaPessoa?: string; documentoNovaPessoa?: string; perfil: "CLIENTE" | "FORNECEDOR" },
): Promise<string | null> {
  if (params.pessoaId) return params.pessoaId;

  const nome = params.nomeNovaPessoa?.trim();
  if (!nome) return null;

  const { data } = await supabase
    .from("pessoas")
    .insert({
      tenant_id: tenantId,
      nome,
      documento: params.documentoNovaPessoa?.trim() || null,
      perfis: [params.perfil],
    })
    .select("id")
    .single();

  return data?.id ?? null;
}

export type ParametrosEventoFinanceiro = {
  tenant_id: string;
  tipo: TipoCategoria;
  descricao: string;
  valor_total: number;
  data_competencia: string;
  categoria_id: string;
  conta_contabil_categoria_id: string;
  pessoa_id?: string | null;
  numero_parcelas: number;
  primeiro_vencimento: string;
  criado_por?: string;
};

// Cria um evento financeiro (receita ou despesa) com seu rateio, parcelas e
// o lançamento contábil de reconhecimento — usado como núcleo comum tanto
// por "nova despesa" quanto por "nova receita", que só invertem qual lado
// (débito/crédito) recebe a conta da categoria vs. Contas a Receber/Pagar.
export async function criarEventoFinanceiro(
  supabase: Cliente,
  params: ParametrosEventoFinanceiro,
): Promise<{ evento_id: string } | { erro: string }> {
  const { data: contaContrapartida, error: erroContaContrapartida } = await supabase
    .from("contas_contabeis")
    .select("id")
    .eq("tenant_id", params.tenant_id)
    .eq("codigo", params.tipo === "RECEITA" ? CODIGO_CONTAS_A_RECEBER : CODIGO_CONTAS_A_PAGAR)
    .single();

  if (erroContaContrapartida || !contaContrapartida) {
    return { erro: "Conta contábil de Contas a Receber/Pagar não encontrada para este tenant." };
  }

  const { data: evento, error: erroEvento } = await supabase
    .from("eventos_financeiros")
    .insert({
      tenant_id: params.tenant_id,
      tipo: params.tipo,
      data_competencia: params.data_competencia,
      valor_total: params.valor_total,
      descricao: params.descricao,
      pessoa_id: params.pessoa_id ?? null,
      criado_por: params.criado_por,
    })
    .select("id")
    .single();

  if (erroEvento || !evento) {
    return { erro: erroEvento?.message ?? "Falha ao criar evento financeiro." };
  }

  const { error: erroRateio } = await supabase.from("rateio_categoria").insert({
    tenant_id: params.tenant_id,
    evento_financeiro_id: evento.id,
    categoria_id: params.categoria_id,
    valor: params.valor_total,
  });

  if (erroRateio) return { erro: erroRateio.message };

  const parcelas = calcularParcelas(params.valor_total, params.numero_parcelas, params.primeiro_vencimento);

  const { error: erroParcelas } = await supabase.from("parcelas").insert(
    parcelas.map((p) => ({
      tenant_id: params.tenant_id,
      evento_financeiro_id: evento.id,
      numero: p.numero,
      data_vencimento: p.data_vencimento,
      valor: p.valor,
      status: "PENDENTE" as const,
    })),
  );

  if (erroParcelas) return { erro: erroParcelas.message };

  // reconhecimento contábil no regime de competência — a saída/entrada de
  // caixa de verdade só vira lançamento quando a parcela for baixada.
  const partidas =
    params.tipo === "RECEITA"
      ? [
          { conta_contabil_id: contaContrapartida.id, tipo: "DEBITO" as const, valor: params.valor_total },
          { conta_contabil_id: params.conta_contabil_categoria_id, tipo: "CREDITO" as const, valor: params.valor_total },
        ]
      : [
          { conta_contabil_id: params.conta_contabil_categoria_id, tipo: "DEBITO" as const, valor: params.valor_total },
          { conta_contabil_id: contaContrapartida.id, tipo: "CREDITO" as const, valor: params.valor_total },
        ];

  const resultadoLancamento = await registrarLancamento(supabase, {
    tenant_id: params.tenant_id,
    data_competencia: params.data_competencia,
    descricao: params.descricao,
    origem: "MANUAL",
    referencia_id: evento.id,
    criado_por: params.criado_por,
    partidas,
  });

  if ("erro" in resultadoLancamento) {
    return { erro: resultadoLancamento.erro };
  }

  return { evento_id: evento.id };
}
