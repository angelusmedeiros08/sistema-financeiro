# Pesquisa: referências visuais para a reforma de design (agosto/2026)

Mapeamento consolidado de 11 frentes de pesquisa paralela, feito a pedido explícito do usuário antes de começar uma reforma visual completa do sistema — objetivo declarado: "deixar menos cara de IA", trocar fontes, evitar o roxo/violeta padrão, usar bibliotecas de componentes mais comerciais. Nenhuma implementação aconteceu nesta etapa; isso é só o mapeamento pra decidir amanhã por onde começar.

## 1. O diagnóstico: por que o app tem "cara de IA" hoje

Existe um fenômeno documentado na comunidade de design chamado **"shadcn trap"** / **"shadcn fingerprint"**: ferramentas de IA generativa de código (Claude, v0, Cursor) tendem a produzir shadcn/ui "de fábrica" — neutros slate/zinc, `border-radius` padrão, fonte Inter sem tratamento — e isso se tornou reconhecível instantaneamente como "app feito por IA". Artigos especializados ("Is Anyone Else Tired of Every Tailwind/shadcn App Looking the Same?", "The shadcn trap") descrevem exatamente esse problema.

**A conclusão prática mais importante desta pesquisa inteira**: o problema não é a arquitetura de componente do shadcn/Radix (que é sólida, acessível, e já está bem integrada no projeto) — é **nunca ter customizado os tokens default**. A correção documentada são 5 ajustes:

1. Trocar os neutros (slate/zinc → uma escala própria, com viés de cor)
2. Mudar o `border-radius` do "meio-termo seguro" padrão (0px anguloso, ou um raio mais generoso e consistente por função — nunca o default genérico)
3. Trocar Inter por um par tipográfico com intenção (display + corpo)
4. Usar uma cor de destaque saturada e de marca, não a paleta default
5. Adicionar um "token de assinatura" (textura, sombra, easing de transição customizado)

Isso muda a estratégia da reforma: **não é trocar de biblioteca de componente**, é reter shadcn/Radix como base técnica e customizar tokens com disciplina.

## 2. Sobre o roxo/violeta especificamente

A pesquisa refutou uma hipótese simplista. Roxo em si não é o problema — o problema é **roxo como cor de fundo, gradiente ou superfície dominante**, geralmente pareado com Inter sem tratamento. Evidências:

- **Airwallex** usa roxo saturado (`#612FFF`) só em botões sólidos pontuais, sobre uma tela 95% branca/cinza — não lê como "cara de IA".
- **Railway** usa roxo como accent de marca sobre base neutra escura, de forma contida — funciona.
- **Qonto** literalmente abandonou o roxo elétrico que usava até 2022 como cor hero, migrando pra quase-monocromia (preto/branco), mantendo roxo só como paleta de apoio para ilustração/categorização.
- **Projuris** (sistema jurídico brasileiro) usa roxo/violeta especificamente para destacar "IA" no produto — um sinal de que o mercado já associa essa cor a "recurso de IA", reforçando por que ela cansa visualmente quando é a cor estrutural inteira do produto.

**Padrão real das referências mais fortes**: uma única cor de acento, usada com extrema parcimônia, nunca em gradiente, nunca como fundo de superfície grande. A cor pode até ser roxo — o pecado é usá-la em tudo.

## 3. Direção de marca recomendada

### Paleta

O app já tem um ponto de partida correto: teal para valores positivos (`#157F6B`/`#0F5F50`) e terracota para negativos (`#D8583A`) — já foge do azul/roxo genérico do setor. A pesquisa validou e reforçou essa direção: **verde-petróleo escuro é hoje a cor "séria" mais recorrente entre fintechs B2B premium** — Pennylane (`#003D3D`) e N26 Business (`#003B39`) convergiram nele de forma independente, e é descrito como "o novo azul-marinho" da nova geração de fintechs europeias.

Direção recomendada — **manter e aprofundar o teal existente**, não trocar:

| Papel | Cor | Hex | Nota |
|---|---|---|---|
| Accent primário (positivo) | Teal | `#157F6B` / `#0F5F50` | Manter — já é o ponto de partida certo |
| Negativo/alerta | Terracota | `#D8583A` | Manter |
| Texto/tinta principal | Carvão quente | `#1A1D1F` | Preto suavizado, não `#000` puro |
| Superfície escura opcional | Grafite esverdeado | `#1B2321` | Harmoniza com o teal em vez de competir |
| Fundo neutro (light mode) | Cinza-pedra ou bege quente | `#F5F4F1` / `#F7F6F3` | Evitar o cinza-azulado `#F9FAFB` padrão de SaaS genérico — Pennylane usa bege (`#F8F4F1`) com o mesmo efeito de "parece papel, não template" |
| Accent terciário — prestígio/destaque pontual | Dourado envelhecido | `#A87C1F` / `#C99A3B` | Usar só em badges/destaques pontuais — nunca em botão primário (regra confirmada tanto por branding jurídico quanto pelo padrão "um único accent extremo, racionado" das fintechs premium) |

