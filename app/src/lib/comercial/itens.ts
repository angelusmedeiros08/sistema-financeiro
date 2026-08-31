// Compartilhado entre vendas e orçamentos comerciais — os dois documentos
// têm exatamente a mesma forma de item (produto/serviço + quantidade +
// preço unitário) e a mesma regra de validação. Extraído em revisão de
// código: as duas cópias (lib/vendas/vendas.ts, lib/orcamentos-comerciais/
// orcamentos-comerciais.ts) eram byte a byte idênticas.
export type ItemComercialEntrada = { produtoServicoId: string; quantidade: number; precoUnitario: number };

export function validarItensComerciais(itens: ItemComercialEntrada[]): string | null {
  if (itens.length === 0) return "Adicione ao menos um item.";
  for (const item of itens) {
    if (!item.produtoServicoId) return "Escolha o produto ou serviço de cada item.";
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0) return "Quantidade inválida em algum item.";
    if (!Number.isFinite(item.precoUnitario) || item.precoUnitario < 0) return "Preço inválido em algum item.";
  }
  return null;
}
