# Mapeamento técnico — Planilha Controle Financeiro 6.0 (SFB Planilhas)

Fonte: `Planilha-Controle-Financeiro-6.0.71_DEMO (1).zip` → `Planilha Controle Financeiro 6.0.71_DEMO.xlsm`.
Método: extração do OOXML bruto (o .xlsm é um zip; sem Python/openpyxl disponíveis no ambiente, o parsing foi feito lendo XML diretamente — sharedStrings, tabelas estruturadas, pivotTables/pivotCache, e o blob binário do Power Pivot Data Model). Nenhuma alteração foi feita no arquivo original.

Este documento é insumo para o desenho do sistema financeiro SaaS multi-tenant próprio — **não é o desenho em si**, é o mapeamento do produto de referência.

---

## 1. Visão geral do produto

"Controle Financeiro 6.0" é um template comercial (venda avulsa, provavelmente Hotmart/Eduzz — indícios de licença, pasta `SFB Planilhas` no OneDrive do autor) com 35 abas, das quais ~16 são visíveis ao usuário final (as demais são staging/auxiliares ocultas ou "muito ocultas"). A navegação é feita por um **menu de ribbon customizado** ("SFB MENU"), que é essencialmente o mapa de funcionalidades do produto:

```
SFB MENU
├── Cadastros
│   ├── Plano de Entradas       → aba PlanoContas_Entradas
│   ├── Plano de Saídas         → aba PlanoContas_Saídas
│   ├── Cadastros Gerais        → aba Cadastros_Gerais (centro de custo, unidade, conta bancária, empresa, forma de pgto)
│   └── Fornecedores/Clientes   → aba Fornecedores_Clientes
├── Lançamentos
│   ├── Formulário de Lançamentos → UserForm VBA (entrada assistida)
│   ├── Lançamentos             → aba grid (fLctos)
│   └── Novo Orçamento          → abas Orçamento Simplificado/Completo
├── Relatórios Financeiros
│   ├── Dashboard Gerencial
│   ├── Orçado vs Realizado
│   ├── Fluxo de Caixa (diário)
│   ├── DFC Analítico (mensal, previsto x realizado)
│   ├── Contas a pagar/receber
│   ├── DRE Analítico / DRE Gráfica (waterfall)
│   ├── Análises Comparativas (YoY/AH/YTD)
│   ├── Análise das Despesas
│   ├── Ponto de Equilíbrio
│   ├── Centro de Custo
│   └── Contas Bancárias
├── Impressão (relatório atual / todos os dashboards / todos os relatórios)
└── Suporte (FAQ)
```

**Achado arquitetural central**: as abas de relatório não usam fórmulas de célula (SOMASES etc.) — usam **PivotTable + Slicer conectados a um Power Pivot Data Model interno** (`xl/model/item.data`, ~1,28 MB, cubo tabular estilo OLAP). Ou seja, o produto é essencialmente **um mini data warehouse dentro do Excel**: uma tabela fato de lançamentos + dimensões (calendário, regime, plano de contas, tipo de operação, aging) + ~30-40 medidas DAX reutilizáveis, renderizadas em pivôs/gráficos por aba. Isso é uma boa notícia para portar o conceito para um sistema real: a lógica de negócio já está desenhada em formato "estrela" (fact + dimensions + measures), próximo de como se modelaria em SQL/BI de verdade.

Contagem da camada de BI: 40 pivotTables, 53 pivotCacheDefinitions, 45 slicerCaches, 30 gráficos, Power Query (`Consulta - fLctos`, `Consulta - BaseExterna`, `Consulta - tbConversaoPC`, `Consulta - Parâmetro1`, `Consulta - Arquivo de Amostra`) alimentando o Data Model.

---

## 2. Modelo de dados

### 2.1 Tabela fato — `fLctos` (aba Lançamentos, 911 linhas de demo)

Uma única tabela plana concentra **todo** o lançamento financeiro (entradas e saídas, pago e em aberto, de qualquer empresa/unidade):

| Campo | Observação |
|---|---|
| `Data_Competência` | regime contábil — base do DRE |
| `Data_Vencimento` | base de "previsto"/contas a pagar-receber e aging |
| `Data_Pagamento` | regime de caixa — base do Fluxo de Caixa/DFC. **Vazio = "em aberto"** |
| `Classificação` / `Sub_Classificação` | texto livre, deveria bater com o Plano de Contas (mas nos dados demo não bate — sinal de fragilidade do texto livre) |
| `Descrição/Histórico` | texto livre |
| `Forma_De_Pagamento`, `Conta_Bancária`, `Centro_De_Custo` | dimensões, com dropdown (data validation) apontando pra Cadastros_Gerais |
| `Nome_Participante`, `Tipo_Participante` | contraparte (cliente/fornecedor) — texto livre, sem FK real para Fornecedores_Clientes |
| `Valor` | **sempre positivo, sem sinal** — o sinal (receita/despesa) é inferido via lookup no Plano de Contas, não armazenado na linha |
| `Empresa`, `Unidade` | multi-empresa/multi-filial **dentro da mesma tabela**, via coluna simples — não é isolamento real, é uma dimensão a mais no mesmo dataset |
| `Outros_1`, `Outros_2` | campos livres extras, praticamente não usados nos dados demo |

Nenhuma fórmula de célula na tabela — é dado 100% estático. As únicas 7 `dataValidations` (listas suspensas) cobrem Forma de Pagamento, Conta, Centro de Custo, Favorecido, Tipo_Favorecido, Empresa, Unidade — **não há dropdown para Classificação/Sub_Classificação**: os `definedNames` correspondentes (`Grupo_Despesas`, `Grupo_Receita`, `Sub_Classificacao`) resolvem para `#REF!`, dependência de uma versão "master" externa quebrada nesta cópia demo.

### 2.2 Orçamento — dois modelos paralelos

