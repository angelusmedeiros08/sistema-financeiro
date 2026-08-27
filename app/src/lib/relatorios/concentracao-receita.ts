import type { Cliente } from "./regime";
import { buscarMovimento } from "./regime";
import { montarHrefLancamentos } from "./drill-down";
import { hojeIsoBrasil } from "@/lib/data-brasil";

export type NivelRiscoConcentracao = "ALTO" | "MEDIO" | "BAIXO";

export type ClienteConcentracao = { pessoaId: string | null; nome: string; valor: number; percentual: number; href: string };

export type ConcentracaoReceita = {
  clientes: ClienteConcentracao[];
  percentualTop3: number;
  nivelRisco: NivelRiscoConcentracao;
};

function isoMenosMeses(meses: number): string {
  const [ano, mes, dia] = hojeIsoBrasil().split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 - meses, dia)).toISOString().slice(0, 10);
}

// "Quanto da minha receita depende de poucos clientes" — nenhum concorrente
// pesquisado (docs/pesquisa-indicadores-financeiros-comparativo-mercado.md)
// transforma isso num alerta de risco; aqui os 3 maiores clientes somando
// metade ou mais da receita da janela classificam como ALTO.
export async function buscarConcentracaoReceita(
  supabase: Cliente,
  params: { tenantId: string; mesesJanela?: number; origemHref: string },
): Promise<ConcentracaoReceita> {
  const mesesJanela = params.mesesJanela ?? 12;
  const dataInicio = isoMenosMeses(mesesJanela);
  const dataFim = hojeIsoBrasil();

  const [movimento, { data: pessoas }] = await Promise.all([
    buscarMovimento(supabase, { tenantId: params.tenantId, regime: "competencia", dataInicio, dataFim }),
    supabase.from("pessoas").select("id, nome").eq("tenant_id", params.tenantId),
  ]);

  const nomePorId = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
  const somaPorPessoa = new Map<string, number>();

  for (const linha of movimento) {
    if (linha.tipo !== "RECEITA") continue;
    const chave = linha.pessoaId ?? "__sem_pessoa__";
    somaPorPessoa.set(chave, (somaPorPessoa.get(chave) ?? 0) + linha.valor);
  }

  const total = [...somaPorPessoa.values()].reduce((soma, v) => soma + v, 0);

  const ordenado = [...somaPorPessoa.entries()]
    .map(([chave, valor]) => ({
      pessoaId: chave === "__sem_pessoa__" ? null : chave,
      nome: chave === "__sem_pessoa__" ? "Sem pessoa" : (nomePorId.get(chave) ?? "-"),
      valor,
      percentual: total > 0 ? valor / total : 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  const percentualTop3 = ordenado.slice(0, 3).reduce((soma, c) => soma + c.percentual, 0);
  const nivelRisco: NivelRiscoConcentracao = percentualTop3 >= 0.5 ? "ALTO" : percentualTop3 >= 0.3 ? "MEDIO" : "BAIXO";

  // Lista COMPLETA, não só os 5 maiores — TopCategoriasDonut espera todas
  // as fatias e faz ele mesmo o corte top-5 + bucket "Outras"
  // (agregarFatias), mesmo contrato que Distribuição por Forma de
  // Pagamento já respeita. Cortar aqui antes deixava "Outras" sempre
  // vazio e inflava o percentual de cada fatia (dividia pela soma só dos
  // 5 maiores, não pelo total real) sempre que havia mais de 5 clientes
  // no período (achado em revisão de código).
  const clientes = ordenado.map((c) => ({
    ...c,
    href: montarHrefLancamentos({
      tipoEntidade: "pessoa",
      entidadeId: c.pessoaId,
      regime: "competencia",
      // Este gráfico só soma RECEITA — sem esse filtro, uma pessoa que
      // também é fornecedora mostraria em /lancamentos um total maior do
      // que a fatia clicada (despesas dela entrando na conta).
      tipo: "RECEITA",
      periodoInicio: dataInicio,
      periodoFim: dataFim,
      origemHref: params.origemHref,
    }),
  }));

  return { clientes, percentualTop3, nivelRisco };
}
