# Plano de implementação: Gráficos clicáveis — 5ª leva (Aging por faixa)

**Spec:** [docs/superpowers/specs/2026-09-02-drill-down-5a-leva-aging-design.md](../specs/2026-09-02-drill-down-5a-leva-aging-design.md)
**Data:** 2026-09-02

## Fatia 1 — Mecanismo: `vencimento_de`/`vencimento_ate` em Contas a Receber/Pagar

- `app/(app)/contas-a-receber/page.tsx` e `contas-a-pagar/page.tsx`: 2 searchParams novos. Quando presentes: `.in("status", STATUS_VENCIDO)` (bypassa `filtro.status`) + `.gte`/`.lte` em `data_vencimento` (bypassa `filtro.janela`) — mesmo padrão já usado pelo parâmetro `pessoa` da 4ª leva.

_Depende de:_ nada.
_Teste:_ acessar a URL manualmente com um intervalo de datas conhecido e comparar contra uma consulta direta no banco.

## Fatia 2 — `href` por faixa em `aging.ts`

- `FaixaAging` ganha `href: string`. `classificar()` recebe `tipo`/`origemHref extras (origemHref só por consistência de assinatura, não usado ainda — `/contas-a-receber`/`pagar` não tem botão de voltar hoje). Monta o href de cada faixa (vencido e a vencer) com os limites de data corretos, faixa aberta ("180+") sem `vencimento_de`.
- `buscarAging` repassa `tipo`/`origemHref` pra `classificar()`.

_Depende de:_ Fatia 1 (formato dos parâmetros).
_Teste:_ chamada direta com uma faixa de cada família (vencido, a vencer, e a faixa aberta), conferindo o href exato.

## Fatia 3 — Conectar os componentes e os 3+2 usos

- `AgingBarras`/`FaixasAVencer` envolvem cada linha num `<Link>`.
- 3 chamadas de `buscarAging` (Visão Geral, Aging, Indicadores) passam `origemHref`.

_Depende de:_ Fatia 2.
_Teste:_ ao vivo — clicar numa faixa vencida e numa a vencer, total da lista batendo exato com o valor da faixa; testar a faixa "180+ dias" (sem limite inferior).

## Fatia 4 — Revisão de código

Mesmo padrão das levas anteriores — 2 agentes independentes (financeiro/segurança + regressão/UX), foco em: limites de data por faixa (off-by-one entre dias de atraso e data de vencimento), `STATUS_VENCIDO` correto nos dois destinos, nenhuma regressão no comportamento padrão de Contas a Receber/Pagar sem os parâmetros novos.
