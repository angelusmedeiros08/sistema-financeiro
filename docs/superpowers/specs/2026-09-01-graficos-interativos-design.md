# Gráficos interativos (Fatia 3 do dossiê UX)

## Contexto

Pesquisa do dossiê UX identificou 4 lacunas nos gráficos financeiros (todos migrados de Recharts pra @visx, interação escrita à mão): tooltip sem comparação de período, afordância de clique ambígua em linha, legenda decorativa (não interativa), e falta de acessibilidade básica (sem `aria-label`, sem alternativa em tabela, sem diferenciação por padrão de traço além de cor). Investigação no código real (10 componentes de gráfico) confirmou e ampliou os achados — em particular, `comparativo-linha-anotada.tsx`, `comparativo-barras.tsx` e `waterfall-dre.tsx` já têm `cursor: pointer` nos pontos/barras SEM `onClick` — não é ambiguidade, é um bug real (parece clicável, não faz nada).

## Frente 1 — Afordância de clique em linha/barra

**Implementado com clique real** (período sempre mensal, `chave` já é `"YYYY-MM"` — sem trabalho extra de cálculo de intervalo):
- `comparativo-linha-anotada.tsx` (usado em `/relatorios/comparativos`): cada ponto vira link pra `/lancamentos` via `montarHrefLancamentosSemDimensao`, período = o mês inteiro daquele `chave`.
- `fluxo-chart.tsx` (Painel): mesma ideia, por série (Receitas/Despesas). `PontoFluxo` ganha campo `chaveIso: string` (o `"YYYY-MM"` que já existe na função, hoje descartado antes de virar o rótulo de exibição `mes`) — mudança de tipo pequena, sem novo fetch.

**Corrigido sem estender clique** (`comparativo-barras.tsx`, usado em Fluxo de Caixa com granularidade variável — dia/semana/mês/trimestre/ano — e `waterfall-dre.tsx`): remove o `cursor: pointer` órfão. Estender drill-down aqui exigiria uma função de "limites do período a partir de chave+granularidade" que não existe hoje — desproporcional pro tamanho desta fatia dentro do ciclo de UX maior (fica documentado como próximo passo natural, não um item pendente crítico).

## Frente 2 — Tooltip com comparação de período

Só `fluxo-chart.tsx` (Painel) não tem — `comparativo-linha-anotada.tsx` já mostra (é o propósito dela). Tooltip ganha uma 3ª linha com variação % vs. mês anterior (mesmo cálculo de `variacaoPercentual` já usado em `buscarAnaliseComparativa`, replicado localmente no componente já que os dados chegam prontos, sem essa métrica calculada no servidor).

## Frente 3 — Legenda clicável

`fluxo-chart.tsx`, `comparativo-linha-anotada.tsx`, `saldo-projetado-chart.tsx`, `comparativo-barras.tsx`: legenda ganha `useState<Set<string>>` de séries ocultas. Clique único alterna a série (esconde/mostra); duplo-clique isola (mostra só ela, ou desfaz o isolamento se já for a única visível). Estado local, não persiste entre sessões — reseta ao trocar filtro/navegar.

## Frente 4 — Acessibilidade básica

- `aria-label` descritivo por gráfico (resumo textual curto — ex. "Fluxo de caixa dos últimos 6 meses") no `<svg>` de cada um dos 10 componentes.
- Toggle "Ver como tabela" nos gráficos sem alternativa tabular hoje: `fluxo-chart` (Painel), `saldo-projetado-chart`, `comparativo-barras`. **Fora**: `comparativo-linha-anotada` (a página `/relatorios/comparativos` já renderiza `<ComparativosTabela>` sempre visível logo abaixo — toggle seria redundante).
- Padrão de traço (sólido vs. tracejado) em gráficos com 2+ séries de linha que hoje só diferenciam por cor: já existe em `comparativo-linha-anotada` e `saldo-projetado-chart` (tracejado na série secundária/projetada); `fluxo-chart` e `evolucao-ponto-equilibrio-chart` ganham o mesmo tratamento.

## Fora de escopo

- Zoom/brush temporal (já decidido de fora pela pesquisa original — janela fixa de 12 meses não pede isso hoje).
- Drill-down real em `comparativo-barras`/`waterfall-dre` (frente 1, ver justificativa acima).
- Persistência de legenda entre sessões (localStorage) — YAGNI, estado de sessão já resolve o caso de uso.
