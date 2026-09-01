# Plano de implementação: Estados de erro & formulário resiliente

**Spec:** [docs/superpowers/specs/2026-08-31-estados-de-erro-design.md](../specs/2026-08-31-estados-de-erro-design.md)
**Data:** 2026-08-31

3 fatias independentes entre si (não compartilham arquivo) — ordem por risco: idempotência primeiro (é a única com risco financeiro real, os outros dois são puramente estruturais/UX).

## Fatia 1 — Idempotência em Vendas e Orçamentos

1. Migration: `import_key uuid` nullable em `vendas` e `orcamentos_comerciais`, índice único parcial `UNIQUE (tenant_id, import_key) WHERE import_key IS NOT NULL` nas duas tabelas. Aplicar via Supabase MCP, documentar em `docs/schema-aplicado-supabase.md`, regenerar `database.types.ts`.
2. `src/lib/vendas/vendas.ts` (`criarVenda`) e `src/lib/orcamentos-comerciais/orcamentos-comerciais.ts` (`criarOrcamento`): novo parâmetro opcional `importKey?: string`. Antes do insert, se vier preenchido, `SELECT` por `tenant_id + import_key`; se achar, retorna o registro existente sem inserir de novo. Se não achar, insere incluindo `import_key` na linha.
3. `src/lib/vendas/vendas-actions.ts` (`criarVendaAction`) e `src/lib/orcamentos-comerciais/orcamentos-comerciais-actions.ts` (`criarOrcamentoAction`): leem `import_key` do FormData, passam pra `criarVenda`/`criarOrcamento`.
4. `src/components/formularios/documento-comercial-form.tsx`: `useMemo(() => crypto.randomUUID(), [chaveFormulario])` — reaproveita o state `chaveFormulario` que o componente já tem (hoje só remonta os comboboxes não-controláveis). Campo hidden `import_key` no form. Só se aplica no modo `criar` (editar não tem esse risco).

_Depende de:_ nada.
_Teste:_ ao vivo — criar uma venda de teste normalmente (confirma que não quebrou o caminho feliz); depois, via chamada direta de `criarVendaAction` duas vezes com a mesma FormData/import_key (não precisa duplo-clique real no navegador, dá pra simular via curl/fetch ou reexecutar a mesma request), confirmar que a segunda chamada retorna o MESMO id da venda, não cria uma segunda linha. Repetir pra orçamento. Limpar dado de teste depois.

## Fatia 2 — Página de erro genérica

- `src/app/(app)/error.tsx` — Client Component (`"use client"`), recebe `{ error, reset }`, `useEffect` loga no console, título curto + corpo + botão "Tentar novamente" (`reset()`) + link "Voltar ao Painel".
- `src/app/error.tsx` (raiz) — mesmo conteúdo, ajustando o link de volta (pra `/entrar` ou `/`, já que fora do grupo autenticado não tem certeza de sessão).

_Depende de:_ nada.
_Teste:_ ao vivo — criar um erro real temporário (ex. um componente de teste em uma rota que lança exceção de propósito, remover depois) OU usar uma forma menos invasiva: navegar pra uma rota inexistente dentro de uma rota dinâmica pra forçar erro de fetch (ex. um `[id]` com UUID inválido, se algum código não validar isso e estourar em vez de retornar vazio). Confirmar visualmente que a tela mostra o texto amigável (não stack trace), sidebar continua visível se dentro de `(app)`, botão "Tentar novamente" recarrega o segmento.

## Fatia 3 — Banner de conexão

- `src/lib/hooks/use-online-status.ts` — hook `useOnlineStatus(): boolean`. Inicializa `true` (evita mismatch de hidratação, mesmo padrão de `theme-toggle.tsx`), corrige no primeiro `useEffect` lendo `navigator.onLine`, escuta `online`/`offline`.
- `src/components/layout/offline-banner.tsx` — `<OfflineBanner />`. Offline: faixa fixa persistente com aviso. Volta a ficar online (transição `false→true`, via ref guardando o valor anterior): `toast.success("Conexão restabelecida.")` uma vez, banner some.
- `src/app/(app)/layout.tsx`: monta `<OfflineBanner />` entre a Topbar e o `{children}`.

_Depende de:_ nada.
_Teste:_ ao vivo — verificação principalmente de código (hook/listener/unmount corretos, sem erro de hidratação novo). Se der pra alternar `navigator.onLine` via DevTools/CDP no Browser pane, confirmar visualmente o banner aparecendo/sumindo; senão, aceitar a verificação estrutural (tsc/eslint/build limpos, revisão do código) como suficiente pra esta fatia.
