# Design — Fase 1 completa: ciclo financeiro (receita, contas a receber/pagar, baixa)

## 1. Contexto

A Fase 0 (fundação multi-tenant) e o esqueleto da Fase 1 (ledger de partida dobrada) já estão implementados e commitados. Mas só um fluxo foi construído ponta a ponta: **despesa**, sempre em aberto — nunca há um "pagamento" de verdade. O painel já expõe cards de "A receber" e "Contas a pagar" e o schema já reserva as tabelas `eventos_financeiros` / `parcelas` / `baixas` desde a migration `004_camada_dominio`, mas nenhuma delas tem uma tela ou ação além da criação de despesa.

Este spec cobre o que falta para a Fase 1 ser realmente completa, antes de abrir Fase 2 (portal do cliente) ou Fase 3 (BI avançado) — decisão tomada explicitamente porque as duas fases seguintes dependem de haver dado real e completo (receita, quitação, saldo em caixa que se move) para fazer sentido.

Baseado em três leituras já feitas: `mapeamento-conta-azul-api.md` (modelo Evento→Parcela→Baixa, enum de status, composição de valor da baixa), `mapeamento-conta-azul-produto-ui.md` (como isso vira formulário e tela) e `mapeamento-planilha-controle-financeiro.md` (lacunas do modelo mais simples que estamos superando: pagamento parcial, parcelamento, sinal explícito).

## 2. Escopo desta fase

**Dentro do escopo:**
- Criar receita (espelho de despesa, mesma forma, categorias tipo RECEITA).
- Parcelamento simples na criação (à vista ou N parcelas iguais, mensal).
- Cadastro rápido de pessoa (cliente/fornecedor) embutido no formulário de lançamento — opcional, não bloqueia o lançamento se não preenchido.
- Telas `/contas-a-receber` e `/contas-a-pagar`: lista de parcelas em aberto (todas as origens — despesa e receita), com status e situação de atraso.
- **Dar baixa**: ação central desta fase — registrar pagamento/recebimento de uma parcela, total ou parcial, com juros/multa/desconto/taxa, escolhendo a conta financeira de destino/origem. Gera o lançamento contábil correspondente e atualiza o status da parcela automaticamente.
- Ajuste do plano de contas padrão para receber os lançamentos financeiros acessórios de uma baixa (juros, multa, desconto).

**Fora do escopo** (fica para fases próprias, cada uma com seu spec):
- Conciliação bancária real / importação de extrato — depende da integração Pluggy (schema já reservado em `conexoes_bancarias`/`transacoes_importadas`, tabelas não criadas ainda).
- Cobrança/dunning (boleto, PIX, notificação) — território do módulo "Inadimplentes" do Conta Azul, adjacente ao que o escritório já faz manualmente com o AutoCobr.
- Renegociação formal (status `RENEGOCIADO`) e perda formal (status `PERDIDO`) — ficam como enum já suportado no banco, mas sem UI própria ainda; usuário não tem como chegar nesses estados nesta fase.
- Cancelamento de parcela (status `CANCELADO`) — mesma lógica: enum existe, ação não.
- Parcelamento com valores desiguais ou entrada + parcelas — só parcelas iguais nesta fase.
- Portal do cliente e BI avançado — fases próprias já registradas no spec anterior.

## 3. Modelo de dados

### 3.1 O que já existe e é reaproveitado sem mudança

`eventos_financeiros` (tipo RECEITA/DESPESA, pessoa_id opcional), `parcelas` (status rico, `conta_financeira_id`, `metodo_pagamento` já como colunas), `baixas` (`valor_pago`/`valor_juros`/`valor_multa`/`valor_desconto`/`valor_taxa`/`conta_financeira_id`/`lancamento_id`), `rateio_categoria`, `pessoas`, `contas_financeiras` (já com `conta_contabil_id` próprio — importante: a baixa deve usar o `conta_contabil_id` **da conta financeira escolhida**, não uma constante fixa de "Caixa", para já funcionar corretamente se o tenant cadastrar uma segunda conta bancária). Nenhuma migration de schema é necessária para essas tabelas — o trabalho desta fase é quase todo camada de aplicação.

