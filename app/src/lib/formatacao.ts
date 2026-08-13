const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor);
}

export function formatarDataCurta(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
