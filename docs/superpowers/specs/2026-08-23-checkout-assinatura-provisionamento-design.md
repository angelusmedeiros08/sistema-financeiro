# Checkout, assinatura e provisionamento automático de tenant

**Data:** 2026-08-23
**Status:** aprovado, pronto para virar plano de implementação

## Contexto

Hoje a criação de um tenant só acontece pelo fluxo `/cadastro` (`app/src/app/(auth)/cadastro/page.tsx` → `cadastrar()` em `app/src/app/(auth)/actions.ts`), que está desligado por uma flag (`CADASTRO_PUBLICO_ATIVO = false` em `app/src/app/(auth)/config.ts`) desde o deploy de demonstração. Esse fluxo cria, numa única ação com `service_role`: o login (`auth.users`), o tenant, o vínculo do usuário como admin, e todo o "seed" de dados limpos do tenant novo (plano de contas, 23 linhas de DRE, 28 categorias financeiras, uma conta "Caixa", 4 formas de pagamento padrão).

O sistema vai passar a ser pago. Este documento desenha o fluxo completo: cliente paga → recebe acesso com configuração inicial pronta → tudo isso sem expor tokens/credenciais antes da hora. Testes pesados de segurança (pentest, fuzzing de webhook, etc.) ficam para uma etapa posterior, fora do escopo deste ciclo.

## Decisões de escopo (confirmadas com o usuário)

- **Gateway de pagamento: Asaas.** Único entre as opções avaliadas (Stripe, Mercado Pago, Hotmart/Kiwify) que combina Pix + boleto + cartão + assinatura recorrente numa API só, com taxas de ~2-5% (contra ~10% de um checkout hospedado tipo Hotmart) e é feito especificamente para cobrança recorrente de SaaS brasileiro.
- **Checkout próprio**, construído dentro do app — não um checkout hospedado por terceiro. Menor taxa, mantém a marca do início ao fim.
- **Assinatura recorrente**, cobrança automática mensal (ou outra periodicidade, configurável no Asaas).
- **Um plano único** para começar. Esquema de múltiplos planos/tiers com limites diferentes fica para um ciclo futuro — o schema abaixo já comporta isso sem redesenho (basta guardar qual plano o tenant assinou), mas a tela de checkout e a lógica de limite por plano não fazem parte deste spec.
- **Trial de 7 dias**, com forma de pagamento já cadastrada no início — sem fricção de "voltar depois pra pagar", cobrança automática ao fim do trial.
- **Senha só é definida depois do pagamento/trial confirmado**, nunca antes — ver seção "Segurança do link de ativação".
- **`/assinar` substitui `/cadastro`** como único caminho de entrada de tenant novo daqui pra frente. `/cadastro` continua existindo no código (desligado), mas não é mais o caminho oficial — não deve ser reativado.

## Visão geral do fluxo

```
1. Cliente acessa /assinar (rota pública nova)
   → preenche: nome da empresa, nome do responsável, e-mail, CPF/CNPJ (exigido pelo Asaas
     para criar o customer), forma de pagamento (Pix ou cartão)

2. Backend cria o customer no Asaas, depois a subscription:
   - Cartão: tokeniza e valida o cartão SEM cobrar; nextDueDate = hoje + 7 dias. Trial real.
   - Pix: não existe "guardar sem cobrar" nativo — cobra a primeira mensalidade na hora.
     Sem trial nesse caminho; o cliente já entra como assinante ativo. A tela deixa isso
     explícito ("cartão = 7 dias grátis, Pix = começa já pagando").

3a. Caminho cartão: validação do cartão é síncrona (resposta imediata da API do Asaas) →
    segue direto pro passo 4.
3b. Caminho Pix: cliente vê o QR code / copia-e-cola, backend aguarda o webhook
    PAYMENT_CONFIRMED antes de seguir pro passo 4 (nunca libera nada antes da confirmação).

4. Backend cria o tenant (status "trial" ou "ativo", conforme o caminho) com service_role,
   e roda o MESMO seed que cadastrar() já faz hoje: plano de contas, DRE modelo, categorias,
   conta Caixa, formas de pagamento. Nenhum auth.users é criado ainda.

5. Backend gera um link de ativação único via admin.auth.admin.generateLink({type:"invite"}),
   mesmo mecanismo já usado no convite de equipe hoje (equipe.ts) — token só é consumido no
   clique explícito em /convite/aceitar, nunca num GET simples (sobrevive a scanners de
   segurança de e-mail que pre-carregam links). E-mail enviado via Brevo (já configurado)
   com esse link.

6. Cliente clica, define a senha, usuario_tenant é criado com papel "admin". Tenant pronto,
   com todos os dados-semente já configurados.

--- Ciclo de vida contínuo da assinatura (após a ativação) ---

7. Webhook do Asaas (endpoint único, autenticado por token) recebe eventos:
   - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → status_assinatura = "ativo"
   - PAYMENT_OVERDUE → status_assinatura = "inadimplente" (tolerância de acesso, ver abaixo)
   - SUBSCRIPTION_CANCELED → status_assinatura = "cancelado" (acesso bloqueado, dados mantidos)

8. Middleware do app (utils/supabase/middleware.ts) passa a checar status_assinatura do
   tenant do usuário logado em toda requisição, além da checagem de autenticação que já
   existe. Tenant "inadimplente" além da tolerância ou "cancelado" é redirecionado para uma
   tela de "assinatura pendente" em vez do app normal.
```

