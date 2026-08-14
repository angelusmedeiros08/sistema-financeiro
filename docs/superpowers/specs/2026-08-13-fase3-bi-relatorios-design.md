# Design — Fase 3: BI/Relatórios (motor de regime + DRE configurável)

## 1. Contexto

Fase 3 do roadmap já era declarada como "BI avançado — orçado×realizado, YoY, ponto de equilíbrio, aging" desde a spec de fundação (`2026-08-12-fundacao-nucleo-financeiro-design.md`). Antes de desenhar, refiz o mapeamento da planilha de referência ("Planilha Controle Financeiro 6.0") a fundo — não mais por comportamento observado, mas por extração direta do binário: DAX real das medidas (recuperado de dentro do Data Model do Power Pivot) e código-fonte VBA completo (recuperado com um leitor de compound file OLE2 e um descompressor MS-OVBA escritos para esta pesquisa, já que a tentativa anterior tinha desistido cedo demais). Os dois documentos de mapeamento (`docs/mapeamento-planilha-controle-financeiro.md`, seções 6-9, e `docs/mapeamento-conta-azul-produto-ui.md`, §5-8) são o insumo de base desta spec.

**Decisão de sequenciamento** (validada com o usuário): a Fase 3 se divide em dois ciclos. Este ciclo cobre **todo o catálogo de relatórios que não depende de um cadastro de Orçamento ainda inexistente** — que é quase tudo. Um ciclo seguinte, menor, entrega Orçamento (cadastro de meta por categoria/centro de custo/mês, na mesma granularidade do lançamento real) e o único relatório que depende dele, Orçado×Realizado.

Escopo adicional pedido explicitamente pelo usuário e pelo sócio dele, fora do catálogo original da planilha: resumo de contas financeiras (saldo + a receber/pagar com quebra de vencidos/vencendo hoje) no Painel e em Configurações → Contas Financeiras.

## 2. Escopo desta fase

**Dentro do escopo** — cobre 100% do catálogo de relatórios da planilha, exceto Orçado×Realizado:

- Motor de regime (Competência/Previsto/Realizado) como parâmetro global da seção de Relatórios.
- DRE como estrutura de dado configurável (tabular + cascata/waterfall), com template padrão.
- Fluxo de Caixa (grade diária por conta + Previsto×Realizado mensal por atividade de DFC).
- Ponto de Equilíbrio (com base de MC% configurável).
- Aging Analítico (contas a pagar/receber por faixa de atraso).
- Análise de Despesas (curva ABC: tipo de gasto → categoria → subcategoria).
- Centro de Custo (mini-P&L por centro, com toggle resumido/detalhado).
- Análises Comparativas (AH/YoY/YTD).
- Relatório de Contas Bancárias (extrato gerencial por conta).
- Dashboard "Visão geral" da seção de Relatórios, reunindo os itens acima em forma resumida.
- Resumo de contas financeiras no Painel (vencidos/vencendo hoje) e nova aba "Visão geral" em Configurações → Contas Financeiras.
- Seletor de granularidade temporal (Dia/Semana/Mês/Trimestre/Ano) nos relatórios que fizerem sentido (Fluxo de Caixa, Análises Comparativas).
- Extensão do cadastro relâmpago inline (já usado para pessoa) para Centro de Custo e Forma de Pagamento nos formulários de lançamento — achado do VBA real da planilha (Seção 8.1 do mapeamento), confirma que é o padrão certo e que hoje está incompleto no nosso sistema.

**Fora do escopo desta fase** (ciclo seguinte):

- Módulo de Orçamento (cadastro de meta por categoria/centro de custo/mês).
- Relatório Orçado×Realizado (depende do item acima).
- Qualquer coisa de Vendas/Estoque/Produtos (Fase 4+, módulos do Conta Azul já mapeados e propositalmente adiados).

## 3. Modelo de dados

### 3.1 Duas views que substituem o `[SOMA_DF]` da planilha — grãos diferentes por regime