**Ação concreta pendente**: o botão de e-mail de convite hoje usa roxo (`#6d28d9`, o violeta-700 padrão do Tailwind) — trocar pro teal primário.

### Tipografia

Achado mais consistente de toda a pesquisa, repetido em praticamente todas as 11 frentes: **nenhuma referência forte usa Inter puro como fonte de título**. Todas usam um par — uma fonte de display com personalidade (geométrica ou serifada) + uma fonte de corpo neutra e legível. Evidências: Pennylane (Manrope), Qonto (QontoSans proprietária), Revolut (Aeonik Pro + Inter só no corpo), N26 (fonte própria baseada em GT America), Wise (Wise Sans proprietária), Stone (Sharon, encomendada de fundição), Cora (Larken serifada + Uncut Sans), Conta Simples (Ivar serifada + Nunito), Asaas (Geist + Space Grotesk), Tiny (Poppins + Soleil).

**Recomendação de par tipográfico**: **Cabinet Grotesk** (display/headline, títulos de seção, números grandes de KPI) + **Public Sans** (corpo/UI/tabelas, formulários, rótulos).

- Ambas grátis (SIL OFL), sem atribuição obrigatória, sem risco de licenciamento.
- Cabinet Grotesk tem personalidade real sem ser decorativa (perna curva no "R", terminais angulados) — dá o "momento de marca" nos títulos e KPIs.
- Public Sans é usada quase exclusivamente por governo/civic tech americano — nenhum concorrente SaaS a usa, o que é diferenciação genuína — e tem tabulares confiáveis (crítico pra alinhamento de coluna numérica em tabela financeira) e suporte a português confirmado.
- **Alternativa mais simples de manter** (um único fornecedor): Geist + Geist Mono (Vercel) — tabulares nativos sem precisar configurar OpenType feature, mas caminha pra virar "o novo Inter" entre produtos técnicos, perdendo um pouco de diferenciação.
- **Evitar Söhne** mesmo sendo tecnicamente excelente — é hoje a fonte mais copiada do fintech mundial (é a fonte da Stripe), e a pesquisa aponta explicitamente o risco de parecer "clone de Stripe" em vez de identidade própria.

## 4. Mapeamento de referências visuais

### 4.1 Conta Azul e concorrentes brasileiros diretos

Pesquisa com extração real de CSS/hex (não estimativa), incluindo screenshots do produto autenticado (não só marketing) para Conta Azul, Omie e Nibo.

- **Conta Azul** — a referência mais forte e mais confiável do grupo. **Único caso confirmado de tipografia verdadeiramente proprietária**: fonte "Ping Pong", encomendada a um type designer específico (Fábio Haag), 7 pesos, itálicos verdadeiros. Paleta documentada em tokens nomeados (`--color-blue-ca-*`), sombras suaves e difusas (`0px 8px 12px 0px #c6c6c633`) em vez de bordas duras, botões em pílula. A identidade se confirma tanto no marketing quanto no produto logado real.
- **Omie** — maior gap entre marca e produto do grupo: marketing ousado (cyan `#00e2f4` + limão elétrico `#d8fe00` + Poppins), mas o dashboard real (confirmado por screenshots autênticos) usa sidebar navy genérica, blocos de cor sólida tipo alerta, tabelas densas estilo planilha — a personalidade do marketing não chega ao produto.
- **Bling** — combinação incomum roxo+verde-menta (`#7f76ff` + `#93f574`) e fonte Satoshi; produto logado não confirmado (só marketing).
- **Nibo** — o mais "seguro"/genérico no produto real (cinza+azul+cards flat), mas com um detalhe de UX bem executado: linha sólida para saldo realizado vs. linha tracejada para saldo projetado no gráfico de fluxo de caixa.
- **Granatum** — identidade de marketing distinta (gradiente azul→ciano, fonte display "Ondo"), produto logado não confirmado.

**Achado-chave**: nenhum dos 5 usa roxo/violeta tipo Tailwind indigo-600 como cor principal de marca — azul é o território mais disputado (Conta Azul, Nibo, Granatum todos usam variações de azul). Isso é um dado relevante se a ambição for se diferenciar cromaticamente desse grupo específico (o teal já cumpre esse papel).

### 4.2 Fintechs brasileiras adicionais (lote 2)

