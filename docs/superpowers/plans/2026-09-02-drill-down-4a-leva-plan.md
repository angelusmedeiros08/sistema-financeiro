# Plano de implementação: Gráficos clicáveis — 4ª leva

**Spec:** [docs/superpowers/specs/2026-09-02-drill-down-4a-leva-design.md](../specs/2026-09-02-drill-down-4a-leva-design.md)
**Data:** 2026-09-02

Ordem por dependência: primeiro tudo que já tem `href`/dimensão pronta e só precisa ser ligado (zero risco, testável isolado, entrega valor imediato), depois a fundação de mecanismo pras 2 dimensões genuinamente novas (`linha_dre`, `atividade_dfc`) + o campo `conta_financeira`, só então os itens que dependem dela. Revisão de código no fim, cobrindo tudo.

## Fatia 1 — Quick wins: Visão Geral e Indicadores

Sem mecanismo novo — cada um já tem o dado calculado, só falta o `Link`/`href`.

- `IndicadorGauge` × 4 em `relatorios/visao-geral/page.tsx` (% Realizado CAR/CAP, % Pago em atraso CAR/CAP): calcular o `href` (`/contas-a-receber?...`/`/contas-a-pagar?...`, mesmo padrão já usado no Painel pros 4 gauges lá) e passar pro componente, que já aceita a prop.
- "Atraso médio por forma" em `indicadores/page.tsx`: já tem `href` calculado (`origemHref` de `buscarDistribuicaoFormaPagamento`) — envolver cada linha em `Link`.
- `ListaVariacaoCategorias` em `indicadores/page.tsx`: dimensão `categoria` já existe — calcular `href` via `montarHrefLancamentos` por categoria e linkar cada linha.

_Depende de:_ nada.
_Teste:_ ao vivo, cada um dos 3 pontos — clicar leva pro `/lancamentos` certo, total bate com o valor mostrado na origem.

## Fatia 2 — Quick wins: Centro de Custo, Comparativos, DFC (composição), Aging (participantes)

Sem mecanismo novo.

- Barras do topo em `relatorios/centro-custo/page.tsx`: mesmos `hrefEntradas`/`hrefSaidas` que `CentroCustoTabela` (logo abaixo) já usa.
- `ComparativosTabela`: mesmos `hrefsPorPonto` que `ComparativoLinhaAnotada` (gráfico acima, já clicável) já calcula — passar como `linkPara`.
- `ComposicaoFluxoCaixa` (DFC): `CategoriaFluxo` ganha `href?: string`; `agruparTopN` (em `lib/relatorios/dfc.ts`) para de descartar o `href` que `buscarAnaliseCategorias` já calcula por linha. O grupo "Outras receitas/despesas" fica sem link (não há lista de ids sobrevivendo até esse ponto da função — consistente com o resto do sistema, "Outras" só é clicável onde a lista de ids sobrevive).
- `AgingParticipantesTabela` × 2 (`relatorios/aging/page.tsx`, maiores devedores/credores): dimensão `pessoa` já existe — calcular `href` por linha (pessoa já tem id disponível na consulta) e linkar.

_Depende de:_ nada.
_Teste:_ ao vivo, cada um dos 4 pontos — mesmo critério da Fatia 1.

## Fatia 3 — Fundação: `conta_financeira`, `linha_dre`, `atividade_dfc`

**Mecanismo central** (`lib/relatorios/lancamentos-filtrados.ts`):
- `buscarPorMovimento` ganha `campo: "contaFinanceiraId"` (nome resolvido em `contas_financeiras`) — mesmo padrão de categoria/centro de custo/pessoa, `contaFinanceiraId` já vem em `MovimentoLinha`.
- `buscarPorMovimento` ganha um parâmetro opcional `rotuloFixo?: string` que, quando presente, substitui o `valor.length > 1 ? rotuloVarios : buscarRotulo(...)` de hoje — necessário pras 2 dimensões abaixo, cujo "grupo" é nomeado (linha de DRE, atividade), não um agregado genérico tipo "Outras".
- `FiltroLancamentos` ganha 2 variantes: `dimensao: "linha_dre"` (`valor: string`, id da linha) e `dimensao: "atividade_dfc"` (`valor: "OPERACIONAL" | "INVESTIMENTO" | "FINANCIAMENTO"`). Cada uma, dentro de `buscarLancamentosFiltrados`, resolve pra `{ ids: string[], nome: string }` — linha de DRE via `linha_dre_categorias` + nome da própria linha; atividade via o mesmo `categoriaParaAtividade` que `buscarDFCMatriz` (`lib/relatorios/dfc.ts`) já monta, invertido pra um Map atividade→ids, nome vindo de `ROTULO_ATIVIDADE` (tabela fixa no código, não da URL) — então delega pra `buscarPorMovimento({ campo: "categoriaId", valor: ids, rotuloFixo: nome, ... })`.