### 3.2 Plano de contas padrão — 4 contas novas

Hoje `CONTAS_CONTABEIS_PADRAO` (`src/lib/contabil/plano-padrao.ts`) só tem Caixa e Bancos, Contas a Receber, Contas a Pagar, Receitas, Despesas. Uma baixa com juros/multa/desconto precisa de contrapartida contábil própria — não pode ser absorvida pela conta genérica de Receitas/Despesas sem perder rastreabilidade (e é exatamente o que o Conta Azul resolve com seus ~13 "tipos de operação especiais" pré-mapeados). Adicionar, com os mesmos códigos de convenção interna (`x.y`):

| Código | Nome | Tipo | Natureza | Quando é usada |
|---|---|---|---|---|
| `3.2` | Receitas Financeiras | RECEITA | CREDORA | Juros e multa recebidos numa baixa de conta a receber |
| `4.2` | Despesas Financeiras | DESPESA | DEVEDORA | Juros e multa pagos numa baixa de conta a pagar |
| `3.3` | Descontos Obtidos | RECEITA | CREDORA | Desconto que a empresa recebe ao pagar uma despesa (ex.: antecipação) |
| `4.3` | Descontos Concedidos | DESPESA | DEVEDORA | Desconto que a empresa concede a um cliente numa baixa de receita |

Provisionadas no cadastro do tenant junto com as demais (mesma função `cadastrar()`), sistema=true.

### 3.3 Status da parcela: derivado por trigger, não por ação manual

Uma parcela pode receber **múltiplas baixas** até ser quitada (pagamento parcial + complemento depois). Em vez de cada ação de aplicação calcular e gravar o status manualmente (repetição de lógica, risco de ficar inconsistente se dois fluxos diferentes derem baixa), um trigger `AFTER INSERT ON baixas` recalcula o status da parcela pai:

```
soma_paga = SUM(baixas.valor_pago) WHERE parcela_id = NEW.parcela_id
IF soma_paga >= parcelas.valor  → status = QUITADO
ELSIF soma_paga > 0              → status = RECEBIDO_PARCIAL
```

Mesmo padrão de rigor já usado no ledger (`checar_partidas_balanceadas`, `bloquear_alteracao_ledger`) — invariante garantida pelo banco, não pela boa vontade do código que chama.

**`ATRASADO` não é um status gravado** — é um estado derivado em tempo de leitura (`status = PENDENTE AND data_vencimento < hoje`), calculado nas queries de `/contas-a-receber`, `/contas-a-pagar` e no painel. Evita depender de um job agendado para "promover" parcelas a atrasadas, e nunca fica desatualizado.

### 3.4 Trava de integridade: baixa não pode exceder o saldo residual da parcela

Constraint trigger (`BEFORE INSERT ON baixas`, mesma família dos triggers já existentes) rejeitando `valor_pago` que, somado às baixas anteriores da mesma parcela, ultrapasse `parcelas.valor` — evita pagamento duplicado ou digitação errada virar saldo negativo silencioso. Erro específico e claro ("valor pago excede o saldo em aberto da parcela"), não uma falha genérica.

## 4. Fluxos de aplicação

### 4.1 Criar receita

Espelho exato de `criarDespesa()` (`src/app/(app)/despesas/actions.ts`), com o lançamento contábil invertido: **Débito** na conta contábil ligada à categoria de receita, **Crédito** em Contas a Receber (em vez de Débito Despesas / Crédito Contas a Pagar). Reaproveita a mesma `registrarLancamento()`. UI em `/receitas`, mesmo padrão de tela que `/despesas` (formulário + tabela), com categorias filtradas por `tipo = RECEITA`.

### 4.2 Parcelamento simples