- **Stone** — o design mais "de sistema" de toda a pesquisa brasileira: tipografia proprietária encomendada de fundição ("Sharon" — Sharon Sans/Display/Serif), verde consistente (`#00DA00`) em toda a jornada, submarca Ton com tipografia condensada própria pro público mais jovem.
- **Cora** — serifa editorial Larken + coral vibrante `#FE3E6D` — foge completamente do estereótipo azul/roxo, tom de revista.
- **Conta Simples** — paleta mais ousada do lote: verde-floresta `#0F352B` + creme `#FEFDF3` + lima `#DFFFAE`, tipografia serifada custom "Ivar" — quase marca de lifestyle/sustentabilidade.
- **Asaas** — Geist + Space Grotesk, azul elétrico `#0038E5`; marketing forte mas reviews de usuários citam painel "poluído".
- **Tiny ERP** — caso de retrofit de UX documentado publicamente ("Novo Tiny": sidebar fixa, breadcrumbs, ações padronizadas); navy+creme+oliva foge do clichê.
- **InfinitePay** — usa roxo (`#6E08F2`) como cor-âncora mas foge da "cara de IA" combinando com dourado saturado e tipografia condensada/bold tipo pôster — maximalista, não corporativo.
- **Contabilizei** — elo mais fraco: roda sobre tema Bootstrap pouco customizado, sem fonte própria. Exemplo do que evitar.

### 4.3 Sistemas jurídicos brasileiros

Pesquisado porque o fundador vem de um escritório de advocacia e queria essa referência de "seriedade profissional" mesmo o produto final sendo um ERP genérico, não jurídico.

- **Astrea (Aurum)** — reputação de "provavelmente o mais bonito entre os softwares jurídicos brasileiros" (fonte terceira). Hero em azul-índigo bem escuro, Kanban visual como diferencial de produto.
- **Projuris** (absorveu o SAJ ADV/Softplan) — mais robusto em amplitude (8+ produtos), mas é o exemplo mais claro de "cara de SaaS genérico" dentro do próprio universo jurídico: cards brancos soltos com borda cinza fina, ícone de linha pequeno, gradiente azul→roxo no CTA.
- **Legal One (Thomson Reuters)** e **CP-Pro** — sinais concretos de sistema legado datado (reclamações de usuários sobre complexidade excessiva, produto com funcionalidades descontinuadas).
- **Padrão de cor do nicho jurídico**: azul-marinho como base estrutural + um acento saturado pra CTA/IA — não é "navy monocromático austero" como se poderia supor. Dourado/bordô, associados a "tradição jurídica", apareceram só em identidade de escritório físico, não em produtos de software.

**Nota de segurança**: durante essa pesquisa, alguns sites jurídicos dispararam redirecionamentos de anúncio agressivos (pra páginas de concorrentes financeiros) — o agente de pesquisa fechou as abas sem seguir nenhum conteúdo, sem risco.

### 4.4 Benchmarks internacionais SaaS/fintech de design premiado

- **Mercury** — a referência #1 mais direta: tipografia proprietária editorial ("Arcadia"), paleta extremamente disciplinada (azul-royal `#5266eb` como única cor de ação), terminologia de produto de software em vez de jargão bancário. Prova que dá pra ser "institucional mas moderno" sem ser datado.
- **Linear** — referência de método, não de paleta (o indigo deles é o próprio "roxo de IA" a evitar como cor, mas o *processo* vale copiar): geração de tema matematicamente consistente via espaço de cor LCH, tipografia com peso customizado (Inter tratada com `font-feature-settings`, nunca "crua").
- **Stripe Dashboard** — fonte proprietária Söhne em pesos leves (300/400), cor quase inteiramente funcional (roxo `#533afd` só em ações-chave).
- **Ramp** — evoluiu pra sistema editorial preto-e-branco + um único amarelo-destaque; usa **system font stack** (não fonte custom) com headlines em line-height apertadíssimo (≤1.05).
- **Attio** — foge do azul/roxo padrão indo pra verde-floresta/teal (`#3ABDAF`) — a prova mais direta de que teal funciona bem em CRM/dashboard denso sem parecer "brincalhão".
- **QuickBooks/Xero** — servem como "o que evitar": ainda carregam visual mais corporativo-tradicional que os fintechs acima.

**Padrões repetidos entre as referências mais fortes**: uma única cor de acento usada com parcimônia extrema; nenhuma usa roxo/violeta como cor estrutural de produto; tipografia sempre tratada (nunca Inter "crua"); cor como informação (status), nunca decoração; sidebar fina com alinhamento rigoroso; sistema de raio de borda escalonado por função, não um raio único aplicado a tudo.

