# Importação de Produtos via planilha

**Data:** 2026-08-29

## 1. Contexto

Segunda parte da sequência pedida pelo usuário em 28/08 ("Importação com IA e depois a parte de produtos"). O card "Produtos" em `/importacao` está com texto desatualizado ("Em breve — o módulo de Produtos ainda não existe") — o módulo `/produtos-servicos` já existe desde 24/08 (spec `2026-08-17-produtos-servicos-vendas-design.md`). Este spec dá vida a esse card: importar um catálogo de produtos/serviços em lote via planilha, no mesmo padrão dos dois fluxos de importação já maduros (Lançamentos financeiros, Clientes/Fornecedores).

Sem migration — o schema de `produtos_servicos` já tem todos os campos necessários (`nome`, `descricao`, `tipo` PRODUTO/SERVICO, `preco_venda`, `categoria_financeira_id`, `unidade_medida`, `codigo_referencia`, `ativo`). Sem UNIQUE em `nome` ou `codigo_referencia` — a resolução de duplicata (Seção 4) é responsabilidade da aplicação, não do banco.

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
  3. **Cadastros** — resolve categoria financeira (criar nova se preciso) e resolve duplicata de produto por linha (usar existente ou criar novo).
  4. **Revisão** — confere/edita cada linha antes de importar, mesmo padrão visual de status ok/aviso/erro que os outros dois fluxos já têm.
  5. **Resultado** — commit sequencial (não precisa de rastreio de retomada por linha como o financeiro — falha de rede a meio caminho não deixa um ledger inconsistente pra trás, só produtos não criados, refazer é seguro).

## 4. Sem rastreio na Central de Importações

Diferente de Lançamentos financeiros (que registra cada lote em `importacoes`/`importacoes_itens` pra permitir Desfazer/Retomar — necessário porque envolve dinheiro e parcela), este fluxo **não** registra na Central de Importações — mesmo precedente já estabelecido por Clientes/Fornecedores, que também não registra lá. Produto criado errado se corrige editando direto em `/produtos-servicos` (ou inativando), sem necessidade do mecanismo de desfazer em lote.

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

- Rastreio em Central de Importações / Desfazer em lote (Seção 4).
- Vínculo com Estoque (módulo não existe ainda).
- Importação de imagem/foto do produto.
