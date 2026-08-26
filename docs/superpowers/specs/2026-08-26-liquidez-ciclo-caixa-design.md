# Liquidez e ciclo de caixa — 6ª seção da Central de Indicadores

**Data:** 2026-08-26

## 1. Contexto

O catálogo original da Central de Indicadores (`docs/superpowers/specs/2026-08-15-central-de-indicadores-visao-design.md`) definiu 6 seções, organizadas por pergunta de negócio. As primeiras 5 já estão no ar em `/indicadores`: Saldo projetado, Concentração de receita, Variação de categorias, Prazos médios e aging, Distribuição por forma de pagamento. Falta a última: **"Minha empresa está saudável?"**, com dois indicadores já esboçados no catálogo — Ciclo de conversão de caixa (PMR − PMP) e Liquidez aproximada (caixa + recebíveis de curto prazo ÷ pagáveis de curto prazo).

Este spec fecha os limiares, a janela de tempo e o comportamento de alerta que o catálogo original deixou como "decisão adiada", e desenha a seção nova seguindo a mesma gramática visual das outras 5 (validada via mockup no companion visual desta sessão).

## 2. Renomeação de título (já aplicada)

Durante o brainstorming, o usuário apontou que os títulos de seção em formato de pergunta ("Estou ficando sem caixa?", "Como me pagam?") deviam virar termos de campo financeiro direto. As 5 seções existentes já foram renomeadas em `src/app/(app)/indicadores/page.tsx`, sem mudança de conteúdo/lógica — só o `<h2>` de cada `<section>`:

| Antes | Depois |
|---|---|
| Estou ficando sem caixa? | Saldo projetado |
| Meu risco está concentrado? | Concentração de receita |
| Onde meu dinheiro está indo? | Variação de categorias |
| Quem não paga em dia, e pra quem eu devo? | Prazos médios e aging |
| Como me pagam? | Distribuição por forma de pagamento |

A seção nova desta spec nasce já com título de campo: **"Liquidez e ciclo de caixa"** — nunca existiu como pergunta.

## 3. Decisões validadas com o usuário

- **Janela de curto prazo: 30 dias.** Tanto pra recebíveis quanto pra pagáveis que entram na Liquidez.
- **Inclui vencido.** A janela de 30 dias não é só "vence nos próximos 30 dias" — qualquer parcela em aberto com vencimento até `hoje+30` entra, mesmo que já tenha vencido há mais tempo. Dinheiro que já devia ter entrado/saído e ainda não entrou/saiu continua fazendo parte do que pressiona o caixa agora.
- **Limiares do semáforo de liquidez:** `< 1,0` risco · `1,0–1,5` atenção · `> 1,5` saudável.
- **Entra no alerta diário por e-mail já existente** (`dispararAlertasDiarios`/`enviarResumoEquipe`) — não é um novo tipo de alerta, é mais uma condição de disparo do mesmo resumo que já cobre ruptura de saldo D+7 e vencimentos próximos.

## 4. Indicador 1 — Liquidez aproximada

**Fórmula:** `(caixa atual + a receber em até 30 dias, incluindo vencido) ÷ (a pagar em até 30 dias, incluindo vencido)`

- **Caixa atual**: mesmo cálculo já usado em `buscarSaldoProjetado` (`saldo-projetado.ts`) — soma de `contas_financeiras.saldo_inicial` (contas ativas) + movimento líquido em regime realizado desde sempre até hoje. Reaproveitado diretamente, não recalculado.
- **A receber/a pagar em 30 dias**: parcelas com `status IN (PENDENTE, RECEBIDO_PARCIAL, ATRASADO)` — o mesmo `STATUS_VENCIDO` já exportado por `aging.ts` — e `data_vencimento <= hoje+30` (sem piso de data, pra incluir o que já venceu). Valor é o saldo residual (`valor − soma de baixas válidas`), mesmo padrão de `saldoResidual`/`buscarAging`. Uma query por tipo (RECEITA/DESPESA), mesmo formato das duas chamadas em paralelo que `saldo-projetado.ts` já faz.
- Se o total a pagar em 30 dias for zero, liquidez é tratada como "saudável" por definição (não há divisão por zero, não há risco de caixa no horizonte) — mesma lógica defensiva que outros indicadores desta central já aplicam a denominador zero.

**Nível de risco** (mesmo padrão de `NivelRiscoConcentracao`/`BadgeRiscoConcentracao`):

```ts
type NivelLiquidez = "RISCO" | "ATENCAO" | "SAUDAVEL";
// liquidez < 1.0 → RISCO | 1.0 a 1.5 → ATENCAO | > 1.5 → SAUDAVEL
```

## 5. Indicador 2 — Ciclo de conversão de caixa (aproximado)

