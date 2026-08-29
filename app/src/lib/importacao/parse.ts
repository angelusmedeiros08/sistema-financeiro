import * as XLSX from "xlsx";
import { repararMojibake } from "./locale-br";

export type EncodingSuportado = "utf-8" | "windows-1252" | "iso-8859-1" | "macintosh";

export type ResultadoParse = {
  colunas: string[];
  linhas: string[][];
  tipoArquivo: "csv" | "xlsx";
  encodingUsado?: EncodingSuportado;
  delimitadorUsado?: string;
  nomeAbaUsada?: string;
  totalAbas?: number;
  // true quando pelo menos 1 célula não estava em UTF-8 e precisou de
  // fallback pra decodificar — cada célula decide sozinha (ver
  // decodificarCsvPorCampo), então "true" não significa que o arquivo
  // inteiro estava errado, só que nem tudo era UTF-8 puro.
  precisouFallbackDeEncoding?: boolean;
};

export type ParseArquivoOk = { resultado: ResultadoParse; buffer: ArrayBuffer };
export type ParseArquivoResultado = ParseArquivoOk | { erro: string };

const LIMITE_TAMANHO_BYTES = 10 * 1024 * 1024;
// Exportado — as Server Actions que executam a importação de fato
// revalidam contra o mesmo número antes de processar (esta checagem aqui é
// só client-side, dá feedback cedo na tela de upload, mas não impede
// chamar a Server Action direto com mais linhas — achado em auditoria de
// segurança, 29/08/2026).
export const LIMITE_LINHAS = 500;

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

// Letras acentuadas que aparecem de verdade em nome de gente/empresa em
// português — usado só pra pontuar caractere >= 0x80 já decodificado, nunca
// pra decidir por byte cru (a mesma faixa de byte produz letra válida ou
// símbolo bizarro dependendo do encoding, então só o RESULTADO decodificado
// distingue os dois — ver decodificarComFallback).
const LETRAS_ACENTUADAS_PT = "áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇñÑ";

// Conta caractere >= 0x80 que não é letra acentuada de português — símbolo
// tipográfico (aspas curvas, travessão, marca registrada, per mille...),
// controle C1 indefinido, ou letra de outro idioma (î, Ž, ı...) quase nunca
// aparece de verdade em nome de cliente/fornecedor. Usado pra pontuar as
// duas decodificações candidatas (windows-1252 vs macintosh) e escolher a
// que "parece mais com texto de verdade", não só a que não trava.
function contarCaracteresImplausiveis(texto: string): number {
  let count = 0;
  for (const ch of texto) {
    if (ch.codePointAt(0)! < 0x80) continue;
    if (!LETRAS_ACENTUADAS_PT.includes(ch)) count++;
  }
  return count;
}

// UTF-8 inválido no arquivo inteiro só descarta a hipótese UTF-8 — ainda
// sobra decidir entre os dois encodings de byte único mais comuns em
// planilha brasileira. windows-1252 é o palpite óbvio (Excel no Windows),
// mas Mac Roman também aparece na prática: Excel/Numbers no Mac oferecem
// "CSV (Macintosh)" como opção de salvar, e os bytes de â/ç/õ/é/ó nesse
// encoding caem em posições que windows-1252 usa pra outra coisa — às
// vezes um controle indefinido, às vezes um símbolo tipográfico plausível
// à primeira vista, às vezes até outra letra acentuada real (î no lugar de
// Ó, achado com um arquivo real de verdade: mesma planilha tinha nome
// batendo certo com windows-1252 e nome batendo certo só com macintosh,
// byte a byte). Só o byte cru nunca decide sozinho quem está certo — as
// duas decodificações candidatas são pontuadas por quantos caracteres
// "não parecem nome de gente" cada uma produz, e vence quem tiver menos.
export function decodificarComFallback(buffer: ArrayBufferLike): { texto: string; encoding: EncodingSuportado } {
  try {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return { texto, encoding: "utf-8" };
  } catch {
    const comoWindows1252 = new TextDecoder("windows-1252").decode(buffer);
    const comoMacintosh = new TextDecoder("macintosh").decode(buffer);
    if (contarCaracteresImplausiveis(comoMacintosh) < contarCaracteresImplausiveis(comoWindows1252)) {
      return { texto: comoMacintosh, encoding: "macintosh" };
    }
    return { texto: comoWindows1252, encoding: "windows-1252" };
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

// Ponto-e-vírgula, quebra de linha e aspas são bytes ASCII (< 0x80) — o
// mesmo byte em UTF-8, windows-1252, macintosh ou iso-8859-1, nunca parte
// de um caractere acentuado nessas codificações. Por isso dá pra achar
// linha/campo direto nos bytes crus, antes de decidir qualquer encoding —
// o que abre caminho pra decodificar campo por campo em vez do arquivo
// inteiro de uma vez só (ver decodificarCsvPorCampo, a razão de existir
// disto).
function dividirBytesEm(bytes: Uint8Array, byteSeparador: number): Uint8Array[] {
  const partes: Uint8Array[] = [];
  let inicio = 0;
  let dentroDeAspas = false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x22) dentroDeAspas = !dentroDeAspas;
    else if (b === byteSeparador && !dentroDeAspas) {
      partes.push(bytes.subarray(inicio, i));
      inicio = i + 1;
    }
  }
  partes.push(bytes.subarray(inicio));
  return partes;
}

