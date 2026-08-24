# Checkout, assinatura e provisionamento automático de tenant

**Data:** 2026-08-23 (revisado: correção de escopo PCI + seção de segurança)
**Status:** aprovado, pronto para virar plano de implementação

## Contexto

Hoje a criação de um tenant só acontece pelo fluxo `/cadastro` (`app/src/app/(auth)/cadastro/page.tsx` → `cadastrar()` em `app/src/app/(auth)/actions.ts`), que está desligado por uma flag (`CADASTRO_PUBLICO_ATIVO = false` em `app/src/app/(auth)/config.ts`) desde o deploy de demonstração. Esse fluxo cria, numa única ação com `service_role`: o login (`auth.users`), o tenant, o vínculo do usuário como admin, e todo o "seed" de dados limpos do tenant novo (plano de contas, 23 linhas de DRE, 28 categorias financeiras, uma conta "Caixa", 4 formas de pagamento padrão).

O sistema vai passar a ser pago. Este documento desenha o fluxo completo: cliente paga → recebe acesso com configuração inicial pronta → tudo isso sem expor segredos nem criar superfície de invasão. **Segurança é o critério dominante deste desenho, não um ajuste posterior** — cada decisão abaixo foi tomada priorizando não vazar credenciais e não abrir brecha de acesso indevido, mesmo quando isso custa alguma conveniência de produto. Testes pesados de segurança (pentest, fuzzing de webhook, varredura automatizada) continuam fora do escopo deste ciclo — mas o desenho já nasce estruturado para não depender desses testes pra ser seguro; eles vêm depois como confirmação, não como rede de segurança.

## Correção de escopo importante: Checkout hospedado, não checkout próprio

A primeira versão deste spec previa construir uma tela de cartão dentro do próprio app. **Isso foi revisto.** O Asaas não oferece tokenização client-side (não existe um "campo de cartão" deles pra embutir no nosso front mantendo o dado fora do nosso servidor) — se o número do cartão passasse pelo nosso backend antes de ir pro Asaas, isso nos classificaria em **PCI-DSS SAQ-D**: o nível mais pesado de conformidade, com avaliação completa, segmentação de rede e normalmente auditoria paga por QSA. Não é proporcional ao estágio do projeto, e uma tentativa incompleta de SAQ-D é pior do que simplesmente não tocar em dado de cartão.

**Decisão: usar o Checkout hospedado do Asaas** (`docs.asaas.com/docs/checkout-asaas`), tipo `RECURRENT` para assinatura. O cliente é redirecionado para uma página de pagamento do próprio Asaas (Pix e cartão, com URL de callback de volta pro nosso site); o número do cartão nunca toca nosso servidor. Isso nos mantém em **SAQ-A** (autodeclaração simples, sem auditoria pesada), com a mesma taxa baixa do Asaas (~2-5%, não os ~10% de um checkout hospedado tipo Hotmart). O trade-off é perder um pouco de controle visual sobre a tela de pagamento em si — aceitável frente ao ganho de segurança/conformidade.

**Efeito colateral bom desse ajuste:** como agora não existe mais um momento síncrono de "cartão validado" dentro da nossa própria requisição, o provisionamento do tenant passa a ter **um único gatilho: o webhook confirmado**, tanto para cartão quanto para Pix. A trilha dupla (síncrono para cartão / assíncrono para Pix) da primeira versão deste spec deixa de existir — simplifica a arquitetura.

## Princípio: o Asaas fica isolado, não espalhado

O usuário foi explícito: mesmo depois de em produção, precisa ser possível trocar essa estrutura por outra no futuro — e qualquer estrutura que existir aqui, atual ou futura, precisa ser igualmente segura. Isso vira uma regra de arquitetura, não só uma intenção:

