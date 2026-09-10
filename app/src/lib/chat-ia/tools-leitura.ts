import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Cliente, Regime, Granularidade } from "@/lib/relatorios/regime";
import type { ContextoChat } from "./tipos";
import { buscarDRE, buscarDREIndicadores, buscarDREMatriz } from "@/lib/relatorios/dre";
import { buscarFluxoCaixaGrade, buscarPrevistoRealizado as buscarPrevistoRealizadoFluxo } from "@/lib/relatorios/fluxo-caixa";
import { buscarSaldoProjetado, buscarSaldoAntesDe, buscarSerieSaldoProjetado } from "@/lib/relatorios/saldo-projetado";
import { buscarLiquidezAproximada } from "@/lib/relatorios/liquidez-aproximada";
import { buscarAging, buscarResumoVencimentos, buscarAgingPorParticipante } from "@/lib/relatorios/aging";
import { buscarIndicadoresRealizacao, buscarSerieIndicadoresRealizacao } from "@/lib/relatorios/indicadores-gauge";
import { buscarPontoEquilibrio, buscarEvolucaoPontoEquilibrio, mesesDoAno, type BaseMC } from "@/lib/relatorios/ponto-equilibrio";
import { buscarComposicaoFluxoCaixa, buscarDFCMatriz } from "@/lib/relatorios/dfc";
import { buscarAnaliseCategorias } from "@/lib/relatorios/analise-despesas";
import { buscarAnaliseComparativa, type TipoAnaliseComparativa } from "@/lib/relatorios/analises-comparativas";
import { buscarConcentracao } from "@/lib/relatorios/concentracao";
import { buscarVariacaoCategorias } from "@/lib/relatorios/variacao-categorias";
import { buscarPMR, buscarPMP } from "@/lib/relatorios/prazos-medios";
import { buscarDistribuicaoFormaPagamento } from "@/lib/relatorios/distribuicao-forma-pagamento";
import { buscarCentroCusto } from "@/lib/relatorios/centro-custo";
import { buscarContasBancarias } from "@/lib/relatorios/contas-bancarias";
import { buscarPrevistoRealizado as buscarOrcadoVsRealizado } from "@/lib/previsionamento/previsionamento";

// Ferramentas de leitura do Chat IA — cada uma reaproveita uma função de
// relatório já existente, sem reescrever busca nenhuma (Seção 5 da spec).
// `tenantId` NUNCA é campo do input_schema — é sempre resolvido pelo
// servidor a partir da sessão autenticada (ContextoChat), o modelo não tem
// como preenchê-lo nem sobrescrevê-lo.

export type DefinicaoTool = {
  definicao: Anthropic.Tool;
  executar: (supabase: Cliente, input: Record<string, unknown>, contexto: ContextoChat) => Promise<unknown>;
};

const REGIME_ENUM = ["competencia", "previsto", "realizado"] as const;
const TIPO_ENUM = ["RECEITA", "DESPESA"] as const;
const GRANULARIDADE_ENUM = ["dia", "semana", "mes", "trimestre", "ano"] as const;

const PROPRIEDADE_REGIME = { type: "string", enum: REGIME_ENUM, description: "Regime de apuração: competência, previsto ou realizado (caixa)." } as const;
const PROPRIEDADE_DATA = { type: "string", description: "Data no formato AAAA-MM-DD." } as const;
const PROPRIEDADE_TIPO = { type: "string", enum: TIPO_ENUM, description: "RECEITA ou DESPESA." } as const;

