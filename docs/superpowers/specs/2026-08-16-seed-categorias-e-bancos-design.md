# Seed de Categorias + Combobox de Banco

## 1. Contexto

Início de um ciclo de polimento/auditoria dos módulos já existentes (prioridade escolhida pelo usuário sobre reestruturar a sidebar ou construir módulos novos — ver `docs/superpowers/specs/2026-08-15-forma-pagamento-e-central-indicadores-design.md` pro ciclo anterior, que fechou a Central de Indicadores ciclo 1).

Achado concreto (checado no código, não suposição): um tenant novo nasce com **só 2 categorias financeiras** — "Receita Geral" e "Despesa Geral" (`(auth)/actions.ts::cadastrar()`) — e o campo **Banco** da Conta Financeira é texto livre sem nenhuma lista por trás (`Input` com placeholder "Ex.: Banco do Brasil", `nova-conta-form.tsx`), apesar do próprio placeholder sugerir que deveria ser uma lista. O usuário quer o mesmo padrão de "lista pronta pra escolher" que já existe pra Forma de Pagamento (4 itens padrão) estendido pra esses dois pontos.

Pesquisa que fundamenta a lista de categorias (nenhuma nova pesquisa externa necessária além da já feita nesta sessão):
- **Conta Azul** (central de ajuda, consultada agora): categorias nascem pré-cadastradas, numeração real (Receita 3.01/3.02/3.03, Despesa 4.01+), hierarquia de **no máximo 2 níveis**. Exemplo documentado pra "Empresa de Serviços": Custo do serviço (salários da equipe técnica, ferramentas/softwares, subcontratações) → Despesas comerciais (marketing, comissões) → Despesas administrativas (aluguel, salários administrativos, contabilidade, internet/telefone) → Despesas financeiras (tarifas bancárias, juros).
- **Planilha de referência** (`mapeamento-planilha-controle-financeiro.md`, Seção 9, extração célula a célula): plano de contas com 30 grupos e mais de 100 sub-itens reais nomeados — fonte dos nomes específicos usados abaixo (ex. "Despesas Gerais" tem Aluguel, Honorários Contábeis, Telefone/Internet, Material de Escritório, entre outros).

**Achado de arquitetura durante o desenho**: categoria não se auto-vincula a uma linha de DRE — isso é feito via `linha_dre_categorias`, hoje só populado manualmente em Configurações → Estrutura de DRE (ou pelo signup, pras 2 categorias atuais). Se o seed criar só as categorias sem os vínculos, elas nascem "não classificadas" no DRE — pior que a situação atual, onde ao menos as 2 categorias existentes aparecem corretamente na cascata. O seed precisa criar categoria **e** vínculo de DRE juntos, na mesma transação de signup.

## 2. Escopo

**Dentro:**
- Expandir o provisionamento de categorias no signup (`(auth)/actions.ts::cadastrar()`) de 2 para ~28 categorias, organizadas em grupos com subcategoria (`categoria_pai_id`, já suportado), cada uma vinculada à linha de DRE certa via `linha_dre_categorias`.
- Trocar o `<Input name="banco">` livre em `nova-conta-form.tsx` por um combobox com sugestão dos ~18 principais bancos/fintechs atuantes no mercado PME brasileiro — sem criar tabela nova, sem quick-create: o campo continua sendo a mesma coluna de texto livre (`contas_financeiras.banco`), o combobox só melhora a UX de preenchimento (sugestão + aceita qualquer texto digitado que não esteja na lista).
- Migration de backfill pros 3 tenants de teste existentes (mesmo padrão idempotente de `032`/`036`/`037`/`040`).

**Fora:**
- Plano de contas contábil (`contas_contabeis`) não muda — todas as categorias novas usam as mesmas 2 contas genéricas que já existem (Receitas Operacionais / Despesas Operacionais). Decisão já validada com o usuário: só a camada de Categoria fica mais rica, não a camada contábil de sistema.
- Nenhuma categoria/subcategoria específica de indústria ou comércio (matéria-prima, estoque, custo de mercadoria vendida) — produto é genérico PME de serviço, não vertical de venda de produto físico.
- Código FEBRABAN por banco (só nome) — não há necessidade de integração bancária que justifique o código agora.
- Qualquer alteração em Forma de Pagamento (já resolvida no ciclo anterior) ou Centro de Custo (nasce vazio por design, mesmo padrão do Conta Azul).

## 3. Categorias — lista completa

Todas com `categoria_pai_id null` exceto onde indicado. Todas as `RECEITA` usam a conta contábil "Receitas Operacionais" (`CODIGO_RECEITAS_GERAL`); todas as `DESPESA` usam "Despesas Operacionais" (`CODIGO_DESPESAS_GERAL`) — mesmas 2 contas já usadas pelas categorias atuais.

