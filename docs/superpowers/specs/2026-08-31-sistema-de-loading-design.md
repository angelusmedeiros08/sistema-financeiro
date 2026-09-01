# Sistema de loading — design

Fatia 1 do plano de UX/estrutura do Finanssi (ver [Dossiê UX](https://claude.ai/code/artifact/ecc645b3-9d4c-46d6-89f1-89514b18e769), 12 pesquisas, 31/08/2026). Escopo: comportamento e estrutura de carregamento — nenhuma decisão de cor de marca ou tipografia, isso fica pra uma reforma visual futura separada.

## Problema

Hoje só `/painel` tem `loading.tsx` (montado à mão, sem componentes reutilizáveis). Todas as outras ~68 rotas não têm nada — o Next.js mostra a tela em branco até o Server Component terminar de buscar dado no Supabase. E nos 9 relatórios (`/relatorios/*`), trocar o filtro global de Regime/Visão/Período (`RelatoriosControles`, compartilhado) navega via `router.push`, o que reativa o `loading.tsx` da rota inteira por padrão — a tela some e a pessoa perde o contexto visual pra uma troca que devia ser instantânea.

## Arquitetura

Duas peças independentes, sem sobreposição:

**1. `loading.tsx` por rota** — cobre a primeira carga de cada tela (navegação de verdade: clicar num link do menu, abrir um registro). Mecanismo automático do Next.js App Router (Suspense por segmento de rota), já provado em `/painel`. Cada `loading.tsx` novo é composto a partir dos templates do catálogo abaixo, nunca `<Skeleton>` cru espalhado — reproduz a geometria real da tela (mesmo grid, mesmo `max-w`, mesmo `gap`), igual ao padrão já usado em `/painel/loading.tsx`.

**2. `useTransition` no filtro de relatórios** — cobre a troca de filtro numa tela que já está carregada. `RelatoriosControles` (`relatorios/controles.tsx`) embrulha as 3 chamadas de `router.push` (`navegarCom` pra Regime/Visão, `aplicarPeriodo` pro período) em `startTransition`. Isso já é suficiente pra resolver o problema: o React mantém a tela antiga visível até a nova estar pronta, sem reativar o `loading.tsx` da rota. Não precisa de skeleton nenhum pra isso funcionar — é comportamento nativo do React 18+/Next.js App Router.

Complemento pequeno: como a tela antiga fica visível "as-is" durante a troca, sem nenhum sinal de que está atualizando, isso viola a regra "nunca deixar valor antigo parecer atual" levantada na pesquisa. Por isso `RelatoriosControles` expõe visualmente o `isPending` do `useTransition` — atrasado por `useDelayedPending` (abaixo) pra não piscar em trocas instantâneas — esmaecendo o conteúdo da tela (`opacity-60 pointer-events-none` no container do corpo do relatório) enquanto a nova versão carrega.

## Catálogo de componentes

Todos em `src/components/ui/`, ao lado de `skeleton.tsx` (primitivo já existente) e `estado-vazio.tsx` (precedente de componente composto sobre primitivo shadcn nesse projeto). Um arquivo por componente, seguindo a convenção já usada em toda a pasta.

Antes de compor os templates: o primitivo `skeleton.tsx` atual usa `animate-pulse` (Tailwind). A pesquisa confirmou que o shadcn/ui atual recomenda o utilitário `shimmer` (ciclo de 2s, linear, infinito) como alternativa mais atual. Decisão: **manter `animate-pulse`** — trocar a animação do primitivo é uma mudança de comportamento visual em todo o app de uma vez, mais parecida com decisão de identidade visual (fora de escopo desta fatia) do que estrutural. Fica registrado como candidato pra quando a reforma visual acontecer.

- **`SkeletonKpiCard`** — ícone circular + barra larga (número) + barra curta (rótulo) + pill pequena (tendência). Painel, Indicadores, Portal do cliente.
- **`SkeletonTable`** — parametrizável por `colunas: number` e `linhas: number` (padrão 6). Cabeçalho real (nomes de coluna, se conhecidos estaticamente) permanece visível; larguras de célula variam num padrão fixo (não todas iguais) pra não parecer grade repetida.
- **`SkeletonChart`** — `aspect-ratio` fixo (prop `aspectRatio`, padrão `16/9`) batendo com o gráfico real; silhueta de barras de altura variável (padrão) ou linha ondulada (`variante="linha"`).
- **`SkeletonForm`** — pares label+input empilhados, `campos: number` (padrão 4), mais um botão no fim.
- **`SkeletonDetailPage`** — cabeçalho (barra larga + badge pequeno) + `secoes: number` (padrão 2) blocos, cada um com título + 2-3 linhas.
- **`SkeletonTransactionList`** — variante compacta pro extrato do Painel: ícone circular pequeno + 2 linhas de texto + valor alinhado à direita, repetido `itens: number` (padrão 5).

Sem componente próprio pra Avatar/Badge — usados embutidos (`<Skeleton className="size-8 rounded-full" />` etc.) dentro dos templates acima, pequeno demais pra justificar arquivo.

### Hook `useDelayedPending`

```ts
function useDelayedPending(pending: boolean, delayMs = 250): boolean
```

Só propaga `true` depois de `delayMs` de `pending` contínuo; volta a `false` imediatamente assim que `pending` vira `false`. Usado em `RelatoriosControles` (ver acima). Não é usado pelos `loading.tsx` de rota — esses já são geridos pelo Next.js e o precedente (`/painel/loading.tsx`) não tem delay, mantendo consistência.

## Mapeamento rota → template

**Dashboard** (`SkeletonKpiCard` + `SkeletonChart` + `SkeletonTransactionList`): `/painel` (refazer o `loading.tsx` existente pros componentes novos), `/indicadores`.

**Relatório com filtro** (`SkeletonChart` + `SkeletonTable`, cabeçalho da página fora do `loading.tsx` fica com o próprio Next.js): `/relatorios`, `/relatorios/visao-geral`, `/relatorios/dre`, `/relatorios/dfc`, `/relatorios/fluxo-caixa`, `/relatorios/centro-custo`, `/relatorios/aging`, `/relatorios/despesas`, `/relatorios/ponto-equilibrio`, `/relatorios/comparativos`, `/relatorios/contas-bancarias`, `/relatorios/orcado-realizado`.

**Listagem** (`SkeletonTable`): `/despesas`, `/receitas`, `/contas-a-pagar`, `/contas-a-receber`, `/lancamentos`, `/clientes`, `/fornecedores`, `/vendas`, `/orcamentos`, `/produtos-servicos`, `/apresentacoes`, `/importacao/historico`, `/fluxo-caixa`, `/previsionamento`, `/portal/lancamentos`.

**Dashboard do portal** (`SkeletonKpiCard` + `SkeletonTransactionList`): `/portal`.

**Detalhe de registro** (`SkeletonDetailPage`): `/despesas/[id]`, `/receitas/[id]`, `/clientes/[pessoaId]`, `/fornecedores/[pessoaId]`, `/vendas/[id]`, `/orcamentos/[id]`, `/apresentacoes/[id]`, `/contas-a-pagar/[parcelaId]`, `/contas-a-receber/[parcelaId]`, `/importacao/historico/[id]`.

**Formulário** (`SkeletonForm`): `/clientes/novo`, `/fornecedores/novo`, `/vendas/nova`, `/orcamentos/nova`, `/apresentacoes/novo`, `/contas-a-pagar/[parcelaId]/baixa`, `/contas-a-pagar/[parcelaId]/renegociar`, `/contas-a-receber/[parcelaId]/baixa`, `/contas-a-receber/[parcelaId]/renegociar`, `/perfil`.

**Configurações** (`SkeletonTable`, versão compacta — `linhas={4}`): `/configuracoes`, `/configuracoes/categorias`, `/configuracoes/plano-de-contas`, `/configuracoes/centros-custo`, `/configuracoes/formas-pagamento`, `/configuracoes/contas-financeiras`, `/configuracoes/contas-financeiras/[id]/conciliar`, `/configuracoes/recorrencias`, `/configuracoes/campos-personalizados`, `/configuracoes/estrutura-dre`, `/configuracoes/equipe`, `/configuracoes/regras-categorizacao`, `/configuracoes/orcamento`.

**Fora de escopo, de propósito**: `/importacao`, `/importacao/planilha`, `/importacao/pessoas`, `/importacao/produtos`, `/importacao/ia`, `/configuracoes/importar-planilha`, `/configuracoes/importar-pessoas`, `/configuracoes/mapeamento-colunas` — wizards multi-etapa que já têm feedback de progresso próprio (indicador de etapa), skeleton genérico seria redundante.

## Erros e edge cases

- **Erro ao carregar** (Server Component lança) continua caindo no `error.tsx` de cada rota (mecanismo do Next.js, já existe onde existir) — não é escopo desta fatia criar `error.tsx` novo, só não deve quebrar com a introdução do `loading.tsx`.
- **`useTransition` com erro de rede**: se o `router.push` falhar (raro, é navegação client-side), `isPending` simplesmente volta a `false` sem trocar o conteúdo — o usuário fica com a URL antiga e os dados antigos, sem mensagem de erro. Aceitável pra troca de filtro (não é ação destrutiva nem grava dado); revisitar só se aparecer relato real de confusão.
- **Streaming parcial dentro de uma página** (ex.: Painel com card de KPI pronto antes do gráfico) fica fora desta fatia — o catálogo de componentes já dá a base (`<Suspense>` por seção usando os templates), mas decidir quais telas merecem esse refinamento é julgamento de produto pra uma leva futura, não mecânico o bastante pra entrar sem revisão tela a tela.

## Testes

Sem teste automatizado novo (o projeto não tem suíte de testes de UI estabelecida). Verificação: `tsc`/`eslint`/`build` limpos por fatia de implementação, e teste ao vivo no site publicado (Vercel) — visitar cada família de tela pelo menos uma vez, confirmar que o skeleton aparece com a geometria certa e que trocar filtro num relatório não faz a tela sumir.
