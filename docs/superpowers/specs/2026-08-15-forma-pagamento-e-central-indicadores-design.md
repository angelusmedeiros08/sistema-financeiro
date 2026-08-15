# Forma de Pagamento (entidade) + Central de Indicadores — ciclo 1

## 1. Contexto

Primeiro ciclo de implementação da visão registrada em `docs/superpowers/specs/2026-08-15-central-de-indicadores-visao-design.md`. Cobre os 4 grupos de indicador que são pura agregação de dado já existente (concentração de receita, gasto por categoria com variação, PMR/PMP com aging, distribuição de forma de pagamento) — "saldo projetado com alerta de ruptura" fica pro próximo ciclo, por exigir lógica de projeção nova, não só leitura.

**Correção de schema descoberta durante o desenho**: `parcelas.metodo_pagamento` (texto livre, `lib/contabil/baixa.ts:167-174`) guarda só "o método usado por último" — comentário no próprio código já documenta essa limitação. Pra um indicador agregado de distribuição de forma de pagamento, isso está errado: se uma parcela tiver duas baixas parciais com métodos diferentes, uma delas desaparece. A fonte de verdade correta é a baixa (o evento de pagamento), não a parcela.

## 2. Escopo

**Dentro:**
- Migration: tabela `formas_pagamento` (mesmo shape de `centros_custo`: id, tenant_id, nome, ativo, criado_em) + coluna `baixas.forma_pagamento_id` (FK nullable, `on delete set null`).
- `lib/contabil/formas-pagamento.ts` + `-actions.ts`: CRUD igual ao de Centro de Custo (`listar`, `criar`, `alternarAtivo`).
- `formulario-baixa.tsx`: combobox de forma de pagamento com criação rápida inline (mesmo componente/padrão de `centro-custo-combobox.tsx`), substituindo o `<Input name="metodo_pagamento">` de texto livre. `registrarBaixa()` (`lib/contabil/baixa.ts`) passa a gravar `forma_pagamento_id` na baixa; o update em `parcelas.metodo_pagamento` (texto) continua existindo só por compatibilidade de exibição no detalhe da parcela, não é mais fonte de indicador.
- `Configurações → Formas de Pagamento`: página CRUD nova, mesmo padrão visual de Centros de Custo, entrada na sub-nav de Configurações.
- 4 funções novas de indicador em `lib/relatorios/` (Seção 4).
- `/indicadores` (nova página, novo item top-level na sidebar após Relatórios) — 4 cards, um por pergunta de negócio (Seção 5).
- Visão Geral (`/relatorios/visao-geral`): 1 badge novo de concentração de risco, só visível se nível médio/alto.

**Fora:**
- Saldo projetado com alerta de ruptura (próximo ciclo).
- Backfill de `parcelas.metodo_pagamento` (texto histórico) para `formas_pagamento` — os indicadores desta fase olham só baixas novas, com dado antigo aparecendo como "Não informado"; migrar texto pra entidade por heurística de nome fica de fora, risco de match errado maior que o benefício.
- Seletor de regime/granularidade no módulo Indicadores — cada card usa a janela fixa que faz sentido pra pergunta dele (Seção 5), não o controle configurável do resto de Relatórios.

## 3. Modelo de dados

```sql
create table formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
-- RLS: mesma policy de centros_custo (select/insert/update por tenant_id, staff-only em write)

alter table baixas add column forma_pagamento_id uuid references formas_pagamento(id) on delete set null;
```

Provisionamento de tenant novo ganha 4 formas padrão (Pix, Boleto, Cartão, Dinheiro — mesmos 4 que já aparecem como exemplo em `Cadastros_Gerais` na planilha de referência, Seção 9 do mapeamento), `sistema: false` (editável, sem trava — diferente do padrão "sistema" do Plano de Contas, aqui não há código fixo no ledger dependendo do nome).

## 4. Servidor — indicadores

Todos em `lib/relatorios/`, reaproveitando `buscarMovimento`/regime onde possível (nunca reabrindo query nova pro que já existe).

**`concentracao-receita.ts` — `buscarConcentracaoReceita(tenantId, mesesJanela = 12)`**
```
movimento = buscarMovimento(tenantId, "competencia", hoje − mesesJanela, hoje), filtrado tipo=RECEITA
soma por pessoaId (sem pessoa vinculada agrupa em "Sem pessoa")
total = soma geral
top3 = 3 maiores, percentualTop3 = soma(top3) / total
nivelRisco = percentualTop3 >= 0.5 ? ALTO : percentualTop3 >= 0.3 ? MEDIO : BAIXO
retorna { topClientes: [{pessoaId, nome, valor, percentual}] (top 5), percentualTop3, nivelRisco }
```

