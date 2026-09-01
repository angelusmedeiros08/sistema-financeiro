# Plano de implementação: Fechamento do Sistema de loading

**Spec:** [docs/superpowers/specs/2026-09-01-fechamento-sistema-de-loading-design.md](../specs/2026-09-01-fechamento-sistema-de-loading-design.md)
**Data:** 2026-09-01

3 fatias independentes entre si (não compartilham arquivo) — ordem por tamanho de superfície: Auth primeiro (1 arquivo, cobre 9 rotas), depois Importação (5 arquivos mecânicos), depois o componente compartilhado (toca 4 arquivos existentes).

## Fatia 1 — `loading.tsx` em `(auth)/`

- `src/app/(auth)/loading.tsx`: reproduz `AuthShell` — painel de marca estático à esquerda (idêntico ao real, sem skeleton pois não depende de dado) + skeleton de título/subtítulo/campos no card à direita.

_Depende de:_ nada.
_Teste:_ ao vivo em aba nova — navegar para `/entrar` (e mais 1-2 rotas de auth) confirmando que o shell aparece consistente; como o fallback só aparece durante o carregamento real do segmento (pode ser rápido demais pra printar, mesmo problema já visto ao tentar capturar o skeleton do Painel), aceitar `tsc`/`eslint`/`build` limpos + inspeção visual do componente como verificação suficiente se o flash não for capturável.

## Fatia 2 — `loading.tsx` na Importação

- `src/app/(app)/importacao/loading.tsx`: skeleton do H1 + grid `sm:grid-cols-2` de 4 blocos (ícone circular + 2 linhas de texto).
- `src/app/(app)/importacao/planilha/loading.tsx`, `pessoas/loading.tsx`, `produtos/loading.tsx`, `ia/loading.tsx`: skeleton do breadcrumb + H1 + `SkeletonForm` (componente já existente, `campos` default 4).

_Depende de:_ nada.
_Teste:_ ao vivo — navegar pras 5 rotas confirmando que não há salto de layout perceptível e que a altura do skeleton bate com a tela real.

## Fatia 3 — `IndicadorProcessando` compartilhado

- `src/components/ui/indicador-processando.tsx`: componente novo, `{ titulo: string; descricao?: string }`, reproduzindo o padrão de `Spinner` + texto já usado em `passo-resultado.tsx`.
- `src/app/(app)/importacao/planilha/passo-resultado.tsx`: troca o bloco de spinner manual (linhas ~114-124) por `<IndicadorProcessando titulo={...} descricao="Isso pode levar alguns segundos. Não feche nem saia desta página até terminar." />`.
- `src/app/(app)/importacao/ia/passo-entrada-ia.tsx`: o botão "Extraindo..." continua como está (é feedback inline de botão, não um bloco — fora do escopo do componente, que é para blocos de status, não para estado de botão).
- `src/app/(app)/importacao/historico/[id]/desfazer-painel.tsx`: troca o bloco `{rodando && (...)}` (linhas ~102-107) por `<IndicadorProcessando titulo="Desfazendo a importação..." descricao="Isso pode levar alguns segundos. Não feche nem saia desta página até terminar." />`.
- `src/components/lancamentos/detalhe-parcela.tsx`: o item de menu "Estornando..." continua como está (mesmo motivo do botão da IA — é rótulo de controle, não bloco de status).

_Depende de:_ nada.
_Teste:_ ao vivo — disparar uma importação de planilha e um "desfazer importação" de teste, confirmar visualmente que o novo componente aparece igual ao spinner antigo (mesmo ícone, mesmo texto), sem mudança de comportamento. Limpar dado de teste depois.
