# Plano de implementação: Botão Voltar persistente

**Spec:** [docs/superpowers/specs/2026-08-29-botao-voltar-design.md](../specs/2026-08-29-botao-voltar-design.md)
**Data:** 2026-08-29

Feature pequena e sem dependência interna — componente e wiring na Topbar cabem numa fatia só, testável de ponta a ponta de uma vez.

## Fatia 1 — Componente + Topbar

`src/components/layout/botao-voltar.tsx` — client component novo, conforme Seção 2 da spec: `useRouter()` (`next/navigation`) pro `router.back()`, `useState`+`useEffect` pra `window.history.length > 1` (nasce desabilitado até montar, evita mismatch de hidratação), `<Button variant="ghost" size="icon" disabled={...}>` com ícone `ArrowLeft` (Phosphor) e `aria-label="Voltar"`.

`src/components/layout/topbar.tsx`: `<BotaoVoltar />` como primeiro filho do `<header>`, antes do `<Sheet>` do menu hambúrguer — sem classe responsiva, visível em toda largura.

_Depende de:_ nada.
_Teste:_ ao vivo — navegar entre 2-3 telas do app (ex.: Painel → Despesas → detalhe de uma despesa) e confirmar que o botão volta um passo de cada vez, na ordem certa. Recarregar a página numa aba nova direto numa URL do app e confirmar que o botão nasce desabilitado (sem histórico). Testar em mobile (viewport estreito) que o botão não quebra o layout da Topbar ao lado do hambúrguer/nome do tenant. Testar tema claro e escuro.

## Fora de escopo (herdado da spec)

`(portal)/layout.tsx` (Topbar do portal do cliente). Lógica de rota-pai fixa por tela. Esconder o botão em rotas específicas.
