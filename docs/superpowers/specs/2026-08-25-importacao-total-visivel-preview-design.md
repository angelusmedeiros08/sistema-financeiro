# Importação financeira: soma visível na Revisão + aviso sobre o que fica de fora

## Contexto

Erick relatou que a soma da planilha (R$ 25.196,00) não batia com a soma no sistema (~R$ 23.000) depois de uma importação. A causa raiz (arquivo com encoding misto corrompendo nomes, quebrando correspondência/duplicata) já foi corrigida separadamente. Mas o problema de fundo continua: **não existe nenhum jeito de o operador conferir a soma antes de importar** — a tela de Revisão só mostra contagem de linhas ("62 prontas"), nunca um valor em R$. Mesmo com a causa raiz corrigida, qualquer divergência futura (erro de digitação, linha com valor vazio, qualquer bug novo) continuaria invisível até o operador notar um número errado nos relatórios, dias depois.

O modelo CSV em si não pode carregar texto de ajuda (comentário dentro de CSV vira linha de dado e falha validação) — a melhoria de estrutura, então, é na tela em volta do arquivo, não no arquivo.

## Mudanças

**1. Soma visível na Revisão** (`passo-preview.tsx`): abaixo da barra de contagem já existente, um bloco mostra a soma em R$ de tudo que está marcado como "pronto pra importar" — o número que o operador compara direto contra o total da planilha original, antes de clicar Importar.

**2. O que fica de fora, explícito**: se houver linha com erro, o mesmo bloco avisa quantas linhas (não uma soma, já que valor inválido não soma) estão de fora da conta acima — "N linha(s) com erro não entram nessa soma", pra nunca mais um valor sumir em silêncio sem o operador perceber que ficou faltando.

**3. Nota na tela de Upload** (`passo-upload.tsx`): uma linha curta perto do botão "Baixar modelo" avisando que o sistema corrige acentuação automaticamente mesmo em arquivo com fontes diferentes misturadas — reforça confiança sem prometer que nunca vai dar problema nenhum.

## Escopo

Só o wizard financeiro (`planilha`) — o de Clientes/Fornecedores não lida com valor monetário, não se aplica. Sem mudança no CSV do modelo em si, sem migration.
