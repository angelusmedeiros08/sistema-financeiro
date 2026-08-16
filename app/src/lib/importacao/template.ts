import type { ColunaChave } from "./tipos";
import { normalizarTexto } from "./locale-br";

export const COLUNAS_TEMPLATE: { chave: ColunaChave; rotulo: string; obrigatoria: boolean; ajuda?: string }[] = [
  { chave: "data_competencia", rotulo: "Data de competência", obrigatoria: true },
  { chave: "valor", rotulo: "Valor", obrigatoria: true, ajuda: "positivo, sem sinal — o tipo vem da Categoria" },
  { chave: "categoria", rotulo: "Categoria", obrigatoria: true },
  { chave: "descricao", rotulo: "Descrição", obrigatoria: true },
  { chave: "data_vencimento", rotulo: "Data de vencimento", obrigatoria: false, ajuda: "vazio = igual à competência" },
  { chave: "data_pagamento", rotulo: "Data de pagamento", obrigatoria: false, ajuda: "preenchido = baixa automática" },
  { chave: "pessoa", rotulo: "Cliente/Fornecedor", obrigatoria: false },
  { chave: "documento_pessoa", rotulo: "CPF/CNPJ", obrigatoria: false },
  { chave: "centro_custo", rotulo: "Centro de custo", obrigatoria: false },
  { chave: "forma_pagamento", rotulo: "Forma de pagamento", obrigatoria: false },
];

const LINHA_EXEMPLO: Record<ColunaChave, string> = {
  data_competencia: "15/01/2026",
  valor: "1500,00",
  categoria: "Honorários",
  descricao: "Honorários processo 123",
  data_vencimento: "15/02/2026",
  data_pagamento: "",
  pessoa: "Cliente Exemplo",
  documento_pessoa: "",
  centro_custo: "",
  forma_pagamento: "",
};

export function gerarModeloCsv(): string {
  const cabecalho = COLUNAS_TEMPLATE.map((c) => c.rotulo).join(";");
  const linha = COLUNAS_TEMPLATE.map((c) => LINHA_EXEMPLO[c.chave]).join(";");
  return `${cabecalho}\n${linha}\n`;
}

// Compara o cabeçalho do arquivo enviado (em qualquer ordem) contra os
// rótulos do template, pra pré-preencher o mapeamento — o usuário sempre
// pode corrigir manualmente na tela seguinte se o arquivo não for o modelo.
export function sugerirMapeamentoColunas(colunasArquivo: string[]): Partial<Record<ColunaChave, number>> {
  const normalizados = colunasArquivo.map(normalizarTexto);
  const mapeamento: Partial<Record<ColunaChave, number>> = {};

  for (const { chave, rotulo } of COLUNAS_TEMPLATE) {
    const idx = normalizados.findIndex((c) => c === normalizarTexto(rotulo));
    if (idx >= 0) mapeamento[chave] = idx;
  }

  return mapeamento;
}
