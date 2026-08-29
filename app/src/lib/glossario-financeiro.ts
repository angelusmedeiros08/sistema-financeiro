// Fonte única de explicação pra cada termo técnico usado na UI — nenhuma
// tela escreve o texto direto, todas importam daqui (evita duas telas
// explicando "Margem de contribuição" com palavras diferentes). Grounded em
// como ESTE sistema calcula cada indicador (não fórmula genérica de livro-
// texto) — ver docs/superpowers/specs/2026-08-29-glossario-financeiro-design.md.
export type TermoGlossario = {
  titulo: string;
  explicacao: string;
  formula?: string;
};

export const GLOSSARIO_FINANCEIRO: Record<string, TermoGlossario> = {
  pmr: {
    titulo: "Prazo médio de recebimento (PMR)",
    explicacao:
      "Quantos dias, em média, você demora pra receber depois do vencimento. Calculado por parcela paga (não por saldo contábil): data de pagamento menos data de vencimento, ponderado pelo valor de cada parcela.",
  },
  pmp: {
    titulo: "Prazo médio de pagamento (PMP)",
    explicacao:
      "Quantos dias, em média, você demora pra pagar depois do vencimento. Mesmo cálculo do PMR, sobre as contas a pagar. Aqui, mais dias significa que o dinheiro fica mais tempo no seu caixa — até certo ponto: PMP muito alto pode ser atraso sistemático, não negociação.",
  },
  ciclo_conversao_caixa: {
    titulo: "Ciclo de conversão de caixa",
    explicacao:
      'Quantos dias o dinheiro fica "preso" entre pagar e receber. Quanto menor (ou mais negativo), melhor — significa que você recebe antes de precisar pagar.',
    formula: "PMR − PMP",
  },
  aging: {
    titulo: "Aging",
    explicacao:
      "Quanto do que está vencido, separado por quanto tempo já passou do vencimento (0-15 dias, 16-30, 31-60...). Mostra se o atraso é recente ou já crônico.",
  },
  liquidez_aproximada: {
    titulo: "Liquidez aproximada",
    explicacao:
      "Compara o que você tem e vai ter de dinheiro nos próximos 30 dias com o que vai precisar pagar no mesmo período — incluindo o que já venceu dos dois lados. Abaixo de 1,0 significa que o que entra não cobre o que sai nesse horizonte.",
    formula: "(Caixa atual + a receber em 30 dias) ÷ a pagar em 30 dias",
  },
  margem_contribuicao: {
    titulo: "Margem de contribuição",
    explicacao:
      "Receita menos os custos e despesas que variam com ela (ex.: comissão, imposto sobre venda) — o que sobra pra cobrir os custos fixos e gerar lucro, em % da receita líquida.",
  },
  margem_bruta: {
    titulo: "Margem bruta",
    explicacao: "Receita menos o custo direto do que foi vendido/prestado (CMV/CSP), em % da receita líquida.",
  },
  ebitda: {
    titulo: "EBITDA",
    explicacao:
      'Lucro operacional antes de juros, impostos, depreciação e amortização — o resultado do negócio "no dia a dia", sem o efeito de financiamento, imposto de renda ou desgaste de ativo.',
  },
  margem_liquida: {
    titulo: "Margem líquida",
    explicacao: "O que sobra de lucro depois de tudo — todos os custos, despesas, juros e impostos — em % da receita líquida.",
  },
  ponto_equilibrio: {
    titulo: "Ponto de equilíbrio",
    explicacao: "Quanto você precisa faturar num mês pra cobrir os custos fixos, sem lucro nem prejuízo.",
    formula: "Custos fixos ÷ Margem de contribuição %",
  },
};
