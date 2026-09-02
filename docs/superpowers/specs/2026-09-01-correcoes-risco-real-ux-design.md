# Correções de risco real — pós-auditoria de UX

## Contexto

Em 01/09/2026, a pedido do usuário ("mais ux para deixar o sistema... completo"), rodamos uma varredura de UX em produção via 4 agentes paralelos (núcleo financeiro, relatórios/indicadores, comercial/pessoas, configurações/navegação), cobrindo mobile e desktop em ~30 telas. O usuário pediu pra atacar primeiro os achados de **risco real** (não é só estética) antes do resto do polimento geral.

Quatro achados de risco real, mais um pedido novo trazido pelo usuário no meio do brainstorm (dispensar o checklist de onboarding do Painel) — os 5 itens desta spec.

## Escopo

1. Percentual "0,0%" enganoso quando não há base de comparação (Previsionamento + Comparativos).
2. Campo "Preço unitário" invisível no mobile em Nova Venda/Novo Orçamento.
3. Data padrão de Nova Venda/Novo Orçamento nasce um dia à frente (bug de fuso horário).
4. Busca (Ctrl+K) sem nenhum acesso visual abaixo de 1024px de largura.
5. "Primeiros passos" do Painel poder ser dispensado permanentemente.

**Fora de escopo** (fica pro resto da auditoria, não é risco real): todos os outros achados dos 4 relatórios — inconsistência de badge "Cancelado", decimal com ponto em vez de vírgula, espaço vazio em telas largas, tabelas sem indicação de scroll, dados de teste em produção, sidebar escondendo 3 subpáginas de Configurações, etc. `variacao-categorias.ts` (usado em `/indicadores`, "Variação de categorias") fica de fora do item 1 — investigado e confirmado que já trata denominador zero de forma razoável (±100% em vez de 0%), o achado ali é só "falta seta de sinal", um item de polimento, não de dado enganoso.

## Design

### 1. Percentual "0,0%" enganoso

**Causa raiz**: `desvioPercentual`/`variacaoPercentual` são calculados com fallback `: 0` quando o denominador é zero — indistinguível de "sem mudança de verdade". Dois pontos de cálculo, quatro ocorrências:
- `lib/previsionamento/previsionamento.ts:164` — `desvioPercentual: totalPrevisto > 0 ? (totalRealizado - totalPrevisto) / totalPrevisto : 0`
- `lib/relatorios/analises-comparativas.ts:45,57,81` — três variantes de `variacaoPercentual: ... !== 0 ? ... : 0`

**Mudança**: trocar o fallback `: 0` por `: null` nos quatro pontos; os tipos (`LinhaPrevistoRealizado.desvioPercentual`, `PontoAnaliseComparativa.variacaoPercentual`) passam a ser `number | null`.

**Consumidores que precisam tratar `null`** (3 componentes):
- `components/relatorios/previsto-realizado-barras.tsx` — badge de percentual ao lado do nome da categoria.
- `components/relatorios/comparativos-tabela.tsx` — coluna "Variação" da tabela de Comparativos (via `ValorLista`).
- `components/relatorios/comparativo-linha-anotada.tsx` — anotação "+X%" no fim da linha do gráfico (tem seu próprio tipo local `PontoComparativo`, estruturalmente igual a `PontoAnaliseComparativa` — recebe os mesmos dados de `buscarAnaliseComparativa`, também vira `number | null`).

**Componente compartilhado `ValorLista`** (`components/tabela/tabela-lista.tsx:121`, usado também em `centro-custo-tabela.tsx`, `fluxo-caixa-tabelas.tsx`, `tabela-matriz.tsx`): `valor` passa a aceitar `number | null`; quando `null`, renderiza só "—" (sem cor de sinal, sem `formatado`). Chamadas existentes com `number` continuam idênticas.

**Explicação do motivo**: quando o valor é `null`, os 3 consumidores (não o `ValorLista` em si — ele fica genérico) envolvem o "—" com um ícone `?` que abre a explicação, no mesmo padrão visual do `TermoComDica` (Popover, não hover — mobile-first) já usado no glossário financeiro. Como aqui o texto é dinâmico por contexto (não uma entrada de glossário fixo), criamos um componente irmão pequeno — `DicaContextual` (ou nome equivalente), aceitando `titulo`/`texto` direto em vez de uma chave de glossário, reaproveitando o mesmo Popover/trigger visual do `TermoComDica`. Textos:
- Previsionamento (sem meta): "Sem meta cadastrada" / "Nenhum valor previsto foi definido pra esta categoria neste mês — não dá pra calcular desvio."
- Comparativos (sem período anterior): "Sem dado para comparar" / "Não há movimento registrado no período de comparação."

### 2. Preço unitário invisível no mobile

**Onde**: `components/formularios/documento-comercial-form.tsx:186-217` (usado tanto por Nova Venda quanto por Novo Orçamento, mesmo componente `DocumentoComercialForm`). Hoje é um grid único de 5 colunas (`grid min-w-[540px] grid-cols-[1fr_84px_100px_100px_auto]`) dentro de `overflow-x-auto` — abaixo de ~540px, Preço unitário e Subtotal ficam atrás de scroll horizontal sem nenhuma pista visual.

