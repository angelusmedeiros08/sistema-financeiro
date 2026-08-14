# DFC por Atividade — Fluxo de Caixa Operacional × Investimento × Financiamento

## 1. Contexto

O mapeamento da planilha de referência (`docs/mapeamento-planilha-controle-financeiro.md`, Seção 3.3/6.6) documenta o "DFC Analítico": Previsto/Realizado/Variação por mês, quebrado nas atividades Operacional/Investimento/Financiamento + Geração de Caixa. O spec da DRE Matriz (`2026-08-14-dre-matriz-mensal-design.md`, Seção 3) já deixou isso fora de escopo de propósito, mas preparou o terreno: toda linha de `linhas_dre` já carrega um `id_dfc` (enum `OPERACIONAL_ENTRADA`/`OPERACIONAL_SAIDA`/`NAO_OPERACIONAL_ENTRADA`/`NAO_OPERACIONAL_SAIDA`/`INVESTIMENTO`/`FINANCIAMENTO`), preenchido no provisionamento do tenant. Este ciclo fecha esse gap: nenhuma migration de `eventos_financeiros`/`parcelas`, é uma leitura nova sobre dado que já existe.

## 2. Escopo

**Dentro:**
- Correção de dado: `MODELO_COMPLETO_DRE` (`lib/relatorios/dre.ts`) tem duas linhas com `idDfc: null` que deveriam ter valor — "Investimentos em Imobilizado" (ordem 21) → `INVESTIMENTO`, "Empréstimos e Dívidas" (ordem 22) → `FINANCIAMENTO`. Migration de backfill para tenants existentes (por `ordem`, não por rótulo — rótulo pode ter sido editado).
- `lib/relatorios/dfc.ts` (novo): `buscarDFCMatriz(tenantId, ano)` — 4 linhas fixas (Operacional/Investimento/Financiamento/Geração de Caixa), 12 meses, cada mês com Previsto + Realizado + Variação R$, mais total do ano.
- `Configurações → Estrutura de DRE`: campo "Atividade de DFC" no formulário de nova linha (`NovaLinhaDreForm`) e na edição — hoje uma linha nova nasce com `id_dfc: null` e fica invisível pro relatório, sem aviso. Server (`criarLinhaDre`) passa a aceitar `idDfc` opcional.
- `/relatorios/dfc` (nova página) + entrada na sub-nav de Relatórios, entre DRE e Centro de custo.

**Fora:**
- Editar `id_dfc` das 24 linhas padrão pela UI (ficam fixas pelo modelo, mesma regra das contas "sistema" do Plano de Contas — plausível pedido futuro, não agora).
- Granularidade Dia/Semana/Trimestre — o relatório é mensal fixo, como o `DFC_Direto` da planilha (`RelatoriosControles` não é usado aqui, só um seletor de Ano como a DRE).
- Gráfico (a planilha tem barras Operacional/Investimento/Financiamento no Dashboard Gerencial — fica para quando a Visão Geral for revisitada).

## 3. Cálculo

Sem cascata (a DFC por atividade não é hierárquica — é soma plana por atividade). Reaproveita `buscarMovimento` (`lib/relatorios/regime.ts`) chamado duas vezes por período (regime `previsto` = `data_vencimento`, regime `realizado` = `data_pagamento`), igual ao que `/fluxo-caixa` já faz na aba "Previsto × Realizado".