**Fórmula:** `PMR − PMP`, reaproveitando `buscarPMR`/`buscarPMP` de `prazos-medios.ts` sem nenhuma query nova.

Importante registrar a limitação (igual o catálogo original já marcou como "aproximado"): PMR/PMP aqui **não são o DSO/DPO clássico de manual de finanças** (que mede do dia da fatura até o pagamento). São a média ponderada de **atraso em relação ao vencimento** (`data_pagamento − data_vencimento`), já calculada pra outro card desta mesma tela. Reaproveitar em vez de criar um segundo par de métricas evita: (a) uma nova varredura de `parcelas`/`baixas`, (b) dois PMRs diferentes na mesma tela confundindo o usuário. A leitura do número muda um pouco (é "ciclo de atraso", não "ciclo de conversão" no sentido contábil estrito) mas a spec do catálogo já assumiu essa aproximação de propósito, dado que o sistema não modela balanço patrimonial completo.

**Cor do número**: mesma convenção já usada nos cards de PMR/PMP isolados (`dias > 0 ? destructive : positivo`) — CCC positivo (cliente atrasa mais do que você atrasa fornecedor) é ruim, negativo é bom.

## 6. Alerta por e-mail

`dispararAlertasDiarios` (`src/lib/alertas/disparar.ts`) ganha mais uma condição de disparo do resumo de equipe, ao lado de `aPagar.length > 0`, `aReceber.length > 0` e `emRuptura`:

```ts
const liquidez = await buscarLiquidezAproximada(supabase, tenant.id);
const liquidezEmRisco = liquidez.indice < 1.0;
if (aPagar.length > 0 || aReceber.length > 0 || emRuptura || liquidezEmRisco) { /* ... */ }
```

`enviarResumoEquipe` (`alertas-email.ts`) ganha um novo parâmetro `liquidez` e uma linha no corpo do e-mail quando `liquidezEmRisco` (mesmo padrão visual que a linha de ruptura de saldo D+7 já usa) — não é um e-mail novo, é a mesma mensagem diária com mais um motivo de disparo e mais uma linha de conteúdo. Sem deduplicação nova: reaproveita a chave `resumo_equipe` já existente em `alertas_enviados` (é o mesmo envio, só com um gatilho a mais).

## 7. Layout da seção

Mesma gramática visual das outras 5 seções (validada em mockup no companion visual):

```
<section className="rounded-2xl bg-card shadow-card p-6">
  <h2>Liquidez e ciclo de caixa</h2>
  <BadgeSaudeFinanceira nivel={...} indiceLiquidez={...} />   {/* ex.: "Liquidez confortável · 1,8" */}

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <CardLiquidez indice={...} caixa={...} aReceber30d={...} aPagar30d={...} nivel={...} />
    <CardCicloConversaoCaixa dias={pmr.dias - pmp.dias} pmrDias={pmr.dias} pmpDias={pmp.dias} />
  </div>
</section>
```

- `BadgeSaudeFinanceira`: novo componente, mesmo padrão de `BadgeRiscoConcentracao` (3 cores, texto fixo por nível + valor formatado).
- `CardLiquidez`: número grande (índice com 1 casa decimal, ex. "1,8"), barra de progresso colorida por nível (mesma ideia visual do mockup aprovado), texto pequeno decompondo a fórmula em R$.
- `CardCicloConversaoCaixa`: número grande em dias com sinal, mesma tipografia/cor de `CardPrazoMedio`, decompondo PMR/PMP por baixo.

## 8. Drill-down (clique pra detalhe)

Seguindo a instrução permanente registrada em memória (todo gráfico/número novo por entidade nasce ligado ao mecanismo de `montarHrefLancamentos`) — avaliado e **descartado para os dois indicadores desta seção**, pelo mesmo motivo já aplicado a Saldo (Centro de Custo) e Previsto (Orçado×Realizado): nenhum dos dois é uma soma direta de lançamentos.

- **Liquidez** é uma razão entre dois números (caixa ÷ a pagar), não uma lista de registros — não há "os lançamentos da liquidez".
- **Ciclo de conversão de caixa** é uma subtração (PMR − PMP) de duas médias, não uma soma.

Nenhum dos dois vira link. Fica como precedente igual "Saldo" em Centro de Custo e "Previsto" em Orçado×Realizado — só valores que são soma direta de eventos ganham `href`.

## 9. Fora de escopo

- Health score único combinando os 6 indicadores num só número (não pedido, catálogo original não menciona).
- Configuração por tenant da janela de 30 dias ou dos limiares do semáforo (hardcoded, mesmo padrão de `FAIXAS_VENCIDO` em `aging.ts` — não é necessidade recorrente por tenant).
- DSO/DPO contábil clássico como métrica adicional separada do PMR/PMP já existente.
