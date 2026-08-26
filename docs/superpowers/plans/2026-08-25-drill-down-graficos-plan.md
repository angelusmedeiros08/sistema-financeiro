# Plano de implementação: Gráficos clicáveis — do resumo pro detalhe

**Spec:** [docs/superpowers/specs/2026-08-25-drill-down-graficos-design.md](../specs/2026-08-25-drill-down-graficos-design.md)
**Data:** 2026-08-25

Ordem por dependência: primeiro o helper que decide "pra onde vai cada clique" (fundação, sem nenhuma tela nova ainda), depois as duas telas de destino (Lançamentos filtrados é nova; extrato de pessoa só ganha um botão), só então conectar os 3 gráficos da 1ª leva nas pontas já prontas. Cada fatia é testável isolada antes de seguir pra próxima — a Fatia 4 é a única que depende de todas as outras.

## Fatia 1 — Helper central de drill-down

**Concluída.**

Criar `src/lib/relatorios/drill-down.ts`, exportando uma função que recebe `{ tenantId, tipoEntidade: "pessoa" | "categoria" | "forma_pagamento" | "centro_custo", entidadeId: string | string[] | null, periodoInicio, periodoFim }` e devolve o `DestinoDrillDown` (`{ tipo: "pessoa", href }` ou `{ tipo: "lancamentos", href }`) definido na spec.

- `tipoEntidade: "pessoa"` consulta o perfil da pessoa (reaproveitar a busca já existente em `lib/pessoas/buscar-pessoa.ts`) pra decidir `/clientes/[id]` vs `/fornecedores/[id]`.
- Os demais tipos montam `/lancamentos?<entidade>_id=...&periodo_inicio=...&periodo_fim=...`.
- `entidadeId` como array (caso "Outras") vira lista separada por vírgula no mesmo parâmetro; `entidadeId: null` (caso "Não informado"/"Sem pessoa") vira o literal `nenhuma`.
- Todo destino carrega `?voltar=<url atual>`, recebido como parâmetro extra da função (`origemHref`) — quem chama (a página do relatório) sabe sua própria URL.

_Depende de:_ nada.
_Teste:_ chamada direta da função com os 5 casos (pessoa cliente, pessoa fornecedor, categoria única, lista "Outras", `null`), conferindo o href exato de cada um.

## Fatia 2 — Tela nova `/lancamentos`

**Concluída.**

Nova função de busca (`src/lib/relatorios/lancamentos-filtrados.ts` ou junto de `regime.ts`) que aceita os filtros da Fatia 1 (`categoria_id`, `forma_pagamento_id`, `centro_custo_id`, período, aceitando lista e `nenhuma`) e devolve os lançamentos + um resumo (total em R$, contagem, rótulo pro cabeçalho — ex.: "Pix").

Nova página `src/app/(app)/lancamentos/page.tsx` (Server Component lendo `searchParams`):
- Botão "← Voltar pro relatório" fixo no topo, lendo `?voltar=` (pill `rounded-full px-3 py-1 text-xs font-medium`, mesmo padrão já usado nos filtros de Contas a Pagar/Receber).
- Cabeçalho contextual (título + total em R$) e chips de filtro ativos — mesma maquete aprovada no companion visual desta sessão.
- Lista de lançamentos reaproveitando `TabelaEventos`/`TabelaLista` já existentes, sem o formulário de criação que Despesas/Receitas têm hoje (aqui é só visualização).

_Depende de:_ Fatia 1 (formato dos parâmetros de URL).
_Teste:_ acessar a URL manualmente com cada combinação de filtro (categoria, forma de pagamento, centro de custo, lista "Outras", `nenhuma`) e comparar lista + total contra uma consulta manual no banco.

## Fatia 3 — Botão de voltar no extrato de pessoa

**Concluída, depois revertida** — ver "Correção pós-implementação" no fim deste plano e na spec. `/clientes/[id]` e `/fornecedores/[id]` ganharam o botão fixo "← Voltar pro relatório" quando `?voltar=` estava presente, testado nos dois casos (com e sem parâmetro) — mas ficou sem uso quando a Fatia 4 revelou, ao vivo, que pessoa não devia ir pro extrato. As duas páginas e `detalhe-pessoa.tsx` voltaram ao estado de antes desta fatia.

## Fatia 4 — Conectar os 3 gráficos da 1ª leva

**Concluída**, com uma correção de design no meio do caminho — ver "Correção pós-implementação" abaixo.

