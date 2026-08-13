# Design — Ciclo de vida da parcela (cancelamento, renegociação, estorno)

## 1. Contexto

Terceiro dos quatro ciclos de aprofundamento da Fase 1 (rateio multi-categoria e centro de custo já commitados). `status_parcela` já tem `CANCELADO` e `RENEGOCIADO` no enum desde a fundação, e `origem_lancamento` já tem `ESTORNO` — mas nenhum dos três tem lógica de aplicação ou UI. Hoje uma parcela só sabe ir de `PENDENTE` para `RECEBIDO_PARCIAL`/`QUITADO` via baixa — não há como corrigir um erro, negociar um prazo, ou cancelar algo lançado por engano.

Decisões de design apoiadas nos sistemas de referência (Conta Azul, e a mesma disciplina contábil de partida dobrada que fundamenta o projeto inteiro): lançamentos e partidas são imutáveis (triggers já bloqueiam UPDATE/DELETE) — "corrigir" nunca edita, sempre reverte com um lançamento novo. É o mesmo princípio de qualquer ERP financeiro sério (Conta Azul, Omie, SAP): o livro-razão nunca mente sobre o que aconteceu, só registra que algo foi desfeito depois.

## 2. Escopo desta fase

**Dentro do escopo:**
- Cancelamento de parcela — só para parcelas sem nenhuma baixa válida (dinheiro nunca se moveu).
- Renegociação — muda **só a data de vencimento**, com histórico completo (tabela própria). Não muda valor (ver §3.3 para o porquê).
- Estorno de baixa — reversão total (não parcial) de uma baixa específica, via lançamento contábil reverso, nunca editando o que já existe.
- Histórico de baixas por parcela (pré-requisito do estorno — hoje não existe nenhuma visualização disso).
- Filtro de situação em `/contas-a-receber` e `/contas-a-pagar` (Em aberto | Quitados | Cancelados | Todos) — sem ele, uma parcela já quitada não aparece em lugar nenhum pra acessar seu histórico.

**Fora do escopo:**
- Renegociação de valor (a diferença negociada entra como juros/desconto no momento da baixa, caminho que já existe).
- Estorno parcial do valor de uma baixa.
- Reversão de um cancelamento ou de uma renegociação (ambos só mudam status/data — se for engano, cancela/renegocia de novo com o valor certo).
- Os outros ciclos de aprofundamento (recorrência+anexo, transferência entre contas+parcelamento avançado), Fase 2 e Fase 3.

## 3. Modelo de dados

### 3.1 Estorno de baixa

`baixas` ganha `estornado_em timestamptz null` (null = baixa válida). Os dois pontos que somam baixas passam a filtrar por essa coluna:
- `atualizar_status_parcela()` (trigger existente) — soma só `WHERE estornado_em IS NULL`.
- Qualquer query de aplicação que calcula saldo residual (contas-a-receber/pagar, painel).

Rejeitamos guardar o estorno como uma segunda linha de `baixas` com valor negativo — `baixas_valor_pago_check` já exige `valor_pago > 0` de propósito, e forçar isso a aceitar negativo confundiria a semântica de "quanto foi pago" no resto do sistema. A reversão de verdade mora no ledger (lançamento novo, `origem: ESTORNO`, `estornado_de_id` apontando pro lançamento original, partidas com débito/crédito invertidos) — `baixas.estornado_em` é só o marcador de "essa aqui não conta mais" pro cálculo de status.

Trava contra estornar a mesma baixa duas vezes: o `UPDATE ... WHERE id = :id AND estornado_em IS NULL` é atomicamente seguro por si — se não afetar nenhuma linha, a aplicação sabe que já foi estornada (ou não existe) e retorna erro, sem precisar de trigger extra.

### 3.2 Cancelamento

Sem tabela nova. `parcelas` ganha `motivo_cancelamento text null`. Trigger novo `BEFORE UPDATE ON parcelas`: se a transição for para `CANCELADO`, rejeita se existir qualquer baixa não-estornada para aquela parcela — garantia real no banco, não só checagem de aplicação (mesmo padrão de rigor dos ciclos anteriores).

### 3.3 Renegociação — só data, nunca valor

Se a renegociação pudesse mudar `parcelas.valor`, a soma das parcelas de um evento deixaria de bater com `eventos_financeiros.valor_total` — hoje essa igualdade só é garantida no momento da criação (`calcularParcelas`), sem trigger contínuo protegendo-a depois. Mudar o valor de uma parcela isolada também reabriria, na prática, um reconhecimento contábil que já aconteceu no regime de competência. A saída correta — e a mesma que a baixa já usa — é: qualquer acréscimo (juros por atraso) ou redução (desconto pra fechar acordo) combinado na renegociação vira `valor_juros`/`valor_desconto` no momento em que a parcela for efetivamente baixada, não uma edição do principal.

