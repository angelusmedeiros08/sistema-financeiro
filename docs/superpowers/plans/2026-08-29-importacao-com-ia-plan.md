# Plano de implementação: Importação com IA

**Spec:** [docs/superpowers/specs/2026-08-29-importacao-com-ia-design.md](../specs/2026-08-29-importacao-com-ia-design.md)
**Data:** 2026-08-29

Ordem por dependência: primeiro o tipo/dependência de base, depois a função de extração (sem UI, testável isolada com uma chamada real à API), só então o wizard novo (que consome a função), depois a extensão pontual de UI da Revisão, e por último trocar o card de "em breve" pra apontar pra rota nova. Teste ponta a ponta fecha o plano. Cada fatia é testável isolada antes de seguir pra próxima.

## Fatia 0 — Pré-requisito (usuário, fora do código)

`ANTHROPIC_API_KEY` precisa existir em `app/.env.local` (dev) antes da Fatia 2 rodar de verdade — criada em `console.anthropic.com`. Sem isso, Fatia 2 escreve o código mas não consegue testar contra a API real. Confirmar com o usuário que a chave já está no `.env.local` antes de começar a Fatia 2; se não estiver, pedir pra ele colar antes de seguir (nunca gerar/obter isso por conta própria).

## Fatia 1 — Tipo `LinhaBrutaIA` + dependência

- `lib/importacao/tipos.ts`: adiciona `LinhaBrutaIA = LinhaBruta & { camposBaixaConfianca: (keyof LinhaBruta)[] }`.
- `pnpm add @anthropic-ai/sdk` em `app/` (nunca `npm add`).

_Depende de:_ nada.
_Teste:_ `pnpm exec tsc --noEmit` limpo; `import Anthropic from "@anthropic-ai/sdk"` resolve sem erro.

## Fatia 2 — `extrairLancamentosIA` (sem UI)

Novo arquivo `lib/importacao/extracao-ia.ts` (`"server-only"`):

- Cliente Anthropic (`ANTHROPIC_API_KEY` do ambiente, nunca hardcoded).
- Modelo `claude-sonnet-5`, chamada via tool use com `strict: true` — ferramenta `registrar_lancamentos_extraidos`, `input_schema` array de objetos com os campos de `LinhaBruta` (sem `linha`/`importKey`, atribuídos depois) + `camposBaixaConfianca: string[]`.
- Aceita `{ texto: string }` OU `{ imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" }` — nunca os dois.
- Prompt do sistema: papel (extrair lançamento financeiro de texto/imagem pra um sistema financeiro brasileiro), data de hoje via `hojeIsoBrasil()` (resolver "ontem"/"dia 15"), instrução explícita de nunca inventar valor ausente — campo incerto fica vazio ou entra em `camposBaixaConfianca`.
- Retorno: `{ linhas: LinhaBrutaIA[] }` com `linha`/`importKey` atribuídos (mesmo padrão de geração de `importKey` que `lib/importacao/parse.ts` já usa) ou `{ erro: string }` — incluindo o caso "zero lançamentos identificados" como erro amigável, não lista vazia silenciosa.

_Depende de:_ Fatia 1 (tipo, dependência, `ANTHROPIC_API_KEY` presente).
_Teste:_ chamada direta da função (script local ou rota de teste temporária) com 3 entradas reais: (a) texto simples de 1 lançamento ("Paguei 45 reais de Uber ontem"), (b) texto de lote (várias linhas tipo WhatsApp), (c) uma imagem real de comprovante/print. Conferir que a data relativa resolve certo, que nenhum valor foi inventado, e que o caso "texto sem nada financeiro" retorna erro amigável em vez de lista vazia ou exceção.

## Fatia 3 — Wizard novo (`/importacao/ia`)

Mesma estrutura de `app/(app)/importacao/planilha/`, reaproveitando 3 dos 4 passos sem alteração:

