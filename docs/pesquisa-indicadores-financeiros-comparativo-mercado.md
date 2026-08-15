# Pesquisa Comparativa — Indicadores, Dashboards e Analytics Financeiros nos Concorrentes

> Data da pesquisa: 15/08/2026. Objetivo: complementar a pesquisa de mercado geral (`pesquisa-mercado-concorrentes-erp-financeiro-pme.md`) com um recorte específico sobre **indicadores/gráficos/analytics financeiros** — não "que telas existem", mas que insight cada indicador entrega, pra quem (dono do negócio vs. contador/BPO), com que frequência, e como ele se conecta com o resto do sistema. Serve de base para evoluir o Painel, a Visão Geral de Relatórios e os gauges/donuts que o sistema já tem.

---

## 1. Omie

**Painel nativo (dentro do próprio ERP, sem add-on):** o painel financeiro do Omie mostra cards e gráficos de faturamento bruto, despesas operacionais, recebimentos, inadimplência e previsão financeira, com filtros por cliente, categoria e período. A **previsão financeira** projeta valores a pagar/receber para os próximos **15 e 45 dias**, permitindo antecipar necessidade de caixa — mesmo padrão de horizonte curto que aparece também no Conta Azul (ver seção 2). Para quem: dono do negócio/financeiro da empresa. Frequência: tempo real (dados nativos do ERP).

**Ranking de Clientes por Faturamento:** relatório de "Contas a Pagar e a Receber — Por Cliente/Fornecedor" que mostra quais clientes compram com mais frequência e quais geram mais faturamento. Pode ser customizado com campos calculados (ex.: segmentar clientes em faixas "VIP" ≥ R$1.000, "Relevante" R$500–999, "Ocasional" ≤ R$500, via fórmula condicional criada pelo usuário). **Importante: não é um indicador nativo de concentração de receita nem gera alerta de risco automaticamente** — a Omie deixa explícito que "as informações apresentadas dependerão totalmente de como você gerencia, administra e registra os dados", ou seja, é um relatório de listagem/ranking, não um KPI calculado com semáforo de risco. Não confirmado: existência de indicador nativo "top N clientes = X% da receita" com alerta.

**Forma de pagamento mais usada:** não encontrada evidência de um indicador nativo desse tipo no financeiro puro da Omie (existe algo equivalente no Conta Azul Mais — ver seção 2). Não confirmado para Omie.

**Painel do Contador (analytics, não documentos):** a pesquisa anterior já mapeou o Painel do Contador como hub de lançamentos contábeis automáticos e arquivos; nesta pesquisa focada em indicadores, o achado adicional é o **APP BI** (app pago da Omie Store, não nativo do ERP core) — "Dashboards e Indicadores de Desempenho integrados ao Omie", com Simulador de Resultado (Orçado × Realizado, permitindo ajustar manualmente Receita/Custo/Despesa e comparar), voltado a contadores/consultores/BPOs financeiros, com centralização de dados de uma ou várias empresas. Ou seja: **o analytics mais robusto pra contador na Omie não é nativo — é um app de terceiro/parceiro vendido na loja de apps**, assim como o BI da Treasy também aparece integrado à Omie. Isso é um padrão que se repete: o ERP entrega o dado transacional, mas o analytics "de verdade" (BI customizável) é terceirizado para parceiros do ecossistema (Treasy, DashFinanceiro, Senseboard, Controladoria Digital) em vez de nativo.

**Fontes:**
- https://ajuda.omie.com.br/pt-BR/articles/13639245-gerando-um-relatorio-de-ranking-de-clientes-por-faturamentos
- https://kondado.com.br/blog/blog/2025/05/22/como-criar-um-relatorio-do-omie-dicas-e-metricas-que-nao-podem-faltar/
- https://store.omie.com.br/apps/app-bi
- https://store.omie.com.br/apps/app-bi-parceiros
- https://www.treasy.com.br/omie/
- https://dash-financeiro.com/

---

## 2. Nibo

**Painel de Acompanhamento (dashboard principal):** organiza o resultado em 5 categorias (Receitas e custos operacionais, Despesas operacionais, Atividades de investimento, Atividades de financiamento — estrutura equivalente a um DFC por atividade, o que o nosso sistema já tem). Pode ser visto por Realizado / Realizado × Agendado / Realizado × Orçado, filtrado por um ou múltiplos centros de custo, e por regime de caixa ou competência. Para quem: dono do negócio e gestores. Frequência: tempo real, recalculado por período selecionado.