Tabela nova `renegociacoes`: `id, tenant_id, parcela_id, data_vencimento_anterior, data_vencimento_nova, motivo, criado_por, criado_em`. Cada renegociação é uma linha nova — nunca sobrescreve a anterior, então dá pra responder "quantas vezes e por quê" essa parcela mudou de data. `parcelas.data_vencimento` é atualizada e o status vira `RENEGOCIADO`.

Permitida para qualquer parcela que não esteja `QUITADO` ou `CANCELADO` (inclusive uma já `RENEGOCIADO` antes — só acumula mais uma linha de histórico).

## 4. Fluxos de aplicação

Três funções novas em `src/lib/contabil/`:

- **`estornarBaixa(supabase, { baixa_id, tenant_id, criado_por })`**: busca a baixa e seu lançamento original (tenant-scoped), rejeita se já estornada ou sem `lancamento_id`. Cria o lançamento reverso com as partidas originais invertidas (mesmas contas, mesmos valores, débito↔crédito trocados), depois marca `baixas.estornado_em = now()`. O trigger de status recalcula a parcela automaticamente a partir da nova soma (agora sem essa baixa).
- **`cancelarParcela(supabase, { parcela_id, tenant_id, motivo })`**: `UPDATE parcelas SET status = 'CANCELADO', motivo_cancelamento = motivo` — a trava real é o trigger do banco (§3.2), a aplicação só propaga o erro dele se disparar.
- **`renegociarParcela(supabase, { parcela_id, tenant_id, nova_data_vencimento, motivo, criado_por })`**: lê a `data_vencimento` atual da parcela (vira `data_vencimento_anterior`), insere a linha em `renegociacoes`, depois atualiza `parcelas.data_vencimento` e `status = 'RENEGOCIADO'`.

Todas seguem o mesmo princípio já estabelecido: nunca confiam em nada vindo do cliente sem revalidar contra o tenant do usuário autenticado.

## 5. UI

### 5.1 Filtro de situação

`/contas-a-receber` e `/contas-a-pagar` ganham um filtro (Em aberto | Quitados | Cancelados | Todos), mesmo padrão já usado em Centros de Custo — sem isso, uma parcela quitada (o caso mais comum de precisar estornar algo) não aparece em lugar nenhum.

### 5.2 Menu de ações por linha

A coluna "Ação" deixa de ser só o botão "Dar baixa" e vira um menu (`DropdownMenu` do shadcn), com cada item aparecendo só quando faz sentido pro estado daquela parcela:
- **Dar baixa** — parcela `PENDENTE`/`RECEBIDO_PARCIAL` (como já é hoje).
- **Renegociar** — qualquer parcela que não seja `QUITADO`/`CANCELADO`.
- **Cancelar** — só `PENDENTE` sem nenhuma baixa válida.
- **Ver histórico** — qualquer parcela que já tenha ao menos 1 baixa (válida ou estornada).

### 5.3 Sheet de histórico de baixas

Mesmo padrão visual do `BaixaSheet`: lista as baixas da parcela (data, valor pago, composição de juros/multa/desconto/taxa, conta financeira), com uma badge "Estornada" nas que já foram revertidas, e um botão "Estornar" nas que ainda não foram.

### 5.4 Sheet de renegociação

Formulário simples: nova data de vencimento + motivo (texto livre, obrigatório) — mesmo padrão de Sheet já usado.

## 6. Segurança

Mesmo padrão de sempre: RLS + revalidação server-side de tenant em cada função. As duas travas reais (estorno duplicado, cancelamento com baixa válida) vivem no banco, não só na aplicação.

## 7. Testes

- Trigger de cancelamento: `DO` block rejeitando `UPDATE ... SET status='CANCELADO'` numa parcela com baixa válida; aceitando numa parcela limpa.
- Estorno via `DO` block: confere que o lançamento reverso bate exatamente com o original (mesmas contas, valores invertidos), que a baixa original fica marcada, e que o status da parcela volta pro que era antes daquela baixa.
- Fluxo real ponta a ponta: criar despesa → dar baixa parcial → estornar → parcela volta pra `PENDENTE` com saldo residual igual ao original → dar baixa de novo, valor certo.
- Renegociar: muda a data, status vira `RENEGOCIADO`, linha aparece em `renegociacoes` com a data anterior correta.
- Cancelar: parcela nova sem baixa cancela normalmente; tentar cancelar uma com baixa (mesmo parcial) é rejeitado com mensagem clara.
- Regressão: fluxo de baixa normal (sem estorno) continua idêntico ao de antes.

## 8. Riscos e decisões em aberto

- **Renegociação sem mudança de valor** é uma simplificação deliberada frente ao Conta Azul (que modela `RenegociacaoContaAReceber` de forma mais rica) — se aparecer necessidade real de renegociar valor formalmente (não via juros/desconto na baixa), isso vira spec próprio depois, com o trabalho extra de manter `soma(parcelas) = valor_total` sob controle.

## 9. Fora de escopo desta fase, explicitamente

Renegociação de valor, estorno parcial, reversão de cancelamento/renegociação, recorrência+anexo, transferência entre contas+parcelamento avançado, Fase 2 (portal do cliente), Fase 3 (BI avançado).
