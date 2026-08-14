// Plano de contas provisionado para todo tenant novo no cadastro — grupo
// (nível 1, totalizador, nunca recebe partida) + contas (nível 2). Os
// códigos das contas são a convenção interna usada para localizar as
// contas "de sistema" depois (ex.: para onde vai o crédito ao registrar
// uma despesa em aberto); os códigos de grupo (1/2/3/4) nunca são
// referenciados por código no código-fonte, só existem pra hierarquia.

export const CODIGO_GRUPO_ATIVO = "1";
export const CODIGO_GRUPO_PASSIVO = "2";
export const CODIGO_GRUPO_RECEITA = "3";
export const CODIGO_GRUPO_DESPESA = "4";

export const GRUPOS_CONTAS_PADRAO = [
  { codigo: CODIGO_GRUPO_ATIVO, nome: "Ativo", tipo: "ATIVO", natureza: "DEVEDORA" },
  { codigo: CODIGO_GRUPO_PASSIVO, nome: "Passivo", tipo: "PASSIVO", natureza: "CREDORA" },
  { codigo: CODIGO_GRUPO_RECEITA, nome: "Receita", tipo: "RECEITA", natureza: "CREDORA" },
  { codigo: CODIGO_GRUPO_DESPESA, nome: "Despesa", tipo: "DESPESA", natureza: "DEVEDORA" },
] as const;

export const CODIGO_CAIXA_E_BANCOS = "1.1";
export const CODIGO_CONTAS_A_RECEBER = "1.2";
export const CODIGO_CONTAS_A_PAGAR = "2.1";
export const CODIGO_VALORES_TERCEIROS_EM_TRANSITO = "2.2";
export const CODIGO_RECEITAS_GERAL = "3.1";
export const CODIGO_RECEITAS_FINANCEIRAS = "3.2";
export const CODIGO_DESCONTOS_OBTIDOS = "3.3";
export const CODIGO_DESPESAS_GERAL = "4.1";
export const CODIGO_DESPESAS_FINANCEIRAS = "4.2";
export const CODIGO_DESCONTOS_CONCEDIDOS = "4.3";

export const CONTAS_CONTABEIS_PADRAO = [
  { codigo: CODIGO_CAIXA_E_BANCOS, nome: "Caixa e Bancos", tipo: "ATIVO", natureza: "DEVEDORA", grupoCodigo: CODIGO_GRUPO_ATIVO, sistema: true },
  { codigo: CODIGO_CONTAS_A_RECEBER, nome: "Contas a Receber", tipo: "ATIVO", natureza: "DEVEDORA", grupoCodigo: CODIGO_GRUPO_ATIVO, sistema: true },
  { codigo: CODIGO_CONTAS_A_PAGAR, nome: "Contas a Pagar", tipo: "PASSIVO", natureza: "CREDORA", grupoCodigo: CODIGO_GRUPO_PASSIVO, sistema: true },
  // valor que passa pelo caixa do escritório mas não é receita dele (ex.:
  // custas processuais adiantadas pelo cliente) — não referenciada por
  // código no código-fonte ainda, base pro ciclo futuro de conta corrente
  // de custas.
  {
    codigo: CODIGO_VALORES_TERCEIROS_EM_TRANSITO,
    nome: "Valores de Terceiros em Trânsito",
    tipo: "PASSIVO",
    natureza: "CREDORA",
    grupoCodigo: CODIGO_GRUPO_PASSIVO,
    sistema: false,
  },
  { codigo: CODIGO_RECEITAS_GERAL, nome: "Receitas Operacionais", tipo: "RECEITA", natureza: "CREDORA", grupoCodigo: CODIGO_GRUPO_RECEITA, sistema: true },
  // usadas na composição de valor de uma baixa (juros/multa/desconto) — sem
  // elas, esses acréscimos/reduções não teriam contrapartida contábil própria
  // e ficariam misturados nas contas gerais, perdendo rastreabilidade.
  {
    codigo: CODIGO_RECEITAS_FINANCEIRAS,
    nome: "Receitas Financeiras",
    tipo: "RECEITA",
    natureza: "CREDORA",
    grupoCodigo: CODIGO_GRUPO_RECEITA,
    sistema: true,
  },
  { codigo: CODIGO_DESCONTOS_OBTIDOS, nome: "Descontos Obtidos", tipo: "RECEITA", natureza: "CREDORA", grupoCodigo: CODIGO_GRUPO_RECEITA, sistema: true },
  { codigo: CODIGO_DESPESAS_GERAL, nome: "Despesas Operacionais", tipo: "DESPESA", natureza: "DEVEDORA", grupoCodigo: CODIGO_GRUPO_DESPESA, sistema: true },
  {
    codigo: CODIGO_DESPESAS_FINANCEIRAS,
    nome: "Despesas Financeiras",
    tipo: "DESPESA",
    natureza: "DEVEDORA",
    grupoCodigo: CODIGO_GRUPO_DESPESA,
    sistema: true,
  },
  {
    codigo: CODIGO_DESCONTOS_CONCEDIDOS,
    nome: "Descontos Concedidos",
    tipo: "DESPESA",
    natureza: "DEVEDORA",
    grupoCodigo: CODIGO_GRUPO_DESPESA,
    sistema: true,
  },
] as const;
