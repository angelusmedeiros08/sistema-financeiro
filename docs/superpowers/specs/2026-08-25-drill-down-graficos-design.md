# Gráficos clicáveis: do resumo pro detalhe

## Contexto

Hoje os gráficos do sistema (pizza/rosca, barra) mostram só o número agregado — pra ver os lançamentos por trás de uma fatia, é preciso ir procurar manualmente em Despesas/Receitas ou no extrato de uma pessoa, sem nenhum filtro pronto esperando. O usuário quer que isso vire uma capacidade sistêmica, no espírito de uma ferramenta de BI de verdade: clicar em qualquer fatia/barra **nomeada** de qualquer gráfico do sistema leva direto pra informação específica daquilo que foi clicado — "clicar em Pix mostra os pagamentos em Pix", "clicar em João mostra as situações do João". Não é uma solução pontual pros 2 exemplos que originaram a conversa (Distribuição por Forma de Pagamento, Concentração de Receita) — é um padrão pra aplicar em todo gráfico por entidade do sistema, hoje e nos que vierem depois (inclusive a futura ferramenta de apresentação estilo Canva, fora de escopo aqui).

**Mapeamento do estado atual** (auditoria prévia, sem código escrito): o motor de gráfico é @visx — baixo nível, sem `onClick` pronto, mas os elementos já recebem `onMouseMove` pro tooltip, então cabear clique é trivial. 14 componentes de gráfico foram inventariados; só a página de extrato de pessoa (Clientes/Fornecedores) já existe como destino pronto — nenhuma tela sabe filtrar por categoria, forma de pagamento ou centro de custo via URL hoje. O precedente arquitetural mais próximo é o `StatCard` com prop `href` do Painel (card inteiro é um link fixo pra uma URL pré-calculada) — mas é card-nível, não item-nível (não existe hoje um gráfico com N fatias, cada uma linkando pra um lugar diferente).

## Decisões

- **Clique = navegação de página cheia**, não modal/drawer (consistente com o padrão já estabelecido no sistema de nunca usar Sheet/Dialog com fundo borrado). Sempre com um botão fixo de **"Voltar pro relatório"** no topo da tela de destino.
- **O gráfico em si não muda visualmente em nada** — mesma cor, mesma legenda, mesmo layout de hoje. A única adição é o comportamento de clique por trás.
- **O destino tem identidade própria por tipo de entidade clicada**, nunca uma lista genérica "filtrada" solta: clicar numa **pessoa** leva pro extrato dela que já existe (Clientes/Fornecedores — mais rico, com contato/endereço/histórico); clicar numa **categoria, forma de pagamento ou centro de custo** leva pra uma tela nova, com cabeçalho contextual ("Lançamentos em Pix", não "Lançamentos filtrados").
- **Fatias agregadas também são clicáveis**: "Outras" (quando o gráfico limita a top 5 e agrupa o resto) mostra a lista de tudo que ficou de fora do top N; "Não informado"/"Sem pessoa" (bucket sem id) mostra os lançamentos sem aquele dado preenchido — útil inclusive pra achar o que falta corrigir no cadastro.
- **Ordem de implementação**: 1ª leva cobre os 3 tipos de entidade centrais — Distribuição por Forma de Pagamento, Concentração de Receita (pessoa) e Top Categorias (receita/despesa), todos hoje renderizados por `TopCategoriasDonut`. Centro de Custo, Orçado×Realizado e os demais gráficos de barra/pizza por entidade ficam documentados como 2ª leva (mesmo contrato, não construídos nesta rodada) — waterfall do DRE e as séries temporais (linha/área por período) ficam de fora por ora, porque não representam uma entidade única por ponto.

## Arquitetura

**1. Contrato de destino calculado no servidor.** Cada linha que hoje sai de `buscarDistribuicaoFormaPagamento`, `buscarConcentracaoReceita` e `buscarAnaliseCategorias` (as 3 funções por trás da 1ª leva) ganha um campo novo — o destino do clique, já resolvido onde mora todo o contexto necessário (perfil da pessoa, tipo de entidade):

```ts
type DestinoDrillDown =
  | { tipo: "pessoa"; href: string }        // /clientes/[id] ou /fornecedores/[id], conforme o perfil
  | { tipo: "lancamentos"; href: string };  // /lancamentos?forma_pagamento_id=...&periodo_inicio=...&periodo_fim=...
```

Um helper central (`src/lib/relatorios/drill-down.ts`) monta esse `href` a partir de `{tenantId, tipoEntidade, entidadeId, periodoInicio, periodoFim}` — sempre usando o nome do parâmetro `<entidade>_id` (`categoria_id`, `forma_pagamento_id`, `centro_custo_id`), com duas convenções fixas pros casos especiais: **"Outras"** manda uma lista separada por vírgula no mesmo parâmetro (`?categoria_id=a,b,c` — a tela de `/lancamentos` sempre aceita um ou vários ids no mesmo campo); **"Não informado"/"Sem pessoa"** manda o literal `nenhuma` (`?forma_pagamento_id=nenhuma`, `?pessoa_id=nenhuma`), que a tela interpreta como filtro de campo nulo. Isso evita reimplementar a lógica de "como vira uma URL" em cada função de relatório.

