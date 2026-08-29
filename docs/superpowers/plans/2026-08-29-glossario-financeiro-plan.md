# Plano de implementação: Glossário financeiro (tooltip de jargão)

**Spec:** [docs/superpowers/specs/2026-08-29-glossario-financeiro-design.md](../specs/2026-08-29-glossario-financeiro-design.md)
**Data:** 2026-08-29

Ordem por dependência: glossário + componente base primeiro (nada mais funciona sem eles), depois cada tela — a mais concentrada (Indicadores) primeiro pra validar o padrão com o maior número de termos de uma vez, as outras em qualquer ordem depois.

**Correção em relação à spec:** a Seção 5 da spec previa os termos de EBITDA/margens numa "linha de resumo/matriz de percentuais" do DRE — investigando o código, eles na verdade aparecem na legenda do gráfico `IndicadoresDreChart` (aba "Indicadores" do DRE, `src/components/relatorios/indicadores-dre-chart.tsx:158-165`), não em texto solto na página. O plano abaixo usa o local real.

## Fatia 1 — Glossário e componente base

`src/lib/glossario-financeiro.ts` — `Record<string, { titulo: string; explicacao: string; formula?: string }>` com as 10 chaves da Seção 4 da spec (`pmr`, `pmp`, `ciclo_conversao_caixa`, `aging`, `liquidez_aproximada`, `margem_contribuicao`, `margem_bruta`, `ebitda`, `margem_liquida`, `ponto_equilibrio`).

`src/components/formularios/termo-com-dica.tsx` — `TermoComDica({ termo, children })`. `<span className="inline-flex items-center gap-1">{children}<Popover><PopoverTrigger>{ícone Question, 16px, text-muted-foreground}</PopoverTrigger><PopoverContent>{título + explicação + fórmula do glossário}</PopoverContent></Popover></span>`. Ícone é o único trigger — clicar no texto do rótulo não abre nada.

_Depende de:_ nada.
_Teste:_ isolado — renderizar `<TermoComDica termo="pmr">teste</TermoComDica>` numa página qualquer, confirmar que o popover abre no clique/toque, mostra o texto certo, fecha ao clicar fora.

## Fatia 2 — `/indicadores` (5 termos)

`CardPrazoMedio` (local a `indicadores/page.tsx`) e `AgingBarras` (`src/components/relatorios/aging-barras.tsx`) têm `titulo: string` — muda pra `titulo: React.ReactNode` nos dois (nenhum dos dois faz `.toUpperCase()` ou mede o texto, só renderiza `{titulo}` direto — confirmado lendo o código atual, seguro trocar o tipo).

Substitui as 5 chamadas: `CardPrazoMedio titulo={<TermoComDica termo="pmr">Prazo médio de recebimento (PMR)</TermoComDica>}` (e `pmp`), `AgingBarras titulo={<TermoComDica termo="aging">Aging — contas a receber</TermoComDica>}` (e a de "contas a pagar"), mais os rótulos "Liquidez aproximada" e "Ciclo de conversão de caixa" na seção 6 (checar o texto exato renderizado ali antes de trocar — pode estar em um componente próprio, não em `CardPrazoMedio`/`AgingBarras`).

_Depende de:_ Fatia 1.
_Teste:_ ao vivo, viewport mobile e desktop — os 5 ícones abrem o popover certo; nenhum outro caller de `CardPrazoMedio`/`AgingBarras` quebrou (é só essa página que os usa, mas confirmar).

## Fatia 3 — `/relatorios/ponto-equilibrio` e `/relatorios/visao-geral` (2 termos)

`ponto-equilibrio/page.tsx`: os rótulos "Ponto de equilíbrio (mês atual)" e "Margem de contribuição" (linhas ~116 e ~120) ganham `TermoComDica`.

`visao-geral/page.tsx`: `StatCard` tem `label: string` — muda pra `React.ReactNode` (mesma checagem da Fatia 2: só renderiza `{label}` direto, `components/painel/stat-card.tsx:35,86`, mas `StatCard` é usado por várias páginas — grep todos os callers antes de mudar o tipo, pra não quebrar algum que dependa de `label` ser string). O `StatCard label="Ponto de equilíbrio"` (linha ~109) vira `label={<TermoComDica termo="ponto_equilibrio">Ponto de equilíbrio</TermoComDica>}`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — os 3 ícones (2 em ponto-equilibrio, 1 em visão geral) abrem o popover certo; nenhuma outra tela que usa `StatCard` quebrou.

## Fatia 4 — `/relatorios/aging` (1 termo, 2 ocorrências)

Os 2 `AgingBarras` da tela dedicada (`relatorios/aging/page.tsx:33-34`) ganham `TermoComDica termo="aging"` — mesma chave da Fatia 2, texto já existe no glossário, só reaproveita.

_Depende de:_ Fatia 1 (e Fatia 2, já que é o mesmo componente `AgingBarras` cujo tipo já foi trocado ali).
_Teste:_ ao vivo — os 2 ícones abrem o popover.

## Fatia 5 — `/relatorios/dre`, aba Indicadores (4 termos)

`src/components/relatorios/indicadores-dre-chart.tsx`: a constante `SERIES` (linhas 17-20) ganha uma 4ª propriedade `termoGlossario` mapeando `chave` → chave do glossário (`mc` → `margem_contribuicao`, `margemBruta` → `margem_bruta`, `ebitda` → `ebitda`, `margemLiquida` → `margem_liquida`). A legenda (linhas 158-165) troca `{serie.nome}` por `<TermoComDica termo={serie.termoGlossario}>{serie.nome}</TermoComDica>`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo, aba "Indicadores" do DRE — os 4 itens da legenda abrem o popover certo; o gráfico em si (cores, linhas, tooltip de hover do próprio gráfico) continua idêntico.

## Fora de escopo (herdado da spec)

Capital de Giro, Índice de Inadimplência (sem indicador correspondente no produto hoje). i18n. Página "/glossario" dedicada.