### 4.5 Fintechs europeias premium

- **Pennylane** — o "gêmeo europeu" mais próximo do produto (fintech contábil B2B tudo-em-um, mesmo público: PME + escritórios contábeis). Verde-petróleo quase-preto `#003D3D` + accent verde-neon `#00F872` usado cirurgicamente + fundo bege `#F8F4F1` (não branco/cinza frio) + Manrope. Reduziram tempo de conclusão de tarefa em 47% num redesign de navegação com "submenus fixáveis" e "themed product spaces" (seções do produto com tratamento visual diferenciado dentro da mesma sidebar).
- **Qonto** — abandonou o roxo histórico, foi para quase-monocromia preto/branco com tipografia proprietária carregando 100% do peso visual.
- **Revolut Business** — renderização 3D fotorrealista em vez de ilustração flat; Aeonik Pro pra display, Inter só no corpo.
- **Airwallex** — usa roxo, mas só em botão sólido pontual sobre 95% branco/cinza (ver seção 2).
- **N26 Business** — convergiu no mesmo verde-petróleo da Pennylane (`#003B39`) de forma independente; fotografia lifestyle real em vez de ilustração/3D abstrato.
- **Wise Business** — verde-floresta + verde-menta pálido, tipografia proprietária "Wise Sans".

### 4.6 Dashboards de developer tools (referência pra telas densas de dado)

Mais relevante para as telas tipo "admin" do sistema (Plano de Contas, Categorias, Regras de Categorização).

- **Supabase Dashboard** — a referência mais direta (é literalmente a ferramenta usada no projeto): dark-first, verde único como accent (`#3ecf8e`), **hierarquia de profundidade por borda em 3 níveis** (`#242424`→`#2e2e2e`→`#393939`) em vez de zebra-striping ou sombra pesada. Modelo direto de copiar pra telas de grade densa.
- **Retool** — desenhado especificamente pra admin panels: **densidade ajustável pelo usuário** (compacta/confortável) e painel de detalhe abrindo ao lado da linha selecionada em vez de modal solto.
- **Vercel** — quase monocromático, elevação por "ring" de 1px em vez de sombra, tipografia Geist com tracking negativo em títulos.
- **Metabase** — light-first (útil como referência já que o app não é dark-first), permite tema por tenant definindo só 3 cores-base + paleta de gráfico — padrão interessante se algum dia quisermos permitir customização de marca por cliente.
- **Railway** — único do grupo que usa roxo como assinatura de marca central, mas de forma contida (accent sobre base neutra escura, nunca dominante) — combina IBM Plex Serif no hero com Inter no resto, quebrando a expectativa "100% sans-serif técnica".

## 5. Stack técnica recomendada

### Componentes

**Manter shadcn/ui + Radix como base técnica** (não trocar — a arquitetura já é sólida e a integração já está feita), complementado por:

1. **TanStack Table** (tanstack.com/table) — headless, MIT, ~15KB. É o padrão que o próprio shadcn/ui documenta oficialmente pra "Data Table". Resolve o problema central de tabelas densas de lançamento/parcela (sort, filtro, paginação, seleção de linha) compondo nativamente com os componentes shadcn já existentes (Table, Checkbox, DropdownMenu). **TanStack Virtual** (mesma família, integração oficial documentada) fica pra quando o volume de linhas realmente pesar na performance — não precisa adiantar a implementação, só a escolha da lib.
2. **`Empty` oficial do shadcn/ui** (`npx shadcn add empty`) — o shadcn agora tem um componente pronto (`Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent`), não precisa mais reinventar o padrão título+descrição+CTA em cada tela sem dado. Zero dependência nova, ganho de polish amplo e imediato — prioridade alta de implementação.
3. **`Skeleton` do shadcn/ui — já está instalado no projeto**, só falta ser usado de forma disciplinada (compor o formato exato de cada linha de tabela/card, não um retângulo genérico com shimmer). Não adotar `react-loading-skeleton` — seria uma segunda "linguagem" de estilização sem ganho sobre o que já existe.
4. **dnd-kit** (dndkit.com) — só quando reordenar categorias/plano de contas/linhas de importação virar feature confirmada, não adiantar agora. É o padrão de mercado (react-beautiful-dnd está oficialmente morto, arquivado pela Atlassian em 30/04/2025), com acessibilidade de teclado/ARIA pronta de fábrica. Existe um template já pronto integrando dnd-kit+TanStack Table+shadcn (`sadmann7/sortable` no GitHub) pra usar de referência quando chegar a hora.
5. **Untitled UI** (untitledui.com) e **Tailwind Plus/Catalyst** — não instalar literalmente (Untitled UI usa React Aria, conflita com o Radix do shadcn), mas usar como **referência de design tokens** (paleta neutra, tipografia, espaçamento, hierarquia de card) a reimplementar manualmente. Vale considerar a licença Figma da Untitled UI (mais barata, ~US$129) só como benchmark visual.

