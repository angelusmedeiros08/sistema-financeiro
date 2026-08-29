# Plano de implementação: Modo Apresentação

**Spec:** [docs/superpowers/specs/2026-08-29-modo-apresentacao-design.md](../specs/2026-08-29-modo-apresentacao-design.md)
**Data:** 2026-08-29

Ordem por dependência: primeiro a fundação (schema + camada de dados + catálogo fixo, nada visível ainda), depois a gestão (Sidebar, listagem, editor — CRUD comum, sem o modo cheio), depois o runtime em duas etapas (Apresentador manual primeiro, Modo TV depois por cima do mesmo mecanismo), terminando com teste ao vivo e revisão de código — mesmo padrão das levas anteriores desta sessão pra feature nova.

## Fatia 1 — Schema

Migration `apresentacoes` + `apresentacao_slides` (Seção 3 da spec) via Supabase MCP: as duas tabelas, RLS staff-only tenant-scoped com policy de UPDATE e DELETE explícitas desde a criação (lição já repetida na entrada 17/31 do schema aplicado — mesmo papel array já usado em `eventos_financeiros`/`pessoas`/etc, `private.usuario_tem_papel(tenant_id, array['admin','financeiro_senior','financeiro_junior','contador'])`). `apresentacao_slides` sem `tenant_id` próprio, policy via `EXISTS` contra `apresentacoes` (mesmo padrão de `linha_dre_categorias`). Documentar em `docs/schema-aplicado-supabase.md` (próxima entrada numerada). Regenerar `database.types.ts`. Confirmar `get_advisors` limpo antes de seguir.

_Depende de:_ nada.
_Teste:_ `get_advisors` sem alerta novo; insert/select manual via MCP confirmando RLS (usuário de um tenant não lê linha de outro).

## Fatia 2 — Camada de dados

`src/lib/apresentacao/tipos.ts` (tipos compartilhados), `src/lib/apresentacao/catalogo.ts` (as 11 rotas fixas da Seção 2 da spec — `{ rota, rotulo, categoria }[]`, export `const CATALOGO_SLIDES`), `src/lib/apresentacao/apresentacoes.ts` (funções puras: `listarApresentacoes`, `obterApresentacao`, mesmo padrão de outras `lib/<dominio>/*.ts` do repo), `src/lib/apresentacao/apresentacoes-actions.ts` ("use server": `criarApresentacao`, `atualizarApresentacao`, `excluirApresentacao` — salvar substitui inteiramente as linhas de `apresentacao_slides`, delete-and-reinsert por ordem, conforme Seção 5 da spec). Validação da lista de slides recebida do formulário contra `CATALOGO_SLIDES` (rejeita rota que não está no catálogo — a validação de negócio que a spec deixou fora do `CHECK` do banco).

_Depende de:_ Fatia 1.
_Teste:_ chamar as actions direto (sem UI) criando/editando/excluindo uma apresentação de teste, conferindo no banco via MCP que `apresentacao_slides` reflete exatamente a ordem enviada.

## Fatia 3 — Sidebar + listagem (`/apresentacoes`)

Item novo na Sidebar (`src/components/layout/sidebar.tsx`), "Apresentação", ícone `Presentation` (Phosphor), seção "Sistema". Página `src/app/(app)/apresentacoes/page.tsx`: lista as apresentações do tenant (nome, quantidade de slides, botão "+ Nova"), cada linha com "Editar", "Apresentar" e "Modo TV" (os dois últimos desabilitados com dica se a apresentação não tiver slides — caso de borda da Seção 8 da spec). "Apresentar"/"Modo TV" ainda não navegam de verdade nesta fatia (ficam apontando pra rota do runtime que só existe na Fatia 5) — o objetivo aqui é só a gestão.

_Depende de:_ Fatia 2.
_Teste:_ ao vivo — criar uma apresentação vazia aparece na lista com os botões de apresentar desabilitados.

## Fatia 4 — Editor (`/apresentacoes/novo`, `/apresentacoes/[id]`)