- **`tbBGTSimples`** (Orçamento Simplificado): 1 linha por Sub_Classificação × 12 colunas (JAN..DEZ) — orçamento macro, top-down.
- **`fLctosBGT`** (Orçamento Completo): mesmo shape da fLctos real (sem participante/vencimento/pagamento), 903 linhas — orçamento granular, bottom-up, comparável linha a linha com o realizado.

### 2.3 Dimensões / cadastros (`Cadastros_Gerais`)

Centro de Custo (`Cod`/nome/`Tipo`), Unidade de negócio, Conta bancária, Empresa, Forma de Pagamento, Tipo_Participante — todas implementadas como mini-tabelas de 2-4 linhas de exemplo (placeholders para o usuário expandir). `Tipo_Participante` está vazio no demo (nenhum valor cadastrado, apesar de usado como texto livre no ledger).

### 2.4 Plano de contas (`PlanoContas_Entradas` / `PlanoContas_Saídas`)

Estrutura em grupos numerados (10 grupos de entrada, 20 de saída), cada grupo é uma mini-tabela de código+sub-categoria. Chart of accounts completo documentado no relatório bruto do agente (grupos como *1.3 Receitas com Produtos*, *2.2 Despesas com Pessoal - Salários* com 16 sub-itens, *2.7 Despesas Gerais* com 27 sub-itens). Vários grupos no fim da lista (1.7–1.10, 2.13, 2.16–2.17) são placeholders genéricos vazios — espaço para customização do cliente.

Existe uma tabela-sombra `tbPlanoContasGeral` (referenciada só via Data Model / defined name externo quebrado) que **consolida os dois planos + associa cada sub-classificação a**: totalizador de DRE (`IdTotalizador`), sinal de cálculo, e `Classificação_Usuário` — é essa tabela consolidada, não as abas visuais, que efetivamente alimenta as medidas DAX.

### 2.5 Fornecedores/Clientes (`Tab_Favorecidos`)

Nome, CPF/CNPJ, Endereço, E-mail, Telefone, `Tipo_Favorecido`, Observação — tabela vazia no demo (só cabeçalho), sem data validation em `Tipo_Favorecido` (não há lista fixa Cliente/Fornecedor/Outro), e sem vínculo formal (FK) com `Nome_Participante` do ledger.

### 2.6 Importação/onboarding (`Tabela_Conversao`)

Não é conversão de versão — é uma ferramenta de **mapeamento de colunas para importar a planilha do próprio cliente** (De: coluna da planilha do cliente → Para: dropdown com os 16 campos de `fLctos`), com leitura de uma pasta local via VBA/Power Query. É o mecanismo de onboarding de dado legado do produto.

---

## 3. Motor de cálculo (Power Pivot / DAX)

### 3.1 Regime triplo sobre a mesma linha

`tbData` (dimensão calendário) tem 3 relacionamentos com `fLctos` (1 ativo + 2 inativos, trocados via `USERELATIONSHIP`), um para cada campo de data:

- **Competência** → `Data_Competência` → alimenta o DRE.
- **Previsto** → `Data_Vencimento` → alimenta contas a pagar/receber e aging.
- **Realizado** → `Data_Pagamento` → alimenta Fluxo de Caixa/DFC.

Um slicer único, **"Regime"** (`Competência` / `Cx. Previsto` / `Cx. Realizado`), aparece repetido em quase toda aba de relatório e troca globalmente qual relacionamento está ativo — é o mecanismo central de reuso: **um dataset, três leituras**.

"Em aberto" = `Data_Pagamento` vazio (BLANK). "Vencido" = em aberto **e** `Age >= 0`, onde `Age = HOJE() - Data_Vencimento`. "Pago com atraso" = `Data_Pagamento > Data_Vencimento`.

### 3.2 DRE — estrutura (tabela `tbTotalizadoresDRE`, 24 linhas reais)

Cascata clássica: Receitas operacionais → (–) Devoluções/Tributos → **Receita Líquida** → (–) Custos/Despesas variáveis → **Margem de Contribuição** *(rota gerencial)* / **Lucro Bruto** *(rota contábil, calculada em paralelo a partir do mesmo custo variável via flag `MC_LB`)* → (–) Custos/Despesas fixas → **EBITDA** → (–) D&A → **Lucro Operacional** → +/– resultado não operacional → **LAIR** → (–) tributos sobre lucro → **Lucro Líquido** → +/– investimento, dívida, retirada de lucros → **Resultado Final**.

Cada linha tem uma coluna `ID_DFC` (FK) que reclassifica a mesma linha de DRE em atividade de DFC (operacional/investimento/financiamento), e uma coluna `Waterfall` que controla o papel da linha no gráfico cascata de `DRE_Gráfica`.

### 3.3 DFC / Fluxo de Caixa

- **FluxoCaixa** (diário): grade dia-a-dia por conta bancária, saldo acumulado via `SOMAYTD`/`PREVIOUSDAY`. Método direto (agrupa por natureza do movimento de caixa).
- **DFC_Direto** (rotulado "DFC Analítico" no menu, mensal): 3 colunas lado a lado — **Previsto / Realizado / Variação R$** por mês, nas 4 macro-linhas Operacional/Investimento/Financiamento/Geração de Caixa.

### 3.4 Contas a Pagar/Receber + Aging

Uma única aba "central de cálculo" oculta (`Dados_CP_CR`) roda ~6 pivôs: total a pagar/receber hoje, saldo em aberto por participante, aging por participante, faixa de atraso, totais gerais — exibidos na aba visível `CAP_CAR` via slicer de `Tipo_Operação2` (A Pagar/A Receber) e Ano.

Faixas de aging reais (`tbAgeing`, 10 faixas): *A vencer 31-365 / 16-30 / 0-15* (dias negativos) e *0-15 / 16-30 / 31-60 / 61-90 / 91-120 / 121-180 / 180+* (dias vencidos) — configurável em tabela, não hardcoded em fórmula.

### 3.5 Ponto de Equilíbrio

