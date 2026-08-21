# Reforma visual: gráficos e tabelas do sistema

**Data:** 2026-08-21
**Status:** Aprovado (maquetes validadas no companion de brainstorming)

## Contexto

Essa spec cobre **todo elemento gráfico do sistema, sem exceção** — gráficos de dados (linha, área, barra, donut, gauge, sankey) e tabelas. A parte de gráficos já foi implementada e testada ao longo desta sessão (fora do companion visual, iterada direto com o usuário via captura de tela real do app); essa seção documenta o que foi feito e confirma que segue o mesmo padrão de rigor exigido aqui. A parte de tabelas foi inteiramente desenhada no companion visual antes de qualquer código, seguindo `/brainstorming` + `/frontend-design` do jeito que ficou definido como ordem fixa do projeto.

## Parte 0 — Tipografia de display

Fonte de corpo/UI/tabela (**Public Sans**) não muda. Fonte de display/headline/número-grande troca de **Cabinet Grotesk** pra **Satoshi** (Fontshare, mesma fundição/mecanismo de distribuição, mesmo padrão técnico de auto-hospedagem via `next/font/local` já usado) — decidido em comparação ao vivo no companion visual (Satoshi × General Sans × Geist × Cabinet Grotesk, aplicadas em KPI card + tabela real). Satoshi é a mesma fonte usada pela Bling (fintech brasileira) segundo o mapeamento de referências original. Afeta título de página, `card-title`, valor de KPI (`StatCard`), número dos gauges — qualquer lugar que hoje usa `--font-display`.

**Pendente de implementação:** baixar os pesos da Satoshi via Fontshare API, trocar em `app/src/app/fonts` + `layout.tsx`.

## Parte 1 — Gráficos (já implementado nesta sessão)

Todo gráfico do sistema foi migrado de Recharts (removido do `package.json`) pra um motor real, sem tema visual importado — `@visx/shape` (headless, mesmo princípio do TanStack Table na parte de tabelas) pra linha/área/barra/donut/gauge, e ECharts só pro único diagrama que nenhum dos dois faz (Sankey, fluxo direcionado com conservação de nó).

| # | Componente | Tipo | Página(s) | Motor |
|---|---|---|---|---|
| 1 | `IndicadorGauge` | Rosca 2-fatias (realizado/resto), sem número vazando do furo | Painel, Visão geral | `@visx/shape` Pie |
| 2 | `FluxoChart` | Área dupla (receitas × despesas) | Painel, Visão geral | `@visx/shape` AreaClosed |
| 3 | `WaterfallDre` | Cascata com conectores tracejados reais + piso de largura por barra (rolagem horizontal em vez de espremer) | DRE (cascata), Visão geral | `@visx/shape` Bar/Line à mão |
| 4 | `TopCategoriasDonut` | Rosca multi-fatia + legenda sincronizada | Visão geral, Análise de despesas, Indicadores | `@visx/shape` Pie |
| 5 | `SaldoProjetadoChart` | Linha dupla (realizado sólido / projetado tracejado) | Indicadores | `@visx/shape` LinePath |
| 6 | `IndicadoresDreChart` | Área + 3 linhas (margens da DRE no tempo) | DRE (indicadores) | `@visx/shape` |
| 7 | `EvolucaoPontoEquilibrioChart` | Área + linha, dois eixos Y independentes | Ponto de equilíbrio | `@visx/shape` |
| 8 | `ComparativoBarras` | Barras agrupadas, domínio negativo tratado corretamente | Fluxo de caixa (previsto×realizado) | `@visx/shape` BarGroup |
| 9 | `ComparativoLinhaAnotada` | Linha + linha-fantasma + rótulo de variação flutuante | Comparativos | `@visx/shape` + `@visx/annotation` |
| 10 | `SankeyFluxoCaixa` | Composição do fluxo (receita → despesas/saldo), rótulo truncado + rolagem em telas estreitas | DFC | ECharts (única exceção ao visx — nenhuma alternativa headless resolve conservação de fluxo) |
| 11 | `Sparkline` | Tendência compacta, sem eixo | StatCard, dentro do gauge | `@visx/shape` |
| 12 | `TrilhoBarra` | Trilho de barra em SVG, **v2 aprovado**: gradiente na cor de preenchimento, marcador de ponta com anel branco (mesmo padrão do `activeDot`), marcas de escala em 25/50/75%, tooltip escuro ao passar o mouse | Aging, Orçado×Realizado, Centro de custo, Curva ABC de despesas | SVG puro (vira client component pro tooltip) |

