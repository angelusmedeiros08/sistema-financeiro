# Polimento pós-auditoria — Bloco A (correções mecânicas)

## Contexto

Continuação da auditoria de UX de 01/09/2026 (4 agentes em produção). Depois dos 5 achados de "risco real" (já resolvidos, ver `2026-09-01-correcoes-risco-real-ux-design.md`), o usuário pediu pra seguir com o resto do polimento, organizado em blocos. Este é o **Bloco A**: itens sem decisão de design real, correções pontuais de consistência/bug.

Antes de escrever esta spec, investiguei o código de cada um dos 12 itens candidatos do Bloco A (agente `Explore`). Três descobertas mudaram o escopo:

1. **Item "Fluxo de Caixa sem Voltar/sub-nav" é obsoleto** — a rota `/relatorios/fluxo-caixa` hoje é só um redirect; a tela real (`/fluxo-caixa`) subiu a nível de módulo de primeiro nível, não pertence mais a `/relatorios/*`, então não ter a sub-nav de Relatórios é correto. **Descartado desta spec.**
2. **"Cor vermelho vs. laranja" em Aging é decisão de design deliberada** (gradiente de severidade nas barras, comentado no próprio código) — não é bug. Só a parte "1 dias" (concordância) segue nesta spec.
3. **Placeholder cortado em Categoria/Centro de custo**: não é `Select` do design system como a auditoria supôs, é um combobox customizado com um gotcha real de CSS (`flex` + `truncate` no mesmo elemento não renderiza reticências de forma confiável) + grid sem breakpoint responsivo — causa raiz diferente da suposta, fix também diferente.

## Escopo — 11 itens

### 1. Badge "Cancelado"/"Perdido": baixo contraste

`lib/status-parcela.ts:14,19` — `CANCELADO`/`PERDIDO` usam `bg-muted text-muted-foreground`, contraste baixo demais contra o fundo do card, lendo como "sem pill" mesmo sendo o mesmo componente `Badge` dos outros status. Troca pra `bg-muted text-foreground` — mais contraste, continua neutro.

### 2. Decimal com ponto em PMR/PMP/atraso médio por forma

`app/(app)/indicadores/page.tsx:308` (PMR/PMP) e `:220` (atraso médio por forma de pagamento) usam `dias.toFixed(1)` cru. Trocar pelas duas chamadas por `formatarIndice(dias)` (já existe em `lib/formatacao.ts:58`, 1 casa decimal com vírgula BR — exatamente o formato certo, só nunca foi usado nesses dois pontos).

### 3. Aging: "1 dias" sem concordância singular

`components/relatorios/aging-participantes-tabela.tsx:47` — template fixo `` `${dias} dias` ``. Vira `` `${dias} ${dias === 1 ? "dia" : "dias"}` ``.

### 4. Contas bancárias: zero em duas formas

`app/(app)/relatorios/contas-bancarias/page.tsx` — os 3 subcampos (Crédito/Débito/Saldo do período, linhas 47/51/57) já usam `formatarNumeroCompacto` (zero vira "-"), mas o card principal (linha 32, "Saldo total em contas ativas") e o saldo por conta (linha 42) usam `formatarMoeda` (zero vira "R$0,00"). Convenção escolhida: sempre "-" quando zero, já é o padrão de tabela densa do resto do sistema (DRE/DFC). Trocar as duas chamadas de `formatarMoeda` desta página por uma variante que também colapsa zero — como `formatarMoeda` é usado em dezenas de outros lugares do sistema onde "R$0,00" é o comportamento certo (formulários, totais), não mexer na função compartilhada: criar `formatarMoedaOuTraco(valor)` pequena (`valor === 0 ? "-" : formatarMoeda(valor)`) em `lib/formatacao.ts`, usar só nesta página.

### 5. Link "ver a venda gerada" (Orçamento) vs. texto puro (Venda)

`app/(app)/vendas/[id]/page.tsx:139-143` — o texto vira um link de verdade pra Contas a Receber filtrado por esta venda. Precisa de:
- Novo `searchParam` opcional `evento` em `app/(app)/contas-a-receber/page.tsx` (e o equivalente `/contas-a-pagar`, mesmo componente/padrão, pra despesas geradas por compra — **checar se existe fluxo de "Nova compra" equivalente antes de decidir se mexe nos dois ou só em Contas a Receber**; se não existir o equivalente do lado de Despesas/Compras, mexer só em Contas a Receber, que é o caso real desta spec). Quando presente, a query ganha `.eq("eventos_financeiros.id", evento)` (ajustar o filtro `eventos_financeiros!inner` já existente, linha 48-52, pra também casar o id).
- `situacao` default deve virar `"todos"` quando `evento` está presente (a venda pode ter parcelas já quitadas ou canceladas — o usuário quer ver todas as parcelas desta venda, não só as "em aberto").
- Em `vendas/[id]/page.tsx`, o texto vira: `Venda aprovada — <Link href={`/contas-a-receber?evento=${venda.eventoFinanceiroId}&situacao=todos`}>o lançamento e as parcelas</Link> ficam em Contas a Receber. Ajustes (estorno, renegociação, cancelamento) acontecem por lá.` (`venda.eventoFinanceiroId` já vem no objeto retornado por `buscarVenda`, `lib/vendas/vendas.ts:112` — não precisa de query nova).

### 6. Navegação "voltar" duplicada

`components/layout/botao-voltar.tsx` já é injetado automaticamente em toda página com 2+ segmentos de rota (via `app-chrome-shell.tsx:27`) — qualquer breadcrumb manual "← X" nessas páginas é redundante. 8 arquivos confirmados com o padrão duplicado:
- `importacao/historico/[id]/page.tsx`
- `orcamentos/[id]/page.tsx`
- `vendas/[id]/page.tsx`
- `orcamentos/nova/page.tsx`
- `vendas/nova/page.tsx`
- `despesas/[id]/page.tsx`
- `receitas/[id]/page.tsx`
- `importacao/historico/page.tsx`