Estendidas `buscarDistribuicaoFormaPagamento`, `buscarConcentracaoReceita` e `buscarAnaliseCategorias` (Top Categorias) pra cada linha incluir o `href` calculado via helper da Fatia 1. `TopCategoriasDonut` (componente único por trás dos 3 usos — forma de pagamento e concentração em `indicadores/page.tsx`, categoria em `visao-geral/page.tsx`) ficou "burro": a função interna `agregarFatias` para de descartar o id/href; `onClick` no mesmo `<path>` que já recebe `onMouseMove` faz `router.push(fatia.href)`. Nenhuma mudança visual — cor, legenda, ângulo mínimo de fatia, tudo como estava.

_Teste:_ ao vivo no navegador (tenant Angelus Martiniano, dado real) — pessoa única (fransciso, R$150.000,00), forma de pagamento nomeada (Dinheiro, Pix), "Não informado" (R$80.680,50, 8 pagamentos), fatia "Outras" em forma de pagamento (Cartão+Cartão de Crédito, R$25.159,00) e em categoria (R$90.723,00, 33 lançamentos), link de linha por tipo RECEITA/DESPESA, botão de voltar preservando os filtros de regime/período/granularidade da Visão Geral. Todos batendo exato com o banco depois das correções abaixo.

---

## Correção pós-implementação

Achada testando a Fatia 4 ao vivo, não em brainstorming — dois ajustes no que já tinha sido desenhado:

1. **Pessoa não vai mais pro extrato dela.** A decisão original (Fatia 3) parecia certa na maquete, mas pousar na tela de **cadastro** (Nome/CPF/Perfis) não é "ver as situações da pessoa". Revertido: pessoa cai em `/lancamentos?pessoa_id=...` igual às outras 3 dimensões — `DestinoDrillDown`/`resolverDestinoDrillDown`/`hrefDoExtratoPessoa` saíram do `drill-down.ts`, sobrou só `montarHrefLancamentos` (síncrono, sem consulta ao banco nenhuma). A Fatia 3 (botão de voltar no extrato) foi revertida junto, por ficar sem uso.
2. **Rótulo da fatia "Outras" corrigido.** Pegava o nome do primeiro registro (`baixas[0].formas_pagamento?.nome`) em vez de reconhecer agregado — "Cartão" sozinho escondia que a lista misturava Cartão + Cartão de Crédito. Corrigido nas 3 funções de `lancamentos-filtrados.ts`: checar `valor.length > 1` antes de olhar qualquer nome.
3. **Período com ano ambíguo.** A janela de 12 meses da Concentração de Receita podia mostrar "26 de ago. – 26 de ago." (mesmo dia/mês, anos diferentes escondidos) — `formatarDataComAno` novo em `lib/formatacao.ts` pro chip de período de `/lancamentos`.

## Fatia 5 — 2ª leva: Centro de Custo, Orçado×Realizado, Análise de Despesas

**Concluída (26/08/2026).** `montarHrefLancamentos`/`FiltroLancamentos` ganharam `tipo` (RECEITA/DESPESA) opcional — Centro de Custo precisa disso porque Saldo é `entradas−saídas` (subtração, sem lista própria); só Entradas e Saídas, cada uma sozinha, têm link (`centro-custo-tabela.tsx`, uma célula-link cada, `hoverLinha={false}` em `TabelaLista` pra não sugerir linha inteira clicável). Orçado×Realizado: só "Realizado" (`orcado-realizado-barras.tsx`) é link — "Previsto" é meta cadastrada à mão, sem lançamento por trás. Análise de Despesas (curva ABC): zero mudança de backend, `href` já existia desde a Fatia 4 — só `linkPara` na tabela.

_Teste:_ 2 revisões de código independentes em paralelo (financeiro/segurança + regressão/UX) — nenhum bug financeiro/tenant/repetição dos padrões já catalogados. 2 achados de polimento corrigidos: rótulo "-" em entidade real com zero lançamentos (agora resolve o nome sempre), hover de linha inteira em tabela com clique só parcial (nova prop `hoverLinha`). Testado ao vivo depois: Entradas/Saídas batendo exato com a origem, período sem movimento mostrando o nome real, hover ausente em `centro-custo-tabela.tsx` e intacto no resto do sistema.

## Fora de escopo (herdado da spec)

Bucket "Sem centro de custo" (`hrefEntradas`/`hrefSaidas` cobrem só ids reais) e os demais gráficos de barra/pizza por entidade que ainda restarem ficam pra uma eventual 3ª leva, se surgir necessidade. Waterfall do DRE e gráficos de série temporal (linha/área por período) ficam de fora — não representam uma entidade única por ponto clicado, precisam de uma decisão própria não coberta na spec.
