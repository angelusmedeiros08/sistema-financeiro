# Glossário financeiro — tooltip de jargão

**Data:** 2026-08-29

## 1. Contexto

Ideia trazida pelo usuário em 28/08/2026 (ver memória `ideias-novas-ux-ia-28-08`): a Central de Indicadores, o DRE e o Ponto de Equilíbrio usam termos técnicos (PMR, PMP, Aging, Liquidez aproximada, Ciclo de conversão de caixa, EBITDA, Margem de contribuição/bruta/líquida, Ponto de equilíbrio) sem explicação na tela — o dono de uma PME que não é contador não necessariamente sabe o que cada um significa. O conteúdo de base já existe em `docs/pesquisa-indicadores-contabeis-fundamentos.md` (PMR, PMP, Ciclo Financeiro) — os demais termos (Aging, Liquidez aproximada, EBITDA, margens, Ponto de equilíbrio) são definidos aqui a partir de como o próprio sistema os calcula, não de uma fórmula genérica de livro-texto.

## 2. Padrão de interação

Ícone `(?)` (Phosphor `Question`, mesmo pacote já usado em todo o app) ao lado do rótulo do termo. Toque/clique abre um `Popover` (componente já existente, `components/ui/popover.tsx`, base Radix) com o nome do termo, uma explicação de 1-3 frases, e a fórmula quando fizer sentido mostrar. Hover puro foi descartado — a maior parte do uso é mobile-first, e hover não existe em touch; um popover clicável funciona igual nos dois.

## 3. Componente

`src/components/formularios/termo-com-dica.tsx` (mesma pasta de outros componentes de formulário/apoio reaproveitáveis):

```tsx
<TermoComDica termo="pmr">Prazo médio de recebimento (PMR)</TermoComDica>
```

- `termo`: chave do glossário (abaixo).
- `children`: o rótulo já existente na tela — o componente só adiciona o ícone e o popover em volta, não reformata o texto.
- Internamente: `<span className="inline-flex items-center gap-1">{children}<Popover>...</Popover></span>`. O `PopoverTrigger` é o ícone `Question` (16px, `text-muted-foreground`), nunca o texto inteiro — clicar no rótulo em si não deve abrir nada, só o ícone.

## 4. Glossário

`src/lib/glossario-financeiro.ts` — fonte única, um `Record<string, { titulo: string; explicacao: string; formula?: string }>`. Nenhuma tela escreve o texto da explicação diretamente, todas importam daqui (evita duas telas explicando "Margem de contribuição" com palavras diferentes).

| Chave | Título | Conteúdo (grounded em como o sistema calcula, não fórmula genérica) |
|---|---|---|
| `pmr` | Prazo médio de recebimento (PMR) | Quantos dias, em média, você demora pra receber depois do vencimento. Calculado por parcela paga (não por saldo contábil): `data_pagamento − data_vencimento`, ponderado pelo valor de cada parcela. |
| `pmp` | Prazo médio de pagamento (PMP) | Quantos dias, em média, você demora pra pagar depois do vencimento. Mesmo cálculo do PMR, sobre as contas a pagar. Aqui, mais dias significa que o dinheiro fica mais tempo no seu caixa — até certo ponto: PMP muito alto pode ser atraso sistemático, não negociação. |
| `ciclo_conversao_caixa` | Ciclo de conversão de caixa | PMR − PMP: quantos dias o dinheiro fica "preso" entre pagar e receber. Quanto menor (ou mais negativo), melhor — significa que você recebe antes de precisar pagar. |
| `aging` | Aging | Quanto do que está vencido, separado por quanto tempo já passou do vencimento (0-15 dias, 16-30, 31-60...). Mostra se o atraso é recente ou já crônico. |
| `liquidez_aproximada` | Liquidez aproximada | (Caixa atual + a receber em até 30 dias) ÷ a pagar em até 30 dias — incluindo o que já venceu dos dois lados. Abaixo de 1,0 significa que o que entra não cobre o que sai nesse horizonte. |
| `margem_contribuicao` | Margem de contribuição | Receita menos os custos e despesas que variam com ela (ex.: comissão, imposto sobre venda) — o que sobra pra cobrir os custos fixos e gerar lucro, em % da receita líquida. |
| `margem_bruta` | Margem bruta | Receita menos o custo direto do que foi vendido/prestado (CMV/CSP), em % da receita líquida. |
| `ebitda` | EBITDA | Lucro operacional antes de juros, impostos, depreciação e amortização — o resultado do negócio "no dia a dia", sem o efeito de financiamento, imposto de renda ou desgaste de ativo. |
| `margem_liquida` | Margem líquida | O que sobra de lucro depois de tudo — todos os custos, despesas, juros e impostos — em % da receita líquida. |
| `ponto_equilibrio` | Ponto de equilíbrio | Quanto você precisa faturar num mês pra cobrir os custos fixos, sem lucro nem prejuízo. PE = Custos fixos ÷ Margem de contribuição %. |

## 5. Onde entra cada um

| Tela | Termos |
|---|---|
| `/indicadores` (Central de Indicadores) | `pmr`, `pmp` (nos 2 `CardPrazoMedio`), `aging` (nos 2 `AgingBarras`), `liquidez_aproximada`, `ciclo_conversao_caixa` (seção "Liquidez e ciclo de caixa") |
| `/relatorios/dre` | `margem_contribuicao`, `margem_bruta`, `ebitda`, `margem_liquida` (linha de resumo/matriz de percentuais no topo da tela) |
| `/relatorios/ponto-equilibrio` | `ponto_equilibrio`, `margem_contribuicao` (mesma entrada do glossário, sem duplicar texto) |
| `/relatorios/aging` | `aging` (nos 2 `AgingBarras` da tela dedicada) |
| `/relatorios/visao-geral` | `ponto_equilibrio` (StatCard "Ponto de equilíbrio", já existe hoje) |

`CardPrazoMedio`, `AgingBarras` e `StatCard` (usado por `visao-geral/page.tsx` pro card "Ponto de equilíbrio") recebem o rótulo já pronto de fora (`titulo="Prazo médio de recebimento (PMR)"` / `label="Ponto de equilíbrio"`) — a chamada que hoje passa a string troca pra `<TermoComDica termo="pmr">...</TermoComDica>` no lugar do texto puro, então os três componentes precisam aceitar `React.ReactNode` no campo de título, não só `string` (checar se algum outro caller de cada um depende do título ser string pura — ex. algum lugar que faz `.toUpperCase()` ou mede o texto — antes de mudar o tipo).

## 6. Fora de escopo

Termos que não aparecem em nenhuma tela ainda (ex.: Capital de Giro, Índice de Inadimplência — já pesquisados em `pesquisa-indicadores-contabeis-fundamentos.md` mas sem indicador correspondente no produto hoje). Tradução/i18n do glossário — só português, mesmo padrão do resto do app. Busca ou índice geral de termos (ex.: uma página "/glossario" à parte) — só os pontos de uso já mapeados acima.

## 7. Teste

Ao vivo no navegador: abrir cada um dos 5 termos em `/indicadores`, os 4 em `/relatorios/dre`, e os 2 em `/relatorios/ponto-equilibrio`, confirmando que o popover abre no toque/clique (testar em viewport mobile também), fecha ao clicar fora, e o texto bate com o glossário. Confirmar que clicar no rótulo em si (fora do ícone) não abre nada.
