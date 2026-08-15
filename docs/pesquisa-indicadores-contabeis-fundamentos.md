# Pesquisa — Fundamentos de Indicadores Financeiros (KPIs) para PME Brasileira

> Data da pesquisa: 15/08/2026. Objetivo: levantar, com fórmula e uso prático (não definição genérica de livro didático), os indicadores financeiros que **contadores e donos de PME brasileira realmente acompanham** — para fechar "ciclos de indicador" no ERP (repositório `Sistema financeiro`). Escopo explicitamente fora de finanças corporativas/mercado de capitais (sem EVA, WACC, beta, múltiplos de M&A etc.) — foco em métricas acionáveis com dado transacional (lançamentos, parcelas, vencimentos, pagamentos, categorias, formas de pagamento) que um ERP tipo Conta Azul/Omie/NIBO/BPO financeiro entrega no dia a dia.
>
> Pedido original do dono do produto: indicadores que mostrem "pra um contador o que os clientes estão fazendo, o que o empresário tem que fazer" — exemplos citados: "quanto foi gasto em cada conta", "quais foram as formas de pagamento mais recebidas".

---

## 1. PMR / DSO — Prazo Médio de Recebimento (Days Sales Outstanding)

| | |
|---|---|
| **Fórmula (clássica, saldo)** | PMR = (Contas a Receber médio ÷ Receita Bruta do período) × Nº de dias do período |
| **Fórmula alternativa (por parcela, mais precisa com dado transacional)** | Para cada parcela paga: `dias = data_pagamento − data_vencimento` (ou `data_pagamento − data_emissão`, dependendo do que se quer medir — ver nota abaixo). PMR do período = média ponderada pelo valor de cada parcela: `Σ(dias_da_parcela × valor_da_parcela) ÷ Σ(valor_da_parcela)` |
| **O que revela** | Quantos dias, em média, a empresa demora para transformar uma venda/serviço prestado em dinheiro em caixa. É o termômetro de "quão rápido meus clientes realmente pagam", não apenas o prazo contratado. |
| **Pra quem** | Ambos — dono usa para negociar prazo com clientes recorrentes e prever caixa; contador/BPO usa para comparar PMR real vs. prazo médio contratado (ex.: "empresa cobra 30 dias mas recebe em 47") e sinalizar deterioração de carteira. |
| **Frequência** | Mensal, com tendência (últimos 6-12 meses). Empresas com sazonalidade forte (ex. sazonal em datas comemorativas) também olham por trimestre. |

**Nota de implementação importante (achado da pesquisa):** existem duas formas de calcular DSO/PMR e elas respondem perguntas diferentes:
- **DSO "saldo em aberto"** (fórmula clássica acima, usando saldo de contas a receber no fim do período ÷ receita do período × dias): mede quanto da receita ainda não virou caixa — bom para visão de balanço/fechamento mensal.
- **DSO "por parcela paga"** (média ponderada de `data_pagamento − data_vencimento` das parcelas efetivamente liquidadas no período): mede o comportamento real de pagamento do cliente — melhor para um ERP transacional como este, porque já temos parcela, vencimento e data de pagamento no schema, e é o número que interessa pro contador identificar clientes que atrasam sistematicamente.
- Best practice internacional: comparar contra o **DSO esperado pelos próprios prazos concedidos** (ex.: Net 30 → esperar DSO entre 30-40 dias); DSO 50%+ acima do prazo contratado é sinal de alerta imediato. Isso é mais acionável do que comparar com "benchmark de mercado" genérico.