`PE = Custos Fixos ÷ Margem de Contribuição %`, com a base da MC% configurável (`tbReceitaBaseAV`: sobre Receita Operacional ou sobre Receita Líquida) — o usuário escolhe a base via slicer. 100% em R$; não há PE em unidades/quantidade (não existe conceito de preço médio/ticket no modelo).

### 3.6 Centro de Custo / Análise de Despesas

Centro de Custo é tratado como mini-P&L: Entradas, Saídas, Saldo, Margem % (só exibida no nível agregado, escondida ao abrir detalhe — `ISFILTERED`). Análise de Despesas é uma curva ABC: Tipo de Gasto (Fixo/Variável) → Classificação → Sub-classificação × mês, com % de participação no total.

### 3.7 Camada de análise comparativa

Uma dimensão `Tipo_Variação` (slicer único) alterna entre 3 modos de leitura temporal sobre a mesma estrutura de totalizadores DRE: **AH** (Análise Horizontal, período vs período anterior), **YoY** (mesmo mês, anos diferentes) e **YTD** (acumulado no ano). Outra dimensão, `Tipo_Análise` (A.V/A.H/NA), controla se o número aparece em % vertical sobre receita ou variação horizontal.

### 3.8 Dashboard Gerencial

13 gráficos: fluxo de caixa mensal (entradas/saídas/saldo), Top 7 receitas por classificação, Top 10 despesas por classificação, contas a pagar/receber por faixa de aging, evolução mensal da Margem de Contribuição, evolução do Ponto de Equilíbrio, e 4 indicadores "gauge" (%Realizado de CAP, %Realizado de CAR, %Pago em atraso de CAP, %Pago em atraso de CAR). Único slicer: Regime (Competência/Previsto/Realizado) — **não há filtro nativo de Empresa/Unidade no dashboard**, reforçando que o produto não foi desenhado como multi-tenant real.

### 3.9 Orçado × Realizado e Relatório de Contas Bancárias

RealXBGT compara Orçado vs Realizado por totalizador de DRE (R$ e %) e por mês, em barras lado a lado (sem semáforo condicional nativo). Relatório de Contas Bancárias é um extrato gerencial por conta bancária: crédito, débito, saldo do período, saldo acumulado (YTD) — também com o slicer de Regime.

---

## 4. Limitações do produto de referência (relevantes para o desenho do SaaS)

1. **Single-tenant por natureza**: `Empresa`/`Unidade` são colunas soltas no mesmo dataset, sem isolamento real nem filtro nativo no dashboard — é "multi-empresa" só no sentido de "uma coluna a mais", não multi-tenant de verdade.
2. **Sem integridade referencial**: Classificação/Sub_Classificação e Nome_Participante são texto livre, sem FK garantida contra Plano de Contas / Fornecedores_Clientes — dados demo mostram divergência real entre o que é lançado e o que está cadastrado.
3. **Valor sem sinal**: receita/despesa distinguidas só por lookup indireto no plano de contas, não por sinal ou tipo explícito na própria linha — frágil para conciliação/auditoria.
4. **Regra "em aberto" simplista**: só `Data_Pagamento` vazio — não modela pagamento parcial, estorno, ou múltiplos pagamentos por lançamento (parcelamento).
5. **Dependências quebradas**: vários `definedNames` centrais (dropdown de categoria) apontam para uma pasta de trabalho externa ausente na cópia demo — sinal de que a versão "real"/paga provavelmente centraliza o plano de contas numa única fonte, e esta demo está com a ligação cortada de propósito (proteção comercial) ou por engano de exportação.
6. **BI = Power Pivot local**: poderoso para uma planilha, mas é um cubo dentro de um arquivo — não hospedado, não multiusuário concorrente, sem API, sem histórico versionado além do que o Excel guarda.

---

## 5. O que herdar como "espinha dorsal" para o sistema próprio

Independente da tecnologia, o modelo de dados deste produto já resolve, de forma testada em produto real, várias decisões difíceis de design financeiro:

- **Ledger único** (fato) com 3 datas (competência/vencimento/pagamento) em vez de tabelas separadas por regime — permite um só schema alimentar DRE, DFC e Contas a Pagar/Receber.
- **Regime como dimensão/parâmetro de leitura**, não como cópia de dado.
- **Plano de contas hierárquico com totalizadores parametrizáveis** (inclusive rota dupla MC/Lucro Bruto) — evita hardcode de "linhas de DRE" no código; a estrutura do relatório é dado, não lógica.
- **Aging configurável em tabela**, não em fórmula.
- **Ponto de equilíbrio com base de MC% configurável**.
- **Orçamento em dois grãos** (macro por categoria/mês vs granular linha-a-linha) como necessidades distintas de usuário, não um único modelo forçado.

E as lacunas acima (multi-tenant real, integridade referencial, sinal explícito, pagamento parcial/parcelamento, plano de contas centralizado) são exatamente os pontos onde o sistema próprio deve superar o produto de referência.

---

## 6. Segunda extração (13/08/2026) — DAX literal do binário do Data Model

Reextração dirigida ao `xl/model/item.data` (blob Power Pivot/VertiPaq, formato de contêiner OLE composto — assinatura `STREAM_STORAGE_SIGNATURE`). A camada colunar em si é compactada e opaca, mas os **metadados de definição de medida** (`CREATE MEASURE ...` e o texto original da fórmula, guardado em nós `<Text>...</Text>` do XML de schema do Analysis Services embutido) sobrevivem como texto legível em trechos — 25 ocorrências de `CREATE MEASURE` foram localizadas e lidas com uma janela de contexto ao redor de cada uma. O texto vem parcialmente corrompido (o compressor intercala substituições binárias dentro do próprio literal), mas a estrutura DAX, os nomes de medida/tabela e a lógica são reconhecíveis com alta confiança — reconstrução abaixo, não transcrição perfeita.

Esta seção **substitui a descrição em prosa da Seção 3 por fórmula real** onde foi possível recuperar; onde não foi possível (medida cortada demais pra reconstruir com segurança), a descrição em prosa da Seção 3 continua sendo a referência.