## Segurança do link de ativação

Reaproveita integralmente o padrão já validado no convite de equipe (`app/src/lib/tenant/equipe.ts`, `app/src/app/(auth)/convite/aceitar/`):

- O token do Supabase (`generateLink`) só é trocado por uma sessão real no momento em que o usuário clica num botão explícito na página `/convite/aceitar` — nunca automaticamente ao carregar a página. Isso é o que já protege contra scanners de e-mail corporativos que pré-visitam todo link recebido (o problema real que motivou esse desenho, descoberto e corrigido numa fase anterior deste projeto).
- Nenhuma credencial (senha) existe no sistema antes da confirmação de pagamento — o `auth.users` só é criado no clique do link, não antes.
- Todo o provisionamento (passo 4) roda com `service_role`, nunca com o client anônimo — mesma razão de sempre: RLS não permite um usuário não-autenticado inserir em `tenants`/`usuario_tenant`.

## Segurança do webhook

- Asaas permite configurar um **token de autenticação** no cadastro do endpoint de webhook (enviado num header a cada requisição). O handler rejeita qualquer requisição sem esse token batendo, antes de tocar em qualquer dado.
- **Idempotência:** Asaas garante entrega "at least once" (pode reenviar o mesmo evento). Tabela nova `eventos_pagamento_processados` (guarda o `id` do evento Asaas) é checada antes de processar — evento já visto é ignorado silenciosamente (responde 200 de qualquer forma, pra não gerar retentativa infinita).
- O endpoint de webhook roda fora do fluxo de autenticação normal do middleware (é chamado pelo Asaas, não por um usuário logado) — precisa ficar numa rota de API (`app/src/app/api/webhooks/asaas/route.ts`) explicitamente isenta da checagem de sessão, mas sujeita à checagem de token acima.

## Schema novo

`tenants` ganha colunas:
- `asaas_customer_id text`
- `asaas_subscription_id text`
- `status_assinatura text` (`trial` / `ativo` / `inadimplente` / `cancelado`)
- `trial_termina_em timestamp`

Tabela nova `eventos_pagamento_processados`:
- `id text` (o ID do evento vindo do Asaas, chave primária)
- `tipo text`
- `processado_em timestamp default now()`

RLS: nenhuma policy de INSERT/UPDATE para `authenticated` em nenhuma das duas — mesmo padrão já usado em `tenants` hoje (só `service_role`, que ignora RLS, escreve).

## Inadimplência e cancelamento

- `PAYMENT_OVERDUE` não bloqueia na hora — 5 dias corridos de tolerância com um aviso visível no app (banner), tempo do cliente atualizar a forma de pagamento.
- Passado os 5 dias, ou em `SUBSCRIPTION_CANCELED`, acesso bloqueado (redirecionado pra tela de "assinatura pendente/cancelada" com opção de reativar). **Dados nunca são apagados** — só ficam inacessíveis até regularizar.

## Fora de escopo (deste ciclo)

- Testes pesados de segurança (pentest, fuzzing do endpoint de webhook, revisão de rate-limiting) — etapa seguinte, depois deste fluxo estar implementado e funcional.
- Múltiplos planos/tiers com limites diferentes por plano.
- Pix Automático (cobrança recorrente via Pix sem precisar de cartão) — fica para quando o suporte bancário estiver mais maduro.
- Reativação de `/cadastro` — permanece desligado; `/assinar` é o único caminho novo.
- Programa de afiliados, cupons de desconto, período de carência configurável por tenant.

## Próximos passos

Com este spec aprovado, o próximo passo é o `writing-plans` — quebrar isso num plano de implementação vertical (migration → integração Asaas → rota `/assinar` → webhook handler → e-mail de ativação → middleware de status → tela de assinatura pendente).