**Fontes:**
- [Prazo médio de recebimento: fórmula, cálculo e como reduzir o PMR — Kamino](https://kamino.com.br/blog/prazo-medio-de-recebimento/)
- [PMR e PMP: os indicadores de prazo que todo financeiro acompanha — oHub](https://base.ohub.com.br/gestao/financeiro/contas-a-pagar-e-receber/artigos/pmr-e-pmp-os-indicadores-de-prazo-que-todo-financeiro-acompanha)
- [Days Sales Outstanding (DSO) — Wall Street Prep](https://www.wallstreetprep.com/knowledge/days-sales-outstanding-dso/)
- [DSO Formula: How to Calculate, Benchmark & Improve — Upflow](https://upflow.io/blog/reduce-dso/dso-calculation-formula)

---

## 2. PMP / DPO — Prazo Médio de Pagamento (Days Payable Outstanding)

| | |
|---|---|
| **Fórmula (clássica, saldo)** | PMP = (Fornecedores/Contas a Pagar médio ÷ Compras a prazo do período) × Nº de dias do período |
| **Fórmula alternativa (por parcela)** | Para cada conta paga: `dias = data_pagamento − data_vencimento` (ou `− data_emissão`). PMP do período = média ponderada pelo valor pago, igual ao PMR. |
| **O que revela** | Quantos dias a empresa demora, em média, para pagar seus fornecedores/despesas. Ao contrário do PMR, aqui **mais dias é "melhor" para o caixa** (a empresa retém dinheiro por mais tempo) — mas até um limite: PMP alto demais pode indicar atraso sistemático que compromete relação com fornecedor e gera juros/multa. |
| **Pra quem** | Dono usa para negociar prazo com fornecedores e planejar quando pagar sem atrasar; contador usa para checar se a empresa está pagando em dia (compliance) ou se está "financiando-se" via atraso de fornecedor (sinal de aperto de caixa). |
| **Frequência** | Mensal, cruzado sempre com PMR (ver Ciclo Financeiro abaixo) — isoladamente PMP diz pouco. |

**Fontes:**
- [Prazo médio de pagamento: como calcular e sua importância para o caixa — Kamino](https://kamino.com.br/blog/prazo-medio-de-pagamento/)
- [Prazo Médio de Pagamento e Recebimento: guia + planilha — vExpenses](https://vexpenses.com.br/blog/prazo-medio-de-pagamento-e-recebimento/)
- [Prazo Médio de Pagamento: O que é? — Neofin](https://www.neofin.com.br/definicao/prazo-medio-de-pagamento-o-que-e)

---

## 3. Ciclo Financeiro / Ciclo de Conversão de Caixa (Cash Conversion Cycle)

| | |
|---|---|
| **Fórmula completa (com estoque — comércio/indústria)** | CCC = PME + PMR − PMP, onde PME (Prazo Médio de Estoque) = (Estoque médio ÷ CMV anual) × 365 |
| **Fórmula simplificada (serviços — sem estoque, ex.: escritório de advocacia, consultoria)** | Ciclo Financeiro = PMR − PMP |
| **O que revela** | Quantos dias o dinheiro da empresa fica "preso" no ciclo operacional antes de voltar como caixa disponível. Quanto menor (ou mais negativo), melhor — significa que a empresa recebe antes de precisar pagar, reduzindo necessidade de capital de giro externo. Quando PMR > PMP, a empresa está financiando os próprios clientes com capital próprio (ou de terceiros, se tomar empréstimo/desconto de recebíveis para cobrir o gap). |
| **Pra quem** | Dono (decisão: renegociar prazo com cliente/fornecedor, decidir se vale antecipar recebíveis) e contador/BPO (diagnóstico de necessidade de capital de giro, argumento para sugerir linha de crédito ou mudança de política de cobrança). |
| **Frequência** | Mensal com série histórica — o valor isolado importa menos que a tendência (piorando ou melhorando). |

Para uma PME de serviços (o caso mais próximo do produto — ex. escritório de advocacia), o ciclo relevante é essencialmente PMR − PMP, porque não há estoque físico. É citado explicitamente como indicador aplicável a escritórios de advocacia ("ciclo de caixa: tempo desde o investimento inicial em um caso até o recebimento").

**Fontes:**
- [Ciclo de Conversão de Caixa (CCC) — Galícia Educação](https://www.galiciaeducacao.com.br/blog/ciclo-de-conversao-de-caixa-ccc-cash-conversion-cycle-ccc/)
- [Ciclo de Conversão de Caixa: o que é e como otimizar? — Treasy](https://www.treasy.com.br/blog/ciclo-de-conversao-de-caixa/)
- [Ciclo financeiro: o que é, fórmula e como calcular — Kamino](https://kamino.com.br/blog/ciclo-financeiro/)
- [Gestão jurídica: indicadores financeiros para escritórios de advocacia — Migalhas](https://www.migalhas.com.br/depeso/397433/gestao-juridica-indicadores-financeiros-para-escritorios-de-advocacia)

---

## 4. Concentração de Receita/Despesa (risco de carteira)

| | |
|---|---|
| **Fórmula simples (Top N)** | % Top N clientes = (Σ receita dos N maiores clientes ÷ Receita total do período) × 100. Aplicar o mesmo cálculo para fornecedores/despesas (concentração de gasto em poucos fornecedores). |
| **Fórmula mais rigorosa (opcional, avançado)** | Índice HHI (Herfindahl-Hirschman): soma dos quadrados dos % de participação de cada cliente na receita. HHI > 2.500 (numa escala 0-10.000) indica concentração alta. Mais sofisticado que Top N, mas exige explicar o conceito ao usuário final — Top N é mais direto para dono de PME. |
| **O que revela** | Risco de dependência: se poucos clientes representam parcela grande da receita, a perda de um cliente ameaça a operação inteira, e o poder de negociação do cliente sobre preço/prazo aumenta (fica mais difícil recusar desconto ou prazo maior). |
| **Limiares de referência encontrados na pesquisa** | 1 cliente representando 25-30%+ da carteira a receber já é considerado risco; 30%+ da receita total em um único cliente é tratado como "negócio vulnerável" por consultorias financeiras. |
| **Pra quem** | Dono (decisão estratégica: diversificar carteira, não depender de 1-2 contas) e contador (alerta de risco a reportar — é o tipo de insight que justifica cobrança de serviço consultivo, não só operacional). |
| **Frequência** | Mensal ou trimestral — não muda tão rápido quanto fluxo de caixa, mas merece card fixo no painel porque é frequentemente ignorado até virar crise. |

Aplica-se igual do lado da despesa: % do gasto total concentrado nos 3-5 maiores fornecedores/categorias — relevante para o pedido específico do dono ("quanto foi gasto em cada conta"), pois concentração de despesa é o mesmo cálculo aplicado ao plano de contas em vez de à carteira de clientes.

**Fontes:**
- [Risco da Concentração de Clientes: Sua Empresa Está Segura? — Contábeis](https://www.contabeis.com.br/artigos/78710/risco-da-concentracao-de-clientes-sua-empresa-esta-segura/)
- [Reduzindo o Risco de Concentração de Clientes — Arizen Consulting](https://arizen.com.br/pt/blog/pt-reduzindo-risco-concentracao-clientes/)
- [Risco de Concentração em Recebíveis: Como Identificar e Diversificar a Carteira — Access Tage](https://blog.accesstage.com.br/risco-de-concentra%C3%A7%C3%A3o-em-receb%C3%ADveis-como-diversificar)
- [Indicadores Financeiros Essenciais: PMR, Ciclo de Caixa e Recebíveis — Captar Sec](https://captarsec.com.br/indicadores-financeiros-que-empresario-deveria-acompanhar/)

---

## 5. Indicadores de Forma de Pagamento

| | |
|---|---|
| **Métrica 1 — Distribuição** | % da receita (ou nº de transações) recebida por cada forma de pagamento (Pix, boleto, cartão crédito, cartão débito, dinheiro, transferência) no período. |
| **Métrica 2 — Tendência** | Variação % mês a mês de cada forma de pagamento — ex. "Pix cresceu de 40% para 55% da receita em 6 meses" indica mudança de comportamento do cliente ou de política de cobrança da empresa. |
| **Métrica 3 — Atraso por forma de pagamento** | Cruzar forma de pagamento com PMR/atraso médio: qual forma de recebimento historicamente atrasa mais. Cartão de crédito parcelado e boleto tendem a ter prazo de compensação mais longo (boleto: mesmo dia se pago até ~13h30, ou até D+2; cartão de crédito: em torno de D+30 até a empresa receber do adquirente; débito: D+3); Pix é liquidação instantânea. Combinações de forma de pagamento com prazo contratado longo tendem a concentrar os maiores atrasos. |
| **O que revela** | Onde otimizar custo de recebimento (taxa de cartão 2-3,5% vs. Pix sem taxa de adquirente), qual meio de cobrança oferecer para acelerar caixa, e onde focar régua de cobrança. |
| **Pra quem** | Dono, principalmente — decisão operacional direta (ex.: incentivar Pix, rever taxa de maquininha, cobrar antecipação de recebíveis de cartão). Contador usa secundariamente para explicar por que o caixa "demora" a refletir a receita contábil. |
| **Frequência** | Mensal. É um dos dois exemplos citados textualmente pelo dono do produto ("quais foram as formas de pagamento mais recebidas") — bom candidato a gráfico de pizza/barra simples no painel. |

**Fontes:**
- [Compensação de pagamento de boleto, cartão e Pix. Prazos — Asaas](https://blog.asaas.com/compensacao-de-pagamento/)
- [Boletos ou Pix: como escolher a forma de cobrança ideal — Cora](https://www.cora.com.br/blog/boletos-vs-pix-forma-de-cobranca/)
- [Formas de pagamento: 6 mais usadas para aumentar vendas — Asaas](https://blog.asaas.com/formas-de-pagamento/)

---

## 6. Índice de Inadimplência / Taxa de Atraso

| | |
|---|---|
| **Fórmula (inadimplência "dura", padrão de mercado)** | Taxa de inadimplência = (Valor em atraso há mais de 90 dias ÷ Faturamento/total a receber do período) × 100 |
| **Fórmula (atraso simples, mais útil no dia a dia de uma PME)** | Índice de atraso = (Valor total de parcelas vencidas e não pagas na data de corte ÷ Valor total de parcelas a receber no período) × 100 — sem exigir os 90 dias do critério bancário, útil para alerta operacional antecipado. |
| **Aging / faixas de atraso (complementar, muito usado por BPO financeiro)** | Segmentar contas a receber vencidas em faixas: 1-30 dias, 31-60, 61-90, 90+ dias. Mostra não só "quanto" está inadimplente mas "há quanto tempo", o que muda a estratégia de cobrança (régua de cobrança). |
| **O que revela** | Saúde da carteira de recebíveis e eficácia da política de crédito/cobrança da empresa. |
| **Referência de mercado** | Índice aceitável, segundo parâmetros do Sistema Financeiro Nacional citados por especialistas, fica na faixa de 5% a 10%; no varejo o corte-padrão de "inadimplência dura" é 90-180 dias de atraso. Pesquisa do Sebrae aponta que ~25% das pequenas empresas brasileiras sofrem com problemas de inadimplência de clientes. |
| **Pra quem** | Ambos — dono para decisão de crédito/cobrança no dia a dia; contador para reportar risco de perda (provisão para devedores duvidosos) e sugerir política de crédito mais rígida. |
| **Frequência** | Mensal para a taxa agregada; a régua de aging (30/60/90) vale a pena manter sempre visível/atualizada, não só em fechamento mensal. |

**Fontes:**
- [Índice de Inadimplência: como calcular e fazer a gestão — Bom Controle](https://blog.bomcontrole.com.br/indice-de-inadimplencia/)
- [Calcule a inadimplência em sua empresa — Sebrae](https://sebrae.com.br/sites/PortalSebrae/artigos/calcule-a-inadimplencia-em-sua-empresa,444137aea9bc6810VgnVCM1000001b00320aRCRD)
- [Taxa de inadimplência: como calcular, benchmarks e redução em empresas B2B — Kamino](https://kamino.com.br/blog/taxa-de-inadimplencia/)
- [5 Indicadores de Inadimplência para Empresas + Como Medir — Cobre Fácil](https://www.cobrefacil.com.br/blog/indicadores-de-inadimplencia)

---

## 7. Liquidez Corrente

| | |
|---|---|
| **Fórmula** | Liquidez Corrente = Ativo Circulante ÷ Passivo Circulante |
| **O que revela** | Capacidade da empresa de honrar obrigações de curto prazo com os recursos disponíveis no curto prazo. Índice = 1,5 significa R$ 1,50 disponível para cada R$ 1,00 de dívida de curto prazo. |
| **Referência de mercado** | Instituições financeiras usam esse índice em análise de crédito; valores abaixo de 1,0 indicam potencial dificuldade de honrar compromissos. |
| **Limitação para o ERP** | Este indicador é tradicionalmente calculado a partir do Balanço Patrimonial (ativo/passivo circulante), que exige contabilidade completa (não apenas fluxo de caixa transacional). Num ERP financeiro sem módulo contábil pleno, uma aproximação prática é: `(Saldo em caixa/bancos + Contas a Receber a vencer nos próximos 30-90 dias) ÷ (Contas a Pagar a vencer nos próximos 30-90 dias)` — não é tecnicamente "liquidez corrente" no sentido contábil estrito, mas entrega o mesmo insight ("tenho caixa suficiente para cobrir o que vou precisar pagar?") com os dados que o sistema já tem. |
| **Pra quem** | Contador (linguagem e uso mais próximos de análise contábil formal/relatório para banco) e dono (versão simplificada/aproximada serve de alerta de curto prazo). |
| **Frequência** | Mensal. |

**Fontes:**
- [Indicadores financeiros: 24 KPIs para monitorar e crescer — Flash](https://flashapp.com.br/blog/indicadores-financeiros-kpis)
- [KPIs Financeiros: Os Indicadores Essenciais para Medir a Saúde da Sua Empresa — GrouBee](https://groubee.com.br/kpis-financeiros-os-indicadores-essenciais-para-medir-a-saude-da-sua-empresa/)

---

## 8. Capital de Giro

| | |
|---|---|
| **Fórmula** | Capital de Giro = Ativo Circulante − Passivo Circulante |
| **Aproximação com dado transacional (mesma ressalva do item 7)** | Caixa/bancos + Recebíveis a curto prazo − Contas a pagar a curto prazo. |
| **O que revela** | Recurso financeiro disponível para manter a operação do dia a dia. Capital de giro positivo = folga para cobrir despesas correntes sem recorrer a empréstimo; negativo = a empresa depende de crédito de terceiros para operar. |
| **Relação com o Ciclo Financeiro (item 3)** | Necessidade de Capital de Giro (NCG) cresce quando o Ciclo Financeiro (PMR − PMP, ou +PME) é positivo e largo — ou seja, os dois indicadores devem ser mostrados juntos: o ciclo financeiro explica *por que* falta ou sobra capital de giro. |
| **Pra quem** | Ambos — é um dos indicadores mais citados em toda a pesquisa como "essencial" para PME, ao lado de fluxo de caixa e liquidez. |
| **Frequência** | Mensal, com alerta imediato se ficar negativo. |

**Fontes:**
- [Indicadores financeiros: 24 KPIs para monitorar e crescer — Flash](https://flashapp.com.br/blog/indicadores-financeiros-kpis)
- [Cálculo do Capital de Giro e o Ciclo de Conversão de Caixa — Irko Hirashima](https://irkohirashima.com.br/blog/calculo-do-capital-de-giro-e-o-ciclo-de-conversao-de-caixa/)

---

## 9. Gasto por Categoria/Centro de Custo — com tendência (não só o total)

| | |
|---|---|
| **Métrica 1 — Total simples** | Soma de despesas lançadas por categoria/plano de contas no período (o exemplo citado literalmente pelo dono: "quanto foi gasto em cada conta"). Ponto de partida, mas pouco acionável sozinho. |
| **Métrica 2 — Variação % mês a mês** | `((Gasto categoria mês atual − Gasto categoria mês anterior) ÷ Gasto categoria mês anterior) × 100`, por categoria. Sinaliza categorias que dispararam ("energia subiu 40% no mês") sem precisar de orçamento prévio cadastrado — funciona com dado puramente histórico. |
| **Métrica 3 — % do gasto total** | Cada categoria como % da despesa total do mês — mostra onde o dinheiro está concentrado, não só se cresceu. |
| **Métrica 4 — Desvio orçado x realizado** | Se houver orçamento cadastrado por categoria/centro de custo: `Variação = Realizado − Orçado` (absoluta) e `% Variação = (Realizado − Orçado) ÷ Orçado × 100`. É o padrão de controle orçamentário citado nas fontes — colunas lado a lado (orçado, realizado, variação R$, variação %) por centro de custo. |
| **Métrica 5 — Gasto por centro de custo (quando a PME tem departamentos/filiais/sócios)** | Mesmas métricas acima, mas agrupadas por centro de custo em vez de categoria — relevante quando o negócio tem mais de uma unidade/área (ex. escritório com área trabalhista + área cível). |
| **O que revela** | Onde o dinheiro está sendo gasto e se o padrão de gasto está sob controle ou fugindo da rota — é a base para decisão de corte de custo. |
| **Pra quem** | Dono (decisão direta de corte/renegociação) e contador (identifica categorias fora do padrão para investigar/alertar; é o tipo de relatório citado como "DRE gerencial" por serviços de BPO financeiro). |
| **Frequência** | Mensal é o padrão citado nas fontes: "analisar quanto o saldo de cada centro de custo varia mês a mês ajuda a identificar se há consistência ou oscilações". Variação % mês a mês é o formato mais citado como acionável mesmo sem orçamento cadastrado — bom primeiro passo antes de exigir que o usuário cadastre orçamento. |

**Fontes:**
- [Centro de custo: como organizar as finanças por departamentos — Serasa Experian](https://www.serasaexperian.com.br/conteudos/centro-de-custo/)
- [Análise Orçamentária: como transformar dados em decisões — Scoreplan](https://scoreplan.com.br/analise-orcamentaria/)
- [Variação orçamentária: como identificar desvios e agir rápido — Scoreplan](https://scoreplan.com.br/variacao-orcamentaria/)
- [Real x Orçado: disciplina mensal que evita surpresas financeiras — VBMC Consultores](https://vbmc.com.br/real-x-orcado-que-evita-surpresas-financeiras/)
- [Relatórios financeiros: análise de centros de custo — Conta Azul](https://ajuda.contaazul.com/hc/pt-br/articles/28260650301453-Relat%C3%B3rios-financeiros-an%C3%A1lise-de-centros-de-custo)

---

## 10. Fluxo de Caixa (realizado e projetado) — o indicador "mãe"

| | |
|---|---|
| **Fórmula** | Saldo inicial + Entradas do período − Saídas do período = Saldo final. Projeção usa os mesmos dados só que com parcelas a vencer em vez de já pagas. |
| **O que revela** | É citado, de forma consistente em todas as fontes pesquisadas, como **o indicador mais crítico para sobrevivência de uma PME** — mais do que rentabilidade, porque empresa lucrativa no papel pode quebrar por falta de caixa no curto prazo (descasamento entre DRE e caixa). |
| **Variante importante para BPO/contador** | "Fluxo de caixa realizado e projetado, com alertas de ruptura" é citado como item padrão entregue por serviços de BPO financeiro — ou seja, o valor está não só em mostrar o passado, mas em **projetar e alertar quando o saldo projetado ficar negativo** numa data futura. |
| **Pra quem** | Ambos, mas é o indicador nº1 do dono do negócio no dia a dia. |
| **Frequência** | Semanal (ou até diária em operação apertada) para caixa; mensal para análise de tendência. |

**Fontes:**
- [Indicadores financeiros essenciais para pequenas e médias empresas — BPO Suite](https://www.bposuite.com.br/blog/indicadores-financeiros-essenciais-para-pequenas-e-medias-empresas/)
- [Fluxo de caixa saudável: os 5 indicadores que todo empresário deveria acompanhar — Capital Empreendedor](https://blog.capitalempreendedor.com.br/fluxo-de-caixa-saudavel-os-5-indicadores-que-todo-empresario-deveria-acompanhar)
- [Monitore indicadores econômico-financeiros do seu negócio — Sebrae](https://sebrae.com.br/sites/PortalSebrae/ufs/ms/sebraeaz/monitore-indicadores-economico-financeiros-do-seu-negocio,164a96439c8fe710VgnVCM100000d701210aRCRD)
- [Quais relatórios o BPO financeiro pode gerar para tomadas de decisão — TDF Contabilidade](https://tdfcont.com.br/2025/11/relatorios-de-bpo-financeiro/)

---

## 11. O que o mercado de BPO financeiro/contábil brasileiro efetivamente entrega/cobra como indicador (contexto Brasil)

Pesquisa direcionada a empresas de BPO financeiro/contábil que atendem PME no Brasil (o público que o dono citou explicitamente: "o que vai mostrar pra um contador") mostrou um pacote de relatórios recorrente:

- **DRE Gerencial** — separa despesas fixas de variáveis e evidencia margem de contribuição, diferente do DRE fiscal/contábil formal. É o relatório mais citado como "tradução" do financeiro para decisão do dono.
- **Posição de caixa** (saldo atual consolidado, multi-conta).
- **Aging de clientes e fornecedores** (contas a receber e a pagar vencidas, por faixa de atraso) — confirma o padrão do item 6 acima.
- **Conciliação bancária** (extrato x sistema) — não é bem um "indicador", mas é pré-requisito de confiança dos outros números; vale como nota de contexto.
- **Fluxo de caixa realizado x projetado com alerta de ruptura** — reforça item 10.
- Indicadores de **liquidez, margem operacional e endividamento** aparecem como pacote padrão de "relatório gerencial" vendido por escritórios de BPO financeiro como serviço consultivo (não só operacional).

Achado relevante: praticamente nenhuma fonte de BPO financeiro brasileiro menciona explicitamente "concentração de receita" ou "índice HHI" como relatório padrão entregue — é tratado mais como boa prática de consultoria financeira/M&A do que item padrão de dashboard de PME. Isso sugere que é um indicador com potencial de **diferenciação** do produto (poucos concorrentes diretos de ERP para PME mostram isso de forma nativa), mesmo sendo genuinamente útil segundo a literatura de gestão de risco.

**Fontes:**
- [Quais relatórios o BPO financeiro pode gerar para tomadas de decisão — TDF Contabilidade](https://tdfcont.com.br/2025/11/relatorios-de-bpo-financeiro/)
- [BPO Financeiro para PMEs: como evitar erros de gestão — Plenus Contabilidade](https://www.plenuscontabilidade.com.br/blog/2026/05/17/bpo-financeiro-para-pmes-como-evitar-erros-de-gestao-que-fecham-empresas-todos-os-anos/)
- [BPO financeiro para PMEs: guia completo — Confere Contabilidade](https://conferecontabilidade.com.br/bpo-financeiro-para-pmes/)
- [Indicadores de Desempenho BPO Financeiro: 7 KPIs Essenciais — Impora Company](https://blog.imporacompany.com.br/indicadores-de-desempenho-bpo-financeiro)

---

## 12. Indicadores citados mas fora do escopo prioritário deste ERP (nota de triagem)

Apareceram nas buscas mas são mais próprios de análise de rentabilidade/precificação do que de "o que o cliente está fazendo com o dinheiro" — vale registrar para não perder de vista em fases futuras, mas não são o foco do pedido atual:

- **Margem EBITDA** — exige alocação de custo/despesa entre operacional vs. financeiro/tributário, mais sofisticado que o dado bruto de lançamento.
- **Ticket médio, CAC, ROI de marketing** — pertencem mais a indicadores comerciais/vendas do que financeiros de fluxo de caixa.
- **Retorno sobre Investimento (ROI) e endividamento geral** — relevantes, mas dependem de dados de investimento/patrimônio que o ERP ainda não modela.

---

## Resumo — indicadores prioritários

Sources:
- [Prazo médio de recebimento — Kamino](https://kamino.com.br/blog/prazo-medio-de-recebimento/)
- [Ciclo financeiro — Kamino](https://kamino.com.br/blog/ciclo-financeiro/)
- [Risco da Concentração de Clientes — Contábeis](https://www.contabeis.com.br/artigos/78710/risco-da-concentracao-de-clientes-sua-empresa-esta-segura/)
- [Índice de Inadimplência — Bom Controle](https://blog.bomcontrole.com.br/indice-de-inadimplencia/)
- [Quais relatórios o BPO financeiro pode gerar — TDF Contabilidade](https://tdfcont.com.br/2025/11/relatorios-de-bpo-financeiro/)
- [Variação orçamentária — Scoreplan](https://scoreplan.com.br/variacao-orcamentaria/)