function regimeOuPadrao(input: Record<string, unknown>): Regime {
  const valor = input.regime;
  return typeof valor === "string" && (REGIME_ENUM as readonly string[]).includes(valor) ? (valor as Regime) : "competencia";
}
function tipoObrigatorio(input: Record<string, unknown>): "RECEITA" | "DESPESA" {
  const valor = input.tipo;
  if (valor === "RECEITA" || valor === "DESPESA") return valor;
  throw new Error("Parâmetro 'tipo' inválido — precisa ser RECEITA ou DESPESA.");
}
function textoObrigatorio(input: Record<string, unknown>, campo: string): string {
  const valor = input[campo];
  if (typeof valor !== "string" || !valor) throw new Error(`Parâmetro '${campo}' ausente ou inválido.`);
  return valor;
}
function numeroObrigatorio(input: Record<string, unknown>, campo: string): number {
  const valor = input[campo];
  if (typeof valor !== "number") throw new Error(`Parâmetro '${campo}' ausente ou inválido.`);
  return valor;
}
function tipoComparativoObrigatorio(input: Record<string, unknown>): TipoAnaliseComparativa {
  const valor = input.tipo_comparativo;
  if (valor === "AH" || valor === "YOY" || valor === "YTD") return valor;
  throw new Error("Parâmetro 'tipo_comparativo' inválido — precisa ser AH, YOY ou YTD.");
}
// Teto pros parâmetros de "quantos meses pra trás" — sem isso o modelo
// poderia pedir uma janela absurda (ex.: alguns bilhões de meses), o que em
// buscarSerieIndicadoresRealizacao vira um `for` que aloca um bucket por
// mês: nada impede o modelo de tentar, então o limite fica aqui, não na
// confiança de que o prompt vai se comportar. 120 meses (10 anos) já é bem
// mais que qualquer análise financeira de pequena empresa precisa.
function mesesJanelaOpcional(input: Record<string, unknown>, campo: string, padrao: number): number {
  const valor = input[campo];
  if (typeof valor !== "number" || !Number.isFinite(valor)) return padrao;
  return Math.min(Math.max(1, Math.trunc(valor)), 120);
}

