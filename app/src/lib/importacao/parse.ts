import * as XLSX from "xlsx";
import { repararMojibake } from "./locale-br";

export type EncodingSuportado = "utf-8" | "windows-1252" | "iso-8859-1";

export type ResultadoParse = {
  colunas: string[];
  linhas: string[][];
  tipoArquivo: "csv" | "xlsx";
  encodingUsado?: EncodingSuportado;
  delimitadorUsado?: string;
  nomeAbaUsada?: string;
  totalAbas?: number;
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

// Datas do Excel são number seriais sem timezone — o SheetJS (com
// cellDates:true) sempre converte esse serial pro espaço UTC, então ler de
// volta com getUTCFullYear/getUTCMonth/getUTCDate é o único jeito estável
// (getFullYear/getMonth locais dependeriam do fuso do processo rodando o
// import, podendo virar o dia errado). Célula numérica vira String()
// direto (ponto decimal, nunca vírgula — quem interpreta locale é
// parseValorPlanilha, não aqui).
function celulaParaTexto(valor: unknown): string {
  if (valor instanceof Date) {
    const ano = valor.getUTCFullYear();
    const mes = String(valor.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(valor.getUTCDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }
  if (typeof valor === "number") return String(valor);
  // repararMojibake: cobre os dois caminhos (XLSX e CSV) num único ponto —
  // ambos convergem pra matrizParaColunas → celulaParaTexto antes de virar
  // coluna/linha (ver decisão na spec de importação: corrupção nasce no
  // arquivo de origem, não no nosso decode, então o reparo é pós-leitura).
  return repararMojibake(String(valor ?? "").trim());
}

function matrizParaColunas(matriz: unknown[][]): { colunas: string[]; linhas: string[][] } {
  const [cabecalhoBruto, ...resto] = matriz;
  const cabecalho = [...(cabecalhoBruto ?? [])];
  // Uma linha de dado mais larga que o cabeçalho faz o SheetJS considerar a
  // planilha inteira com essa largura (é uma grade, não uma lista de arrays
  // soltos) — o cabeçalho volta com células fantasma vazias no fim. Corta
  // essas células fantasma antes de fixar quantas colunas existem de
  // verdade, senão sobra "Coluna 5", "Coluna 6" sem nome no mapeamento e as
  // linhas longas nunca são truncadas nas colunas que ninguém nomeou.
  while (cabecalho.length > 0 && celulaParaTexto(cabecalho[cabecalho.length - 1]) === "") {
    cabecalho.pop();
  }
  const colunas = cabecalho.map(celulaParaTexto);
  const linhas = resto
    .filter((linha) => Array.isArray(linha) && linha.some((celula) => celulaParaTexto(celula) !== ""))
    .map((linha) => colunas.map((_, i) => celulaParaTexto((linha as unknown[])[i])));
  return { colunas, linhas };
}

function parseXlsx(buffer: ArrayBuffer): ResultadoParse {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const nomeAba = workbook.SheetNames[0];
  const planilha = workbook.Sheets[nomeAba];
  // raw:true devolve o tipo nativo da célula (Date, number, string) em vez
  // do texto já formatado pelo SheetJS — o texto formatado segue o padrão
  // curto americano da célula original (ex.: "1/15/26"), que nem bate com
  // o que o Excel mostra nem com o que parseDataPlanilha reconhece.
  // celulaParaTexto() é quem decide o formato final, sempre ISO pra data.
  const matriz = XLSX.utils.sheet_to_json(planilha, { header: 1, raw: true, defval: "" }) as unknown[][];
  const { colunas, linhas } = matrizParaColunas(matriz);
  return { colunas, linhas, tipoArquivo: "xlsx", nomeAbaUsada: nomeAba, totalAbas: workbook.SheetNames.length };
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

export function decodificarComFallback(buffer: ArrayBuffer): { texto: string; encoding: EncodingSuportado } {
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

export function parseCsvAutomatico(buffer: ArrayBuffer): ResultadoParse {
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
