# Plano de implementação: Checkout, assinatura e provisionamento de tenant

**Spec:** [docs/superpowers/specs/2026-08-23-checkout-assinatura-provisionamento-design.md](../specs/2026-08-23-checkout-assinatura-provisionamento-design.md)
**Data:** 2026-08-23 (revisado: checkout hospedado do Asaas em vez de tela de cartão própria — evita escopo PCI SAQ-D)

Ordem por dependência: schema primeiro, depois o cliente Asaas isolado (testável sozinho, sem UI), depois a extração do provisionamento (refatoração pura), só então a rota pública, a página de retorno e o webhook — que juntos formam o único caminho real de provisionamento agora que o checkout é hospedado —, e por último o ciclo de vida (e-mail, middleware, tela de bloqueio) e o teste ponta a ponta. Cada fatia de segurança (rate limit, comparação em tempo constante, tratamento de payload como entrada não confiável) está descrita dentro da fatia a que pertence, não deixada pra depois.

## Fatia 1 — Schema: colunas de assinatura + tabela de eventos [x] concluída

Migration nova: `tenants` ganha `asaas_customer_id text`, `asaas_subscription_id text`, `status_assinatura text default 'trial'` (constraint check nos 4 valores: trial/ativo/inadimplente/cancelado), `trial_termina_em timestamptz`. Tabela nova `eventos_pagamento_processados` (`id text primary key`, `tipo text`, `processado_em timestamptz default now()`). RLS em ambas: nenhuma policy de INSERT/UPDATE para `authenticated` (só `service_role` escreve, mesmo padrão de `tenants` hoje). Aplicar via Supabase MCP, documentar em `docs/schema-aplicado-supabase.md`, regenerar `database.types.ts`.

_Depende de:_ nada.
_Teste:_ `select` nas duas tabelas confirmando as colunas/constraints; tentar inserir em `eventos_pagamento_processados` com o client anônimo e confirmar que RLS bloqueia.

## Fatia 2 — Cliente Asaas (`lib/asaas/`)

Funções puras, sem UI: `criarCliente({nome, email, cpfCnpj})` e `criarCheckoutAssinatura({customerId, callbackUrl, valor, cicloDias})` — cria um Checkout hospedado tipo `RECURRENT`, retorna o link pra onde redirecionar o cliente. **Nenhuma função aqui recebe ou manipula dado de cartão** — isso é o ponto central da correção de escopo PCI, então vale um comentário explícito no código lembrando por quê. Chave de API em `ASAAS_API_KEY` (variável de ambiente server-only, sem prefixo `NEXT_PUBLIC_`), sandbox primeiro.

_Depende de:_ nada — pode rodar em paralelo com a Fatia 1.
_Teste:_ script isolado (ou chamada direta via Node) contra o sandbox do Asaas — criar um customer de teste, criar um Checkout de teste, confirmar que o link retornado abre a página de pagamento hospedada do Asaas. Confirmar também, lendo o código, que `ASAAS_API_KEY` não aparece em nenhum arquivo que vira bundle de cliente (grep por `ASAAS_API_KEY` fora de `lib/asaas/` e de route handlers/server actions deve dar zero resultado).

## Fatia 3 — Extrair provisionamento de tenant pra função reaproveitável

Hoje todo o seed (plano de contas, DRE modelo, categorias, conta Caixa, formas de pagamento) mora dentro de `cadastrar()` em `app/src/app/(auth)/actions.ts`. Extrair para `lib/tenant/provisionar.ts::provisionarTenantNovo({nome, asaasCustomerId, asaasSubscriptionId, statusAssinatura, trialTerminaEm})` — recebe os dados de assinatura, faz o mesmo insert em `tenants` (com as colunas novas da Fatia 1) + todo o seed que já existia + o envio do e-mail de ativação (ver Fatia 7). `cadastrar()` passa a chamar essa função (refatoração pura — `/cadastro` continua desligado e se comporta idêntico a antes).

_Depende de:_ Fatia 1.
_Teste:_ reativar `CADASTRO_PUBLICO_ATIVO` temporariamente em ambiente local, rodar `/cadastro` uma vez, confirmar que o tenant sai idêntico a antes da refatoração. Desligar a flag de novo depois.

## Fatia 4 — Rota pública `/assinar`

Página nova com formulário: nome da empresa, nome do responsável, e-mail, CPF/CNPJ. Server action que chama `lib/asaas` (Fatia 2) pra criar customer + Checkout hospedado, e redireciona o cliente pro link retornado. **Não coleta nenhum dado de pagamento** — isso fica inteiramente na página do Asaas.

Segurança desta fatia: rate limit por IP e por e-mail na criação de customer (mesmo sem coletar cartão, esse endpoint ainda pode ser abusado pra spam de tenants ou reconhecimento); validação de CPF/CNPJ por checksum real, não só formato.

_Depende de:_ Fatia 2.
_Teste:_ preencher o formulário, confirmar redirecionamento pro Checkout do Asaas sandbox com os dados certos (valor, ciclo). Testar rate limit disparando várias tentativas seguidas e confirmar bloqueio.

## Fatia 5 — Página de retorno do checkout