function decodificarCampoBytes(campo: Uint8Array, marcarFallback: () => void): string {
  let fim = campo.length;
  if (fim > 0 && campo[fim - 1] === 0x0d) fim--; // \r de quebra de linha estilo Windows
  const semQuebra = campo.subarray(0, fim);
  const { texto, encoding } = decodificarComFallback(semQuebra.buffer.slice(semQuebra.byteOffset, semQuebra.byteOffset + semQuebra.byteLength));
  if (encoding !== "utf-8") marcarFallback();
  const semAspas = texto.length >= 2 && texto.startsWith('"') && texto.endsWith('"') ? texto.slice(1, -1).replace(/""/g, '"') : texto;
  return semAspas.trim();
}

// Cada campo é decodificado com sua própria detecção UTF-8/fallback, não o
// arquivo inteiro de uma vez — achado com uma planilha real (Erick):
// cabeçalho e "Honorários" chegavam em UTF-8 genuíno, mas nomes de cliente
// tinham sido colados de outra fonte e ficaram em Mac Roman dentro do MESMO
// arquivo. Decodificar o buffer inteiro como um encoding só sempre corrompe
// uma das duas partes, não importa qual encoding escolher — só decidir
// campo a campo resolve os dois ao mesmo tempo. Delimitador é sniffado na
// primeira linha decodificada de forma tolerante (não importa o encoding
// exato aqui, só os bytes ASCII de ; e , que já são idênticos em qualquer
// um dos quatro suportados).
function decodificarCsvPorCampo(buffer: ArrayBuffer): { colunas: string[]; linhas: string[][]; delimitador: string; precisouFallback: boolean } {
  const bytes = new Uint8Array(buffer);
  const primeiraQuebra = bytes.indexOf(0x0a);
  const primeiraLinhaTexto = new TextDecoder("utf-8").decode(bytes.subarray(0, primeiraQuebra >= 0 ? primeiraQuebra : bytes.length));
  const delimitador = detectarDelimitador(primeiraLinhaTexto);
  const byteDelimitador = delimitador === ";" ? 0x3b : 0x2c;

  let precisouFallback = false;
  const marcarFallback = () => {
    precisouFallback = true;
  };
  const linhasBytes = dividirBytesEm(bytes, 0x0a).filter((l) => l.length > 0);
  const matriz = linhasBytes.map((linha) => dividirBytesEm(linha, byteDelimitador).map((campo) => decodificarCampoBytes(campo, marcarFallback)));

  const [cabecalhoBruto, ...resto] = matriz;
  const cabecalho = [...(cabecalhoBruto ?? [])];
  while (cabecalho.length > 0 && cabecalho[cabecalho.length - 1] === "") cabecalho.pop();
  const colunas = cabecalho;
  const linhas = resto.filter((linha) => linha.some((c) => c !== "")).map((linha) => colunas.map((_, i) => linha[i] ?? ""));

  return { colunas, linhas, delimitador, precisouFallback };
}

export function parseCsvAutomatico(buffer: ArrayBuffer): ResultadoParse {
  const { colunas, linhas, delimitador, precisouFallback } = decodificarCsvPorCampo(buffer);
  return { colunas, linhas, tipoArquivo: "csv", encodingUsado: "utf-8", delimitadorUsado: delimitador, precisouFallbackDeEncoding: precisouFallback };
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