Campo "Parcelas" no formulário (1 = à vista, padrão). Se N > 1: `valor_total / N` (arredondamento: a diferença de centavos por divisão inexata vai inteira na última parcela, nunca distribuída silenciosamente errada), `data_vencimento` de cada parcela = vencimento informado + (N-1) meses, `numero` de 1 a N. O lançamento contábil continua **um único lançamento** para o evento inteiro (débito/crédito no valor total) — parcelamento é sobre o cronograma de pagamento, não sobre o reconhecimento contábil, mesma decisão que o Conta Azul toma (`condicao_pagamento.parcelas` não gera N lançamentos).

### 4.3 Cadastro rápido de pessoa

Campo "Cliente"/"Fornecedor" nos formulários de receita/despesa: combobox com busca + opção "criar novo" inline (nome + CPF/CNPJ opcional), gravando em `pessoas` com `perfil` (`CLIENTE` para receita, `FORNECEDOR` para despesa) e vinculando `eventos_financeiros.pessoa_id`. Campo opcional — não bloqueia o lançamento. Sem isso, `/contas-a-receber` e `/contas-a-pagar` não conseguem agrupar "quanto devo a quem", que é um dos relatórios mais usados tanto na planilha quanto no Conta Azul (posição de contas por cliente/fornecedor, base de aging por participante).

### 4.4 Dar baixa — o núcleo desta fase

Nova função de domínio `src/lib/contabil/baixa.ts`, `registrarBaixa()`, chamada por uma server action a partir de `/contas-a-receber` e `/contas-a-pagar`:

**Entrada**: `parcela_id`, `data_pagamento`, `valor_pago` (principal abatido), `valor_juros`, `valor_multa`, `valor_desconto`, `valor_taxa` (todos opcionais, default 0), `conta_financeira_id`, `metodo_pagamento`.

**Lógica**:
1. Busca a parcela (com tenant scoping) e o evento financeiro pai (para saber se é RECEITA ou DESPESA).
2. Resolve o `conta_contabil_id` da conta financeira escolhida (não uma constante fixa — ver 3.1).
3. Monta as partidas do lançamento (`origem: MANUAL`, `referencia_id: parcela.id`) conforme o tipo:

   **Baixa de conta a receber (evento RECEITA):**
   - Débito Caixa/Conta financeira escolhida, valor = `valor_pago + valor_juros + valor_multa - valor_desconto + valor_taxa` (o que efetivamente entra)
   - Crédito Contas a Receber, valor = `valor_pago` (abate o principal)
   - Crédito Receitas Financeiras, valor = `valor_juros + valor_multa` (se > 0)
   - Débito Descontos Concedidos, valor = `valor_desconto` (se > 0)
   - Crédito Caixa (taxa), valor = `valor_taxa` (se > 0 — sai como custo da própria movimentação)

   **Baixa de conta a pagar (evento DESPESA):** espelhado — Crédito Caixa pelo líquido, Débito Contas a Pagar pelo principal, Débito Despesas Financeiras (juros/multa), Crédito Descontos Obtidos (desconto), Débito Caixa (taxa).

   Sempre débito = crédito no total — a mesma invariante do banco (`checar_partidas_balanceadas`) valida isso de qualquer forma; a função só precisa montar as partidas certas.
4. Insere o lançamento + partidas via `registrarLancamento()` (já existente, reaproveitado sem mudança).
5. Insere a linha em `baixas`, com `lancamento_id` apontando pro lançamento recém-criado.
6. O trigger de 3.3 recalcula o status da parcela — a função de aplicação não escreve status diretamente.

Toda a operação roda como uma única transação lógica (mesmo padrão de atomicidade do resto do ledger — se qualquer parte falhar, nada fica persistido parcialmente).

### 4.5 Telas novas

