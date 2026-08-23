# Plano de implementação: Reforma visual — gráficos e tabelas

**Spec:** [docs/superpowers/specs/2026-08-21-reforma-visual-tabelas-design.md](../specs/2026-08-21-reforma-visual-tabelas-design.md)
**Data:** 2026-08-21

Ordem por dependência e risco: fundação tipográfica primeiro (afeta toda tela), depois o único bug de gráfico pendente (isolado, rápido), depois o motor de tabela + os dois arquétipos como componentes reutilizáveis, só então as páginas uma a uma. Cada fatia é testável sozinha no navegador antes de seguir pra próxima.

## Fatia 1 — Tipografia (Satoshi + Plus Jakarta Sans)

Baixar os pesos que `layout.tsx` já usa hoje (400/500/700/900 conforme peso realmente consumido) via Fontshare API (Satoshi) e Google Fonts (Plus Jakarta Sans, arquivo estático — não é servida pela Fontshare). Salvar em `app/src/app/fonts/` substituindo `cabinet-grotesk-*.woff2` e `public-sans.woff2`. Atualizar `localFont` em `layout.tsx` (`fonteDisplay` → Satoshi, `fonteCorpo` → Plus Jakarta Sans), mantendo as variáveis CSS `--font-display`/`--font-body` como estão (nenhum outro arquivo referencia o nome do arquivo físico).

_Depende de:_ nada.
_Teste:_ abrir `/painel`, `/relatorios/dre`, qualquer formulário — checar visualmente que título e corpo mudaram e que não há flash de fonte não estilizada (FOUT).

## Fatia 2 — Correção do token de cor `--positivo` vs `--chart-1`

Grep por `#0FA37E`/`#0fa37e` em `centro-custo/page.tsx` e `dfc/page.tsx` (e qualquer outro arquivo que apareça na varredura). Cada ocorrência que representa "valor bom" (receita, saldo positivo) volta pra `#157F6B` (`--positivo`); ocorrência que é de fato cor de série/categoria fica como está.

_Depende de:_ nada — pode rodar em paralelo com a Fatia 1.
_Teste:_ comparar visualmente `/relatorios/centro-custo` e `/relatorios/dfc` antes/depois — valores positivos devem ficar no teal `--positivo`, não no verde de gráfico.

## Fatia 3 — TrilhoBarra v2

**Concluída.** Reescrito `trilho-barra.tsx`: gradiente linear no preenchimento (mesmo padrão de `FluxoChart`/`IndicadoresDreChart`), marcador circular de ponta com anel branco, marcas de escala em 25/50/75%, tooltip escuro no hover com valor exato (nova prop `valorFormatado`). Referência visual: `.superpowers/brainstorm/1669-1787340149/content/trilho-barra-v2.html`.

Não virou client component como o plano original previa — o hover resolve com `group-hover` do Tailwind (CSS puro), sem estado nem listener de mouse; `useId()` (evita colisão de `<linearGradient>` entre barras da mesma lista) também roda em server component.

_Teste:_ os 4 consumidores reais — `aging-barras.tsx`, `orcado-realizado-barras.tsx`, `centro-custo/page.tsx`, `despesas/page.tsx` — verificados via inspeção DOM (gradiente, marcador, tooltip com valor real, `getBoundingClientRect()` sem overflow) e sem erro de console.

## Fatia 4 — Motor de tabela (fundação, sem tela ainda)

**Concluída.** `@tanstack/react-table` instalado — v9.1.2, que por sua vez **não é a API v8** que a maior parte da documentação/treino descreve (registro explícito de feature via `tableFeatures()`, `useTable`/`createTableHook` em vez de `useReactTable`, `column.getStart('left')` virou `getStart('start')`). Resolvido lendo os skills que o próprio pacote traz em `node_modules/@tanstack/react-table/skills/` (mesmo padrão do aviso em `app/AGENTS.md` pro Next.js desta versão) em vez de supor a API antiga.

Criados em `src/components/tabela/`, via `createTableHook` (uma fábrica só, reused pelas duas):

- `tabela-matriz.tsx` (Arquétipo 1): column pinning real (`#` + "Linha"), super-header de ano via grupo de coluna nativo do TanStack, destaque de mês corrente, linha de subtotal/final com friso lateral colorido (sem lavar a linha inteira), coluna AV% com mini-barra, chip de delta opcional, sort por header, legenda de rodapé, scroll horizontal com sombra nas colunas fixas.
- `tabela-lista.tsx` (Arquétipo 2): célula de ícone+texto de 2 linhas, badge de status com bolinha (mesma paleta de `lib/status-parcela.ts`), valor tabular-nums colorido por sinal, busca global funcional, sort por header, paginação de rodapé, menu de ação via `DropdownMenu`.

