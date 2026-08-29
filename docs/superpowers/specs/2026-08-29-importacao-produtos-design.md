# Importação de Produtos via planilha

**Data:** 2026-08-29

## 1. Contexto

Segunda parte da sequência pedida pelo usuário em 28/08 ("Importação com IA e depois a parte de produtos"). O card "Produtos" em `/importacao` está com texto desatualizado ("Em breve — o módulo de Produtos ainda não existe") — o módulo `/produtos-servicos` já existe desde 24/08 (spec `2026-08-17-produtos-servicos-vendas-design.md`). Este spec dá vida a esse card: importar um catálogo de produtos/serviços em lote via planilha, no mesmo padrão dos dois fluxos de importação já maduros (Lançamentos financeiros, Clientes/Fornecedores).

O schema de `produtos_servicos` já tem todos os campos necessários (`nome`, `descricao`, `tipo` PRODUTO/SERVICO, `preco_venda`, `categoria_financeira_id`, `unidade_medida`, `codigo_referencia`, `ativo`) — sem UNIQUE em `nome` ou `codigo_referencia`, a resolução de duplicata (Seção 3) é responsabilidade da aplicação, não do banco. Uma migration pequena e aditiva entrou depois, pra rastreio na Central de Importações — ver Seção 4.

## 2. Decisões já validadas com o usuário

- **Duplicata: perguntar linha a linha**, mesmo padrão já usado em categoria/pessoa — mostra a correspondência encontrada e deixa o usuário escolher "usar o existente" ou "criar novo mesmo assim".
- **Código/SKU tem prioridade sobre nome** na hora de achar duplicata, quando a linha traz essa coluna preenchida.
- **Produto e Serviço misturados na mesma planilha**, numa coluna "Tipo" por linha — mesmo espírito da planilha de Lançamentos, que já mistura Receita e Despesa numa coluna.

## 3. Arquitetura — fluxo próprio, espelhando o padrão existente (não reaproveitando componentes literais)

`LinhaBruta` (o tipo já usado por Lançamentos/IA) é sobre datas e valores de lançamento — não serve pra um cadastro de produto. Este fluxo ganha seu próprio tipo de linha e seus próprios passos de UI, mas reaproveita a infraestrutura genérica de baixo nível:

**Reaproveitado sem alteração:**
- `lib/importacao/parse.ts` — leitura de arquivo (.csv/.xlsx), genérico.
- `lib/importacao/locale-br.ts` — parse de número/data em formato BR.
- `lib/importacao/fuzzy.ts` — `candidatosPorSimilaridade`, motor de correspondência aproximada.

**Reaproveitado adaptado (mesmo padrão, filtro adicional):**
- Resolução de categoria financeira: mesma função de `resolucao.ts`/`fuzzy.ts` que Lançamentos já usa pra "categoria" (fuzzy-match + oferecer criar nova), só que filtrando `tipo = RECEITA` — mesma exigência que o cadastro manual de produto já tem hoje.

**Novo, espelhando um padrão que já existe:**
- `lib/importacao/produtos/tipos.ts` — `LinhaBrutaProduto = { linha, importKey, nome, tipo, descricao, precoVenda, categoria, unidadeMedida, codigoReferencia }` (tudo string bruta, igual `LinhaBruta`).
- `lib/importacao/produtos/correspondencia.ts` — `resolverCorrespondenciaProduto(linha, existentes)`, **mesma estrutura em camadas de `resolverCorrespondenciaPessoa`** (`lib/pessoas/importacao/correspondencia.ts`), adaptada:
  1. Código/SKU exato → decide sozinho **só se um único cadastro bater** (dois ou mais com mesmo código nunca decide sozinho, mesma razão de segurança do documento de pessoa).
  2. Código não bate ou está vazio na linha → nome exato.
  3. Nome exato não bate → nome aproximado (fuzzy), depois "fraco" (só dica, sem pré-seleção) — mesmos limiares (`LIMIAR_SIMILARIDADE`/`LIMIAR_DICA`) já calibrados em `fuzzy.ts`.
