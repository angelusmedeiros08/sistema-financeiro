# Autoatendimento de assinatura

## Contexto

O Finanssi já cobra assinatura via Asaas (checkout hospedado, webhook de eventos,
gate de acesso em `acessoLiberado()`), mas todo o pós-checkout depende de
contato humano:

- O selo de trial na topbar (`status-plano.tsx`) é só texto — não dá pra
  assinar antes do trial acabar.
- `/assinatura-pendente` (tela de bloqueio) só oferece um `mailto:` pro
  suporte, tanto pra inadimplente quanto pra cancelado.
- Não existe nenhuma tela de assinatura/cobrança em `/configuracoes`.
- `lib/asaas/consulta.ts` só busca dado pra validar webhook — não tem
  nenhuma função pra buscar fatura, criar checkout de reativação ou
  cancelar assinatura.

Esta feature fecha esse ciclo: 4 fluxos de autoatendimento, todos escritos
sobre a integração Asaas que já existe.

## Princípio central: Asaas hospedado, sempre

O checkout inicial já segue esse princípio (comentário em `checkout.ts`):
nenhum dado de cartão passa pelo servidor do Finanssi — mantém o produto em
SAQ-A (PCI) em vez de SAQ-D. Todo fluxo novo desta feature segue o mesmo
princípio: qualquer ação de pagamento (pagar fatura, assinar, reativar)
redireciona pra uma página hospedada do Asaas; o Finanssi nunca renderiza
formulário de cartão/Pix próprio.

## Os 4 fluxos

1. **Pagar fatura em atraso** — tenant `inadimplente` vê o link da cobrança
   pendente e paga direto (Pix/boleto/cartão, conforme o método já
   configurado na assinatura).
2. **Reativar assinatura cancelada** — tenant `cancelado` gera um novo
   Checkout (Asaas não reativa assinatura cancelada, é sempre uma nova).
3. **Assinar antes do trial acabar** — o selo de trial na topbar vira botão
   e dispara o mesmo mecanismo do item 2.
4. **Gerenciar assinatura ativa** — tela em `/configuracoes/assinatura`
   (só `admin`): plano, próximo vencimento, link da última fatura, e
   cancelar por conta própria.

**Insight de arquitetura**: os itens 2 e 3 são o mesmo mecanismo por baixo
— "gerar um novo Checkout pra um tenant que já existe" — só mudam o gatilho
na UI e o texto. Implementados como uma única função server-side.

## Modelo de dados

`tenants.status_assinatura` ganha um valor novo: `cancelamento_agendado`.
Nova coluna `tenants.acesso_ate` (timestamptz, nullable) — populada só
quando o tenant cancela por conta própria (fluxo 4), mesmo padrão que
`trial_termina_em` já usa pro trial.

Isso separa dois cenários que hoje o schema não distingue:

- **Cancelamento voluntário** (cliente já pagou o ciclo atual e pede pra
  não renovar): mantém acesso até `acesso_ate` (fim do período já pago).
  Decisão explícita do usuário nesta sessão — diferente do padrão de
  bloqueio imediato já usado pra inadimplência.
- **Cancelamento por inadimplência** (Asaas desiste depois de tentativas
  de cobrança falhas): continua com bloqueio imediato, sem carência —
  regra já existente (auditoria de segurança, 29/08/2026), não muda.

`acessoLiberado()` (`lib/pagamentos/plano.ts`) ganha um terceiro ramo:

```ts
if (statusAssinatura === "ativo") return true;
if (statusAssinatura === "trial") return !trialTerminaEm || new Date(trialTerminaEm) > new Date();
if (statusAssinatura === "cancelamento_agendado") return !acessoAte || new Date(acessoAte) > new Date();
return false; // inadimplente, cancelado
```

Não precisa de cron pra "expirar" o estado — a comparação de data já resolve
isso a cada request, mesmo mecanismo do trial.

## Coordenação com o webhook existente

`api/webhooks/asaas/route.ts` recebe `SUBSCRIPTION_CANCELED` sempre que uma
assinatura é cancelada — inclusive quando **nós mesmos** chamamos a API de
cancelamento no fluxo 4. Sem ajuste, esse webhook sobrescreveria
`cancelamento_agendado` de volta pra `cancelado` na hora, matando a
carência que acabamos de conceder.

Correção: o handler de `assinatura_cancelada` só aplica `cancelado` se o
tenant **não estiver já** em `cancelamento_agendado`:

```ts
await admin.from("tenants").update({ status_assinatura: "cancelado" })
  .eq("asaas_subscription_id", evento.assinaturaExternaId)
  .neq("status_assinatura", "cancelamento_agendado");
```

## Checkout pra tenant existente (reativação / upgrade de trial)

O checkout inicial usa `externalReference` pra carregar o nome da empresa
nova (o webhook usa isso pra nomear o tenant recém-provisionado). Os fluxos
2 e 3 precisam do oposto: identificar um tenant **que já existe**.

Convenção nova: `externalReference: \`tenant:${tenantId}\`` pros checkouts
de reativação/upgrade. `processarCheckoutPago` (`api/webhooks/asaas/route.ts`)
ganha uma ramificação logo no início:

```ts
if (assinatura.externalReference?.startsWith("tenant:")) {
  return atualizarTenantExistente(admin, assinatura, evento.assinaturaExternaId);
}
// ...fluxo de provisionamento novo, inalterado
```

`atualizarTenantExistente` faz o equivalente ao provisionamento, sem criar
usuário/tenant novo: grava o `asaas_subscription_id` novo e zera
`acesso_ate` — **mas não mexe em `status_assinatura` neste momento**.

