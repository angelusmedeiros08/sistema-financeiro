# Produtos/Serviços + Vendas

## Contexto

Depois de fechar Conciliação Bancária, mapeamos os módulos da Conta Azul fora do domínio financeiro core (pesquisa via agente, cobrindo contaazul.com e ajuda.contaazul.com — ver memória `pesquisa_conta_azul_modulos_nao_financeiros`). O sistema hoje só conhece lançamento financeiro direto: não existe conceito de item vendável nem de "venda" como entidade — toda receita nasce como um evento financeiro solto, sem catálogo nem pedido por trás.

Produtos/Serviços + Vendas foi escolhido como próximo módulo por ser o hub do qual os demais gaps (Estoque, Ordem de Serviço, Contratos, Notas Fiscais) dependem, e por ser universalmente relevante — serve tanto PME de produto quanto de serviço, sem exigir a parceria fiscal (NF-e/NFS-e) que os outros módulos de venda carregam.

O terreno já existe: `pessoas` (Clientes/Fornecedores) com CRUD completo, `categorias_financeiras` com hierarquia, `formas_pagamento` como entidade própria, e principalmente `criarEventoFinanceiro()` — o motor de lançamento já maduro (rateio multi-categoria, centro de custo, parcelamento, recorrência, anexo, via RPC atômica `criar_evento_financeiro`).

## Escopo

**Dentro:**
- Cadastro de Produtos/Serviços, distinguindo `PRODUTO` (movimenta estoque, sem controle de saldo ainda) de `SERVICO`
- Venda com múltiplos itens (produto/serviço + quantidade + preço)
- Fluxo de Orçamento (proposta pré-venda) e Venda direta como a **mesma entidade** em status diferentes — orçamento aprovado vira venda sem duplicar dado
- Venda aprovada gera lançamento financeiro real, reaproveitando `criarEventoFinanceiro()` — parcelamento, forma de pagamento e pessoa (cliente) inclusos de graça
- Listagem de vendas com filtro de situação, listagem/cadastro de produtos e serviços

**Fora:**
- **Desconto no cabeçalho da venda** — preço final já vai no item; desconto se reflete ajustando `preco_unitario`. Evita redistribuir desconto proporcionalmente entre categorias financeiras diferentes.
- **Cancelamento de venda já aprovada** — uma vez `APROVADO`, o lançamento gerado é gerido pelas telas de estorno/cancelamento/renegociação de parcela que já existem em Contas a Receber; a venda não ganha uma ação própria de "desfazer".
- **Portal do cliente** — cliente não vê nem aprova orçamento pelo portal neste ciclo (Conta Azul tem isso, mas é expansão de escopo do portal, não deste módulo).
- **Estoque de fato** — `tipo = PRODUTO` só classifica; não há saldo, baixa de estoque ou bloqueio de venda sem saldo.
- **Notas Fiscais** — fora de escopo por exigir parceria com provedor terceirizado (custo recorrente, complexidade fiscal separada); `codigo_referencia` fica reservado no cadastro pra não exigir migration quando isso entrar.

## Modelo de dados

**`produtos_servicos`** (nova tabela): `id, tenant_id, nome, descricao, tipo (enum PRODUTO/SERVICO), preco_venda, categoria_financeira_id (FK — categoria de receita padrão do item), unidade_medida, codigo_referencia (texto livre, reservado pra NCM/código de serviço — não usado ainda), ativo, criado_em`.

**`vendas`** (nova tabela): `id, tenant_id, numero (sequencial por tenant), pessoa_id (FK cliente), status (enum RASCUNHO/ENVIADO/APROVADO/RECUSADO), data_emissao, forma_pagamento_id, numero_parcelas, primeiro_vencimento, observacoes, evento_financeiro_id (FK nullable — só preenchido na transição pra APROVADO), criado_por, criado_em`. `numero` é `max(numero) + 1` dentro do tenant, calculado no mesmo INSERT — aceita o mesmo risco residual de corrida já assumido em outros pontos do sistema (ex. `chave_dedup` da conciliação), não exige sequence dedicada nem trava.

**`venda_itens`** (nova tabela): `id, venda_id, produto_servico_id, descricao (snapshot do nome do produto no momento — não quebra histórico se o produto for renomeado depois), quantidade (numeric, aceita fração — serviço cobrado por hora, ex. 2.5), preco_unitario, valor_total (quantidade × preco_unitario)`.