**Evitar**: Ant Design (visual datado/"enterprise chinês 2019", reescrita cara), Mantine/Park UI/HeroUI (sistemas de design completos concorrentes, forçariam retema total sem ganho claro), Radix Themes (conflita com o próprio theming do shadcn), Base UI/Ariakit (sem ganho sobre o Radix atual — monitorar Base UI a distância como possível sucessor do Radix no futuro).

**Plano B, não pra agora**: AG Grid Community (MIT, grátis) — só se surgir necessidade real de edição inline tipo planilha (copiar/colar em massa) que o TanStack Table não resolva de forma razoável.

### Gráficos financeiros específicos

**Correção de fato importante (2 rodadas de checagem, 19/08/2026)**: a primeira versão deste documento errou ao dizer que os gráficos do app eram "todos feitos à mão" — o app já usa **Recharts** de verdade em 5 componentes (`fluxo-chart`, `comparativo-barras`, `evolucao-ponto-equilibrio-chart`, `indicadores-dre-chart`, e o waterfall do DRE via `BarChart`+`Cell` colorido por barra). Só `aging-barras` (CSS puro, barra com `width%`), `indicador-gauge` (barra linear em `div`s) e `top-categorias-donut` (`<circle>` com `strokeDasharray` manual) são de fato sem biblioteca. Uma primeira versão desta pesquisa também recomendou **adicionar Tremor** — isso foi **revisto e descartado** após aprofundamento técnico:

- **Não adotar Tremor.** Motivo concreto, não só preferência: tanto `@tremor/react` quanto o Tremor Raw (modelo copy-paste) estão travados em `recharts@2.x`; o projeto já está em `3.10.1` (Recharts 3 reescreveu o state management internamente). Adotar Tremor significa ou duplicar o Recharts no bundle, ou portar manualmente o código do Tremor pra API do Recharts 3 — trabalho de manutenção contínuo, não um `npm install`. Some a isso que o `accessibilityLayer` do Recharts v3 (navegação por teclado + leitor de tela, default `true` desde a v3) **não é repassado pela API do Tremor** — adotar o wrapper hoje seria um passo atrás em acessibilidade pra um produto financeiro sério. E o Tremor **não tem waterfall nativo** (nem `@tremor/react` nem Tremor Raw) nem prop de `strokeDasharray` por série (necessário pro gráfico de saldo realizado-sólido/projetado-tracejado) — ou seja, nenhum dos dois gráficos mais específicos do domínio financeiro seria resolvido por ele mesmo se adotado.
- **Manter Recharts** para os 5 gráficos já existentes — não migrar. O ganho visual do Tremor seria menor do que parece: o design system opinativo dele precisaria ser todo sobrescrito pra bater com a paleta de marca (`#157F6B`/`#D8583A`/`#C98A1F`, tokens `--border`/`--popover`), que o projeto já faz hoje direto no Recharts com `Cell` por item.
- **KPI cards e sparklines**: usar **Recharts em modo compacto** direto (sem `CartesianGrid`/`XAxis`/`YAxis`, `dot={false}`) em vez do wrapper `SparkAreaChart` do Tremor — mesma técnica, sem a dependência nova nem o conflito de versão. Padrão de card: label pequeno muted → número grande em tabular-nums → delta (seta+%) colorido semanticamente, cor só no delta nunca no número → sparkline opcional no rodapé, mesma cor do delta. Evitar colorir o card inteiro ou empilhar muitos cards do mesmo peso visual lado a lado.
- **Fluxo de caixa com linha sólida (realizado) + tracejada (projetado)** — ainda não implementado no app (`saldo-projetado.ts` calcula os números, mas o `fluxo-chart.tsx` atual é `BarChart`, não linha). Quando for construído: **Recharts puro** é o caminho mais limpo — suporte nativo e documentado (`strokeDasharray` por `<Line>`, exemplo oficial "Dashed Line Chart"), diferente do Tremor (sem essa prop na API pública) ou visx (mais controle, mas mais código).
- **Waterfall**: confirmado como padrão correto pro DRE (ponte de EBITDA, variação orçado×realizado) — o truque atual (`Bar stackId` + `Cell`) é o padrão idiomático do Recharts e está alinhado ao uso convencional do mercado. Migrar pra visx só compensaria se precisar de conectores pontilhados entre barras ou rótulo de variação % flutuante — não por ganho estético isolado.
- **Donut, gauge e aging (os 3 sem lib)**: avaliar caso a caso, não em bloco. **Donut** é o melhor candidato pra formalizar com `@visx/shape` (`Pie`) — hoje é trigonometria manual em `strokeDasharray`, a lib resolve isso com menos código e abre caminho pra tooltip por fatia. **Gauge** só compensa migrar se o roadmap quiser evoluir pra um arco circular (`@visx/shape` `Arc`) — enquanto for barra linear, migrar a técnica de SVG-à-mão pra **`conic-gradient` em CSS puro** (zero dependência) é suficiente; não adotar `react-gauge-chart` (96KB gzip via `d3-geo`, desproporcional) nem `react-circular-progressbar` (não agrega sobre o que já existe). **Aging** fica como está — CSS puro já é simples e acessível, sem ganho em trocar.
- **Sankey pra fluxo de caixa** (complementar ao DFC já existente, não substituto): usar **ECharts** em vez de Nivo (que não suporta ciclos — relevante se houver transferência entre contas que retorna à origem). Mostra a composição interna do fluxo ("Receita → Categorias de despesa → Saldo") que a tabela do DFC não mostra.
- **Saldo projetado**: achado do mercado (Mercury, QuickBooks) — usam **linha/área com faixa de projeção**, não waterfall, pra esse tipo de indicador. O card numérico D+7/D+30/D+60 já implementado é o ponto de partida; essa forma de gráfico é evolução visual futura, a construir em Recharts puro (ver acima).

