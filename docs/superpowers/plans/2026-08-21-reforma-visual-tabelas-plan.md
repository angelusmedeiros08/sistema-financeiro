# Plano de implementação: Reforma visual — gráficos e tabelas

**Spec:** [docs/superpowers/specs/2026-08-21-reforma-visual-tabelas-design.md](../specs/2026-08-21-reforma-visual-tabelas-design.md)
**Data:** 2026-08-21

Ordem por dependência e risco: fundação tipográfica primeiro (afeta toda tela), depois o único bug de gráfico pendente (isolado, rápido), depois o motor de tabela + os dois arquétipos como componentes reutilizáveis, só então as páginas uma a uma. Cada fatia é testável sozinha no navegador antes de seguir pra próxima.

## Fatia 1 — Tipografia (Satoshi + Plus Jakarta Sans)

Baixar os pesos que `layout.tsx` já usa hoje (400/500/700/900 conforme peso realmente consumido) via Fontshare API (Satoshi) e Google Fonts (Plus Jakarta Sans, arquivo estático — não é servida pela Fontshare). Salvar em `app/src/app/fonts/` substituindo `cabinet-grotesk-*.woff2` e `public-sans.woff2`. Atualizar `localFont` em `layout.tsx` (`fonteDisplay` → Satoshi, `fonteCorpo` → Plus Jakarta Sans), mantendo as variáveis CSS `--font-display`/`--font-body` como estão (nenhum outro arquivo referencia o nome do arquivo físico).

_Depende de:_ nada.
_Teste:_ abrir `/painel`, `/relatorios/dre`, qualquer formulário — checar visualmente que título e corpo mudaram e que não há flash de fonte não estilizada (FOUT).

## Fatia 2 — Correção do token de cor `--positivo` vs `--chart-1`

Grep por `#0FA37E`/`#0fa37e` em `centro-custo/page.tsx` e `dfc/page.tsx` (e qualquer outro arquivo que apareça na varredura). Cada ocorrência que representa "valor bom" (receita, saldo positivo) volta pra `#157F6B` (`--positivo`); ocorrência que é de fato cor de série/categoria fica como está.

_Depende de:_ nada — pode rodar em paralelo com a Fatia 1.
_Teste:_ comparar visualmente `/relatorios/centro-custo` e `/relatorios/dfc` antes/depois — valores positivos devem ficar no teal `--positivo`, não no verde de gráfico.

## Fatia 3 — TrilhoBarra v2

**Concluída.** Reescrito `trilho-barra.tsx`: gradiente linear no preenchimento (mesmo padrão de `FluxoChart`/`IndicadoresDreChart`), marcador circular de ponta com anel branco, marcas de escala em 25/50/75%, tooltip escuro no hover com valor exato (nova prop `valorFormatado`). Referência visual: `.superpowers/brainstorm/1669-1787340149/content/trilho-barra-v2.html`.

Não virou client component como o plano original previa — o hover resolve com `group-hover` do Tailwind (CSS puro), sem estado nem listener de mouse; `useId()` (evita colisão de `<linearGradient>` entre barras da mesma lista) também roda em server component.

_Teste:_ os 4 consumidores reais — `aging-barras.tsx`, `orcado-realizado-barras.tsx`, `centro-custo/page.tsx`, `despesas/page.tsx` — verificados via inspeção DOM (gradiente, marcador, tooltip com valor real, `getBoundingClientRect()` sem overflow) e sem erro de console.

## Fatia 4 — Motor de tabela (fundação, sem tela ainda)

**Concluída.** `@tanstack/react-table` instalado — v9.1.2, que por sua vez **não é a API v8** que a maior parte da documentação/treino descreve (registro explícito de feature via `tableFeatures()`, `useTable`/`createTableHook` em vez de `useReactTable`, `column.getStart('left')` virou `getStart('start')`). Resolvido lendo os skills que o próprio pacote traz em `node_modules/@tanstack/react-table/skills/` (mesmo padrão do aviso em `app/AGENTS.md` pro Next.js desta versão) em vez de supor a API antiga.

Criados em `src/components/tabela/`, via `createTableHook` (uma fábrica só, reused pelas duas):

- `tabela-matriz.tsx` (Arquétipo 1): column pinning real (`#` + "Linha"), super-header de ano via grupo de coluna nativo do TanStack, destaque de mês corrente, linha de subtotal/final com friso lateral colorido (sem lavar a linha inteira), coluna AV% com mini-barra, chip de delta opcional, sort por header, legenda de rodapé, scroll horizontal com sombra nas colunas fixas.
- `tabela-lista.tsx` (Arquétipo 2): célula de ícone+texto de 2 linhas, badge de status com bolinha (mesma paleta de `lib/status-parcela.ts`), valor tabular-nums colorido por sinal, busca global funcional, sort por header, paginação de rodapé, menu de ação via `DropdownMenu`.

Cada um recebe dados e definição de coluna via `criarColunaMatriz`/`criarColunaLista` (helper tipado exportado do próprio arquivo, já ligado às features certas) — a página que consome só declara `columns` e passa `data`.

_Teste:_ rota temporária com dado mockado (`(app)/teste-tabelas-temp`, removida depois de validar) cobrindo os cenários de maior risco — coluna fixa com scroll horizontal, super-header, linha de subtotal/final, as 4 cores de badge, AV%, chip de delta, ordenação por clique, paginação, busca global. Tudo verificado via inspeção de DOM (classe aplicada, offset de pin, resultado de sort/filtro/paginação) e sem erro de console.

