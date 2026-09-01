# Refino do módulo de Importação — tela de desfazer

## Contexto

O usuário mandou screenshots da tela de detalhe de uma importação (`/importacao/historico/[id]`) apontando desorganização: o painel de "Desfazer importação" é um card genérico (`bg-destructive/5`, `flex flex-wrap`) que compete por espaço com `RetomarPainel` no mesmo bloco, sem hierarquia visual entre "isto é uma ação irreversível" e o resto da tela neutra (KPI cards). Pedido: reorganizar numa tela dedicada, com estados de status/loading claros, e — achado central da conversa — depois de desfazer, quem voltar na tela precisa ver que **já foi desfeita**, não só a ausência do botão. Hoje isso é literalmente um risco: `DesfazerPainelFinanceiro` nem tem a trava que `DesfazerPainel` (pessoas) tem — o botão "Desfazer importação" nunca some, mesmo depois de já ter revertido tudo.

Aprovado no companion visual: tela dedicada em vez de card inline, 5 estados (carregando prévia → prévia com impacto detalhado → processando → sucesso → **já desfeita antes**, com "quem e quando").

## Escopo

Só o fluxo de **desfazer** (a ação destrutiva). `RetomarPainel` (retomar linhas pendentes — ação aditiva, não destrutiva) continua embutido na página de detalhe, sem mudança. Import de **produtos** não tem fluxo de desfazer hoje e continua sem — não é regressão, é um gap pré-existente fora do escopo desta fatia (ninguém pediu, não inventar).

## Achado que exige 1 coluna nova

`importacoes_itens.desfeito_em` já existe (marca quando cada item foi revertido, usado tanto no fluxo de pessoas quanto financeiro). **Não existe** `desfeito_por` — não dá pra dizer "quem" desfez, só "quando". Migration: `alter table importacoes_itens add column desfeito_por uuid references usuarios(id);`, preenchida nos 2 pontos que já fazem `update ... set desfeito_em = now()` (`lib/importacoes/importacoes.ts` e `lib/importacoes/importacoes-financeiro.ts`).

## Design

### Nova rota: `importacao/historico/[id]/desfazer/page.tsx`

Server Component. Busca a importação (reaproveita `buscarImportacao`), computa `contagemAtiva` (itens com sucesso e `desfeitoEm === null`) — mesmo cálculo que já existe em `historico/[id]/page.tsx`, extraído pra uma função compartilhada em `lib/importacoes/importacoes.ts` em vez de duplicado.

- **`contagemAtiva === 0` e havia itens com sucesso** → Estado 5. Busca `desfeito_em`/`desfeito_por` de qualquer item já desfeito (todos compartilham o mesmo timestamp de quando a ação rodou) + nome do usuário, renderiza o banner permanente "Esta importação já foi desfeita" (verde, ícone de check, "por {nome}, em {data}"), sem nenhum botão de ação. Estático, sem JS de cliente.
- **`contagemAtiva > 0`** → renderiza `<FluxoDesfazer tipo={importacao.tipo} importacaoId={...} />` (Client Component), que assume os estados 1-4.

### `FluxoDesfazer` (novo Client Component)

Substitui `DesfazerPainel`/`DesfazerPainelFinanceiro` na função (eles continuam existindo como a camada que já sabe chamar a action certa por tipo — só ganham uma casca visual nova e compartilhada, não uma reescrita de lógica de negócio):

1. **Carregando prévia** — ao entrar na tela, chama a preview action automaticamente (não espera clique — a pessoa já veio com a intenção de desfazer, clicando o link/botão na tela de detalhe). Skeleton no formato dos blocos de impacto que vão aparecer (mesmo princípio de shape-matching do sistema de loading).
2. **Prévia com impacto** — cada consequência vira uma linha própria com ícone + título + descrição (não um parágrafo corrido): "N lançamentos revertidos" (ícone ↩, laranja), "N cadastros removidos" (ícone ✕, vermelho), "N cadastros preservados" (ícone escudo, neutro) — mesmos números que já existem em `PreviaDesfazerImportacaoPessoas`/`PreviaDesfazerFinanceira`, só reorganizados. Checkbox "incluir modificados manualmente" (só financeiro) continua igual. Botões "Confirmar reversão"/"Cancelar" no rodapé do card.
3. **Processando** — `IndicadorProcessando` (já existe, sem mudança), botões desabilitados.
4. **Sucesso** — banner verde equivalente ao Estado 5 mas com "agora": "Importação desfeita com sucesso" + resumo dos números + link "Voltar pro histórico". Erros parciais (`eventosComErro`/`entidadesComErro`, já existentes) continuam listados abaixo do banner.

### Página de detalhe (`historico/[id]/page.tsx`)

O card genérico que hoje tenta caber `RetomarPainel` + `DesfazerPainel(Financeiro)` lado a lado sai. Fica:
- `RetomarPainel`, se aplicável, sozinho no próprio espaço (sem mudança de comportamento, só sem disputar layout com o desfazer).
- Ação de desfazer vira um link/botão curto — "Desfazer importação →" se `contagemAtiva > 0`, ou uma linha compacta "Desfeita em {data}" (mesmo ícone/cor do banner verde, versão de 1 linha) se já foi desfeita — nunca a ausência silenciosa de antes. Os dois casos linkam pra `/desfazer`, que mostra o detalhe completo (prévia pra confirmar, ou o banner completo de já-desfeita).

## Fora de escopo

- Fluxo de desfazer pra importação de produtos — não existe hoje, não é pedido nesta fatia.
- Unificar de vez `DesfazerPainel`/`DesfazerPainelFinanceiro` numa função de negócio só — continuam duplicados na lógica (prévia/confirmação com formatos de dado diferentes: pessoas vs. financeiro têm consequências diferentes), só a casca visual vira compartilhada.
- Refino de `RetomarPainel` — não foi apontado como desorganizado, fica como está.