### O que evitar como templates prontos

Pesquisa crítica de 9 templates de admin dashboard — **4 viraram clichê visual reconhecível e devem ser evitados como base**: TailAdmin (o mais reconhecível de todos, "template baixado" instantâneo), Horizon UI (estética datada ligada a web3/NFT), Flowbite Admin Kit (tão onipresente quanto TailAdmin entre devs), Aceternity UI (efeitos aurora/beam/lamp já são meme visual de "produto de IA genérico" — o próprio criador reconheceu o problema e lançou uma ferramenta pra lidar com isso).

**Valem estudar (não copiar 1:1)**: Cruip/Mosaic Pro (tem versão dedicada a FinTech, reputação de acabamento "não parece template"), HyperUI (só como referência de marcação HTML crua, é deliberadamente neutro).

## 6. Ferramentas de apoio

- **Ícones**: manter Phosphor Icons (7.700+ ícones, 6 pesos — vantagem real pra um domínio com ícones específicos como nota fiscal/boleto/conciliação em múltiplos estados). Sem motivo forte pra trocar por Lucide (o "default" do shadcn) ou Untitled UI icons agora.
- **Command palette**: `cmdk` **já está instalado** (`package.json`), mas hoje só é consumido dentro de `components/ui/command.tsx` — o primitivo que o shadcn usa por baixo dos comboboxes com busca (ex.: seletor de pessoa/categoria), não como paleta de comando global tipo Cmd+K. O gap real não é instalar a lib, é **montar um atalho global** (Cmd+K abrindo busca rápida de lançamento/cliente/relatório) reaproveitando o `Command` que já existe.
- **Animação**: **Motion** (ex-Framer Motion, motion.dev) — usar com disciplina, só em microinterações funcionais (hover/tap, transição de modal/tooltip, stagger de lista). Excesso de motion é um dos sinais de "startup genérica" a evitar, segundo a própria pesquisa.
- **Galeria de inspiração pra consulta contínua**: **Refero** (refero.design) — achado de uma segunda rodada de pesquisa, maior ainda que Mobbin (132 mil+ telas reais buscáveis por padrão de UX/empresa/linguagem natural), com plugin Figma e até um **MCP** pra consultar direto por agente de IA — vale registrar como ferramenta de consulta contínua, inclusive automatizável. **Mobbin** continua relevante (filtro direto "Finance+"/dashboard financeiro). **BentoGrids** (bentogrids.com) pro padrão de layout modular que já flertamos no ciclo de Central de Indicadores. **Screenlane** como terceira opção de screenshot real com busca por elemento específico. SaaSFrame/Land-book/Godly/Lapa Ninja ficam mais pra landing page de marketing do que telas internas do ERP.
- **Ilustração de empty state**: unDraw hoje é considerado clichê ("bonequinhos roxos" reconhecíveis em qualquer lugar). Dado o tom sério do produto (ERP jurídico-financeiro), a recomendação é **abandonar personagem ilustrado e usar iconografia geométrica simples** (linha fina, cor de marca) em vez de comprar de um banco de ilustração — mais alinhado ao "sem cara de IA" já é o objetivo do projeto. Se quiser manter ilustração, **Blush** é a alternativa menos clichê ao unDraw.

