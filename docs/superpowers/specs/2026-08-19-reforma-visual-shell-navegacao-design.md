# Reforma visual, fase 2: shell de navegação (sidebar retrátil, navbar, paleta, IA)

## Contexto

A fase 1 (commit `e418d4a`) trocou paleta/tipografia/dark mode por cima da estrutura visual existente e redesenhou `/indicadores` como piloto. O usuário rejeitou esse resultado como insuficiente — quer mudar a estrutura de layout de verdade (sidebar, navbar, componentes, marca), não só os tokens por cima da mesma casca. Pediu explicitamente pra estudar sistemas comerciais reais antes de desenhar, o que já tínhamos feito (`docs/pesquisa-referencias-visuais-reforma-design.md`, 17 frentes) e aprofundamos com uma pesquisa dedicada ao mecanismo de sidebar retrátil (especificação original do GitLab Super Sidebar, issue `#390773`), e finalmente com **observação visual direta da Conta Azul autenticada** (o usuário logou e passou o controle da navegação) — capturas de tela reais confirmaram o mecanismo exato de sidebar, o botão de criação rápida "Novo registro", e a árvore de navegação completa deles via inspeção da árvore de acessibilidade.

**Achado real da Conta Azul que mudou o design em relação à primeira versão deste spec**: a sidebar deles vem **expandida por padrão**, com um botão manual pra colapsar (não colapsada por padrão); ao colapsar, passar o mouse expande de novo em overlay. E ao clicar num item com sub-menu, o **rail de ícones continua visível** e um painel largo abre do lado mostrando os itens daquele grupo (duas colunas) — não um mecanismo de "substituir a lista inteira" como o que já existe hoje no app. Também encontraram e adotaram: um botão "Novo registro" na navbar com menu de criação rápida (cada ação com atalho de teclado — Alt+D pra despesa, Alt+L pra cliente etc.) e um recurso de favoritar item de menu individual (estrela que aparece no hover de cada item, vira atalho fixo no topo).

## Escopo

**Dentro:**
- Paleta: terracota vira cor de marca/ação; separa-se do vermelho de erro (hoje os dois coincidem no mesmo hex, o que criaria conflito visual entre "botão de ação" e "conta vencida").
- Marca: remove o ícone de losango com gradiente; fica só wordmark tipográfico até o nome do produto ser decidido.
- Sidebar: rail retrátil, **expandido por padrão** com botão manual pra colapsar; uma vez colapsado, expande em overlay ao passar o mouse ou por foco de teclado. Item com sub-menu abre um painel contextual ao lado do rail (rail continua visível), não substitui a lista inteira.
- Favoritar item de menu: estrela por item (aparece no hover), vira atalho fixo no topo da sidebar.
- Navbar: ganha o wordmark da marca + botão "Novo registro" (menu de criação rápida com atalho de teclado por ação) + campo de busca.
- Reorganização leve da navegação: itens de uso diário continuam soltos; agrupa-se o periférico em Pessoas/Comercial/Análise.
- Estabelece a nova gramática visual de componente (card, badge, botão) e aplica em sidebar + navbar + `/painel` + `/indicadores`.

**Fora (ciclo seguinte):**
- Propagar a nova gramática de componente pro resto das ~30 telas do sistema.
- Nome de produto definitivo e ícone/símbolo de marca (fica wordmark-only até lá).
- Qualquer mudança de dado/lógica de negócio.

## Paleta

| Papel | Light | Dark | Nota |
|---|---|---|---|
| `--primary` (marca/ação) | `#D8583A` | `#E2694B` | Terracota — botão, link, foco |
| `--destructive` (erro/negativo) | `#B23A2E` | `#C94A3D` | Vermelho mais fechado, deliberadamente diferente do primary — nunca reusar o mesmo hex pros dois papéis |
| Semântica "positivo" (receita, saldo bom) | `#157F6B` | `#1F9C84` | Deixa de ser `--primary`, mas continua existindo como cor de estado — teal não é mais cor de marca |
| Accent terciário (dourado, pontual) | `#A87C1F` | `#C99A3B` | Mantido do ciclo anterior |
| Categórica 5 (sage, gráficos) | `#7A8B5C` | `#9BAE7A` | Mantido do ciclo anterior |
| `--foreground`/`--background` | carvão `#1A1D1F` / bege `#F5F4F1` | quase-branco quente / grafite `#17191A` | Mantido do ciclo anterior |