export const TOOLS_LEITURA: DefinicaoTool[] = [
  {
    definicao: {
      name: "consultar_dre",
      description: "Consulta a Demonstração de Resultado (DRE) do tenant num período — receitas, custos, subtotais, resultado final.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { regime: PROPRIEDADE_REGIME, data_inicio: PROPRIEDADE_DATA, data_fim: PROPRIEDADE_DATA },
        required: ["data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarDRE(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
        origemHref: "",
      }),
  },
  {
    definicao: {
      name: "consultar_indicadores_dre",
      description: "Consulta indicadores mensais derivados da DRE num ano: margem de contribuição, margem bruta, EBITDA, margem líquida.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { regime: PROPRIEDADE_REGIME, ano: { type: "integer", description: "Ano (ex.: 2026)." } },
        required: ["ano"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) => buscarDREIndicadores(supabase, { tenantId: ctx.tenantId, regime: regimeOuPadrao(input), ano: numeroObrigatorio(input, "ano") }),
  },
  {
    definicao: {
      name: "consultar_fluxo_caixa",
      description: "Consulta a série de fluxo de caixa (entradas/saídas por ponto no tempo) num período e granularidade.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          regime: PROPRIEDADE_REGIME,
          granularidade: { type: "string", enum: GRANULARIDADE_ENUM, description: "Agrupamento temporal dos pontos." },
          data_inicio: PROPRIEDADE_DATA,
          data_fim: PROPRIEDADE_DATA,
        },
        required: ["granularidade", "data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: async (supabase, input, ctx) => {
      const regime = regimeOuPadrao(input);
      const dataInicio = textoObrigatorio(input, "data_inicio");
      // Saldo acumulado só é saldo bancário real em regime realizado — mesmo
      // raciocínio de fluxo-caixa/page.tsx e visao-geral/page.tsx.
      const saldoInicial = regime === "realizado" ? await buscarSaldoAntesDe(supabase, ctx.tenantId, dataInicio) : undefined;
      return buscarFluxoCaixaGrade(supabase, {
        tenantId: ctx.tenantId,
        regime,
        granularidade: textoObrigatorio(input, "granularidade") as Granularidade,
        dataInicio,
        dataFim: textoObrigatorio(input, "data_fim"),
        saldoInicial,
      });
    },
  },
  {
    definicao: {
      name: "consultar_saldo_projetado",
      description: "Consulta o saldo em caixa atual e a projeção de saldo pros próximos dias, incluindo risco de ruptura.",
      strict: true,
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    executar: (supabase, _input, ctx) => buscarSaldoProjetado(supabase, ctx.tenantId),
  },
  {
    definicao: {
      name: "consultar_liquidez",
      description: "Consulta o nível de liquidez aproximada do tenant (RISCO, ATENCAO ou SAUDAVEL) considerando os próximos 30 dias.",
      strict: true,
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    executar: (supabase, _input, ctx) => buscarLiquidezAproximada(supabase, ctx.tenantId),
  },
  {
    definicao: {
      name: "consultar_aging",
      description: "Consulta contas a receber ou a pagar em aberto, agrupadas por faixa de vencimento (aging).",
      strict: true,
      input_schema: { type: "object", properties: { tipo: PROPRIEDADE_TIPO }, required: ["tipo"], additionalProperties: false },
    },
    executar: (supabase, input, ctx) => buscarAging(supabase, { tenantId: ctx.tenantId, tipo: tipoObrigatorio(input) }),
  },
  {
    definicao: {
      name: "consultar_vencimentos",
      description: "Consulta o resumo de vencidos e a vencer (contas a receber ou a pagar), opcionalmente filtrado por uma pessoa/cliente específico.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { tipo: PROPRIEDADE_TIPO, pessoa_id: { type: "string", description: "UUID da pessoa/cliente, se a pergunta for sobre alguém específico." } },
        required: ["tipo"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarResumoVencimentos(supabase, { tenantId: ctx.tenantId, tipo: tipoObrigatorio(input), pessoaId: typeof input.pessoa_id === "string" ? input.pessoa_id : undefined }),
  },
  {
    definicao: {
      name: "consultar_realizado_vs_previsto",
      description: "Consulta quanto do que venceu num período já foi de fato pago/recebido (%Realizado) e quanto disso foi em atraso.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { tipo: PROPRIEDADE_TIPO, mes_inicio: PROPRIEDADE_DATA, mes_fim: PROPRIEDADE_DATA },
        required: ["tipo", "mes_inicio", "mes_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarIndicadoresRealizacao(supabase, { tenantId: ctx.tenantId, tipo: tipoObrigatorio(input), mesInicio: textoObrigatorio(input, "mes_inicio"), mesFim: textoObrigatorio(input, "mes_fim") }),
  },
  {
    definicao: {
      name: "consultar_ponto_equilibrio",
      description: "Consulta o ponto de equilíbrio (faturamento mínimo pra cobrir os gastos fixos) num período.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          regime: PROPRIEDADE_REGIME,
          data_inicio: PROPRIEDADE_DATA,
          data_fim: PROPRIEDADE_DATA,
          base_mc: { type: "string", enum: ["receita_liquida", "receita_operacional"], description: "Base da margem de contribuição. Padrão: receita_liquida." },
        },
        required: ["data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarPontoEquilibrio(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
        baseMC: typeof input.base_mc === "string" ? (input.base_mc as BaseMC) : undefined,
      }),
  },
  {
    definicao: {
      name: "consultar_composicao_fluxo",
      description: "Consulta a composição de entradas e saídas de caixa por categoria, num ano.",
      strict: true,
      input_schema: { type: "object", properties: { ano: { type: "integer", description: "Ano (ex.: 2026)." } }, required: ["ano"], additionalProperties: false },
    },
    executar: (supabase, input, ctx) => buscarComposicaoFluxoCaixa(supabase, { tenantId: ctx.tenantId, ano: numeroObrigatorio(input, "ano"), origemHref: "" }),
  },
  // A partir daqui: tools adicionadas 10/09/2026 pra fechar a lacuna entre o
  // que a IA enxergava (10 relatórios) e o que o sistema já tinha pronto
  // (todos os relatórios de app/src/lib/relatorios/ + Previsionamento) —
  // pedido do usuário ("saber tudo sobre o sistema"). Mesmo padrão das
  // tools acima: wrapper fino de função já existente, sem query nova.
  {
    definicao: {
      name: "consultar_analise_categorias",
      description: "Consulta receitas ou despesas somadas por categoria num período, ordenadas do maior pro menor valor (curva ABC), com % de participação e % acumulado.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { tipo: PROPRIEDADE_TIPO, regime: PROPRIEDADE_REGIME, data_inicio: PROPRIEDADE_DATA, data_fim: PROPRIEDADE_DATA },
        required: ["tipo", "data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarAnaliseCategorias(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
        tipo: tipoObrigatorio(input),
        origemHref: "",
      }),
  },
  {
    definicao: {
      name: "consultar_comparativo_periodos",
      description: "Compara o movimento financeiro mês a mês: contra o mês anterior (AH), contra o mesmo mês do ano anterior (YOY), ou acumulado no ano (YTD).",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          tipo_comparativo: { type: "string", enum: ["AH", "YOY", "YTD"], description: "AH = mês vs mês anterior. YOY = mesmo mês, ano anterior. YTD = acumulado no ano." },
          regime: PROPRIEDADE_REGIME,
          data_inicio: PROPRIEDADE_DATA,
          data_fim: PROPRIEDADE_DATA,
        },
        required: ["tipo_comparativo", "data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarAnaliseComparativa(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        tipo: tipoComparativoObrigatorio(input),
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
      }),
  },
  {
    definicao: {
      name: "consultar_concentracao",
      description: "Consulta o quanto a receita ou despesa depende de poucos clientes/fornecedores (risco de concentração: ALTO, MEDIO ou BAIXO) numa janela de meses.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { tipo: PROPRIEDADE_TIPO, meses_janela: { type: "integer", description: "Janela em meses pra trás. Padrão: 12." } },
        required: ["tipo"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarConcentracao(supabase, {
        tenantId: ctx.tenantId,
        tipo: tipoObrigatorio(input),
        mesesJanela: mesesJanelaOpcional(input, "meses_janela", 12),
        origemHref: "",
      }),
  },
  {
    definicao: {
      name: "consultar_variacao_categorias",
      description: "Consulta quais categorias de receita ou despesa tiveram a maior variação entre o mês atual e o mês anterior, ordenado pelo maior desvio.",
      strict: true,
      input_schema: { type: "object", properties: { tipo: PROPRIEDADE_TIPO }, required: ["tipo"], additionalProperties: false },
    },
    executar: (supabase, input, ctx) => buscarVariacaoCategorias(supabase, { tenantId: ctx.tenantId, tipo: tipoObrigatorio(input) }),
  },
  {
    definicao: {
      name: "consultar_prazos_medios",
      description: "Consulta o prazo médio de recebimento (PMR) e de pagamento (PMP) em dias, e o ciclo de conversão de caixa (PMR - PMP) numa janela de meses.",
      strict: true,
      input_schema: { type: "object", properties: { meses_janela: { type: "integer", description: "Janela em meses pra trás. Padrão: 6." } }, additionalProperties: false },
    },
    executar: async (supabase, input, ctx) => {
      const mesesJanela = mesesJanelaOpcional(input, "meses_janela", 6);
      const [pmr, pmp] = await Promise.all([buscarPMR(supabase, { tenantId: ctx.tenantId, mesesJanela }), buscarPMP(supabase, { tenantId: ctx.tenantId, mesesJanela })]);
      return {
        prazoMedioRecebimentoDias: pmr.dias,
        prazoMedioPagamentoDias: pmp.dias,
        cicloConversaoCaixaDias: pmr.dias - pmp.dias,
        quantidadeBaixasRecebimento: pmr.quantidadeBaixas,
        quantidadeBaixasPagamento: pmp.quantidadeBaixas,
      };
    },
  },
  {
    definicao: {
      name: "consultar_forma_pagamento",
      description: "Consulta a distribuição de recebimentos/pagamentos por forma de pagamento (Pix, boleto, cartão etc.) numa janela de meses, com o atraso médio de cada uma.",
      strict: true,
      input_schema: { type: "object", properties: { meses_janela: { type: "integer", description: "Janela em meses pra trás. Padrão: 6." } }, additionalProperties: false },
    },
    executar: (supabase, input, ctx) =>
      buscarDistribuicaoFormaPagamento(supabase, { tenantId: ctx.tenantId, mesesJanela: mesesJanelaOpcional(input, "meses_janela", 6), origemHref: "" }),
  },
  {
    definicao: {
      name: "consultar_historico_saldo",
      description: "Consulta a série histórica de saldo em caixa: últimos 28 dias realizados mais a projeção até 60 dias à frente.",
      strict: true,
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    executar: (supabase, _input, ctx) => buscarSerieSaldoProjetado(supabase, ctx.tenantId),
  },
  {
    definicao: {
      name: "consultar_centro_custo",
      description: "Consulta entradas, saídas, saldo e margem por centro de custo, num período.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { regime: PROPRIEDADE_REGIME, data_inicio: PROPRIEDADE_DATA, data_fim: PROPRIEDADE_DATA },
        required: ["data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarCentroCusto(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
        origemHref: "",
      }),
  },
  {
    definicao: {
      name: "consultar_contas_bancarias",
      description: "Consulta o extrato gerencial por conta financeira/bancária: crédito, débito e saldo do período, e o saldo acumulado.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { regime: PROPRIEDADE_REGIME, data_inicio: PROPRIEDADE_DATA, data_fim: PROPRIEDADE_DATA },
        required: ["data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarContasBancarias(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
        origemHref: "",
      }),
  },
  {
    definicao: {
      name: "consultar_dfc_matriz",
      description: "Consulta o fluxo de caixa mês a mês (Jan-Dez) agrupado por atividade (operacional, investimento, financiamento), previsto e realizado, num ano.",
      strict: true,
      input_schema: { type: "object", properties: { ano: { type: "integer", description: "Ano (ex.: 2026)." } }, required: ["ano"], additionalProperties: false },
    },
    executar: (supabase, input, ctx) => buscarDFCMatriz(supabase, { tenantId: ctx.tenantId, ano: numeroObrigatorio(input, "ano"), origemHref: "" }),
  },
  {
    definicao: {
      name: "consultar_dre_matriz",
      description: "Consulta a DRE completa mês a mês (Jan-Dez), com total do ano e análise vertical (%), num regime e ano.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { regime: PROPRIEDADE_REGIME, ano: { type: "integer", description: "Ano (ex.: 2026)." } },
        required: ["ano"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) => buscarDREMatriz(supabase, { tenantId: ctx.tenantId, regime: regimeOuPadrao(input), ano: numeroObrigatorio(input, "ano"), origemHref: "" }),
  },
  {
    definicao: {
      name: "consultar_evolucao_ponto_equilibrio",
      description: "Consulta como o ponto de equilíbrio, a receita e a margem de contribuição evoluíram mês a mês ao longo de um ano.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          regime: PROPRIEDADE_REGIME,
          ano: { type: "integer", description: "Ano (ex.: 2026)." },
          base_mc: { type: "string", enum: ["receita_liquida", "receita_operacional"], description: "Base da margem de contribuição. Padrão: receita_liquida." },
        },
        required: ["ano"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarEvolucaoPontoEquilibrio(supabase, {
        tenantId: ctx.tenantId,
        regime: regimeOuPadrao(input),
        baseMC: typeof input.base_mc === "string" ? (input.base_mc as BaseMC) : undefined,
        meses: mesesDoAno(numeroObrigatorio(input, "ano")),
      }),
  },
  {
    definicao: {
      name: "consultar_historico_realizado_vs_previsto",
      description: "Consulta a série histórica de %Realizado e %Pago em atraso ao longo dos últimos N meses (mesmo indicador de consultar_realizado_vs_previsto, mas em série temporal).",
      strict: true,
      input_schema: {
        type: "object",
        properties: { tipo: PROPRIEDADE_TIPO, meses: { type: "integer", description: "Quantidade de meses pra trás. Padrão: 6." } },
        required: ["tipo"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarSerieIndicadoresRealizacao(supabase, { tenantId: ctx.tenantId, tipo: tipoObrigatorio(input), meses: mesesJanelaOpcional(input, "meses", 6) }),
  },
  {
    definicao: {
      name: "consultar_previsto_vs_realizado_fluxo",
      description: "Consulta o fluxo de caixa total (não por categoria) comparando previsto (vencimento) contra realizado (pagamento), por período.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          granularidade: { type: "string", enum: GRANULARIDADE_ENUM, description: "Agrupamento temporal dos pontos." },
          data_inicio: PROPRIEDADE_DATA,
          data_fim: PROPRIEDADE_DATA,
        },
        required: ["granularidade", "data_inicio", "data_fim"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) =>
      buscarPrevistoRealizadoFluxo(supabase, {
        tenantId: ctx.tenantId,
        granularidade: textoObrigatorio(input, "granularidade") as Granularidade,
        dataInicio: textoObrigatorio(input, "data_inicio"),
        dataFim: textoObrigatorio(input, "data_fim"),
      }),
  },
  {
    definicao: {
      name: "consultar_orcado_vs_realizado",
      description: "Consulta a meta orçada (Previsionamento) contra o que foi de fato realizado, por categoria, num ano — mostra o desvio percentual de cada categoria.",
      strict: true,
      input_schema: {
        type: "object",
        properties: { regime: PROPRIEDADE_REGIME, ano: { type: "integer", description: "Ano (ex.: 2026)." } },
        required: ["ano"],
        additionalProperties: false,
      },
    },
    executar: (supabase, input, ctx) => buscarOrcadoVsRealizado(supabase, { tenantId: ctx.tenantId, regime: regimeOuPadrao(input), ano: numeroObrigatorio(input, "ano"), origemHref: "" }),
  },
  {
    definicao: {
      name: "consultar_aging_por_participante",
      description: "Consulta contas a receber ou a pagar em aberto agrupadas por cliente/fornecedor, com o total em aberto e o maior atraso de cada um.",
      strict: true,
      input_schema: { type: "object", properties: { tipo: PROPRIEDADE_TIPO }, required: ["tipo"], additionalProperties: false },
    },
    executar: (supabase, input, ctx) => buscarAgingPorParticipante(supabase, { tenantId: ctx.tenantId, tipo: tipoObrigatorio(input) }),
  },
];