- **`lib/asaas/` é a única parte do sistema que conhece o Asaas de verdade** — nomes de evento (`PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, ...), formato do payload, header `asaas-access-token`, o jeito de criar customer/checkout. Nada disso vaza pra fora desse diretório.
- Webhook handler, provisionamento de tenant e middleware de status **nunca leem um campo específico do Asaas diretamente.** Trabalham só com um formato interno neutro, definido em `lib/pagamentos/tipos.ts`:
  ```ts
  export type EventoPagamento =
    | { tipo: "pagamento_confirmado"; assinaturaExternaId: string; ehPrimeiroPagamento: boolean }
    | { tipo: "pagamento_atrasado"; assinaturaExternaId: string }
    | { tipo: "assinatura_cancelada"; assinaturaExternaId: string };
  ```
  É `lib/asaas/webhook.ts::interpretarEventoAsaas(payloadBruto)` que traduz o evento bruto pra esse formato (ou retorna `null` pra evento que não nos interessa, ignorado). O route handler do webhook chama essa tradução primeiro, e só then passa o `EventoPagamento` neutro pra lógica de negócio.
- **Trocar de fornecedor no futuro** (Mercado Pago, outro) é escrever um novo `lib/mercadopago/webhook.ts` que traduz pro MESMO `EventoPagamento` — zero mudança em webhook handler, provisionamento, middleware ou nas telas. O "core" do sistema nunca soube que era Asaas.
- **A régua de segurança (segredos nunca expostos, comparação de token em tempo constante, webhook nunca confiado sem validação, retorno do navegador nunca tratado como prova de pagamento, RLS) vale pra qualquer fornecedor que ocupar essa camada** — é regra do sistema, não regra "do Asaas". Um fornecedor novo só entra depois de seguir o mesmo padrão.
- Fica fora de escopo por enquanto (YAGNI — só existe um fornecedor hoje): renomear as colunas de schema (`asaas_customer_id`/`asaas_subscription_id`) pra algo genérico com `provedor_pagamento`. Se um segundo fornecedor entrar de verdade, isso vira uma migration pequena e isolada — não bloqueia nada até lá.

## Decisões de escopo (confirmadas com o usuário)

- **Gateway de pagamento: Asaas.** Único entre as opções avaliadas (Stripe, Mercado Pago, Hotmart/Kiwify) que combina Pix + boleto + cartão + assinatura recorrente numa API só, com taxas de ~2-5% e feito especificamente para cobrança recorrente de SaaS brasileiro.
- **Checkout hospedado do Asaas** (corrigido — ver seção acima), não uma tela de cartão própria.
- **Assinatura recorrente**, cobrança automática mensal.
- **Um plano único** para começar. Múltiplos planos/tiers ficam para um ciclo futuro.
- **Trial de 7 dias** no caminho cartão, com forma de pagamento já validada no início. Pix não tem trial nativo (cobra a primeira mensalidade na hora) — a tela deixa isso explícito.
- **Senha só é definida depois do pagamento confirmado pelo webhook**, nunca antes.
- **`/assinar` substitui `/cadastro`** como único caminho de entrada de tenant novo. `/cadastro` continua no código, desligado, e não deve ser reativado.

## Visão geral do fluxo

```
1. Cliente acessa /assinar (rota pública nova)
   → preenche: nome da empresa, nome do responsável, e-mail, CPF/CNPJ (exigido pelo Asaas
     para criar o customer)

2. Backend cria o customer no Asaas, depois um Checkout (tipo RECURRENT) com:
   - callback de retorno pro nosso site (só como UX — ver "Segurança do retorno" abaixo)
   - nextDueDate = hoje + 7 dias no ciclo da assinatura (trial via cartão; Pix cobra na
     primeira janela disponível, sem trial)
   Backend redireciona o cliente pro link hospedado retornado pelo Asaas. Nada é
   provisionado ainda — nem tenant, nem auth.users.

3. Cliente paga no Checkout do Asaas (Pix ou cartão). Nosso servidor não vê o cartão em
   nenhum momento.

4. Cliente é redirecionado de volta pro nosso site (tela de "processando", nunca de
   sucesso definitivo — ver "Segurança do retorno").

5. Webhook do Asaas (assíncrono, pode chegar antes ou depois do redirect do passo 4)
   confirma o pagamento → esse é o ÚNICO gatilho que dispara o provisionamento:
   - Backend cria o tenant (status "trial" ou "ativo", conforme o caminho) com
     service_role, roda o MESMO seed que cadastrar() já faz hoje (plano de contas, DRE
     modelo, categorias, conta Caixa, formas de pagamento).
   - Gera um link de ativação único via admin.auth.admin.generateLink({type:"invite"}),
     mesmo mecanismo já usado no convite de equipe (equipe.ts) — token só consumido no
     clique explícito em /convite/aceitar, nunca num GET simples. E-mail enviado via
     Brevo com esse link.

6. Cliente clica no e-mail, define a senha, usuario_tenant é criado com papel "admin".
   Tenant pronto, com todos os dados-semente já configurados.

--- Ciclo de vida contínuo da assinatura (após a ativação) ---

7. Webhook do Asaas (mesmo endpoint, eventos subsequentes):
   - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → status_assinatura = "ativo"
   - PAYMENT_OVERDUE → status_assinatura = "inadimplente" (tolerância de acesso, ver abaixo)
   - SUBSCRIPTION_CANCELED → status_assinatura = "cancelado" (acesso bloqueado, dados mantidos)

8. Middleware do app (utils/supabase/middleware.ts) passa a checar status_assinatura do
   tenant do usuário logado em toda requisição, além da checagem de autenticação que já
   existe. Tenant "inadimplente" além da tolerância ou "cancelado" é redirecionado para uma
   tela de "assinatura pendente" em vez do app normal.
```

## Segurança — visão consolidada

Esta seção reúne toda decisão de segurança do desenho, pra ficar visível num único lugar em vez de espalhada. Cada item abaixo é uma decisão de arquitetura, não uma sugestão de teste posterior.

### Segredos e chaves de API

- `ASAAS_API_KEY` e o token do webhook (`ASAAS_WEBHOOK_TOKEN`) vivem só em variáveis de ambiente **sem** o prefixo `NEXT_PUBLIC_`. Esse prefixo faz o Next.js embutir o valor no bundle JavaScript enviado ao navegador — qualquer segredo com esse prefixo está, por definição, vazado publicamente.
- Só server actions (`"use server"`) e route handlers (`app/api/.../route.ts`) referenciam essas chaves. Nenhum client component recebe a chave como prop, nem indiretamente.
- Nunca logar a chave — nem em `console.log` de debug, nem em captura de erro por inteiro (erros de SDK/fetch às vezes serializam os headers da requisição, que incluem a chave).
- `.env.local` fora do git (já é o padrão deste projeto). Em produção (Vercel), a chave é uma Environment Variable marcada como sensível, nunca hardcoded.
- Se o Asaas oferecer chave com escopo restrito (só cobrança, sem acesso a saque/transferência), usar essa em vez da chave mestra da conta.

### Segurança do retorno do checkout (redirect) — nunca confiar no navegador

O cliente volta pro nosso site depois de pagar (callback URL do Checkout Asaas), mas **esse retorno nunca é tratado como prova de pagamento.** Qualquer pessoa pode visitar a URL de callback manualmente, com ou sem ter pago — os parâmetros de um redirect de navegador não são autenticados. A tela de retorno só mostra "processando, você vai receber um e-mail" e nunca provisiona nada, nunca cria sessão, nunca mostra dado do tenant. **O único gatilho de provisionamento é o webhook**, validado server-to-server com o token secreto (próxima seção). Esse é o ponto mais importante desta revisão: separa "o que o navegador diz" de "o que está confirmado no backend".

### Segurança do webhook

- Header `asaas-access-token` obrigatório em toda requisição — validado com comparação em **tempo constante** (`crypto.timingSafeEqual`), não `===`, pra não abrir brecha de timing attack contra o token.
- **Idempotência:** Asaas garante entrega "at least once" (pode reenviar o mesmo evento). Tabela `eventos_pagamento_processados` (guarda o `id` do evento) é checada antes de processar — evento já visto é ignorado, respondendo 200 mesmo assim (evita retentativa infinita do lado do Asaas).
- Todo campo do payload é tratado como **entrada não confiável**: validado em tipo/formato antes de ser usado, nunca passado direto pra uma query ou pro provisionamento sem checagem.
- Resposta de erro do endpoint nunca vazar detalhe interno (stack trace, nome de tabela/coluna) — só status genérico.
- Rate limit no endpoint, mesmo autenticado por token — reduz superfície de DoS.
- Endpoint roda fora do middleware de sessão normal (é chamado pelo Asaas, não por usuário logado), mas dentro da checagem de token acima.

### Abuso do formulário público `/assinar`

- Rate limit por IP e por e-mail na criação de customer — evita spam de tenants falsos e reduz a superfície pra tentativa de teste de cartão em massa (mesmo o número do cartão não passando pelo nosso servidor, o passo de *criar customer* ainda é nosso e pode ser abusado isoladamente).
- CPF/CNPJ validado por checksum real, não só formato.
- Considerar CAPTCHA (ex. Cloudflare Turnstile) se houver sinal de abuso em produção.

### Link de ativação

Reaproveita o padrão já validado no convite de equipe (`app/src/lib/tenant/equipe.ts`, `app/src/app/(auth)/convite/aceitar/`):

- Token só é trocado por sessão real no clique explícito de um botão em `/convite/aceitar` — nunca automaticamente ao carregar a página (protege contra scanners de e-mail corporativos que pré-visitam links, problema real já descoberto e corrigido numa fase anterior deste projeto).
- Nenhuma credencial existe no sistema antes da confirmação de pagamento — `auth.users` só é criado no momento do webhook confirmado, não antes.
- Token de uso único — uma segunda tentativa com o mesmo link falha com mensagem clara, não silenciosamente.
- Todo o provisionamento roda com `service_role`, nunca com o client anônimo — RLS não permite um usuário não-autenticado inserir em `tenants`/`usuario_tenant` de propósito.

### Isolamento multi-tenant (RLS)

`eventos_pagamento_processados` e as colunas novas de `tenants` seguem o mesmo padrão já estabelecido no projeto: nenhuma policy de INSERT/UPDATE para `authenticated`, só `service_role` escreve. É exatamente nesse ponto que um erro de RLS viraria vazamento de dado entre tenants — qualquer migration nova passa por essa checagem antes de ser considerada pronta.

### LGPD e dados sensíveis

CPF/CNPJ e dados de pagamento são dados pessoais sensíveis. Número de cartão e CVV **nunca** são armazenados nem trafegam pelo nosso banco de dados ou logs — resolvido estruturalmente ao usar o Checkout hospedado (nunca chegam ao nosso servidor). Antes de ir pra produção de verdade, `/assinar` precisa linkar uma política de privacidade.

### Logs

Nunca logar payload completo do webhook (pode conter dado de pagamento), nem a chave de API, nem o token do webhook. Log de debug usa só campos não-sensíveis: tipo do evento, ID, status.

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

RLS: nenhuma policy de INSERT/UPDATE para `authenticated` em nenhuma das duas — só `service_role` escreve.

## Inadimplência e cancelamento

- `PAYMENT_OVERDUE` não bloqueia na hora — 5 dias corridos de tolerância com um aviso visível no app (banner), tempo do cliente atualizar a forma de pagamento.
- Passado os 5 dias, ou em `SUBSCRIPTION_CANCELED`, acesso bloqueado (redirecionado pra tela de "assinatura pendente/cancelada" com opção de reativar). **Dados nunca são apagados** — só ficam inacessíveis até regularizar.

## Fora de escopo (deste ciclo)

- Testes pesados de segurança (pentest, fuzzing do endpoint de webhook, varredura automatizada de rate-limiting) — etapa seguinte, depois deste fluxo estar implementado e funcional. O desenho acima já assume essa etapa como confirmação, não como rede de segurança.
- Múltiplos planos/tiers com limites diferentes por plano.
- Pix Automático (cobrança recorrente via Pix sem precisar de cartão).
- Reativação de `/cadastro` — permanece desligado; `/assinar` é o único caminho novo.
- Programa de afiliados, cupons de desconto, período de carência configurável por tenant.
- CAPTCHA no `/assinar` (fica como item a ativar se houver sinal de abuso, não como pré-requisito de lançamento).

## Próximos passos

Spec revisado — ver plano de implementação atualizado em `docs/superpowers/plans/2026-08-23-checkout-assinatura-provisionamento-plan.md`.
