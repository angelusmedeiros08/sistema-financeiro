# Importação de Clientes/Fornecedores — módulo de entrada em massa de pessoas

## 1. Contexto

Módulo irmão da importação de lançamentos financeiros (`docs/superpowers/specs/2026-08-16-importacao-de-planilha-design.md`, já implementado e testado). Mesmo objetivo — trazer de uma vez o que o cliente já mantém numa planilha — mas pra cadastro de pessoa (`pessoas` + `pessoa_enderecos` + `pessoa_contatos`) em vez de lançamento financeiro.

**Diferença estrutural que muda o desenho**: no import financeiro, cada linha *referencia* categoria/centro de custo/pessoa/forma de pagamento — por isso existe uma etapa dedicada de "resolver essas referências" antes da grade de validação. Aqui cada linha *é* a própria pessoa — a resolução de correspondência (criar nova vs. atualizar existente) acontece por linha, direto na grade de revisão, sem etapa própria. O wizard fica com 4 passos em vez de 5.

Reaproveita sem alteração `lib/importacao/parse.ts` (parsing `.csv`/`.xlsx`, detecção de delimitador/encoding) e `lib/importacao/fuzzy.ts` (normalização + correspondência aproximada) — são agnósticos de domínio, já preparados pra isso.

## 2. Escopo

**Dentro:**
- Upload de `.csv`/`.xlsx` → mapeamento de colunas (com campos personalizados dinâmicos do tenant) → grade de revisão por linha (criar/atualizar/erro, editável) → commit → resumo.
- Dados: pessoa (nome, documento, natureza, perfis, email, telefone), endereço principal, um contato, campos personalizados.
- Atualização de pessoa existente quando a linha corresponde (nunca cria duplicata pra quem já bate por documento ou nome).
- Perfis somam entre si (nunca sobrescrevem) — mesma pessoa pode entrar como só-cliente hoje e ganhar o perfil de fornecedor num import futuro sem virar dois cadastros.
- CTA de importação nas telas de Clientes e Fornecedores quando vazias.

**Fora:**
- Produtos — módulo ainda não existe, importação dele fica pra quando o cadastro nascer.
- Item de sidebar dedicado pra importação — mora em Configurações por ora; reorganização de navegação é uma etapa própria antes do lançamento (ver memória do projeto).
- Múltiplos endereços/contatos por linha — planilha traz só o principal de cada; quem precisar de mais de um completa depois na ficha da pessoa.
- Exclusão de pessoa via planilha — import só cria ou atualiza, nunca apaga.

## 3. Colunas do modelo

| Bloco | Coluna | Obrigatória | Observação |
|---|---|---|---|
| Pessoa | Nome | Sim | |
| Pessoa | Perfil | Sim | Cliente / Fornecedor / Transportadora — aceita mais de um valor separado por vírgula na mesma célula |
| Pessoa | CPF/CNPJ | Não | Validado por dígito verificador quando preenchido |
| Pessoa | Natureza | Não | Física / Jurídica — se vazia e o documento vier preenchido, inferida pelo tamanho (11 dígitos → Física, 14 → Jurídica) |
| Pessoa | Email | Não | |
| Pessoa | Telefone | Não | |
| Endereço | CEP | Não | |
| Endereço | Logradouro | Não | |
| Endereço | Número | Não | |
| Endereço | Complemento | Não | |
| Endereço | Bairro | Não | |
| Endereço | Cidade | Não | |
| Endereço | UF | Não | |
| Contato | Nome do contato | Não | |
| Contato | Cargo | Não | |
| Contato | Email do contato | Não | |
| Contato | Telefone do contato | Não | |
| Personalizado | 1 coluna por campo definido em Configurações → Campos personalizados | Não | Nome da coluna = rótulo do campo; tipo (Texto/Número/Data/Booleano) valida o valor da célula |

Endereço só é gravado se pelo menos um campo do bloco vier preenchido na linha (mesmo critério pro contato) — planilha sem essas colunas mapeadas simplesmente não cria nada ali, sem gerar erro.

## 4. Resolução de correspondência — por linha, nunca por valor único

Pra cada linha, nessa ordem:

1. **Documento exato**: normaliza (remove pontuação) e compara contra `pessoas.documento` já cadastrado no tenant — se bater, sugere "Atualizar «Nome cadastrado»", pré-selecionado (correspondência forte, documento é identificador confiável mesmo sem constraint de unicidade no banco).
2. **Nome**: se não bateu por documento (ou a linha não trouxe documento), compara o nome contra os cadastrados — igual normalizado (acento/caixa) vira correspondência exata, pré-selecionada; aproximado (mesmo mecanismo de `fuzzy.ts`, limiar 0,85) só sugere, nunca decide sozinho.
3. **Nenhuma correspondência**: "Criar nova pessoa", pré-selecionado.

Usuário sempre pode trocar a decisão de qualquer linha na grade antes de confirmar — inclusive forçar "criar nova" numa linha que o sistema sugeriu como correspondência (nomes iguais podem ser pessoas diferentes) ou apontar manualmente pra outra pessoa cadastrada.

## 5. Regra de atualização

