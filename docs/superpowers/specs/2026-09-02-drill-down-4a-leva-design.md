# Gráficos clicáveis — 4ª leva (Indicadores, DRE, DFC, Aging, Contas Bancárias)

## Contexto

Levantamento completo (agente Explore, sem viés de autor) sobre tudo que ainda não é clicável em Relatórios e Indicadores, motivado por um pedido explícito do usuário: "vamos deixar o máximo de clicáveis nos módulos de indicadores, relatórios e tudo mais". O inventário separou os itens em 3 buckets por esforço/tipo — o usuário aprovou fazer **Buckets 1+2 numa leva só**. Bucket 3 (Aging por faixa, Saldo Projetado) e os itens genuinamente não-clicáveis (índices calculados sem lançamento único por trás: margens/EBITDA, Ponto de Equilíbrio, PMR/PMP, Liquidez, Ciclo de Conversão de Caixa) ficam de fora desta leva.

## Decisões

- **Nenhum componente de gráfico muda visualmente.** Mesmo padrão das levas anteriores — só comportamento de clique por trás.
- **O rótulo mostrado em "Lançamentos em X" nunca vem da URL como texto livre.** Mesma lição do bug de phishing já achado e corrigido no Painel (`rotuloSeguro`). Toda dimensão nova carrega só um **id** (ou uma chave de enum fixa, tipo `atividade_dfc=OPERACIONAL`) na URL — o servidor resolve o nome de verdade a partir do banco (linha de DRE, atividade) ou de uma tabela de rótulos fixa no código (atividade), nunca ecoando texto do cliente.
- **Reaproveitar a dimensão "categoria" existente sempre que possível**, em vez de inventar mecanismo novo — ela já aceita lista de ids (`?categoria_id=a,b,c`). Linha de DRE e atividade da DFC são, na prática, "um grupo nomeado de categorias" — resolvidos no servidor pra uma lista de `categoria_id`s e reaproveitando a mesma soma/filtro (`buscarPorMovimento`) que categoria avulsa já usa, só com o rótulo vindo de uma fonte própria (não do genérico "Outras categorias").
- **Conta bancária é campo direto, não veio de agregação.** `contaFinanceiraId` já existe em `MovimentoLinha` (`buscarMovimento`, regime.ts) — vira só mais um `campo` na função genérica `buscarPorMovimento`, do mesmo jeito que categoria/centro de custo/pessoa.

## Arquitetura

**1. Dois `campo` novos em `buscarPorMovimento`** (`lancamentos-filtrados.ts`): `contaFinanceiraId` (nome vem de `contas_financeiras`) e nenhum novo pra linha de DRE/atividade — essas duas resolvem pra uma **lista de categoria ids** antes de chegar em `buscarPorMovimento`, então usam o `campo: "categoriaId"` já existente. A diferença é *onde* a lista de ids e o rótulo são resolvidos:

```ts
// Novo, em drill-down.ts ou lib/relatorios/dfc.ts (reaproveitando o Map já existente ali)
async function categoriasDaLinhaDre(supabase, tenantId, linhaId): Promise<{ ids: string[]; nome: string }>
async function categoriasDaAtividade(supabase, tenantId, atividade: AtividadeDfc): Promise<string[]>
```

`FiltroLancamentos` (união discriminada) ganha 2 variantes novas: `dimensao: "linha_dre"` (`valor: string` = id da linha) e `dimensao: "atividade_dfc"` (`valor: "OPERACIONAL" | "INVESTIMENTO" | "FINANCIAMENTO"`, validado contra o enum antes de qualquer query — nunca passa direto pro banco). Cada uma resolve pra `{ ids, rotulo }` e delega pra `buscarPorMovimento` com `campo: "categoriaId"`, passando um `rotuloFixo` que sobrepõe o `valor.length > 1 ? rotuloVarios : ...` de hoje — a única mudança na função genérica é aceitar esse override opcional.

`montarHrefLancamentos` ganha `linha_dre` e `atividade_dfc` em `TipoEntidadeDrillDown`/`PARAM_POR_TIPO` (`linha_dre_id`, `atividade_dfc`) — nenhuma mudança de assinatura, só mais 2 entradas no mapa existente.