Achado da autorrevisão: uma view única não funciona pros 3 regimes ao mesmo tempo. Competência e Previsto são propriedade da *parcela* (uma data só, um valor só, o rateio já dá o grão certo). Realizado é propriedade da *baixa* — e uma parcela pode ter **múltiplas baixas** (pagamento parcial, Seção 5 do mapeamento da planilha já aponta isso como limitação dela, e é justamente uma das coisas que nosso sistema já resolve melhor desde a Fase 1). Um `LEFT JOIN` direto de `baixas` contra o grão de rateio faz fan-out: parcela com 2 baixas não-estornadas gera 2 linhas, cada uma carregando o valor **inteiro** do rateio — duplica o Realizado sempre que houve mais de um pagamento. Por isso, dois views, não um:

```sql
-- Competência e Previsto: grão = rateio de categoria (× centro de custo, se houver).
-- Um valor só por linha, nunca duplica.
create view vw_movimento_competencia_previsto as
select
  rc.tenant_id, ef.id as evento_financeiro_id, p.id as parcela_id,
  rc.categoria_id, rcc.centro_custo_id, ef.pessoa_id, ef.tipo,
  coalesce(rcc.valor, rc.valor) as valor,
  ef.data_competencia, p.data_vencimento, p.status
from rateio_categoria rc
join eventos_financeiros ef on ef.id = rc.evento_financeiro_id
join parcelas p on p.evento_financeiro_id = ef.id
left join rateio_centro_custo rcc on rcc.rateio_categoria_id = rc.id;

-- Realizado: grão = baixa × rateio de categoria. O valor pago de CADA baixa é
-- rateado proporcionalmente entre as categorias da parcela (nunca o valor
-- cheio do rateio) — cobre pagamento parcial em datas diferentes corretamente.
create view vw_movimento_realizado as
select
  rc.tenant_id, ef.id as evento_financeiro_id, p.id as parcela_id, b.id as baixa_id,
  rc.categoria_id, rcc.centro_custo_id, ef.pessoa_id, ef.tipo,
  coalesce(rcc.valor, rc.valor) * (b.valor_pago / p.valor) as valor,
  b.data_pagamento
from baixas b
join parcelas p on p.id = b.parcela_id
join eventos_financeiros ef on ef.id = p.evento_financeiro_id
join rateio_categoria rc on rc.evento_financeiro_id = ef.id
left join rateio_centro_custo rcc on rcc.rateio_categoria_id = rc.id
where b.estornado_em is null;
```

O sinal (receita soma, despesa subtrai) vem de `ef.tipo`, que o sistema já carrega desde a Fase 0 — diferente da planilha, que precisa de uma coluna auxiliar de sinal (`Sinal_Calc`) porque nunca teve essa informação na linha. Nenhuma tabela nova de fato duplicando dado: são views, sempre leem o razão atual. Cada relatório escolhe qual view consultar (e, dentro dela, qual data agrupar quando aplicável) conforme o parâmetro `regime` — a mesma mecânica do `[SOMA_DF]` (Seção 6.1 do mapeamento), só que resolvida na escolha da view/agrupamento em vez de um `SWITCH` de DAX.

### 3.2 `linhas_dre` — estrutura do DRE como dado, não fórmula

```sql
create type tipo_linha_dre as enum ('FOLHA', 'SUBTOTAL');

create table linhas_dre (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ordem int not null,
  rotulo text not null,
  tipo tipo_linha_dre not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, ordem)
);

create table linha_dre_categorias (
  linha_dre_id uuid not null references linhas_dre(id) on delete cascade,
  categoria_id uuid not null references categorias_financeiras(id) on delete cascade,
  primary key (linha_dre_id, categoria_id)
);
```

Linha `FOLHA` soma direto `vw_movimento_competencia_previsto` ou `vw_movimento_realizado` (conforme o regime ativo) filtrado pelas categorias vinculadas em `linha_dre_categorias`. Linha `SUBTOTAL` não tem categoria vinculada — seu valor é `SUM(valor_folha) OVER (ORDER BY ordem ROWS UNBOUNDED PRECEDING)`, uma window function que soma tudo que veio antes na ordem. É a tradução exata do `ACUMULADA = CALCULATE([SOMA_DF], Ordem <= atual)` real que recuperei do DAX (Seção 6.2/6.3 do mapeamento) — como só linhas `FOLHA` têm categoria vinculada (logo, só elas contribuem valor não-nulo), a soma cumulativa nunca conta um subtotal duas vezes, sem precisar de recursão. A mesma estrutura alimenta a visão tabular (mostra o acumulado) e o waterfall (mostra o delta de cada `FOLHA`, com a base flutuante calculada pelo componente de gráfico a partir da mesma ordem) — não existem dois modelos de DRE, só duas formas de desenhar o mesmo dado.

