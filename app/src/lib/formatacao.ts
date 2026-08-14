const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor);
}

const formatadorPercentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatarPercentual(valor: number): string {
  return formatadorPercentual.format(valor);
}

const formatadorNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Sem símbolo de moeda e zero vira "-" — formato compacto pra tabelas com
// muitas colunas de valor lado a lado (matriz de DRE), onde repetir "R$" em
// toda célula só rouba espaço sem acrescentar leitura (a coluna inteira já
// é dinheiro, o contexto já deixa isso claro).
export function formatarNumeroCompacto(valor: number): string {
  if (valor === 0) return "-";
  return formatadorNumero.format(valor);
}

export function formatarDataCurta(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