**Ação de migração**: todo hex `#D8583A` hoje usado pra semântica de "negativo/despesa/vencido" nos componentes de relatório (mesma varredura que já foi feita pro roxo no ciclo anterior) muda pra `#B23A2E`, pra não colidir visualmente com o novo botão primário.

## Marca

Remove o `<svg>` em losango com gradiente (hoje em `auth-shell.tsx` ×2 e `sidebar.tsx` ×1). Fica só `<span className="font-heading ...">Núcleo</span>` — tratado tipograficamente (peso, tracking), sem símbolo abstrato no lugar. Quando o nome definitivo for decidido, isso muda de novo — não vale investir em ícone agora.

## Sidebar retrátil

**Estado padrão**: expandida (~260px), igual à Conta Azul — não colapsada. Um botão no rodapé da sidebar colapsa manualmente pra rail de ~60px (só ícones); a preferência (expandida/colapsada) persiste em `localStorage`.

**Enquanto colapsada**: passar o mouse sobre o rail expande temporariamente **em overlay** (nunca empurra o conteúdo) — mecânica baseada na especificação original do GitLab Super Sidebar (issue `#390773`, a referência mais bem documentada do padrão) e confirmada visualmente na Conta Azul:
- Implementação: um "espaçador" de 60px sempre no fluxo normal do documento (garante que o conteúdo nunca se move) + o painel visual real em `fixed`, `z-50`, com a largura controlada por estado React.
- Abre rápido (~100ms de delay de entrada, evita abrir "de raspão"), fecha devagar (~250ms de delay de saída, dá tempo do mouse cruzar o espaço até o rótulo sem fechar no meio do caminho) — requisito direto de WCAG 1.4.13 (Content on Hover or Focus), citado explicitamente na especificação original do GitLab.
- Foco de teclado (`:focus-within` ou state equivalente) dispara a mesma expansão que hover — usuário de teclado precisa ver os rótulos, não navegar às cegas por ícone.
- `Esc` fecha e devolve foco ao rail.

**Item com sub-menu** (Relatórios, Configurações, e os novos grupos Pessoas/Comercial/Análise) — testado nos dois estados da Conta Azul, o comportamento muda conforme o rail está expandido ou colapsado:
- **Sidebar expandida** (padrão): clicar no grupo troca o conteúdo do próprio painel único pra "< Nome do grupo" + itens — exatamente o mecanismo `grupoAberto` que o app já tem hoje (`sidebar.tsx`). Não muda nada aqui, só a pele visual.
- **Sidebar colapsada**: clicar (ou passar o mouse) num grupo mantém o rail de ícones visível e abre um painel contextual adicional ao lado (~240px), com o mesmo cabeçalho "< Nome do grupo" — é a variante de duas colunas, só existe nesse estado.

**Favoritar item**: ícone de estrela aparece no hover de cada item de menu (folha, não grupo); clicar adiciona a um grupo "Favoritos" fixo no topo da sidebar, acima dos itens soltos. Lista de hrefs favoritados persistida em `localStorage`, por usuário.

**Base técnica**: reaproveita `SidebarProvider`/estrutura de menu do shadcn/ui (cobre acessibilidade dos itens e persistência via cookie/storage), mas o hover-expand-overlay e o painel de duas colunas são construídos por cima — confirmado na pesquisa que o modo `collapsible="icon"` oficial do shadcn empurra layout via espaçador, não sobrepõe, e não tem hover nativo (há um pedido em aberto da comunidade pra isso, sem resposta dos mantenedores).

