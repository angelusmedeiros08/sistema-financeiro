# Design — Fundação multi-tenant + Núcleo financeiro (Fase 0+1)

Status: aguardando revisão do usuário.

## 1. Contexto

Este é o primeiro sub-projeto de um sistema financeiro SaaS multi-tenant genérico para PME brasileira, concorrendo diretamente com Conta Azul/Omie. O produto completo (ERP financeiro + portal do cliente + BI) foi decomposto em fases; este documento cobre **Fase 0 (fundação multi-tenant)** e **Fase 1 (núcleo financeiro)** como um único ciclo de design, já que a Fase 1 só faz sentido construída sobre o modelo multi-tenant.

Este design é o resultado de uma fase extensa de pesquisa, documentada em `docs/`:

- `mapeamento-planilha-controle-financeiro.md` — planilha BI de referência do usuário (modelo de dados, DRE, DFC, aging, ponto de equilíbrio).
- `mapeamento-conta-azul-api.md`, `mapeamento-conta-azul-produto-ui.md`, `mapeamento-conta-azul-modulos-catalogo.md`, `mapeamento-conta-azul-modulos-plataforma.md` — mapeamento completo do concorrente principal (API pública, UX ao vivo, todos os módulos).
- `pesquisa-mercado-concorrentes-erp-financeiro-pme.md` — Omie, Bling, NIBO, BomControle, Granatum, Agilize, Contabilizei, Asaas.
- `pesquisa-arquitetura-ledger-multitenant.md` — Modern Treasury, Stripe, NetSuite/Sage Intacct, RLS em produção.
- `pesquisa-open-finance-conectividade-bancaria.md` — Open Finance Brasil, Pluggy, Belvo.
- `pesquisa-ia-fintech-contabilidade.md`, `pesquisa-ia-categorizacao-auto-lancamento.md`, `pesquisa-infraestrutura-fiscal-brasileira.md`, `pesquisa-ia-leitura-balanco-onboarding.md` — estado da arte de IA em contabilidade, infraestrutura fiscal brasileira (NF-e/NFS-e), e onde IA de fato ajuda vs. onde é regra determinística.
- `seguranca-e-escalabilidade.md` — addendum de segurança baseado em vulnerabilidades documentadas de software gerado com assistência de IA.

Cada decisão abaixo referencia a pesquisa que a embasou, em vez de repetir o argumento completo.

## 2. Escopo desta fase

**Dentro do escopo:**
- Multi-tenant real (isolamento de dados por tenant + suporte a contador/BPO gerindo várias empresas-cliente).
- Autenticação, autorização (RBAC) e vínculo usuário↔tenant N:N.
- Núcleo do ledger (partida dobrada) e a camada de domínio familiar (evento financeiro/parcela/baixa/rateio/categoria/centro de custo).
- Cadastros de suporte: pessoas (cliente/fornecedor), contas financeiras, categorias, centros de custo.
- Relatórios básicos: Fluxo de Caixa e DRE simples, o suficiente pra validar que o ledger está correto.
- Pontos de encaixe (não implementação completa nesta fase) para: Open Finance (Pluggy), infraestrutura fiscal (Distribuição DFe/Focus NFe), captura por IA.

**Fora do escopo desta fase** (fases seguintes, cada uma com seu próprio ciclo de design):
- Portal do cliente (Fase 2).
- BI avançado — orçado×realizado, YoY, ponto de equilíbrio, aging (Fase 3).
- Vendas, orçamentos, contratos recorrentes, produtos, serviços, estoque (Fase 4+).
- Implementação completa das integrações externas — nesta fase só o desenho do encaixe, não a integração funcionando ponta a ponta.

## 3. Arquitetura

### 3.1 Stack e isolamento multi-tenant

**Next.js (App Router, full-stack) + Supabase (Postgres + Auth + Storage)**, isolamento por `tenant_id` + Row-Level Security do Postgres.

Justificativa (`pesquisa-arquitetura-ledger-multitenant.md`, seção 5): RLS com shared-schema é a única abordagem que escala pra milhares de tenants sem o custo operacional de schema-per-tenant (catálogo do sistema inchando, vacuum degradando, migração rodando N vezes) ou database-per-tenant (limite de pool de conexão). A stack casa com o perfil "solo + IA" do time (aproveitamento do que já existe no ambiente: scaffold Next.js, Supabase já conectado).

