# DRE — Matriz mensal, estrutura real da planilha e indicadores

## 1. Contexto

O DRE Tabular da Fase 3 mostra um único período (data início/fim), com uma estrutura de linhas inventada (3 linhas mínimas por padrão, 15 linhas na "cascata brasileira completa" oferecida como modelo opcional). O usuário pediu explicitamente para seguir a estrutura real do `tbTotalizadoresDRE` da planilha de referência — extraída célula a célula do `Est_DRE` (aba muito oculta) do arquivo `_planilha_extraida/Planilha Controle Financeiro 6.0.71_DEMO.xlsm` — e evoluir o DRE para uma matriz mês a mês com indicadores, no nível de sistemas concorrentes.

## 2. Estrutura real extraída (`tbTotalizadoresDRE`, B1:H29)

24 linhas de DRE (ordem 1–24) + 4 linhas auxiliares de DFC fora do DRE (ordem 25–28, `Tipo_Calc = 0`, excluídas deste ciclo):

| Ordem | Totalizador | Tipo_Calc | Waterfall | ID_DFC |
|---|---|---|---|---|
| 1 | Receitas operacionais | FOLHA | 1 | 1 |
| 2 | Devoluções | FOLHA | 2 | 2 |
| 3 | Tributos sobre a venda | FOLHA | 2 | 2 |
| 4 | Receita líquida | SUBTOTAL | 3 | — |
| 5 | Custos variáveis | FOLHA | 2 | 2 |
| 6 | Despesas variáveis | FOLHA | 2 | 2 |
| 7 | Margem de contribuição | SUBTOTAL | 3 | — |
| 8 | Lucro Bruto | SUBTOTAL_ALTERNATIVO | 3 | — |
| 9 | Custos fixos | FOLHA | 2 | 2 |
| 10 | Despesas fixas | FOLHA | 2 | 2 |
| 11 | EBITDA | SUBTOTAL | 3 | — |
| 12 | Depreciação e amortização | FOLHA | 2 | — |
| 13 | Lucro Operacional | SUBTOTAL | 3 | — |
| 14 | Receitas não operacionais | FOLHA | 4 | 3 |
| 15 | Receitas financeiras | (fora do DRE, `Tipo_Calc=0`) | — | 3 |
| 16 | Despesas não operacionais | FOLHA | 2 | 4 |
| 17 | Resultado não operacional | RESULTADO_NAO_OPERACIONAL | 5 | — |
| 18 | Lucro antes dos impostos | SUBTOTAL | 3 | — |
| 19 | Tributos sobre o lucro | FOLHA | 2 | 2 |
| 20 | Lucro líquido | SUBTOTAL | 2 | — |
| 21 | Investimentos em Imobilizado | FOLHA | 2 | — |
| 22 | Empréstimos e Dívidas | FOLHA | 2 | — |
| 23 | Retirada de Lucros | FOLHA | 0 | 6 |
| 24 | Lucro / Prejuízo Final | SUBTOTAL | 3 | — |

Linha 8 (Lucro Bruto) é uma rota paralela à linha 7 (Margem de Contribuição): ambas somam exatamente as mesmas linhas 1–6 — duas leituras (gerencial/contábil) do mesmo corte de custo variável, sem cálculo extra.

## 3. Escopo

**Dentro:**
- Migration: `linhas_dre.tipo` vira `tipo_calc` (FOLHA/SUBTOTAL/SUBTOTAL_ALTERNATIVO/RESULTADO_NAO_OPERACIONAL), + `waterfall_papel int` (0–5, salvo fielmente, não totalmente consumido pela UI ainda), + `id_dfc` (enum nullable: reclassificação futura pro DFC — não consumido nesta fase, mas grounded na fonte real, evita nova migration quando o DFC-por-atividade for construído).
- Template padrão do tenant (signup e "aplicar modelo") passa a ser as 24 linhas reais, substituindo os templates inventados (mínimo de 3 e cascata genérica de 15).
- Backfill dos 3 tenants de teste para a estrutura real, preservando vínculos de categoria óbvios.
- `buscarDREMatriz(tenantId, regime, ano)`: 12 colunas (Jan–Dez) + Total anual + AV% (base = Receitas operacionais do ano), uma leitura só de `buscarMovimento` pro ano inteiro, agrupada por mês no servidor.
- `buscarDREIndicadores`: série mensal de MC%, Margem Bruta%, EBITDA%, Margem Líquida% — todas derivadas de linhas já existentes na matriz (nenhum cálculo novo), viram um gráfico de linha (dashboard) acima da matriz.
- UI da matriz: primeira coluna fixa, scroll horizontal, estilo por `tipo_calc` (reaproveita paleta: subtotal=teal/coral por sinal, subtotal alternativo=violeta, resultado não operacional=âmbar), toggle resumido/detalhado já existente.
- Seletor de Ano substitui o range de data genérico só nesta página (não faz sentido pra uma grade anual).
- Cascata (waterfall) mantém a implementação atual de 2 papéis (barra cheia/delta) — não modela os 6 valores reais de `waterfall_papel` nesta fase; a coluna fica salva para uso futuro.
- Configurações → Estrutura de DRE: seletor de tipo atualizado para os 4 valores reais, badges coloridas por tipo.

**Fora:** DFC por atividade (usa `id_dfc`, fica para quando o Fluxo de Caixa for revisitado), 6 papéis de waterfall distintos, edição de `waterfall_papel`/`id_dfc` pela UI (ficam auto-atribuídos pelo template, não editáveis manualmente nesta fase).

## 4. Indicadores (taxas) — grounded, sem invenção

| Indicador | Fórmula | Linha-fonte |
|---|---|---|
| MC% | Margem de contribuição ÷ Receita líquida | linha 7 ÷ linha 4 |
| Margem Bruta% | Lucro Bruto ÷ Receita líquida | linha 8 ÷ linha 4 |
| EBITDA% | EBITDA ÷ Receita líquida | linha 11 ÷ linha 4 |
| Margem Líquida% | Lucro líquido ÷ Receita líquida | linha 20 ÷ linha 4 |

Todas expostas como série mensal (12 pontos) num `LineChart`, mesma grade/tooltip do `FluxoChart` já estabelecido.

## 5. Testes

- Regressão: waterfall chart e DRE tabular de período único continuam corretos após a troca de enum (via um período único dentro do ano da matriz, valores batem).
- Matriz: soma das 12 colunas de uma linha Folha bate com o Total anual; AV% de "Receitas operacionais" é sempre 100%.
- Migração: os 3 tenants de teste mantêm os totais agregados que já existiam (a soma das categorias vinculadas às antigas linhas "Receita Bruta"/"Despesas" bate com a soma das novas linhas 1/6 após backfill).
