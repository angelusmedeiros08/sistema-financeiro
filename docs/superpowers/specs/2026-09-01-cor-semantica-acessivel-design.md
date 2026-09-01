# Cor semântica acessível (Fatia 6 do dossiê UX)

## Contexto

Dossiê UX: "reforço de ícone/forma além de cor pra positivo/negativo — barato, sem tocar em paleta de marca" (WCAG 1.4.1: cor nunca pode ser o único jeito de diferenciar informação).

## Achado ao investigar

A varredura inicial (grep por `text-positivo`/`text-destructive`) trouxe 76 arquivos — mas a esmagadora maioria são rótulos de **texto** (badges de status como "Quitado"/"Cancelado", mensagens de erro de formulário, botões destrutivos): já acessíveis por definição, a palavra em si diferencia o significado, cor é só reforço visual. `BadgeSaudeFinanceira` e as badges de status seguem o mesmo padrão (texto + cor), confirmado lendo o código.

O gap real e específico: **números com sinal, coloridos, sem nenhum outro reforço** — `formatarMoeda`/`formatarNumeroCompacto` (Intl.NumberFormat) já incluem o "−" no negativo automaticamente, mas nada indicava o positivo além da cor verde. `StatCard` já tinha ícone de seta (`ArrowUpRight`/`ArrowDownRight`) — não precisou de nada. `fluxo-chart.tsx`/`comparativo-linha-anotada.tsx` já ganharam prefixo "+/−" na Fatia 3 (Gráficos interativos).

## Correção

"+" explícito no valor positivo, nos 2 componentes compartilhados que renderizam número colorido por sinal (cobre DRE em matriz, DFC, Centro de Custo, Fluxo de Caixa, Comparativos — qualquer tabela que os usa, sem tocar página por página):

- `ValorLista` (`components/tabela/tabela-lista.tsx`)
- `ValorMatriz` (`components/tabela/tabela-matriz.tsx`)

Mais 3 pontos que formatavam o número inline, fora desses componentes (sem reaproveitar nenhum dos dois): `relatorios/contas-bancarias`, `relatorios/centro-custo` (o número ao lado da `TrilhoBarra`), `relatorios/ponto-equilibrio` (margem de segurança).

## Fora de escopo

- Paleta de cor / tokens de tema — explicitamente fora desde o dossiê original.
- `TrilhoBarra` (barra horizontal de magnitude) continua colorida por sinal sem forma adicional — o número ao lado dela (corrigido) já carrega a informação de sinal; redesenhar a barra em si é polimento maior que o "barato" que esta fatia pedia.
- Badges de status (já acessíveis via texto, confirmado na investigação) — nenhuma mudança necessária.