**Mudança**: duas apresentações conforme a largura, mesmo padrão já usado em `previsionamento/grade-previsionamento.tsx` (`hidden md:block` / `md:hidden`, mesmo state e handlers, só a apresentação muda):
- **Desktop (`md:` e acima)**: grid de 5 colunas atual, sem mudança.
- **Mobile (abaixo de `md`)**: cada item vira um card (`rounded-xl border border-border bg-card`, ou reaproveitando o wrapper já usado alhures) — Produto/Serviço em cima (largura cheia, o mesmo `ProdutoServicoCombobox`), Quantidade e Preço unitário lado a lado numa linha (`grid grid-cols-2 gap-2`), Subtotal + botão remover no rodapé do card (`flex items-center justify-between`, borda superior separando do resto — mesmo tratamento visual do rodapé de card já usado em `grade-previsionamento.tsx`'s `renderGrupoMobile`). Cada campo ganha um rótulo pequeno acima (mesmo padrão `text-[10px] uppercase text-muted-foreground` já usado na grade).

Aprovado via companion visual (Opção A, "card empilhado") — ver `.superpowers/brainstorm/7826-1788314087/content/layout-item-venda.html`.

### 3. Data padrão de Nova Venda um dia à frente

**Causa raiz**: `documento-comercial-form.tsx:79` — `const dataEmissaoInicial = dadosIniciais?.dataEmissao ?? new Date().toISOString().slice(0, 10)`. `toISOString()` sempre converte pra UTC; à noite no horário de Brasília (UTC-3), a data UTC já virou o dia seguinte.

**Mudança**: trocar por `hojeIsoBrasil()` (já importável de `@/lib/data-brasil`, mesmo helper usado em outros formulários do sistema pra "hoje" no fuso certo). Troca de uma linha + o import, sem mudança de comportamento além de corrigir o fuso. Afeta os dois campos que herdam desse valor (`data_emissao` e o default de `primeiroVencimento`, linha 176).

### 4. Busca sem ícone abaixo de 1024px

**Causa raiz**: `components/layout/topbar.tsx` — o `CommandPaletteBusca` completo (botão "Pesquisar" + atalho "Ctrl K") só renderiza dentro de `hidden ... lg:flex` (linha 56-58); abaixo do breakpoint `lg` (1024px), esse container inteiro vira `display:none` e é substituído pelo nome do tenant (`lg:hidden`, linha 60-62). Não sobra nenhum jeito visual/clicável de abrir a busca — só o atalho de teclado Ctrl+K/`/` (que continua funcionando, é um listener global em `command-palette-busca.tsx`, independente de o botão estar visível).

**Mudança**: um botão de lupa (ícone só, sem o texto "Pesquisar" nem o atalho) na Topbar, visível só quando o botão completo está escondido — ou seja, `lg:hidden` no mesmo contentor onde hoje só existe o fallback de nome do tenant. Abre o mesmo `CommandDialog` de sempre.

**Implementação**: `CommandPaletteBusca` ganha uma prop `variante?: "completo" | "icone"` (default `"completo"`) que só troca o JSX do botão-trigger (texto+atalho vs. ícone de lupa sozinho, `size-9` para bater com os outros ícones da Topbar) — todo o resto (estado `aberto`, `CommandDialog`, o `useEffect` do atalho de teclado) continua no mesmo componente, sem duplicação. Na Topbar, o container hoje só com o nome do tenant (`lg:hidden`, linha 60-62) ganha o ícone de busca ao lado, mesma visibilidade (`lg:hidden`).

### 5. "Primeiros passos" dispensável

**Onde**: `components/painel/primeiros-passos.tsx` (`PrimeirosPassosCard`), renderizado em `app/(app)/painel/page.tsx:320`, primeiro item da coluna direita (`flex-col gap-6`), com "Lançamentos recentes" logo abaixo.

**Mudança**: um botão de dispensar (ícone "✕", canto superior direito do card, ao lado do título "Primeiros passos") grava uma flag no `localStorage` (mesma techa já usada por tema/sidebar em `components/layout/sidebar.tsx` e `theme-toggle.tsx` — por navegador, não por conta, consistente com o que já existe). Componente vira `"use client"` (hoje é renderizado direto, sem interatividade) — lê a flag no mount e, se presente, não renderiza nada (`return null`), do mesmo jeito que já faz quando `concluidos === PASSOS.length`. "Lançamentos recentes" sobe automaticamente pro topo da coluna — é efeito natural de `flex-col`, sem nenhuma mudança adicional de layout.

Não precisa de forma de "trazer de volta" o checklist dispensado — mesmo tratamento que o auto-hide por conclusão já tem hoje (uma vez escondido, fica escondido).

## Testes

Cada item verificado ao vivo em produção depois do deploy:
1. Previsionamento com categoria sem meta + Comparativos sem dado do período anterior mostrando "—" com tooltip, não "0,0%"/"+0,0%".
2. Nova Venda/Novo Orçamento no mobile (375px) — os 3 campos do item visíveis sem scroll horizontal escondido.
3. Nova Venda/Novo Orçamento criada perto da meia-noite (ou forçando fuso) com a data certa, não um dia à frente.
4. Busca acessível por clique em larguras abaixo de 1024px (tablet, notebook com janela não maximizada).
5. Dispensar "Primeiros passos", recarregar a página — continua dispensado; "Lançamentos recentes" no topo da coluna.
