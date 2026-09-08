import * as XLSX from "xlsx";
import type { ColunaChave } from "./tipos";
import { normalizarTexto } from "./locale-br";

export const COLUNAS_TEMPLATE: { chave: ColunaChave; rotulo: string; obrigatoria: boolean; ajuda?: string; sinonimos?: string[] }[] = [
  { chave: "data_competencia", rotulo: "Data de competência", obrigatoria: true, sinonimos: ["Competência", "Data Competência", "Data Emissão", "Emissão"] },
  { chave: "valor", rotulo: "Valor", obrigatoria: true, ajuda: "positivo, sem sinal — o tipo vem da Categoria", sinonimos: ["Valor Total", "Montante"] },
  { chave: "categoria", rotulo: "Categoria", obrigatoria: true, sinonimos: ["Categoria Financeira"] },
  { chave: "descricao", rotulo: "Descrição", obrigatoria: true, sinonimos: ["Histórico", "Descrição do Lançamento", "Observação", "Obs"] },
  {
    chave: "data_vencimento",
    rotulo: "Data de vencimento",
    obrigatoria: false,
    ajuda: "vazio = igual à competência",
    sinonimos: ["Vencimento", "Data Venc"],
  },
  {
    chave: "data_pagamento",
    rotulo: "Data de pagamento",
    obrigatoria: false,
    ajuda: "preenchido = baixa automática",
    sinonimos: ["Data Pgto", "Pago em", "Data da Baixa"],
  },
  { chave: "pessoa", rotulo: "Cliente/Fornecedor", obrigatoria: false, sinonimos: ["Cliente", "Fornecedor", "Nome"] },
  { chave: "documento_pessoa", rotulo: "CPF/CNPJ", obrigatoria: false, sinonimos: ["CNPJ/CPF", "Documento"] },
  { chave: "centro_custo", rotulo: "Centro de custo", obrigatoria: false, sinonimos: ["Centro Custo", "CC"] },
  { chave: "forma_pagamento", rotulo: "Forma de pagamento", obrigatoria: false, sinonimos: ["Forma Pagamento", "Meio de Pagamento"] },
  {
    chave: "numero_parcelas",
    rotulo: "Número de parcelas",
    obrigatoria: false,
    ajuda: "vazio = 1 (à vista); se preenchido com Data de pagamento, a baixa vale só pra 1ª parcela",
    sinonimos: ["Parcelas", "Qtd Parcelas", "Nº Parcelas"],
  },
];

// Nenhum sinônimo pode aparecer em dois campos ao mesmo tempo (ex.: "Pagamento"
// sozinho seria ambíguo entre data_pagamento e forma_pagamento) — checagem
// roda uma vez no carregamento do módulo, falha alto e cedo em vez de deixar
// uma colisão silenciosa decidir errado qual coluna é qual.
(function validarSinonimosSemColisao() {
  const donoPorSinonimo = new Map<string, string>();
  for (const c of COLUNAS_TEMPLATE) {
    for (const rotulo of [c.rotulo, ...(c.sinonimos ?? [])]) {
      const chave = normalizarTexto(rotulo);
      const dono = donoPorSinonimo.get(chave);
      if (dono && dono !== c.chave) {
        throw new Error(`Sinônimo de coluna colidindo: "${rotulo}" pertence tanto a "${dono}" quanto a "${c.chave}".`);
      }
      donoPorSinonimo.set(chave, c.chave);
    }
  }
})();

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
  numero_parcelas: "",
};

export function gerarModeloCsv(): string {
  const cabecalho = COLUNAS_TEMPLATE.map((c) => c.rotulo).join(";");
  const linha = COLUNAS_TEMPLATE.map((c) => LINHA_EXEMPLO[c.chave]).join(";");
  return `${cabecalho}\n${linha}\n`;
}

// Modelo de verdade em .xlsx (não só um .csv de texto) — a estrutura real da
// planilha vem de 2 coisas que só um arquivo binário permite: largura de
// coluna calculada pelo próprio conteúdo (sem coluna espremida abrindo no
// Excel) e um comentário no cabeçalho de cada coluna explicando formato e
// se é obrigatória, sem precisar de nenhuma linha extra de exemplo pra
// transmitir isso. O comentário é metadado da célula (propriedade `c`) —
// nunca entra no valor lido por sheet_to_json (`.v`), então não interfere
// em nada no reconhecimento automático de coluna feito por
// sugerirMapeamentoColunas, que só olha o texto do cabeçalho.
export function gerarModeloXlsx(): Uint8Array {
  const cabecalho = COLUNAS_TEMPLATE.map((c) => c.rotulo);
  const linha = COLUNAS_TEMPLATE.map((c) => LINHA_EXEMPLO[c.chave]);
  const planilha = XLSX.utils.aoa_to_sheet([cabecalho, linha]);

  planilha["!cols"] = COLUNAS_TEMPLATE.map((c) => ({ wch: Math.max(c.rotulo.length + 2, 16) }));

  COLUNAS_TEMPLATE.forEach((c, i) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: i });
    const partes = [c.obrigatoria ? "Obrigatória." : "Opcional."];
    if (c.ajuda) partes.push(c.ajuda.charAt(0).toUpperCase() + c.ajuda.slice(1) + ".");
    if (c.sinonimos?.length) partes.push(`Também reconhecido como: ${c.sinonimos.join(", ")}.`);
    XLSX.utils.cell_add_comment(planilha[ref], partes.join(" "), "Finanssi");
  });

  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, "Modelo");
  return XLSX.write(pasta, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

// Compara o cabeçalho do arquivo enviado (em qualquer ordem) contra os
// rótulos do template, pra pré-preencher o mapeamento — o usuário sempre
// pode corrigir manualmente na tela seguinte se o arquivo não for o modelo.
// Prioridade: regra aprendida do tenant pro cabeçalho exato → rótulo oficial
// → sinônimo curado → sem sugestão. Nunca fuzzy — ver spec (Data de
// pagamento vs. Data de vencimento são parecidas demais pra arriscar).
export function sugerirMapeamentoColunas(
  colunasArquivo: string[],
  regrasAprendidas: Record<string, string> = {},
): Partial<Record<ColunaChave, number>> {
  const normalizados = colunasArquivo.map(normalizarTexto);
  const mapeamento: Partial<Record<ColunaChave, number>> = {};

  normalizados.forEach((cabecalho, idx) => {
    const chaveAprendida = regrasAprendidas[cabecalho] as ColunaChave | undefined;
    if (chaveAprendida && COLUNAS_TEMPLATE.some((c) => c.chave === chaveAprendida)) {
      mapeamento[chaveAprendida] = idx;
    }
  });

  for (const { chave, rotulo, sinonimos } of COLUNAS_TEMPLATE) {
    if (mapeamento[chave] !== undefined) continue; // regra aprendida já resolveu
    const candidatos = [rotulo, ...(sinonimos ?? [])].map(normalizarTexto);
    const idx = normalizados.findIndex((c) => candidatos.includes(c));
    if (idx >= 0) mapeamento[chave] = idx;
  }

  return mapeamento;
}
