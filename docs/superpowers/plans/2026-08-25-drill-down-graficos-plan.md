# Plano de implementação: Gráficos clicáveis — do resumo pro detalhe

**Spec:** [docs/superpowers/specs/2026-08-25-drill-down-graficos-design.md](../specs/2026-08-25-drill-down-graficos-design.md)
**Data:** 2026-08-25

Ordem por dependência: primeiro o helper que decide "pra onde vai cada clique" (fundação, sem nenhuma tela nova ainda), depois as duas telas de destino (Lançamentos filtrados é nova; extrato de pessoa só ganha um botão), só então conectar os 3 gráficos da 1ª leva nas pontas já prontas. Cada fatia é testável isolada antes de seguir pra próxima — a Fatia 4 é a única que depende de todas as outras.

## Fatia 1 — Helper central de drill-down

Criar `src/lib/relatorios/drill-down.ts`, exportando uma função que recebe `{ tenantId, tipoEntidade: "pessoa" | "categoria" | "forma_pagamento" | "centro_custo", entidadeId: string | string[] | null, periodoInicio, periodoFim }` e devolve o `DestinoDrillDown` (`{ tipo: "pessoa", href }` ou `{ tipo: "lancamentos", href }`) definido na spec.

- `tipoEntidade: "pessoa"` consulta o perfil da pessoa (reaproveitar a busca já existente em `lib/pessoas/buscar-pessoa.ts`) pra decidir `/clientes/[id]` vs `/fornecedores/[id]`.
- Os demais tipos montam `/lancamentos?<entidade>_id=...&periodo_inicio=...&periodo_fim=...`.
- `entidadeId` como array (caso "Outras") vira lista separada por vírgula no mesmo parâmetro; `entidadeId: null` (caso "Não informado"/"Sem pessoa") vira o literal `nenhuma`.
- Todo destino carrega `?voltar=<url atual>`, recebido como parâmetro extra da função (`origemHref`) — quem chama (a página do relatório) sabe sua própria URL.

_Depende de:_ nada.
_Teste:_ chamada direta da função com os 5 casos (pessoa cliente, pessoa fornecedor, categoria única, lista "Outras", `null`), conferindo o href exato de cada um.

## Fatia 2 — Tela nova `/lancamentos`

Nova função de busca (`src/lib/relatorios/lancamentos-filtrados.ts` ou junto de `regime.ts`) que aceita os filtros da Fatia 1 (`categoria_id`, `forma_pagamento_id`, `centro_custo_id`, período, aceitando lista e `nenhuma`) e devolve os lançamentos + um resumo (total em R$, contagem, rótulo pro cabeçalho — ex.: "Pix").

Nova página `src/app/(app)/lancamentos/page.tsx` (Server Component lendo `searchParams`):
- Botão "← Voltar pro relatório" fixo no topo, lendo `?voltar=` (pill `rounded-full px-3 py-1 text-xs font-medium`, mesmo padrão já usado nos filtros de Contas a Pagar/Receber).
- Cabeçalho contextual (título + total em R$) e chips de filtro ativos — mesma maquete aprovada no companion visual desta sessão.
- Lista de lançamentos reaproveitando `TabelaEventos`/`TabelaLista` já existentes, sem o formulário de criação que Despesas/Receitas têm hoje (aqui é só visualização).

_Depende de:_ Fatia 1 (formato dos parâmetros de URL).
_Teste:_ acessar a URL manualmente com cada combinação de filtro (categoria, forma de pagamento, centro de custo, lista "Outras", `nenhuma`) e comparar lista + total contra uma consulta manual no banco.

## Fatia 3 — Botão de voltar no extrato de pessoa

`/clientes/[id]` e `/fornecedores/[id]` ganham o mesmo botão fixo "← Voltar pro relatório" quando `?voltar=` está presente na URL — nenhuma outra mudança na página.

_Depende de:_ nada — pode rodar em paralelo com a Fatia 2.
_Teste:_ acessar `/clientes/[id]?voltar=/indicadores`, confirmar que o botão aparece e leva de volta pra `/indicadores`; sem o parâmetro, a página fica exatamente como está hoje.

## Fatia 4 — Conectar os 3 gráficos da 1ª leva

Estender `buscarDistribuicaoFormaPagamento`, `buscarConcentracaoReceita` e a função por trás de Top Categorias (`buscarAnaliseCategorias`) pra cada linha incluir o `href` calculado via helper da Fatia 1 (a função já sabe `tenantId`/período/id da entidade — só precisa parar de descartar isso antes de devolver).

`TopCategoriasDonut` (componente único por trás dos 3 usos — forma de pagamento e concentração em `indicadores/page.tsx`, categoria em `visao-geral/page.tsx`): a função interna `agregarFatias` para de descartar o id/href; `onClick` no mesmo `<path>` que já recebe `onMouseMove` faz `router.push(fatia.href)`. **Nenhuma mudança visual** — cor, legenda, ângulo mínimo de fatia, tudo como está hoje.

_Depende de:_ Fatia 1, Fatia 2 (destino "lancamentos" precisa existir) e Fatia 3 (destino "pessoa" precisa aceitar o botão de voltar).
_Teste:_ ao vivo no navegador, nos 3 gráficos — clicar em cada fatia nomeada, em "Outras" e em "Não informado"/"Sem pessoa"; confirmar destino certo, total da lista batendo com o valor da fatia, e o botão de voltar funcionando mesmo depois de um F5 na tela de destino.

---

## Fora de escopo (herdado da spec)

Centro de Custo, Orçado×Realizado e os demais gráficos de barra/pizza por entidade — mesmo contrato (`DestinoDrillDown` + helper da Fatia 1), documentados como 2ª leva, não construídos neste plano. Waterfall do DRE e gráficos de série temporal (linha/área por período) ficam de fora — não representam uma entidade única por ponto clicado, precisam de uma decisão própria não coberta na spec.
