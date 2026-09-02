# Plano de implementação: Correções de risco real pós-auditoria de UX

**Spec:** [docs/superpowers/specs/2026-09-01-correcoes-risco-real-ux-design.md](../specs/2026-09-01-correcoes-risco-real-ux-design.md)
**Data:** 2026-09-01

6 fatias. Os 5 itens da spec são independentes entre si (arquivos diferentes, sem acoplamento real) — a ordem aqui é por dependência interna (item 1 precisa do cálculo antes dos consumidores) e por risco (itens 2+3 tocam o mesmo arquivo, ficam juntos numa fatia só pra não reabrir duas vezes). Fecha com teste ao vivo cobrindo tudo.

## Fatia 1 — Percentual enganoso: cálculo + `ValorLista`

1. `lib/previsionamento/previsionamento.ts:164` — trocar `desvioPercentual: totalPrevisto > 0 ? (totalRealizado - totalPrevisto) / totalPrevisto : 0` por `: null`; tipo `LinhaPrevistoRealizado.desvioPercentual` vira `number | null`.
2. `lib/relatorios/analises-comparativas.ts` — mesma troca nas 3 ocorrências (linhas ~45, ~57, ~81); tipo `PontoAnaliseComparativa.variacaoPercentual` vira `number | null`.
3. `components/tabela/tabela-lista.tsx:121` (`ValorLista`) — prop `valor` vira `number | null`; quando `null`, renderiza só `"—"` (sem cor de sinal, ignora `formatado`). Chamadas existentes com `number` continuam idênticas — não mexer nos outros 3 usos (`centro-custo-tabela.tsx`, `fluxo-caixa-tabelas.tsx`, `tabela-matriz.tsx`).

_Depende de:_ nada.
_Teste:_ `tsc`/`eslint`. TypeScript vai reclamar dos 3 consumidores da Fatia 2 até eles serem ajustados — normal, não é regressão, é o motivo de serem fatias separadas na mesma sessão de trabalho (não faz sentido buildar/commitar a Fatia 1 sozinha com o projeto quebrado; rodar as duas em sequência antes de qualquer build/commit).

## Fatia 2 — Percentual enganoso: `DicaContextual` + os 3 consumidores

1. Componente novo `components/formularios/dica-contextual.tsx` — mesmo Popover/trigger visual do `TermoComDica` (`components/formularios/termo-com-dica.tsx`), mas recebendo `titulo`/`texto` direto como props em vez de uma chave de `GLOSSARIO_FINANCEIRO`. Copiar a estrutura (ícone `?` de 14px, `pointer-events-auto`, `stopPropagation`, `PopoverContent w-72`) — não generalizar `TermoComDica` pra aceitar as duas formas, são conceitualmente diferentes (termo fixo de glossário vs. explicação dinâmica de estado).
2. `components/relatorios/previsto-realizado-barras.tsx` — quando `linha.desvioPercentual === null`: renderiza `"—"` + `<DicaContextual titulo="Sem meta cadastrada" texto="Nenhum valor previsto foi definido pra esta categoria neste mês — não dá pra calcular desvio." />` no lugar do badge de percentual (linha ~28-31). Cor do texto vira neutra (`text-muted-foreground`) em vez de `corDesvio`.
3. `components/relatorios/comparativos-tabela.tsx` — coluna "variacao" (linha ~48-53): passa `linha.variacaoPercentual` pro `ValorLista` (já aceita `null` pela Fatia 1); quando `null`, envolve com `<DicaContextual titulo="Sem dado para comparar" texto="Não há movimento registrado no período de comparação." />` ao lado.
4. `components/relatorios/comparativo-linha-anotada.tsx` — tipo local `PontoComparativo.variacaoPercentual` vira `number | null`; a anotação (linha ~125-131) só renderiza o texto de percentual quando não for `null` — decidir com o usuário ao implementar se a anotação inteira some quando `null` (mais simples) ou se vira um rótulo tipo "sem comparação" no mesmo lugar (mais consistente com os outros 2 pontos) — a spec não fechou esse detalhe visual específico do gráfico, resolver com o padrão dos outros 2 (rótulo, não sumiço) a menos que o espaço da anotação não comporte o texto maior.

_Depende de:_ Fatia 1.
_Teste:_ `tsc`/`eslint`/`build` (projeto inteiro volta a compilar limpo aqui). Ao vivo: achar/criar uma categoria sem meta em Previsionamento e confirmar "—" + tooltip em vez de "0,0%"; em Comparativos, um período sem dado anterior mostrando "—" na coluna Variação e na anotação do gráfico.

## Fatia 3 — `documento-comercial-form.tsx`: data + layout mobile do item

Mesmo arquivo, duas mudanças independentes — juntas numa fatia só pra não reabrir o arquivo duas vezes.