**Balanço Resumido:** evolução **mensal** de caixa, contas a receber, contas vencidas a receber, contas a pagar e contas vencidas — é essencialmente um resumo de aging mês a mês em formato de card, não gráfico de tendência.

**Indicadores-Chave:** seção de métricas **customizáveis pelo próprio usuário** (o usuário define quais indicadores quer acompanhar) — mecanismo parecido com o "custom chart builder" do QuickBooks Performance Center (seção 3), mas mais simples.

**Gráficos "Receita Operacional" e "Resultado Operacional":** visualização mês a mês, e o gráfico de Resultado Operacional é **clicável** — ao clicar em um mês, o usuário é levado para os relatórios de contas a pagar/receber daquele período. Esse é o padrão de "drill-down" mais explícito encontrado nesta pesquisa: gráfico → clique → extrato detalhado do período.

**Relatórios de Contas a Pagar/Pagas/Receber/Recebidas:** listagens detalhadas com filtro por período de vencimento, categoria, centro de custo, com colunas customizáveis, exportação para Excel e impressão em PDF. Voltados tanto ao dono do negócio quanto ao contador que atende aquela empresa.

**Lado BPO/Contador (Nibo BPO):** o "Painel de Controle Centralizado" do BPO mostra **gráficos-resumo de toda a carteira de clientes** (não achamos detalhamento oficial linha a linha de quais métricas agregadas aparecem — fontes secundárias mencionam "gráficos-resumo da carteira" e "segmentação de clientes" como diferenciais, mas sem lista granular confirmada pela documentação oficial). Não confirmado: se existe um indicador nativo tipo "X% dos clientes com pendência" ou "ranking de clientes por atraso" no painel do BPO. O que está confirmado (pesquisa anterior) é o lado de **fluxo de documentos** (Caixa de Entrada Integrada com IA), que é operacional, não analytics.

**Fontes:**
- https://ajuda.nibo.com.br/pt-BR/articles/7026282-quais-sao-os-relatorios-do-nibo-gestao-financeira
- https://www.nibo.com.br/nibo-bpo
- https://www.nibo.com.br/empresa/gestao-financeira/bpo
- https://www.treasy.com.br/nibo/

---

## 3. QuickBooks Online (referência internacional — o mais maduro em analytics)

QBO é sensivelmente mais avançado que os concorrentes brasileiros pesquisados na camada de "insights", com três produtos distintos que valem estudar separadamente:

**3.1. Snapshot / Company Snapshot (aba "Snapshot"):** painel atualizado em tempo real com todas as informações da empresa, incluindo tendência de receita (gráfico de linha), gráfico de despesas, saldos de contas, **breakdown de origem de receita**, pagamentos a fornecedores, itens de despesa por linha, **top customers e top vendors** (ranking), lembretes de contabilidade, e comparação de receita/despesa com o ano anterior. Tem visões alternáveis: "My Income" (gráficos de receita), "My Expenses" (gráficos de despesa), "Previous Year Comparison" (com capacidade de forecasting), "Accounts Receivable" (quem deve pra você) e "Accounts Payable" (pagamentos a fornecedores). Para quem: dono do negócio, é a tela "estado da empresa em 1 minuto". Disponível apenas em QuickBooks Online Plus e Advanced.

**3.2. Cash Flow Planner:** projeta entradas e saídas dos próximos **30 a 90 dias**, usando dados históricos de bancos conectados (transações categorizadas e não categorizadas) e permite ao usuário adicionar manualmente eventos futuros esperados (ex.: uma venda grande prevista, uma despesa pontual) para simular o impacto no caixa projetado. Isso é mais avançado que a "previsão de 15/45 dias" simples do Omie/Conta Azul porque combina histórico + eventos manuais simulados, não só extrapolação de contas já lançadas. Foi relançado com um motor de machine learning mais recente.

**3.3. Performance Center (QuickBooks Online Advanced / Accountant):** o mais próximo de uma tela dedicada de "analytics/insights" separada dos relatórios formais, organizada como **dashboard customizável por métrica** (não por pergunta de negócio pré-definida). O contador ou dono monta os próprios KPIs com um "custom chart builder", combinando plano de contas ativo, KPIs pré-definidos e dados externos (de apps de CRM conectados). Métricas nativas oferecidas: Accounts Payable, Accounts Receivable, Cost-of-Goods Sold, Gross Profit, Net Profit, Revenue Stream, Cash Flow, **Current Ratio e Quick Ratio** (índices de liquidez — nenhum concorrente brasileiro pesquisado mostra isso nativamente). Para quem: principalmente contadores que atendem múltiplos clientes via QuickBooks Online Accountant, mas também disponível para o dono via Advanced.

