// Plano de contas mínimo provisionado para todo tenant novo no cadastro.
// Só o suficiente para o ledger funcionar desde o primeiro lançamento —
// não é o plano de contas completo (isso é trabalho de fase futura).
// Os códigos aqui são a convenção interna usada para localizar as contas
// "de sistema" depois (ex.: para onde vai o crédito ao registrar uma
// despesa em aberto).

export const CODIGO_CAIXA_E_BANCOS = "1.1";
export const CODIGO_CONTAS_A_RECEBER = "1.2";
export const CODIGO_CONTAS_A_PAGAR = "2.1";
export const CODIGO_RECEITAS_GERAL = "3.1";
export const CODIGO_RECEITAS_FINANCEIRAS = "3.2";
export const CODIGO_DESCONTOS_OBTIDOS = "3.3";
export const CODIGO_DESPESAS_GERAL = "4.1";
export const CODIGO_DESPESAS_FINANCEIRAS = "4.2";
export const CODIGO_DESCONTOS_CONCEDIDOS = "4.3";

export const CONTAS_CONTABEIS_PADRAO = [
  { codigo: CODIGO_CAIXA_E_BANCOS, nome: "Caixa e Bancos", tipo: "ATIVO", natureza: "DEVEDORA" },
  { codigo: CODIGO_CONTAS_A_RECEBER, nome: "Contas a Receber", tipo: "ATIVO", natureza: "DEVEDORA" },
  { codigo: CODIGO_CONTAS_A_PAGAR, nome: "Contas a Pagar", tipo: "PASSIVO", natureza: "CREDORA" },
  { codigo: CODIGO_RECEITAS_GERAL, nome: "Receitas", tipo: "RECEITA", natureza: "CREDORA" },
  // usadas na composição de valor de uma baixa (juros/multa/desconto) — sem
  // elas, esses acréscimos/reduções não teriam contrapartida contábil própria
  // e ficariam misturados nas contas gerais, perdendo rastreabilidade.
  { codigo: CODIGO_RECEITAS_FINANCEIRAS, nome: "Receitas Financeiras", tipo: "RECEITA", natureza: "CREDORA" },
  { codigo: CODIGO_DESCONTOS_OBTIDOS, nome: "Descontos Obtidos", tipo: "RECEITA", natureza: "CREDORA" },
  { codigo: CODIGO_DESPESAS_GERAL, nome: "Despesas", tipo: "DESPESA", natureza: "DEVEDORA" },
  { codigo: CODIGO_DESPESAS_FINANCEIRAS, nome: "Despesas Financeiras", tipo: "DESPESA", natureza: "DEVEDORA" },
  { codigo: CODIGO_DESCONTOS_CONCEDIDOS, nome: "Descontos Concedidos", tipo: "DESPESA", natureza: "DEVEDORA" },
] as const;
