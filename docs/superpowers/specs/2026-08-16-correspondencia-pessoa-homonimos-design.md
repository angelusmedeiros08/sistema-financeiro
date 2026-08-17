# Correspondência de pessoa nos imports: homônimos e quase-match

## Contexto

Os dois wizards de importação por planilha (Lançamentos Financeiros e Clientes/Fornecedores) resolvem a coluna "Cliente/Fornecedor" contra o cadastro de pessoas já existente do tenant, decidindo se cada valor da planilha aponta pra uma pessoa existente ou vira cadastro novo. Testando o import financeiro, veio a dúvida: e se houver duas pessoas cadastradas com o mesmo nome (homônimos)? E uma pessoa nova na planilha que na verdade já existe, só com grafia levemente diferente?

Investigando o código hoje:

- **Import financeiro** (`lib/importacao/fuzzy.ts`, usado em `passo-entidades.tsx`): resolve a coluna "Cliente/Fornecedor" só por nome normalizado. A coluna "CPF/CNPJ" da planilha só é usada se o usuário decidir criar pessoa nova — nunca ajuda a bater com pessoa existente. `resolverCorrespondencia()` usa `.find()`, que para no primeiro nome igual encontrado — se houver 2+ pessoas cadastradas com o mesmo nome, a segunda simplesmente não aparece como opção alternativa na sugestão automática (embora apareça na lista manual do dropdown).
- **Import de Clientes/Fornecedores** (`lib/pessoas/importacao/correspondencia.ts`): já prioriza documento sobre nome, o que já resolve homônimo *quando a planilha traz documento*. Mas quando não traz (pessoa sem CPF/CNPJ cadastrado, comum em cadastro informal), cai pra nome exato — mesmo problema do `.find()` de cima.
- Em ambos os wizards, um nome com similaridade abaixo de 85% vira "nenhuma correspondência" silenciosamente — sem indicar que quase bateu — abrindo espaço pra criar um cadastro duplicado por uma variação de grafia.

Pesquisa de mercado (Attio, NetSuite, Dynamics 365) confirma a prática padrão: nunca confiar em nome sozinho pra decidir automaticamente — usar um identificador único quando existir, e quando não existir, sempre expor o(s) candidato(s) com dados extra pro usuário decidir, nunca escolher silenciosamente.

## Escopo

**Dentro do escopo**, nos dois wizards:
- Documento (CPF/CNPJ) passa a ser o critério que decide sozinho, priorizado sobre nome, também no import financeiro (hoje só o de pessoas faz isso).
- Nome sozinho nunca mais decide sozinho — sempre exige confirmação explícita, mesmo quando só existe 1 candidato.
- Detecção de múltiplos candidatos (2+ pessoas com mesmo documento ou mesmo nome) em vez de aceitar o primeiro encontrado.
- Aviso de conflito quando o nome bate mas o documento informado diverge do documento já cadastrado.
- Aviso de "quase bateu" quando a similaridade de nome fica abaixo do limiar de sugestão automática, mas ainda é relevante — pra evitar duplicata por variação de grafia.
- Mostrar documento, email e telefone (o que existir) ao lado de cada candidato nas duas telas de revisão, pra dar contexto suficiente pra decidir.

**Fora do escopo:**
- Perfil da pessoa nova criada pelo import financeiro (hoje sempre nasce CLIENTE+FORNECEDOR) — problema separado, fica pra outra rodada.
- Qualquer mudança em categoria, centro de custo ou forma de pagamento — o risco de homônimo é específico de pessoa (identidade real), essas outras entidades continuam com o `.find()` simples de hoje.
- Mudar o limiar de 85% da correspondência aproximada em si — só adiciona um nível informativo abaixo dele.

## Modelo de correspondência (compartilhado entre os dois wizards)

A lógica de correspondência de pessoa (hoje só em `lib/pessoas/importacao/correspondencia.ts`) passa a ser a única fonte usada pelos dois wizards — o import financeiro abandona `resolverCorrespondencia()` genérico especificamente pra resolver a coluna de pessoa (categoria/centro de custo/forma de pagamento continuam usando o genérico, sem mudança).

Ordem de avaliação, por valor único de nome + documento (quando a planilha trouxer documento em pelo menos uma linha que cite esse nome):

1. **Documento bate com exatamente 1 cadastro** → aceita automático. Único caso que decide sozinho.
2. **Documento bate com 2+ cadastros** (duplicata de documento já existente no banco — não deveria acontecer, mas não há constraint que impeça) → não decide sozinho, lista os candidatos.
3. **Documento não bate com nada, mas o nome bate com um cadastro que tem outro documento (ou nenhum)** → aviso de conflito, não decide sozinho. Cobre razão social trocada e homônimo real com documentos diferentes.
4. **Sem documento pra comparar, nome bate exato com 1+ cadastros** → nunca decide sozinho (mudança em relação a hoje). Lista o(s) candidato(s).
5. **Nome aproximado** (≥85% de similaridade, comportamento já existente) → sugestão, exige confirmação.
6. **Nome "parecido mas fraco"** (novo: entre 60% e 85% de similaridade) → dica opcional, sem pré-seleção — só pra evitar duplicata por variação de grafia despercebida.
7. **Nada parecido** → cria novo, sem aviso (comportamento de hoje).

Cada candidato exibido (em qualquer tier que não decide sozinho) mostra nome, documento, email e telefone — o que a pessoa tiver cadastrado.

## Mudanças concretas por wizard

**Import financeiro** (`passo-entidades.tsx` + `lib/importacao/resolucao.ts`):
- A seção "Clientes / Fornecedores" passa a usar o resolver de pessoa compartilhado, com o documento vindo da coluna "CPF/CNPJ" (mesma lógica que já existe pra popular documento de pessoa nova, só que agora também usada pra correspondência).
- `buscarEntidadesExistentes()` passa a trazer `email, telefone` de pessoas, além do que já busca.
- O pré-preenchimento automático de decisão (hoje: qualquer correspondência "exata" já vem marcada como "usar existente") deixa de acontecer pra match só-por-nome — só documento-único pré-marca.

**Import de Clientes/Fornecedores** (`correspondencia.ts` + `validacao.ts` + `passo-revisao.tsx`):
- `resolverCorrespondenciaPessoa()` ganha os tiers novos (documento múltiplo, conflito, nome múltiplo, fraca).
- A query de pessoas existentes em `page.tsx` passa a trazer `email, telefone` também.
- O `decisaoPadrao()` (hoje pré-marca `exata_nome` como "atualizar" automaticamente) deixa de pré-marcar pra esse tier — vira igual à correspondência aproximada de hoje, que já exige clique.

## Testes

- Duas pessoas cadastradas com nome idêntico, planilha sem documento → nenhuma decide sozinha, as duas aparecem como candidatas com email/telefone pra diferenciar.
- Planilha com documento que bate com uma pessoa cujo nome é diferente do que está na planilha (razão social mudou) → aceita automático pelo documento, ignora a diferença de nome.
- Planilha com nome batendo em uma pessoa cadastrada, mas documento da planilha diferente do documento cadastrado → aviso de conflito, não decide sozinho.
- Nome na planilha com pequena variação de grafia de uma pessoa já cadastrada (similaridade entre 60–85%) → aparece como dica, não pré-selecionado, criar novo continua sendo a ação padrão se o usuário não mexer.
- Duas pessoas cadastradas com o mesmo documento (dado legado inconsistente) → não decide sozinho, lista as duas.
- Regressão: nenhuma mudança de comportamento pra categoria, centro de custo e forma de pagamento.