- `app/(app)/importacao/ia/page.tsx` — busca as mesmas props que `planilha/page.tsx` já busca pra alimentar `PassoEntidades` (entidades existentes do tenant, contas financeiras se aplicável).
- `app/(app)/importacao/ia/wizard.tsx` — máquina de estado com 4 etapas (`entrada | entidades | preview | resultado`), mesmo padrão de `planilha/wizard.tsx`; usa `PassoEntidades`, `PassoPreview` e `PassoResultado` **importados de `../planilha/`** (não duplicar os arquivos — são os mesmos componentes, já genéricos o bastante por consumirem `LinhaBruta[]`).
- `app/(app)/importacao/ia/passo-entrada-ia.tsx` (NOVO) — textarea pra colar texto OU upload/drag-drop de imagem (um ou outro, nunca os dois no mesmo envio); conversão client-side de HEIC→JPEG antes do envio quando aplicável; botão "Extrair lançamentos" chama a server action.
- `app/(app)/importacao/ia/actions.ts` — server action que chama `extrairLancamentosIA` e devolve o resultado (ou erro) pro client.

_Depende de:_ Fatia 2.
_Teste:_ ao vivo no navegador — colar o mesmo texto de lote testado na Fatia 2, confirmar que a extração aparece corretamente na Etapa 2 (Cadastros), resolve categoria existente e oferece criar categoria nova quando não existe (mesmo comportamento já validado no fluxo de planilha), avança pra Revisão com as linhas certas.

## Fatia 4 — Indicador de confiança na Revisão

- `app/(app)/importacao/planilha/passo-preview.tsx` (componente compartilhado, ver Fatia 3): `PassoPreview` ganha uma prop opcional `camposBaixaConfiancaPorLinha?: Map<string, Set<keyof LinhaBruta>>` (chave = `importKey`). Quando ausente (fluxos de planilha/pessoas), comportamento idêntico ao de hoje — sem essa prop, nada muda visualmente pra eles.
- Célula de um campo listado ganha o mesmo tratamento visual âmbar que a linha com aviso de duplicata já usa (reaproveita `WarningCircle`/cor already used, ver `StatusIcone`), com tooltip curto ("IA teve baixa confiança neste campo — confira o valor").
- `app/(app)/importacao/ia/wizard.tsx` passa a prop nova ao instanciar `PassoPreview`; `planilha/wizard.tsx` e `pessoas/wizard.tsx` continuam chamando sem ela.

_Depende de:_ Fatia 3.
_Teste:_ forçar um caso de baixa confiança (imagem borrada ou valor ambíguo de propósito) e confirmar visualmente que só os campos marcados ficam destacados, e que o fluxo de planilha (sem essa prop) continua pixel-idêntico ao de antes desta fatia.

## Fatia 5 — Ativa o card na tela de Importação

`app/(app)/importacao/page.tsx`: card "Importar com IA" troca `descricao: "Em breve — cole um texto ou envie um print e deixe a IA extrair os dados."` (sem `href`) por `href: "/importacao/ia"` e descrição real (ex.: "Cole um texto ou envie um print e deixe a IA extrair os lançamentos.").

_Depende de:_ Fatia 3.
_Teste:_ clicar no card a partir de `/importacao` leva pro wizard novo.

## Fatia 6 — Teste ponta a ponta + responsivo

Reexecutar a lista de testes da Seção 7 da spec de ponta a ponta pelo navegador (não mais chamada direta de função): texto simples, texto em lote, imagem real, caso de baixa confiança, caso de zero lançamentos, categoria nova vs. existente na etapa Cadastros. Testar a tela de Entrada em mobile (375px) e desktop — upload de imagem e textarea, mesmo padrão de verificação já usado nas fatias anteriores desta sessão (screenshot antes/depois, sem quebra de layout).

_Depende de:_ Fatias 1-5.

## Fora de escopo (herdado da spec)

Pipeline fiscal completo (XML/SEFAZ); limite de uso/custo por tenant (revisar junto do SMTP de produção antes de lançamento público); deduplicação de mesma imagem enviada duas vezes; aprendizado por tenant entre extrações.
