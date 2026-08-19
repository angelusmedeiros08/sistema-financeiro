# Saldo projetado (D+7/D+30/D+60) e alertas automáticos de vencimento por e-mail

## Contexto

O ciclo 1 da Central de Indicadores (spec `2026-08-15-forma-pagamento-e-central-indicadores-design.md`) entregou 4 dos 5 indicadores planejados em `2026-08-15-central-de-indicadores-visao-design.md`, deixando de propósito o único que exige lógica nova de projeção (não só agregação do que já existe): saldo projetado com alerta de ruptura de caixa. Esse mesmo documento também deixou em aberto se os alertas do módulo (concentração de risco, projeção negativa) "geram notificação proativa (e-mail, badge) ou ficam só na tela".

Este ciclo fecha os dois: implementa o indicador de saldo projetado e decide que ele — junto com um lembrete de vencimento que nenhum indicador cobria ainda — vira e-mail automático, não só card na tela.

## Escopo

**Dentro:**
- Indicador "Saldo projetado" em `/indicadores`: três valores (D+7/D+30/D+60) = saldo atual das contas financeiras + movimento previsto no período, com destaque visual quando algum horizonte cruza o limiar do tenant.
- `tenants.limiar_saldo_minimo_alerta` (numeric, default 0) — colchão de segurança mínimo por empresa; zero equivale a "só avisar se ficar negativo".
- Cron diário (`disparar_alertas_diarios`, 7h) que, por tenant: calcula vencimentos D-3/D-0 (a pagar e a receber) e a ruptura em D+7, e manda e-mail agregado.
- **E-mail interno** — um dígest por membro ativo da equipe com papel `admin`/`financeiro_senior`/`financeiro_junior`/`contador`, só nos dias em que há algo relevante: vencimentos de hoje/em 3 dias (dos dois lados) + aviso de ruptura se o saldo projetado D+7 estiver abaixo do limiar.
- **E-mail externo (cobrança)** — um e-mail por pessoa com parcela de receita vencendo em D-3/D-0, listando só as dela. Pessoa sem e-mail cadastrado é pulada silenciosamente, sem erro.
- Tabela de dedup `alertas_enviados` — impede reenvio do mesmo alerta se o cron rodar mais de uma vez no mesmo dia.

**Fora (deste ciclo):**
- WhatsApp como canal — cotado para um ciclo futuro; a arquitetura de dedup/agregação por destinatário já fica pronta pra receber um segundo canal depois, mas nenhum código de envio por WhatsApp entra agora.
- Toggle de liga/desliga do alerta por tenant — sempre ligado por padrão.
- Alerta de atraso pós-vencimento (cobrança de inadimplência) — este ciclo cobre só o lembrete preventivo (antes/no dia da parcela vencer), não o acompanhamento de parcela já vencida.
- Tela de configuração do limiar de ruptura — o campo existe no banco com default 0, mas não há UI pra editá-lo neste ciclo (herda o default até um ciclo futuro expor isso em Configurações).
- Personalização de horário ou dias de antecedência por tenant — fixo em D-3/D-0 às 7h para todos.

## Modelo de dados

**`tenants`** (existente) ganha uma coluna: `limiar_saldo_minimo_alerta numeric not null default 0`.

**`alertas_enviados`** (nova) — registro de dedup, mesmo espírito do `eventos_financeiros.import_key` já usado para idempotência de importação:
- `id`, `tenant_id`, `tipo` (novo enum `tipo_alerta`: `'resumo_equipe' | 'vencimento_cliente'` — só dois valores, porque a ruptura nunca é um e-mail à parte: ela é uma seção a mais dentro do mesmo dígest da equipe, não um envio independente), `destinatario_id` (`usuario_id` da equipe ou `pessoa_id` do cliente, conforme o tipo), `referencia_data` (date — a data de competência do alerta, não o timestamp de envio; é essa coluna que garante "uma vez por dia"), `enviado_em` (timestamptz).
- Índice único em `(tenant_id, tipo, destinatario_id, referencia_data)`.
- RLS: SELECT via `eh_staff_do_tenant` (mesmo padrão staff-only do resto do domínio); não há INSERT/UPDATE/DELETE de usuário — só o cron escreve aqui, via client admin (service role), então não precisa de policy de escrita.

**Sem tabela nova para o saldo projetado em si** — é sempre calculado on-the-fly, mesmo padrão de `buscarContasBancarias`/`buscarResumoVencimentos`, que já leem `vw_movimento_competencia_previsto` e agregam em memória; não existe "saldo armazenado" em nenhum lugar do sistema hoje.

## Cálculo do saldo projetado

Nova função `buscarSaldoProjetado(supabase, tenantId)` em `lib/relatorios/saldo-projetado.ts`:

1. **Saldo atual** = soma de `contas_financeiras.saldo_inicial` (contas ativas) + movimento de `vw_movimento_competencia_previsto` desde `saldo_inicial_data` até hoje — mesma lógica que `buscarContasBancarias` já usa para "saldo até hoje" em `contas-bancarias.ts`, somada entre todas as contas em vez de por conta individual.
2. **Para cada horizonte** (D+7, D+30, D+60): soma `valor` da view onde `data_vencimento` está entre amanhã e hoje+N, `status in (PENDENTE, RECEBIDO_PARCIAL, ATRASADO)` — mesmo filtro de "em aberto" que `buscarResumoVencimentos` já usa em `aging.ts`. Receita soma, despesa subtrai.
3. `saldoProjetado(N) = saldoAtual + receitasPrevistas(N) − despesasPrevistas(N)`.
4. `ruptura(N) = saldoProjetado(N) < tenants.limiar_saldo_minimo_alerta`.

Retorna `{ saldoAtual, projecoes: [{dias: 7, saldo, ruptura}, {dias: 30, saldo, ruptura}, {dias: 60, saldo, ruptura}], limiar }`.

Essa função alimenta tanto o card em `/indicadores` quanto o cron — o cron só olha `projecoes[0]` (D+7, o horizonte mais acionável), sem recalcular nada em duplicidade.

## Mecanismo do cron e dos e-mails

**Infraestrutura** — mesmo padrão já validado em `gerar-recorrencias`: uma migration registra `private.disparar_alertas_diarios()`, que lê os Vault secrets já existentes (`cron_target_url`, `cron_secret`) e chama `extensions.http_post` contra `/api/cron/alertas-vencimento`; `cron.schedule('alertas-diarios', '0 7 * * *', ...)`. A rota (`app/src/app/api/cron/alertas-vencimento/route.ts`) autentica via header `x-cron-secret` comparado com `timingSafeEqual` contra `process.env.CRON_SECRET`, igual à rota existente, e usa `createAdminClient()` para as operações.

**Fluxo do handler**, por tenant ativo:
1. Busca vencimentos D-3 e D-0 via `vw_movimento_competencia_previsto` (mesmo filtro de status), separando por `pessoa_id` e por tipo (RECEITA/DESPESA).
2. Chama `buscarSaldoProjetado` e usa `projecoes[0]` (D+7) para checar ruptura.
3. Monta o **dígest da equipe**: se há vencimento ou ruptura, um e-mail por membro ativo com papel financeiro, listando quantidade e valor total de parcelas a pagar e a receber vencendo hoje/em 3 dias, mais uma linha de alerta de ruptura se `projecoes[0].ruptura` for verdadeiro. Antes de enviar, verifica se já existe linha em `alertas_enviados` para `(tenant_id, tipo='resumo_equipe', usuario_id, hoje)`.
4. Monta o **e-mail do cliente**: agrupa as parcelas de receita D-3/D-0 por `pessoa_id`, envia um e-mail por pessoa com e-mail cadastrado, listando só as parcelas dela (nunca dados de outro cliente ou de despesas do tenant). Mesma checagem de dedup com `tipo='vencimento_cliente'`.
5. Grava a linha em `alertas_enviados` só depois que o envio SMTP confirma sucesso — mesmo padrão de "só marca como feito depois que o provedor confirma" já usado no fluxo de convite.

**Templates de e-mail** — novo módulo `lib/alertas/alertas-email.ts`, reaproveitando o transporter Nodemailer/Brevo já configurado em `convite-email.ts` (mesmas env vars: `BREVO_SMTP_HOST/USER/PASSWORD`, `BREVO_SENDER_EMAIL`). Dois templates:
- **Interno**: tom operacional ("Resumo do dia — Sistema Financeiro"), lista compacta de contagens e valores.
- **Externo**: tom de cobrança educada ("Lembrete: sua parcela vence em breve"), menciona só valor/vencimento/descrição da própria pessoa.

## UI

- **`/indicadores`**: novo card "Saldo projetado" com os 3 valores (D+7/D+30/D+60), cor de alerta (vermelho/âmbar) no horizonte que cruza o limiar — mesmo padrão visual dos cards de indicador já existentes.
- **Visão Geral**: reaproveita o padrão já existente do badge de concentração de risco — só aparece quando D+7 está em ruptura, mesmo tratamento visual condicional.
- Nenhuma tela de configuração nova neste ciclo: o limiar herda o default (0) até um ciclo futuro decidir expor edição em Configurações.

## Testes

- `buscarSaldoProjetado` bate com cálculo manual num cenário com múltiplas contas financeiras e parcelas de receita/despesa previstas em cada horizonte.
- Rodar o cron duas vezes no mesmo dia não duplica e-mail (dedup por `alertas_enviados`).
- E-mail de cliente nunca inclui parcela de outro `pessoa_id` nem dado de despesa/fornecedor do tenant.
- Pessoa sem e-mail cadastrado: não gera erro, só é pulada — o loop continua para as demais.
- Cenário de ruptura em D+7: aparece simultaneamente no card de `/indicadores` e no e-mail da equipe do mesmo dia.
- Cenário sem nenhum vencimento D-3/D-0 e sem ruptura: nenhum e-mail é enviado (não é um "relatório diário" incondicional, só dispara quando há algo a dizer).