**Template padrão por tenant**: na criação do tenant, 3 linhas mínimas e já funcionais — `Receita Bruta` (FOLHA, vinculada automaticamente a toda categoria `tipo = RECEITA` já cadastrada), `Despesas` (FOLHA, toda categoria `tipo = DESPESA`), `Resultado` (SUBTOTAL). Garante um DRE correto desde o primeiro lançamento, sem exigir configuração antes de mostrar número. Em Configurações → Estrutura de DRE, um botão "Aplicar modelo completo" oferece a cascata brasileira padrão (Receita Bruta → Deduções → Receita Líquida → CMV → Lucro Bruto → Despesas Operacionais → EBITDA → D&A → EBIT → Resultado Financeiro → LAIR → IR/CSLL → Lucro Líquido) como ponto de partida — o usuário ainda precisa redistribuir suas categorias entre as linhas mais finas, mas não parte de uma tela em branco.

### 3.3 Regime e granularidade — parâmetros globais via URL, não estado de cliente

`?regime=competencia|previsto|realizado&granularidade=dia|semana|mes|trimestre|ano`, lidos via `searchParams` nos server components de `/relatorios/**`. Persistem ao navegar entre relatórios dentro da seção (link, não estado React) e são compartilháveis/atualizáveis por URL — mesmo efeito do slicer global "Regime" da planilha, sem precisar de contexto de cliente.

## 4. UI

### 4.1 Sidebar e navegação

Item "Relatórios" da sidebar (hoje desabilitado, "em breve") passa a ativo. Duas sub-abas, mesma taxonomia encontrada no agrupamento de exportação em PDF do VBA real (Seção 8.5 do mapeamento):

- **Visão geral**: stat cards de saldo/a receber/a pagar (vencidos/vencendo hoje), Fluxo de Caixa, DRE em cascata (waterfall), Ponto de Equilíbrio, Aging resumido.
- **Detalhado**: DRE Tabular, Fluxo de Caixa (aba Diário / aba Previsto×Realizado mensal), Centro de Custo, Aging Analítico, Análise de Despesas, Análises Comparativas, Contas Bancárias.

Seletor de Regime e de Granularidade fixos no topo da seção, comuns às duas abas.

### 4.2 Ajustes fora da seção de Relatórios

- `/painel`: cards de "A pagar"/"A receber" ganham a quebra vencidos/vencendo hoje (hoje só mostram total em 30 dias).
- `Configurações → Contas Financeiras`: nova aba "Visão geral" com o mesmo resumo, por conta bancária individual.
- Formulário de lançamento: combobox de Centro de Custo e de Forma de Pagamento ganham o mesmo fluxo de criação rápida inline que o combobox de pessoa já tem — clique em "Criar automaticamente" cria com o mínimo de dado, mesma UX, mesma ação de servidor por trás (`criarCentroCusto`/nova ação equivalente de forma de pagamento, se não existir).

### 4.3 Linguagem visual — estende a paleta existente, não introduz nova

`StatCard` e `FluxoChart` já estabelecem violeta `#6A56D8` / coral `#D8583A` / âmbar `#C98A1F` / teal `#157F6B`, Recharts temátizado por CSS var. Regra: nenhum gráfico novo usa cor fora dessa paleta, só reaproveita com papel semântico (teal = positivo, coral = negativo/atraso, âmbar = atenção, violeta = neutro/destaque).

- **DRE cascata**: `BarChart` empilhado (série de base invisível + série de delta visível, colorida teal/coral por sinal) — técnica padrão de waterfall em Recharts, sem lib nova.
- **Indicadores %Realizado/%Atraso**: `RadialBarChart`, cor por faixa de severidade.
- **Aging por faixa**: barra horizontal com gradiente de severidade âmbar→coral.
- **Ponto de Equilíbrio / Análises Comparativas**: `LineChart`/`AreaChart`, mesma grade/tooltip do `FluxoChart`.
- **Toggle resumido/detalhado**: um botão por relatório (Centro de Custo, DRE), não duas telas — achado da Seção 6.9 do mapeamento (padrão "expandir" da planilha).