**3.4. DSO / "Average Days to Pay" — o gap mais revelador:** apesar de toda a maturidade acima, **o QuickBooks Online não tem um relatório nativo de "quanto tempo em média os clientes levam para pagar" (DSO)**. Esse relatório ("Average Days to Pay") existe no QuickBooks **Desktop**, mas discussões da comunidade oficial confirmam que a versão Online não tem equivalente direto — o usuário precisa calcular manualmente a partir do relatório de A/R Aging Summary/Detail. Ou seja: mesmo o concorrente internacional mais maduro em analytics **não fechou esse indicador de forma nativa e automática na versão SaaS**.

**Fontes:**
- https://quickbooks.intuit.com/learn-support/en-us/help-article/small-business-processes/get-snapshot-business-finances-quickbooks-online/L2XmgoQFf_US_en_US
- https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-users/customize-snapshot-tab/L7HIZybrV_US_en_US
- https://quickbooks.intuit.com/learn-support/en-us/help-article/budget-forecast-reports/use-cash-flow-planner-quickbooks-online/L2l59mIqe_US_en_US
- https://insightfulaccountant.com/accounting-tech/general-ledger/quickbooks-performance-center/
- https://paygration.com/using-the-performance-center-in-quickbooks-online-advanced/
- https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/filter-average-days-to-pay-report/00/236314
- https://quickbooks.intuit.com/learn-support/en-us/account-management/i-have-been-looking-for-a-way-to-report-track-average-days-to/00/976669

---

## 4. Bling

O financeiro do Bling é claramente secundário ao módulo fiscal/estoque/vendas multicanal (confirmado na pesquisa anterior). Nesta pesquisa focada em indicadores, o achado adicional: o Bling oferece "dashboards estratégicos" descritos genericamente como painel interativo com "gráficos, números e indicadores sempre atualizados", filtráveis por período/cliente/produto/canal de venda, mas **a documentação oficial acessível não detalha uma lista fechada de indicadores financeiros específicos** (ao contrário de Omie/Nibo/QuickBooks, cuja documentação nomeia os relatórios individualmente). Os relatórios financeiros nomeados que aparecem são os "de prateleira": DRE, fluxo de caixa (projeção baseada em contas a pagar/receber), balancete, controle de caixa, contas a pagar, contas a receber, e resumos de entradas/saídas por categoria ou cliente. Não confirmado: existência de indicadores nativos de concentração de receita, DSO/DPO ou ranking de clientes por representatividade financeira — o padrão do Bling é analytics **de vendas/estoque** (giro, ticket médio, canal mais rentável), não analytics financeiro-gerencial profundo. Integração oficial com Google Data Studio/Looker Studio e Power BI para quem precisa de BI mais robusto — mesmo padrão "terceiriza o analytics avançado" visto na Omie.

**Fontes:**
- https://ajuda.bling.com.br/hc/pt-br/articles/10448301650455 (acesso bloqueado por 403 no fetch automatizado; conteúdo indireto via busca)
- https://blog.bling.com.br/relatorio-financeiro/
- https://polivision.com.br/relatorios-e-indicadores-do-bling/
- https://polivision.com.br/gestao-financeira-e-relatorios-inteligentes-no-bling-erp/

---

## 5. Conta Azul

Duas camadas distintas de indicadores, para dois públicos diferentes:

**5.1. Conta Azul "core" (dono do negócio, app + web):** a tela inicial do app **Conta Azul de Bolso** mostra: fluxo de caixa diário (gráfico de entradas/saídas por dia no mês vigente, clicável para abrir o relatório completo), lançamentos vencidos em aberto (separados entre Recebimentos e Pagamentos), negociações/vendas do mês por status (Vendas, Orçamentos, Aceitos, Recusados), e um gráfico de **desempenho de vendas dos últimos 12 meses** com lista mês a mês clicável (toque em um mês → resumo de vendas/orçamentos daquele período). Também confirmado: relatório de **fluxo de caixa projetado** para os próximos **15 e 45 dias**, calculado automaticamente a partir de histórico de vendas/despesas/notas fiscais e atualizado em tempo real via integração bancária — mesmo padrão de horizonte de 15/45 dias visto na Omie.

