# Plano de implementação: Importação de Produtos via planilha

**Spec:** [docs/superpowers/specs/2026-08-29-importacao-produtos-design.md](../specs/2026-08-29-importacao-produtos-design.md)
**Data:** 2026-08-29

Ordem por dependência: tipos primeiro, depois as duas funções puras que não precisam de UI (correspondência e commit — testáveis isoladas), só então o wizard, dividido em fatias que seguem a ordem real das telas. Cada fatia é testável isolada antes de seguir pra próxima.

**Refinamento em relação à spec** (não muda o resultado, só onde cada resolução mora): a spec descreve a etapa "Cadastros" resolvendo categoria financeira *e* duplicata de produto. Investigando o precedente mais próximo (`pessoas/importacao/passo-revisao.tsx`), a resolução de duplicata da própria entidade (é ou não é a mesma pessoa) mora dentro da Revisão, com pré-preenchimento automático quando um único candidato bate — nunca numa etapa "Cadastros" à parte (essa etapa, em Lançamentos, é só pra entidades *referenciadas* como categoria/centro de custo, não pra "essa linha já existe?"). Produto tem os dois casos ao mesmo tempo: categoria financeira é referenciada (mesmo padrão de Lançamentos → etapa Cadastros) e duplicata de produto é sobre a própria entidade (mesmo padrão de Pessoas → dentro da Revisão). O plano segue essa divisão mais consistente com o que já existe.

## Fatia 1 — Tipos

`lib/importacao/produtos/tipos.ts`, espelhando `lib/pessoas/importacao/tipos.ts`:

```ts
export type LinhaBrutaProduto = {
  linha: number;
  nome: string; tipo: string; descricao: string; precoVenda: string;
  categoria: string; unidadeMedida: string; codigoReferencia: string;
};
export type TipoCorrespondenciaProduto = "exata_codigo" | "codigo_conflito" | "exata_nome" | "aproximada" | "fraca" | "nenhuma";
export type CandidatoProduto = { id: string; nome: string; codigoReferencia: string | null; precoVenda: number; tipo: "PRODUTO" | "SERVICO" };
export type CorrespondenciaProduto = { tipo: TipoCorrespondenciaProduto; candidatos: CandidatoProduto[] };
export type DecisaoLinhaProduto = { acao: "criar" | "atualizar"; produtoId: string | null } | null;
export type StatusLinhaProduto = "ok" | "precisa_confirmar" | "erro";
export type LinhaValidadaProduto = LinhaBrutaProduto & {
  tipoResolvido: "PRODUTO" | "SERVICO" | null;
  precoVendaNumero: number | null;
  correspondencia: CorrespondenciaProduto;
  status: StatusLinhaProduto;
  erros: string[];
  avisos: string[];
};
```

_Depende de:_ nada.
_Teste:_ `pnpm exec tsc --noEmit` limpo.

## Fatia 2 — Correspondência e commit (sem UI)

- `lib/importacao/produtos/correspondencia.ts` — `resolverCorrespondenciaProduto(linha, existentes)`, mesma estrutura em camadas de `resolverCorrespondenciaPessoa` (código exato decide sozinho só com 1 candidato → nome exato → aproximado via `candidatosPorSimilaridade` → fraco). `buscarProdutosExistentes(supabase, tenantId)` — busca `id, nome, codigo_referencia, preco_venda, tipo` de `produtos_servicos`.
- `lib/importacao/produtos/commit.ts` — `commitarLinhaProduto`: `criar` chama `criarProdutoServico` (já existe em `lib/produtos-servicos/produtos-servicos.ts`, reaproveitado direto); `atualizar` faz UPDATE só dos campos que a linha trouxe preenchidos (célula vazia nunca apaga dado existente, mesma regra de `commitarLinhaPessoa`) — não pode reaproveitar `editarProdutoServico` direto porque essa função exige todos os campos; precisa de uma variante que aceita parciais.

_Depende de:_ Fatia 1.
_Teste:_ chamada direta contra dado real do tenant Angelus Martiniano — um produto com código igual a um existente (deve resolver por código), um só com nome parecido (deve cair em "aproximada"), dois produtos existentes com o mesmo código (dado sujo forçado) confirmando que não decide sozinho. `commitarLinhaProduto` com `atualizar` e só 1 campo preenchido na linha, confirmar que os outros campos do produto existente não mudam.