**2. `/lancamentos/page.tsx`**: 2 entradas novas em `DIMENSOES` (`linha_dre_id` → `linha_dre`, `atividade_dfc` → `atividade_dfc`) e 1 em `contaFinanceiraId` reaproveitando o mesmo padrão de `categoria_id`/`centro_custo_id`. `atividade_dfc` valida contra o enum literal (`OPERACIONAL`/`INVESTIMENTO`/`FINANCIAMENTO`) antes de montar o filtro — valor fora disso cai em `notFound()`, igual a um id de dimensão inválido hoje.

**3. Componentes/páginas, por item:**

*Bucket 1 (fio já existe, só falta ligar):*
- `IndicadorGauge` × 4 em `relatorios/visao-geral/page.tsx` — calcular e passar `href` (o componente já aceita a prop).
- "Atraso médio por forma" em `indicadores/page.tsx` — já tem `href` calculado (`origemHref` de `buscarDistribuicaoFormaPagamento`), só envolver em `Link`.
- Barras do topo de `relatorios/centro-custo/page.tsx` — os mesmos `hrefEntradas`/`hrefSaidas` que a tabela logo abaixo já usa.
- `ComparativosTabela` — os mesmos `hrefsPorPonto` que `ComparativoLinhaAnotada` (o gráfico acima) já usa, passados como `linkPara`.
- `ComposicaoFluxoCaixa` (DFC) — `CategoriaFluxo` ganha `href?: string`; `agruparTopN` para de descartar o `href` que `buscarAnaliseCategorias` já calcula. O grupo "Outras receitas/despesas" (resto agregado) não vira link — não há um id único nem lista pronta pra ele nesta função (`agruparTopN` só soma valores, descarta ids desde sempre); deixar sem link é consistente com o resto do sistema (bucket "Outras" só é clicável onde a lista de ids sobrevive até o fim, como no donut).

*Bucket 2 (dimensão nova/estendida):*
- `WaterfallDre` (usado em `relatorios/visao-geral` e `relatorios/dre` aba Cascata) — cada barra ganha `href` via `linha_dre`.
- `DreMatrizTabela` — cada célula (linha × mês) ganha `href` via `linha_dre` + período do mês específico (não o ano inteiro).
- `DfcMatrizTabela` — só a coluna **Realizado** (mesmo princípio já usado em Orçado×Realizado: "Previsto" é vencimento futuro, sem baixa ainda) ganha `href` via `atividade_dfc`.
- `AgingParticipantesTabela` × 2 (maiores devedores/credores) — `href` via `pessoa` (dimensão já existente, só faltava ligar nesta tabela específica).
- `ListaVariacaoCategorias` em `indicadores/page.tsx` — `href` via `categoria` (dimensão já existente).
- Cards por conta em `relatorios/contas-bancarias/page.tsx` — `href` via `conta_financeira` (novo `campo`).

## Testes

Ao vivo, pra cada um dos 11 itens: clicar leva pro `/lancamentos` certo, com o total batendo exatamente o valor mostrado na origem, regime/tipo/período preservados, botão "Voltar pro relatório" funcionando. Específico desta leva: testar `atividade_dfc` com um valor fora do enum direto na URL (`?atividade_dfc=DROP TABLE`) e confirmar `notFound()`, não erro 500 nem query maliciosa; testar linha de DRE com 2+ categorias mapeadas e confirmar que o rótulo é o nome da linha, não "Outras categorias" nem a primeira categoria isolada.

Revisão de código independente depois de tudo no ar (padrão já estabelecido nas levas anteriores) — mínimo 2 agentes, focos financeiro/segurança e regressão/UX.

## Escopo

Fora desta leva (Bucket 3 e não-clicáveis, ver levantamento anterior nesta conversa): Aging por faixa de atraso/vencimento (`AgingBarras`, `FaixasAVencer` — precisa de uma variante de filtro por intervalo de dias, não uma entidade), Saldo Projetado (metade "projetado" não tem lançamento real ainda), e todo índice calculado sem lançamento único por trás (margens/EBITDA do DRE, Ponto de Equilíbrio, PMR/PMP, Liquidez, Ciclo de Conversão de Caixa, saldo total agregado de Contas Bancárias).
