# Importação: sinônimos de coluna e memória de mapeamento por tenant

## Contexto

Fatia 2 de 4 da revisão do módulo de Importação (Fatia 1 — bugs de data e acento — já concluída). O reconhecimento de cabeçalho hoje (`lib/importacao/template.ts::sugerirMapeamentoColunas` e o gêmeo em `lib/pessoas/importacao/template.ts`) é igualdade exata contra um único rótulo fixo por campo, depois de normalizar (`normalizarTexto`: remove acento, minúscula, trim). Uma planilha com "Vencimento" em vez de "Data de vencimento" nunca é reconhecida automaticamente — o usuário sempre mapeia na mão, mesmo quando a informação evidentemente existe no arquivo.

## Sinônimos — curados, nunca fuzzy

Cada campo do template ganha uma lista fixa de apelidos, comparados por igualdade exata (após `normalizarTexto`), na mesma função que já compara contra o rótulo oficial — não é um mecanismo novo, é o rótulo único virando uma lista.

**Deliberadamente não uso comparação aproximada/fuzzy aqui**, ao contrário da correspondência de pessoa (que já usa Levenshtein): os 10 campos do template financeiro incluem pares perigosamente parecidos como "Data de pagamento" vs. "Data de vencimento" — um fuzzy match arriscaria trocar um pelo outro silenciosamente, e errar *qual data é qual* é pior que não reconhecer a coluna (o usuário mapeia errado sem perceber, em vez de mapear na mão percebendo que precisa decidir). Nome de pessoa tem esse risco menor (limiar 0.85 já é conservador ali) — cabeçalho estrutural fixo não.

Lista inicial (financeiro, `lib/importacao/template.ts`):

| Campo | Sinônimos adicionais |
|---|---|
| `data_competencia` | Competência, Data Competência, Data Emissão, Emissão |
| `valor` | Valor Total, Montante |
| `categoria` | Categoria Financeira |
| `descricao` | Histórico, Descrição do Lançamento, Observação, Obs |
| `data_vencimento` | Vencimento, Data Venc |
| `data_pagamento` | Data Pgto, Pago em, Data da Baixa |
| `pessoa` | Cliente, Fornecedor, Cliente/Fornecedor, Nome |
| `documento_pessoa` | CNPJ/CPF, Documento |
| `centro_custo` | Centro Custo, CC |
| `forma_pagamento` | Forma Pagamento, Meio de Pagamento |

Lista análoga pra `lib/pessoas/importacao/template.ts` (Nome, Perfil, Email, Telefone etc. — mesmo princípio, apelidos óbvios de cada campo). **Campos personalizados** (`campo:${id}`, dinâmicos por tenant) ficam de fora de sinônimo e memória — o rótulo já é definido pelo próprio tenant em Configurações → Campos Personalizados, então já é 1:1 por natureza; guardar uma regra de mapeamento pra uma chave `campo:${id}` arriscaria sobreviver depois do campo ser renomeado ou apagado, apontando pra um id que não existe mais.

**Validação de não-colisão**: nenhum sinônimo pode aparecer em dois campos da mesma lista ao mesmo tempo (ex.: "Pagamento" sozinho seria ambíguo entre `data_pagamento` e `forma_pagamento` — por isso os sinônimos acima são sempre qualificados, "Data Pgto"/"Forma Pagamento", nunca a palavra solta). Um teste automatizado varre `COLUNAS_TEMPLATE` e falha se dois campos compartilharem um sinônimo normalizado — protege contra a próxima pessoa que for adicionar um apelido sem perceber a colisão.

## Memória de mapeamento por tenant

Tabela nova `regras_mapeamento_coluna`: `id uuid pk`, `tenant_id`, `tipo_wizard text check (financeiro, pessoas)`, `cabecalho_normalizado text`, `chave_coluna text`, `criado_em timestamptz`. Unique `(tenant_id, tipo_wizard, cabecalho_normalizado)`. RLS staff-only, policy de UPDATE explícita desde o início (mesmo padrão já repetido 7× no projeto).

Nasce implícita — mesmo modelo de `regras_categorizacao` (ver `lib/conciliacao/regras.ts`, "regra nasce sozinha depois da primeira correção, sem tela dedicada de criação"): ao avançar da etapa "Colunas" com um mapeamento que o usuário editou manualmente (diferente do que a sugestão automática — rótulo ou sinônimo — já tinha preenchido), grava uma regra por cabeçalho corrigido. Nunca sobrescreve regra já existente pro mesmo cabeçalho.

**Prioridade de sugestão automática** (`sugerirMapeamentoColunas` ganha um parâmetro `regrasAprendidas`):
1. Regra aprendida do tenant pro cabeçalho normalizado exato daquele arquivo.
2. Rótulo oficial do campo.
3. Sinônimo curado.
4. Nenhuma sugestão — mapeamento manual, como hoje.

## Tela de Configurações

Nova página `configuracoes/mapeamento-colunas/`, espelhando `configuracoes/regras-categorizacao/` (mesmo componente `TabelaLista`, mesma estrutura de listar/editar/apagar regra). Lista as regras aprendidas dos dois wizards (financeiro e pessoas), agrupadas ou filtráveis por `tipo_wizard`.

## Fora de escopo

Sinônimo fuzzy/aproximado (decisão deliberada, ver acima). Memória de correspondência de valor único (ex. "Ampere Solucoes" → "Ampere Soluções") — já coberta pela correspondência fuzzy existente (`resolverCorrespondenciaPessoa`, limiar 0.85), que resolve a maioria dos casos com 1 clique; e por `regras_categorizacao` para categoria por fornecedor — não há necessidade de um terceiro mecanismo de memória para o mesmo problema. Ações em lote na etapa de Cadastros e contadores de linha — Fatia 3.

## Testes

- Cabeçalho "Vencimento" → mapeia automaticamente pra `data_vencimento`.
- Cabeçalho "Histórico" → mapeia automaticamente pra `descricao`.
- Cabeçalho fora de qualquer lista (ex. "Coluna XYZ") → continua sem sugestão, mapeamento manual.
- Usuário corrige manualmente "Referência" → `data_competencia` numa importação → próxima importação do mesmo tenant com cabeçalho "Referência" já vem pré-mapeada.
- Corrigir de novo pra um campo diferente → regra é atualizada, não duplicada (respeitando o unique).
- Teste de colisão: nenhum sinônimo aparece em duas entradas de `COLUNAS_TEMPLATE` (financeiro) nem em `COLUNAS_TEMPLATE_FIXAS` (pessoas).
- Tela de Configurações lista, edita e apaga regra corretamente, staff-only (cliente_portal sem acesso).
