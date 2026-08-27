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
// Escapa uma célula pra CSV com segurança: sempre entre aspas (protege
// contra ";"/quebra de linha embutida no dado — sem isso uma célula com
// ";" desloca as colunas seguintes) e, se o valor começa com =, +, -, @,
// TAB ou CR (os prefixos que Excel/Sheets interpretam como fórmula), um
// apóstrofo na frente força leitura como texto — mitigação padrão de
// injeção de fórmula via CSV (achado em revisão de código: o CSV de
// "linhas com erro" reabria texto bruto vindo da planilha do próprio
// usuário sem nenhum escape, então uma célula como "=CMD|'/c calc'!A1"
// executava ao reabrir no Excel).
function celulaCsvSegura(valor: string): string {
  const texto = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function linhaCsvSegura(campos: string[]): string {
  return campos.map(celulaCsvSegura).join(";");
}

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
