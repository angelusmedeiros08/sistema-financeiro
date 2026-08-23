# Plano de implementação: Checkout, assinatura e provisionamento de tenant

**Spec:** [docs/superpowers/specs/2026-08-23-checkout-assinatura-provisionamento-design.md](../specs/2026-08-23-checkout-assinatura-provisionamento-design.md)
**Data:** 2026-08-23

Ordem por dependência: schema primeiro (todo o resto lê/escreve nele), depois o cliente Asaas isolado (testável sozinho, sem UI), depois a extração do provisionamento (refatoração pura, não muda nada visível ainda), só então a rota pública e o webhook — que são os dois caminhos que efetivamente disparam o provisionamento — e por último o ciclo de vida (e-mail, middleware, tela de bloqueio) e o teste ponta a ponta.

## Fatia 1 — Schema: colunas de assinatura + tabela de eventos

Migration nova: `tenants` ganha `asaas_customer_id text`, `asaas_subscription_id text`, `status_assinatura text default 'trial'` (constraint check nos 4 valores: trial/ativo/inadimplente/cancelado), `trial_termina_em timestamptz`. Tabela nova `eventos_pagamento_processados` (`id text primary key`, `tipo text`, `processado_em timestamptz default now()`). RLS em ambas: nenhuma policy de INSERT/UPDATE para `authenticated` (só `service_role` escreve, mesmo padrão de `tenants` hoje). Aplicar via Supabase MCP, documentar em `docs/schema-aplicado-supabase.md`, regenerar `database.types.ts`.

_Depende de:_ nada.
_Teste:_ `select` nas duas tabelas confirmando as colunas/constraints; tentar inserir em `eventos_pagamento_processados` com o client anônimo e confirmar que RLS bloqueia.

## Fatia 2 — Cliente Asaas (`lib/asaas/`)

Funções puras, sem UI: `criarCliente({nome, email, cpfCnpj})`, `criarAssinatura({customerId, formaPagamento, valor, cicloDias})` (cartão: tokeniza sem cobrar, `nextDueDate` = hoje + 7; Pix: cobra a primeira parcela na hora), `tokenizarCartao(...)`. Chave de API do Asaas em variável de ambiente (`ASAAS_API_KEY`, sandbox primeiro). Tipos de retorno explícitos, sem `any`.

_Depende de:_ nada — pode rodar em paralelo com a Fatia 1.
_Teste:_ script isolado (ou chamada direta via Node) contra o sandbox do Asaas — criar um customer de teste, criar uma assinatura de teste, conferir no painel Asaas que apareceu.

## Fatia 3 — Extrair provisionamento de tenant pra função reaproveitável

Hoje todo o seed (plano de contas, DRE modelo, categorias, conta Caixa, formas de pagamento) mora dentro de `cadastrar()` em `app/src/app/(auth)/actions.ts`. Extrair para `lib/tenant/provisionar.ts::provisionarTenantNovo({nome, asaasCustomerId, asaasSubscriptionId, statusAssinatura, trialTerminaEm})` — recebe os dados de assinatura em vez de nada, faz o mesmo insert em `tenants` (agora com as colunas novas da Fatia 1) + todo o seed que já existia. `cadastrar()` passa a chamar essa função (refatoração pura — `/cadastro` continua desligado e se comporta identico a antes, só que por dentro chama a função compartilhada).

_Depende de:_ Fatia 1 (colunas novas em `tenants`).
_Teste:_ reativar `CADASTRO_PUBLICO_ATIVO` temporariamente em ambiente local, rodar `/cadastro` uma vez, confirmar que o tenant sai idêntico a antes da refatoração (mesmo seed). Desligar a flag de novo depois.

## Fatia 4 — Rota pública `/assinar`

Página nova (`app/src/app/(auth)/assinar/page.tsx` ou grupo próprio) com formulário: nome da empresa, nome do responsável, e-mail, CPF/CNPJ, escolha de forma de pagamento. Server action que chama `lib/asaas` (Fatia 2) pra criar customer + assinatura.

- **Caminho cartão:** validação síncrona do cartão → chama `provisionarTenantNovo` (Fatia 3) direto com `status_assinatura: 'trial'` → segue pra Fatia 6 (e-mail).
- **Caminho Pix:** mostra QR code / copia-e-cola, não provisiona nada ainda — só a confirmação do webhook (Fatia 5) provisiona.

