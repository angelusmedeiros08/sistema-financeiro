# Ponto de Equilíbrio, indicadores gauge, Top categorias e módulo de Orçamento

## 1. Contexto

Revisão do que está implementado vs. a planilha de referência (`docs/mapeamento-planilha-controle-financeiro.md`, Seção 3.8 "Dashboard Gerencial", 13 gráficos) encontrou lacunas concretas de visualização:

- `buscarEvolucaoPontoEquilibrio()` já existe em `lib/relatorios/ponto-equilibrio.ts` mas nunca é chamada por nenhuma tela — Ponto de Equilíbrio hoje é só um número num card da Visão Geral, sem página própria, sem gráfico de evolução, sem o slicer de base da MC% (Receita Líquida vs. Receita Operacional) que a planilha original tinha (`tbReceitaBaseAV`).
- Os 4 indicadores gauge da planilha (%Realizado de CAP, %Realizado de CAR, %Pago em atraso de CAP, %Pago em atraso de CAR) não existem — nem o dado calculado, nem componente de gauge (nenhum existe no sistema hoje).
- Top receitas/Top despesas por categoria hoje é só tabela com barra de progresso CSS (`relatorios/despesas/page.tsx`) — a planilha original tinha isso como gráfico de participação de verdade, e só cobre despesas (`analise-despesas.ts` filtra só `tipo = DESPESA`).
- O 13º gráfico da planilha, Orçado × Realizado (`RealXBGT`), depende de um módulo de Orçamento que não existe — nenhuma tabela, nenhuma tela de meta mensal por categoria.

Decisões de escopo já validadas com o usuário: o módulo de Orçamento entra neste mesmo ciclo (não fica para depois); o alerta automático de estouro de orçamento fica fora (nenhum concorrente pesquisado — Omie, Nibo, QuickBooks — tem isso nativo, não é urgência de paridade); granularidade do orçamento é categoria × mês (mesmo grão que Omie/Nibo usam na prática).

Três decisões visuais foram validadas com mockups reais no navegador (companion de brainstorming), não descritas só em texto:
- **Gauges**: medidor linear com zonas coloridas (verde/âmbar/vermelho), não velocímetro circular — mesma linguagem visual já usada em `AgingBarras`.
- **Top receitas/despesas**: gráfico de rosca (donut), não ranking em barra nem treemap.
- **Cadastro de orçamento**: grade estilo planilha (categoria × 12 meses, células editáveis, atalho "copiar pro resto do ano"), não formulário um valor por vez — mesmo padrão já validado na Matriz do DRE.

## 2. Escopo

**Dentro:**
- Página dedicada `/relatorios/ponto-equilibrio` (9º item do sub-nav de Relatórios).
- Componente `IndicadorGauge` (medidor linear com zonas) e os 4 indicadores calculados, expostos no Painel e na Visão Geral de Relatórios.
- Componente `TopCategoriasDonut` e extensão de `analise-despesas.ts` para cobrir receitas também.
- Módulo de Orçamento completo: schema, tela de cadastro (Configurações → Orçamento), relatório Orçado × Realizado (`/relatorios/orcado-realizado`, 10º item do sub-nav).

**Fora:** alerta automático de estouro de orçamento (motor de notificação fica para um ciclo separado); orçamento por centro de custo (só categoria × mês nesta fase); custas processuais e split de honorários (gaps identificados separadamente, ciclos futuros).

## 3. Ponto de Equilíbrio — página dedicada

`buscarPontoEquilibrio()` ganha um parâmetro `baseMC: "receita_liquida" | "receita_operacional"` (hoje fixo em "receita total do período", per comentário explícito no código atual) — replica o slicer `tbReceitaBaseAV` da planilha, que alterna `MC% = MC / Receita Líquida` ou `MC% = MC / Receitas Operacionais` (Seção 6.4 do mapeamento, fórmula DAX `SWITCH(BASEAV, ...)`).

Layout da página (mesmo padrão `rounded-2xl border p-6` das outras 8 páginas de relatório):
- Toggle de base da MC% no topo (mesmo estilo dos toggles de Regime já existentes).
- 3 cards de resumo: Ponto de Equilíbrio do mês atual (R$), MC% atual, margem de segurança (quanto a receita do mês está acima/abaixo do PE, em % e R$).
- Gráfico de linha com 2 séries (evolução do PE em R$, evolução da MC% em %, dois eixos Y) — 12 meses do ano selecionado, reaproveita `buscarEvolucaoPontoEquilibrio()`.

## 4. Indicadores gauge — Painel e Visão Geral

4 indicadores, todos com fórmula direta a partir de dado já existente:

