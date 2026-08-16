export type FormatoNumerico = "BR" | "US";

// Produto é só Brasil — assume vírgula decimal / ponto milhar por padrão,
// com opção manual de trocar pra formato americano (ver Seção 4 da spec:
// não existe heurística confiável pra auto-detectar entre os dois).
export function parseValorPlanilha(bruto: string, formato: FormatoNumerico = "BR"): number | null {
  const limpo = bruto.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;

  const normalizado = formato === "BR" ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(/,/g, "");

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

// Aceita tanto DD/MM/AAAA (texto de CSV) quanto um ISO já pronto (célula de
// data do .xlsx, lida pelo SheetJS como string formatada) — o parser de
// arquivo nunca decide isso, só repassa o texto da célula pra cá.
export function parseDataPlanilha(bruto: string, formato: FormatoNumerico = "BR"): string | null {
  const limpo = bruto.trim();
  if (!limpo) return null;

  const isoDireto = limpo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDireto) return `${isoDireto[1]}-${isoDireto[2]}-${isoDireto[3]}`;

  const partes = limpo.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!partes) return null;

  const [, p1, p2, ano] = partes;
  const [dia, mes] = formato === "BR" ? [p1, p2] : [p2, p1];
  const diaN = Number(dia);
  const mesN = Number(mes);
  if (mesN < 1 || mesN > 12 || diaN < 1 || diaN > 31) return null;

  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

export function normalizarTexto(bruto: string): string {
  return bruto.normalize("NFD").replace(MARCAS_DIACRITICAS, "").trim().toLowerCase();
}

export function formatarDataIsoParaBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarValorParaBR(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
