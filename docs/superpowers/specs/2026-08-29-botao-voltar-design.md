# Botão Voltar persistente

**Data:** 2026-08-29

## 1. Contexto

Pedido direto do usuário: navegar de volta pra tela anterior hoje exige reabrir a sidebar e refazer o caminho inteiro — sem atalho nenhum, mesmo quando a intenção é só "um passo pra trás" (ex.: abriu o detalhe de um lançamento a partir de uma lista, quer voltar pra ela). Um botão de voltar persistente, sempre visível na Topbar, resolve isso sem precisar mapear a hierarquia de cada uma das ~40 rotas do app.

Decisões já confirmadas com o usuário (via `/frontend-design` + brainstorm rápido antes desta spec):
- **Comportamento**: histórico real do navegador (`router.back()`), não uma rota-pai fixa por tela. Mais simples, cobre rota nova automaticamente, mesmo mecanismo do botão Voltar nativo.
- **Posição**: primeiro item da Topbar (`src/components/layout/topbar.tsx`), à esquerda de tudo — visível em mobile e desktop, já que a dor descrita acontece nos dois.

## 2. Componente

`src/components/layout/botao-voltar.tsx` — client component novo (precisa de `useRouter()` do `next/navigation`, só existe em Client Component). Segue exatamente o padrão visual já usado pelos outros botões-ícone da Topbar (o gatilho do `Sheet` do menu hambúrguer, por exemplo): `<Button variant="ghost" size="icon">`, ícone `ArrowLeft` (Phosphor, 20px, já é o ícone de "voltar" usado no resto do app — `lancamentos/page.tsx`, `formulario-baixa.tsx`).

```tsx
"use client";
export function BotaoVoltar() {
  const router = useRouter();
  const [temHistorico, setTemHistorico] = useState(false);
  useEffect(() => setTemHistorico(window.history.length > 1), []);
  return (
    <Button variant="ghost" size="icon" disabled={!temHistorico} onClick={() => router.back()} aria-label="Voltar">
      <ArrowLeft size={20} />
    </Button>
  );
}
```

- **Detecção de "tem pra onde voltar"**: `window.history.length > 1`, lido só depois de montar (`useEffect`) — no primeiro render (server + hidratação) o botão nasce desabilitado por padrão, evitando mismatch de hidratação (o servidor nunca sabe o histórico do navegador). Não é um sinal perfeito (conta qualquer entrada do histórico da aba, não só as do app), mas é o padrão usado por apps de produção pra essa exata decisão, e o pior caso (botão habilitado sem "voltar" fazer nada útil) já é o comportamentode um botão Voltar de navegador comum.
- **Estado desabilitado**: `Button` já aplica `disabled:opacity-50` e `disabled:pointer-events-none` de base (`components/ui/button.tsx`) — nenhum estilo extra precisa ser escrito à mão. Nunca escondido — esconder/reaparecer o botão faria o layout da Topbar "pular" a cada navegação.
- Sem tooltip (nenhum outro botão-ícone da Topbar tem hoje — `aria-label` já cobre leitor de tela).

## 3. Onde entra na Topbar

`src/components/layout/topbar.tsx`: `<BotaoVoltar />` como o primeiro elemento dentro do `<header>`, antes do `<Sheet>` (menu hambúrguer mobile). Sem `className` responsivo (`lg:hidden`/`hidden lg:inline` como os vizinhos) — fica visível em toda largura de tela, diferente do hambúrguer (só mobile) e do logo (só desktop).

Nenhuma mudança em `(portal)/layout.tsx`/`PortalTopbar` — escopo é só o app principal (ver Seção 7, fora de escopo). **Nota: esta seção descreve a posição original (Topbar); superada pela Seção 6.**

## 4. Casos de borda

- Clicar logo após logar (sessão nova, sem histórico de navegação dentro do app): botão nasce desabilitado, nada acontece ao "clicar" nele (disabled bloqueia o evento).
- Clicar depois de enviar um formulário que redireciona (ex.: criar uma despesa): `router.back()` volta pra tela do formulário logo antes do redirect — mesmo comportamento do botão Voltar do navegador nessa situação, esperado pelo usuário porque é literalmente o mesmo mecanismo.
- Middle-click / abrir uma URL direta numa aba nova: histórico da aba começa vazio, botão nasce desabilitado — correto, não há de fato pra onde voltar nessa aba.

## 5. Só aparece em sub-página (revisão pós-teste ao vivo)