Isso corrige uma inconsistência que apareceu na primeira versão deste spec:
reaproveitar o status `trial` aqui pareceria natural (é o mesmo raciocínio
do provisionamento novo — `CHECKOUT_PAID` no caminho cartão só confirma que
o cartão foi validado, a cobrança de fato chega depois via
`PAYMENT_CONFIRMED`), mas `trial` carrega semântica própria no resto do
produto (badge "Trial · 7 dias" na topbar, `TRIAL_DIAS` = período de teste
grátis). Um cliente que acabou de pagar pra reativar não pode ver essa
mensagem. Em vez disso, o tenant permanece no status atual (`cancelado`,
`cancelamento_agendado` ou `trial`, o que já era) até `PAYMENT_CONFIRMED`
chegar (já existe, não muda) e confirmar `"ativo"` de verdade — a mesma
janela de espera que o provisionamento novo já tem hoje entre os dois
webhooks, só que sem inventar um estado intermediário novo.

A página de retorno do checkout (`callbackUrlSucesso`) **não** reaproveita
`/assinar/retorno` — conferi o código e o texto de lá é hardcoded pra quem
ainda não tem conta ("defina sua senha", botão "Já tenho conta" → `/entrar`),
além de viver sob o layout público `(auth)`. Um tenant que clicou em
"Reativar" ou "Assinar agora" já está logado; mandar ele pra uma página
pública de login seria um non-sense. Em vez disso, o `callbackUrlSucesso`
de cada checkout desta feature aponta de volta pra dentro do app autenticado
— `/assinatura-pendente?retorno=confirmando` pro fluxo de reativação,
`/configuracoes/assinatura?retorno=confirmando` pro upgrade de trial — e a
própria tela lê esse parâmetro pra mostrar um aviso inline ("Estamos
confirmando seu pagamento, isso costuma levar só alguns instantes,
atualize a página em instantes") sem sair do contexto logado. Mesmo
princípio de segurança do `/assinar/retorno` original continua valendo: o
retorno do navegador nunca é tratado como prova de pagamento, só o webhook.

## Novas funções em `lib/asaas/`

- `buscarCobrancaPendente(subscriptionId)` — `GET /v3/payments?subscription={id}`
  filtrado por status pendente/vencido, devolve o `invoiceUrl` da cobrança
  atual (usado nos fluxos 1 e 4).
- `cancelarAssinaturaAsaas(subscriptionId)` — `DELETE /v3/subscriptions/{id}`
  (fluxo 4).
- Fluxos 2 e 3 reaproveitam `criarCheckoutAssinatura` (já existe), só
  passando o novo formato de `externalReference`.

## Telas

Sem Sheet/Dialog pra nada estrutural — páginas cheias, mesmo padrão já
usado no resto do sistema.

- **`status-plano.tsx`** (badge de trial na topbar): vira um botão. Clique
  chama uma server action que gera o checkout e redireciona.
- **`/assinatura-pendente`**: branch por status.
  - `inadimplente`: busca a cobrança pendente, botão primário "Pagar
    agora" (abre a página hospedada do Asaas). `mailto:` continua como
    contato secundário, não desaparece.
  - `cancelado` (incluindo `cancelamento_agendado` já expirado): botão
    "Reativar assinatura" → gera checkout novo, redireciona.
  - `cancelamento_agendado` ainda dentro da carência: **não cai aqui** —
    `acessoLiberado()` já libera o acesso normal; a tela certa pra ver
    esse estado é `/configuracoes/assinatura` (abaixo), com um aviso.
  - `?retorno=confirmando`: banner inline "Estamos confirmando seu
    pagamento..." acima do botão normal da tela (a pessoa pode ter voltado
    do checkout antes do webhook confirmar — a própria checagem que já
    existe no topo da página, "se já está liberado manda pra /painel",
    resolve sozinha assim que o webhook chegar).
- **`/configuracoes/assinatura`** (nova, só `admin`, mesmo grupo de nav
  que Equipe/Auditoria): plano atual e valor, status, próximo vencimento,
  link "Ver última fatura", botão "Cancelar assinatura". Confirmação via
  `window.confirm(...)` com a data exata de corte na mensagem — mesmo
  padrão já usado em `cancelar-convite-button.tsx`, sem introduzir
  componente de dialog novo. Se já estiver em `cancelamento_agendado`,
  a tela mostra isso com destaque e a data de corte, sem botão de cancelar
  de novo. Com `?retorno=confirmando`, mesmo banner inline do item acima.

## Tratamento de erro

Toda chamada à API do Asaas pode falhar (rede, sandbox fora do ar, chave
inválida). Em qualquer um dos 4 fluxos, uma falha mostra uma mensagem
amigável e mantém o `mailto:` de contato como rede de segurança — nunca
trava a tela nem expõe erro cru do Asaas (mesmo padrão de
`chamarAsaas`, que já filtra a mensagem antes de propagar).

## Fora de escopo (decisão explícita, não esquecimento)

- Múltiplos planos/tiers por número de assento — modelagem de negócio
  separada, ainda não decidida (ver memória `projeto_planos_por_assento_futuro`).
  `VALOR_PLANO_MENSAL` continua fixo.
- Trocar de forma de pagamento (cartão → Pix) numa assinatura ativa sem
  cancelar — não é um endpoint simples do Asaas, fica pra quando for pedido.
- Painel do operador (visão de todos os tenants) — item separado do mapeamento
  de gaps do SaaS, não faz parte deste spec.

## Teste

Sandbox do Asaas (já configurado via `ASAAS_API_URL`/`ASAAS_API_KEY` de
teste): os 4 fluxos são testáveis de ponta a ponta sem dinheiro real —
criar um tenant de teste em cada estado (`inadimplente`, `cancelado`,
`trial`, `ativo`) e exercitar cada botão contra o sandbox.
