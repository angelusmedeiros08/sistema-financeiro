# Plano de implementação: Sistema de loading

**Spec:** [docs/superpowers/specs/2026-08-31-sistema-de-loading-design.md](../specs/2026-08-31-sistema-de-loading-design.md)
**Data:** 2026-08-31

Ordem por dependência: primeiro os componentes/hook (nada visível em rota real ainda), depois o `useTransition` nos filtros de relatório (peça pequena e de maior valor prático — resolve a dor mais repetida antes de qualquer coisa), depois o rollout de `loading.tsx` fatiado por família de tela (Seção "Mapeamento rota → template" da spec), na ordem: Dashboard → Relatórios → Listagens → Detalhe → Formulário → Configurações. Cada fatia de rollout é mecanicamente repetitiva (1 arquivo `loading.tsx` de poucas linhas por rota, chamando o componente certo), fatiada por família pra cada leva ficar testável ao vivo isoladamente.

## Fatia 1 — Componentes e hook

`src/components/ui/`:
- `skeleton-kpi-card.tsx` — `SkeletonKpiCard`
- `skeleton-table.tsx` — `SkeletonTable({ colunas = 5, linhas = 6 })`
- `skeleton-chart.tsx` — `SkeletonChart({ aspectRatio = 16/9, variante = "barras" | "linha" })`
- `skeleton-form.tsx` — `SkeletonForm({ campos = 4 })`
- `skeleton-detail-page.tsx` — `SkeletonDetailPage({ secoes = 2 })`
- `skeleton-transaction-list.tsx` — `SkeletonTransactionList({ itens = 5 })`

`src/lib/hooks/use-delayed-pending.ts` (ou local a `relatorios/controles.tsx` se não houver outro uso previsto — decidir na hora conforme convenção de pasta de hooks do projeto): `useDelayedPending(pending: boolean, delayMs = 250): boolean`.

Todos usam o primitivo `Skeleton` existente (`animate-pulse`, sem mudar a animação — Seção "Catálogo de componentes" da spec). Sem prop de cor: só `className` opcional pra ajuste de layout pontual, herdando `bg-muted` do primitivo.

_Depende de:_ nada.
_Teste:_ sem rota própria ainda — validado indiretamente na Fatia 2 (primeiro uso real) e na Fatia 3 (primeiro `loading.tsx` com os componentes novos). `tsc`/`eslint`/`build` limpos é a barra desta fatia.

## Fatia 2 — `useTransition` nos filtros de relatório

`src/app/(app)/relatorios/controles.tsx` (`RelatoriosControles`): embrulhar as 3 chamadas de `router.push` (`navegarCom` × 2, `aplicarPeriodo`) em `startTransition`; usar `useDelayedPending(isPending)` pra esmaecer o corpo do relatório (`opacity-60 pointer-events-none`) enquanto pendente. O esmaecimento precisa alcançar o conteúdo abaixo dos controles — como `RelatoriosControles` é renderizado dentro de cada `page.tsx` de relatório junto com o corpo (tabela/gráfico), a forma mais simples é `RelatoriosControles` expor `isPending` via um wrapper client (`<RelatoriosControles>{children}</RelatoriosControles>` envolvendo o corpo da página) ou context local — decidir a implementação exata olhando como cada `page.tsx` de relatório está estruturado hoje (podem divergir um pouco entre si).

_Depende de:_ Fatia 1 (usa `useDelayedPending`).
_Teste:_ ao vivo — abrir `/relatorios/dre`, trocar Regime e depois o período, confirmar que a tela **não** pisca pra um loading de página inteira e que o conteúdo esmaece brevemente durante a troca. Repetir em pelo menos mais 1 relatório (ex. `/relatorios/fluxo-caixa`) já que `RelatoriosControles` é compartilhado — não precisa testar as 9 telas individualmente, só confirmar que o componente compartilhado funciona em mais de uma tela hospedeira.

## Fatia 3 — Dashboard

- `src/app/(app)/painel/loading.tsx` — refazer usando `SkeletonKpiCard`/`SkeletonChart`/`SkeletonTransactionList` no lugar do `<Skeleton>` cru atual, mantendo a mesma geometria de grid já validada.
- `src/app/(app)/indicadores/loading.tsx` — novo.
- `src/app/(portal)/portal/loading.tsx` — novo (`SkeletonKpiCard` + `SkeletonTransactionList`).

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — recarregar `/painel`, `/indicadores` e `/portal` (throttle de rede se a resposta do Supabase estiver rápida demais pra ver o skeleton; ou confirmar via `read_network_requests`/timing que o `loading.tsx` está registrado na rota, mesmo que dure pouco).

