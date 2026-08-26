# Plano de implementação: Liquidez e ciclo de caixa — 6ª seção da Central de Indicadores

**Spec:** [docs/superpowers/specs/2026-08-26-liquidez-ciclo-caixa-design.md](../specs/2026-08-26-liquidez-ciclo-caixa-design.md)
**Data:** 2026-08-26

Ordem por dependência: primeiro a função de cálculo (sem UI, testável isolada), depois os componentes visuais (badge + 2 cards), só então a seção nova em `/indicadores`. O alerta por e-mail só depende do cálculo, não da UI — pode vir por último sem bloquear nada. Cada fatia é testável isolada antes de seguir pra próxima.

## Fatia 1 — `buscarLiquidezAproximada`

Nova função em `src/lib/relatorios/liquidez-aproximada.ts`:

- Reaproveita `buscarSaldoProjetado` (`saldo-projetado.ts`) só pelo `saldoAtual` — sem recalcular caixa do zero.
- Duas queries em paralelo (RECEITA/DESPESA) em `parcelas`, mesmo filtro `STATUS_VENCIDO` já exportado por `aging.ts` (`PENDENTE`/`RECEBIDO_PARCIAL`/`ATRASADO`) + `data_vencimento <= hoje+30`, **sem piso de data** — uma parcela vencida há 90 dias ainda satisfaz `<= hoje+30`, então entra (é a regra "inclui vencido" da spec). Soma o saldo residual de cada uma (`valor − baixas válidas não estornadas`), mesmo cálculo de `saldoResidual`/`buscarAging`.
- `indice = (caixaAtual + aReceber30d) / aPagar30d`; se `aPagar30d === 0`, índice não é calculado por divisão — nível fica `SAUDAVEL` direto (sem risco de caixa no horizonte, sem divisão por zero).
- `nivel: "RISCO" | "ATENCAO" | "SAUDAVEL"` a partir do índice: `< 1.0` / `1.0–1.5` / `> 1.5`.
- Retorno: `{ indice: number; nivel: NivelLiquidez; caixaAtual: number; aReceber30d: number; aPagar30d: number }`.

_Depende de:_ nada (só funções já existentes: `buscarSaldoProjetado`, `STATUS_VENCIDO`).
_Teste:_ chamada direta da função contra dado real do tenant Angelus Martiniano, conferindo os 3 componentes (caixa, a receber, a pagar) contra uma consulta manual no banco — incluindo pelo menos uma parcela vencida há mais de 30 dias, pra confirmar que ela entra mesmo assim. Confirmar também o caso `aPagar30d === 0` (tenant/período sem despesa em aberto) não estoura.

## Fatia 2 — Ciclo de conversão de caixa

Não é uma função nova — só combinar `buscarPMR`/`buscarPMP` (já existentes, já chamados em `/indicadores`) na própria página: `ciclo = pmr.dias - pmp.dias`. Sem query nova, sem arquivo novo em `lib/relatorios/`.

_Depende de:_ nada.
_Teste:_ conferir que `pmr.dias - pmp.dias` bate com os números já exibidos nos dois cards de PMR/PMP existentes na mesma tela (Prazos médios e aging).

## Fatia 3 — Componentes visuais

- `src/components/relatorios/badge-saude-financeira.tsx` — `BadgeSaudeFinanceira`, mesmo padrão de `BadgeRiscoConcentracao` (3 cores por `NivelLiquidez`, texto "Liquidez confortável" / "Liquidez em atenção" / "Liquidez em risco" + índice formatado, ex. "· 1,8").
- `src/components/relatorios/card-liquidez.tsx` — `CardLiquidez`: número grande (índice, 1 casa decimal), barra de progresso colorida por nível, texto pequeno decompondo a fórmula em R$ (caixa + a receber 30d ÷ a pagar 30d), mesma gramática do mockup aprovado no companion visual.
- `src/components/relatorios/card-ciclo-conversao-caixa.tsx` — `CardCicloConversaoCaixa`: número grande em dias com sinal, mesma convenção de cor de `CardPrazoMedio` (positivo = `text-destructive`, negativo = `text-positivo`), decompondo PMR/PMP por baixo.

_Depende de:_ Fatia 1 (formato de retorno de `buscarLiquidezAproximada`) e Fatia 2 (só o número `ciclo`, sem tipo novo).
_Teste:_ não há Storybook no projeto — os 3 componentes são verificados ao vivo na Fatia 4, não isolados.

## Fatia 4 — Seção nova em `/indicadores`

`src/app/(app)/indicadores/page.tsx` ganha a 6ª `<section>`, mesma estrutura `rounded-2xl bg-card shadow-card p-6` das outras 5:

- `buscarLiquidezAproximada` entra no `Promise.all` já existente no topo da página, junto das outras buscas.
- `<h2 className="font-heading text-base font-bold text-foreground">Liquidez e ciclo de caixa</h2>` + `BadgeSaudeFinanceira` no cabeçalho (mesmo layout `flex justify-between` das seções com badge).
- Grid `sm:grid-cols-2` com `CardLiquidez` e `CardCicloConversaoCaixa`.

_Depende de:_ Fatias 1, 2, 3.
_Teste:_ ao vivo no navegador, tenant Angelus Martiniano — índice de liquidez e ciclo de conversão batendo com o cálculo manual das Fatias 1/2, cor do badge e da barra correspondendo ao nível certo (testar os 3 níveis, ajustando dado de teste se o tenant real só cair num nível), responsivo em mobile (grid empilha em 1 coluna, mesmo padrão já usado no resto da página).

## Fatia 5 — Alerta por e-mail

- `src/lib/alertas/disparar.ts`: `dispararAlertasDiarios` chama `buscarLiquidezAproximada` por tenant (junto dos cálculos já em paralelo dentro do loop), `liquidezEmRisco = liquidez.nivel === "RISCO"` entra na condição de disparo do resumo, ao lado de `aPagar.length > 0`, `aReceber.length > 0`, `emRuptura`.
- `src/lib/alertas/alertas-email.ts`: `enviarResumoEquipe` ganha parâmetro `liquidez: LiquidezAproximada` e uma linha no corpo do e-mail quando `liquidez.nivel === "RISCO"` (mesmo padrão visual da linha de ruptura de saldo D+7 já existente). Reaproveita a chave de dedup `resumo_equipe` já existente em `alertas_enviados` — é o mesmo envio diário, só com mais um motivo de disparo e mais uma linha de conteúdo, não um tipo de alerta novo.

_Depende de:_ Fatia 1.
_Teste:_ forçar um tenant de teste a ter liquidez `< 1,0` (reduzindo saldo de conta ou criando parcelas de despesa a vencer nos próximos 30 dias) e confirmar que o e-mail de resumo chega com a linha nova. Confirmar que não duplica envio se `resumo_equipe` já tiver sido enviado hoje por outro motivo (ex.: ruptura de saldo já disparou primeiro).

## Fora de escopo (herdado da spec)

Health score único combinando os 6 indicadores num só número; configuração por tenant da janela de 30 dias ou dos limiares do semáforo; DSO/DPO contábil clássico como métrica separada do PMR/PMP já existente.
