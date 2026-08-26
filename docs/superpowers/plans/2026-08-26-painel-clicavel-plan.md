# Plano de implementação: Painel clicável — 3ª leva de gráficos clicáveis

**Spec:** [docs/superpowers/specs/2026-08-26-painel-clicavel-design.md](../specs/2026-08-26-painel-clicavel-design.md)
**Data:** 2026-08-26

Ordem por dependência: primeiro as duas extensões de mecanismo (filtro sem dimensão, `href` no gauge), sem nenhuma tela tocada ainda — testáveis isoladas. Depois cada grupo de elementos do Painel, do mais simples (só ganham `href`) pro que muda layout (Resultado do mês). Lançamentos recentes é independente de tudo, pode vir em qualquer ordem. Termina com revisão de código — padrão já confirmado nas levas anteriores pra feature financeira nova.

## Fatia 1 — Mecanismo: filtro sem dimensão

`FiltroLancamentos.dimensao` (`src/lib/relatorios/lancamentos-filtrados.ts`) vira opcional. `buscarLancamentosFiltrados` ganha um ramo pro caso `dimensao` ausente: chama `buscarMovimento` direto (regime/período, `apenasTipo` se presente) e soma tudo, sem filtrar por categoria/centro/pessoa. Rótulo vem de um parâmetro novo (`rotulo` explícito passado por quem chama — "Todo o histórico", "Recebido em agosto", etc.), já que não há entidade pra derivar nome.

`montarHrefLancamentos` (`src/lib/relatorios/drill-down.ts`) ganha uma variante que aceita só `{ regime, tipo?, periodoInicio, periodoFim, origemHref }` (sem `tipoEntidade`/`entidadeId`) e monta a URL sem parâmetro de dimensão nenhum.

`/lancamentos/page.tsx` já lê `regime`/`tipo`/período do searchParams — só precisa parar de exigir um dos 4 ids de dimensão pra montar o filtro (hoje provavelmente assume que sempre existe algum).

_Depende de:_ nada.
_Teste:_ chamada direta de `buscarLancamentosFiltrados` sem `dimensao`, período = mês corrente, conferindo total contra soma manual no banco. Acessar a URL sem nenhum parâmetro de dimensão manualmente e confirmar que a lista carrega.

## Fatia 2 — `IndicadorGauge` ganha `href`

`src/components/relatorios/indicador-gauge.tsx` ganha prop `href?: string`. Quando presente, envolve o card inteiro em `<Link>` (mesmo padrão de `StatCard`: `hover:shadow-lg`, seta `ArrowRight` aparecendo no hover/focus-visible). Sem `href`, comportamento idêntico ao de hoje.

_Depende de:_ nada.
_Teste:_ visual — um gauge com `href` de teste mostra a seta no hover e navega; um sem `href` continua exatamente como antes.

## Fatia 3 — Saldo em caixa, Recebido (mês), Pago (mês)

`src/app/(app)/painel/page.tsx`: os três `StatCard` ganham `href`, usando a variante sem dimensão da Fatia 1:
- Saldo em caixa → `regime=realizado`, sem `tipo`, período `1900-01-01` até hoje.
- Recebido (mês) → `regime=realizado`, `tipo=RECEITA`, período = mês corrente (já calculado em `dados.ts` via `mesAtual()`).
- Pago (mês) → mesmo, `tipo=DESPESA`.

Nenhuma mudança em `dados.ts` — os três já têm o número certo, só faltava o link.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo, tenant real — clicar nos três e conferir que o total mostrado em `/lancamentos` bate exato com o número do card.

## Fatia 4 — Resultado do mês (2 linhas linkáveis)

`obterResultadoDoMes` (`src/app/(app)/painel/dados.ts`) passa a retornar `{ liquido, receitas, despesas }` em vez de só o número líquido — mesma query, só soma as duas parcelas em vez de só o líquido. `obterDadosPainel` propaga o objeto novo.

`src/app/(app)/painel/page.tsx`: o `StatCard` de "Resultado do mês" continua mostrando o líquido (sem `href` — é subtração, não soma direta, mesmo precedente de Centro de Custo/Orçado×Realizado). Duas linhas novas abaixo do `detalhe` existente, cada uma com seu `<Link>` próprio (verde "Receitas", vermelho "Despesas"), usando a variante sem dimensão com `regime=competencia` (mesmo regime já usado por este card) e período = mês corrente.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — Receitas e Despesas do mês batendo exato com os totais em `/lancamentos`; líquido continua sem link.

## Fatia 5 — Os 4 gauges de %

`src/app/(app)/painel/page.tsx`: cada `IndicadorGauge` ganha `href`:
- % Realizado de contas a receber → `/contas-a-receber?situacao=todos`
- % Realizado de contas a pagar → `/contas-a-pagar?situacao=todos`
- % Pago em atraso (a receber) → `/contas-a-receber?situacao=vencido`
- % Pago em atraso (a pagar) → `/contas-a-pagar?situacao=vencido`

_Depende de:_ Fatia 2.
_Teste:_ ao vivo — cada gauge navega pro filtro certo (`situacao` correspondente já existe em Contas a Receber/Pagar).

## Fatia 6 — Lançamentos recentes clicáveis

`src/app/(app)/painel/page.tsx`: cada `<li>` da lista "Lançamentos recentes" vira (ou envolve) um `<Link href={evento.tipo === "RECEITA" ? \`/receitas/${evento.id}\` : \`/despesas/${evento.id}\`}>`. Sem mudança em `dados.ts` — `evento.id` já é o `evento_financeiro_id`.

_Depende de:_ nada (independente do mecanismo de dimensão).
_Teste:_ ao vivo — clicar num item de receita e um de despesa abre a tela de edição certa, com os dados certos. Testar também um lançamento originado do módulo de Vendas (confirma que `/receitas/[id]` funciona pra ele) e, se houver algum evento estornado na lista, confirmar que abre o aviso de "não pode mais ser editado" em vez de quebrar.

## Fatia 7 — Revisão de código

Mesmo padrão confirmado na 2ª leva: pelo menos 2 revisões de código independentes (focos diferentes — financeiro/regressão e UX/acessibilidade) antes de considerar a leva concluída, dado que mexe em cálculo de dinheiro (`obterResultadoDoMes`) e no mecanismo central de drill-down.

_Depende de:_ Fatias 1–6.
_Teste:_ achados triados por severidade; nenhum bug financeiro/tenant pendente antes de fechar.

## Fora de escopo (herdado da spec)

Gráfico "Fluxo de caixa" (série temporal). Qualquer redesenho visual além das 2 linhas novas em Resultado do mês. Limpeza dos 2 tenants de desenvolvimento com dado de teste poluído.