## 7. Design systems enterprise — estudar padrões, não adotar como biblioteca

Pesquisa dedicada a IBM Carbon, Shopify Polaris, Atlassian Design System, GitHub Primer e Salesforce Lightning (SLDS) — os sistemas mais maduros do mercado especificamente pra aplicações densas em dado (o problema mais próximo do nosso: plano de contas, lançamentos, tabelas grandes).

**Recomendação: não adotar nenhum como biblioteca real.** Todos trazem sistema de token/CSS/tema próprio que colidiria com Tailwind/shadcn já em uso, e dois dos cinco estão em situação de manutenção decadente pra React — **Polaris React foi oficialmente descontinuado** (Shopify migrou pra Web Components em out/2025) e o wrapper React do Salesforce (`design-system-react`) é projeto "community-supported", não o caminho oficial (a Salesforce foca em LWC, não React, e a fonte "Salesforce Sans" é proprietária/não redistribuível).

**Vale estudar e reimplementar em cima do shadcn**, em ordem de relevância pro nosso problema de "grid de lançamento financeiro com muitas colunas numéricas":

1. **GitHub Primer `DataTable`** (primer.style) — o achado mais concreto e diretamente aplicável: **alinhamento à direita nativo pra coluna numérica** (facilita comparação visual de valores — ponto direto pro Plano de Contas/tabela de lançamento), **três níveis de densidade de célula** (Condensed/Normal/Spacious, ideia pra oferecer como preferência do usuário), sistema de largura de coluna flexível (`grow`/`auto`/fixa com min/max). Fonte própria Mona Sans (open source). É o mais "produto de dev tool contemporâneo" dos cinco, o que menos parece "enterprise datado".
2. **IBM Carbon `DataTable`** (carbondesignsystem.com) — segunda referência forte pro padrão de seleção em massa + toolbar de ações + paginação. Achado relevante: o próprio time do Carbon (IBM Products) está migrando o motor interno de tabela pra **TanStack Table**, mantendo Carbon só como camada visual — valida a decisão já tomada aqui de separar motor de tabela (headless, TanStack) da camada visual (shadcn).
3. **Atlassian `dynamic-table`** (atlassian.design) — vale estudar o conceito de "calm density" (densidade de informação sem parecer sobrecarregado) e a categoria tipográfica dedicada **"Metric"** (28/24/16px, pensada pra números em destaque) — aplicação direta pros KPIs do painel de Indicadores. Fonte própria "Atlassian Sans".
4. **Polaris `IndexTable`** — só como referência de UX de bulk actions/seleção (não copiar código, já descontinuado em React).
5. **SLDS** — menor prioridade, só como contexto histórico de CRM financeiro enterprise denso.

## 8. Utilitários que faltam no projeto hoje

Levantamento do que o projeto **não tem ainda** (confirmado no `package.json` e no código-fonte, não suposição) e o que a pesquisa recomenda pra cada gap:

| Gap confirmado | Recomendação | Por quê |
|---|---|---|
| Sem lib de toast/notificação (feedback hoje é só texto inline, `{erro && <p>}`) | **Sonner** (sonner.emilkowal.ski) | É hoje o padrão oficial do shadcn/ui — o componente `Toast` baseado em Radix foi descontinuado na documentação, que recomenda Sonner no lugar. ~47M downloads/semana (9,7x mais que react-hot-toast), integração nativa com os tokens de tema do projeto. |
| Sem geração de PDF (relevante pra exportar DRE/relatórios, e futuramente boleto/nota) | **@react-pdf/renderer** (react-pdf.org) | Único que roda limpo em função serverless da Vercel sem infraestrutura extra (Puppeteer/Playwright exigiriam Chromium ~300MB e setup pesado). Permite registrar a fonte de marca e cores via `Font.register()`/`StyleSheet`. |
| Datas via `Date` nativo + funções próprias (`somarDias` etc.) | **date-fns**, introduzido seletivamente (não substituir tudo) | Cobre nativamente dias úteis (`addBusinessDays`, `isWeekend`), fim de mês, diferença de dias — exatamente o que hoje é código próprio no domínio de vencimento/parcelamento/regime de competência. Tree-shakeable por função, líder de adoção (~91,7M downloads/semana). Feriado nacional continua sendo lógica própria — nenhuma das libs pesquisadas (date-fns/Day.js/Luxon) tem calendário de feriados BR embutido. |
| Sem dark mode / toggle de tema | **next-themes** (github.com/pacocoursey/next-themes) | Segue sendo o padrão de fato pra Next.js+Tailwind — resolve o "flash de tema errado" injetando script bloqueante no `<head>` antes da hidratação. Menos de 1KB, mantido ativamente (compatibilidade React 19 confirmada). |
| `zod` instalado (devDependency) mas não usado em lugar nenhum | — | Registrar como achado, não como recomendação de lib nova — já está no projeto, só falta decidir onde aplicar (validação de formulário é o uso mais natural, especialmente combinado com `react-hook-form` se um dia for adotado). |