## Fatia 4 — Relatórios

`loading.tsx` novo em cada uma das 12 rotas (`SkeletonChart` + `SkeletonTable`, Seção "Mapeamento" da spec): `/relatorios`, `/relatorios/visao-geral`, `/relatorios/dre`, `/relatorios/dfc`, `/relatorios/fluxo-caixa`, `/relatorios/centro-custo`, `/relatorios/aging`, `/relatorios/despesas`, `/relatorios/ponto-equilibrio`, `/relatorios/comparativos`, `/relatorios/contas-bancarias`, `/relatorios/orcado-realizado`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — 3 dessas 12 rotas (uma com gráfico predominante tipo `/relatorios/dre`, uma tabular tipo `/relatorios/aging`, uma mista), confirmar geometria do skeleton batendo com a tela real. Não precisa das 12.

## Fatia 5 — Listagens

`loading.tsx` novo (`SkeletonTable`) em: `/despesas`, `/receitas`, `/contas-a-pagar`, `/contas-a-receber`, `/lancamentos`, `/clientes`, `/fornecedores`, `/vendas`, `/orcamentos`, `/produtos-servicos`, `/apresentacoes`, `/importacao/historico`, `/fluxo-caixa`, `/previsionamento`, `/portal/lancamentos`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — 3-4 dessas rotas cobrindo módulos diferentes (ex. `/despesas`, `/vendas`, `/clientes`, `/portal/lancamentos` pra confirmar o portal também).

## Fatia 6 — Detalhe de registro

`loading.tsx` novo (`SkeletonDetailPage`) em: `/despesas/[id]`, `/receitas/[id]`, `/clientes/[pessoaId]`, `/fornecedores/[pessoaId]`, `/vendas/[id]`, `/orcamentos/[id]`, `/apresentacoes/[id]`, `/contas-a-pagar/[parcelaId]`, `/contas-a-receber/[parcelaId]`, `/importacao/historico/[id]`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — abrir 2-3 registros existentes reais (não criar dado de teste só pra isso) em módulos diferentes, confirmar o skeleton aparece antes do conteúdo.

## Fatia 7 — Formulário

`loading.tsx` novo (`SkeletonForm`) em: `/clientes/novo`, `/fornecedores/novo`, `/vendas/nova`, `/orcamentos/nova`, `/apresentacoes/novo`, `/contas-a-pagar/[parcelaId]/baixa`, `/contas-a-pagar/[parcelaId]/renegociar`, `/contas-a-receber/[parcelaId]/baixa`, `/contas-a-receber/[parcelaId]/renegociar`, `/perfil`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — 2-3 dessas rotas, incluindo uma que busca dado pra pré-popular (`/contas-a-pagar/[parcelaId]/baixa`, que já vem com valor/data preenchidos) já que é onde o loading é mais perceptível (form em branco tem menos o que buscar).

## Fatia 8 — Configurações

`loading.tsx` novo (`SkeletonTable` compacto, `linhas={4}`) em: `/configuracoes`, `/configuracoes/categorias`, `/configuracoes/plano-de-contas`, `/configuracoes/centros-custo`, `/configuracoes/formas-pagamento`, `/configuracoes/contas-financeiras`, `/configuracoes/contas-financeiras/[id]/conciliar`, `/configuracoes/recorrencias`, `/configuracoes/campos-personalizados`, `/configuracoes/estrutura-dre`, `/configuracoes/equipe`, `/configuracoes/regras-categorizacao`, `/configuracoes/orcamento`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — 3-4 dessas 13 rotas.

## Fatia 9 — Revisão final

Passada única conferindo: nenhuma das 8 rotas de import/wizard (fora de escopo, Seção "Mapeamento" da spec) ganhou `loading.tsx` sem querer; `tsc`/`eslint`/`build` limpos no repo inteiro; checagem visual rápida em modo mobile de pelo menos 1 tela por família (o skeleton reflui igual ao conteúdo real?).

_Depende de:_ Fatias 1-8.
_Teste:_ regressão leve no site publicado, sem escopo de mudança nova.
