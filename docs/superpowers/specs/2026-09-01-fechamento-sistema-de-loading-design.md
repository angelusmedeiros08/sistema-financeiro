# Fechamento do Sistema de Loading

## Contexto

A Fatia 1 do dossiê UX ("Sistema de loading", `2026-08-31-sistema-de-loading-design.md`) cobriu ~60 rotas autenticadas com `loading.tsx` sob medida. Durante o teste ao vivo dessa fatia foi achado o erro de hidratação #418 (não relacionado, já corrigido separadamente) e, na sessão seguinte, o usuário pediu pra mapear o que ainda ficou de fora. Auditoria do código real (não achismo) encontrou 3 lacunas concretas, detalhadas abaixo.

Nenhuma das 3 frentes muda paleta de cor, tipografia ou performance de backend — os fetches das telas afetadas já usam `Promise.all` corretamente (conferido lendo os 4 arquivos de entrada da Importação). É fechamento de cobertura visual/perceptiva, no mesmo padrão já estabelecido na Fatia 1: skeleton espelha a geometria real do conteúdo que substitui, evita salto de layout, aparece instantaneamente (HTML do próprio Next, não depende de JS/hidratação).

## Frente A — `loading.tsx` nas telas de entrada da Importação

Hoje só `/importacao/historico` tem `loading.tsx`. Ficaram de fora 5 rotas que fazem fetch real antes de renderizar:

| Rota | Fetch atual | Formato da tela |
|---|---|---|
| `/importacao` | `obterUsuarioETenantAtual()` | grid 2×2 de cards estáticos (Lançamentos/Pessoas/Produtos/IA) + link Central de Importações |
| `/importacao/planilha` | `obterUsuarioETenantAtual()` + `Promise.all` (contas financeiras, entidades existentes, regras de mapeamento) | breadcrumb + H1 + wizard passo 1 (ou `EstadoVazio` se não há conta financeira) |
| `/importacao/pessoas` | idem (pessoas existentes, campos personalizados, regras) | idem |
| `/importacao/produtos` | idem (categorias, produtos existentes) | idem |
| `/importacao/ia` | idem (contas financeiras, entidades existentes) | idem |

**Novos arquivos**: `app/(app)/importacao/loading.tsx`, `app/(app)/importacao/planilha/loading.tsx`, `app/(app)/importacao/pessoas/loading.tsx`, `app/(app)/importacao/produtos/loading.tsx`, `app/(app)/importacao/ia/loading.tsx`.

- `/importacao`: skeleton do H1 + 4 blocos `rounded-2xl` no mesmo grid `sm:grid-cols-2` da tela real (ícone circular + 2 linhas de texto, mesma geometria de `SkeletonKpiCard` mas sem o número grande).
- As 4 telas de wizard: skeleton do breadcrumb (`h-4 w-24`) + H1 (`h-7 w-48`) + `SkeletonForm` (componente já existente do catálogo da Fatia 1) pro corpo do passo 1. Não tenta prever se vai cair no `EstadoVazio` — o wizard é o caminho comum, e mesmo se cair no vazio a diferença de altura é pequena o bastante pra não incomodar.

## Frente B — `loading.tsx` único em `(auth)/`

Nenhuma das 9 rotas de autenticação (`entrar`, `cadastro`, `esqueci-senha`, `redefinir-senha`, `escolher-empresa`, `convite/aceitar`, `convite/definir-senha`, `assinar`, `assinar/retorno`) tem `loading.tsx`, e não existe `(auth)/layout.tsx` nem `loading.tsx` raiz — hoje é tela branca sem marca até a página resolver, incluindo o cenário de cold start de função serverless (a lentidão nem precisa ser de banco).

Todas usam o mesmo componente `AuthShell` (`components/layout/auth-shell.tsx`): painel de marca estático à esquerda (gradiente, texto fixo, sem dado) + card central com título/subtítulo/formulário. Como o painel de marca não depende de nada, um único `loading.tsx` em `app/(auth)/loading.tsx` reproduz o shell inteiro e cobre as 9 rotas de uma vez — é assim que `loading.tsx` de route group funciona no Next: vale pra toda rota da pasta que não tiver um `loading.tsx` mais específico por baixo.

**Novo arquivo**: `app/(auth)/loading.tsx` — painel de marca idêntico ao `AuthShell` (não precisa de skeleton, é conteúdo estático real) + skeleton de título (`h-8 w-40`), subtítulo (`h-4 w-56`) e 2-3 campos de formulário genéricos no card à direita. Sem props — é sempre a mesma silhueta genérica, não tenta imitar cada formulário especificamente (login tem 2 campos, escolher-empresa é uma lista — a diferença visual de 1-2 frames de skeleton genérico não compensa 9 arquivos especializados).

## Frente C — `IndicadorProcessando` (componente compartilhado)

4 fluxos já têm feedback funcional de ação longa, cada um com seu próprio spinner+texto:

- `executarImportacaoFinanceiraAction` (`importacao/planilha/passo-resultado.tsx`)
- `extrairLancamentosIAAction` (`importacao/ia/passo-entrada-ia.tsx`)
- `desfazerImportacaoAction`/`preverDesfazerImportacaoAction` (`importacao/historico/[id]/desfazer-painel.tsx`)
- estorno de baixa (`lancamentos/detalhe-parcela.tsx`)

Nenhum deve usar `useDelayedPending` (esse hook existe pra evitar flash em operações que costumam ser rápidas — filtro de relatório; os 4 fluxos acima **sempre** demoram de verdade, mostrar a hora é o comportamento certo). A unificação aqui é só visual.

**Novo componente**: `src/components/ui/indicador-processando.tsx`

```tsx
export function IndicadorProcessando({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
      <Spinner size={20} className="shrink-0 animate-spin text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
      </div>
    </div>
  );
}
```

Reproduz exatamente o padrão já usado em `passo-resultado.tsx` (o mais completo dos 4). Os outros 3 pontos trocam seu spinner manual por esse componente, sem mudar a lógica de estado (`pending`/`carregando`/`rodando` continuam onde estão) — só o JSX de exibição.

## Fora de escopo

- Qualquer mudança de performance de backend (já confirmado: sem waterfall nos fetches).
- `(app)/loading.tsx` ou `loading.tsx` raiz — nenhum dos dois teria conteúdo próprio pra mostrar (o layout autenticado não faz fetch nenhum antes de delegar pras páginas, que já têm seus próprios `loading.tsx`).
- Skeletons especializados por rota de autenticação (ex. lista de empresas em `escolher-empresa`) — o genérico já resolve o problema real (tela branca), diferenciar por rota é polimento que essa fatia não precisa.