## 5. Servidor

Novo módulo `src/lib/relatorios/`, um arquivo por relatório, mesmo padrão de `lib/pessoas/`/`lib/contabil/`: cada um exporta uma função `buscarX(supabase, { tenantId, regime, granularidade, periodo, filtros })` que escolhe a view certa pro regime pedido (`vw_movimento_competencia_previsto` ou `vw_movimento_realizado`) e/ou `linhas_dre` para o DRE, e devolve dado já tipado — toda agregação no servidor, componente React só apresenta. `src/app/(app)/relatorios/` com uma pasta por relatório, server components lendo `searchParams`.

Configuração de DRE: `lib/relatorios/linhas-dre.ts` com `criarLinhaDre`/`reordenarLinhas`/`vincularCategoria`/`aplicarModeloCompleto`, tela em `Configurações → Estrutura de DRE`.

## 6. Segurança

`linhas_dre`/`linha_dre_categorias` seguem o mesmo padrão RLS já em vigor desde a Fase 2: INSERT/UPDATE exigem papel `admin/financeiro_senior/financeiro_junior/contador`; SELECT aberto a qualquer papel do tenant. As duas views (`vw_movimento_competencia_previsto`, `vw_movimento_realizado`) são sobre tabelas que já têm RLS — herdam a mesma proteção automaticamente (Postgres aplica RLS das tabelas base ao resolver a view), nenhuma policy nova necessária nelas. A seção de Relatórios não é exposta no portal do cliente nesta fase — é ferramenta interna da equipe do tenant, não do cliente final.

## 7. Testes

- Migration: `linhas_dre` populada com o template mínimo (3 linhas) em tenant novo; teste real via `DO` block confirmando que o acumulado da linha `Resultado` bate com a soma manual de lançamentos de teste.
- Regime: mesmo conjunto de lançamentos, os 3 regimes devem bater exatamente com os campos de data reais (comparação cruzada contra os dados de Despesas/Receitas já existentes no ambiente de dev).
- Pagamento parcial em `vw_movimento_realizado`: parcela com 2 baixas não estornadas em datas diferentes — a soma de Realizado no regime deve bater com a soma dos `valor_pago` de verdade (nunca com o valor total do rateio contado duas vezes). Teste direto do bug pego na autorrevisão desta spec.
- DRE: reordenar uma linha / vincular uma nova categoria em `linhas_dre` e confirmar que o acumulado recalcula sem deploy — é dado, não código.
- Cadastro relâmpago: criar Centro de Custo/Forma de Pagamento inline a partir do formulário de lançamento, confirmar que aparece imediatamente disponível pro próximo lançamento.
- Regressão: nenhuma página existente (Painel, Despesas, Receitas, Contas a Pagar/Receber) muda de comportamento — os ajustes no Painel são aditivos (quebra de vencidos/vencendo, sem remover o que já existe).

## 8. Riscos e decisões em aberto

- **`linhas_dre` com template mínimo, não a cascata completa por padrão** — decisão deliberada: preencher automaticamente as 15 linhas do modelo brasileiro completo sem categoria vinculada geraria um DRE com a maioria das linhas zeradas, pior do que os 3 níveis mínimos que já funcionam. O modelo completo fica um clique de distância (Configurações), não é o padrão.
- **View sem materialização** — em escala muito maior (milhares de tenants, milhões de lançamentos por tenant), pode exigir uma materialized view com refresh periódico para os relatórios mais pesados (DRE, Análises Comparativas). Não antecipado agora — decisão de performance a revisitar quando houver tráfego real, não antes.
- **Granularidade Semana** — a planilha implementa via hierarquia de data do Power Pivot; em SQL puro, `date_trunc('week', ...)` do Postgres usa semana ISO (segunda a domingo) — comportamento ligeiramente diferente do Excel (que pode variar por config regional), aceito como a definição correta para o sistema.

## 9. Fora de escopo desta fase, explicitamente

Orçamento (cadastro) e Orçado×Realizado (relatório), Vendas/Estoque/Produtos (Fase 4+), materialização/cache de relatório pesado, exposição de relatórios no portal do cliente.