RLS em todas as três: SELECT gated por `private.eh_staff_do_tenant` (mesmo padrão de `formas_pagamento`/`baixas` — dado comercial é staff-only, não visível ao `cliente_portal` neste ciclo), INSERT/UPDATE/DELETE gated por `private.usuario_tem_papel(tenant_id, ARRAY['admin','financeiro_senior','financeiro_junior','contador'])`.

## Máquina de estado e integração financeira

`status`: `RASCUNHO → ENVIADO → APROVADO | RECUSADO`.

Dois pontos de entrada pra mesma entidade:
- **Fluxo de orçamento**: cria em `RASCUNHO`, ação "Enviar orçamento" muda pra `ENVIADO`, depois "Aprovar" ou "Recusar".
- **Venda direta**: uma ação só ("Confirmar venda") já cria e transiciona pra `APROVADO` — sem passar por `RASCUNHO`/`ENVIADO`.

A transição pra `APROVADO` é o único gatilho financeiro, e é a única direção permitida (não existe "desaprovar" — ver seção Escopo/Fora):
1. Agrega `venda_itens` por `categoria_financeira_id` (soma quem cai na mesma categoria financeira em `LinhaCategoria[]`).
2. Chama `criarEventoFinanceiro()` com `tipo: RECEITA`, `descricao` (`Venda #<numero> — <nome do cliente>`), `valor_total` = soma de todos os itens, `categorias` = linhas agregadas, `pessoa_id` = `vendas.pessoa_id`, `numero_parcelas`/`primeiro_vencimento` do cabeçalho da venda, `criado_por`.
3. Grava o `evento_id` retornado em `vendas.evento_financeiro_id`.

Validação: `criarEventoFinanceiro()` já rejeita se a soma das categorias não bater com `valor_total` — como a agregação é feita a partir da soma exata dos itens, isso só falharia por bug de agregação, nunca por dado do usuário (não há desconto de cabeçalho pra desalinhar a soma).

`RECUSADO` só é alcançável a partir de `RASCUNHO`/`ENVIADO` — depois de `APROVADO`, o registro é histórico e só muda pelas telas de parcela já existentes.

## UI/Navegação

- **`/produtos-servicos`**: listagem + cadastro em página cheia (mesmo padrão de Categorias/Centro de Custo — nunca Dialog/Sheet), com quick-create inline via combobox na tela de venda (mesmo padrão já usado pra categoria/centro de custo no formulário de lançamento).
- **`/vendas`**: listagem com filtro de situação (Rascunho, Enviado, Aprovada, Recusada) — mesmo padrão de `TabelaEventos`/filtro de situação em Contas a Receber.
- **Tela de venda** (`/vendas/nova` e `/vendas/[id]`): página cheia — cabeçalho (cliente, data, forma de pagamento, parcelamento) + tabela dinâmica de itens (combobox de produto/serviço + quantidade + preço + subtotal calculado) + rodapé com total geral. Botões variam por status: `RASCUNHO` → "Salvar rascunho" / "Enviar orçamento" / "Confirmar venda" (pula direto pra `APROVADO`); `ENVIADO` → "Aprovar" / "Recusar"; `APROVADO`/`RECUSADO` → somente leitura.
- Novo item de sidebar **"Vendas"**, top-level, ao lado de Clientes/Fornecedores.

## Testes

- Criar produto tipo `SERVICO` e tipo `PRODUTO`, confirmar que o campo `tipo` persiste e aparece certo na listagem
- Criar venda com múltiplos itens de categorias financeiras diferentes, aprovar, e confirmar que o evento financeiro nasce com rateio correto (uma linha de categoria por categoria distinta, soma batendo)
- Criar venda com múltiplos itens da **mesma** categoria financeira, aprovar, e confirmar que agregam numa única linha de categoria (não duplica)
- Fluxo de orçamento completo: `RASCUNHO` → `ENVIADO` → `APROVADO`, confirmar que só a transição final grava `evento_financeiro_id`
- Fluxo de orçamento recusado: `RASCUNHO`/`ENVIADO` → `RECUSADO`, confirmar que nenhum evento financeiro é criado
- Venda direta: criação e aprovação numa ação só
- Venda aprovada com parcelamento (>1 parcela) gera as parcelas certas, visíveis em Contas a Receber
- RLS: `cliente_portal` não vê `produtos_servicos`/`vendas`/`venda_itens`; papel sem permissão de escrita não consegue criar/editar
- Regressão: DRE e Contas a Receber refletem a receita da venda aprovada sem nenhuma mudança no código desses relatórios
