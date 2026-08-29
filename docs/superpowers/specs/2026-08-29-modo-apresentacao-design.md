# Modo Apresentação

**Data:** 2026-08-29

## 1. Contexto

Pedido do usuário: um jeito de apresentar os indicadores do sistema em tela cheia, tipo o "Apresentar" do Canva/Google Slides — tanto para reuniões com terceiros (cliente, sócio, investidor) quanto para uma tela ligada continuamente na empresa.

Pesquisa prévia (3 buscas paralelas — Canva/Slides/Tableau/Power BI, 7 ferramentas de BI com modo TV, e concorrentes financeiros diretos) mostrou que isso não é uma única funcionalidade, são duas famílias de produto distintas:

- **Apresentador** (Tableau Presentation Mode, Power BI Full Screen): sem cronômetro, avança manual (seta/clique), pra quem está com alguém ao vivo controlando o ritmo.
- **Modo TV** (Grafana Playlists, Geckoboard Loops, Databox, Klipfolio): rotação automática por tempo configurável, pra uma tela ligada sem ninguém tocando.

Nenhum concorrente financeiro direto (Conta Azul, Omie, Nibo, QuickBooks, Xero) tem isso. O achado mais relevante veio do **Fathom** — ferramenta de BI que se conecta em cima de Xero/QuickBooks, usada por escritórios de contabilidade — que tem um recurso chamado literalmente "Presentation Mode", pra contador apresentar resultado pro cliente. Valida a demanda vindo do público que este sistema atende (quem cuida das finanças de terceiros ou da própria empresa), não de um usuário genérico.

**Decisão confirmada com o usuário**: cobrir os dois casos (Apresentador e Modo TV) desde a primeira leva, através da mesma lista de conteúdo curada — a diferença entre os dois é só qual botão inicia a mesma sequência de telas.

## 2. Abordagem: slide = tela inteira já existente

Em vez de decompor o sistema em blocos/widgets arrastáveis (projeto grande, seria uma segunda forma de montar a mesma informação) ou de recriar visualmente cada indicador (duplicaria Indicadores/Relatórios), cada "slide" é uma das telas que já existem — a mesma que aparece navegando pelo sistema normalmente, com dado ao vivo do tenant. É o mesmo padrão usado por todo fornecedor pesquisado com modo TV: eles ciclam entre dashboards inteiros, nunca entre sub-widgets.

**Catálogo de slides disponíveis na v1** — as rotas que já existem hoje, com o rótulo que a Sidebar já usa:

| Rota | Rótulo | Categoria |
|---|---|---|
| `/painel` | Painel | Painel |
| `/indicadores` | Central de Indicadores | Indicadores |
| `/relatorios/visao-geral` | Visão geral | Relatórios |
| `/relatorios/dre` | DRE | Relatórios |
| `/relatorios/dfc` | DFC | Relatórios |
| `/relatorios/centro-custo` | Centro de custo | Relatórios |
| `/relatorios/aging` | Aging | Relatórios |
| `/relatorios/despesas` | Análise de despesas | Relatórios |
| `/relatorios/ponto-equilibrio` | Ponto de equilíbrio | Relatórios |
| `/relatorios/comparativos` | Comparativos | Relatórios |
| `/relatorios/contas-bancarias` | Contas bancárias | Relatórios |

11 opções. A Central de Indicadores é uma tela densa (6 seções) — nesta primeira leva ela entra como um único slide (a tela inteira, do jeito que já é). Granularidade por seção fica pra uma leva futura se fizer falta na prática (ver Seção 9).

Cada slide mantém seus próprios filtros/controles internos (ex.: seletor de Regime/Granularidade nos relatórios) visíveis e funcionando durante a apresentação — não é um retrato congelado, é a tela real. Isso não é uma limitação: no Apresentador, dá pra ajustar um filtro ao vivo durante a reunião sem sair do modo, mesma liberdade que Tableau/Power BI dão.

## 3. Modelo de dados

Duas tabelas novas, mesmo padrão de RLS de qualquer tabela de configuração do sistema (tenant-scoped, staff-only, **policy de UPDATE e DELETE explícitas desde a criação** — lição já repetida vinda do bug `017_baixas_update_policy`, ver entrada 31 do schema aplicado).

```sql
create table apresentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  intervalo_segundos integer not null default 20 check (intervalo_segundos between 5 and 300),
  criado_por uuid not null references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table apresentacao_slides (
  id uuid primary key default gen_random_uuid(),
  apresentacao_id uuid not null references apresentacoes(id) on delete cascade,
  ordem integer not null,
  rota text not null,
  rotulo text not null,
  unique (apresentacao_id, ordem)
);
```

`apresentacao_slides` não tem `tenant_id` próprio — policy via `EXISTS` contra `apresentacoes`, mesmo padrão de `linha_dre_categorias`→`linhas_dre` (entrada 27 do schema aplicado). `rota` é validada contra o catálogo fixo (Seção 2) na camada de aplicação, não em `CHECK` do banco — o catálogo pode crescer sem precisar de migration.

## 4. Onde entra no sistema

Item novo na Sidebar, **"Apresentação"**, ícone `Presentation` (Phosphor) — seção "Sistema", ao lado de Relatórios/Configurações. Abre `/apresentacoes`: lista as apresentações salvas do tenant (nome, quantidade de slides, botão "+ Nova").

## 5. Editor (`/apresentacoes/novo` e `/apresentacoes/[id]`)