Cada um recebe dados e definição de coluna via `criarColunaMatriz`/`criarColunaLista` (helper tipado exportado do próprio arquivo, já ligado às features certas) — a página que consome só declara `columns` e passa `data`.

_Teste:_ rota temporária com dado mockado (`(app)/teste-tabelas-temp`, removida depois de validar) cobrindo os cenários de maior risco — coluna fixa com scroll horizontal, super-header, linha de subtotal/final, as 4 cores de badge, AV%, chip de delta, ordenação por clique, paginação, busca global. Tudo verificado via inspeção de DOM (classe aplicada, offset de pin, resultado de sort/filtro/paginação) e sem erro de console.

## Fatia 5 — Arquétipo 1 nas 3 páginas de matriz densa

**Concluída.** As 3 migraram, nesta ordem: DRE → DFC → Orçamento.

Achado que corrigiu a premissa do plano: o "~38 colunas" era a **DFC** (3 sub-colunas Prev./Real./Var. por mês), não a DRE (12 colunas simples, 1 por mês). Cada página revelou uma exigência real diferente do motor:

- **DRE** (`relatorios/dre/page.tsx`, wrapper `dre-matriz-tabela.tsx`): caso "de manual" — 1 grupo (ano) cobrindo 12 colunas de mês. Achado: não existe `tipoCalc` "final" no schema — a linha de resultado (ex. "Lucro / Prejuízo Final") é só a última linha `SUBTOTAL` da lista configurável por tenant; calculado em runtime (último índice com `tipoCalc !== "FOLHA"`). `SUBTOTAL_ALTERNATIVO`/`RESULTADO_NAO_OPERACIONAL` perderam o tom sage/dourado que tinham no `<table>` antigo — viram "subtotal" genérico (o arquétipo aprovado só tem 3 tipos de linha). Registrado como possível melhoria.
- **DFC** (`relatorios/dfc/page.tsx`, wrapper `dfc-matriz-tabela.tsx`): estrutura **plana** (4 linhas, sem hierarquia) e 12 grupos de mês (não 1) com 3 folhas cada. Forçou 2 mudanças no motor (`tabela-matriz.tsx`): `idColunaMesAtual` (id único) virou `ehColunaMesAtual(id) => boolean` (destacar 3 colunas por mês, não 1); legenda de rodapé passou a só mostrar o selo de cor que realmente aparece nos dados (Subtotal/Final/Mês atual), calculado a partir de `data`+`obterTipoLinha` — a DFC não tem subtotal nenhum, mostrar aquele selo seria enganoso.
- **Orçamento** (`orcamento/grade-orcamento.tsx`): não é relatório read-only, é **grid editável** (input por célula, autosave onBlur, copiar Jan→ano, status salvando/salvo/erro por linha) — só a versão desktop migrou, a mobile (accordion, resolve um problema de alvo de toque de 44px) ficou intacta. Ordenação desligada de propósito (reordenar no meio de uma edição é risco novo que o grid antigo nunca teve). Expôs um **bug real no motor**: cabeçalho tratava "linha de profundidade 0" como sinônimo de "cabeçalho de grupo" — funciona por coincidência quando a tabela SEMPRE tem grupo (DRE/DFC), quebra numa tabela sem grupo nenhum (a única linha de cabeçalho é ao mesmo tempo profundidade 0 e folha). Corrigido pra checar `header.column.columns.length > 0` (tem filho de verdade), não a posição da linha — confirmado que DRE/DFC continuaram corretas depois.

_Teste por página:_ tenant real (não mock) — coluna fixa + scroll horizontal, mês corrente, subtotal/final/AV%, sort, edição de célula real (Orçamento, revertida depois pra não sujar o banco), checagem de overflow por `getBoundingClientRect()`, sem erro de console em nenhuma.

### Correção pós-hoc — fidelidade de planilha

**Concluída (2026-08-22).** Não fazia parte do plano original — achado do usuário vendo o sistema real depois da Fatia 5 já concluída, não do arquétipo aprovado nos mockups. Duas rodadas de feedback:

