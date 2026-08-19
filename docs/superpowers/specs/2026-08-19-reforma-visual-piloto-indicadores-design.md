# Reforma visual: tokens de tema + piloto em /indicadores

## Contexto

O usuário pediu explicitamente pra parar de olhar o app com "cara de IA" — cores/fonte/componentes default de shadcn sem tratamento, o fenômeno documentado como "shadcn trap". Antes de mexer em qualquer código, isso passou por uma pesquisa extensa (17 frentes, 3 rodadas, `docs/pesquisa-referencias-visuais-reforma-design.md`) mapeando Conta Azul e concorrentes brasileiros, sistemas jurídicos, benchmarks internacionais premium (Linear, Stripe, Mercury, Pennylane, Attio), bibliotecas de componente/gráfico, e o que evitar (templates clichê).

O usuário aprovou a direção final e pediu explicitamente: usar de verdade os componentes estudados (não só recolorir), instalar as ferramentas necessárias, e produzir uma síntese real da pesquisa — não um resultado genérico. Este spec cobre a primeira leva: os tokens de tema (que por natureza técnica afetam o app inteiro) e a redesenha completa de `/indicadores` como tela piloto, antes de propagar o padrão pro resto do app.

## Escopo

**Dentro:**
- Tokens de tema globais: paleta (claro + escuro), tipografia (Cabinet Grotesk + Public Sans), `next-themes` pra alternância de tema.
- `<Toaster />` (Sonner) instalado globalmente no layout raiz.
- Botão de convite por e-mail trocado do roxo atual (`#6d28d9`) pro teal.
- Redesenha completa de `/indicadores` usando os componentes/padrões pesquisados: card de KPI (Saldo Projetado) no padrão label→número tabular→delta→sparkline; os dois donuts (top clientes, forma de pagamento) migrados de SVG manual pra `visx`; `Empty` oficial do shadcn pra qualquer seção sem dado.
- Botão de alternância de tema claro/escuro, acessível a partir do layout do app (não precisa ser elaborado, só funcional).

**Fora (fica pra depois, ciclos futuros):**
- Propagar os novos componentes (KPI card, donut visx, Empty) pro resto do app — só `/indicadores` é redesenhado nesta leva. As telas com tokens de cor/fonte novos mas sem redesenha de componente vão simplesmente herdar a nova paleta/tipografia (baixo risco, é refinamento do teal/terracota já existentes) sem quebrar visualmente.
- `TanStack Table` — não há tabela densa em `/indicadores`; entra quando a leva chegar nas telas de lançamento/parcela.
- `date-fns`, `@react-pdf/renderer` — não são mudanças visuais, ficam pra quando surgir a necessidade concreta (cálculo de dia útil, export de relatório).
- Migrar o gauge (`indicador-gauge.tsx`) pra `conic-gradient` — ele não é usado em `/indicadores` (fica em `/relatorios/visao-geral`), entra num ciclo futuro quando essa tela for redesenhada.
- Reorganização de sidebar/arquitetura de informação — já mapeada como etapa futura dedicada (memória do projeto), não faz parte desta leva.
- Pagamento Pix/boleto real — não tem relação com esta reforma visual.

## Tokens de tema

**Paleta** — definida como CSS custom properties em `globals.css`, light e dark:

| Token | Light | Dark | Papel |
|---|---|---|---|
| `--primary` | `#157F6B` | `#1F9C84` (levemente mais claro, mantém contraste em fundo escuro) | Teal — accent primário, positivo |
| `--destructive` | `#D8583A` | `#E2694B` | Terracota — negativo/erro |
| `--foreground` | `#1A1D1F` | `#EDEBE7` | Carvão quente / quase-branco quente |
| `--background` | `#F5F4F1` | `#17191A` | Bege/pedra quente / grafite esverdeado (`#1B2321` como variante de superfície) |
| `--accent-gold` (novo token) | `#A87C1F` | `#C99A3B` | Dourado envelhecido — só destaque pontual (badge/marco), nunca botão primário |
| `--card`, `--border`, `--muted` | derivados da escala acima | derivados | Seguem a mesma lógica de token que o shadcn já usa, só com os valores base trocados |