Formulário de uma tela só:
- Nome da apresentação (texto livre — ex. "Reunião mensal Cliente X").
- Intervalo do Modo TV, em segundos (padrão 20s — nem os 10s "default" do Klipfolio, curto demais pra número financeiro que precisa ser lido e entendido, nem tão longo que canse quem está só de passagem).
- Lista do catálogo (Seção 2), cada item com checkbox pra incluir/excluir e arrastar-e-soltar pra reordenar os incluídos — mesmo padrão confirmado em todo fornecedor pesquisado (Grafana, Geckoboard, Databox, Klipfolio: seleção sempre opt-in explícito, ordem sempre manual, nunca "inteligente").
- Salvar grava `apresentacoes` + substitui inteiramente as linhas de `apresentacao_slides` (delete-and-reinsert por ordem, mais simples que diff incremental pra uma lista tipicamente com poucas dezenas de itens no máximo).

Cada apresentação salva, na lista, tem dois botões de ação: **Apresentar** e **Modo TV**.

## 6. Runtime

Mecanismo comum aos dois modos: navegação real entre as rotas dos slides (não uma cópia paralela do conteúdo), com um parâmetro na URL indicando sessão de apresentação ativa — `?apresentacao=<id>&slide=<indice>` (e `&modo=tv&intervalo=<segundos>` quando em Modo TV, `&pausado=1` quando pausado). Mesmo padrão já usado no sistema pra estado de filtro em URL (`montarHrefLancamentos`), então não introduz uma convenção nova.

`(app)/layout.tsx` passa a checar esse parâmetro: quando presente, **não renderiza Sidebar/Topbar/BotaoVoltar** — em vez disso, renderiza `{children}` (a página real do slide, com todo seu dado e filtros) dentro de um `<ApresentacaoShell>` que sobrepõe uma barra de controles fixa (compacta, alto contraste, com fundo semitransparente pra não competir com o conteúdo):

- **Apresentador**: setas Anterior/Próximo, indicador "3 de 11", botão Sair. Atalhos de teclado: `←`/`→` navegam, `Esc` sai. Sem cronômetro.
- **Modo TV**: mesmos controles de navegação manual (interromper o loop pra ajustar não deveria ser bloqueado — nenhum fornecedor pesquisado trava isso, e Grafana, o único que junta timer automático com navegação manual, é citado na pesquisa como "o modelo mais completo da categoria"), mais um botão **Pausar/Retomar sempre visível** e uma barra de progresso até a próxima troca. Ao terminar o último slide, volta pro primeiro (loop contínuo).

Navegar pra um slide = `router.push(rota + querystring de apresentação)`. Sair = `router.push("/apresentacoes")`, que naturalmente cai fora do parâmetro e a Sidebar/Topbar voltam.

O avanço automático do Modo TV é um `useEffect` com `setTimeout` dentro do `ApresentacaoShell` (client component), armado no mount de cada slide — como cada troca de slide é uma navegação real (novo render do shell), o timer reinicia sozinho a cada slide, sem precisar de lógica extra de "resetar contador".

## 7. Acessibilidade

- Modo TV sempre expõe um controle de pausa visível e alcançável por teclado (Tab) — obrigação que se repetiu em todo fornecedor com auto-rotação pesquisado (WCAG 2.2.2, conteúdo que se move/atualiza sozinho por mais de 5s precisa de pausar/parar/esconder).
- `prefers-reduced-motion: reduce`: o `ApresentacaoShell` não arma o timer automático mesmo que o usuário tenha escolhido Modo TV — mostra um aviso curto ("Avanço automático desativado nas suas preferências de sistema — use as setas ou o botão Retomar") e cai pro comportamento manual, sem bloquear o uso.
- `Esc` sai em qualquer um dos dois modos, sempre.
- Barra de controles com contraste suficiente sobre qualquer tela de fundo (fundo semitransparente escuro fixo, não depende da paleta do slide embaixo).

## 8. Casos de borda

- Apresentação sem nenhum slide selecionado: botões "Apresentar"/"Modo TV" ficam desabilitados na lista, com dica ("adicione ao menos um slide").
- Apresentação excluída enquanto alguém está no meio dela (outra aba): próxima navegação de slide falha ao carregar os dados de `apresentacao_slides` (RLS/registro sumiu) — cai pra `/apresentacoes` com aviso.
- Usuário sem papel de staff (ex. portal do cliente): sem acesso a `/apresentacoes` nem à Sidebar item, mesma regra de RLS staff-only já usada em outras telas de configuração — fora de escopo (Seção 9).
- Acesso direto a uma rota de slide com `?apresentacao=...` apontando pra uma apresentação de outro tenant: RLS de `apresentacoes`/`apresentacao_slides` bloqueia a leitura (tenant-scoped), shell trata como "apresentação não encontrada" e cai fora do modo.

## 9. Fora de escopo (nesta leva)

- Granularidade por seção dentro de uma página densa (ex. as 6 seções da Central de Indicadores como slides separados) — se a prática mostrar que a tela inteira é grande demais pra uma reunião, é uma extensão natural, não redesenho.
- Portal do cliente (`(portal)/layout.tsx`) — apresentação é ferramenta de quem cuida das finanças (staff), não do cliente final.
- Agendamento do Modo TV (ligar/desligar sozinho em horários) ou pareamento remoto com uma TV física (tipo "Stream to TV" do Databox) — o usuário liga o Modo TV manualmente no navegador que estiver na tela, cobre o caso de uso descrito sem essa complexidade adicional.
- Exportar/compartilhar a apresentação pra fora do sistema (PDF, link público) — todo slide é dado ao vivo do tenant autenticado, exportar estático é uma funcionalidade separada.
- Apresentações compartilhadas entre usuários do mesmo tenant além do que a RLS tenant-wide já permite (qualquer staff do tenant já vê/edita todas as apresentações do tenant, mesmo padrão de outras telas de configuração — não há conceito de "apresentação privada de um usuário só").
