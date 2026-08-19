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

1. **Tremor** (tremor.so) — grátis desde a aquisição pela Vercel (jan/2025), MIT. Construído sobre a mesma base Radix+Tailwind do shadcn (zero conflito de sistema headless), modelo copy-paste idêntico. É hoje a referência específica pra "dashboard financeiro/analytics sem cara de template genérico" — KPI cards, badges de delta, tabelas com barra de progresso embutida. **Melhor integração de toda a pesquisa.**
2. **TanStack Table** (tanstack.com/table) — headless, MIT, ~15KB. É o padrão que o próprio shadcn/ui documenta oficialmente pra "Data Table". Resolve o problema central de tabelas densas de lançamento/parcela (sort, filtro, paginação, seleção de linha) compondo nativamente com os componentes shadcn já existentes (Table, Checkbox, DropdownMenu). Pra volume grande, acoplar **TanStack Virtual** (mesma família).
3. **visx** (Airbnb) — pra continuar evoluindo os gráficos já construídos à mão (waterfall, gauge, aging) sem perder controle visual — troca só o motor de renderização (D3 manual → composição React), preservando as decisões de design já tomadas, que hoje são um ativo do produto.
4. **Untitled UI** (untitledui.com) e **Tailwind Plus/Catalyst** — não instalar literalmente (Untitled UI usa React Aria, conflita com o Radix do shadcn), mas usar como **referência de design tokens** (paleta neutra, tipografia, espaçamento, hierarquia de card) a reimplementar manualmente. Vale considerar a licença Figma da Untitled UI (mais barata, ~US$129) só como benchmark visual.

**Evitar**: Ant Design (visual datado/"enterprise chinês 2019", reescrita cara), Mantine/Park UI/HeroUI (sistemas de design completos concorrentes, forçariam retema total sem ganho claro), Radix Themes (conflita com o próprio theming do shadcn), Base UI/Ariakit (sem ganho sobre o Radix atual — monitorar Base UI a distância como possível sucessor do Radix no futuro).

**Plano B, não pra agora**: AG Grid Community (MIT, grátis) — só se surgir necessidade real de edição inline tipo planilha (copiar/colar em massa) que o TanStack Table não resolva de forma razoável.

### Gráficos financeiros específicos

- **Sankey pra fluxo de caixa** (complementar ao DFC já existente, não substituto): usar **ECharts** em vez de Nivo (que não suporta ciclos — relevante se houver transferência entre contas que retorna à origem). Mostra a composição interna do fluxo ("Receita → Categorias de despesa → Saldo") que a tabela do DFC não mostra.
- **Saldo projetado**: achado importante — o mercado (Mercury, QuickBooks) usa **linha/área com faixa de projeção**, não waterfall, pra esse tipo de indicador. O card que acabamos de construir hoje pra D+7/D+30/D+60 é numérico; vale considerar essa forma de gráfico como evolução visual futura.
- **Waterfall**: confirmado como padrão correto pro DRE (ponte de EBITDA, variação orçado×realizado) — o que já foi construído à mão está alinhado com o uso convencional do mercado, não precisa mudar de abordagem.

### O que evitar como templates prontos

Pesquisa crítica de 9 templates de admin dashboard — **4 viraram clichê visual reconhecível e devem ser evitados como base**: TailAdmin (o mais reconhecível de todos, "template baixado" instantâneo), Horizon UI (estética datada ligada a web3/NFT), Flowbite Admin Kit (tão onipresente quanto TailAdmin entre devs), Aceternity UI (efeitos aurora/beam/lamp já são meme visual de "produto de IA genérico" — o próprio criador reconheceu o problema e lançou uma ferramenta pra lidar com isso).

**Valem estudar (não copiar 1:1)**: Cruip/Mosaic Pro (tem versão dedicada a FinTech, reputação de acabamento "não parece template"), HyperUI (só como referência de marcação HTML crua, é deliberadamente neutro).

## 6. Ferramentas de apoio

- **Ícones**: manter Phosphor Icons (7.700+ ícones, 6 pesos — vantagem real pra um domínio com ícones específicos como nota fiscal/boleto/conciliação em múltiplos estados). Sem motivo forte pra trocar por Lucide (o "default" do shadcn) ou Untitled UI icons agora.
- **Command palette**: adicionar **cmdk** (cmdk.paco.me) — mesma lib por trás do Cmd+K da Linear/Vercel/Raycast, sem estilo próprio imposto. Ganho de produtividade real pra busca rápida de lançamento/cliente/relatório.
- **Animação**: **Motion** (ex-Framer Motion, motion.dev) — usar com disciplina, só em microinterações funcionais (hover/tap, transição de modal/tooltip, stagger de lista). Excesso de motion é um dos sinais de "startup genérica" a evitar, segundo a própria pesquisa.
- **Galeria de inspiração pra consulta contínua amanhã**: **Mobbin** (mobbin.com) — única com filtro direto "Finance+"/dashboard financeiro, cobre telas de produto logado real (não só marketing), tem os padrões de UI genéricos (empty state, tabela) que vamos precisar tela por tela. SaaSFrame como segunda opção (exporta Figma). Land-book/Godly/Lapa Ninja ficam mais pra landing page de marketing do que telas internas do ERP.

## 7. Padrões de navegação e densidade de dado — recomendações concretas

Pra telas densas (Plano de Contas, Categorias, Regras de Categorização, tabelas de lançamento): seguir o modelo do **Supabase Table Editor** — hierarquia de profundidade por borda em 3 níveis em vez de zebra-striping ou sombra pesada, uma única cor de acento reservada a estado/ação, tipografia majoritariamente em peso regular pra não competir com o dado. Complementar com a ideia do **Retool** de densidade ajustável pelo usuário (compacta/confortável) e detalhe-ao-lado-da-linha em vez de modal.

Pra sidebar: a Pennylane (a referência mais próxima do nosso próprio produto) documentou um redesign de navegação com submenus fixáveis/recolhíveis e "themed product spaces" (módulos com tratamento visual diferenciado dentro da mesma sidebar) que reduziu tempo de conclusão de tarefa em 47% — vale estudar esse case a fundo quando chegar a hora de reorganizar a sidebar (que já está mapeada como etapa futura dedicada, ver memória do projeto).

## 8. Próximos passos

Isso é só o mapeamento — nenhuma decisão final foi tomada, nenhum código foi alterado. Pra amanhã, os pontos que precisam de decisão explícita do usuário antes de qualquer implementação:

1. **Aprovar (ou ajustar) a direção de paleta**: teal/terracota existentes + carvão quente + dourado envelhecido como accent terciário.
2. **Escolher o par tipográfico**: Cabinet Grotesk + Public Sans (recomendado) vs. Geist + Geist Mono (mais simples) vs. outra combinação.
3. **Aprovar a decisão técnica**: manter shadcn/Radix, adicionar Tremor + TanStack Table + visx (recomendado) — ou revisitar.
4. **Decidir escopo da primeira leva**: token de tema (cor/fonte/radius) primeiro em todo o app, ou uma tela piloto (ex.: Indicadores ou Painel) pra validar a direção antes de propagar?
5. Esse ciclo deve seguir o processo normal (`/brainstorming` → clarificar → propor abordagens → spec → plano → implementação) antes de qualquer código — este documento é só o insumo de pesquisa, não um spec aprovado.
