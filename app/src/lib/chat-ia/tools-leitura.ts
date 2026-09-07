import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Cliente, Regime, Granularidade } from "@/lib/relatorios/regime";
import type { ContextoChat } from "./tipos";
import { buscarDRE, buscarDREIndicadores } from "@/lib/relatorios/dre";
import { buscarFluxoCaixaGrade } from "@/lib/relatorios/fluxo-caixa";
import { buscarSaldoProjetado, buscarSaldoAntesDe } from "@/lib/relatorios/saldo-projetado";
import { buscarLiquidezAproximada } from "@/lib/relatorios/liquidez-aproximada";
import { buscarAging, buscarResumoVencimentos } from "@/lib/relatorios/aging";
import { buscarIndicadoresRealizacao } from "@/lib/relatorios/indicadores-gauge";
import { buscarPontoEquilibrio, type BaseMC } from "@/lib/relatorios/ponto-equilibrio";
import { buscarComposicaoFluxoCaixa } from "@/lib/relatorios/dfc";

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
      input_schema: { type: "object", properties: {} },
    },
    executar: (supabase, _input, ctx) => buscarSaldoProjetado(supabase, ctx.tenantId),
  },
  {
    definicao: {
      name: "consultar_liquidez",
      description: "Consulta o nível de liquidez aproximada do tenant (RISCO, ATENCAO ou SAUDAVEL) considerando os próximos 30 dias.",
      strict: true,
      input_schema: { type: "object", properties: {} },
    },
    executar: (supabase, _input, ctx) => buscarLiquidezAproximada(supabase, ctx.tenantId),
  },
  {
    definicao: {
      name: "consultar_aging",
      description: "Consulta contas a receber ou a pagar em aberto, agrupadas por faixa de vencimento (aging).",
      strict: true,
      input_schema: { type: "object", properties: { tipo: PROPRIEDADE_TIPO }, required: ["tipo"] },
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
      input_schema: { type: "object", properties: { ano: { type: "integer", description: "Ano (ex.: 2026)." } }, required: ["ano"] },
    },
    executar: (supabase, input, ctx) => buscarComposicaoFluxoCaixa(supabase, { tenantId: ctx.tenantId, ano: numeroObrigatorio(input, "ano"), origemHref: "" }),
  },
];