## 9. Ferramentas de pagamento e documento brasileiro

Hoje o app só registra "Pix"/"Boleto" como rótulo de forma de pagamento (texto livre), sem gerar nada de verdade. Pra quando isso virar funcionalidade real:

- **Pix estático (copia-e-cola), sem provedor pago**: `pix-utils` (npm) pra montar o payload EMV certo (mais próximo de uma implementação de referência do Bacen, cobre os vários tipos de chave) + a lib `qrcode` (genérica, estável) pra renderizar a imagem. Cobre só o caso simples, sem confirmação automática de pagamento.
- **Boleto e Pix dinâmico com webhook de confirmação** — não existe lib pura pra isso, precisa de provedor bancário (BaaS/PSP). **Asaas** é a recomendação de primeira escolha: documentação em português muito completa, sandbox fácil, um único endpoint (`POST /v3/lean/payments`) já emite boleto (com PDF) e Pix dinâmico. **Efí (ex-Gerencianet)** como opção mais "enterprise" se o produto crescer pra precisar de mais recursos bancários (Open Finance, CNAB) depois.
- **Validação/formatação de CPF/CNPJ**: `cpf-cnpj-validator` (npm, carvalhoviniciusluiz) — mantido ativamente, já suporta o **CNPJ alfanumérico** da Receita Federal (mudança que passou a valer em 2026), com adapters pra Zod (que já está instalado no projeto, sem uso — esse seria um uso natural).

## 10. Padrões de navegação e densidade de dado — recomendações concretas

Pra telas densas (Plano de Contas, Categorias, Regras de Categorização, tabelas de lançamento): seguir o modelo do **Supabase Table Editor** — hierarquia de profundidade por borda em 3 níveis em vez de zebra-striping ou sombra pesada, uma única cor de acento reservada a estado/ação, tipografia majoritariamente em peso regular pra não competir com o dado. Complementar com a ideia do **Retool** de densidade ajustável pelo usuário (compacta/confortável) e detalhe-ao-lado-da-linha em vez de modal.

Pra sidebar: a Pennylane (a referência mais próxima do nosso próprio produto) documentou um redesign de navegação com submenus fixáveis/recolhíveis e "themed product spaces" (módulos com tratamento visual diferenciado dentro da mesma sidebar) que reduziu tempo de conclusão de tarefa em 47% — vale estudar esse case a fundo quando chegar a hora de reorganizar a sidebar (que já está mapeada como etapa futura dedicada, ver memória do projeto).

## 11. Próximos passos

Isso é só o mapeamento — nenhuma decisão final foi tomada, nenhum código foi alterado. Os pontos que precisam de decisão explícita do usuário antes de qualquer implementação:

1. **Aprovar (ou ajustar) a direção de paleta**: teal/terracota existentes + carvão quente + dourado envelhecido como accent terciário.
2. **Escolher o par tipográfico**: Cabinet Grotesk + Public Sans (recomendado) vs. Geist + Geist Mono (mais simples) vs. outra combinação.
3. **Aprovar a decisão técnica de componente/gráfico**: manter shadcn/Radix + Recharts (não adotar Tremor — conflito de versão com Recharts 3 já em uso e perda de acessibilidade, ver seção 5), adicionar TanStack Table + `Empty` do shadcn (prioridade alta, zero dependência nova além do TanStack Table); formalizar o donut com visx quando houver tempo.
4. **Aprovar os utilitários novos**: Sonner (toast), @react-pdf/renderer (PDF), date-fns seletivo (datas), next-themes (dark mode) — seção 8.
5. **Decidir se/quando vale investir em pagamento real** (Pix/boleto via Asaas ou Efí) — seção 9, não é bloqueio pra reforma visual, é nota pra quando o produto crescer.
6. **Decidir escopo da primeira leva**: token de tema (cor/fonte/radius) primeiro em todo o app, ou uma tela piloto (ex.: Indicadores ou Painel) pra validar a direção antes de propagar?
7. Esse ciclo deve seguir o processo normal (`/brainstorming` → clarificar → propor abordagens → spec → plano → implementação) antes de qualquer código — este documento é só o insumo de pesquisa, não um spec aprovado.