### 6.1 O mecanismo de Regime — confirmado literalmente

```dax
fLctos[SOMA_PREVISTO] =
CALCULATE([SOMA_X], USERELATIONSHIP(tbData[Data], fLctos[Data_Vencimento]))

fLctos[SOMA_COMPETENCIA] =
CALCULATE([SOMA_X], USERELATIONSHIP(tbData[Data], fLctos[Data_Competência]))

-- SOMA_REALIZADO existe por simetria (relacionamento ativo por padrão, sem USERELATIONSHIP explícito)

fLctos[SOMA_DF] =
VAR SelectDF = MIN(tbSituacao[ID])
RETURN
SWITCH(
    SelectDF,
    1, [SOMA_PREVISTO],
    2, [SOMA_REALIZADO],
    3, [SOMA_COMPETENCIA]
)
```

Confirma exatamente o que a Seção 3.1 já inferia por comportamento — mas agora sabemos que existe uma tabela `tbSituacao` (1/2/3) por trás do slicer "Regime", e que **toda medida de valor do sistema inteiro é construída em cima de `[SOMA_DF]`**, nunca direto na coluna `Valor` — é o único ponto de entrada de dado, o resto é derivado.

### 6.2 Cascata do DRE — a árvore de totalizadores é literalmente recursiva

```dax
fLctos[SOMA_COMBINADA] =
VAR TpCalc = MIN(tbTotalizadoresDRE[Tipo_Calculo])
RETURN
IF(
    AND(TpCalc = 0, ISFILTERED(tbPlanoContasGeral[Classificação_Usuário])),
    BLANK(),
    SWITCH(
        TpCalc,
        1, [SOMA_DF],                    -- linha "folha" (soma direta do ledger)
        2, [ACUMULADA],                  -- linha "subtotal" (soma de linhas anteriores)
        4, [RESULTADO_N_OPERACIONAL]     -- linha especial (ex.: resultado não operacional)
    )
)

tbTotalizadoresDRE[ACUMULADA] =
IF(
    HASONEFILTER(tbTotalizadoresDRE[Totalizador]),
    CALCULATE([SOMA_DF], ALL(tbTotalizadoresDRE), tbTotalizadoresDRE[Ordem(ID)] <= VALUES(tbTotalizadoresDRE[ID])),
    ...
)
```

**Achado importante**: `Tipo_Calculo` classifica CADA linha do DRE em um de 4 papéis (folha / subtotal acumulado / [não identificado] / resultado não operacional), e o "acumulado" é literalmente `SOMA de todas as linhas com Ordem <= a linha atual` — ou seja, o totalizador "Receita Líquida" não é uma fórmula manual (`Receita – Devoluções – Tributos`), é **a soma de tudo que vem antes dele na tabela `tbTotalizadoresDRE` ordenada**. Isso é uma decisão de design forte: a estrutura do DRE é 100% dado (ordem + tipo de uma tabela), zero lógica hardcoded — exatamente o padrão que a Seção 5 já recomendava herdar, agora com a prova de como implementar.

Medidas de linha específicas confirmadas: `MC` (Margem de Contribuição) = `CALCULATE([SOMA_COMBINADA], ALL(tbTotalizadoresDRE), [...] = "Margem de contribuição")`, `LUCRO_LIQ` igual padrão. `GASTOS_TOTAIS` (em `tbPlanoContasGeral`) = `CALCULATE([SOMA_DF], [Classificação] IN {"Despesas variáveis", "Custo...", ...})`.

### 6.3 Waterfall do DRE — subtotal em cascata é a MESMA lógica de `ACUMULADA`, com sinal

```dax
fLctos[SUBTOTAL_WTFALL] =
IF(
    HASONEFILTER(tbTotalizadoresDRE[Waterfall]),
    CALCULATE([SOMA_DF] * <sinal>, FILTER(ALL(...), tbTotalizadoresDRE[Ordem(ID)] <= VALUES(tbTotalizadoresDRE[ID]))),
    ...
)
```

O gráfico cascata (`DRE_Gráfica`) não tem lógica própria — reusa o mesmo padrão "soma até a ordem atual" de `ACUMULADA`, só que multiplicado pelo sinal da linha (a coluna `Waterfall` da Seção 3.2 controla isso). **Para o sistema próprio**: um único componente de "totalizador em cascata" (dado: lista ordenada de {label, tipo, sinal}) resolve DRE tabular, DRE waterfall e Orçado×Realizado ao mesmo tempo — são a mesma árvore renderizada 3 formas diferentes.

### 6.4 Ponto de Equilíbrio e Análise Vertical — base configurável confirmada

```dax
tbDF_PE[PE_CONTABIL] = DIVIDE([GASTOS_FIXOS], [MC%])

fLctos[MC%] =
VAR BASEAV = MIN(tbReceitaBaseAV[ID])
RETURN
SWITCH(
    BASEAV,
    1, DIVIDE([MC], [RECEITA_LIQUIDA], 0),
    2, DIVIDE([MC], [RECEITAS_OPERACIONAIS], 0)
)

tbDF_PE[AV] =    -- Gastos Variáveis (base pro cálculo de MC)
VAR BASEAV = MIN(tbReceitaBaseAV[ID])
RETURN
ABS(CALCULATE([SOMA_DF], ALL(tbTotalizadoresDRE), tbTotalizadoresDRE[Classificação] IN {"Despesas variáveis", "Custos variáveis"}))
```

Confirma com fórmula real o que a Seção 3.5 já documentava por comportamento: o usuário escolhe via slicer se MC% é calculado sobre Receita Líquida ou sobre Receita Operacional, e isso propaga pro Ponto de Equilíbrio automaticamente (PE depende de MC%, que depende do slicer).

### 6.5 Contas em aberto / aging — filtro dinâmico de faixa, não `IF` em cadeia

