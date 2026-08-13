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