_Depende de:_ Fatias 2 e 3.
_Teste:_ preencher o formulário com cartão de teste do Asaas sandbox, confirmar que o tenant é criado no banco com `status_assinatura = 'trial'` e `trial_termina_em` = hoje + 7 dias.

## Fatia 5 — Webhook do Asaas

Rota de API `app/src/app/api/webhooks/asaas/route.ts`, fora do middleware de sessão normal. Valida o token de autenticação do header (configurado no cadastro do endpoint no painel Asaas) antes de qualquer coisa — requisição sem token válido retorna 401 sem tocar em dado nenhum. Checa `eventos_pagamento_processados` pelo `id` do evento — se já existe, responde 200 sem reprocessar. Trata:

- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`: se o tenant ainda não existe (caminho Pix da Fatia 4), chama `provisionarTenantNovo` com `status_assinatura: 'ativo'` (sem trial) e segue pra Fatia 6; se já existe (renovação normal ou fim do trial no cartão), só atualiza `status_assinatura = 'ativo'`.
- `PAYMENT_OVERDUE`: `status_assinatura = 'inadimplente'`.
- `SUBSCRIPTION_CANCELED`: `status_assinatura = 'cancelado'`.

_Depende de:_ Fatias 1, 2, 3.
_Teste:_ usar a ferramenta de teste de webhook do próprio painel Asaas (dispara eventos de exemplo) — confirmar que cada tipo de evento atualiza o `status_assinatura` certo, que reenviar o mesmo evento não duplica processamento, e que um token errado é rejeitado.

## Fatia 6 — E-mail de ativação

Reaproveita o mecanismo já existente do convite de equipe (`admin.auth.admin.generateLink({type:"invite"})` + `/convite/aceitar`, token só consumido no clique). Adaptar o template de e-mail (Brevo) pra esse contexto ("Sua assinatura foi confirmada — clique para criar sua senha e acessar"). Chamado ao final do provisionamento, tanto no caminho síncrono (Fatia 4, cartão) quanto no caminho por webhook (Fatia 5, Pix).

_Depende de:_ Fatias 4 e 5 (é o passo final de ambos).
_Teste:_ assinar com cartão de teste, confirmar recebimento do e-mail, clicar no link, definir senha, confirmar login no tenant recém-criado com todos os dados-semente presentes.

## Fatia 7 — Middleware de status de assinatura + tela de bloqueio

`utils/supabase/middleware.ts` passa a checar `status_assinatura` do tenant do usuário autenticado (além da checagem de sessão que já existe). `inadimplente` com menos de 5 dias desde o `PAYMENT_OVERDUE`: acesso liberado normalmente + banner de aviso no topo do app. `inadimplente` além de 5 dias, ou `cancelado`: redireciona para `/assinatura-pendente` (página nova, explica a situação, link para atualizar forma de pagamento / reativar).

_Depende de:_ Fatia 5 (é o que muda `status_assinatura` ao longo do tempo).
_Teste:_ forçar manualmente os 4 valores de `status_assinatura` num tenant de teste e confirmar o comportamento de cada um (acesso normal, acesso com banner, bloqueado com 5+ dias, bloqueado por cancelamento) — sem apagar nenhum dado do tenant em nenhum caso.

## Fatia 8 — Teste ponta a ponta

Fluxo completo no navegador, sandbox do Asaas: assinar com cartão → confirmar trial → e-mail → ativação → uso normal → forçar `PAYMENT_OVERDUE` via webhook de teste → confirmar banner → forçar passagem dos 5 dias → confirmar bloqueio → forçar `PAYMENT_CONFIRMED` de novo → confirmar acesso normal restaurado. Repetir o caminho Pix separadamente (sem trial, provisionamento só depois do webhook).

_Depende de:_ Fatias 1–7 completas.

---

## Fora de escopo (herdado da spec)

Testes pesados de segurança (pentest, fuzzing do webhook, rate-limiting), múltiplos planos/tiers, Pix Automático, reativação de `/cadastro`, programa de afiliados, cupons.