- `lib/importacao/produtos/commit.ts` — `commitarLinhaProduto`: INSERT (criar novo) ou UPDATE (usar existente) direto em `produtos_servicos`, célula vazia nunca apaga dado já cadastrado no caso de UPDATE (mesma regra que `commitarLinhaPessoa` já aplica). **Sem RPC atômica multi-tabela** — diferente de lançamento financeiro (que envolve evento+parcela+baixa), um produto é um único INSERT/UPDATE numa tabela só.
- Wizard novo em `app/(app)/importacao/produtos/`, 5 passos (mesma contagem que Lançamentos, porque também mapeia colunas de um arquivo livre):
  1. **Upload** — arquivo + nenhuma conta financeira pra escolher aqui (produto não gera baixa).
  2. **Mapeamento** — colunas do arquivo → campos de `LinhaBrutaProduto`.
  3. **Cadastros** — resolve só categoria financeira (criar nova se preciso); duplicata do próprio produto é resolvida na Revisão (próximo passo), não aqui — mesmo padrão de Pessoas (correspondência da própria entidade mora na Revisão, "Cadastros" é só pra entidade referenciada).
  4. **Revisão** — confere/edita cada linha antes de importar (inclui a correspondência de produto por linha, com pré-preenchimento quando 1 único candidato bate), mesmo padrão visual de status ok/aviso/erro que os outros dois fluxos já têm.
  5. **Resultado** — commit sequencial. Registra em `importacoes`/`importacoes_itens` (Seção 4) pra aparecer na Central de Importações, mas sem tela dedicada de Retomar/Desfazer item a item nesta versão — falha de rede a meio caminho não deixa um ledger inconsistente pra trás (produto é 1 tabela só), então refazer a importação inteira já é seguro o bastante por ora.

## 4. Registra na Central de Importações (correção em relação à 1ª versão desta spec)

**Correção**: esta seção dizia originalmente "sem rastreio, mesmo precedente de Clientes/Fornecedores" — investigação errada. Pessoas *também* rastreia, só usa a tabela genérica `importacoes`/`tipo_importacao` (parametrizada por `tipo`, sem um arquivo dedicado tipo `importacoes-pessoas.ts`, o que levou à conclusão errada de que não existia). Os dois fluxos reais já rastreiam.

Decisão corrigida: Produtos também registra, pelo mesmo mecanismo genérico (`lib/importacoes/importacoes.ts`, `tipo: "produtos"`) — precisa de uma migration pequena e aditiva (`ALTER TYPE tipo_importacao ADD VALUE 'produtos'`, ver `docs/schema-aplicado-supabase.md` entrada 59), a única migration deste ciclo. Mesmo lock otimista (`reivindicarProcessamento`) que os outros dois fluxos já usam, pra impedir duas abas processando o mesmo lote em paralelo.

## 5. Validação por linha (Revisão)

- `nome`: obrigatório.
- `tipo`: obrigatório, precisa resolver pra `PRODUTO` ou `SERVICO` (aceita variações comuns: "produto"/"serviço"/"servico", case-insensitive — mesmo espírito de tolerância que `locale-br.ts` já tem pra número/data).
- `precoVenda`: obrigatório, `>= 0` (mesma regra do formulário manual).
- `categoria`: obrigatória (categoria de receita).
- `descricao`, `unidadeMedida`, `codigoReferencia`: opcionais.

## 6. Testes planejados

- Planilha nova (nenhum produto existente no tenant) → todos criados, mistura Produto e Serviço na mesma importação.
- Reimportar a mesma planilha → cada linha encontra sua correspondência exata (por código quando presente, por nome quando não) e o usuário escolhe atualizar em vez de duplicar.
- Duas linhas com o mesmo código de produtos diferentes (dado sujo) → não decide sozinho, cai pra revisão manual.
- Categoria de receita que não existe ainda → oferece criar na etapa Cadastros, mesmo fluxo já testado em Lançamentos.
- Preço negativo ou tipo inválido → linha marcada com erro, não entra na importação.
- Responsivo mobile + desktop.

## 7. Fora de escopo

- Desfazer/Retomar em lote (rastreio básico entra pela Seção 4, mas as telas de desfazer/retomar item a item que Lançamentos tem hoje ficam pra um ciclo futuro, se necessário).
- Vínculo com Estoque (módulo não existe ainda).
- Importação de imagem/foto do produto.