Bugs reais corrigidos durante essa migração (confirmados por medição de DOM, não só inspeção visual): número do gauge vazando do furo do anel, legenda invisível por clipping do `ParentSize`, barra some com série 100% negativa, total da rosca vazando pra fora em tenant com valor alto, rótulo/eixo do waterfall colidindo em DRE com muitas linhas, eixo Y vazando margem em 2 gráficos, rótulo de categoria do Sankey vazando o card, `TrilhoBarra` empurrando valor pra fora do card (mesma causa-raiz do bug do StatCard: `shrink-0` em vez de `min-w-0` num filho flex com largura "preferida" grande).

**Pendência conhecida:** correção de token — `--positivo` (#157f6b) e `--chart-1` (#0fa37e) são cores diferentes de propósito; algumas correções anteriores usaram `#0fa37e` em texto de tabela achando que era "hex antigo", quando na verdade `--positivo` era o token correto. Precisa de auditoria nos arquivos já tocados (`centro-custo/page.tsx`, `dfc/page.tsx`).

Revisão final feita via galeria no companion visual (todos os 12 juntos) — 11 aprovados como estavam (testados em tela real ao longo da sessão), 1 (`TrilhoBarra`) voltou pra mais uma rodada de maquete e saiu com a v2 acima. Nenhum outro pendente; se surgir mais algum durante a implementação, revisão é feita por componente, não precisa de nova rodada pra todos.

## Parte 2 — Tabelas (desenhado no companion visual, aprovado, ainda não implementado)

O que ficou de fora da migração de gráficos: **tabelas**. Um inventário completo (via agente de exploração, leitura de todo `app/src/app/(app)/**/page.tsx` e `app/src/components/**/*.tsx`) encontrou um sistema dividido:

- **23 arquivos** já usam o componente `<Table>` do shadcn (instalado, com estilo base: `border-b`, `hover:bg-muted/50`) — principalmente listas de registro (clientes, fornecedores, equipe, categorias, vendas, lançamentos, parcelas).
- **8 arquivos** ainda desenham `<table>` cru, sem nenhuma biblioteca — exatamente as páginas analíticas: DRE, DFC, Orçamento (grade editável), Aging, Centro de custo, Comparativos, Análise de despesas, Fluxo de caixa. É aqui que a "cara de IA"/cara de planilha colada é mais forte.
- Nenhum arquivo combina o `<Table>` do shadcn com layout de matriz densa (grade mês-a-mês) — essas duas necessidades nunca foram resolvidas juntas.
- Não existe componente `Avatar` em uso — avatares são `<span>` manuais com iniciais (`corPorNome`, já estabelecido nesta sessão pros ícones de categoria).
- Sticky header/coluna só existe hoje nas 3 páginas de matriz densa (DRE, DFC, Orçamento), implementado à mão com CSS.

## Objetivo

Deixar toda tabela do sistema com menos "cara de IA": hierarquia visual real (não só negrito), cores nos tokens corretos do design system, interação de verdade (ordenar, fixar coluna), sem números vazando de caixa nem colidindo — mesmo padrão de rigor que a varredura de gráficos já aplicou (correção validada por medição, não só visual).

## Decisão técnica: TanStack Table (headless), sem framework de UI pronto

Pesquisado e comparado (não só busca textual — inclui navegação real na documentação oficial do shadcn/ui):

- **AG Grid** — "o padrão em dashboards fintech" segundo a pesquisa, mas vem com tema visual próprio pesado (bundle Enterprise de 665kB) que brigaria com Tailwind/shadcn — o mesmo motivo que já descartou o Tremor pros gráficos nesta sessão.
- **MUI X Data Grid / Material React Table** — dependem do MUI, fragmentariam o stack (o projeto não usa Material Design em nenhum outro lugar).
- **Glide Data Grid** — renderização em canvas, melhor performance pra milhões de linhas, mas nossas tabelas mais densas (DFC) têm ~5 linhas × 38 colunas, DRE ~20 linhas × 15 colunas — não é problema de escala que justifique abrir mão de estilização via CSS normal.
- **TanStack Table v9** — headless (só lógica: sort, column pinning, virtualização opcional), HTML/CSS 100% nosso. **Confirmado na documentação oficial do shadcn/ui** (`ui.shadcn.com/docs/components/base/data-table`) que essa é a recomendação oficial deles: "instead of a data-table component, I thought it would be more helpful to provide a guide on how to build your own [com TanStack Table]". Mesmo motor usado no Linear e no Notion.

**Decisão:** `@tanstack/react-table` (v9) via `pnpm add`, usado só como lógica (sort, pinning, paginação), com o `<Table>` do shadcn já instalado como base HTML e estilização 100% Tailwind nos tokens do projeto. Nenhuma dependência de tema visual externo — mesma filosofia do `@visx/shape` nos gráficos.

## Correção de token encontrada durante as maquetes

`--positivo` (`#157f6b`) e `--chart-1` (`#0fa37e`) são cores **diferentes de propósito** no `globals.css` — o comentário do arquivo é explícito: "Teal deixa de ser marca e vira só cor semântica de 'positivo' (receita, saldo bom)", separado da paleta de gráfico. Várias correções desta sessão (antes desta spec) usaram `#0fa37e` em texto/badge de tabela achando que era "a cor verde atual" — errado, deveria ser `--positivo #157f6b`. Corrigido nas maquetes; **precisa de auditoria rápida no código já commitado** (`centro-custo/page.tsx`, `dfc/page.tsx` — onde troquei `#157F6B` por `#0FA37E` chamando de "hex antigo esquecido", quando na verdade era o token correto).

## Arquétipo 1 — matriz densa (DRE, DFC, Orçamento)

Aprovado após 4 iterações no companion visual. Especificação:

- **Toolbar acima da tabela**: título + contagem de linhas (badge) + busca + botão exportar + botão de colunas.
- **Cabeçalho**: branco (não faixa colorida), texto uppercase muted, com pílula "📅 2026" numa linha super-header acima dos meses.
- **Coluna de número de linha** (`#`, sutil, cinza claro) — referência rápida em tabela densa.
- **Coluna "Linha" fixa** (sticky, `position: sticky; left`) com sombra ao rolar horizontalmente — implementada via TanStack Table column pinning, não CSS solto.
- **Coluna do mês atual**: destacada com tinta terracota bem sutil (`#fdf6f3`) + sublinhado terracota no cabeçalho — é estado de UI ("você está aqui"), não valor financeiro, por isso não usa verde.
- **Linha de detalhe**: recuada (padding-left maior), texto cinza (`--muted-foreground`), sem negrito.
- **Linha de subtotal**: friso lateral verde (`--positivo`) na coluna fixa + negrito — sem faixa de cor cobrindo a linha inteira (fundo continua branco).
- **Linha de resultado final** (ex.: Lucro líquido): friso lateral terracota (`--primary`) + negrito maior + borda superior.
- **Valores zerados**: "–" discreto (cinza claro), não compete visualmente com números reais.
- **Coluna AV%** (análise vertical): mini-barra horizontal + percentual, mostrando participação sobre a receita líquida.
- **Chip de variação** (delta): opcional, ao lado de valores-chave, mostrando ▲/▼ + % vs. período anterior.
- **Ordenação**: clique no cabeçalho ordena (TanStack Table `sorting`), seta ativa em terracota.
- **Hover de linha**: fundo levemente tintado + barrinha terracota clara na coluna fixa.
- **Legenda**: rodapé discreto explicando o significado de cada cor (subtotal / resultado final / mês atual / AV%).

## Arquétipo 2 — lista/registro (transações, clientes, categorias, equipe...)

Aprovado após 3 iterações. Especificação:

- **Toolbar**: título + contagem + busca + filtro.
- **Célula líder**: ícone colorido (categoria, paleta de gráfico `--chart-1..7`, mesmo hash `corPorNome` já usado) + texto em duas linhas (principal em negrito + secundário muted) — padrão FiraCast/Salx.
- **Ícones reais**: glifos com o mesmo estilo arredondado/bold do Phosphor Icons já usado no resto do sistema (StatCards, sidebar), um por categoria — nunca seta genérica repetida.
- **Badge de status**: pílula com pontinho colorido, cor nos tokens corretos (`--positivo` pro "Quitado", `--accent-gold` pro "Pendente", `--muted-foreground` pro "Cancelado").
- **Valor**: negrito, `tabular-nums`, cor `--positivo`/`--destructive` conforme sinal.
- **Ordenação**: mesmo padrão do arquétipo 1.
- **Hover de linha**: fundo tintado + barrinha terracota à esquerda.
- **Paginação no rodapé** (não scroll infinito) — números de página + anterior/próximo.
- **Menu de ações por linha**: ícone discreto (⋯) com dropdown real (shadcn `DropdownMenu`, já instalado), não link de texto solto.

## Tokens de cor — regra de uso

| Token | Hex (claro) | Uso |
|---|---|---|
| `--positivo` | `#157f6b` | Valor financeiro bom, badge "Quitado", friso de subtotal |
| `--destructive` | `#b23a2e` | Valor financeiro ruim, vencido |
| `--accent-gold` | `#a87c1f` | Pendente, atenção |
| `--primary` (terracota) | `#d8583a` / `#e2694b` | **Só estado de UI**: item ativo, hover, foco, "você está aqui" — nunca valor financeiro |
| `--chart-1..7` | paleta de 7 cores | Cor de categoria (ícone de linha, tag), nunca semântica de bom/ruim |

## Plano de rollout

1. Instalar `@tanstack/react-table` (`pnpm add`).
2. Construir os dois componentes-base (matriz densa, lista) com a especificação acima, reutilizando `<Table>` do shadcn como HTML base.
3. Migrar as 8 tabelas cruas primeiro (maior ganho visual): DRE, DFC, Orçamento → arquétipo matriz; Aging, Centro de custo, Comparativos, Análise de despesas, Fluxo de caixa → arquétipo lista (ou matriz simplificada onde fizer sentido).
4. Migrar as 23 tabelas shadcn existentes pro arquétipo lista completo (hoje só têm o estilo base do shadcn, sem ícone/badge/ordenação consistente).
5. Auditar e corrigir o uso indevido de `#0fa37e` em lugar de `--positivo` nos arquivos já tocados nesta sessão.
6. Verificação por página: `pnpm exec tsc --noEmit` limpo + captura de tela + teste de hover/ordenação/scroll no navegador, mesmo rigor usado na varredura de gráficos.

## Fora de escopo

- Tabelas de wizard/importação (checkbox-driven, transientes) — funcional primeiro, toque leve depois se sobrar tempo.
- Virtualização (`@tanstack/react-virtual`) — nenhuma tabela do sistema hoje tem centenas de linhas; não adicionar até haver necessidade real.
- Row selection em massa / bulk actions — não pedido, não construir especulativamente.
