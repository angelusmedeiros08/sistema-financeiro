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

  const partes = limpo.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!partes) return null;

  const [, p1, p2, anoBruto] = partes;
  const [dia, mes] = formato === "BR" ? [p1, p2] : [p2, p1];
  // Ano de 2 dígitos sempre soma 2000 (26 → 2026), sem janela de pivô —
  // é lançamento financeiro de PME lançando dado atual, não existe
  // cenário real de competência/vencimento anterior aos anos 2000 aqui.
  const ano = anoBruto.length === 2 ? String(2000 + Number(anoBruto)) : anoBruto;
  const diaN = Number(dia);
  const mesN = Number(mes);
  const anoN = Number(ano);
  if (mesN < 1 || mesN > 12 || diaN < 1 || diaN > 31) return null;

  // Confere contra o calendário de verdade (28/29 dias em fevereiro, meses
  // de 30 dias etc.) — o Date do JS rola datas inválidas pro mês seguinte
  // em vez de rejeitar (ex.: 30/02 vira 02/03), então um round-trip é o
  // jeito confiável de pegar isso sem reimplementar regra de ano bissexto.
  const dataTeste = new Date(anoN, mesN - 1, diaN);
  if (dataTeste.getFullYear() !== anoN || dataTeste.getMonth() !== mesN - 1 || dataTeste.getDate() !== diaN) return null;

  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

// Repara mojibake: texto que já chegou corrompido no arquivo de origem
// (bytes UTF-8 de um acento, ex. "á" = 0xC3 0xA1, decodificados como se
// fossem Latin-1 antes de virar texto — produz "Ã¡"). Reverte
// reinterpretando cada caractere da string como um byte Latin-1 (válido
// porque strings JS mapeiam 1:1 pro intervalo 0-255 nesse caso) e
// decodificando esses bytes como UTF-8 de verdade. Só aplica o resultado
// se a decodificação for válida E diferente do original — texto que já
// estava correto nunca é alterado (round-trip falha ou não muda nada).
export function repararMojibake(texto: string): string {
  if (!texto) return texto;

  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) {
    const codigo = texto.charCodeAt(i);
    if (codigo > 0xff) return texto; // não é candidato a Latin-1, não mexe
    bytes[i] = codigo;
  }

  try {
    const reparado = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return reparado !== texto ? reparado : texto;
  } catch {
    return texto;
  }
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