Rota de callback (`/assinar/retorno` ou nome similar, configurada como `callbackUrl` na Fatia 2) que o Asaas usa pra redirecionar o cliente de volta após o pagamento. **Não provisiona nada, não confia em nenhum parâmetro da URL como prova de pagamento** — só mostra uma mensagem de "pagamento em processamento, você vai receber um e-mail em instantes" e nada mais. Esse é o ponto de maior risco de erro se alguém tentar "otimizar" depois — vale um comentário grande no código explicando por que essa página nunca deve ganhar lógica de provisionamento.

_Depende de:_ nada tecnicamente, mas só faz sentido depois da Fatia 4 (é o destino do redirect).
_Teste:_ visitar a URL de callback manualmente, sem ter pago nada, com parâmetros forjados na query string — confirmar que nada é criado no banco e nenhuma sessão é aberta.

## Fatia 6 — Webhook do Asaas

Rota de API `app/src/app/api/webhooks/asaas/route.ts`, fora do middleware de sessão normal. **Este é o único gatilho real de provisionamento do sistema.**

- Valida o header `asaas-access-token` com comparação em tempo constante (`crypto.timingSafeEqual`) contra `ASAAS_WEBHOOK_TOKEN` — requisição sem token válido retorna 401 sem tocar em dado nenhum.
- Todo campo do payload tratado como entrada não confiável — validado em tipo/formato antes de usar.
- Checa `eventos_pagamento_processados` pelo `id` do evento antes de processar (idempotência) — evento repetido responde 200 sem reprocessar.
- Rate limit no próprio endpoint, mesmo autenticado por token.
- Resposta de erro nunca vaza detalhe interno (stack trace, nome de tabela).
- Trata os eventos:
  - `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`: se o tenant ainda não existe, chama `provisionarTenantNovo` (Fatia 3) com `status_assinatura` `trial` (se dentro da janela de trial do cartão) ou `ativo` (Pix, ou fim do trial); se já existe, só atualiza `status_assinatura = 'ativo'`.
  - `PAYMENT_OVERDUE`: `status_assinatura = 'inadimplente'`.
  - `SUBSCRIPTION_CANCELED`: `status_assinatura = 'cancelado'`.

_Depende de:_ Fatias 1, 2, 3.
_Teste:_ usar a ferramenta de teste de webhook do painel Asaas — confirmar que cada tipo de evento atualiza o `status_assinatura` certo, que reenviar o mesmo evento não duplica processamento, que um token errado (inclusive um quase certo, testando a comparação em tempo constante) é rejeitado, e que um payload com campo faltando/malformado não derruba o endpoint nem gera erro vazando detalhe interno.

## Fatia 7 — E-mail de ativação

Reaproveita o mecanismo já existente do convite de equipe (`admin.auth.admin.generateLink({type:"invite"})` + `/convite/aceitar`, token só consumido no clique). Adaptar o template de e-mail (Brevo) pra esse contexto. Chamado dentro de `provisionarTenantNovo` (Fatia 3), então acontece automaticamente tanto no caminho cartão quanto Pix, sempre disparado pelo webhook (Fatia 6).

_Depende de:_ Fatias 3 e 6.
_Teste:_ assinar com cartão de teste no sandbox, confirmar recebimento do e-mail, clicar no link, definir senha, confirmar login no tenant recém-criado com todos os dados-semente presentes. Confirmar que clicar no mesmo link uma segunda vez falha com mensagem clara.

## Fatia 8 — Middleware de status de assinatura + tela de bloqueio

`utils/supabase/middleware.ts` passa a checar `status_assinatura` do tenant do usuário autenticado, além da checagem de sessão que já existe. `inadimplente` há menos de 5 dias: acesso normal + banner de aviso. `inadimplente` há mais de 5 dias, ou `cancelado`: redireciona para `/assinatura-pendente` (página nova, explica a situação, link para atualizar forma de pagamento).

_Depende de:_ Fatia 6 (é o que muda `status_assinatura` ao longo do tempo).
_Teste:_ forçar manualmente os 4 valores de `status_assinatura` num tenant de teste e confirmar o comportamento de cada um — sem apagar nenhum dado do tenant em nenhum caso.

## Fatia 9 — Teste ponta a ponta

Fluxo completo no navegador, sandbox do Asaas: `/assinar` → redirecionamento pro Checkout → pagar com cartão de teste → retorno → webhook → e-mail → ativação → uso normal → forçar `PAYMENT_OVERDUE` via webhook de teste → confirmar banner → forçar passagem dos 5 dias → confirmar bloqueio → forçar `PAYMENT_CONFIRMED` de novo → confirmar acesso normal restaurado. Repetir o caminho Pix separadamente (sem trial). Checklist final de segurança: grep completo por `ASAAS_API_KEY`/`ASAAS_WEBHOOK_TOKEN` confirmando que nenhum aparece em código client-side ou em log; confirmar que a página de retorno (Fatia 5) realmente não provisiona nada sozinha.

_Depende de:_ Fatias 1–8 completas.

---

## Fora de escopo (herdado da spec)

Testes pesados de segurança (pentest, fuzzing do webhook, varredura automatizada de rate-limiting), múltiplos planos/tiers, Pix Automático, reativação de `/cadastro`, programa de afiliados, cupons, CAPTCHA (fica como item a ativar depois se houver sinal de abuso).
