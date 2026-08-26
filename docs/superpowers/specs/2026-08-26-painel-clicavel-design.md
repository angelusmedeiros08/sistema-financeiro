# Painel clicável — 3ª leva de gráficos clicáveis (drill-down)

**Data:** 2026-08-26

## 1. Contexto

As duas primeiras levas de gráficos clicáveis (`docs/superpowers/specs/2026-08-25-drill-down-graficos-design.md`) cobriram Indicadores e Relatórios/*. O usuário pediu, olhando o Painel (`/painel`) renderizado ao vivo, que a mesma estrutura chegasse lá: clicar em Saldo em caixa, Resultado do mês, os 4 stat cards (A receber/Recebido/A pagar/Pago), os 4 gauges de %, e cada item de "Lançamentos recentes" — e cair no filtro certo, como já acontece nos outros módulos. Segue a instrução permanente registrada na 2ª leva: todo gráfico/número novo por entidade nasce ligado ao mecanismo de drill-down.

Investigando como "Saldo em caixa" podia virar link, achamos e corrigimos um bug de duplicação em `vw_movimento_realizado` (mesma classe do bug já corrigido na 2ª leva, ver `docs/schema-aplicado-supabase.md` entrada 50) — pré-requisito pro Saldo em caixa poder confiar no número que o link mostraria.

## 2. O que muda no mecanismo (extensão, não redesenho)

O mecanismo existente (`src/lib/relatorios/drill-down.ts` + `lancamentos-filtrados.ts` + `/lancamentos` como destino) sempre exigiu uma dimensão (pessoa/categoria/forma_pagamento/centro_custo). Vários números do Painel não têm dimensão nenhuma — são "todo o movimento de um regime/tipo/período", não um recorte por entidade.

- `FiltroLancamentos.dimensao` vira opcional. Quando ausente, `buscarLancamentosFiltrados` chama `buscarMovimento` direto (regime/período/tipo, sem filtrar por categoria/centro/pessoa) e soma tudo — sem query nova, reaproveitando a mesma fonte de sempre.
- `montarHrefLancamentos` ganha uma variante sem `tipoEntidade`/`entidadeId` pra montar esses hrefs (`/lancamentos?regime=...&tipo=...&periodo_inicio=...&periodo_fim=...`, sem parâmetro de dimensão).
- `IndicadorGauge` (`src/components/relatorios/indicador-gauge.tsx`) ganha `href` opcional, mesmo padrão de `StatCard`: quando presente, o card inteiro vira `<Link>`, com a mesma seta no hover que `StatCard` já tem.

Nenhuma tabela nova, nenhuma migration.

## 3. Cada elemento do Painel

| Elemento | Fonte do dado | Destino |
|---|---|---|
| **Saldo em caixa** | `obterSaldoEmCaixa` | `/lancamentos?regime=realizado` — sem dimensão, sem tipo, todo o histórico (`1900-01-01` até hoje, mesma convenção de `saldo-projetado.ts`) |
| **Resultado do mês** | `obterResultadoDoMes` — passa a retornar `{ liquido, receitas, despesas }` em vez de só o número líquido | O número líquido continua só informativo (é subtração, não soma — mesmo precedente de "Saldo" em Centro de Custo/"Previsto" em Orçado×Realizado). Duas linhas novas abaixo dele, cada uma seu link: "Receitas" (verde) → `/lancamentos?regime=competencia&tipo=RECEITA`, período = mês corrente; "Despesas" (vermelho) → mesmo com `tipo=DESPESA` |
| **A receber / A pagar (30 dias)** | já existente (`href` já presente em `StatCard`) | inalterado — continuam indo pra `/contas-a-receber?situacao=vence30` / `/contas-a-pagar?situacao=vence30` |
| **Recebido (mês)** | `obterRecebidoPagoDoMes` | `/lancamentos?regime=realizado&tipo=RECEITA` — sem dimensão, período = mês corrente |
| **Pago (mês)** | idem | mesmo, `tipo=DESPESA` |
| **% Realizado de contas a receber** | `buscarIndicadoresRealizacao` | `/contas-a-receber?situacao=todos` |
| **% Realizado de contas a pagar** | idem | `/contas-a-pagar?situacao=todos` |
| **% Pago em atraso (a receber)** | idem | `/contas-a-receber?situacao=vencido` |
| **% Pago em atraso (a pagar)** | idem | `/contas-a-pagar?situacao=vencido` |
| **Lançamentos recentes** (cada item) | `obterEventosRecentes` — já retorna `evento_financeiro_id` | `/receitas/{id}` (RECEITA) ou `/despesas/{id}` (DESPESA) — telas de edição já existentes, sem tela nova |
| **Fluxo de caixa** (gráfico de 6 meses) | — | fora de escopo — série temporal, mesmo precedente já estabelecido (waterfall/linha por período não representam uma entidade única por ponto) |

O card de Resultado do mês é o único que muda de layout (ganha 2 linhas). Os outros 3 stat cards e os 4 gauges só ganham `href`/dado novo, sem mudar visual.

## 4. Casos de borda

- Filtro sem nenhum resultado (ex.: nenhuma despesa no mês) → cai em `/lancamentos` vazio, mesmo comportamento que os outros filtros já têm hoje.
- Lançamento "recente" originado do módulo de Vendas: `/receitas/[id]` deve funcionar igual (venda cria uma receita normal por trás, sem campo extra que a tela de edição não suporte) — validar ao vivo, não só assumir.
- Lançamento "recente" já estornado (pode aparecer se foi revertido há pouco): a tela de edição já trata esse caso (mostra aviso de "não pode mais ser editado" em vez do formulário) — nada novo a fazer.

## 5. Teste

Ao vivo no navegador, tenant real: Saldo em caixa, Recebido/Pago do mês e Receitas/Despesas do mês batendo exato com o número mostrado no card; os 4 gauges levando pro filtro certo em Contas a Receber/Pagar; um item de receita e um de despesa em "Lançamentos recentes" abrindo a tela de edição certa; um lançamento originado de venda confirmando que `/receitas/[id]` funciona pra ele também.

## 6. Fora de escopo

Gráfico "Fluxo de caixa" (série temporal). Qualquer redesenho visual além da divisão de Resultado do mês em 2 linhas. Limpeza dos 2 tenants de desenvolvimento com dado de teste poluído (ver `docs/schema-aplicado-supabase.md` entrada 50) — não é rotina, fica fora até autorização explícita.