- **Célula vazia nunca apaga dado já cadastrado** — só sobrescreve os campos da pessoa (nome, documento, natureza, email, telefone) que vieram preenchidos na linha. Uma planilha incompleta não é capaz de esvaziar um cadastro completo.
- **Perfis somam, nunca substituem**: o resultado é a união entre os perfis já cadastrados e os que a linha trouxe. Uma pessoa que já é Cliente e aparece numa linha marcada só como Fornecedor termina com os dois perfis, nunca perde o Cliente. Isso vale tanto dentro do mesmo arquivo quanto entre imports diferentes feitos em momentos distintos — evita o sistema criar dois cadastros pra mesma pessoa real.
- **Endereço e contato da linha sempre viram um registro novo no histórico** (nunca editam um existente) — mesma regra que já vale hoje pro cadastro manual (`substituirEndereco`/`substituirContato`: marca o anterior como substituído, insere o novo). Se a linha não trouxe endereço/contato, nada é tocado ali.
- **Vínculos existentes nunca quebram**: como a pessoa correspondente é sempre atualizada (nunca recriada), lançamento financeiro (`eventos_financeiros.pessoa_id`) ou convite de portal (`usuario_tenant.pessoa_id`) já vinculados continuam intactos automaticamente.

## 6. Validações

Grade com status por linha, editável inline célula a célula, mesmo padrão visual do import financeiro:

- **✗ Erro (bloqueia a linha)**: nome vazio; perfil vazio ou com valor que não é Cliente/Fornecedor/Transportadora; documento preenchido mas com dígito verificador inválido; email (pessoa ou contato) preenchido sem `@`; campo personalizado com valor que não bate com o tipo definido (ex.: texto numa coluna Número).
- **⚠ Precisa confirmar**: linha cuja única correspondência encontrada foi aproximada (Seção 4) — fica fora da contagem de "prontas" até o usuário confirmar usar a pessoa sugerida ou trocar pra "criar nova"/outra pessoa. Não é um aviso de duplicata (não existe esse conceito aqui, diferente do import financeiro) — é uma decisão pendente, mesma lógica de "nunca decide sozinho" da Seção 4.
- **✓ Pronta**: nova pessoa ou atualização já com correspondência resolvida (exata ou confirmada manualmente).
- Resumo fixo no topo: "X novas · Y atualizações · Z aguardando confirmação · W com erro". Botão "Importar" habilita com pelo menos 1 linha pronta (nova ou atualização já decidida).

## 7. Commit

Um `server action` por linha, sequencial, reaproveitando as funções que já existem em `lib/pessoas/pessoas.ts` — sem RPC nova:

1. `criarPessoa` (linha marcada como nova) ou `atualizarPessoa` com união de perfis (linha marcada como atualização) — união calculada antes da chamada: busca os perfis já cadastrados da pessoa correspondente e junta com os que a linha trouxe.
2. Se a linha trouxe endereço, `adicionarEndereco` com o `pessoa_id` do passo 1.
3. Se a linha trouxe contato, `adicionarContato` com o mesmo `pessoa_id`.
4. Se a linha trouxe campo personalizado, grava em `pessoas.campos_personalizados` (jsonb) na mesma chamada de criar/atualizar — `criarPessoa` (`lib/pessoas/pessoas.ts`) precisa ganhar esse parâmetro opcional, hoje só `atualizarPessoa` aceita.

Falha parcial nessa cadeia (ex.: pessoa criada mas endereço falhou) deixa um estado recuperável — a pessoa existe, só falta endereço, igual ao raciocínio já aceito pra `registrarBaixa` no import financeiro (não é um ledger contábil balanceado, não exige atomicidade forte de banco).

**Sem `import_key`**: diferente do import financeiro, a correspondência por documento/nome (Seção 4) já garante idempotência natural — se o navegador fechar no meio do import e o usuário reimportar o mesmo arquivo, as pessoas já criadas batem por documento/nome na segunda tentativa e viram "Atualizar" em vez de duplicar. Efeito colateral aceito: se a linha já tinha endereço/contato, reimportar cria uma entrada redundante no histórico (mesmo trade-off já aceito na baixa financeira — ganho marginal pequeno, complexidade maior pra evitar).

## 8. Limites

Mesmos do import financeiro: `.csv`/`.xlsx`, até 10MB, até 500 linhas por execução.

## 9. UI

- **Configurações → Importar Clientes/Fornecedores**, mesmo padrão de navegação e visual do import financeiro (stepper de 4 passos, grade editável, resumo final com "baixar linhas com erro").
- **CTA de destaque** ("Nenhum cadastro ainda. Cadastre manualmente ou importe sua planilha") nas telas de Clientes e Fornecedores quando o tenant não tem nenhuma pessoa com o perfil correspondente — mesmo padrão já usado em Receitas/Despesas/Painel.
- Sem item de sidebar dedicado por ora — decisão de navegação revisitada na etapa de organização de IA antes do lançamento.

## 10. Testes

- Correspondência: planilha com "João Silva" (documento batendo com pessoa já cadastrada como só-Cliente) e perfil "Fornecedor" — resultado é 1 pessoa com os dois perfis, não duas.
- Correspondência aproximada: "Joao Silvaa" (erro de digitação) sugere a pessoa existente, não decide sozinho.
- Atualização parcial: linha só com telefone preenchido (resto vazio) numa pessoa que já tem email cadastrado — email permanece, telefone atualiza.
- CPF/CNPJ com dígito verificador errado vira erro bloqueante, com mensagem clara.
- Natureza inferida corretamente pelo tamanho do documento quando a coluna Natureza vem vazia.
- Endereço/contato: linha sem nenhuma coluna de endereço preenchida não cria registro nenhum em `pessoa_enderecos`.
- Campo personalizado: valor incompatível com o tipo definido (texto numa coluna Número) vira erro na linha, não trava o arquivo inteiro.
- Idempotência informal: reimportar o mesmo arquivo duas vezes não duplica pessoa (segunda vez tudo vira "Atualizar").
- Teste real no navegador: planilha de teste (~15 linhas, mistura de clientes/fornecedores/ambos, uma correspondência aproximada, um erro proposital, um campo personalizado) do começo ao fim, conferindo o resultado no banco.