**Checklist de segurança obrigatório pra essa escolha** (`seguranca-e-escalabilidade.md`, seção 1) — tratado como gate de CI, não recomendação:
- `FORCE ROW LEVEL SECURITY` em toda tabela multi-tenant.
- Role de runtime da aplicação separada da role de migração (nunca a mesma — bypass silencioso documentado é a causa nº1 de vazamento).
- `SET LOCAL app.tenant_id` por transação (nunca `SET` de sessão numa conexão de pool — pooler configurado em modo transação, compatível com isso).
- `tenant_id` como primeira coluna de todo índice composto.
- Nenhuma policy usa `USING (true)` — bloqueio automático em CI (grep na migration) se aparecer.
- Teste automatizado obrigatório por tabela sensível: tentar acesso cross-tenant, esperar falha — PR não sobe sem esse teste pra tabela nova.
- RLS é defesa em profundidade, não a única camada — toda rota/server action verifica pertencimento em `usuario_tenant` de forma independente.

### 3.2 Multi-tenancy com suporte a contador/BPO

Isolamento por `tenant_id` sozinho não atende o caso de um contador/BPO gerindo várias empresas-cliente (`pesquisa-arquitetura-ledger-multitenant.md`, seção 4 — distinção entre multi-tenant puro e multi-entity/multi-book, como NetSuite OneWorld/Sage Intacct resolvem). Solução: tabela de vínculo N:N `usuario_tenant`, com a política de RLS verificando *pertencimento* nessa tabela, não igualdade direta de `tenant_id`. Confirmado como padrão vencedor no mercado brasileiro por NIBO e BomControle (`pesquisa-mercado-concorrentes-erp-financeiro-pme.md`, seções 3 e 7.1).

## 4. Modelo de dados

### 4.1 Fundação multi-tenant

```
tenants          id, nome, cnpj, plano, criado_em
usuarios         id (= auth.users do Supabase), nome, email
usuario_tenant   usuario_id, tenant_id,
                 papel (admin | financeiro_senior | financeiro_junior | contador | cliente_portal),
                 ativo, convidado_em
```

### 4.2 Núcleo do ledger — partida dobrada, imutável, append-only

Justificativa (`pesquisa-arquitetura-ledger-multitenant.md`, seções 1-3): débito=crédito como invariante estrutural verificável pelo banco, não só por disciplina de código de aplicação. Modern Treasury e Stripe documentam publicamente que a ausência disso é a causa de falhas de reconciliação em escala (citam problemas públicos de Uber/Square/Airbnb). O modelo evento→parcela→baixa do Conta Azul não tem esse invariante embutido.

```
contas_contabeis   id, tenant_id, codigo, nome,
                   tipo (ATIVO | PASSIVO | PATRIMONIO_LIQUIDO | RECEITA | DESPESA),
                   natureza (DEVEDORA | CREDORA), conta_pai_id,
                   sistema (bool — conta técnica gerada automaticamente,
                   ex. "Contas a Receber", "Caixa e Bancos")

lancamentos        id, tenant_id, data_competencia, descricao,
                   origem (MANUAL | VENDA | COMPRA | TRANSFERENCIA |
                   OPEN_FINANCE | CAPTURA_IA | RENEGOCIACAO | ESTORNO),
                   referencia_id, estornado_de_id
                   — imutável: correção é sempre lançamento reverso novo,
                   nunca UPDATE/DELETE sobre um lançamento já publicado

partidas           id, lancamento_id, conta_contabil_id,
                   tipo (DEBITO | CREDITO), valor, moeda
                   — invariante: soma(débito) = soma(crédito) por lançamento e por moeda
```

### 4.3 Camada de domínio — UX familiar por cima do ledger

O usuário nunca interage diretamente com `lancamentos`/`partidas` — cria despesa, parcela, dá baixa; cada ação gera os lançamentos de débito/crédito corretos automaticamente por baixo.