**5.2. Conta Azul Mais (lado BPO/contador — parceiro monitorando carteira de clientes):** quatro dashboards dedicados, com granularidade por cliente individual ou por grupo de clientes: Dashboard de Fluxo de Caixa, Dashboard de Contas a Pagar/Receber, Dashboard de DRE (comparação por período, centro de custo ou cliente), e **Dashboard de Vendas e Contratos** — este último é o mais rico encontrado em toda a pesquisa em termos de indicadores comerciais: ticket médio, valor vendido, clientes ativos, **TOP 10 clientes e produtos/serviços**, distribuição geográfica (mapa + tabela por município), **forma de pagamento** (Pix/boleto/cartão/transferência) e condição de pagamento (à vista vs. parcelado), além de indicadores de receita recorrente — **MRR, ARR, churn de receita**, contratos ativos/cancelados/a vencer/novos. Ou seja: a "forma de pagamento mais usada" e "top clientes" que a Omie não confirma nativamente **existem no Conta Azul, mas só no produto voltado ao parceiro/BPO (Conta Azul Mais), não no Conta Azul core do dono do negócio**. Exportação em PDF, sem personalização de visualização (dashboards fixos, não customizáveis pelo usuário).

**Fontes:**
- https://ajuda.contaazul.com/hc/pt-br/articles/9883828247309
- https://ajuda.contaazul.com/hc/pt-br/articles/8603429895309
- https://ajuda.contaazul.com/hc/pt-br/articles/36995310423565
- https://ajuda.contaazul.com/hc/pt-br/articles/44911372536717
- https://ajuda.contaazul.com/hc/pt-br/articles/44911365163149
- https://contaazul.com/blog/fluxo-de-caixa-projetado/

---

## 6. Xero (referência internacional adicional)

Xero tem uma suíte chamada **Xero Analytics**, disponível em todos os planos (o "core" não fica atrás de add-on pago), com três blocos:

- **Business Snapshot:** dashboard **retrospectivo** (olha pra trás, não projeta) mostrando receita, despesas, lucro bruto, posição de balanço, saldo de caixa atual, e — o achado mais relevante desta seção — **debtor days** (tempo médio para receber, equivalente a DSO) e **creditor days** (tempo médio para pagar fornecedores, equivalente a DPO) **como métricas nativas de dashboard, não como relatório que o usuário precisa gerar/calcular manualmente**. É o único sistema pesquisado (nacional ou internacional) com DSO/DPO expostos como indicador de dashboard de primeira classe.
- **Short-term Cash Flow:** projeção de caixa para os próximos 7, 30, 60 ou 90 dias, baseada em faturas e contas a pagar já lançadas mais recorrências previstas (com add-on Analytics Plus estendendo o horizonte).
- **P&L trends e benchmarking de performance:** comparação de tendência de resultado ao longo do tempo.

**Fontes:**
- https://www.xero.com/us/accounting-software/analytics/
- https://www.xero.com/us/accounting-software/analytics/snapshot/
- https://www.xero.com/us/accounting-software/analytics/cash-flow/
- https://albertgoodman.co.uk/insights/seeing-the-future-with-xero-analytics

---

## 7. Granatum

O site institucional e o blog do Granatum listam PMR (prazo médio de recebimento), PMP (prazo médio de pagamento), EBITDA, ponto de equilíbrio, giro do ativo, índice de endividamento e liquidez corrente como **"indicadores que se pode acompanhar"**, mas esse conteúdo aparece majoritariamente em contexto de blog educacional e de integração com BI de terceiro (Treasy), não como confirmação de que esses indicadores existem **nativamente calculados e exibidos em tela** dentro do produto Granatum core. O que está confirmado como nativo (fonte oficial de produto) é: gráfico de linha de Receitas vs. Despesas, fluxo de caixa, contas a pagar/receber, filtro por caixa ou competência, em gráfico ou lista, com exportação. **Não confirmado**: PMR/PMP, EBITDA e ponto de equilíbrio como telas nativas calculadas automaticamente (parecem depender de o próprio Treasy BI, contratado à parte, montar esses indicadores a partir dos dados do Granatum).

**Fontes:**
- https://www.granatum.com.br/financeiro/funcionalidades/relatorio-receitas-vs-despesas
- https://www.granatum.com.br/blog/planejamento-financeiro-empresarial-indicadores
- https://www.treasy.com.br/granatum/

---

## 8. ContaCerta