## Fatia 3 — Wizard: Upload + Mapeamento

`app/(app)/importacao/produtos/`:
- `page.tsx` — busca nada de conta financeira (produto não gera baixa); busca categorias de receita existentes pra passar adiante.
- `wizard.tsx` — máquina de estado, 5 etapas (`upload | mapeamento | cadastros | revisao | resultado`).
- `passo-upload.tsx` — igual ao de Lançamentos, menos o seletor de conta financeira.
- `passo-mapeamento.tsx` — mapeia colunas do arquivo pros campos de `LinhaBrutaProduto` (nome, tipo, descrição, preço, categoria, unidade, código). Reaproveita `parseArquivo` (`lib/importacao/parse.ts`) sem alteração.
- `lib/importacao/produtos/template.ts` — `gerarModeloCsvProdutos()`, pro botão "Baixar modelo" (mesmo padrão que os outros dois fluxos já têm).

_Depende de:_ Fatias 1-2.
_Teste:_ ao vivo — subir uma planilha de teste, confirmar que as colunas mapeiam certo e o parse não quebra com produto/serviço misturado.

## Fatia 4 — Etapa Cadastros (só categoria financeira)

`passo-cadastros.tsx` — enxuto, resolve só categoria financeira (fuzzy-match contra categorias de RECEITA existentes, oferece criar nova) — **não** registra nada em `importacoes`/`importacoes_itens` (Seção 4 da spec: produto não entra na Central de Importações, diferente de Lançamentos). Não reaproveita `PassoEntidades` de planilha diretamente (ele é 4-entidades genérico e grava proveniência na Central de Importações) — versão própria, menor, só pra 1 entidade.

_Depende de:_ Fatia 3.
_Teste:_ categoria que já existe resolve sozinha; categoria nova oferece criar, e confirma que ela aparece disponível pras linhas seguintes sem precisar recarregar a página.

## Fatia 5 — Etapa Revisão + Resultado

- `passo-revisao.tsx` — tabela editável por linha (status ok/precisa_confirmar/erro, mesmo vocabulário visual dos outros fluxos), resolução de duplicata de produto por linha via `resolverCorrespondenciaProduto`, com `decisaoPadrao` pré-preenchendo quando 1 único candidato bate por código ou nome exato (mesma lógica de `pessoas/passo-revisao.tsx`) — usuário sempre pode trocar pra "criar novo mesmo assim".
- `passo-resultado.tsx` — commit sequencial linha a linha via `commitarLinhaProduto`, sem rastreio de retomada por item (Seção 3 da spec: falha no meio não deixa dado financeiro inconsistente, só produtos faltando, refazer é seguro).
- `actions.ts` — server actions: `buscarProdutosExistentesAction`, `criarCategoriaProdutoAction` (reaproveita `criarCategoria` de `lib/contabil/categorias.ts`, mesmo padrão de `criarEntidadeAprovada`), `executarImportacaoProdutosAction`.

_Depende de:_ Fatias 1-4.
_Teste:_ ao vivo, ponta a ponta pela primeira vez — planilha real com Produto e Serviço misturados, uma linha duplicando um produto existente (confirma pré-preenchimento), uma linha com preço inválido (confirma erro bloqueando só aquela linha).

## Fatia 6 — Ativa o card + revisão de código

- `app/(app)/importacao/page.tsx`: card "Produtos" troca `descricao: "Em breve — o módulo de Produtos ainda não existe."` (sem `href`) por `href: "/importacao/produtos"` e descrição real.
- Revisão de código independente (mesmo padrão já confirmado nos ciclos anteriores desta sessão pra feature financeira nova) — ainda que produto não seja lançamento financeiro, mexe em cadastro real do tenant.

_Depende de:_ Fatia 5.

## Fatia 7 — Teste ponta a ponta + responsivo

Reexecutar a lista de testes da Seção 6 da spec pelo navegador: planilha nova, reimportação da mesma planilha (confirma resolução por código/nome), duas linhas com código colidindo, categoria nova, preço/tipo inválido. Mobile (375px) e desktop nas 5 telas do wizard.

_Depende de:_ Fatias 1-6.

## Fora de escopo (herdado da spec)

Rastreio em Central de Importações / Desfazer em lote; vínculo com Estoque; importação de imagem do produto.
