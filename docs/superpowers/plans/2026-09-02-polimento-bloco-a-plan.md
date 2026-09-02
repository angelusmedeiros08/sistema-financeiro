# Plano de implementação: Polimento pós-auditoria — Bloco A

**Spec:** [docs/superpowers/specs/2026-09-02-polimento-bloco-a-design.md](../specs/2026-09-02-polimento-bloco-a-design.md)
**Data:** 2026-09-02

7 fatias. Os 11 itens são independentes entre si — agrupados por arquivo/área tocada, não por dependência (não há dependência real entre eles). Fecha com teste ao vivo consolidado.

## Fatia 1 — Formatação: badge, decimal, "1 dias", zero

Quatro correções de formatação/exibição, sem relação entre si além de serem todas "trocar um valor exibido por outro", nenhuma toca em lógica de negócio:

1. `lib/status-parcela.ts:14,19` — `CANCELADO`/`PERDIDO`: `bg-muted text-muted-foreground` → `bg-muted text-foreground`.
2. `app/(app)/indicadores/page.tsx:308,220` — `dias.toFixed(1)` → `formatarIndice(dias)` (importar de `@/lib/formatacao`, já exportada).
3. `components/relatorios/aging-participantes-tabela.tsx:47` — `` `${dias} dias` `` → `` `${dias} ${dias === 1 ? "dia" : "dias"}` ``.
4. `lib/formatacao.ts` — nova função pequena `formatarMoedaOuTraco(valor: number): string { return valor === 0 ? "-" : formatarMoeda(valor); }`, exportada ao lado de `formatarMoeda`. `app/(app)/relatorios/contas-bancarias/page.tsx:32,42` trocam `formatarMoeda` por `formatarMoedaOuTraco`.

_Depende de:_ nada.
_Teste:_ `tsc`/`eslint`.

## Fatia 2 — Link da venda pra Contas a Receber filtrado

1. `app/(app)/contas-a-receber/page.tsx` — `searchParams` ganha `evento?: string`. Quando presente: `situacao` default vira `"todos"` em vez de `"aberto"` (só se `situacao` não foi explicitamente passado); a query (linha 45-54) ganha `.eq("eventos_financeiros.id", evento)` — checar se o `!inner` já existente no select (linha 48) precisa de ajuste pra esse filtro funcionar corretamente com o join.
2. `app/(app)/vendas/[id]/page.tsx:139-143` — o parágrafo vira `Venda aprovada — <Link href={\`/contas-a-receber?evento=${venda.eventoFinanceiroId}&situacao=todos\`} className="font-medium text-foreground underline underline-offset-2">o lançamento e as parcelas</Link> ficam em Contas a Receber. Ajustes (estorno, renegociação, cancelamento) acontecem por lá.` — confirmar que `venda.eventoFinanceiroId` está no tipo retornado por `buscarVenda` (já confirmado em `lib/vendas/vendas.ts:112`, só validar o tipo TS bate).

_Depende de:_ nada.
_Teste:_ ao vivo — abrir uma venda aprovada, clicar no link, confirmar que chega em Contas a Receber mostrando só as parcelas desta venda (incluindo quitadas/canceladas se houver), não a lista geral.

## Fatia 3 — Remove navegação "voltar" duplicada (8 arquivos)

Remover o `<Link href="/..." className="text-xs ... hover:text-foreground">← X</Link>` (breadcrumb manual) de cada um destes 8 arquivos — só essa linha/bloco, não mexer em mais nada da página:

1. `importacao/historico/[id]/page.tsx`
2. `orcamentos/[id]/page.tsx`
3. `vendas/[id]/page.tsx`
4. `orcamentos/nova/page.tsx`
5. `vendas/nova/page.tsx`
6. `despesas/[id]/page.tsx`
7. `receitas/[id]/page.tsx`
8. `importacao/historico/page.tsx`

_Depende de:_ nada (mas toca 2 dos mesmos arquivos da Fatia 2 — `vendas/[id]/page.tsx` já vai estar aberto lá; considerar fazer as duas mudanças juntas nesse arquivo específico pra não reabrir duas vezes, mesmo estando em fatias/commits diferentes).
_Teste:_ ao vivo — abrir cada uma das 8 páginas, confirmar só 1 controle de "voltar" (o `BotaoVoltar` global), sem breadcrumb manual duplicado.

## Fatia 4 — Apresentações: plural + header responsivo

`app/(app)/apresentacoes/page.tsx`:
1. Linha 23: H1 "Apresentação" → "Apresentações".
2. Linha 21: `className="flex items-center justify-between gap-4"` → `className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"`.

_Depende de:_ nada.
_Teste:_ ao vivo — `/apresentacoes` no mobile (375px): botão "Nova apresentação" numa linha própria abaixo do título+descrição, não espremido ao lado. Desktop sem mudança visual.

## Fatia 5 — Título da Trilha de auditoria + capitalização de Importação

Dois arquivos pequenos, sem relação entre si, agrupados só por serem ambos "texto errado":

1. `app/(app)/configuracoes/auditoria/page.tsx:46` — H1 "Configurações" → "Trilha de auditoria". Linha 51 (H2 "Trilha de auditoria") vira redundante — remover o H2, deixar só a descrição (linha 52) direto depois do H1 da página.
2. `app/(app)/importacao/historico/tabela-historico.tsx:18-21` — `ROTULO_TIPO` ganha `produtos: "Produtos"`.

_Depende de:_ nada.
_Teste:_ ao vivo — `/configuracoes/auditoria` mostra "Trilha de auditoria" como título único (sem repetir); `/importacao/historico` mostra "Produtos" capitalizado na coluna Tipo pra uma importação desse tipo.

## Fatia 6 — Nome longo truncado + placeholder de combobox no mobile

1. `components/lancamentos/tabela-parcelas-abertas.tsx:35-39` — `<span>` da coluna Pessoa ganha `className="truncate"` + `title={info.getValue()}`; confirmar/ajustar `size` da coluna se necessário pra o truncamento fazer sentido visualmente.
2. `components/formularios/categoria-combobox.tsx` e `centro-custo-combobox.tsx` — separar o `truncate` do container flex: `<span className="flex items-center gap-2">{Icone}<span className="truncate">{rotulo}</span></span>` em vez de `truncate` direto no container flex.
3. `components/formularios/evento-financeiro-form.tsx:128` — `grid grid-cols-2 gap-3` → `grid grid-cols-1 gap-3 sm:grid-cols-2`.

_Depende de:_ nada.
_Teste:_ ao vivo — Contas a Pagar/Receber com um nome de fornecedor longo, truncado + tooltip nativo do navegador com o nome completo. Nova Despesa no mobile (375px): Categoria e Centro de custo cada um numa linha própria, texto do placeholder completo ou com reticências visíveis, nunca cortado sem "...".

## Fatia 7 — Revisão final + teste ao vivo consolidado

1. `tsc`/`eslint`/`build` no repo inteiro.
2. Deploy e teste ao vivo em `https://sistema-financeiro-five-phi.vercel.app` cobrindo os 11 cenários da seção "Testes" da spec, numa sessão de verificação só.
3. Spot-check em pelo menos 2 telas não tocadas.

_Depende de:_ Fatias 1-6.
_Teste:_ é a própria fatia de teste.