```dax
fLctos[CONTAS_EM_ABERTO] =
VAR TIPO_OPERACAO = MIN(tbTipoOperacao[ID])
RETURN
SWITCH(
    TIPO_OPERACAO,
    1, CALCULATE([CAR], fLctos[Data_Pagamento] = BLANK()),   -- a receber em aberto
    2, CALCULATE([CAP], fLctos[Data_Pagamento] = BLANK())    -- a pagar em aberto (inferido por simetria)
)

fLctos[CONTAS_EM_ABERTO_HJ] = CALCULATE([CONTAS_EM_ABERTO], fLctos[Data_Vencimento] = TODAY())

tbAgeing[SOMA_AGE] =
CALCULATE(
    [CONTAS_EM_ABERTO],
    FILTER(
        DISTINCT(fLctos[Age]),
        COUNTROWS(FILTER(tbAgeing, fLctos[Age] >= tbAgeing[Min] && fLctos[Age] <= tbAgeing[Max])) > 0
    )
)
```

A faixa de aging (`tbAgeing`, 10 faixas — Seção 3.4) filtra por uma comparação `Min`/`Max` dinâmica contra o `Age` calculado de cada lançamento, não por 10 `IF`s fixos — é literalmente uma **junção não-equivalente** (band join) entre o fato e a tabela de faixas. Padrão direto de portar pra SQL: `JOIN tb_ageing ON age BETWEEN min AND max`.

### 6.6 Geração de Caixa (DFC) — exclusão explícita de linhas não-caixa

```dax
tbTotalizadoresDFC[GERACAO_CAIXA] =
CALCULATE(
    [SOMA_REALIZADO],
    tbTotalizadoresDRE[Descrição] <> "Saldo Inicial"
        && tbTotalizadoresDRE[Descrição] <> "Depreciação e amortização"
        && tbTotalizadoresDRE[Descrição] <> "Transferências"
        && tbTotalizadoresDRE[Descrição] <> "Retirada de Lucros"
)
```

Confirma que "Geração de Caixa" no DFC é o resultado realizado **menos** as linhas que não são caixa de fato (saldo inicial, D&A, transferências entre contas, retirada de lucros) — uma exclusão explícita por nome, não uma classificação estrutural separada. Ponto de atenção para o sistema próprio: essa exclusão deveria ser uma **flag na estrutura do plano de contas** (`é_movimento_de_caixa: boolean`), não uma lista de nomes hardcoded, senão quebra silenciosamente se o usuário renomear a linha.

Atividades do DFC (operacional/investimento/financiamento) são resolvidas via `ID_DFC IN {5, 6}` etc. (a FK que a Seção 3.2 já documentava) — `FC_ATIVIDADES_FINANCIAMENTO_R`/`_P` (Realizado/Previsto) seguem o mesmo padrão de `CALCULATE(..., ALL(tbTotalizadoresDRE), [ID_DFC] = <n>)`.

### 6.7 Análise comparativa (AH/YoY/YTD) — troca de função de time intelligence, não de fórmula

```dax
tbTotalizadoresDRE[VAR_YOY_R$] =
IFERROR(
    VAR Atual = [SOMA_COMBINADA_ABS]
    VAR Anterior = CALCULATE([SOMA_COMBINADA_ABS], SAMEPERIODLASTYEAR(tbData[Data]))
    RETURN IF(NOT ISBLANK(Anterior), Atual - Anterior, BLANK()),
    BLANK()
)

[TIPO_VARIACAO_SELECIONADO] =
VAR Sel = MIN(tbTipoVariacao[ID])
RETURN
SWITCH(Sel, 1, [VAR_AH], 2, [VAR_YOY], 3, [SOMA_COMB_YTD])

[SOMAYTDPVSELECTED] =
SWITCH(
    TRUE(),
    ISFILTERED(tbData[(Mês)]), CALCULATE([SOMA_COMB_...], PREVIOUSMONTH... / PREVIOUSQUARTER... / PREVIOUSYEAR(tbData[Data]))
)
```

AH usa `PREVIOUSMONTH`-família (mês anterior no mesmo agrupamento), YoY usa `SAMEPERIODLASTYEAR`, YTD usa `TOTALYTD`-família — as 3 são a MESMA medida base (`SOMA_COMBINADA`) passada por 3 funções de time intelligence diferentes, selecionadas por slicer. `SOMAYTDPVSELECTED` detecta a granularidade ativa (mês/trimestre/ano) via `ISFILTERED` pra escolher a função certa automaticamente.

### 6.8 Sinal e valor combinado — confirma a mecânica de "valor sempre positivo + sinal derivado"

```dax
[??] = SUMX(tbPlanoContasGeral, tbPlanoContasGeral[Sinal_Calc])
```

Existe uma coluna `Sinal_Calc` em `tbPlanoContasGeral` (a tabela-sombra já documentada na Seção 2.4) que carrega +1/–1 por linha de classificação, aplicada via `SUMX` — é o mecanismo exato que resolve a limitação #3 da Seção 4 ("valor sem sinal, só por lookup indireto"): o sinal *é* dado tabular (coluna), só não está na linha do lançamento, está na dimensão de classificação. Reforça a recomendação de **não repetir esse desenho**: no sistema próprio, `tipo_categoria` (RECEITA/DESPESA) já cumpre esse papel, mas vale conferir se toda leitura de relatório realmente deriva o sinal daí de forma consistente (nunca assumir "toda despesa é negativa" direto na query).

### 6.9 Toggle "expandir/colapsar" — um padrão de UX que vale replicar

Duas medidas (`GASTOS_...` em `tbDF_PE`, e outra em `tbPlanoContasGeral`) usam o mesmo padrão:

```dax
VAR Expandir = MIN(tb...[ID])   -- vem de uma tabela-parâmetro de 1 coluna, ligada a um slicer/botão "Expandir"
RETURN
IF(
    AND(Expandir = 0, ISFILTERED(tbPlanoContasGeral[Classificação_Usuário])),
    BLANK(),
    ...
)
```