**`variacao-categorias.ts` — `buscarVariacaoCategorias(tenantId, tipo)`**
Reaproveita o mesmo `somaPorCategoria` que `buscarAnaliseCategorias` (`analise-despesas.ts`) já calcula, rodado duas vezes (mês corrente, mês anterior — mesmas janelas de `mesAtual()`). Retorna por categoria: `{ categoriaId, nome, valorMesAtual, valorMesAnterior, variacaoPercentual }`, ordenado por `|variacaoPercentual|` desc (maior desvio primeiro, não maior valor — é isso que torna o indicador acionável).

**`prazos-medios.ts` — `buscarPMR(tenantId, mesesJanela = 6)` / `buscarPMP(tenantId, mesesJanela = 6)`**
Mesma query-base de `buscarAging` (`aging.ts`): `parcelas` + `baixas(valor_pago, data_pagamento, estornado_em)`, mas filtrando baixas com `data_pagamento` dentro da janela (não parcelas em aberto). PMR/PMP = média de `(data_pagamento − data_vencimento)` em dias, **ponderada por `valor_pago`** (uma baixa de R$10.000 pesa mais que uma de R$50 na média — fórmula registrada em `docs/pesquisa-indicadores-contabeis-fundamentos.md`). Retorna `{ dias: number, quantidadeBaixas: number }`. Aging como indicador visual reaproveita `buscarAging` direto, sem função nova.

**`distribuicao-forma-pagamento.ts` — `buscarDistribuicaoFormaPagamento(tenantId, mesesJanela = 6)`**
```
fetch baixas (join formas_pagamento(nome), parcelas!inner(data_vencimento))
  where tenant_id, data_pagamento dentro da janela, estornado_em is null
agrupa por forma_pagamento_id (null vira "Não informado")
por forma: { nome, valorTotal, percentualDoTotal, atrasoMedioDias }
  atrasoMedioDias = média ponderada de (data_pagamento − data_vencimento), só das baixas dessa forma
ordenado por valorTotal desc
```

## 5. UI — `/indicadores`

Shell igual ao resto do app (`h1` + card `rounded-2xl border bg-card p-6` por seção), sem seletor de regime/período global — cada card já tem a janela certa embutida. Quatro seções, cada uma com um heading de pergunta (não de nome técnico de relatório):

- **"Meu risco está concentrado?"** — donut dos Top 5 clientes + badge de nível de risco (`bg-[#D8583A]/12` alto, `bg-[#C98A1F]/12` médio, `bg-[#157F6B]/12` baixo — mesma paleta semântica já usada em status de parcela).
- **"Onde meu dinheiro está indo?"** — duas listas (receita/despesa) das categorias com maior variação, valor + variação % com seta e cor (mesmo padrão de sinal já usado na DRE).
- **"Quem não paga em dia, e pra quem eu devo?"** — dois `IndicadorGauge`-like (componente já existe de Ponto de Equilíbrio) mostrando PMR e PMP em dias, mais o aging de `buscarAging` como mini-tabela abaixo.
- **"Como me pagam?"** — donut de distribuição de forma de pagamento (reaproveita `TopCategoriasDonut`, já existe) + lista com atraso médio por forma.

Sidebar (`sidebar.tsx`): novo item `{ href: "/indicadores", label: "Indicadores", icon: ChartBar (ou similar) }`, top-level, logo após "Relatórios" na lista (`ITENS_NAV`).

**Visão Geral**: badge de concentração de risco (reaproveita `buscarConcentracaoReceita`) perto do topo, só renderiza se `nivelRisco !== "BAIXO"`.

## 6. Testes

- Migration: tenant novo nasce com as 4 formas de pagamento padrão; `baixas.forma_pagamento_id` aceita null (dado histórico) sem quebrar leitura.
- `registrarBaixa()` com forma de pagamento nova (quick-create) grava `forma_pagamento_id` corretamente, `parcelas.metodo_pagamento` continua sendo atualizado (compatibilidade).
- Concentração: 3 clientes somando exatamente 50% da receita do período classificam como `MEDIO` (limite exclusivo, `>= 0.5` é `ALTO`).
- PMR: uma baixa paga 5 dias após o vencimento entra com `+5`; uma paga antes do vencimento entra negativo (não trunca em zero — atraso negativo é informação real, "cliente paga adiantado").
- Distribuição forma de pagamento: baixas com `forma_pagamento_id` null agrupam em "Não informado", não somem do total.
- Regressão: `/contas-a-receber` e `/contas-a-pagar` (dar baixa) continuam funcionando com o combobox novo no lugar do texto livre — teste manual de baixa real, igual ao já feito nesta sessão.