A pesquisa não conseguiu identificar um ERP/sistema financeiro brasileiro chamado especificamente "ContaCerta" com presença de mercado comparável a Omie/Nibo/Bling/Conta Azul. Os resultados de busca retornam múltiplos escritórios de contabilidade regionais homônimos (Ceará, Distrito Federal, Roraima, Minas Gerais) e uma ferramenta de IA para faturamento em Portugal (contacerta.cc), nenhum dos quais corresponde claramente a um "sistema" na categoria pesquisada (Omie/Nibo/Bling/QuickBooks/Conta Azul/Granatum). **Não confirmado / não identificado**: não foi possível localizar indicadores ou dashboards financeiros de um produto "ContaCerta" com fonte confiável. Recomenda-se ao usuário confirmar se há um nome de produto mais específico ou uma URL oficial antes de investir mais tempo de pesquisa nesse item.

---

## 9. Achado lateral: PMR/PMP como módulo de BI dedicado (Bluesoft)

Fora da lista original, a pesquisa sobre DSO/DPO encontrou que a **Bluesoft** (ERP de varejo/atacado, não focado em PME de serviços) lançou um **"Dashboard de Prazo Médio de Pagamentos e Recebimentos"** dentro do seu módulo de BI — confirmando que existe demanda de mercado suficiente para esse indicador virar uma tela dedicada em pelo menos um ERP brasileiro, mas fora do escopo direto dos concorrentes desta pesquisa (Omie/Nibo/Bling/Conta Azul/Granatum) e fora do core financeiro puro. Serve como evidência de mercado, não como benchmark direto.

**Fonte:** https://blog.bluesoft.com.br/novo-relatorio-de-prazo-medio-de-recebimentopagamento-pmrpmp/

---

## 10. Pergunta cruzada 1 — Telas dedicadas de "analytics/insights" separadas dos relatórios formais

Cruzando todos os sistemas pesquisados, aparecem três padrões distintos de como uma tela de analytics se organiza:

**a) Por categoria de gráfico (o mais comum nos brasileiros):** o "dashboard" é uma coleção fixa de gráficos pré-definidos pelo fornecedor (fluxo de caixa, DRE, vendas, contas a pagar/receber), sem o usuário poder escolher o que ver — é o padrão de Omie (painel nativo), Nibo (Painel de Acompanhamento), Bling (dashboards estratégicos) e Conta Azul (tanto o core quanto o Conta Azul Mais). O usuário navega **entre painéis fixos**, não monta o próprio.

**b) Por pergunta de negócio, customizável pelo usuário:** só encontrado no QuickBooks Online Advanced (Performance Center) — o usuário/contador escolhe quais KPIs, de quais fontes (plano de contas, apps conectados), quer ver juntos num único dashboard, com fórmulas próprias. O Nibo tem uma versão simplificada disso na seção "Indicadores-Chave" (métricas customizáveis, mas sem o nível de "chart builder" com fórmula).

**c) Terceirizado a um parceiro de BI (padrão dominante nos brasileiros para analytics avançado):** Omie, Nibo, Bling e Granatum têm todos integração oficial ou parceria com ferramentas de BI externas (Treasy é o mais recorrente — aparece nos 4 —, além de DashFinanceiro, Senseboard, Controladoria Digital, Power BI/Looker Studio/Google Data Studio para exportação de dados brutos). Isso sinaliza que **nenhum ERP financeiro brasileiro pesquisado considera o analytics avançado parte do produto core** — é upsell de ecossistema, não uma capability nativa que o cliente já paga no plano.

Nenhum sistema pesquisado organiza a tela de analytics **por pergunta de negócio pré-formulada** no estilo "Como está minha saúde financeira?" / "Quem são meus clientes de risco?" / "Onde estou perdendo dinheiro?" — todos organizam por tipo de documento/relatório contábil (DRE, fluxo de caixa, contas a pagar) ou por tipo de gráfico. Esse é um espaço de design ainda não ocupado por nenhum concorrente brasileiro pesquisado.

## 11. Pergunta cruzada 2 — DSO, DPO e concentração de receita