É como a planilha implementa "ver total agregado por padrão, clicar pra abrir o detalhe por sub-classificação" sem precisar de duas tabelas/relatórios separados — uma tabela-parâmetro liga um slicer de 2 valores (Fechado/Aberto) que muda o comportamento da mesma medida. Vale explicitamente como ideia de UX pro Fase 3: um toggle "ver resumido / ver detalhado" no mesmo relatório em vez de duas telas.

---

## 7. Catálogo completo — 35 abas e 40 pivôs (reconciliação exata)

### 7.1 Todas as 35 abas, com visibilidade real (`xl/workbook.xml`)

| Aba | Visibilidade | Papel |
|---|---|---|
| Home | visível | landing/menu |
| Plan_Aux | oculta | staging |
| TabelaVazia | muito oculta | placeholder de tabela vazia (provável fallback de referência quebrada) |
| **Dashboard_Gerencial** | visível | relatório — Seção 3.8 |
| **FluxoCaixa** | visível | relatório — Seção 3.3 |
| FC_AUX | muito oculta | staging do Fluxo de Caixa |
| **DRE_Gráfica** | visível | relatório — waterfall, Seção 6.3 |
| **DRE_Tabular** | visível | relatório — DRE Analítico, Seção 3.2 |
| **DFC_Direto** | visível | relatório — "DFC Analítico" no menu, Seção 3.3 |
| **CAP_CAR** | visível | relatório — Contas a Pagar/Receber, Seção 3.4 |
| Dados_CP_CR | muito oculta | central de cálculo de CAP/CAR — Seção 3.4 |
| **Aging_Analitico** | visível | relatório — aging detalhado |
| Dash_dados | muito oculta | staging do Dashboard Gerencial |
| **Ponto_Equilibrio** | visível | relatório — Seção 3.5 / 6.4 |
| **Analise_Despesas** | visível | relatório — curva ABC, Seção 3.6 |
| **Centro_Custo** | visível | relatório — mini-P&L, Seção 3.6 |
| **Análises_Comparativas** | visível | relatório — AH/YoY/YTD, Seção 3.7 / 6.7 |
| Dados_YoY | muito oculta | staging da Análise Comparativa |
| **RealXBGT** | visível | relatório — Orçado × Realizado, Seção 3.9 |
| Dados_RealXBGT | muito oculta | staging de Orçado × Realizado |
| **Relat_Contas_Bancarias** | visível | relatório — extrato gerencial, Seção 3.9 |
| **Orcamento(BGT)_Simplificado** | visível | cadastro — `tbBGTSimples`, Seção 2.2 |
| **Orcamento(BGT)_Completo** | visível | cadastro — `fLctosBGT`, Seção 2.2 |
| Est_DRE | muito oculta | estrutura/staging do DRE (provável lar de `tbTotalizadoresDRE`) |
| Dados_DRE | muito oculta | staging do DRE |
| Tabela_Conversao | muito oculta | onboarding/importação, Seção 2.6 |
| Aux | muito oculta | staging genérico |
| Aux_PE | muito oculta | staging do Ponto de Equilíbrio |
| **Fornecedores_Clientes** | visível | cadastro — Seção 2.5 |
| **PlanoContas_Entradas** | visível | cadastro — Seção 2.4 |
| **PlanoContas_Saídas** | visível | cadastro — Seção 2.4 |
| **Cadastros_Gerais** | visível | cadastro — Seção 2.3 |
| **Config_Impressão** | visível | utilitário — menu "Impressão" |
| **Suporte** | visível | utilitário — FAQ |
| **Lançamentos** | visível | ledger — `fLctos`, Seção 2.1 |

18 visíveis / 17 ocultas ou muito ocultas (revisão do "~16 visíveis" da Seção 1 — a contagem exata é 18, incluindo Home/Config_Impressão/Suporte que são utilitárias, não "relatório" propriamente dito; 12 são relatório de fato).

### 7.2 Os 40 pivôs, por nome técnico (`xl/pivotTables/*.xml`)

Confirma a contagem da Seção 1 e dá o nome interno de cada um — útil porque os nomes técnicos revelam sub-relatórios que não aparecem como aba própria (ex.: `tbSomaEntreMesesMC` = evolução mensal de MC dentro do próprio Dashboard Gerencial, não uma aba separada):

`tbFC_Gerencial` (×2), `tbSomaCarCap`, `tbSomaContasAberto`, `tbAgingAnalitico`, `SomaCapCarporFx`, `tbEntradasSaidasSaldo`, `tbEntradasSaidasSaldoMeses`, `tb%Realizado`, `tbSomaSubclassSaidas`, `tbSomaSubclassEntradas`, `tbSomaPExMC`, `tbAnaliseDespesas`, `tbAnalisesYoY` (×2), `tbOrcxReal`, `tbTotalizadoresOrçadoeVariacao`, `tbTotalizadoresORCxREAL`, `tbRelatorioContaBancaria`, `tbDRE_Analitico`, `tbTotalizadoresWaterfallDRE`, `tbReceitasMCdoDRE`, `tbReceitaLiquidaLOeLLdoDRE`, `tbMCeMC%DRE`, `tbSomaReceitasGastosPE`, `tbSomaPE`, `tbSomaGeralPE`, `tbSomaGastosFixos`, `tbSomaEntreMesesMC`, `tbCARCAP_HJ`, `tbContasAbertoParticipante`, `tbAgeing`, `tbAgingPorParticipante`, `tbAtravoPrevistoFx`, `tbDFC_Analitico`, mais 3 sem nome customizado (`PivotTable1` ×2, `PivotTable4`, `Tabela dinâmica5`).

---

## 8. VBA — código-fonte completo recuperado (terceira extração, mesmo dia)

