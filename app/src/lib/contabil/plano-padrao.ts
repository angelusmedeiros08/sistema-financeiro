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
export const CODIGO_DESPESAS_GERAL = "4.1";

export const CONTAS_CONTABEIS_PADRAO = [
  { codigo: CODIGO_CAIXA_E_BANCOS, nome: "Caixa e Bancos", tipo: "ATIVO", natureza: "DEVEDORA" },
  { codigo: CODIGO_CONTAS_A_RECEBER, nome: "Contas a Receber", tipo: "ATIVO", natureza: "DEVEDORA" },
  { codigo: CODIGO_CONTAS_A_PAGAR, nome: "Contas a Pagar", tipo: "PASSIVO", natureza: "CREDORA" },
  { codigo: CODIGO_RECEITAS_GERAL, nome: "Receitas", tipo: "RECEITA", natureza: "CREDORA" },
  { codigo: CODIGO_DESPESAS_GERAL, nome: "Despesas", tipo: "DESPESA", natureza: "DEVEDORA" },
] as const;