```
categorias_financeiras   id, tenant_id, nome, tipo (RECEITA|DESPESA),
                         categoria_pai_id, conta_contabil_id, entrada_dre_id

centros_custo            id, tenant_id, codigo, nome, ativo

contas_financeiras       id, tenant_id, nome, banco, tipo, conta_contabil_id,
                         saldo_inicial, saldo_inicial_data

pessoas                  id, tenant_id, nome, documento, tipo_pessoa,
                         perfis[] (CLIENTE | FORNECEDOR | TRANSPORTADORA)

eventos_financeiros      id, tenant_id, tipo (RECEITA|DESPESA), pessoa_id,
                         data_competencia, valor_total, descricao,
                         documento_fiscal_id (opcional)

rateio                   evento_financeiro_id, categoria_id, valor,
                         rateio_centro_custo[] (centro_custo_id, valor)
                         — supera o modelo da planilha de referência (1
                         categoria + 1 centro de custo por linha), replica
                         o padrão do Conta Azul (rateio multi-nível)

parcelas                 id, evento_financeiro_id, numero, data_vencimento, valor,
                         status (PENDENTE|QUITADO|CANCELADO|RENEGOCIADO|
                         RECEBIDO_PARCIAL|ATRASADO|PERDIDO),
                         metodo_pagamento, conta_financeira_id

baixas                   id, parcela_id, data_pagamento,
                         composicao_valor (multa, juros, desconto, taxa),
                         conta_financeira_id, lancamento_id
```

### 4.4 Pontos de encaixe para integrações externas (schema documentado agora, tabelas criadas na fase em que cada integração for implementada)

As quatro tabelas abaixo **não fazem parte da migration inicial desta fase** — estão aqui só para que o formato de `eventos_financeiros`/`documentos_fiscais` já nasça compatível com o que essas integrações vão precisar, evitando redesenho de schema quando a fase de integração começar.

```
conexoes_bancarias    id, tenant_id, conta_financeira_id, pluggy_item_id,
                      status, ultima_sincronizacao

transacoes_importadas id, conexao_bancaria_id, data, valor, descricao_banco,
                      categoria_sugerida, status (PENDENTE_CONCILIACAO|
                      CONCILIADA|IGNORADA), baixa_id

documentos_fiscais    id, tenant_id, tipo (NFE|NFSE|NFCE), chave_acesso,
                      xml_bruto, origem (DISTRIBUICAO_DFE|UPLOAD|GATEWAY), status

capturas              id, tenant_id, canal (UPLOAD|WHATSAPP|EMAIL|DDA),
                      status (PENDENTE|PROCESSANDO|SUGERIDO|CONFIRMADO|RECUSADO),
                      evento_sugerido (jsonb), confianca_score,
                      evento_financeiro_id (quando confirmado)
```

Decisões de integração que já ficam registradas para quando essas fases começarem (não implementadas agora, mas informam o schema acima):

- **Conectividade bancária**: Open Finance via **Pluggy** desde o dia 1 em vez de conta digital própria — mesmo caminho que Conta Azul e Omie já adotaram (`pesquisa-open-finance-conectividade-bancaria.md`). Captura por IA fica como rede de segurança, não mecanismo primário.
- **Documento fiscal**: Distribuição DFe + Manifestação do Destinatário (grátis, via certificado digital do cliente) para NF-e/NFC-e, e API NFS-e Nacional (97% de cobertura) — ambos sem OCR. Gateway **Focus NFe** para começar. IA/OCR reservada só pros casos sem XML disponível (`pesquisa-infraestrutura-fiscal-brasileira.md`).
- **Classificação e auto-lançamento**: pipeline de 9 etapas com regra determinística no núcleo (CFOP/NCM → categoria) e IA só nas bordas (classificação quando a regra não cobre, detecção de anomalia, tradução de resultado em linguagem natural) — nunca o LLM calculando o número final (`pesquisa-ia-categorizacao-auto-lancamento.md`).
- **Leitura de balanço/DRE para onboarding**: tratada como copiloto de preenchimento de uma tabela de mapeamento (não substituição dela), com gate matemático obrigatório (Ativo = Passivo + PL) antes de qualquer saldo virar lançamento real — nenhum concorrente resolveu isso bem ainda, é espaço de diferenciação real mas de risco de efeito cascata (`pesquisa-ia-leitura-balanco-onboarding.md`).
- **Segurança específica de IA em produção**: texto extraído de documento (nota, boleto, mensagem) é sempre tratado como dado, nunca concatenado como instrução num prompt — mitigação de prompt injection contra o próprio classificador (`seguranca-e-escalabilidade.md`, seção 6).

