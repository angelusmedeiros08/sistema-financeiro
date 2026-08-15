# Central de Indicadores — visão de produto (não implementar ainda)

> **Status: guardado no contexto.** Este documento não vira plano de implementação agora — é a visão validada de pra onde o sistema deve caminhar em indicadores/analytics, pra ser retomada quando o usuário decidir planejar. Nenhum código foi escrito a partir daqui.

## 1. Contexto

Pedido original do usuário: o sistema hoje é bom em "colocar dado e ele aparecer" (lançamento → relatório), mas não fecha ciclo — não conecta módulos pra responder perguntas de negócio de verdade ("quanto foi gasto em cada conta", "quais formas de pagamento mais recebidas"), não tem uma tela de gráficos dedicada, e não tem indicadores que sirvam tanto o contador quanto o dono do negócio.

Três pesquisas novas fundamentam esta visão (nenhuma duplica os mapeamentos de Conta Azul já existentes — `docs/mapeamento-conta-azul-modulos-*.md`, `docs/mapeamento-conta-azul-produto-ui.md`):

- **`docs/mapeamento-conta-azul-indicadores-analytics.md`** — o Conta Azul separa dois produtos: **Pro** (dono do negócio, tela "Visão geral" enxuta + ~50 relatórios tradicionais) e **Mais** (exclusivo de contadores parceiros, com 4 dashboards ricos: CAP/CAR com buckets de inadimplência e Top 10, Fluxo de Caixa com saldo D-1, Vendas/Contratos com MRR/churn, DRE com AV/AH). Achado central: **forma de pagamento não é indicador de primeira classe em nenhum dos dois**, e **não existe health score exposto ao usuário** — "saúde financeira" é só nome de categoria de relatório.
- **`docs/pesquisa-indicadores-financeiros-comparativo-mercado.md`** — comparativo Omie/Nibo/QuickBooks/Bling/Xero/Granatum. Dois gaps confirmados em **todo** o mercado pesquisado (não só Brasil): (1) PMR/PMP como dashboard nativo — só o Xero resolve isso de verdade; (2) **concentração de receita como alerta de risco — nenhum sistema pesquisado, de nenhum país, faz isso.** Todos que têm "Top clientes" mostram lista neutra, sem semáforo de risco. Achado de organização: todo concorrente estrutura por tipo de documento (DRE, fluxo de caixa); nenhum organiza por pergunta de negócio.
- **`docs/pesquisa-indicadores-contabeis-fundamentos.md`** — fundamentos e fórmulas de PMR/PMP (via parcela, não via saldo contábil — mais preciso com o dado que o sistema já tem), ciclo de conversão de caixa, concentração de receita, distribuição de forma de pagamento, inadimplência com aging, gasto por categoria com variação %.

## 2. Princípio norteador

**Indicador não é "mostrar mais um número" — é fechar um ciclo entre módulos que já existem.** Cada indicador desta visão é uma combinação nova de dado que já está no sistema (parcelas, categorias, pessoas, centro de custo, contas financeiras), não uma feature isolada. Nenhum indicador aqui exige um módulo de dado novo, **exceto um**: Forma de Pagamento precisa virar entidade real (hoje é texto livre no formulário de baixa) — é pré-requisito de um dos dois exemplos que o próprio usuário citou.

## 3. Decisões já validadas com o usuário

- **Sem separação de papéis** (diferente do Conta Azul Pro/Mais): um conjunto único de indicadores, visível pra qualquer usuário com acesso a relatórios — mais simples, e o sistema já resolve "quem vê o quê" via RLS por papel (Fase 2), não precisa de mais uma camada.
- **Organização híbrida**: a Visão Geral existente (`/relatorios/visao-geral`) ganha só 1-2 sinais de alerta mais urgentes (ex.: concentração de risco, projeção de caixa negativa) — continua sendo o resumo executivo rápido. Um módulo novo, **"Indicadores"**, guarda a profundidade — organizado por **pergunta de negócio**, não por tipo de relatório/gráfico. É o gap de UX que a pesquisa de mercado confirma que ninguém preenche.

## 4. Catálogo de indicadores, por pergunta de negócio

Cada grupo é uma seção dentro do módulo "Indicadores". Fonte de dado já existente no sistema entre parênteses.

