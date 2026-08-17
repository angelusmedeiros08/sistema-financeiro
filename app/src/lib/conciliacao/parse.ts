import { parseStrict } from "ofx-js";
import { decodificarComFallback, parseCsvAutomatico, type EncodingSuportado } from "@/lib/importacao/parse";
import { normalizarTexto, parseDataPlanilha, parseValorPlanilha } from "@/lib/importacao/locale-br";

const LIMITE_TAMANHO_BYTES = 10 * 1024 * 1024;
// Extrato bancário tende a ter bem mais linhas que uma planilha de
// lançamentos manuais — um mês de movimento de uma PME ativa passa fácil de
// 500.
const LIMITE_LINHAS = 2000;

export type TipoExtratoLinha = "CREDITO" | "DEBITO";

export type LinhaExtratoBruta = {
  data: string; // ISO YYYY-MM-DD
  valor: number; // sempre positivo — o tipo é quem diz a direção
  tipo: TipoExtratoLinha;
  descricao: string;
  fitid: string | null;
};

export function validarArquivoExtrato(file: File): string | null {
  const nome = file.name.toLowerCase();
  if (!nome.endsWith(".ofx") && !nome.endsWith(".csv")) {
    return "Envie um arquivo .ofx ou .csv.";
  }
  if (file.size > LIMITE_TAMANHO_BYTES) {
    return "O arquivo excede o limite de 10MB.";
  }
  return null;
}

// Composta em vez de hash criptográfico — não precisa resistir a colisão
// adversarial, só detectar reimportação do mesmo arquivo (Seção "Modelo de
// dados" da spec). Risco residual aceito: duas transações genuinamente
// diferentes com mesma data/valor/descrição normalizada colidem — mesmo
// trade-off já documentado noutros pontos do import.
export function calcularChaveDedup(linha: Pick<LinhaExtratoBruta, "data" | "valor" | "tipo" | "descricao">): string {
  return `${linha.data}|${linha.tipo}|${linha.valor.toFixed(2)}|${normalizarTexto(linha.descricao)}`;
}

function normalizarLista<T>(valor: T | T[] | undefined): T[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

// OFX guarda data como YYYYMMDD[HHMMSS[.mmm[±HH:MM]]] — só a parte de data
// importa pra conciliação.
function dataOfxParaIso(dtposted: string): string | null {
  const match = dtposted.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, ano, mes, dia] = match;
  return `${ano}-${mes}-${dia}`;
}

export function parseOfx(texto: string): LinhaExtratoBruta[] | { erro: string } {
  let ofx;
  try {
    ofx = parseStrict(texto);
  } catch {
    return { erro: "Não foi possível ler o arquivo OFX. Confira se o arquivo não está corrompido." };
  }

  const respostas = normalizarLista(ofx.OFX.BANKMSGSRSV1?.STMTTRNRS);
  const linhas: LinhaExtratoBruta[] = [];

  for (const resposta of respostas) {
    const transacoes = normalizarLista(resposta.STMTRS?.BANKTRANLIST?.STMTTRN);
    for (const t of transacoes) {
      const dataIso = dataOfxParaIso(t.DTPOSTED);
      const valorBruto = Number(t.TRNAMT);
      if (!dataIso || !Number.isFinite(valorBruto) || valorBruto === 0) continue;

      linhas.push({
        data: dataIso,
        valor: Math.abs(valorBruto),
        tipo: valorBruto > 0 ? "CREDITO" : "DEBITO",
        descricao: t.MEMO?.trim() || t.NAME?.trim() || t.PAYEE?.NAME?.trim() || "",
        fitid: t.FITID?.trim() || null,
      });
    }
  }

  if (linhas.length === 0) {
    return { erro: "Nenhuma transação encontrada no arquivo OFX." };
  }
  return linhas;
}

export type ColunaExtratoChave = "data" | "valor" | "descricao";
export type MapeamentoColunasExtrato = Partial<Record<ColunaExtratoChave, number>>;

export const COLUNAS_TEMPLATE_EXTRATO: { chave: ColunaExtratoChave; rotulo: string; obrigatoria: boolean; ajuda?: string }[] = [
  { chave: "data", rotulo: "Data", obrigatoria: true },
  { chave: "valor", rotulo: "Valor", obrigatoria: true, ajuda: "positivo para crédito, negativo para débito" },
  { chave: "descricao", rotulo: "Descrição", obrigatoria: true },
];

