export type FormatoNumerico = "BR" | "US";

// Produto é só Brasil — assume vírgula decimal / ponto milhar por padrão,
// com opção manual de trocar pra formato americano (ver Seção 4 da spec:
// não existe heurística confiável pra auto-detectar entre os dois).
export function parseValorPlanilha(bruto: string, formato: FormatoNumerico = "BR"): number | null {
  const limpo = bruto.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;

  // Acusa o formato TROCADO por engano antes de normalizar — achado real
  // testando erro humano comum: com BR ativo (o padrão, quase ninguém troca
  // pra US), alguém digita/cola "1,500.00" (americano) pensando em mil e
  // quinhentos. Sem esta checagem, o separador de milhar americano "," era
  // tratado como decimal BR e todo dígito depois do "." era descartado por
  // "." ser lido como milhar — "1,500.00" virava silenciosamente 1.5 (1000x
  // menor), sem erro nenhum, linha aprovada como "ok". Não é a heurística de
  // auto-detectar formato que a spec já descartou (ambígua pra "1.234"
  // sozinho) — é só validar a ORDEM dos separadores quando os dois aparecem
  // juntos, o que nunca é ambíguo: BR nunca tem "." depois da "," (o milhar
  // sempre vem antes do decimal), e US nunca tem "," depois do ".". Mesmo
  // bug simétrico existia com US ativo e alguém digitando estilo BR.
  const posVirgula = limpo.indexOf(",");
  const posPonto = limpo.indexOf(".");
  if (posVirgula !== -1 && posPonto !== -1) {
    const ordemInvalida = formato === "BR" ? posPonto > posVirgula : posVirgula > posPonto;
    if (ordemInvalida) return null;
  }

  const normalizado = formato === "BR" ? normalizarValorBR(limpo) : limpo.replace(/,/g, "");

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

// Sem vírgula nenhuma, um "." pode ser separador de milhar de verdade OU um
// decimal digitado por engano em formato americano (achado real, 12/09/2026:
// a Importação com IA às vezes extrai valor com ponto decimal em vez de
// vírgula — "45.50" — e o código antigo removia esse ponto como se fosse
// milhar, virando "4550": R$45,50 corrompido pra R$4.550,00, 100x maior, sem
// erro nenhum, linha aprovada como "ok"). O agrupamento de milhar brasileiro
// é SEMPRE em blocos de exatamente 3 dígitos — um "." seguido de qualquer
// contagem diferente de 3 dígitos nunca é um separador de milhar válido, só
// pode ser decimal. Só o ÚLTIMO ponto é candidato a decimal; um "." seguido
// de exatamente 3 dígitos continua ambíguo de propósito (ex.: "1.234" sozinho
// — a spec já descartou tentar auto-detectar esse caso) e continua tratado
// como milhar, como sempre foi.
function normalizarValorBR(limpo: string): string {
  if (limpo.includes(",")) return limpo.replace(/\./g, "").replace(",", ".");

  const posUltimoPonto = limpo.lastIndexOf(".");
  if (posUltimoPonto === -1) return limpo;

  const digitosApos = limpo.length - posUltimoPonto - 1;
  if (digitosApos === 3) return limpo.replace(/\./g, "");

  const antes = limpo.slice(0, posUltimoPonto).replace(/\./g, "");
  const depois = limpo.slice(posUltimoPonto + 1);
  return `${antes}.${depois}`;
}

// Aceita tanto DD/MM/AAAA (texto de CSV) quanto um ISO já pronto (célula de
// data do .xlsx, lida pelo SheetJS como string formatada) — o parser de
// arquivo nunca decide isso, só repassa o texto da célula pra cá.
export function parseDataPlanilha(bruto: string, formato: FormatoNumerico = "BR"): string | null {
  // Corta um horário colado no fim ("15/01/2026 10:30", "15/01/2026 10:30:00")
  // antes de tudo — achado testando erro humano comum: extrato bancário e
  // exportação de outros sistemas frequentemente trazem data e hora juntas
  // na mesma célula, e a hora é irrelevante pra competência/vencimento
  // (regex abaixo já exige o resto da string ser só dígitos e barra/traço,
  // então só remove quando o formato é claramente "data + hora", nunca
  // texto solto como "15 de janeiro de 2026", que continua rejeitado).
  const limpo = bruto.trim().replace(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+\d{1,2}:\d{2}(:\d{2})?$/, "$1");
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
