# Gráficos clicáveis — 5ª leva (Aging por faixa)

## Contexto

Do levantamento da 4ª leva, restaram 2 itens no "Bucket 3" (precisam adaptar o mecanismo). Reexaminando o Saldo Projetado com mais cuidado antes de implementar: as duas séries do gráfico (`realizado`/`projetado`) são **saldo acumulado num ponto no tempo** (`saldoAtual − movimento depois daquele dia`), não um fluxo dentro de um período — mesma natureza do "saldo acumulado" de Contas Bancárias, que já ficou de fora na 4ª leva por incluir `saldo_inicial` cadastrado à mão e todo o histórico da conta, sem lista de lançamentos que bata exato. Saldo Projetado sai do escopo clicável por esse motivo — nenhuma das duas séries tem uma lista de lançamentos correspondente.

Sobra só **Aging por faixa**: `AgingBarras` (vencido, 3 usos: Visão Geral, Aging Analítico, Indicadores) e `FaixasAVencer` (a vencer, só no Aging Analítico). Cada faixa (ex.: "31-60 dias") já é um conjunto real e preciso — parcelas com status em `STATUS_VENCIDO` e `data_vencimento` dentro daquele intervalo.

## Decisões

- **Destino é `/contas-a-receber` ou `/contas-a-pagar`, não `/lancamentos`.** Aging é sobre *status de parcela* (saldo em aberto por vencimento), não sobre movimento contábil por regime — `/lancamentos` é alimentado por `buscarMovimento` (accrual), que não tem noção de "parcela ainda em aberto". `/contas-a-receber`/`pagar` já operam direto em cima de `parcelas` com filtro de situação, é o destino que já existe pra essa pergunta (mesmo raciocínio que levou o filtro `pessoa` da 4ª leva pro mesmo lugar, não pra `/lancamentos`).
- **Dois parâmetros novos, não um novo valor de `situacao`**: `vencimento_de`/`vencimento_ate` (datas ISO, limites inclusivos). Quando presentes e sem `situacao` explícita, o filtro de status vira `STATUS_VENCIDO` direto (mesmo padrão já usado pelo filtro `pessoa` da 4ª leva) — nunca reaproveita o status de "aberto" (que inclui `RENEGOCIADO`, ausente de `STATUS_VENCIDO`). Um parâmetro só cobre as duas famílias de faixa (vencido = passado, a vencer = futuro), sem duplicar mecanismo.
- **Faixa aberta ("180+ dias") não tem `vencimento_de`** — omitido, sem limite inferior.
- **Nenhuma mudança visual** nos componentes — mesmo padrão de todas as levas anteriores.

## Arquitetura

`FaixaAging` (`lib/relatorios/aging.ts`) ganha `href: string`. `classificar()` recebe `tipo`/`origemHref` extras e monta o href de cada faixa, direto (sem passar por `montarHrefLancamentos`, que é específico de `/lancamentos`):

```ts
function hrefFaixa(tipo: "RECEITA" | "DESPESA", vencDe: string | null, vencAte: string): string {
  const destino = tipo === "RECEITA" ? "/contas-a-receber" : "/contas-a-pagar";
  const params = new URLSearchParams({ vencimento_ate: vencAte });
  if (vencDe) params.set("vencimento_de", vencDe);
  return `${destino}?${params.toString()}`;
}
```

Limites por faixa: vencido `{min,max}` (dias de atraso) → `vencimento ∈ [hoje−max, hoje−min]`; a vencer `{min,max}` (dias até vencer) → `vencimento ∈ [hoje+min, hoje+max]`. `buscarAging` ganha `origemHref` no parâmetro (não usado pra "voltar" — `/contas-a-receber`/`pagar` não tem esse botão hoje, mesmo caso do filtro `pessoa` da 4ª leva — só documentado pra consistência de assinatura com o resto do módulo, e mantido pronto caso o botão seja adicionado depois).

`app/(app)/contas-a-receber/page.tsx` e `contas-a-pagar/page.tsx`: 2 searchParams novos (`vencimento_de`/`vencimento_ate`). Quando presentes, filtra `.in("status", STATUS_VENCIDO)` (bypassa `filtro.status`, mesmo padrão do `pessoa`) e `.gte("data_vencimento", vencimento_de)` / `.lte("data_vencimento", vencimento_ate)` (bypassa `filtro.janela`).

`AgingBarras`/`FaixasAVencer` envolvem cada linha num `<Link href={faixa.href}>`.

## Testes

Ao vivo: clicar numa faixa (vencido e a vencer, pelo menos uma de cada) e conferir que a lista de parcelas em `/contas-a-receber`/`pagar` soma exatamente o total daquela faixa. Testar a faixa aberta "180+ dias" (sem `vencimento_de`). Testar que os 3 usos de `AgingBarras` (Visão Geral, Aging, Indicadores) e os 2 de `FaixasAVencer` (Aging) recebem `href` correto.

## Escopo

Saldo Projetado fica fora — ver "Contexto" acima. Nenhum outro item novo desta leva.