1. **Ordenação por clique quebrava a ordem contábil.** `enableSorting` do TanStack vem `true` por padrão; só a coluna AV% da DRE tinha sido desligada explicitamente. Clicar em "Linha" ordenava alfabeticamente e embaralhava EBITDA/Lucro Final pra fora da posição correta. Corrigido: `enableSorting: false` em toda coluna de DRE e DFC (Orçamento já tinha, por outro motivo — ver Fatia 5).
2. **A matriz tinha se afastado demais da `<table>` crua original.** Pedido explícito: "quero como estava antes, só que com ajustes visuais". Três mudanças, nas 3 páginas de matriz densa:
   - Removida a coluna "#" (nunca existiu na tabela crua — só "Linha"/"Categoria" era fixa). `idsColunasFixas` passou a ter 1 item só nas 3 páginas.
   - Removida a faixa de ano (`📅 2026`) acima dos meses na DRE — ela nunca teve 2 linhas de cabeçalho; isso é estrutural só da DFC (3 sub-colunas Prev./Real./Var. por mês, group real, mantido).
   - Bordas de grade tipo Excel em toda célula (`border-r border-b` em cada `<th>`/`<td>`, `border-separate` + `border-spacing-0`), não só linha separadora entre subtotal e o resto.
   - Barra de rolagem horizontal restilizada (fina, `scrollbar-color`/`::-webkit-scrollbar`) — a padrão do sistema operacional destoava do resto do design.

   Remover a coluna "#" reduziu `idsColunasFixas` pra 1 item em todas as 3 tabelas, o que expôs um **bug real no motor**: com só 1 coluna fixa, ela é simultaneamente "primeira fixa" e "última fixa", e duas barras decorativas absolutas (acento de hover + friso de subtotal/final) caíam empilhadas no mesmo `left:0`. Corrigido suprimindo o acento de hover quando o friso de subtotal/final já está presente. Confirmado via DOM (`firstCellBars: 1`, sem duplicata) nas 3 páginas — inclusive Orçamento, que não tem linha "subtotal"/"final" nenhuma, então era o caso de maior risco de regressão.

_Teste:_ DRE, DFC e Orçamento revisitadas — sort desligado confirmado por página, 1 barra decorativa por linha fixada (não 2), bordas de grade presentes em toda célula (`border-right`/`border-bottom` computados = 1px), sem coluna "#", sem faixa de ano fora da DFC, scrollbar customizada aplicada, sem erro de console em nenhuma.

## Fatia 6 — Arquétipo 2 nas 5 páginas de relatório com `<table>` crua

**Concluída.** As 5, nesta ordem: Aging → Centro de Custo → Despesas → Comparativos → Fluxo de Caixa.

Antes de começar, um levantamento das 5 páginas corrigiu a premissa original do plano: "ícone real por categoria (paleta por hash, glifos estilo Phosphor)" não existe em lugar nenhum do app — o que existe é **cor por hash do nome** (`corPorNome`/`PontoCategoria`/`TagCategoria` em `lib/cor-por-nome.ts` e `components/ui/tag-categoria.tsx`), já usado em Pessoas/Equipe/tags de categoria. Categoria e centro de custo são nomes livres definidos pelo tenant — não dá pra mapear um glifo de verdade sem chutar. Ícone (glifo) só faz sentido pra linha que representa uma *entidade com tipo conhecido* (ex: cliente/fornecedor); mesmo assim, o app já resolve isso com **avatar de iniciais + `corPorNome`** (mesmo padrão de Pessoas/Equipe), não um ícone de biblioteca.

Resultado por página:
- **Aging**: linha é pessoa/empresa → avatar de iniciais (`corPorNome`). Sem paginação nem busca (é ranking "Top 10" por desenho, não cadastro completo) — motivou a prop `busca` no motor (`tabela-lista.tsx`) pra desligar a caixa de busca em listas curtas e fixas, e `textoVazio` pra mensagem customizada.
- **Centro de Custo**: sem ícone (não é entidade tipada). Achado: Entradas/Saídas usam **cor fixa** (categoria de fluxo — "Saídas" é sempre vermelho, não por ser negativo), só Saldo usa `ValorLista` (cor por sinal de verdade) — usar sign-based nos dois primeiros coloriria Saídas de verde por engano.
- **Despesas**: bolinha `PontoCategoria` (não ícone). "Tipo" (Fixo/Variável) é classificação, não status — `Badge` simples do shadcn, não o `BadgeStatusLista` do motor (que tem bolinha de status, semântica diferente).
- **Comparativos**: sem ícone/badge (linha é período). Número de colunas muda por aba (YTD não tem Variação) — resolvido montando `columns` condicionalmente via `useMemo`.
- **Fluxo de Caixa**: 2 tabelas com formato de dado diferente (Diário/Previsto×Realizado) em abas — 2 componentes de coluna distintos, mesma regra de cor fixa vs `ValorLista` do Centro de Custo.

