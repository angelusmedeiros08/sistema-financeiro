// Monta o link de uma página específica a partir da URL base da tela
// (já pode conter outros filtros, ex. "/vendas?situacao=aprovada") —
// usado pelo pager de TabelaLista em modo servidor.
export function hrefComPagina(hrefBase: string, pagina: number): string {
  const separador = hrefBase.includes("?") ? "&" : "?";
  return `${hrefBase}${separador}pagina=${pagina}`;
}
