# Plano de implementação: Refino do módulo de Importação (tela de desfazer)

**Spec:** [docs/superpowers/specs/2026-09-01-refino-modulo-importacao-design.md](../specs/2026-09-01-refino-modulo-importacao-design.md)
**Data:** 2026-09-01

5 fatias em sequência (cada uma depende da anterior — não são independentes desta vez, é uma pilha: schema → dado → tela nova → tela de detalhe → limpeza).

## Fatia 1 — Migration `desfeito_por` + helper de contagem ativa

1. Migration (Supabase MCP): `alter table importacoes_itens add column desfeito_por uuid references usuarios(id);`. Documentar em `docs/schema-aplicado-supabase.md` (próxima entrada numerada).
2. `lib/importacoes/importacoes.ts`: no `update({ desfeito_em: ... })` existente (linha ~472), acrescentar `desfeito_por: p_usuario_id` — a função já recebe o `tenant_id`/contexto de quem chama, só precisa passar o `usuario_id` adiante (checar a assinatura atual de `desfazerImportacao`, provavelmente já tem `criadoPor`/equivalente no contexto de quem chama a action).
3. `lib/importacoes/importacoes-financeiro.ts`: mesmo ajuste no update de `desfeito_em` (linha ~356).
4. Nova função exportada `contarItensAtivos(itens: { status; acao; desfeitoEm }[]): number` (mesma lógica hoje duplicada implicitamente como `itensCriadosSucesso.filter(it => !it.desfeitoEm).length` em `page.tsx`) — local natural: `lib/importacoes/importacoes.ts`, já que `buscarImportacao` mora lá.
5. Regenerar `database.types.ts`.

_Depende de:_ nada.
_Teste:_ `tsc`/`eslint`/`build`. Não precisa de teste ao vivo isolado — a coluna só é visível de verdade a partir da Fatia 3.

## Fatia 2 — Componentes visuais compartilhados

Peças reaproveitadas pelos 2 fluxos (pessoas/financeiro) e pelas 2 telas (dedicada + resumo na página de detalhe):

- `historico/[id]/desfazer/impacto-linha.tsx` — `<ImpactoLinha icone={...} cor="destrutivo"|"remocao"|"protegido" titulo="..." descricao="..." />`, o padrão ícone-quadrado + título + descrição visto no mockup aprovado.
- `historico/[id]/desfazer/banner-desfeita.tsx` — `<BannerDesfeita quando={...} porNome={...} agora={boolean} />`. `agora=true` é o Estado 4 ("Importação desfeita com sucesso", sem "por"/"em" — acabou de acontecer nesta sessão); `agora=false` é o Estado 5 completo ("Esta importação já foi desfeita — por {porNome}, em {quando}"). Mesmo visual (verde, ícone de check), textos diferentes.

_Depende de:_ nada (componentes puros, sem dado real ainda).
_Teste:_ só `tsc`/`eslint` (sem uso real até a Fatia 3).

## Fatia 3 — Rota dedicada `/importacao/historico/[id]/desfazer`

1. `historico/[id]/desfazer/page.tsx` (Server Component): busca a importação (`buscarImportacao`), calcula `contagemAtiva` (helper da Fatia 1). Se `contagemAtiva === 0` e havia item com sucesso → busca `desfeito_em`/`desfeito_por` (nome via join com `usuarios`) de qualquer item já desfeito, renderiza só `<BannerDesfeita agora={false} .../>` (sem Client Component nenhum — estático). Senão, renderiza `<FluxoDesfazerPessoas .../>` ou `<FluxoDesfazerFinanceiro .../>` conforme `importacao.tipo`.
2. `historico/[id]/desfazer/fluxo-desfazer-pessoas.tsx` (novo Client Component, substitui `desfazer-painel.tsx`): mesma lógica de estado de `DesfazerPainel` (usa `preverDesfazerImportacaoAction`/`desfazerImportacaoAction`, já existentes, sem mudança de assinatura) — só que a prévia carrega automaticamente ao montar (não espera clique, a pessoa já veio com a intenção), e o JSX usa `ImpactoLinha` pros 3 números (revertidos/removidos/preservados) em vez do parágrafo corrido. Sucesso usa `<BannerDesfeita agora={true} />`.
3. `historico/[id]/desfazer/fluxo-desfazer-financeiro.tsx` (substitui `desfazer-painel-financeiro.tsx`): mesma ideia, preserva o checkbox "incluir modificados manualmente".
4. Apagar `historico/[id]/desfazer-painel.tsx` e `desfazer-painel-financeiro.tsx` (substituídos, sem mais uso depois da Fatia 4).
5. `historico/[id]/desfazer/loading.tsx` — skeleton simples (título + `SkeletonForm` já existente), cobre o tempo de `buscarImportacao` no servidor antes mesmo do fluxo de prévia começar.

_Depende de:_ Fatia 1, Fatia 2.
_Teste:_ ao vivo — achar (ou criar, se necessário) uma importação de teste pequena, navegar direto pra `/desfazer`, confirmar os 4 estados (prévia auto-carregada, confirmar, processando, sucesso), depois recarregar a mesma URL e confirmar que agora mostra o Estado 5 com nome+data corretos. Repetir pro tipo financeiro se houver uma importação de teste desse tipo disponível.

## Fatia 4 — Página de detalhe: link em vez de card cheio

`historico/[id]/page.tsx`: remove o bloco `flex flex-wrap` que tentava caber `RetomarPainel` + `DesfazerPainel(Financeiro)` juntos. `RetomarPainel` continua igual, sozinho. No lugar do desfazer: se `contagemAtiva > 0`, um botão/link curto "Desfazer importação →" pra `/desfazer`; se já desfeita, uma versão compacta de 1 linha do `BannerDesfeita` (mesmo componente, variante enxuta — ou um novo prop `compacto` nele) linkando pra `/desfazer` pra ver o detalhe completo.

_Depende de:_ Fatia 3.
_Teste:_ ao vivo — confirmar que a página de detalhe não mostra mais o card apertado, que o link/status aparece certo nos dois casos (pendente de desfazer vs. já desfeita), e que `RetomarPainel` sozinho não quebrou o layout.

## Fatia 5 — Revisão final

`tsc`/`eslint`/`build` no repo inteiro. Conferir que nenhuma importação (`import`) órfã sobrou apontando pros arquivos apagados na Fatia 3. Commit único cobrindo as fatias 1-4 (é uma feature só, não faz sentido fragmentar em 4 commits pra uma pilha com dependência linear) ou um commit por fatia, o que for mais fácil de revisar — decisão de execução, não de design.

_Depende de:_ Fatias 1-4.
_Teste:_ spot-check final em pelo menos 2 rotas não tocadas (`/importacao/historico`, `/importacao/historico/[id]` de uma importação SEM nada pra desfazer) pra garantir que não regrediu nada fora do escopo.