| Indicador | Confirmado nativamente? | Onde |
|---|---|---|
| DSO / Prazo médio de recebimento como dashboard nativo | **Sim, só no Xero** (debtor days) | Business Snapshot, todos os planos |
| DPO / Prazo médio de pagamento como dashboard nativo | **Sim, só no Xero** (creditor days) | Business Snapshot, todos os planos |
| DSO/DPO como relatório nativo (não dashboard, mas ainda calculado automaticamente) | Não confirmado no QuickBooks Online (existe só no Desktop); não confirmado em nenhum sistema brasileiro pesquisado | — |
| DSO/DPO via BI de terceiro/parceiro | Sim, indiretamente | Treasy (Omie/Nibo/Granatum), Bluesoft (fora da lista) |
| Concentração de receita por cliente com alerta de risco (ex.: "80% da receita vem de 3 clientes") | **Não confirmado em nenhum sistema pesquisado**, brasileiro ou internacional | — |
| Ranking/Top N clientes por faturamento (sem alerta de risco, é só listagem) | Sim — Omie (Ranking de Clientes), QuickBooks (Top Customers no Snapshot), Conta Azul Mais (TOP 10 clientes, só no BPO) | — |

O achado mais forte desta seção: **nenhum dos 8 sistemas pesquisados (5 brasileiros + QuickBooks + Xero + Bluesoft citado lateralmente) transforma "concentração de receita" em um indicador de risco com alerta automático**. Todos que mostram "top clientes" fazem isso como ranking neutro (quem compra mais), não como sinalização de dependência/risco de churn. A literatura de mercado (blogs de CFO, KRI/HHI) trata esse índice como prática de gestão de risco corporativo — mas nenhum produto SaaS de gestão financeira PME pesquisado o expõe pronto na tela.

Além disso, DSO/DPO nativo como **dashboard de primeira classe** (não escondido em fórmula manual ou relatório que precisa ser montado) só foi confirmado no Xero — nem QuickBooks Online, o mais maduro dos pesquisados em analytics geral, entrega isso de forma pronta.

---

## 12. Tabela comparativa — indicadores-chave presentes

| Indicador / Capability | Omie | Nibo | Bling | Conta Azul (core) | Conta Azul Mais (BPO) | QuickBooks Online | Xero | Granatum |
|---|---|---|---|---|---|---|---|---|
| Fluxo de caixa projetado (15–90 dias) | Sim (15/45 dias) | Não confirmado nesse formato específico | Não confirmado | Sim (15/45 dias) | Sim (herda do core) | Sim (Cash Flow Planner, 30–90 dias, + eventos manuais) | Sim (7/30/60/90 dias) | Não confirmado |
| Dashboard fixo pré-definido (DRE/fluxo/contas) | Sim | Sim (Painel de Acompanhamento) | Sim (descrição genérica) | Sim | Sim (4 dashboards) | Sim (Snapshot) | Sim (Business Snapshot) | Sim |
| Indicadores customizáveis pelo usuário (chart builder) | Não confirmado nativo (via APP BI pago) | Parcial (Indicadores-Chave) | Não confirmado | Não (dashboards fixos) | Não (dashboards fixos) | Sim (Performance Center, Advanced) | Não confirmado | Não confirmado |
| Ranking/Top N clientes por faturamento | Sim | Não confirmado | Não confirmado | Não confirmado no core | Sim (TOP 10) | Sim (Top Customers) | Não confirmado | Não confirmado |
| Forma de pagamento mais usada | Não confirmado | Não confirmado | Não confirmado | Não confirmado no core | Sim | Não confirmado | Não confirmado | Não confirmado |
| MRR/ARR/Churn (receita recorrente) | Não confirmado | Não confirmado | Não confirmado | Não confirmado no core | Sim | Não confirmado (fora do escopo padrão) | Não confirmado | Não confirmado |
| Drill-down gráfico → extrato (clicar no gráfico abre o detalhe) | Não confirmado | Sim (Resultado Operacional → contas) | Não confirmado | Sim (fluxo de caixa diário, desempenho de vendas) | Não confirmado | Sim (Snapshot views clicáveis) | Não confirmado | Não confirmado |
| DSO nativo como dashboard | Não | Não | Não | Não | Não | Não (só Desktop) | **Sim** | Não |
| DPO nativo como dashboard | Não | Não | Não | Não | Não | Não (só Desktop) | **Sim** | Não |
| Concentração de receita com alerta de risco | Não | Não | Não | Não | Não | Não | Não | Não |
| Índices de liquidez (current ratio/quick ratio) nativos | Não | Não | Não | Não | Não | Sim (Performance Center) | Não confirmado | Não confirmado |
| Analytics avançado nativo (sem depender de BI de terceiro) | Não (depende de Treasy/APP BI) | Parcial | Não confirmado | Parcial (Mais é nativo, mas só para BPO) | Sim (nativo, mas só para parceiro) | Sim (Performance Center é nativo) | Sim (Analytics é nativo, todos os planos) | Não (depende de Treasy) |

---

