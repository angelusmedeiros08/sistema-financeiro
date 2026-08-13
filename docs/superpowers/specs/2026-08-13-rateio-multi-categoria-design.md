# Design — Rateio multi-categoria por lançamento

## 1. Contexto

Primeiro de quatro ciclos de aprofundamento da Fase 1 (os outros três — ciclo de vida da parcela, recorrência+anexo, transferência entre contas+parcelamento avançado — ficam para specs próprios, nessa ordem). Hoje todo evento financeiro (receita ou despesa) só pode ter **1 categoria**. Tanto o Conta Azul quanto a planilha de referência (uma vez superada a limitação dela) suportam dividir um único lançamento entre várias categorias, com a soma validada contra o valor total — é um padrão de mercado estabelecido, não uma feature nova a inventar (`mapeamento-conta-azul-api.md` seção 3.2, `mapeamento-conta-azul-produto-ui.md` seção 2).

O schema já reserva exatamente isso: `rateio_categoria` existe desde a migration `004_camada_dominio`, com `evento_financeiro_id`, `categoria_id`, `valor`. Nenhuma tabela nova é necessária — o trabalho é schema (1 trigger novo) + aplicação.

**Decisão de produto**: seguindo o padrão do Conta Azul, R$ e % ficam sincronizados por linha (editar um recalcula o outro) — versão mais completa e mais fiel ao produto de referência, não a mais simples de implementar.

**Fora do escopo desta rodada, explicitamente**: rateio por **centro de custo** (o "rateio aninhado" do Conta Azul, onde cada categoria pode ainda se dividir entre centros de custo) fica para um ciclo próprio — hoje centro de custo não existe em nenhuma tela da aplicação (nem cadastro, nem campo no formulário), então habilitá-lo é um subsistema à parte, não uma extensão pequena deste.

## 2. Escopo desta fase

**Dentro do escopo:**
- Toggle "Dividir entre categorias" no formulário de receita/despesa (`EventoFinanceiroForm`), desligado por padrão — comportamento simples de hoje (1 categoria) fica inalterado quando desligado.
- Tabela de linhas (Categoria | R$ | %) quando ligado, com sincronização bidirecional R$↔% por linha, indicador de diferença até a soma bater com o valor total, adicionar/remover linha, sem duplicar categoria entre linhas.
- Validação em 3 camadas (cliente bloqueia submit, servidor revalida, banco garante via trigger deferred) — mesmo princípio já usado no ledger.
- Lançamento contábil com N+1 partidas (contrapartida + 1 por categoria) em vez de 2.
- Indicador na listagem (`/despesas`, `/receitas`) quando um evento tem mais de 1 categoria.

**Fora do escopo:**
- Rateio de centro de custo (ciclo próprio, depende de CRUD de centro de custo existir primeiro).
- Editar rateio de um lançamento já criado — nenhum fluxo de edição existe hoje para nenhum campo de evento financeiro (a imutabilidade do ledger torna "editar" = "estornar e recriar", que é escopo do próximo ciclo, ciclo de vida da parcela).
- Rateio percentual "por padrão" salvo como template reutilizável (o Conta Azul não tem isso de forma explícita, seria invenção nossa).

## 3. Modelo de dados

Nenhuma tabela nova. Um trigger novo:

### 3.1 Trava de integridade: soma do rateio = valor do evento

Constraint trigger *deferred* (mesmo padrão de `checar_partidas_balanceadas`) em `rateio_categoria`, disparando em `AFTER INSERT OR DELETE`, agrupando por `evento_financeiro_id`:

```sql
select sum(valor) from rateio_categoria where evento_financeiro_id = :id
-- deve bater exatamente com eventos_financeiros.valor_total
```

Sendo `DEFERRABLE INITIALLY DEFERRED`, a checagem só roda no COMMIT da transação — permite inserir as N linhas do rateio uma a uma (ou em lote) dentro da mesma transação de `criarEventoFinanceiro()` sem disparar falso-positivo no meio do caminho, exatamente como o trigger de partidas já faz hoje para o ledger.

Percentual **nunca é uma coluna** — é sempre `valor / valor_total`, calculado onde for exibido (formulário e, futuramente, qualquer relatório). Evita duas fontes de verdade para o mesmo número.

## 4. Fluxo de aplicação

### 4.1 Componente `RateioCategorias` (cliente)