Formulário: nome, intervalo do Modo TV em segundos (padrão 20, `input type="number"` 5–300 conforme `CHECK` do banco), checklist do catálogo com arrastar-e-soltar pra reordenar os incluídos (`@dnd-kit` se já estiver no projeto, senão avaliar a lib mais leve já usada em alguma lista arrastável existente — checar antes de adicionar dependência nova). Salvar chama as actions da Fatia 2.

_Depende de:_ Fatia 2, Fatia 3 (reusa a listagem como ponto de entrada/retorno).
_Teste:_ ao vivo — criar apresentação com 3-4 slides em ordem específica, editar removendo um e reordenando, confirmar que a lista (Fatia 3) reflete a contagem certa.

## Fatia 5 — Runtime: Apresentador (modo manual)

`src/components/apresentacao/apresentacao-shell.tsx` (client component): barra de controles fixa semitransparente (setas Anterior/Próximo, "N de M", botão Sair), atalhos de teclado `←`/`→`/`Esc`. `(app)/layout.tsx` passa a ler o parâmetro de sessão de apresentação (`?apresentacao=<id>&slide=<indice>`) via `searchParams`: quando presente, suprime `Sidebar`/`Topbar`/`BotaoVoltar` e envolve `{children}` no `ApresentacaoShell` em vez do grid normal. Botão "Apresentar" da Fatia 3 passa a navegar de verdade: `router.push` pra rota do primeiro slide com a querystring. Trocar de slide = `router.push` pra rota do próximo slide, mesma querystring com índice atualizado. Sair = `router.push("/apresentacoes")`.

_Depende de:_ Fatia 3, Fatia 4 (precisa de uma apresentação salva com slides de verdade pra testar).
_Teste:_ ao vivo — apresentar uma apresentação de 3+ slides cobrindo pelo menos um Relatório e o Painel; confirmar que o dado de cada slide é o mesmo que a tela normal mostra, que Sidebar/Topbar somem, que setas/teclado navegam, `Esc` sai e volta a Sidebar. Testar em mobile (toque nas setas, sem atalho de teclado).

## Fatia 6 — Runtime: Modo TV

Estende o `ApresentacaoShell`: quando a querystring tem `modo=tv`, arma um `setTimeout` (intervalo da apresentação) que navega pro próximo slide sozinho; barra de progresso até a troca; botão Pausar/Retomar sempre visível (adiciona/remove `&pausado=1` da querystring); ao terminar o último slide, volta pro primeiro (loop). Checagem de `window.matchMedia("(prefers-reduced-motion: reduce)")` no mount: se ativo, não arma o timer mesmo com `modo=tv`, mostra aviso curto explicando e cai pro comportamento manual. Botão "Modo TV" da Fatia 3 passa a navegar de verdade (mesma rota do Apresentador, com `modo=tv&intervalo=<intervalo_segundos da apresentação>`).

_Depende de:_ Fatia 5.
_Teste:_ ao vivo — Modo TV avança sozinho no intervalo configurado, pausar de fato para o avanço (esperar mais que o intervalo com pausa ativa e confirmar que não trocou), retomar volta a avançar, loop volta pro slide 1 depois do último. Emular `prefers-reduced-motion: reduce` (DevTools/rendering) e confirmar que o timer não arma e o aviso aparece. Testar em mobile.

## Fatia 7 — Teste end-to-end e revisão de código

Percorrer o fluxo completo no deploy Vercel (nunca local): criar apresentação → editar/reordenar → Apresentar → Modo TV → excluir. Conferir caso de borda de RLS (tentar acessar `?apresentacao=<id-de-outro-tenant>` manualmente, confirmar que cai fora do modo em vez de vazar dado). Pelo menos 1 revisão de código focada (mexe em `(app)/layout.tsx`, ponto compartilhado por todo o app logado — regressão ali afeta o sistema inteiro, não só a feature nova).

_Depende de:_ Fatias 1–6.
_Teste:_ critério de saída — nenhum achado de regressão em `(app)/layout.tsx` pendente; fluxo completo testado ao vivo incluindo mobile.

## Fora de escopo (herdado da spec)

Granularidade por seção dentro de uma página densa. Portal do cliente. Agendamento do Modo TV ou pareamento remoto com TV física. Exportar apresentação pra fora do sistema. Apresentações privadas por usuário (dentro do tenant, é tudo compartilhado, mesmo padrão de outras telas de configuração).
