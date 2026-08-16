import type { ColunaChave, LinhaBruta, LinhaValidada, StatusLinha, TipoEntidadeImportacao } from "./tipos";
import type { FormatoNumerico } from "./locale-br";
import { parseDataPlanilha, parseValorPlanilha } from "./locale-br";

// FNV-1a 32-bit — hash não-criptográfico, só precisa ser estável (mesma
// entrada sempre produz a mesma saída), não resistir a ataque.
function hashEstavel(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// Gera o import_key no momento do parse (não no envio) a partir do conteúdo
// bruto da própria linha (célula a célula, antes do mapeamento) + posição —
// nunca aleatório: se o navegador fechar no meio do import e o usuário
// reabrir com o MESMO arquivo, o parse reproduz exatamente as mesmas
// chaves, e o RPC atômico devolve o evento já criado em vez de duplicar
// (Seção 3/8 da spec). Um crypto.randomUUID() aqui quebraria essa garantia
// — cada reparse geraria chaves novas mesmo pro arquivo idêntico.
export function montarLinhasBrutas(linhasTexto: string[][], mapeamento: Partial<Record<ColunaChave, number>>): LinhaBruta[] {
  const coluna = (celulas: string[], chave: ColunaChave) => {
    const idx = mapeamento[chave];
    return idx === undefined ? "" : (celulas[idx] ?? "").trim();
  };

  return linhasTexto.map((celulas, i) => ({
    linha: i + 2, // +1 pelo cabeçalho, +1 porque é 1-based
    importKey: `imp-${i}-${hashEstavel(celulas.join(""))}`,
    dataCompetencia: coluna(celulas, "data_competencia"),
    valor: coluna(celulas, "valor"),
    categoria: coluna(celulas, "categoria"),
    descricao: coluna(celulas, "descricao"),
    dataVencimento: coluna(celulas, "data_vencimento"),
    dataPagamento: coluna(celulas, "data_pagamento"),
    pessoa: coluna(celulas, "pessoa"),
    documentoPessoa: coluna(celulas, "documento_pessoa"),
    centroCusto: coluna(celulas, "centro_custo"),
    formaPagamento: coluna(celulas, "forma_pagamento"),
  }));
}

export type ResolvedorEntidade = (tipo: TipoEntidadeImportacao, valorOriginal: string) => string | null;

export function validarLinha(bruta: LinhaBruta, formato: FormatoNumerico, resolver: ResolvedorEntidade): LinhaValidada {
  const erros: string[] = [];

  const dataCompetenciaIso = parseDataPlanilha(bruta.dataCompetencia, formato);
  if (!dataCompetenciaIso) erros.push("Data de competência inválida.");

  const valorNumero = parseValorPlanilha(bruta.valor, formato);
  if (valorNumero === null || valorNumero <= 0) erros.push("Valor precisa ser numérico e maior que zero.");

  if (!bruta.descricao.trim()) erros.push("Descrição não informada.");

  if (!bruta.categoria.trim()) {
    erros.push("Categoria não informada.");
  } else if (!resolver("categoria", bruta.categoria)) {
    erros.push("Categoria não resolvida na etapa de revisão.");
  }

  const dataVencimentoIso = bruta.dataVencimento.trim() ? parseDataPlanilha(bruta.dataVencimento, formato) : dataCompetenciaIso;
  if (bruta.dataVencimento.trim() && !dataVencimentoIso) erros.push("Data de vencimento inválida.");

  const dataPagamentoIso = bruta.dataPagamento.trim() ? parseDataPlanilha(bruta.dataPagamento, formato) : null;
  if (bruta.dataPagamento.trim() && !dataPagamentoIso) erros.push("Data de pagamento inválida.");

  const status: StatusLinha = erros.length > 0 ? "erro" : "ok";

  return { ...bruta, dataCompetenciaIso, valorNumero, dataVencimentoIso, dataPagamentoIso, status, erros, avisos: [] };
}

export function validarLinhas(brutas: LinhaBruta[], formato: FormatoNumerico, resolver: ResolvedorEntidade): LinhaValidada[] {
  return brutas.map((b) => validarLinha(b, formato, resolver));
}

function chaveDuplicata(dataCompetenciaIso: string, valorNumero: number): string {
  return `${dataCompetenciaIso}|${valorNumero.toFixed(2)}`;
}

export { chaveDuplicata };

// Upgrade "ok" -> "aviso" quando já existe um evento no tenant com a mesma
// data de competência + valor total — nunca bloqueia (Seção 7), só sinaliza,
// então uma linha com erro de campo continua "erro" mesmo se também bater
// como possível duplicata.
export function aplicarAvisosDuplicata(linhas: LinhaValidada[], duplicatasConhecidas: Set<string>): LinhaValidada[] {
  return linhas.map((l) => {
    if (l.status === "erro" || l.dataCompetenciaIso === null || l.valorNumero === null) return l;
    const chave = chaveDuplicata(l.dataCompetenciaIso, l.valorNumero);
    if (!duplicatasConhecidas.has(chave)) return l;
    return { ...l, status: "aviso" as StatusLinha, avisos: [...l.avisos, "Possível duplicata: já existe um lançamento com a mesma data e valor."] };
  });
}