A tentativa anterior desistiu cedo demais ("precisaria de decompressor dedicado, indisponível"). Isso era verdade só por preguiça de implementar — o algoritmo de descompressão é público (**MS-OVBA §2.4.1**, compressão por container com tokens literal/copy) e `vbaProject.bin` é um **compound file OLE2 real** (assinatura `D0 CF 11 E0 A1 B1 1A E1`, confirmada por hexdump — diferente do container proprietário do `item.data`/Power Pivot da Seção 6). Implementei os dois algoritmos do zero (leitor de compound file OLE2 seguindo a cadeia de FAT/MiniFAT, e o descompressor MS-OVBA) e recuperei o **código-fonte VBA completo e limpo dos 46 módulos** (validado por assinatura: cada módulo decompilado começa literalmente com `Attribute VB_Name = "..."`, com >99% de caracteres imprimíveis).

**Confirmação central**: continua não havendo nenhuma regra de negócio em VBA que não esteja também no Data Model — a leitura completa do código não muda a conclusão da Seção 3/6, só a fortalece com certeza total em vez de inferência por fragmento. Mas o código revela **padrões de UX genuinamente valiosos**, que valem virar decisão de produto:

### 8.1 Cadastro relâmpago inline — o mesmo padrão que já usamos, confirmado como o certo

No formulário de lançamento (`FrmLctos`), ao sair de qualquer combobox (Conta, Centro de Custo, Forma de Pagamento) com um valor digitado que não existe no cadastro:

```vb
Private Sub Cbox_CTCusto_BeforeUpdate(...)
    Set R_Proc = PlanCad.Range("C:C").Find(Me.Cbox_CTCusto, , , xlWhole)
    If R_Proc Is Nothing Then
        Resp1 = MsgBox("Deseja cadastra-lo agora?", vbYesNo, "Novo centro de custo identificado.")
        If Resp1 = vbNo Then Exit Sub
        ' ...anexa o valor novo ao final da lista de Cadastros_Gerais
    End If
End Sub
```

O mesmo mecanismo se repete para Conta bancária e Forma de Pagamento. É **exatamente** o padrão de "criação rápida inline" que já implementamos pro combobox de pessoa (cliente/fornecedor) nos lançamentos — a validação externa confirma que é o padrão certo, e sinaliza uma melhoria real: hoje só pessoa tem esse atalho no nosso sistema; **centro de custo e forma de pagamento, se digitados como novo, ainda exigem ir em Configurações cadastrar antes** — vale estender o mesmo padrão pra esses dois.

### 8.2 Gate de onboarding — bloqueia lançar até o plano de contas existir

```vb
Private Sub UserForm_Click()
    AtualizacaoPC = Sheets("PlanoContas_Integrado").Range("I2")
    If AtualizacaoPC = 0 Then
        Resp1 = MsgBox("Cadastro de Plano de Contas Pendente! Deseja cadastrar agora?", vbYesNo, "AÇÃO NECESSÁRIA")
        If Resp1 = vbYes Then
            Unload Me
            Sheets("PlanoContas_Entradas").Select
        End If
    End If
End Sub
```

O formulário de lançamento se recusa a funcionar até o plano de contas ter sido confirmado como pronto, redirecionando o usuário pra tela de cadastro. No nosso sistema isso não é necessário do mesmo jeito porque já entregamos um plano de contas padrão pré-populado (Seção 5 já cobre essa decisão) — mas confirma que "não deixar o usuário lançar sem estrutura mínima" é uma preocupação real de produto, não só nossa.

### 8.3 Validação suave vs. dura — nem todo campo trava o mesmo jeito

```vb
Private Sub TBox_DataLcto_BeforeUpdate(...)      ' data de lançamento: BLOQUEIA (Cancel = True)
    If Not IsDate(Tbox_DataLcto.Value) Then
        Tbox_DataLcto.BackColor = rgbPink
        Cancel = True
    End If
End Sub

Private Sub TBox_Valor_BeforeUpdate(...)          ' valor: só pinta de rosa, NÃO bloqueia (Cancel comentado)
    If Not IsNumeric(TBox_Valor.Value) Then
        TBox_Valor.BackColor = rgbPink
        'Cancel = True
    End If
End Sub
```

Data de lançamento inválida trava o campo (não deixa sair); data de pagamento inválida só pinta (permite seguir, porque pagamento é opcional — condiz com "em aberto" da Seção 3.1); valor inválido também só pinta, nunca bloqueia. É uma hierarquia deliberada de severidade de validação por campo, não um "required" uniforme — vale replicar essa graduação (bloqueante vs. só-aviso) em vez de tratar toda validação de formulário como pass/fail.

### 8.4 Seletor de granularidade temporal — Diário/Semanal/Mensal/Trimestral/Anual como radio buttons

Fluxo de Caixa (`Planilha6`/aba `FluxoCaixa`) e Análise Comparativa (`Planilha1211`/aba `Análises_Comparativas`) têm radio buttons que fazem drill up/down na hierarquia de datas do pivô (Ano → Trimestre → Mês → Semana → Dia), mais um toggle "mostrar só o gráfico, esconder a grade de números". Confirma (já intuído na Seção 6.7 pelo `SOMAYTDPVSELECTED`/`ISFILTERED`) que a granularidade de tempo é um controle de primeira classe da UI, não só um detalhe de agrupamento da query — vale um seletor Dia/Semana/Mês/Trimestre/Ano explícito no nosso Fluxo de Caixa, não só o Regime.

### 8.5 Agrupamento de exportação em PDF (`modImpressaoRelatorios`) — confirma a taxonomia de relatórios

```
"dashboards"  = Dashboard_Gerencial, DRE_Gráfica, Ponto_Equilibrio, FluxoCaixa, CAP_CAR
"analíticos"  = DRE_Tabular, DFC_Direto, Centro_Custo, Relat_Contas_Bancarias, Aging_Analitico, Analise_Despesas
```

Essa divisão em dois grupos (visão executiva/gráfica vs. visão analítica/tabular) é uma pista de information architecture pra nossa própria seção de Relatórios — dá pra organizar por essa mesma lente (ex.: abas "Visão geral" / "Detalhado") em vez de uma lista plana de 12 relatórios.