**2. Componentes de gráfico ficam "burros".** `TopCategoriasDonut` para de descartar o id na função interna `agregarFatias` — cada fatia carrega seu `href` até o SVG. O `onClick` do `<path>` (mesmo elemento que já recebe `onMouseMove` pro tooltip) só faz `router.push(fatia.href)`. Nenhuma mudança visual: cor, legenda, ângulo mínimo de fatia, tudo como já está — só um handler novo.

**3. Tela nova `/lancamentos`.** Lista de lançamentos com filtro por categoria, forma de pagamento, centro de custo e período via query string, todos opcionais e combináveis. Reaproveita a mesma peça de tabela já usada em Despesas/Receitas (`TabelaEventos`/`TabelaLista`), sem o formulário de criação que essas páginas têm hoje — aqui é só visualização. Estrutura da tela, seguindo os tokens já estabelecidos no sistema (fonte Satoshi nos títulos via `--font-display`, Plus Jakarta Sans no corpo via `--font-body`, cartão branco com `--radius` de 0.875rem, mesmo `--primary` terracota #d8583a usado em todo o sistema):
   - Botão "← Voltar pro relatório" fixo no topo, mesmo padrão de pill já usado nos filtros de Contas a Pagar/Receber (`rounded-full px-3 py-1 text-xs font-medium`).
   - Cabeçalho: título contextual + total em R$ (precisa bater exatamente com o valor da fatia clicada — mesmo princípio já documentado no código de Contas a Pagar/Receber pros cards clicáveis: "quem clica precisa cair exatamente nos registros que compuseram aquele total, não numa aproximação").
   - Chips de filtro ativos (mesmo componente pill), mostrando o que está sendo filtrado e o período.
   - Tabela de lançamentos abaixo.
   - Maquete aprovada nesta sessão via companion visual — ver captura em `.superpowers/brainstorm/`.

**4. Extrato de pessoa ganha o mesmo botão de voltar** quando a navegação chega via drill-down (mesmo mecanismo de `?voltar=`), sem nenhuma outra mudança na página.

**5. Persistência do "voltar".** A URL de origem vai como parâmetro (`?voltar=/indicadores`) montado pelo próprio helper de drill-down — não depende do botão "voltar" do navegador, que se perde se o usuário atualizar a página de destino (F5).

## Testes

Verificar ao vivo no navegador, pros 3 gráficos da 1ª leva: clicar em cada fatia nomeada leva pro destino certo com o filtro certo aplicado; o total da lista bate com o valor da fatia clicada; clicar em "Outras" mostra exatamente o resto (nada a mais, nada a menos); clicar em "Não informado"/"Sem pessoa" mostra só os lançamentos sem aquele dado; o botão de voltar sempre retorna pro relatório de origem, inclusive depois de um F5 na tela de destino.

## Escopo

1ª rodada: os 3 gráficos da 1ª leva (Distribuição por Forma de Pagamento, Concentração de Receita, Top Categorias) + a tela nova `/lancamentos`. 2ª leva (Centro de Custo, Orçado×Realizado, Análise de Despesas/curva ABC) entregue depois, ver seção própria abaixo. Waterfall do DRE e gráficos de série temporal (linha/área por período) continuam fora de escopo: não representam uma entidade única por ponto clicado, precisariam de uma decisão própria (o que significa "clicar num mês"?) que não foi discutida aqui.

## Correção pós-implementação

**Não fazia parte do plano original** — achado ao vivo testando a Fatia 4 (não em brainstorming/mockup). A decisão original (item 3 de "Decisões": pessoa leva pro extrato dela, mais rico) parecia certa na maquete, mas na prática pousar na tela de **cadastro** (Nome/CPF/Perfis) não é "ver as situações da pessoa" — é editar o registro dela. Revertido: clicar numa pessoa agora cai em `/lancamentos?pessoa_id=...` igual às outras 3 dimensões, sem exceção — `DestinoDrillDown`/`resolverDestinoDrillDown`/`hrefDoExtratoPessoa` (a parte async que decidia cliente×fornecedor) foram removidos, sobrou só `montarHrefLancamentos` (síncrono, sem consulta ao banco). O botão de voltar no extrato de pessoa (item 4 da arquitetura) foi revertido junto — sem uso depois dessa mudança.

Achado um segundo problema testando a fatia "Outras" (2+ ids agregados): o rótulo pegava o nome do primeiro registro (`baixas[0].formas_pagamento?.nome`) em vez de reconhecer que era um agregado — "Cartão" sozinho representando Cartão + Cartão de Crédito juntos, escondendo que a lista misturava duas formas de pagamento diferentes. Corrigido nas 3 funções (`buscarPorFormaPagamento`/`buscarPorCategoria`/`buscarPorCentroCusto` em `lancamentos-filtrados.ts`): checar `valor.length > 1` **antes** de olhar qualquer nome, não como fallback.

### Segunda rodada — revisão de código independente

Pedido do usuário depois da Fatia 4 no ar: "revisa o que já está no ar antes de seguir". Um agente sem contexto prévio (sem viés de autor) revisou o diff inteiro e achou, verificando cada um contra o banco real:

- **Crítico, fora do escopo desta feature**: `vw_movimento_competencia_previsto` duplicava o valor de eventos parcelados (N parcelas = valor contado N vezes) — afetava DRE, Análise de Despesas, Concentração de Receita, Centro de Custo, Comparativos e Ponto de Equilíbrio, não só o drill-down. Corrigido via migration (`vw_movimento_previsto_corrige_duplicacao_parcela`, ver `docs/schema-aplicado-supabase.md` entrada 49) — ponderando cada linha por `p.valor / ef.valor_total`.
- **Regime ignorado**: trocar pra Realizado/Previsto no seletor de Relatórios e clicar numa fatia continuava filtrando por Competência. Corrigido reescrevendo `lancamentos-filtrados.ts` (categoria/centro de custo/pessoa) pra reaproveitar `buscarMovimento` — a mesma fonte dos gráficos de origem, em vez de uma query própria — carregando o `regime` na URL de ponta a ponta.
- **Parcela cancelada** aparecia em `/lancamentos` mas não na fatia de origem — resolvido pelo mesmo reaproveitamento de `buscarMovimento` (a view já exclui `CANCELADO`).
- **Fatia "Outras" com bucket "Não informado" fora do top 5**: o total exibido incluía esse bucket, mas o link descartava o id nulo — podia até virar link vazio (404). Bucket sem id agora sempre vira fatia própria, nunca entra no agregado "Outras".
- **Linha da tabela mostrava o valor cheio do evento**, mesmo quando só uma fração pertencia ao filtro (evento com rateio dividido, ou pago em mais de uma forma de pagamento). `LinhaLancamentoFiltrado` ganhou `valorFiltrado`.
- **Botão "Voltar" aceitava qualquer URL** no parâmetro `?voltar=`, inclusive externa (risco de phishing/open redirect). Agora só aceita caminho interno.

Tudo testado ao vivo depois das correções, sem regressão nos fluxos já validados na primeira rodada.

## 2ª leva

Entregue em 26/08/2026: Centro de Custo (`/relatorios/centro-custo`), Orçado×Realizado (`/orcamento?aba=comparativo`) e Análise de Despesas/curva ABC (`/relatorios/despesas`).

**Peça nova**: `montarHrefLancamentos` e `FiltroLancamentos` ganharam `tipo` (RECEITA/DESPESA) opcional — generaliza o que antes era um hardcode só pra pessoa (Concentração de Receita só soma RECEITA). Necessário porque **saldo de centro de custo é `entradas − saídas`, uma subtração sem lista de lançamentos correspondente** — só Entradas e Saídas, cada uma sozinha, têm um total real que bate com uma lista filtrada. Cada uma virou um link independente (`tipo: "RECEITA"` / `"DESPESA"`), não a linha inteira.

Mesma lógica se aplica a Orçado×Realizado: só a barra "Realizado" (soma de `buscarMovimento`) tem lançamentos reais atrás; "Previsto" é meta cadastrada à mão (tabela `orcamentos`), não existe lançamento nenhum pra mostrar — fica sem link, de propósito. Análise de Despesas (curva ABC) não precisou de nada novo — já usa `buscarAnaliseCategorias`, que ganhou `href` por linha desde a Fatia 4; só faltava ligar `linkPara` na tabela.

**Revisão de código** (2 agentes independentes em paralelo, focos diferentes — financeiro/segurança um, regressão/UX o outro): nenhum bug financeiro, de tenant ou repetição dos 5 padrões já catalogados acima. Dois achados de polimento, corrigidos no mesmo commit seguinte:
- Rótulo mostrava "Lançamentos em -" quando uma entidade real tinha zero lançamentos no filtro (ex.: Entradas de um centro que só teve despesa) — nome agora resolvido sempre, não só quando há resultado.
- `TabelaLista` aplicava o realce de "linha inteira clicável" mesmo em `CentroCustoTabela`, que só tem 2 de 5 colunas realmente clicáveis (Entradas/Saídas, via link próprio por célula, não `linkPara`) — affordance enganosa. Nova prop `hoverLinha` (default `true`, sem mudança em nenhuma tabela existente) desliga isso onde a linha não é uniformemente clicável.

Centro de Custo (bucket "Sem centro de custo") e os demais gráficos de barra/pizza por entidade que ainda restam ficam pra uma eventual 3ª leva, se surgir necessidade — o contrato já suporta.
