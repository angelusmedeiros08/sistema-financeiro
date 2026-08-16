// Gera e dispara o download de um arquivo de texto no navegador, sem
// depender de nenhum backend — usado tanto pro modelo de planilha quanto
// pro CSV de linhas com erro no resumo final.
export function baixarArquivoTexto(nomeArquivo: string, conteudo: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