**Correção em relação à versão original desta spec**: o texto original dizia que o botão ficaria sempre visível, só desabilitado quando não houvesse histórico — testando ao vivo, mostrar o botão (habilitado, já que o usuário tinha navegado antes) em cima do Painel confundia mais do que ajudava: Painel é o nível principal do app, "voltar" ali não corresponde a nada na hierarquia. Achado do próprio usuário testando a versão publicada.

Regra adotada: o botão só renderiza (nasce `null` fora disso) quando o pathname atual tem 2+ segmentos. Uma rota de 1 segmento (`/painel`, `/despesas`, `/receitas`, `/vendas`, `/indicadores`...) é exatamente o conjunto de destinos que a própria Sidebar já lista como item de nível principal (`src/components/layout/sidebar.tsx`) — nenhum deles é "sub-página" de nada. Qualquer rota com 2+ segmentos (`/despesas/[id]`, `/relatorios/dre`, `/configuracoes/categorias`, `/vendas/nova`...) é sempre um drill-down de alguma seção, onde a volta rápida faz sentido.

## 6. Barra fixa embaixo, com texto (2ª revisão pós-teste ao vivo)

**Correção em relação à versão anterior**: o usuário rejeitou o ícone de seta sozinho na Topbar depois de ver a versão publicada — pediu explicitamente barra na parte de baixo da tela, com o texto "Voltar" escrito, não só um ícone. Passou por `/frontend-design` de novo antes de reimplementar.

- Componente renderiza como **último filho de `<main>`** (`(app)/layout.tsx`), não mais na Topbar — junto de um espaçador (`<div className="h-20" />`, normal-flow, sem `position:fixed`) que garante que o fim do conteúdo de qualquer página nunca fica escondido atrás da barra fixa, sem precisar de um `padding-bottom` condicional no layout do lado do servidor (que não sabe se a rota atual vai mostrar a barra ou não).
- Barra em si: `position: fixed`, borda superior (espelha a borda inferior da Topbar), mesmo `bg-card`. `lg:left-[60px]` pra não ficar embaixo do rail da sidebar no desktop (60px, `sidebar.tsx:367`); full-width no mobile.
- Conteúdo: `<Button variant="outline" size="lg">` com `ArrowLeft` + texto "Voltar" — `w-full` no mobile (alvo de toque generoso, largura confortável), `lg:w-auto` no desktop (não faz sentido esticar um botão de ação única na largura inteira de uma tela grande).
- `pb-[env(safe-area-inset-bottom)]` — evita a barra ficar colada na área do indicador de home do iOS.
- Regra de quando aparece (rota com 2+ segmentos, Seção 5) e o estado desabilitado sem histórico continuam exatamente iguais — só a posição/aparência mudou.

## 8. Botão pequeno dentro do módulo (3ª revisão pós-teste ao vivo)

**Correção em relação à versão anterior**: a barra fixa embaixo (Seção 6) também foi rejeitada ao vivo — "horrível", segundo o usuário. Pedido explícito, desta vez com pergunta prévia pra não errar de novo: botão **pequeno**, com **borda leve** (não o link discreto sem borda que algumas telas já usam, ex.: `despesas/[id]` tem `← Despesas` como link puro), no **canto superior esquerdo do próprio módulo** (não na Topbar, não uma barra separada), **rolando junto com o conteúdo** (não fixo).

- Volta a ser `<Button variant="outline" size="sm">` (`h-7`, `components/ui/button.tsx`) — mesma família visual da versão de barra fixa, só menor. `ArrowLeft` 15px + texto "Voltar", `mb-4` pra separar do conteúdo da página logo abaixo.
- Renderiza como **primeiro filho de `<main>`**, antes de `{children}` — normal-flow, sem `position:fixed`/`sticky`, sem container de largura própria (a página que já centraliza seu próprio conteúdo do jeito que escolher — `max-w-3xl`, `max-w-4xl`, etc. variam por tela).
- Sem espaçador (não precisa mais — só existia pra compensar a barra fixa da Seção 6, que deixou de existir).
- Regra de quando aparece (Seção 5) e estado desabilitado sem histórico continuam iguais.

## 7. Fora de escopo

`(portal)/layout.tsx` (Topbar simplificada do portal do cliente) — o cliente do portal tem só 2 telas (`/portal`, `/portal/lancamentos`), a dor de "reabrir a sidebar" não se aplica do mesmo jeito; adicionar lá é um passo futuro simples de replicar, não incluído nesta leva a menos que o usuário peça. Lógica de rota-pai fixa por tela (a opção não escolhida — a regra de segmentos decide só *se* mostra o botão, nunca *pra onde* ele leva, que continua sendo sempre `router.back()`).