## 13. Leituras estratégicas — gaps reais para diferenciação do nosso produto

O sistema já tem DRE completo, DFC por atividade, Ponto de Equilíbrio, Aging, Centro de Custo, Curva ABC (Análise de Despesas) e Análises Comparativas (AH/YoY/YTD) — ou seja, já cobre a "espinha dorsal contábil-gerencial" que a maioria dos concorrentes brasileiros também cobre razoavelmente bem (DRE e fluxo de caixa são tabela de entrada, confirmado na pesquisa anterior e reforçado aqui). O diferencial real não está em ter mais um relatório formal — está nos indicadores "de insight" que **nenhum concorrente brasileiro pesquisado fecha bem**, e que o mercado internacional só fecha parcialmente:

1. **DSO/DPO como dashboard de primeira classe, não relatório escondido.** Nenhum sistema brasileiro pesquisado (Omie, Nibo, Bling, Conta Azul, Granatum) expõe nativamente "prazo médio de recebimento" e "prazo médio de pagamento" como indicador de tela — o próprio QuickBooks Online, referência de maturidade, não tem isso pronto na versão SaaS (só no Desktop, via relatório manual). Só o Xero fecha isso de forma nativa e visível (debtor days / creditor days no Business Snapshot). Como já temos Aging e DFC, calcular PMR/PMP a partir dos mesmos dados de baixa/vencimento é incremental — e nenhum concorrente direto brasileiro tem isso pronto. É um diferencial concreto e barato de construir dado o que já existe.

2. **Concentração de receita por cliente com alerta de risco explícito.** Esse é o gap mais forte encontrado em toda a pesquisa: **nenhum dos 8 sistemas pesquisados** (incluindo QuickBooks e Xero) transforma "top clientes" em um indicador de risco tipo "3 clientes = 68% da sua receita nos últimos 12 meses — risco de concentração alto". Todos que mostram ranking de clientes (Omie, QuickBooks, Conta Azul Mais) fazem isso como lista neutra. Um índice HHI ou "Top 3/Top 5 como % da receita" com semáforo (verde/amarelo/vermelho) e um clique para ver quais clientes puxam esse risco seria pioneiro no segmento de PME brasileira — e a lógica de cálculo é simples dado que o sistema já tem receita por pessoa via módulo de Contas a Receber e cadastro de Clientes.

3. **Tela de analytics organizada por pergunta de negócio, não por tipo de relatório.** Todos os concorrentes pesquisados organizam dashboards por categoria de documento contábil (DRE, fluxo de caixa, contas a pagar) — nenhum organiza por pergunta do dono do negócio ("Estou ficando sem caixa?", "Quem não está pagando?", "Onde estou perdendo dinheiro?", "Minha receita está concentrada demais?"). Como o sistema já tem Painel + Visão Geral de Relatórios com gauges e donuts, reorganizar (ou adicionar) uma camada de "perguntas" que agregue PE, Aging, concentração de receita, DSO/DPO e curva ABC em respostas diretas seria uma diferenciação de UX que nenhum concorrente entrega hoje.

4. **Drill-down consistente gráfico → extrato em todo o sistema.** O padrão de clicar num gráfico e cair direto no extrato/relatório detalhado daquele período/categoria aparece só parcialmente em Nibo e Conta Azul (e no Snapshot do QuickBooks). Não é um recurso "novo" a inventar, mas garantir que **todo** gráfico do Painel/Visão Geral (inclusive os novos de DSO/DPO/concentração) seja clicável e leve ao detalhe correspondente (ex.: clicar no cliente concentrador → cai na tela de Pessoas → aba financeira dele) é um padrão de qualidade que nenhum concorrente brasileiro implementa de ponta a ponta hoje.

5. **Índices de liquidez (current ratio/quick ratio) — nicho, mas zero oferta brasileira.** Só o QuickBooks Performance Center oferece isso nativamente entre os pesquisados. Como o sistema já tem Contas Bancárias e Contas a Pagar/Receber, dá para calcular liquidez corrente/seca sem novo dado. Valor menor que os itens 1–3 (público mais avançado/contador), mas fácil de agregar como card adicional na Visão Geral, e reforça o posicionamento "mais analítico que qualquer ERP brasileiro pesquisado".