Regra de aplicação: `--accent-gold` nunca entra em `variant="default"` de botão nem em fundo de superfície grande — só em `Badge`/destaque pontual, seguindo a mesma lição que a pesquisa tirou de branding jurídico e das fintechs premium (accent extremo, racionado).

**Tipografia** — `next/font/google` (Public Sans, disponível diretamente) + `next/font/local` (Cabinet Grotesk: baixar os arquivos `.woff2` da Fontshare e self-hostar via `next/font/local`, em vez de link CDN — evita dependência de terceiro em runtime e mantém o mesmo padrão de otimização de fonte que o Next já aplica em Public Sans):
- Cabinet Grotesk: `font-heading` (títulos de seção, números grandes de KPI).
- Public Sans: `font-sans` (padrão do body — substitui a fonte de sistema atual em tudo que não é heading).
- `font-variant-numeric: tabular-nums` aplicado à classe usada nos números de KPI/tabela (garante alinhamento de coluna numérica).

**Dark mode** — `next-themes`: `<ThemeProvider attribute="class" defaultTheme="light" enableSystem>` no layout raiz, `suppressHydrationWarning` na tag `<html>`. Toggle simples (ícone sol/lua) em `components/layout/topbar.tsx`, no grupo `flex items-center gap-3` que já tem o e-mail do usuário e o botão de sair — sem exigência de design elaborado, só funcional nesta leva.

## Toasts (Sonner)

`<Toaster />` adicionado uma vez no layout raiz. Não é objetivo desta leva migrar todo `{erro && <p>}` existente no app pra Sonner — isso é um refactor grande e disperso, fora de escopo. O que entra: a infraestrutura fica pronta (import, provider, tema herdado dos tokens), e qualquer ação nova dentro de `/indicadores` (não há nenhuma hoje — é tela só de leitura) usaria Sonner por padrão daqui pra frente.

## Redesenha de `/indicadores`

- **Card "Saldo projetado"**: reestruturado no padrão pesquisado — label pequeno muted ("Saldo atual") → número grande em Cabinet Grotesk + tabular-nums → os 3 horizontes (D+7/D+30/D+60) como mini-cards com delta implícito na cor (vermelho se ruptura). Sem sparkline nesta leva (a série histórica não existe ainda pra alimentar uma tendência real — adicionar sparkline com dado fake seria contrário ao princípio de honestidade dos dados).
- **Donuts (top clientes, forma de pagamento)**: migrados de `<circle strokeDasharray>` manual pra `@visx/shape` (`Pie`), abrindo caminho pra tooltip por fatia (não obrigatório implementar tooltip nesta leva, só a migração do motor de desenho).
- **Badges** (`BadgeRiscoConcentracao`, `BadgeRupturaSaldo`): revisados pra usar os tokens novos de cor em vez de hex hardcoded (`#D8583A`/`#157F6B` continuam existindo como *valor* do token, só deixam de estar hardcoded no componente).
- **Empty state**: se qualquer seção da tela não tiver dado (ex.: tenant novo sem lançamento), usar `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription` do shadcn em vez do texto solto atual tipo "Nenhuma baixa no período."

## Testes

- Alternar claro/escuro em `/indicadores`: todos os textos/cards/badges mantêm contraste legível nos dois temas (checar especificamente o `--accent-gold` e os badges de risco/ruptura, que são os elementos com cor semântica mais forte).
- Os 2 donuts migrados pra visx renderizam com os mesmos dados/proporções que a versão SVG manual anterior (comparação visual antes/depois).
- Botão de convite por e-mail: cor teal, sem nenhum roxo residual.
- Página `/indicadores` sem nenhum dado (tenant novo): mostra `Empty` em vez de texto solto, nas seções que hoje têm fallback de texto.
- Resto do app (ex.: `/painel`, `/clientes`) continua funcional depois da troca de tokens globais — nenhuma tela quebra visualmente (herdar nova cor/fonte é esperado e aceitável; herdar um bug de contraste não é).
