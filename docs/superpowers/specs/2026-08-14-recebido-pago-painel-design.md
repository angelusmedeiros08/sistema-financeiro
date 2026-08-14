# Painel — Recebido e Pago do mês

## 1. Contexto

O painel (`/painel` e o espelho somente-leitura `/portal`) já mostra o que está **pendente** (`A receber (30 dias)`, `A pagar (30 dias)`, com sub-linha Vencido/Vence hoje) e o resultado por competência (`Resultado do mês`). Não existe nenhum indicador de quanto **já efetivamente entrou/saiu de caixa** este mês — pedido explícito do usuário. O cálculo de "realizado" já existe em outro lugar (`buscarMovimento` com `regime: "realizado"`, usado por Fluxo de Caixa e DFC), só nunca foi trazido pro painel.

## 2. Escopo

**Dentro:**
- `painel/dados.ts`: nova função `obterRecebidoPagoDoMes(supabase, tenantId, pessoaId?)` — reaproveita `buscarMovimento` (`lib/relatorios/regime.ts`), regime `realizado`, janela do mês corrente (mesma de `mesAtual()`, `lib/relatorios/indicadores-gauge.ts`). Soma `valor` por `tipo` (RECEITA → recebido, DESPESA → pago), filtrando por `pessoaId` em memória quando vier (`buscarMovimento` não tem esse parâmetro nativo).
- `obterDadosPainel` passa a retornar `recebidoDoMes`/`pagoDoMes` junto do resto.
- `/painel` e `/portal`: grade de stat cards de `lg:grid-cols-4` (4 cards) para `lg:grid-cols-3` (6 cards, 2 linhas), nova ordem: Saldo em caixa · A receber (30 dias) · **Recebido (mês)** / A pagar (30 dias) · **Pago (mês)** · Resultado do mês.
- Dois `StatCard` novos: `variant="teal"` label "Recebido (mês)" (mesma cor semântica de receita já usada em "A receber"); `variant="violeta"` label "Pago (mês)" (cor de marca, hoje sem uso no painel — neutra, não é alerta como "A pagar" que é âmbar).

**Fora:**
- Seletor de período (o card é sempre "mês corrente", sem filtro — consistente com "Resultado do mês", que também não tem seletor).
- Sub-linha de detalhe nos cards novos (ficam só com o valor total, sem "Vencido/Vence hoje" — não se aplica a algo já liquidado).
- Alterar os relatórios de Fluxo de Caixa/DFC — só o painel ganha esse indicador novo.

## 3. Cálculo

```
obterRecebidoPagoDoMes(tenantId, pessoaId?):
  { inicio, fim } = mesAtual()
  movimento = buscarMovimento(tenantId, regime: "realizado", dataInicio: inicio, dataFim: fim)
  filtrado = pessoaId ? movimento.filter(m => m.pessoaId === pessoaId) : movimento
  recebido = soma(filtrado.filter(tipo === "RECEITA").valor)
  pago = soma(filtrado.filter(tipo === "DESPESA").valor)
  retorna { recebido, pago }
```

`buscarMovimento` com regime `realizado` já lê de `vw_movimento_realizado` (data_pagamento), já ignora baixas estornadas (a view exclui na origem) — nenhuma lógica de soma/estorno duplicada aqui.

## 4. UI

`painel/page.tsx` e `portal/page.tsx` (as duas cópias da mesma grade, atualizadas juntas):

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <StatCard variant="hero" label="Saldo em caixa" valor={...} />
  <StatCard variant="teal" label="A receber (30 dias)" valor={...} detalhe="Vencido/Vence hoje" />
  <StatCard variant="teal" label="Recebido (mês)" valor={formatarMoeda(dados.recebidoDoMes)} />
  <StatCard variant="ambar" label="A pagar (30 dias)" valor={...} detalhe="Vencido/Vence hoje" />
  <StatCard variant="violeta" label="Pago (mês)" valor={formatarMoeda(dados.pagoDoMes)} />
  <StatCard variant="coral" label="Resultado do mês" valor={...} />
</div>
```

Mobile (`grid-cols-1`) e tablet (`sm:grid-cols-2`) continuam empilhando normalmente — 6 cards em 2 ou 3 colunas conforme a largura, sem alterar o comportamento responsivo já estabelecido.

## 5. Testes

- `obterRecebidoPagoDoMes`: uma baixa de receita com `data_pagamento` no mês corrente soma em `recebido`; uma com `data_pagamento` no mês passado não entra; uma baixa estornada não entra (a view já filtra).
- Portal filtrado por `pessoaId`: `recebidoDoMes`/`pagoDoMes` só somam movimento daquela pessoa.
- Regressão: os 4 cards existentes (Saldo, A receber, A pagar, Resultado do mês) mantêm os mesmos valores após a mudança de grid — só a disposição espacial muda, nenhum cálculo existente é tocado.