### 8.6 O resto — confirmado como não-substancial

`Workbook_Open`/`Workbook_BeforeClose`: popup de boas-vindas/saída + auto-save, sem lógica. Zoom de formulário (`CommandButton3/4/8`): acessibilidade, salva a escala numa célula pra persistir entre sessões. `frmPrenchRapido`: helper de digitação rápida na grade (preenche classificação+subclassificação via VLOOKUP na célula ativa) — só relevante pro modo de edição direto em planilha, sem equivalente necessário numa UI de formulário real. `mod_Lançamentos`, `mod_CriarPlanoContas`, `mod_AtualizarReports`: **as três funções "grandes" que os nomes sugeriam interessantes** têm o corpo inteiro substituído por `MsgBox "Essa função está desativada na versão DEMO."` — a versão paga certamente tem lógica real aqui (provavelmente escrita direta na planilha via macro em vez de fórmula, dado que "Lançamentos" sugere inserção de linha assistida), mas essa cópia demo não permite recuperar o que era.

---

## 9. Plano de contas completo (extração célula a célula, não mais resumo)

Extração direta de `PlanoContas_Entradas`/`PlanoContas_Saídas` (compartilhando o mesmo layout: cada grupo é um bloco de 3 colunas — código, nome do grupo, e a lista de sub-itens abaixo). Confirma os 10 grupos de entrada e conta rigorosamente 20 grupos de saída (a Seção 1 já citava esse número). Estrutura por grupo (nome do grupo → contagem real de sub-itens nesta cópia demo, alguns claramente preenchidos com dado real do autor do template em vez de placeholder genérico — sinal de que o "molde vazio" comercial provavelmente tem menos exemplos que isso):

**Entradas** — 1.1 Saldo Inicial · 1.2 Transferências_Entradas · 1.3 Receitas com Produtos (8 sub-itens, ex.: "Serviços Prestados - Setup/Desenvolvimento Específico/SMS/SITE/Datamotor/Cloud/TEF") · 1.4 Receitas Financeiras (3: Juros Recebidos, Rendimento sobre Aplicações, Descontos Obtidos) · 1.5 Outras Receitas e Despesas não Operacionais · 1.6 Entradas não Operacionais (5: Empréstimos obtidos, Capitalização dos sócios, Venda de equipamentos usados, Outras entradas não operacionais, Aportes financeiros) · 1.7–1.9 Receitas Não Operacionais I/II + Outras receitas II (placeholders genéricos "NÃO USAR") · 1.10 Outras receitas I.

**Saídas** — 2.1 Transferências_Saídas · 2.2 Despesas com Pessoal - Salários (11 sub-itens: Pró-Labore, Salários e Ordenados, INSS, FGTS, Estágio, Horas Extras, Indenizações, Adicional Noturno, Sobre-aviso, Gratificações ×3, Recuperação, Produtividade, Diárias, Auxílio Educação) · 2.3 Provisão (13º/Férias e seus encargos) · 2.4 Benefícios (PAT, Vale Transporte, Convênio Médico, Seguro de Vida) · 2.5 Outras Despesas Pessoal (Recrutamento, Contribuição Sindical, Home Office) · 2.6 Serviços Terceirizados (Contratos PJ, Autônomos) · 2.7 Despesas Gerais (27 sub-itens confirmados: Aluguel, Condomínio, Honorários Contábeis/Advocatícios, Manutenção, Telefone/Internet, Correios, Viagens, Material de Escritório, Higiene/Limpeza, Copa/Cozinha, Legais e Judiciais, Energia Elétrica, Processamento de Dados, Estacionamento, Manutenção Predial, Telefonia, Bens de Pequeno Valor, Taxas de Homologação, Despesas Diversas, Custas Judiciais, Manutenção/Licença de Software — vários nomes de software específicos do autor do template) · 2.8 Custos com Profissionais · 2.9 Custos Cloud e SMS (Datacenter, Hospedagem) · 2.10 Tributos e Contribuições (IPTU, IOF, Multas Federais) · 2.11 Tributos sobre a Venda (Simples/PIS/COFINS/ISSQN, todos com prefixo "(-)" indicando dedução) · 2.12 Tributos sobre o Lucro (CSLL, IR, IR/CSLL Presumido) · 2.13 Outras Receitas/Despesas não Operacionais · 2.14 Despesas Financeiras (Juros Pagos, Despesas Bancárias, Descontos Concedidos, IR sobre Aplicação) · 2.15 Depreciação e Amortização · 2.16 Retirada de Lucros (Distribuição de Dividendos) · 2.17 Retirada de Lucros [variante duplicada, provável erro de template] · 2.18 Estornos · 2.19 Imobilizado (Maquinários) · 2.20 Outras despesas III (Acordos judiciais).

**Padrão de nomenclatura confirmado**: prefixo `( - )` em itens que são dedução dentro de um grupo predominantemente positivo (ex.: `( - ) Simples Nacional` dentro de Tributos sobre a Venda) — é assim que a planilha resolve "a maioria dos itens do grupo soma, mas este subtrai" sem precisar de uma coluna de sinal separada visível ao usuário (o sinal real fica em `Sinal_Calc`, Seção 6.8; o prefixo é só rótulo). Padrão de UX barato de adotar: nome da subcategoria pode conter a dica visual, mesmo com o sinal sendo dado estruturado por trás.

**Cadastros_Gerais confirmado célula a célula**: bate exatamente com a Seção 2.3 (Centro de Custo: Adm/Vendas com Tipo Produtivo/Não Produtivo; Unidade: Filial 1/2; Conta: BB/Itaú; Empresa: só 1 linha "SFB"; Forma de Pagamento: Pix/Cartão/Boleto/Dinheiro — confirma que Pix já era considerado forma de pagamento de primeira classe mesmo nesta versão antiga do template). `Tipo_Participante` continua sem nenhuma linha cadastrada, confirmando a fragilidade já apontada na Seção 2.5.