_Teste por página:_ dado real do tenant, contagem de linha/coluna certa, cores corretas, sem overflow (`getBoundingClientRect`, excluindo a área de scroll horizontal esperada), sem erro de console em nenhuma.

## Fatia 7 — Migração das 23 tabelas shadcn existentes pro Arquétipo 2 completo

Essas já usam `<Table>` do shadcn (não é reescrita do zero, é enriquecimento: ícone+2 linhas, badge, sort, paginação, menu de ação via `DropdownMenu`). Agrupar por domínio pra manter contexto de negócio junto durante a migração:

- [x] **Pessoas/equipe**: `tabela-pessoas.tsx`, `configuracoes/equipe/page.tsx` — feito. `tabela-lista.tsx` ganhou prop `linkPara` (linha inteira clicável, sem menu de ação) pra cobrir o padrão de navegação já usado aqui e reaproveitado em `tabela-parcelas-abertas.tsx`/`vendas/page.tsx`. `acoes` agora pode retornar `null` por linha (some o menu `⋯` — usado pra ocultar ação na própria linha do usuário logado em Equipe). Busca server-side redundante (`?busca=`) removida de `/clientes` e `/fornecedores`, substituída pela busca embutida da `TabelaLista`.
- **Cadastros financeiros**: `configuracoes/contas-financeiras/page.tsx` (feito), `configuracoes/formas-pagamento/page.tsx` (feito), `configuracoes/centros-custo/page.tsx` (feito) — [x] as 3 migradas pro `TabelaLista`, cada uma com um wrapper client (`tabela-*.tsx`) e os antigos botões de ação convertidos pra `DropdownMenuItem`. `configuracoes/categorias/` (+`categoria-linha.tsx`) e `configuracoes/plano-de-contas/` (+`conta-linha.tsx`) ⚠️ **excluídas da migração**: mesmo padrão de linha expansível inline do `detalhe-parcela.tsx` (clicar em "Editar" transforma a linha inteira num formulário multi-campo `colSpan`), mais indentação hierárquica de árvore (grupo/filho) — nenhum dos dois é suportado pelo `TabelaLista`. Ficam como `<Table>` shadcn puro.
- [x] **Lançamentos**: `tabela-parcelas-abertas.tsx`, `tabela-eventos.tsx`, `configuracoes/recorrencias/page.tsx`, `configuracoes/regras-categorizacao/tabela-regras.tsx` — feito (`titulo` virou prop opcional nas duas tabelas de `lancamentos/`, cada página passa a sua). `tabela-regras.tsx` mantém a edição inline por célula (Select trocando span) porque isso cabe no modelo de coluna do `TabelaLista` — diferente do caso abaixo, não expande a linha. `detalhe-parcela.tsx` (⚠️ a tabela de "baixas" tem linha expansível inline pro formulário de anexo — `TabelaLista` não suporta linha expansível; mantida como `<Table>` shadcn puro, não migrada)
- [x] **Produtos/vendas**: `produtos-servicos/page.tsx` (+`produto-servico-linha.tsx` → virou `tabela-produtos-servicos.tsx`, edição inline por célula como `tabela-regras.tsx`), `vendas/page.tsx` (linha clicável via `linkPara`) — feito.
- [x] **Importação**: `importacao/historico/page.tsx` (linha clicável via `linkPara`) e `importacao/historico/[id]/page.tsx` ("Linhas com erro") migradas — feito. As outras 3 ⚠️ **excluídas da migração**, achado ao implementar (confirma a preocupação que este item já tinha no plano original): `passo-preview.tsx` e `passo-revisao.tsx` são grades de correção em massa — todo campo é um `Input`/`Select` sempre editável (não um modo de edição por linha), com checkbox de inclusão por linha, dentro de um container de altura fixa com scroll (`max-h-[32rem] overflow-auto`) que mostra **todas** as linhas de uma vez de propósito (o usuário precisa comparar/corrigir o lote inteiro antes de importar) — paginar essas grades quebraria esse fluxo. `passo-mapeamento.tsx` é uma prévia estática de 5 linhas fixas (sem sort/busca/paginação fazendo sentido) dentro de um step que já é um card — colocar outro card por dentro (cabeçalho, pill de contagem, caixa de busca) só adicionaria chrome sem ganho.
- [x] **Config diversa**: `configuracoes/campos-personalizados/page.tsx` — feito.