## Navbar

Ganha o wordmark da marca (à esquerda) e, ao lado, um campo de busca ("Pesquisar") + botão **"Novo registro"** — menu de criação rápida listando as ações de criar mais comuns do sistema (Nova despesa, Nova receita, Novo cliente, Novo fornecedor, Nova venda...), cada uma com atalho de teclado (padrão Conta Azul: Alt+letra), acessível de qualquer tela sem precisar navegar até o módulo certo primeiro. Mantém o que já existe: nome do tenant, toggle de tema, e-mail, sair.

## Reorganização de navegação

Confirmado pela pesquisa (a própria Conta Azul agrupa "Gestão de Vendas e Clientes" como módulo único no material institucional dela — mesma lógica de agrupamento proposta aqui):

- **Soltos** (uso diário, um clique): Painel, Receitas, Despesas, Contas a receber, Contas a pagar, Fluxo de caixa.
- **Pessoas** (grupo novo): Clientes, Fornecedores.
- **Comercial** (grupo novo): Vendas, Produtos e serviços.
- **Análise** (grupo novo): Orçamento, Indicadores.
- **Sem mudança**: Relatórios (já é grupo, 9 sub-itens), Importação, Configurações (já é grupo, 9 sub-itens).

Resultado: 15 itens de topo → 10.

## Componentes

Esse ciclo aplica em sidebar, navbar, `/painel` e `/indicadores` a gramática visual já definida pela pesquisa (`pesquisa-referencias-visuais-reforma-design.md`), concretamente:
- **Card**: borda `1px` sutil em vez de sombra pesada (padrão Supabase/Vercel); um único accent de cor por card, nunca o card inteiro colorido.
- **Badge/status**: cor só no texto+fundo-claro (padrão já usado hoje, ex. `bg-[#D8583A]/12 text-[#B23A2E]`), nunca badge sólido cheio de cor.
- **Botão primário**: terracota sólido, raio consistente com o resto do sistema — sem gradiente.
- **KPI card**: label muted pequeno → número grande em Cabinet Grotesk com `tabular-nums` → delta colorido só nele (nunca no número) — mesmo padrão já estabelecido no ciclo 1 pro card de Saldo Projetado.
As demais ~30 telas do sistema herdam só os tokens de cor/fonte automaticamente (mesmo comportamento já validado no ciclo 1 — troca de token não quebra nada, só a aparência) até um ciclo de propagação dedicado que reconstrua cada tela com esses padrões de componente.

## Testes

- Sidebar abre expandida por padrão num usuário novo (sem preferência salva).
- Colapsar manualmente persiste depois de recarregar a página; colapsada não deixa texto cortado/ilegível (só ícone, com `title`/tooltip acessível).
- Hover sobre o rail colapsado expande em overlay sem mover nenhum elemento da página por baixo.
- Sair do hover rápido demais (cruzando o "triângulo" até o rótulo) não fecha a sidebar no meio do caminho.
- Navegar só por teclado (Tab) expande a sidebar colapsada e mostra os rótulos, sem precisar de mouse.
- `Esc` fecha a sidebar expandida (por hover) e devolve o foco ao rail.
- Sidebar expandida: clicar num grupo troca o painel único (mesmo mecanismo de hoje); colapsada: abre o painel de duas colunas com o rail ainda visível. Nos dois casos, "< voltar" retorna sem afetar o estado expandido/colapsado do rail.
- Favoritar um item faz ele aparecer no grupo "Favoritos" no topo; desfavoritar remove; sobrevive a reload.
- "Novo registro" abre o menu de criação rápida de qualquer tela; cada atalho de teclado funciona sem precisar abrir o menu primeiro.
- Botão "Salvar"/ação primária (terracota) e badge de "vencido"/despesa (vermelho) são visualmente distintos lado a lado.
- Mobile continua funcionando via Sheet, sem tentar aplicar hover (que não existe em touch).