Remover o `<Link href="/..." className="text-xs ... hover:text-foreground">← X</Link>` de cada um desses 8 arquivos — o `BotaoVoltar` global já cobre a função. Não mexer em nenhum outro elemento da página (título, breadcrumb é só esse link isolado no topo).

### 7. "Apresentação" no singular + botão mobile

`app/(app)/apresentacoes/page.tsx:23` — H1 "Apresentação" vira "Apresentações" (plural, consistente com Vendas/Orçamentos/Produtos e serviços). O header (linha 21, `flex items-center justify-between gap-4`, sem wrap) ganha `flex-col sm:flex-row sm:items-center` — evita o botão ficar espremido ao lado do bloco título+descrição em telas estreitas (único header do sistema que junta título+parágrafo+botão numa linha só sem quebra).

### 8. Título "Configurações" em `/configuracoes/auditoria`

`app/(app)/configuracoes/auditoria/page.tsx:46` — H1 "Configurações" vira "Trilha de auditoria" (mesmo texto que já está certo no H2 da linha 51, que passa a ficar redundante e pode virar só a descrição, sem repetir o título). Confirmar antes se as outras páginas de `/configuracoes/*` realmente usam H1 "Configurações" fixo (padrão esperado) — se sim, esta é a única página fora do padrão; não mexer nas demais.

### 9. Capitalização "produtos" em `/importacao/historico`

`app/(app)/importacao/historico/tabela-historico.tsx:18-21` — `ROTULO_TIPO` não tem entrada pra `produtos`, cai no fallback cru do banco (minúsculo). Adicionar `produtos: "Produtos"`, copiando a entrada que já existe (e está certa) em `importacao/historico/[id]/page.tsx:14-17`. Considerar extrair esse mapa pra um lugar compartilhado (`lib/importacoes/importacoes.ts`, por exemplo) já que hoje está duplicado em 2 arquivos — só se for trivial, não é o foco desta correção.

### 10. Nome de pessoa longo quebra linha em Contas a Pagar/Receber

`components/lancamentos/tabela-parcelas-abertas.tsx:35-39` — célula "Pessoa" sem `truncate`. Adicionar `className="truncate"` no `<span>` (linha 38) + `title={info.getValue()}` pro nome completo aparecer em tooltip nativo do navegador ao passar o mouse. Confirmar que a coluna (`helper.accessor`) tem uma largura razoável definida (`size`) pra o truncamento fazer sentido — se não tiver, adicionar uma.

### 11. Placeholder cortado sem reticências (Categoria/Centro de custo, mobile)

Dois problemas juntos:
- `components/formularios/categoria-combobox.tsx:34` e `centro-custo-combobox.tsx` (linha equivalente): o `<span className="flex items-center gap-2 truncate">` combina `flex` com `truncate` no mesmo elemento — o ícone e o texto viram itens flex separados, e `text-overflow: ellipsis` não se aplica de forma confiável nesse arranjo. Fix: mover `truncate` pra um `<span>` interno só do texto, deixando o `<span className="flex items-center gap-2">` de fora sem `truncate` (só o wrapper flex) — ex.: `<span className="flex items-center gap-2"><Icone /><span className="truncate">{rotulo}</span></span>`.
- `components/formularios/evento-financeiro-form.tsx:128` — `grid grid-cols-2 gap-3` sem breakpoint responsivo, os 2 comboboxes ficam sempre lado a lado mesmo em 375px, agravando o corte. Vira `grid grid-cols-1 gap-3 sm:grid-cols-2`.

## Fora de escopo

- "Cor vermelho vs. laranja" em Aging (design deliberado, não é bug).
- "Fluxo de Caixa sem Voltar/sub-nav" (rota obsoleta, tela real já está correta).
- Unificar os 2 mapas `ROTULO_TIPO` duplicados de Importação num arquivo só (mencionado no item 9, mas só vale a pena se for trivial durante a implementação — não é o objetivo desta correção).
- Qualquer filtro equivalente por compra/despesa em Contas a Pagar (o item 5 é só do lado de Vendas/Contas a Receber, que é o caso real reportado pela auditoria).

## Testes

Cada item verificado ao vivo em produção depois do deploy:
1. Uma parcela CANCELADA (Painel, Contas a Pagar/Receber) com o badge legível.
2. PMR/PMP e atraso médio por forma em `/indicadores` com vírgula, não ponto.
3. Aging com uma pessoa de 1 dia de atraso mostrando "1 dia", não "1 dias".
4. Contas bancárias com movimento zero no período mostrando "-" em todo lugar, não "R$0,00" em nenhum.
5. Detalhe de uma venda aprovada — link clicável pra Contas a Receber, chegando filtrado só nas parcelas desta venda (incluindo já quitadas/canceladas, se houver).
6. As 8 páginas de detalhe/histórico sem breadcrumb manual duplicado, só o `BotaoVoltar` global.
7. `/apresentacoes` com título "Apresentações" (plural); botão "Nova apresentação" não espremido no mobile.
8. `/configuracoes/auditoria` com H1 "Trilha de auditoria".
9. `/importacao/historico` com uma importação de produtos mostrando "Produtos" capitalizado na coluna Tipo.
10. Contas a Pagar/Receber com um nome de pessoa longo truncado + tooltip com o nome completo ao passar o mouse.
11. Nova Despesa no mobile (375px) — Categoria e Centro de custo cada um numa linha, texto completo ou reticências visíveis, nunca cortado sem "...".
