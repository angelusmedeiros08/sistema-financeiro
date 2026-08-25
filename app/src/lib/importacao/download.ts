// Gera e dispara o download de um arquivo de texto no navegador, sem
// depender de nenhum backend — usado tanto pro modelo de planilha quanto
// pro CSV de linhas com erro no resumo final. O BOM UTF-8 ("﻿") na
// frente é obrigatório aqui: sem ele, o Excel em Windows/pt-BR abre o CSV
// assumindo o codepage ANSI local (windows-1252), não UTF-8 — o próprio
// cabeçalho do modelo ("Descrição", "Não usar"...) já sai com acento
// errado antes do operador digitar qualquer coisa, e se ele salvar de
// volta sem perceber, o arquivo inteiro vira windows-1252 (achado
// investigando o relato de nomes com acento/caractere errado depois de
// preencher o modelo).
export function baixarArquivoTexto(nomeArquivo: string, conteudo: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob(["﻿" + conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