**"Estou ficando sem caixa?"**
- Saldo projetado (D+7/D+30/D+60) com alerta quando fica negativo — combina saldo atual (`contas_contabeis` Caixa e Bancos) + parcelas a receber/pagar previstas (`vw_movimento_competencia_previsto`). É o único indicador desta visão que exige lógica nova de projeção, não só agregação do que já existe.

**"Quem não está pagando?"**
- Inadimplência com aging 30/60/90 (`aging.ts` já calcula os buckets — falta expor como indicador, não só tabela)
- PMR por cliente — `média ponderada (data_pagamento − data_vencimento)` das parcelas de receita (mesmo dado de `buscarResumoVencimentos`/`buscarAgingPorParticipante`)

**"Pra quem eu devo, e quando?"**
- PMP — espelho do PMR, pro lado de despesa
- Top fornecedores por saldo em aberto (já existe parcialmente em `buscarAgingPorParticipante`)

**"Onde meu dinheiro está indo?"**
- Gasto por categoria com variação % mês a mês (não só total — `analise-despesas.ts` já tem a curva ABC do total, falta a série temporal com variação)
- Mesmo indicador espelhado pro lado de receita (por categoria de receita)

**"Meu risco está concentrado em poucos clientes?"** — *o diferencial de mercado real*
- % da receita vinda dos Top 3/5 clientes, com semáforo (ex.: >50% = risco alto) — nenhum concorrente pesquisado faz isso. Dado já existe (`eventos_financeiros` + `pessoas`), só falta a leitura agregada com limiar de alerta.

**"Como meus clientes/fornecedores pagam?"**
- Distribuição de forma de pagamento (Pix/boleto/cartão/dinheiro) em R$ e %, com tendência mês a mês
- Cruzamento forma de pagamento × atraso (ex.: "boletos atrasam 3x mais que Pix") — o segundo exemplo citado pelo usuário
- **Depende da Seção 5** (forma de pagamento precisa ser entidade, não texto livre)

**"Minha empresa está saudável?"**
- Ciclo de conversão de caixa aproximado (PMR − PMP)
- Liquidez aproximada (caixa + recebíveis de curto prazo ÷ pagáveis de curto prazo) — versão simplificada registrada na pesquisa, já que o sistema não modela balanço patrimonial completo

## 5. Pré-requisito de dado: Forma de Pagamento como entidade

Hoje `metodo_pagamento` é um campo de texto livre no formulário de baixa (`formulario-baixa.tsx`). Pra virar indicador confiável (não string solta sujeita a "PIX"/"Pix"/"pix" como valores diferentes), precisa virar um cadastro real — mesmo padrão já usado pra Centro de Custo e Categoria: tabela própria, RLS por tenant, combobox com criação rápida inline no formulário de baixa. Pequeno o suficiente pra ser a primeira peça a construir quando esta visão for retomada, porque desbloqueia um dos dois indicadores citados literalmente pelo usuário.

## 6. Ordem sugerida (não compromissada — só uma leitura de esforço × valor)

1. **Forma de pagamento como entidade** (pré-requisito, esforço baixo, mesmo padrão de Centro de Custo)
2. **Concentração de receita** + **Gasto por categoria com variação** — maior valor por esforço: dado 100% existente, só agregação nova, e concentração é o diferencial de mercado real
3. **PMR/PMP + inadimplência com aging como indicador** (não só tabela) — dado já existe em `aging.ts`, é reagrupar
4. **Distribuição de forma de pagamento + cruzamento com atraso** — depende do item 1
5. **Saldo projetado com alerta de ruptura** — o único que exige lógica nova de projeção, deixado por último de propósito

## 7. Decisões adiadas de propósito

- Layout exato de cada card/gráfico dentro do módulo Indicadores (fica pra quando for desenhar de verdade)
- Se o alerta de concentração de risco e o de projeção de caixa negativa geram notificação proativa (e-mail, badge) ou ficam só na tela — não decidido
- Limiares exatos dos semáforos (ex.: "concentração alta" = quanto %?) — precisa validar com o usuário quando for implementar
- Se "Indicadores" fica na sidebar como item top-level (como Fluxo de Caixa/Orçamento) ou como sub-item de Relatórios — decisão de IA de navegação pra quando o módulo for desenhado