- `/receitas` — mesmo padrão visual de `/despesas` (Direção Signal já aplicada), formulário + tabela.
- `/contas-a-receber`, `/contas-a-pagar` — tabela de parcelas em aberto (status ≠ QUITADO/CANCELADO), colunas: pessoa, descrição, vencimento, situação (badge: Pendente / Atrasado — derivado / Parcial), valor em aberto. Ação "Dar baixa" abre um `Sheet` (já usado no shell mobile) com o formulário de composição de valor.
- Substituem os itens "em breve" na sidebar por links reais — os 4 nav items hoje desabilitados (`Contas a receber`, `Contas a pagar`) ficam ativos; `Relatórios` e `Configurações` continuam "em breve" (ficam para Fase 3 e além).

## 5. Segurança

Mesmas regras já em vigor (`seguranca-e-escalabilidade.md`), aplicadas aos novos fluxos:
- `registrarBaixa()` sempre re-busca `parcela`/`conta_financeira` escopado por `tenant_id` do usuário autenticado no servidor — nunca confia em ID vindo do formulário sem revalidar posse (mesmo padrão já usado em `criarDespesa()` para `categoria_id`).
- RLS + a nova constraint trigger (3.4) são a garantia real contra baixa inválida — validação client-side é só UX, nunca a fonte de verdade.
- Nenhuma policy de DELETE nova — baixa é lançamento financeiro, mesma regra de imutabilidade do resto do ledger (estorno é lançamento reverso, não exclusão; estorno de baixa fica fora do escopo desta fase).

## 6. Escalabilidade

Nenhuma mudança em relação ao que já foi decidido — os novos fluxos escrevem nas mesmas tabelas já indexadas por `tenant_id` + data. Trigger de status em `baixas` é `AFTER INSERT`, custo O(baixas da parcela), sempre pequeno (parcelamento não gera centenas de baixas por parcela na prática).

## 7. Tratamento de erro

- Baixa que excede saldo residual: erro específico e claro pro usuário (3.4), nunca falha genérica.
- Falha em qualquer etapa de `registrarBaixa()` (lançamento, partidas, ou insert em `baixas`): nada fica persistido parcialmente — mesmo padrão de atomicidade do resto do domínio.
- Pessoa criada inline que falha (ex. CPF/CNPJ duplicado): erro isolado, não derruba o lançamento inteiro — usuário pode prosseguir sem pessoa e associar depois.

## 8. Testes

- Teste de invariante: soma de `baixas.valor_pago` nunca excede `parcelas.valor` (a constraint trigger rejeita — testar que rejeita mesmo).
- Teste de transição de status: baixa parcial → `RECEBIDO_PARCIAL`; baixa complementar até cobrir o valor → `QUITADO`.
- Teste de lançamento com 5 partidas (baixa com juros + multa + desconto + taxa simultâneos) — débito = crédito continua valendo com N partidas, não só 2.
- Caminho crítico ponta a ponta: criar receita parcelada em 3x → dar baixa parcial na 1ª parcela → dar baixa complementar → parcela quitada → saldo em caixa e resultado do mês refletem corretamente no painel.

## 9. Riscos e decisões em aberto

- **Arredondamento de parcelamento**: decisão registrada (resto de centavos vai inteiro na última parcela) — é a convenção mais comum, mas vale confirmar se bate com o que contadores esperam antes de considerar fechado.
- **Taxa (`valor_taxa`) sempre sai do caixa**: modelagem simplificada (assume que toda taxa é custo, nunca receita) — suficiente para esta fase, pode precisar de revisão quando integração de meios de pagamento (Pluggy/gateway) entrar.
- **Reversão de baixa**: não desenhada nesta fase (ver §2, fora de escopo) — se aparecer necessidade real cedo (usuário erra uma baixa), pode furar a fila e virar spec própria antes do previsto.

## 10. Fora de escopo desta fase, explicitamente

Conciliação bancária/Pluggy, cobrança/dunning, renegociação e cancelamento formais de parcela, estorno de baixa, parcelamento com valores desiguais, portal do cliente, BI avançado, módulos comerciais — cada um fica para seu próprio ciclo de design.
