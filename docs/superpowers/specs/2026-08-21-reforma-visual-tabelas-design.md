# Reforma visual: tabelas do sistema

**Data:** 2026-08-21
**Status:** Aprovado (maquetes validadas no companion de brainstorming)

## Contexto

A reforma visual desta sessão já migrou todo gráfico do sistema pra um motor real (`@visx/shape` + ECharts pro Sankey do DFC), removendo o Recharts e corrigindo uma série de bugs reais de overflow/colisão de números encontrados por medição de DOM, não só inspeção visual. Gráficos estão fora de escopo aqui — já feitos.

O que ficou de fora dessa primeira varredura: **tabelas**. Um inventário completo (via agente de exploração, leitura de todo `app/src/app/(app)/**/page.tsx` e `app/src/components/**/*.tsx`) encontrou um sistema dividido:

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