| Indicador | Fórmula | Fonte |
|---|---|---|
| %Realizado de CAP | baixado no mês ÷ total a pagar no mês | `parcelas`/`baixas`, mesmo filtro de `aging.ts` |
| %Realizado de CAR | recebido no mês ÷ total a receber no mês | idem, tipo RECEITA |
| %Pago em atraso de CAP | baixas com `data_pagamento > data_vencimento` ÷ total de baixas do mês | nova query, compara as duas datas já existentes em `parcelas`/`baixas` |
| %Pago em atraso de CAR | idem, tipo RECEITA | idem |

Componente `IndicadorGauge({ rotulo, valor, zonas, invertido })`: barra horizontal com fundo em 3 zonas de cor (vermelho/âmbar/verde) e uma barra sólida sobreposta até o valor atual — validado no mockup. `invertido` inverte a ordem das zonas (verde→vermelho vira vermelho→verde), necessário porque "%Pago em atraso" é bom quando **baixo**, diferente de "%Realizado" que é bom quando **alto**.

Faixa de 4 gauges lado a lado no topo do Painel (`app/(app)/painel/page.tsx`) e da Visão Geral de Relatórios — fecha o gap já identificado de "Painel mais pobre em visualização que a Visão Geral de Relatórios".

## 5. Top receitas / Top despesas — gráfico de rosca

`buscarAnaliseDespesas` hoje tem `tipo = "DESPESA"` fixo em dois pontos (filtro de categoria e de linha) — ganha um parâmetro `tipo: "RECEITA" | "DESPESA"` pra virar `buscarAnaliseCategorias`, reaproveitada pelos dois lados. Passa a alimentar dois lugares:
- A tabela curva ABC já existente (sem mudança).
- Componente novo `TopCategoriasDonut`: rosca com até 6 fatias (5 maiores categorias + "Outras" agregando o resto), valor total no centro, legenda lateral com R$ e %. Duas instâncias na Visão Geral (Top receitas, Top despesas).

## 6. Módulo de Orçamento

**Schema** — tabela `orcamentos`: `id`, `tenant_id`, `categoria_id` (FK `categorias_financeiras`), `competencia` (date, sempre dia 1 do mês), `valor_previsto` numeric, `criado_por`. Unique `(tenant_id, categoria_id, competencia)`. RLS no mesmo padrão de sempre — policy de UPDATE explícita desde o início (lição do `017`), e `cliente_portal` sem nenhum acesso (é estrutura de planejamento interno, mesmo tratamento dado a `linhas_dre` na migration `038`).

**Cadastro** — `Configurações → Orçamento`, ao lado de Estrutura de DRE no menu. Grade categoria (linha) × 12 meses (coluna) do ano selecionado, célula editável com autosave (mesmo padrão visual da Matriz do DRE: coluna fixa, `formatarNumeroCompacto`, fonte compacta). Botão por linha "copiar valor de Jan pro resto do ano" — resolve o caso comum (meta constante) sem preencher célula por célula.

**Relatório Orçado × Realizado** — `/relatorios/orcado-realizado`, reaproveita `buscarMovimento`/`buscarDREMatriz` pro realizado e casa contra `orcamentos` por categoria/mês. Visual: barras lado a lado (previsto vs. realizado) por categoria, coluna de desvio % destacada (vermelho acima do previsto em despesa, verde dentro do previsto — invertido pra receita, mesma lógica de "bom quando alto/baixo" do gauge).

## 7. Navegação

Sub-nav de Relatórios: Visão geral, DRE, Fluxo de caixa, Centro de custo, Aging, Análise de despesas, **Ponto de Equilíbrio**, **Orçado × Realizado**, Comparativos, Contas bancárias (8 → 10 itens). Configurações ganha **Orçamento**.

## 8. Testes

- Ponto de Equilíbrio: alternar o toggle de base muda o valor exibido e bate com o cálculo manual (MC ÷ Receita Líquida vs. MC ÷ Receita Operacional) num tenant de teste com as duas receitas diferentes.
- Gauges: `invertido` inverte corretamente a leitura de cor (um %Pago em atraso alto aparece vermelho, um %Realizado alto aparece verde).
- Top categorias: soma das fatias da rosca bate com o total da curva ABC da mesma categoria/período; "Outras" aparece só quando há mais de 6 categorias com movimento.
- Orçamento: grade salva célula a célula sem exigir submit da linha inteira; "copiar pro resto do ano" não sobrescreve mês já preenchido manualmente sem confirmação; Orçado×Realizado bate exatamente com a soma manual de 2-3 categorias num mês de teste.
- Regressão: Painel e Visão Geral continuam carregando sem erro de console depois de adicionar os 4 gauges + 2 roscas; nenhuma tela existente perde dado ao estender `analise-despesas.ts` pra receitas.