**Fatia 7 concluída.** Resumo: 15 tabelas migradas pro `TabelaLista` (Pessoas/equipe, Cadastros financeiros ×3, Lançamentos ×4, Produtos/vendas ×2, Importação ×2, Config diversa) + o motor ganhou `linkPara` (linha inteira clicável) e `acoes` agora aceita retornar `null` por linha. 6 tabelas ficam de fora, por design, não por falta de tempo: `detalhe-parcela.tsx` (baixas), `categorias/`, `plano-de-contas/` — todas usam linha expansível inline pra edição, incompatível com o motor atual; `passo-preview.tsx` e `passo-revisao.tsx` — grades de correção em massa sempre editáveis, sem paginação de propósito; `passo-mapeamento.tsx` — prévia estática de 5 linhas, sem ganho nenhum das features do `TabelaLista`.

_Depende de:_ Fatia 4 (usa o mesmo `tabela-lista.tsx`). Independente das Fatias 5/6 — pode rodar em paralelo.
_Teste:_ um grupo por vez, mesma checagem da Fatia 6. Tabelas de importação (`passo-preview`, `passo-mapeamento`, `passo-revisao`) merecem atenção redobrada — são o único caso onde tabela aparece dentro de um fluxo de wizard, checar que paginação/scroll não quebra o fluxo de avançar/voltar passo.

## Fatia 8 — Varredura final [x] concluída

Depois de todas as fatias anteriores: passar por todas as ~30 páginas de tabela + 12 de gráfico uma última vez, em telas estreita/média/larga, procurando qualquer resquício visual do padrão antigo (borda genérica, tabela sem ícone, badge sem bolinha) que tenha escapado da migração página-a-página. Confirmar que nenhum arquivo ainda importa `Public+Sans`/`Cabinet+Grotesk`/nome antigo de fonte.

_Depende de:_ Fatias 1–7 completas.

**Verificação estática (grep):**
- Nenhum arquivo fora das 6 exceções documentadas na Fatia 7 ainda importa `<Table>` do shadcn — confirmado, os 8 arquivos encontrados são exatamente os esperados.
- Nenhum arquivo importa `Public+Sans`/`Cabinet+Grotesk`/nome antigo de fonte — confirmado, zero ocorrências.
- Hex hardcoded restantes (`text-[#…]`/`bg-[#…]`) revisados um a um — todos são ou (a) arquivos de exceção da Fatia 7, ou (b) cor arbitrária de categoria/UI já deliberada em fatias anteriores (tom âmbar "pendente", azul "projetado", tooltip escuro de gráfico), ou (c) confirmada com bom contraste em dark mode por conta própria. Nenhum resquício real.

**Verificação responsiva (375px/768px):** 3 sweeps em paralelo (Relatórios+Painel, Cadastros+Pessoas, Lançamentos+Vendas+Importação) cobrindo ~50 rotas. Achados, todos corrigidos:
- `configuracoes/contas-financeiras/nova-conta-form.tsx` — grid de 5 colunas fixas sem variante mobile.
- `configuracoes/estrutura-dre/nova-linha-form.tsx` — grid de 4 colunas fixas sem variante mobile.
- `configuracoes/estrutura-dre/linha-dre-item.tsx` — fileira flex (setas + rótulo + badge + botão Remover) sem `min-w-0`/truncamento no rótulo.
- `vendas/venda-form.tsx` — linha de item (produto/qtd/preço/total/remover) sem scroll próprio; ganhou `overflow-x-auto` + `min-w`.
- `components/formularios/rateio-categorias.tsx` (usado em Receitas/Despesas) — mesma correção nos dois níveis (linha de categoria e sub-linha de centro de custo); precisou também de `min-w-0` no wrapper em `evento-financeiro-form.tsx` porque o grid pai (`sm:grid-cols-2`) sem `min-w-0` deixava o filho com `overflow-x-auto` esticar a coluna inteira — mesma causa-raiz do bug de item de grid/flex que não encolhe abaixo do conteúdo sem `min-width:0` explícito.
- `vendas/page.tsx` e mais 4 páginas com fileira de pills de filtro (`configuracoes/centros-custo`, `configuracoes/formas-pagamento`, `contas-a-pagar`, `contas-a-receber`) — ganharam `flex-wrap` defensivamente.
- `importacao/planilha/wizard.tsx` e `importacao/pessoas/wizard.tsx` — indicador de passos (`<ol>`) sem `flex-wrap`.

Todas as correções verificadas em 375px e 768px após o fix, typecheck limpo.

---

## Fora de escopo (herdado da spec)

Virtualização de linha, seleção em massa de linha, tabelas de wizard como prioridade alta (existem, migram na Fatia 7, mas não ganham tratamento especial além disso).
