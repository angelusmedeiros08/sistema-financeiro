# Plano de implementação: Importação — execução migra pro servidor

**Spec:** [docs/superpowers/specs/2026-08-26-importacao-execucao-servidor-design.md](../specs/2026-08-26-importacao-execucao-servidor-design.md)
**Data:** 2026-08-26

Ordem por dependência: primeiro a migração de cada wizard pro padrão de ação única (financeiro e Pessoas, independentes entre si), depois a UI de progresso que acompanha essa mudança, depois o conserto do Retomar (que precisa da ação única do financeiro já existir pra ganhar o placeholder pendente), por último o aviso visual no Desfazer (cosmético, sem dependência real). Cada fatia testável isolada antes de seguir pra próxima.

## Fatia 1 — Ação única pro financeiro

Nova `executarImportacaoFinanceiraAction(importacaoId, linhas[])` em `app/src/app/(app)/importacao/planilha/actions.ts` — recebe o array inteiro de linhas já parseadas (mesmo formato que `importarLinhaAction` recebe hoje por linha), roda o loop `commitarLinhaImportacao` (`lib/importacao/commit.ts`) dentro da própria Server Action, grava cada resultado em `importacoes_itens` (mesmo comportamento de hoje, só que dentro do loop server-side em vez de uma chamada por linha vinda do cliente) e chama a finalização (`status: "concluida"`) ao final do loop, sempre — sem depender de o cliente ainda estar conectado.

`app/src/app/(app)/importacao/planilha/passo-resultado.tsx`: o `useEffect` com o loop client-side vira uma única chamada `await executarImportacaoFinanceiraAction(importacaoId, linhas)`. `importarLinhaAction` e a chamada separada de `finalizarImportacaoFinanceiraAction` saem de uso (removidos se não sobrar nenhum outro chamador).

_Depende de:_ nada.
_Teste:_ importar uma planilha de ~50 linhas com a aba aberta o tempo todo (comportamento equivalente ao de hoje) — total de sucessos/erros bate com o que a planilha tinha. Fechar a aba/navegar embora logo após clicar em importar e conferir, depois, que o histórico mostra "Concluída" com todas as linhas processadas.

## Fatia 2 — Ação única pro Pessoas

Mesma migração: nova `executarImportacaoPessoasAction(importacaoId, linhas[])`, substituindo o loop em `app/src/app/(app)/importacao/pessoas/passo-resultado.tsx` e as chamadas por linha a `importarLinhaPessoaAction`. Remove o botão "Cancelar" (`StopCircle`) e a lógica de ref que ele acionava — não há mais um loop client-side pra interromper no meio.

_Depende de:_ nada (independente da Fatia 1).
_Teste:_ mesmo roteiro da Fatia 1 aplicado ao import de Pessoas — planilha completa com aba aberta, e fechando a aba no meio. Confirmar visualmente que o botão Cancelar sumiu e não sobrou nenhuma referência morta a ele no componente.

## Fatia 3 — UI de progresso única

Nos dois `passo-resultado.tsx` (planilha e pessoas): troca o contador "Processando linha X de Y" (que dependia de observar o loop linha a linha, impossível agora que virou uma chamada única) por um estado único — "Importando N lançamentos... isso pode levar alguns segundos, não feche esta janela" — com spinner, enquanto a Server Action está em voo. `N` vem da contagem de linhas já conhecida antes de disparar a ação (não precisa de dado novo).

_Depende de:_ Fatias 1 e 2 (a UI acompanha a chamada única).
_Teste:_ ao vivo — visual do estado "aguarde" nos dois wizards, sumindo corretamente quando a ação resolve (sucesso ou erro).

## Fatia 4 — Conserto do Retomar (financeiro)

`app/src/lib/importacoes/importacoes-financeiro.ts`: dentro do loop da Fatia 1, cada linha ganha uma linha `"pendente"` em `importacoes_itens` **antes** de tentar processar (mesmo padrão que Pessoas já usa) — assim uma linha nunca tentada (por erro fatal antes de chegar nela) aparece como pendente de verdade, não como se não existisse. `dados_normalizados` passa a guardar o dado real da linha (troca o `{}` hardcoded) — necessário pra reprocessar depois.

`app/src/app/(app)/importacao/historico/actions.ts`: `retomarItemAction` para de chamar `importarLinhaPessoaAction` incondicionalmente — passa a checar o `tipo` da importação (via o item/lote) e chamar o commit certo (`commitarLinhaImportacao` pro financeiro, o commit de pessoas já existente pro outro caso).

_Depende de:_ Fatia 1 (a ação única do financeiro precisa existir pra ganhar o placeholder pendente dentro do mesmo loop).
_Teste:_ forçar uma importação financeira a falhar no meio (ex.: matar o processo do dev server durante o teste, ou um erro fatal proposital numa linha específica que pare o loop) e conferir, na tela de histórico, que "Retomar" aparece com a contagem certa de pendentes e que clicar nele processa as linhas certas com os dados certos — sem duplicar as já commitadas.

## Fatia 5 — Aviso "não feche" no Desfazer

`app/src/app/(app)/importacao/historico/[id]/desfazer-painel-financeiro.tsx` e `desfazer-painel.tsx`: o estado `rodando` (hoje só troca o texto do botão pra "Desfazendo...") ganha o mesmo aviso visual da Fatia 3 — "Desfazendo... isso pode levar alguns segundos, não feche esta janela".

_Depende de:_ nada (cosmético, mesmo padrão visual da Fatia 3, sem mudança de arquitetura — Desfazer já era uma ação única).
_Teste:_ ao vivo — desfazer uma importação e conferir o aviso aparecendo/sumindo corretamente.

## Fora de escopo (herdado da spec)

Progresso ao vivo linha-a-linha (contador em tempo real via streaming/SSE). Limpeza dos 30 lotes já travados em `"em_andamento"` (dado de tenants de dev). Resolver limite de duração de função serverless antes de decidir hospedagem.