**Helper de URL** (`drill-down.ts`): `TipoEntidadeDrillDown` ganha `"linha_dre"` e `"atividade_dfc"`; `PARAM_POR_TIPO` ganha `linha_dre_id`/`atividade_dfc`. `montarHrefLancamentos` não muda de assinatura.

**Tela `/lancamentos`** (`app/(app)/lancamentos/page.tsx`): `DIMENSOES` ganha as 2 entradas novas + `conta_financeira_id` → `conta_financeira`. `atividade_dfc` **valida contra o enum literal antes de montar o filtro** (mesmo espírito de `rotuloSeguro` — nunca repassa texto da URL sem checar contra um conjunto fechado) — valor fora de `OPERACIONAL`/`INVESTIMENTO`/`FINANCIAMENTO` cai em `notFound()`, igual um id de dimensão inválido hoje.

_Depende de:_ nada (não depende das Fatias 1/2).
_Teste:_ chamada direta das novas resoluções com uma linha de DRE real (2+ categorias mapeadas) e uma atividade real, conferindo ids+nome; `?atividade_dfc=DROP TABLE` na URL direto no navegador → `notFound()`, sem erro 500.

## Fatia 4 — DRE: cascata e matriz mensal

- `WaterfallDre` (`components/relatorios/waterfall-dre.tsx`, usado em `relatorios/visao-geral` e `relatorios/dre` aba Cascata): cada barra ganha `href` via `linha_dre`.
- `DreMatrizTabela`: cada célula (linha × mês) ganha `href` via `linha_dre` + período do mês específico daquela célula (não o ano inteiro da página).

_Depende de:_ Fatia 3.
_Teste:_ ao vivo — clicar numa barra da cascata e numa célula da matriz, mesma linha de DRE, período coerente (ano inteiro na cascata, mês específico na matriz); total bate com o valor mostrado.

## Fatia 5 — DFC: matriz por atividade

- `DfcMatrizTabela`: só a coluna **Realizado** ganha `href` via `atividade_dfc` (mesmo princípio já usado em Orçado×Realizado — "Previsto" é vencimento futuro, sem baixa ainda, fica sem link).

_Depende de:_ Fatia 3.
_Teste:_ ao vivo — clicar numa célula Realizado de cada atividade (Operacional/Investimento/Financiamento), total bate; coluna Previsto continua sem link.

## Fatia 6 — Contas Bancárias

- Cards por conta em `relatorios/contas-bancarias/page.tsx`: `href` via `conta_financeira`.

_Depende de:_ Fatia 3.
_Teste:_ ao vivo — clicar num card de conta, total bate com o saldo/movimento mostrado no card.

## Fatia 7 — Revisão de código e verificação final

2 agentes de revisão independentes em paralelo (financeiro/segurança + regressão/UX), mesmo padrão das levas anteriores — atenção especial em: validação do enum `atividade_dfc` (nenhum caminho que repasse texto cru pra query), `rotuloFixo` não vazando pra dimensões que não deveriam usá-lo, total de cada item batendo exato contra o banco, nenhuma duplicação de lógica de soma entre as novas resoluções e `buscarPorMovimento`.

Depois das correções, reteste ao vivo de tudo (Fatias 1-6) numa passada só, sem regressão.

## Fora de escopo (herdado da spec)

Aging por faixa de atraso/vencimento (`AgingBarras`, `FaixasAVencer`), Saldo Projetado (metade "projetado"), e todo índice calculado sem lançamento único por trás (margens/EBITDA, Ponto de Equilíbrio, PMR/PMP, Liquidez, Ciclo de Conversão de Caixa, saldo total agregado de Contas Bancárias).
