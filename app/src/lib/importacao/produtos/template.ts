import { normalizarTexto } from "@/lib/importacao/locale-br";
import type { ColunaChaveProduto, LinhaBrutaProduto } from "./tipos";

export type ColunaTemplateProduto = { chave: ColunaChaveProduto; rotulo: string; obrigatoria: boolean; ajuda?: string; sinonimos?: string[] };

export const COLUNAS_TEMPLATE_PRODUTO: ColunaTemplateProduto[] = [
  { chave: "nome", rotulo: "Nome", obrigatoria: true, sinonimos: ["Produto", "Item", "Descrição do item"] },
  { chave: "tipo", rotulo: "Tipo", obrigatoria: true, ajuda: "Produto ou Serviço", sinonimos: ["Produto/Serviço"] },
  { chave: "descricao", rotulo: "Descrição", obrigatoria: false },
  { chave: "preco_venda", rotulo: "Preço de venda", obrigatoria: true, sinonimos: ["Preço", "Valor", "Valor unitário"] },
  { chave: "categoria", rotulo: "Categoria de receita", obrigatoria: true, sinonimos: ["Categoria"] },
  { chave: "unidade_medida", rotulo: "Unidade", obrigatoria: false, sinonimos: ["Unidade de medida", "UN"] },
  { chave: "codigo_referencia", rotulo: "Código/SKU", obrigatoria: false, sinonimos: ["SKU", "Código", "Referência"] },
];

// Mesma checagem de colisão que os outros dois templates (lib/importacao/
// template.ts, lib/pessoas/importacao/template.ts) já fazem — independente
// deles, a lista de sinônimos de um não protege os outros.
(function validarSinonimosSemColisao() {
  const donoPorSinonimo = new Map<string, string>();
  for (const c of COLUNAS_TEMPLATE_PRODUTO) {
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

export function gerarModeloCsvProdutos(): string {
  const cabecalho = COLUNAS_TEMPLATE_PRODUTO.map((c) => c.rotulo).join(";");
  const linhaExemplo = ["Consultoria Jurídica Mensal", "Serviço", "", "1500,00", "Honorários", "", ""].join(";");
  return `${cabecalho}\n${linhaExemplo}\n`;
}

export function sugerirMapeamentoColunasProduto(
  colunasArquivo: string[],
  regrasAprendidas: Record<string, string> = {},
): Partial<Record<ColunaChaveProduto, number>> {
  const normalizados = colunasArquivo.map(normalizarTexto);
  const mapeamento: Partial<Record<ColunaChaveProduto, number>> = {};
  const chavesValidas = new Set(COLUNAS_TEMPLATE_PRODUTO.map((c) => c.chave));

  normalizados.forEach((cabecalho, idx) => {
    const chaveAprendida = regrasAprendidas[cabecalho] as ColunaChaveProduto | undefined;
    if (chaveAprendida && chavesValidas.has(chaveAprendida)) {
      mapeamento[chaveAprendida] = idx;
    }
  });

  for (const { chave, rotulo, sinonimos } of COLUNAS_TEMPLATE_PRODUTO) {
    if (mapeamento[chave] !== undefined) continue;
    const candidatos = [rotulo, ...(sinonimos ?? [])].map(normalizarTexto);
    const idx = normalizados.findIndex((c) => candidatos.includes(c));
    if (idx >= 0) mapeamento[chave] = idx;
  }

  return mapeamento;
}

export function montarLinhasBrutasProduto(linhasTexto: string[][], mapeamento: Partial<Record<ColunaChaveProduto, number>>): LinhaBrutaProduto[] {
  const coluna = (celulas: string[], chave: ColunaChaveProduto) => {
    const idx = mapeamento[chave];
    return idx === undefined ? "" : (celulas[idx] ?? "").trim();
  };

  return linhasTexto.map((celulas, i) => ({
    linha: i + 2,
    nome: coluna(celulas, "nome"),
    tipo: coluna(celulas, "tipo"),
    descricao: coluna(celulas, "descricao"),
    precoVenda: coluna(celulas, "preco_venda"),
    categoria: coluna(celulas, "categoria"),
    unidadeMedida: coluna(celulas, "unidade_medida"),
    codigoReferencia: coluna(celulas, "codigo_referencia"),
  }));
}
