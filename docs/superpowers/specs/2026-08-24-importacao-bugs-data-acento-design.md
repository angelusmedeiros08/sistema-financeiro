# Importação: data com ano de 2 dígitos e acento corrompido (mojibake)

## Contexto

O sócio Erick (Certicon) tentou importar uma planilha real e teve a importação inteira travada: as 62 linhas caíram como erro na etapa de Revisão, todas com "Data de competência inválida". Investigação por vídeo (frames extraídos com ffmpeg) + leitura direta do código confirmou dois bugs distintos, sem relação de causa entre si — ambos afetam o mesmo import, mas cada um precisa de correção própria.

Fatia 1 de 4 de uma revisão maior do módulo de Importação (as outras 3 — reconhecimento inteligente de coluna, Cadastros turbinado com ações em lote, e lote/histórico/desfazer para importação financeira — ficam para specs seguintes, decompostas por serem subsistemas independentes).

## Bug 1 — parser de data rejeita ano de 2 dígitos

`lib/importacao/locale-br.ts::parseDataPlanilha`, linha 26:
```ts
const partes = limpo.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
```
O grupo de ano exige exatamente 4 dígitos. A planilha do Erick tem datas como `10/09/26` — o regex nunca bate, a função devolve `null`, e a linha vira erro de validação. Confirmado no frame da tela de Revisão: mensagem literal "Data de competência inválida. Data de vencimento inválida. Data de pagamento inválida." em 100% das linhas.

**Correção**: o grupo de ano passa a aceitar 2 ou 4 dígitos — `(\d{2}|\d{4})`. Ano de 2 dígitos sempre soma 2000 (`26` → `2026`), sem janela de pivô (`80` → `1980` etc.) — é um sistema financeiro de PME lançando dado atual, não existe cenário real de competência/vencimento anterior aos anos 2000 nesse fluxo. `DD-MM-AA`/`DD-MM-AAAA` (com traço) já funcionam hoje, porque o regex já aceita `/` e `-` como separador — só o comprimento do ano precisa mudar.

Datas nativas do Excel (célula formatada como data, lida como objeto `Date` do JS via `parse.ts::celulaParaTexto`) já chegam convertidas pra ISO (`AAAA-MM-DD`) antes de passar por `parseDataPlanilha` — não são afetadas por este bug nem por esta correção, continuam no mesmo caminho.

Uma data genuinamente impossível (`35/18/2026`) continua rejeitada — a validação de calendário (linhas 34-42 do mesmo arquivo, round-trip contra `Date` de verdade) não muda.

## Bug 2 — acento virando "Ã" (mojibake)

Confirmado por evidência direta: um frame do vídeo mostra o Excel do próprio Erick, com a planilha original aberta, já exibindo `HonorÃ¡rios` em vez de `Honorários` — ou seja, **a corrupção nasce no arquivo de origem**, antes de chegar no nosso sistema (padrão clássico de um arquivo que passou por mais de uma exportação/edição CSV entre Excel e outra ferramenta, comum no ecossistema Mac). Não é um bug no `decodificarComFallback` do nosso importador — é dado de entrada já corrompido.

O padrão é determinístico e reversível: os bytes UTF-8 de "á" (`0xC3 0xA1`) foram decodificados como se fossem Latin-1/Windows-1252 antes de virar texto, produzindo `Ã¡` — cada caractere acentuado do português vira uma sequência de 2 caracteres Latin-1 "estranhos" mas sempre no mesmo padrão. Reverter é: pegar a string corrompida, reinterpretar cada caractere como um byte Latin-1 (`charCodeAt`, válido porque strings JS em UTF-16 mapeiam 1:1 pro intervalo 0-255 nesse caso), e decodificar esses bytes como UTF-8 de verdade.

**Correção**: nova função `repararMojibake(texto: string): string` em `lib/importacao/locale-br.ts`, aplicada automaticamente (sem pedir confirmação — o padrão é raro o bastante em português legítimo pra não gerar falso positivo) a todo texto extraído da planilha antes de chegar no wizard: nome de categoria, nome de pessoa, descrição, forma de pagamento, centro de custo. Algoritmo:

```
1. Tentar reinterpretar a string como bytes Latin-1 → decodificar como UTF-8.
2. Se a decodificação for válida (sem caractere de substituição/erro) E o
   resultado for diferente do original, usar o resultado reparado.
3. Se a decodificação falhar ou não mudar nada, manter o texto original
   intacto (nunca arriscar estragar texto que já estava correto).
```

Aplicado em `parse.ts` no ponto onde as células viram string (`celulaParaTexto` pro caminho XLSX, e logo após `decodificarComFallback`/`parseCsvTexto` pro caminho CSV) — assim cobre os dois formatos de arquivo com uma única função compartilhada, sem duplicar lógica entre os dois wizards (financeiro e pessoas usam a mesma base de `parse.ts`).

## Fora de escopo

Canal de origem da corrupção (é responsabilidade do Excel/exportador de quem gerou o arquivo, não algo que dá pra prevenir do nosso lado) — só a correção pós-leitura. As outras 3 frentes da revisão do módulo de Importação (sinônimo de coluna, Cadastros em lote, lote/desfazer financeiro) — specs próprias, sequência já combinada com o usuário.

## Testes

- `10/09/26` → `2026-09-10`, sem erro.
- `10/09/2026` → `2026-09-10`, sem erro (comportamento já existente, não regride).
- `10-09-26` → `2026-09-10` (separador traço + ano curto, combinação nova).
- `35/18/2026` → continua rejeitado (data impossível).
- `29/02/2026` → continua rejeitado (2026 não é bissexto — validação de calendário intacta).
- `"HonorÃ¡rios"` → `"Honorários"`.
- `"Ampere SoluÃ§Ãµes"` → `"Ampere Soluções"`.
- Texto já correto (`"Honorários"`, `"João da Silva"`) → passa por `repararMojibake` sem nenhuma alteração.
- Reimportar a planilha real do Erick (mesmo arquivo do vídeo, se disponível) → 0 erros de data, nomes de categoria/pessoa corretos na prévia.
