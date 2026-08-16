import * as XLSX from "xlsx";

export type EncodingSuportado = "utf-8" | "windows-1252" | "iso-8859-1";

export type ResultadoParse = {
  colunas: string[];
  linhas: string[][];
  tipoArquivo: "csv" | "xlsx";
  encodingUsado?: EncodingSuportado;
  delimitadorUsado?: string;
};

export type ParseArquivoOk = { resultado: ResultadoParse; buffer: ArrayBuffer };
export type ParseArquivoResultado = ParseArquivoOk | { erro: string };

const LIMITE_TAMANHO_BYTES = 10 * 1024 * 1024;
const LIMITE_LINHAS = 500;

export function validarArquivo(file: File): string | null {
  const nome = file.name.toLowerCase();
  if (!nome.endsWith(".csv") && !nome.endsWith(".xlsx")) {
    return "Envie um arquivo .csv ou .xlsx.";
  }
  if (file.size > LIMITE_TAMANHO_BYTES) {
    return "O arquivo excede o limite de 10MB.";
  }
  return null;
}

function matrizParaColunas(matriz: unknown[][]): { colunas: string[]; linhas: string[][] } {
  const [cabecalho, ...resto] = matriz;
  const colunas = (cabecalho ?? []).map((c) => String(c ?? "").trim());
  const linhas = resto
    .filter((linha) => Array.isArray(linha) && linha.some((celula) => String(celula ?? "").trim() !== ""))
    .map((linha) => colunas.map((_, i) => String((linha as unknown[])[i] ?? "").trim()));
  return { colunas, linhas };
}

function parseXlsx(buffer: ArrayBuffer): ResultadoParse {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const planilha = workbook.Sheets[workbook.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: false, defval: "" }) as unknown[][];
  const { colunas, linhas } = matrizParaColunas(matriz);
  return { colunas, linhas, tipoArquivo: "xlsx" };
}

// Conta ocorrências de ; vs , fora de aspas na 1ª linha — nunca confia no
// auto-detect das libs, que têm bug documentado nesse ponto (Seção 4 da spec).
function detectarDelimitador(primeiraLinha: string): string {
  let dentroDeAspas = false;
  let semicolons = 0;
  let virgulas = 0;
  for (const char of primeiraLinha) {
    if (char === '"') dentroDeAspas = !dentroDeAspas;
    else if (!dentroDeAspas && char === ";") semicolons++;
    else if (!dentroDeAspas && char === ",") virgulas++;
  }
  return semicolons > 0 ? ";" : virgulas > 0 ? "," : ";";
}

function decodificarComFallback(buffer: ArrayBuffer): { texto: string; encoding: EncodingSuportado } {
  try {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return { texto, encoding: "utf-8" };
  } catch {
    return { texto: new TextDecoder("windows-1252").decode(buffer), encoding: "windows-1252" };
  }
}

function parseCsvTexto(texto: string): { colunas: string[]; linhas: string[][]; delimitador: string } {
  const quebraLinha = texto.indexOf("\n");
  const primeiraLinha = quebraLinha >= 0 ? texto.slice(0, quebraLinha) : texto;
  const delimitador = detectarDelimitador(primeiraLinha);

  const workbook = XLSX.read(texto, { type: "string", FS: delimitador, raw: true });
  const planilha = workbook.Sheets[workbook.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: false, defval: "" }) as unknown[][];
  const { colunas, linhas } = matrizParaColunas(matriz);
  return { colunas, linhas, delimitador };
}

function parseCsvAutomatico(buffer: ArrayBuffer): ResultadoParse {
  const { texto, encoding } = decodificarComFallback(buffer);
  const { colunas, linhas, delimitador } = parseCsvTexto(texto);
  return { colunas, linhas, tipoArquivo: "csv", encodingUsado: encoding, delimitadorUsado: delimitador };
}

// Reprocessa o mesmo buffer com outro encoding — usado quando o usuário
// troca o dropdown manual porque a prévia decodificada saiu errada. Nunca
// precisa re-upload porque o wizard guarda o ArrayBuffer original.
export function reparsearCsvComEncoding(buffer: ArrayBuffer, encoding: EncodingSuportado): ResultadoParse {
  const texto = new TextDecoder(encoding).decode(buffer);
  const { colunas, linhas, delimitador } = parseCsvTexto(texto);
  return { colunas, linhas, tipoArquivo: "csv", encodingUsado: encoding, delimitadorUsado: delimitador };
}

export async function parseArquivo(file: File): Promise<ParseArquivoResultado> {
  const erroValidacao = validarArquivo(file);
  if (erroValidacao) return { erro: erroValidacao };

  const buffer = await file.arrayBuffer();

  let resultado: ResultadoParse;
  try {
    resultado = file.name.toLowerCase().endsWith(".xlsx") ? parseXlsx(buffer) : parseCsvAutomatico(buffer);
  } catch {
    return { erro: "Não foi possível ler o arquivo. Confira se é um .csv ou .xlsx válido." };
  }

  if (resultado.colunas.length === 0) {
    return { erro: "Não foi possível encontrar colunas no arquivo." };
  }
  if (resultado.linhas.length === 0) {
    return { erro: "O arquivo não tem nenhuma linha de dados." };
  }
  if (resultado.linhas.length > LIMITE_LINHAS) {
    return { erro: `O arquivo tem ${resultado.linhas.length} linhas — o limite por importação é ${LIMITE_LINHAS}. Divida em arquivos menores.` };
  }

  return { resultado, buffer };
}