export function sugerirMapeamentoExtrato(colunasArquivo: string[]): MapeamentoColunasExtrato {
  const normalizados = colunasArquivo.map(normalizarTexto);
  const mapeamento: MapeamentoColunasExtrato = {};
  for (const { chave, rotulo } of COLUNAS_TEMPLATE_EXTRATO) {
    const idx = normalizados.findIndex((c) => c === normalizarTexto(rotulo));
    if (idx >= 0) mapeamento[chave] = idx;
  }
  return mapeamento;
}

export function montarLinhasBrutasCsv(linhasTexto: string[][], mapeamento: MapeamentoColunasExtrato): { linha: number; data: string; valor: string; descricao: string }[] {
  const coluna = (celulas: string[], chave: ColunaExtratoChave) => {
    const idx = mapeamento[chave];
    return idx === undefined ? "" : (celulas[idx] ?? "").trim();
  };
  return linhasTexto.map((celulas, i) => ({
    linha: i + 2,
    data: coluna(celulas, "data"),
    valor: coluna(celulas, "valor"),
    descricao: coluna(celulas, "descricao"),
  }));
}

export type LinhaCsvConvertida = { linha: number; ok: true; bruta: LinhaExtratoBruta } | { linha: number; ok: false; erro: string };

export function converterLinhaCsv(bruta: { linha: number; data: string; valor: string; descricao: string }): LinhaCsvConvertida {
  const dataIso = parseDataPlanilha(bruta.data);
  if (!dataIso) return { linha: bruta.linha, ok: false, erro: `Data inválida: "${bruta.data}".` };

  const valorNumero = parseValorPlanilha(bruta.valor);
  if (valorNumero === null || valorNumero === 0) return { linha: bruta.linha, ok: false, erro: `Valor inválido: "${bruta.valor}".` };

  return {
    linha: bruta.linha,
    ok: true,
    bruta: {
      data: dataIso,
      valor: Math.abs(valorNumero),
      tipo: valorNumero > 0 ? "CREDITO" : "DEBITO",
      descricao: bruta.descricao,
      fitid: null,
    },
  };
}

export type ResultadoParseExtrato =
  | { tipo: "ofx"; linhas: LinhaExtratoBruta[] }
  | {
      tipo: "csv";
      colunas: string[];
      linhasTexto: string[][];
      mapeamentoSugerido: MapeamentoColunasExtrato;
      encodingUsado: EncodingSuportado;
      delimitadorUsado: string;
      buffer: ArrayBuffer;
    }
  | { erro: string };

export async function parseArquivoExtrato(file: File): Promise<ResultadoParseExtrato> {
  const erroValidacao = validarArquivoExtrato(file);
  if (erroValidacao) return { erro: erroValidacao };

  const buffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".ofx")) {
    const { texto } = decodificarComFallback(buffer);
    const resultado = parseOfx(texto);
    if ("erro" in resultado) return resultado;
    if (resultado.length > LIMITE_LINHAS) {
      return { erro: `O arquivo tem ${resultado.length} transações — o limite por importação é ${LIMITE_LINHAS}.` };
    }
    return { tipo: "ofx", linhas: resultado };
  }

  let resultado;
  try {
    resultado = parseCsvAutomatico(buffer);
  } catch {
    return { erro: "Não foi possível ler o arquivo. Confira se é um .csv válido." };
  }
  if (resultado.colunas.length === 0) return { erro: "Não foi possível encontrar colunas no arquivo." };
  if (resultado.linhas.length === 0) return { erro: "O arquivo não tem nenhuma linha de dados." };
  if (resultado.linhas.length > LIMITE_LINHAS) {
    return { erro: `O arquivo tem ${resultado.linhas.length} linhas — o limite por importação é ${LIMITE_LINHAS}.` };
  }

  return {
    tipo: "csv",
    colunas: resultado.colunas,
    linhasTexto: resultado.linhas,
    mapeamentoSugerido: sugerirMapeamentoExtrato(resultado.colunas),
    encodingUsado: resultado.encodingUsado!,
    delimitadorUsado: resultado.delimitadorUsado!,
    buffer,
  };
}