1. **Bug de data** (linha 79): trocar `new Date().toISOString().slice(0, 10)` por `hojeIsoBrasil()` (import de `@/lib/data-brasil`, já usado em outros formulários do sistema).
2. **Layout mobile do item** (linhas ~186-217): duas apresentações conforme a largura, mesmo padrão de `previsionamento/grade-previsionamento.tsx` (`hidden md:block` / `md:hidden`, mesmo estado/handlers — `atualizarLinha`, `escolherProduto`, `removerLinha` — só a apresentação muda):
   - Desktop (`md:` e acima): grid de 5 colunas atual, sem mudança nenhuma.
   - Mobile (abaixo de `md`): cada item vira um card (`rounded-xl border border-border bg-card p-3` ou equivalente já usado em cards do sistema) — `ProdutoServicoCombobox` em cima (largura cheia), Quantidade + Preço unitário lado a lado (`grid grid-cols-2 gap-2`, cada um com rótulo `text-[10px] uppercase text-muted-foreground` acima, mesmo padrão da grade de Previsionamento), rodapé do card com Subtotal + botão remover (`flex items-center justify-between`, borda superior separando).
   - "Adicionar item" continua abaixo da lista nas duas apresentações, sem mudança.

_Depende de:_ nada (arquivo isolado das Fatias 1-2).
_Teste:_ ao vivo — abrir Nova Venda ou Novo Orçamento perto da meia-noite (ou checar a data gerada) e confirmar que "Data"/"Primeiro vencimento" batem com o dia certo no fuso de Brasília. Redimensionar pra 375px e confirmar que Quantidade, Preço unitário e Subtotal aparecem todos sem precisar rolar horizontalmente; confirmar que desktop (≥768px) continua igual a antes.

## Fatia 4 — Ícone de busca abaixo de 1024px

1. `components/layout/command-palette-busca.tsx` — `CommandPaletteBusca` ganha prop `variante?: "completo" | "icone"` (default `"completo"`). Quando `"icone"`, o botão-trigger vira só o ícone de lupa (`size-9`, sem o texto "Pesquisar" nem o `<kbd>`) — todo o resto (estado `aberto`, `CommandDialog`, `useEffect` do atalho de teclado) continua compartilhado, sem duplicação.
2. `components/layout/topbar.tsx` — o container hoje só com o nome do tenant (linha 60-62, `lg:hidden`) ganha `<CommandPaletteBusca variante="icone" />` ao lado (mesma visibilidade `lg:hidden` — aparece exatamente quando o botão completo desaparece).

_Depende de:_ nada.
_Teste:_ ao vivo — `resize_window` (ou equivalente) pra larguras abaixo de 1024px (ex.: 768px, 1000px) e confirmar que o ícone de busca aparece e abre o mesmo diálogo; confirmar que em ≥1024px continua mostrando o botão completo, sem os dois ao mesmo tempo.

## Fatia 5 — Primeiros Passos dispensável

1. `components/painel/primeiros-passos.tsx` (`PrimeirosPassosCard`) vira `"use client"`. Novo estado local (via `useState` + leitura de `localStorage` no mount, mesmo padrão de `sidebar.tsx`/`theme-toggle.tsx` — chave sugerida `"finanssi:primeiros-passos-dispensado"`). Se a flag estiver presente, `return null` (mesmo comportamento que já existe hoje quando `concluidos === PASSOS.length`).
2. Botão "✕" no canto superior direito do cabeçalho do card (ao lado de "Primeiros passos"), `aria-label="Dispensar"` — ao clicar, grava a flag no `localStorage` e o componente esconde (mesmo `return null`).

_Depende de:_ nada.
_Teste:_ ao vivo — no Painel, clicar em dispensar, confirmar que o card some e "Lançamentos recentes" sobe pro topo da coluna direita sem nenhum buraco. Recarregar a página inteira (não só client-side) e confirmar que continua dispensado.

## Fatia 6 — Revisão final + teste ao vivo consolidado

1. `tsc`/`eslint`/`build` no repo inteiro.
2. Deploy (push pra `master`, aguardar Vercel) e teste ao vivo em `https://sistema-financeiro-five-phi.vercel.app` (nunca local) cobrindo os 5 cenários da seção "Testes" da spec, de uma vez, numa sessão de verificação só:
   - Previsionamento sem meta + Comparativos sem período anterior → "—" com tooltip.
   - Nova Venda/Orçamento no mobile (375px) → 3 campos do item visíveis sem scroll escondido.
   - Data de Nova Venda/Orçamento correta no fuso de Brasília.
   - Busca acessível por ícone em larguras abaixo de 1024px.
   - Dispensar Primeiros Passos persiste entre recarregamentos, Lançamentos recentes sobe.
3. Spot-check em pelo menos 2 telas não tocadas (ex.: `/relatorios/visao-geral`, `/despesas`) pra garantir que nada fora do escopo regrediu.

_Depende de:_ Fatias 1-5.
_Teste:_ é a própria fatia de teste — sem sub-teste adicional depois dela.