O campo "Valor total" do `EventoFinanceiroForm` passa a ser controlado (hoje é um input nativo solto) — o novo componente precisa desse valor em tempo real para calcular percentuais.

- Toggle "Dividir entre categorias" (fora do fluxo normal, desligado por padrão) esconde o Select simples de categoria e mostra a tabela de linhas.
- Cada linha: Select de categoria (excluindo as já escolhidas em outras linhas) + Input R$ + Input % — editar um recalcula o outro daquela linha, arredondado a centavos/2 casas.
- Indicador de diferença ("Falta alocar R$X" / "Excedeu em R$Y") visível enquanto a soma não bate; submit desabilitado até zerar.
- Adicionar linha: nova linha vazia. Remover linha: mínimo de 2 linhas (abaixo disso não faz sentido ser "rateio" — o usuário desliga o toggle).
- No submit: linhas viram `[{categoria_id, valor}]` serializado em `<input type="hidden" name="rateio_json">`. Toggle desligado = nenhum campo desse tipo, comportamento idêntico ao atual.

### 4.2 Servidor — `criarEventoFinanceiro()`

Passa a aceitar **ou** uma categoria única (caminho atual, inalterado) **ou** uma lista de linhas de rateio:

1. Parseia `rateio_json` (se presente). Rejeita se malformado.
2. Revalida cada `categoria_id` contra o tenant do usuário autenticado e contra o `tipo` do evento (RECEITA/DESPESA) — nunca confia no que veio do cliente, mesmo padrão já usado para a categoria única hoje.
3. Confere a soma das linhas contra `valor_total` (mesma checagem do cliente, repetida no servidor por segurança).
4. Insere N linhas em `rateio_categoria` em vez de 1.
5. Monta o lançamento contábil com N+1 partidas: 1 contrapartida (Contas a Receber/Pagar, valor total) + 1 partida por categoria (seu valor), na mesma direção débito/crédito já usada hoje — só multiplicando o lado da categoria em vez de mudar a lógica.

Se qualquer categoria for inválida ou a soma não bater, nada é criado — mesma atomicidade já garantida pelo resto do domínio.

### 4.3 Ajuste na listagem

`TabelaEventos` hoje mostra só `rateio_categoria?.[0]?.categorias_financeiras?.nome`. Quando houver mais de 1 linha, mostra a primeira categoria + indicador (`"Aluguel +2"`), no mesmo espírito do indicador `(2x)` que parcelamento já usa.

## 5. Segurança

Mesma garantia de sempre: RLS + revalidação server-side de cada `categoria_id` contra o tenant são a fonte de verdade, não a validação de cliente (que é só UX). O trigger deferred no banco é a garantia final, independente de qual caminho de código tentou inserir o rateio.

## 6. Testes

- Trigger via `DO` block: soma correta passa; soma incorreta (falta ou sobra 1 centavo) é rejeitada; remover uma linha que quebra a soma também é rejeitado.
- Fluxo ponta a ponta real: criar despesa de R$1.000,00 rateada em 3 categorias (ex.: 500/300/200) → confirmar 4 partidas no ledger, cada uma com o valor certo, soma batendo → confirmar que a listagem mostra o indicador de múltiplas categorias.
- Regressão: fluxo simples (1 categoria, toggle desligado) continua idêntico ao comportamento atual.

## 7. Riscos e decisões em aberto

- **Arredondamento na sincronização R$↔%**: editar % e recalcular R$ pode gerar diferenças de 1 centavo por arredondamento acumulado em muitas linhas — o indicador de diferença cobre isso na prática (usuário ajusta manualmente a última linha até zerar), mas vale registrar que não há distribuição automática do resto.
- **Mínimo de 2 linhas**: decisão de manter o rateio sempre com pelo menos 2 categorias reais (abaixo disso é o modo simples) — revisar se um usuário real pedir "rateio de 1 categoria só temporariamente" por algum motivo de fluxo de trabalho.

## 8. Fora de escopo desta fase, explicitamente

Rateio de centro de custo, edição de rateio pós-criação, templates de rateio salvos, os outros três ciclos de aprofundamento da Fase 1 (ciclo de vida da parcela, recorrência+anexo, transferência entre contas+parcelamento avançado) e as fases maiores (portal do cliente, BI avançado, módulos comerciais).