6. **Cuidado a não replicar o erro do ecossistema brasileiro: analytics avançado como upsell terceirizado.** Omie, Nibo, Bling e Granatum tratam analytics de verdade como um app pago à parte (Treasy, APP BI, DashFinanceiro) em vez de nativo. Isso é uma fricção real para o usuário final (múltiplas assinaturas, dados saindo do sistema principal). Manter os indicadores de insight (DSO/DPO, concentração de receita, liquidez) **nativos no core**, sem empurrar para um parceiro de BI, é por si só um diferencial de simplicidade frente a todo o mercado brasileiro pesquisado.

---

## Fontes consultadas (lista consolidada)

- Omie: https://ajuda.omie.com.br/pt-BR/articles/13639245-gerando-um-relatorio-de-ranking-de-clientes-por-faturamentos · https://kondado.com.br/blog/blog/2025/05/22/como-criar-um-relatorio-do-omie-dicas-e-metricas-que-nao-podem-faltar/ · https://store.omie.com.br/apps/app-bi · https://store.omie.com.br/apps/app-bi-parceiros · https://www.treasy.com.br/omie/ · https://dash-financeiro.com/
- Nibo: https://ajuda.nibo.com.br/pt-BR/articles/7026282-quais-sao-os-relatorios-do-nibo-gestao-financeira · https://www.nibo.com.br/nibo-bpo · https://www.nibo.com.br/empresa/gestao-financeira/bpo · https://www.treasy.com.br/nibo/
- QuickBooks Online: https://quickbooks.intuit.com/learn-support/en-us/help-article/small-business-processes/get-snapshot-business-finances-quickbooks-online/L2XmgoQFf_US_en_US · https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-users/customize-snapshot-tab/L7HIZybrV_US_en_US · https://quickbooks.intuit.com/learn-support/en-us/help-article/budget-forecast-reports/use-cash-flow-planner-quickbooks-online/L2l59mIqe_US_en_US · https://insightfulaccountant.com/accounting-tech/general-ledger/quickbooks-performance-center/ · https://paygration.com/using-the-performance-center-in-quickbooks-online-advanced/ · https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/filter-average-days-to-pay-report/00/236314 · https://quickbooks.intuit.com/learn-support/en-us/account-management/i-have-been-looking-for-a-way-to-report-track-average-days-to/00/976669
- Bling: https://blog.bling.com.br/relatorio-financeiro/ · https://polivision.com.br/relatorios-e-indicadores-do-bling/ · https://polivision.com.br/gestao-financeira-e-relatorios-inteligentes-no-bling-erp/ · https://ajuda.bling.com.br/hc/pt-br/articles/10448301650455 (403 no fetch automatizado)
- Conta Azul: https://ajuda.contaazul.com/hc/pt-br/articles/9883828247309 · https://ajuda.contaazul.com/hc/pt-br/articles/8603429895309 · https://ajuda.contaazul.com/hc/pt-br/articles/36995310423565 · https://ajuda.contaazul.com/hc/pt-br/articles/44911372536717 · https://ajuda.contaazul.com/hc/pt-br/articles/44911365163149 · https://contaazul.com/blog/fluxo-de-caixa-projetado/
- Xero: https://www.xero.com/us/accounting-software/analytics/ · https://www.xero.com/us/accounting-software/analytics/snapshot/ · https://www.xero.com/us/accounting-software/analytics/cash-flow/ · https://albertgoodman.co.uk/insights/seeing-the-future-with-xero-analytics
- Granatum: https://www.granatum.com.br/financeiro/funcionalidades/relatorio-receitas-vs-despesas · https://www.granatum.com.br/blog/planejamento-financeiro-empresarial-indicadores · https://www.treasy.com.br/granatum/
- ContaCerta: busca não localizou produto correspondente com fonte confiável (ver seção 8)
- Bluesoft (achado lateral): https://blog.bluesoft.com.br/novo-relatorio-de-prazo-medio-de-recebimentopagamento-pmrpmp/
- Concentração de receita / KRI / HHI (contexto de mercado, não específico de um produto): https://www.accordia.com.br/kri-key-risk-indicators-os-indicadores-de-risco-que-todo-cfo/ · https://beancount.io/blog/2026/05/11/customer-concentration-risk-10-percent-revenue-threshold-business-valuation-loan-capacity-negotiating-leverage-guide

*Observação metodológica: onde a documentação oficial não estava acessível (ex.: Bling retornou 403, Xero Business Snapshot retornou 503 no fetch direto), os dados vieram de resultados de busca que citam ou resumem essas páginas — sinalizado explicitamente no texto. Nenhum número ou nome de feature foi inventado; onde não havia fonte confiável, o texto marca "não confirmado" ou "não identificado".*