```
buscarDFCMatriz(tenantId, ano):
  linhas = linhas_dre WHERE tenant_id = tenantId AND id_dfc IS NOT NULL
    (com linha_dre_categorias → categoria_id)
  categoriaParaAtividade = Map<categoria_id, Atividade>
    onde Atividade = dobrarNaoOperacional(linha.id_dfc)
    dobrarNaoOperacional: OPERACIONAL_* | NAO_OPERACIONAL_* → "OPERACIONAL"
                           INVESTIMENTO → "INVESTIMENTO"
                           FINANCIAMENTO → "FINANCIAMENTO"

  para cada regime em [previsto, realizado]:
    movimento = buscarMovimento(tenantId, regime, ano-01-01, ano-12-31)
    para cada linha de movimento com categoriaId em categoriaParaAtividade:
      mes = mês da data
      atividade = categoriaParaAtividade[categoriaId]
      somaPorAtividadeMes[atividade][mes][regime] += valorComSinal(linha)

  geracaoCaixa[mes][regime] = soma das 3 atividades em mes/regime

  retorna 4 linhas: OPERACIONAL, INVESTIMENTO, FINANCIAMENTO, GERACAO_CAIXA
    cada uma com { rotulo, mesesPrevisto[12], mesesRealizado[12], totalPrevisto, totalRealizado }
```

"Geração de Caixa" = soma de tudo com `id_dfc` não nulo — não é a lista de exclusão por nome que a planilha usa (Seção 6.6 do mapeamento already recomenda isso: "essa exclusão deveria ser uma flag na estrutura do plano de contas, não uma lista de nomes hardcoded"). Diferença prática: **inclui** Retirada de Lucros como saída de Financiamento (a planilha esconde essa linha da métrica) — mais correto para uma DFC de verdade, onde distribuição de lucro é atividade de financiamento.

Categorias sem `id_dfc` (ex.: vinculadas só a linhas SUBTOTAL, que não têm atividade) não entram em nenhuma soma — comportamento correto, evita contar duas vezes.

## 4. Estrutura de DRE — campo novo

`NovaLinhaDreForm` ganha um segundo `<Select name="id_dfc">` com as 6 opções do enum (rótulos amigáveis: "Operacional (entrada)", "Operacional (saída)", "Não operacional (entrada)", "Não operacional (saída)", "Investimento", "Financiamento") mais "Nenhuma (não afeta caixa)" como padrão — mantém a granularidade real do enum em vez de inventar um mapeamento com perda de informação. `criarLinhaDre(supabase, { tenantId, rotulo, tipoCalc, idDfc? })` grava o campo; `LinhaDreItem` (linha já criada) ganha o mesmo select para edição, reaproveitando o padrão de auto-submit por `onValueChange` já usado ali para vincular/desvincular categoria.

## 5. UI — `/relatorios/dfc`

Mesmo shell da DRE (`h1` + `RelatoriosSubNav` + card `rounded-2xl border bg-card p-6`), sem regime/granularidade (o relatório inteiro já é "previsto × realizado"), só o stepper de Ano.

Tabela por atividade (4 linhas fixas, sem indentação/hierarquia): 12 grupos de colunas (um por mês), cada grupo com 3 sub-colunas — Previsto, Realizado, Variação R$ (`realizado - previsto`, teal se ≥0, coral se <0 — mesma paleta de sinal já usada nos totais da DRE, sem julgar se a atividade "deveria" ser positiva) — mais Total do ano nas mesmas 3 sub-colunas. "Geração de Caixa" em negrito com fundo `bg-muted/40`, igual ao tratamento dado a linhas de grupo no Plano de Contas.

## 6. Testes

- Migration: as 24 linhas padrão de um tenant novo têm `id_dfc` preenchido em todas as linhas `FOLHA` exceto Depreciação/Amortização (que é explicitamente não-caixa) — nenhuma `FOLHA` órfã sem atividade.
- Backfill: tenants existentes com as linhas 21/22 sem categoria vinculada não quebram (soma zero é esperado, não erro).
- `buscarDFCMatriz`: soma das 3 atividades por mês bate com Geração de Caixa do mesmo mês, nos dois regimes; total anual de cada atividade bate com a soma dos 12 meses.
- Regressão: criar uma nova linha DRE sem escolher atividade continua funcionando (idDfc null, linha simplesmente não aparece na DFC) — não quebra o formulário existente nem a DRE.
