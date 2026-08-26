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

Nesta rodada: os 3 gráficos da 1ª leva (Distribuição por Forma de Pagamento, Concentração de Receita, Top Categorias) + a tela nova `/lancamentos` + o botão de voltar no extrato de pessoa. Centro de Custo, Orçado×Realizado e os demais gráficos por entidade ficam documentados pra uma 2ª leva, usando o mesmo contrato (`DestinoDrillDown` + helper central) — não são construídos agora. Waterfall do DRE e gráficos de série temporal (linha/área por período) ficam fora de escopo neste desenho: não representam uma entidade única por ponto clicado, precisariam de uma decisão própria (o que significa "clicar num mês"?) que não foi discutida aqui.