## 5. Segurança

Ver `seguranca-e-escalabilidade.md` para o detalhamento completo. Resumo das regras que se aplicam a esta fase:

- RLS com `FORCE` + roles separadas + `SET LOCAL` + teste de cross-tenant obrigatório (seção 3.1 acima).
- Autenticação via Supabase Auth gerenciado, nunca implementação própria.
- Toda query parametrizada (nunca interpolação de string em SQL).
- Nenhum segredo (chave Pluggy, token Focus NFe, `service_role` do Supabase) no bundle client-side ou hardcoded — variável de ambiente/secrets manager.
- Certificado digital do cliente: evitar guardar o arquivo bruto na nossa infraestrutura sempre que possível; preferir que o gateway (Focus NFe) o segure.
- Security headers (CSP, HSTS, X-Frame-Options, etc.) configurados desde o primeiro deploy, não como pendência.
- Toda rota fechada por padrão (deny-by-default), rate limiting sempre no servidor.

## 6. Escalabilidade

Ver `seguranca-e-escalabilidade.md` para o detalhamento completo. Decisões que afetam o schema desta fase:

- `tenant_id` + `data_competencia` como índice composto desde o início em `lancamentos`/`partidas`/`transacoes_importadas` — para que particionamento por período seja mudança mecânica depois, não redesenho.
- Relatórios (DRE, Fluxo de Caixa) não competem com a escrita do ledger — planejar réplica de leitura ou view materializada conforme a base cresce, não calcular tudo on-the-fly contra a tabela viva desde o início.
- Trabalho assíncrono (sync bancário, processamento de documento fiscal, Captura) sempre em fila de background, fora do caminho crítico de requisição.

## 7. Tratamento de erro

- Toda operação que gera `lancamento`+`partidas` é atômica; falha parcial nunca fica persistida.
- Falha de integração externa: retry com backoff + fila de revisão manual, nunca falha silenciosa.
- Webhooks (Pluggy, Focus NFe) tratados como potencialmente duplicados — todo handler é idempotente por ID externo.
- Pipeline de IA com confiança baixa ou erro de extração: vai pra fila de revisão humana, nunca posta sozinho em caso de dúvida.
- Erro para o usuário é sempre genérico; detalhe fica em log privado, nunca na resposta HTTP.

## 8. Testes

- Motor de partida dobrada: teste unitário garantindo débito = crédito por moeda em todo lançamento — falha aqui bloqueia deploy.
- RLS: teste de integração de acesso cross-tenant esperando falha, por tabela sensível.
- Pipeline de classificação: teste de contrato (documento conhecido → sugestão esperada dentro da faixa de confiança).
- Caminho crítico ponta a ponta: criar despesa → parcela → baixa → ledger correto; importar transação Pluggy → concilia contra parcela existente.
- Checagem de reconciliação estrutural (soma de partidas por tenant líquida zero) como teste e como checagem agendada em produção.

## 9. Riscos e decisões em aberto

- **Custo real do Pluggy em escala**: o piso de R$2.500/mês precisa de confirmação de excedente por requisição junto ao time comercial antes de fechar o modelo de unit economics (`pesquisa-open-finance-conectividade-bancaria.md`, recomendação 2).
- **Onde o certificado digital A1 efetivamente reside**: decisão de design registrada (preferir que o Focus NFe o segure), mas o desenho técnico exato dessa integração fica para a fase em que a integração fiscal for implementada, não nesta.
- **Modelo de precificação do produto**: não decidido nesta fase — a pesquisa de concorrentes levantou 5 modelos distintos observados no mercado (por faturamento, por usuário+pedido, por usuário+empresa+módulo, plano único, grátis-pro-BPO+cobra-por-cliente-ativado), mas a escolha fica para quando o produto tiver tração o suficiente pra decidir com dado real.
- **"Design sem aparência de IA"**: diretriz registrada para a fase de desenho de interface (fora do escopo desta spec, que é backend/dados).

## 10. Fora de escopo desta fase, explicitamente

Portal do cliente, BI avançado, módulos comerciais (vendas/orçamento/contrato/produto/serviço/estoque), e implementação funcional completa de qualquer integração externa (Pluggy, Focus NFe, Captura) — todos ficam para ciclos de design próprios, cada um com sua spec.