_Depende de:_ Fatia 1 (os componentes já nascem com a tipografia final, evita retrabalho).
_Teste:_ uma tela de exemplo isolada (pode ser uma rota temporária ou Storybook-like dentro do próprio companion de brainstorming) com dado mockado, cobrindo: coluna fixa com scroll, linha de subtotal, badge de cada cor de status, ordenação por clique, paginação. Essa é a fatia de maior risco técnico do plano — vale gastar tempo aqui pra não repetir erro de layout 30 vezes depois.

## Fatia 5 — Arquétipo 1 nas 3 páginas de matriz densa

Uma página por vez, nesta ordem (mais complexa primeiro, pra validar o componente da Fatia 4 sob a pior condição cedo):

1. **DRE** (`relatorios/dre/page.tsx`) — até ~38 colunas mensais + linha configurável por tenant, é o caso mais exigente de scroll horizontal e pinning.
2. **DFC** (`relatorios/dfc/page.tsx`)
3. **Orçamento** (`orcamento/grade-orcamento.tsx`)

Cada uma: trocar o `<table>` cru pelo `tabela-matriz.tsx`, mapear dado existente pro formato de coluna TanStack, remover CSS/HTML de tabela manual que fica órfão.

_Depende de:_ Fatia 4.
_Teste por página, antes de seguir pra próxima:_ abrir no navegador com tenant real (não mock), conferir coluna fixa + scroll horizontal, mês corrente destacado, subtotal/resultado com a cor certa, AV%, sort, e rodar a mesma checagem de overlap por DOM já usada nos bugs de gráfico desta sessão (números não podem colidir/vazar em nenhuma largura de tela).

## Fatia 6 — Arquétipo 2 nas 5 páginas de relatório com `<table>` crua

Ordem por complexidade de dado (mais simples primeiro):

1. **Aging** (`relatorios/aging/page.tsx`)
2. **Centro de Custo** (`relatorios/centro-custo/page.tsx`)
3. **Análise de Despesas** (`relatorios/despesas/page.tsx`)
4. **Comparativos** (`relatorios/comparativos/page.tsx`)
5. **Fluxo de Caixa** (`fluxo-caixa/page.tsx`)

Cada uma: trocar `<table>` cru pelo `tabela-lista.tsx`, adicionar ícone real por categoria (paleta por hash, glifos estilo Phosphor bold/rounded — reaproveitar se algum já existir no projeto, criar só o que faltar), badge de status onde a página tiver conceito de status.

_Depende de:_ Fatia 4. Pode rodar em paralelo com a Fatia 5 (arquétipos diferentes, sem dependência entre si) se preferir paralelizar, mas dentro de cada arquétipo manter a ordem sequencial acima.
_Teste por página:_ mesmo padrão da Fatia 5 — dado real do tenant, paginação funcionando, badge com a cor certa por status, menu de ação abrindo as opções certas.

## Fatia 7 — Migração das 23 tabelas shadcn existentes pro Arquétipo 2 completo

Essas já usam `<Table>` do shadcn (não é reescrita do zero, é enriquecimento: ícone+2 linhas, badge, sort, paginação, menu de ação via `DropdownMenu`). Agrupar por domínio pra manter contexto de negócio junto durante a migração:

- **Pessoas/equipe**: `tabela-pessoas.tsx`, `configuracoes/equipe/page.tsx`
- **Cadastros financeiros**: `configuracoes/categorias/` (+`categoria-linha.tsx`), `configuracoes/contas-financeiras/page.tsx`, `configuracoes/formas-pagamento/page.tsx`, `configuracoes/centros-custo/page.tsx`, `configuracoes/plano-de-contas/` (+`conta-linha.tsx`)
- **Lançamentos**: `tabela-parcelas-abertas.tsx`, `detalhe-parcela.tsx`, `tabela-eventos.tsx`, `configuracoes/recorrencias/page.tsx`, `configuracoes/regras-categorizacao/tabela-regras.tsx`
- **Produtos/vendas**: `produtos-servicos/page.tsx` (+`produto-servico-linha.tsx`), `vendas/page.tsx`
- **Importação**: `importacao/planilha/passo-preview.tsx`, `importacao/planilha/passo-mapeamento.tsx`, `importacao/pessoas/passo-revisao.tsx`, `importacao/historico/page.tsx`, `importacao/historico/[id]/page.tsx`
- **Config diversa**: `configuracoes/campos-personalizados/page.tsx`

_Depende de:_ Fatia 4 (usa o mesmo `tabela-lista.tsx`). Independente das Fatias 5/6 — pode rodar em paralelo.
_Teste:_ um grupo por vez, mesma checagem da Fatia 6. Tabelas de importação (`passo-preview`, `passo-mapeamento`, `passo-revisao`) merecem atenção redobrada — são o único caso onde tabela aparece dentro de um fluxo de wizard, checar que paginação/scroll não quebra o fluxo de avançar/voltar passo.

## Fatia 8 — Varredura final

Depois de todas as fatias anteriores: passar por todas as ~30 páginas de tabela + 12 de gráfico uma última vez, em telas estreita/média/larga, procurando qualquer resquício visual do padrão antigo (borda genérica, tabela sem ícone, badge sem bolinha) que tenha escapado da migração página-a-página. Confirmar que nenhum arquivo ainda importa `Public+Sans`/`Cabinet+Grotesk`/nome antigo de fonte.

_Depende de:_ Fatias 1–7 completas.

---

## Fora de escopo (herdado da spec)

Virtualização de linha, seleção em massa de linha, tabelas de wizard como prioridade alta (existem, migram na Fatia 7, mas não ganham tratamento especial além disso).