| Categoria | Tipo | `eh_custo_fixo` | Subcategoria de | Linha de DRE (`ordem`) |
|---|---|---|---|---|
| Receita de Serviços | RECEITA | — | — | 1 (Receitas operacionais) |
| Receita de Vendas | RECEITA | — | — | 1 |
| Comissões Recebidas | RECEITA | — | — | 1 |
| Juros Recebidos | RECEITA | — | — | 14 (Receitas não operacionais) |
| Rendimento sobre Aplicações | RECEITA | — | — | 14 |
| Outras Receitas | RECEITA | — | — | 14 |
| Comissões sobre Vendas | DESPESA | false | — | 6 (Despesas variáveis) |
| Marketing e Publicidade | DESPESA | false | — | 6 |
| Taxas de Cartão e Maquininha | DESPESA | false | — | 6 |
| Fretes e Logística | DESPESA | false | — | 6 |
| Subcontratações e Terceirizados | DESPESA | false | — | 6 |
| Despesas com Pessoal | DESPESA | true | — | 10 (Despesas fixas) |
| Salários e Ordenados | DESPESA | true | Despesas com Pessoal | 10 |
| Pró-labore | DESPESA | true | Despesas com Pessoal | 10 |
| INSS e FGTS | DESPESA | true | Despesas com Pessoal | 10 |
| Benefícios (VT/VR/Plano de Saúde) | DESPESA | true | Despesas com Pessoal | 10 |
| Despesas Administrativas | DESPESA | true | — | 10 |
| Aluguel | DESPESA | true | Despesas Administrativas | 10 |
| Água, Luz e Internet | DESPESA | true | Despesas Administrativas | 10 |
| Material de Escritório | DESPESA | true | Despesas Administrativas | 10 |
| Honorários Contábeis | DESPESA | true | Despesas Administrativas | 10 |
| Softwares e Assinaturas | DESPESA | true | Despesas Administrativas | 10 |
| Tarifas Bancárias | DESPESA | true | — | 10 |
| Seguros | DESPESA | true | — | 10 |
| Manutenção e Limpeza | DESPESA | true | — | 10 |
| Multas e Penalidades | DESPESA | false | — | 16 (Despesas não operacionais) |
| Outras Despesas | DESPESA | false | — | 16 |
| IRPJ e CSLL | DESPESA | false | — | 19 (Tributos sobre o lucro) |

Total: 6 categorias de receita + 22 de despesa = 28. `eh_custo_fixo` em receita não se aplica (coluna só é lida pelo Ponto de Equilíbrio, que só olha despesa) — fica `false` por padrão do schema, sem necessidade de setar explicitamente.

## 4. Servidor

`(auth)/actions.ts::cadastrar()`: depois do bloco que já cria `linhasDreCriadas` (a variável `linhasDreCriadas` já existe no fluxo, com `id`/`ordem` de cada linha) e antes de criar `contas_financeiras`/`formas_pagamento`:

1. Substituir o insert atual de 2 categorias por um insert das 28 linhas da Seção 3, usando `contaReceitas`/`contaDespesas` (já resolvidos no fluxo) como `conta_contabil_id`.
2. Resolver `categoria_pai_id` das subcategorias: como `categoria_pai_id` referencia o `id` gerado no mesmo insert, o insert das 2 categorias-pai que têm filhas ("Despesas com Pessoal", "Despesas Administrativas") precisa rodar **antes** do insert das subcategorias e das outras 26 categorias sem filhos, numa chamada `.insert(...).select("id, nome")` separada que dá o `id` a usar como `categoria_pai_id` na chamada seguinte.
3. Montar `linha_dre_categorias` a partir do mapa `ordem → id` que `linhasDreCriadas` já dá (`linhasDreCriadas.find(l => l.ordem === N)!.id`), um insert só com as 28 linhas categoria→linha.

Nenhuma função nova em `lib/` — é só provisionamento inline, mesmo padrão já usado pro resto do onboarding nesse arquivo.

## 5. UI — Combobox de Banco

Novo componente `components/formularios/banco-combobox.tsx`, mais simples que os combobox de quick-create existentes (Categoria/Centro de Custo/Forma de Pagamento) porque não cria nenhuma entidade — só preenche um campo de texto:

- Lista constante `BANCOS_BRASILEIROS` (18 nomes: Banco do Brasil, Bradesco, Caixa Econômica Federal, Itaú Unibanco, Santander, Nubank, Inter, C6 Bank, BTG Pactual, Banco Safra, Sicoob, Sicredi, XP Investimentos, PagBank, Mercado Pago, Stone, Banco Original, Banrisul), em `lib/bancos-brasileiros.ts`.
- Popover com busca (mesmo `Command`/`CommandInput` dos outros combobox) filtrando a lista constante.
- Ao digitar algo que não bate com nenhum item da lista, um item "Usar &quot;{busca}&quot;" no fim da lista grava o texto digitado direto — sem chamada ao servidor, sem `hidden input` de nome-novo, é só `<input type="text" name="banco" value={valorEscolhido} />` (hidden) atualizado pelo `onSelect`.
- `nova-conta-form.tsx` troca o `<Input id="banco">` por `<BancoCombobox />`.

## 6. Migration

Backfill idempotente pros 3 tenants de teste (mesmo padrão de `036`/`040`): só insere as categorias/vínculos novos pra tenant que ainda não tiver mais que as 2 categorias originais (evita duplicar em tenant que já foi usado pra testar categoria manualmente nesta sessão).

## 7. Testes

- Tenant novo (cadastro real) nasce com as 28 categorias, hierarquia correta (subcategoria aparece indentada em Configurações → Categorias), e o DRE do mês corrente mostra todas as linhas FOLHA com pelo menos uma categoria vinculada (nenhuma "não classificada").
- Lançamento de despesa usando uma subcategoria nova (ex. "Aluguel") gera partida balanceada e aparece na linha "Despesas fixas" do DRE.
- Combobox de Banco: selecionar um item da lista grava o nome exato; digitar um banco fora da lista (ex. cooperativa de crédito regional) grava o texto digitado sem erro.
- Regressão: tenants de teste já existentes (com categorias e vínculos manuais desta sessão) não têm categoria duplicada depois do backfill.
