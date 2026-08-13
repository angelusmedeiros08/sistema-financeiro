# Mapeamento técnico — API pública do Conta Azul (developers.contaazul.com)

Leitura intensiva da documentação oficial (portal `developers.contaazul.com`, versão atual/v2, produção `https://api-v2.contaazul.com`), feita via navegador (a documentação bloqueia fetch direto por bot-protection, então foi lida com um navegador real) mais a especificação OpenAPI completa de cada domínio, baixada e parseada em runtime. Complementada com a API legada (v1, `api.contaazul.com`, em desativação) via documentação não-oficial, para contexto histórico do modelo de dados.

Isto é insumo de pesquisa — ainda não é o desenho do sistema próprio.

---

## 1. Padrões técnicos gerais

- **Estilo**: REST, JSON, OAuth 2.0 (fluxo Authorization Code — o mais seguro, para apps que agem em nome de um usuário).
- **Servidor de produção**: `https://api-v2.contaazul.com`. Cada domínio também expõe um **mock server** próprio (`https://developers.contaazul.com/_mock/...`) para testar sem afetar dados reais.
- **Paginação**: `page`/`size` (nota: um artigo de ajuda mais antigo cita `pagina`/`tamanho_pagina` — a documentação atual usa `page`/`size`; provável evolução entre versões do v2).
- **Datas**: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`).
- **Rate limit**: **600 requisições/minuto e até 10/segundo por conta conectada do ERP** (429 se exceder — recomudam backoff exponencial).
- **Token**: access_token expira em 1h; refresh_token dura 2 semanas e **só pode ser usado uma vez** (rotação obrigatória a cada refresh).
- **Sem sandbox dedicado**: conta de desenvolvedor de teste com validade de 30 dias (extensível).
- **Sem webhooks**: tudo é *pull* — a aplicação cliente precisa fazer polling. Há um endpoint dedicado para descobrir o que mudou (`GET /v1/financeiro/eventos-financeiros/alteracoes` — retorna IDs de eventos financeiros alterados num período), que é o substituto pobre de webhook.
- **Sem SDKs oficiais** — só HTTP+JSON cru (a doc gera snippets de exemplo em curl/JS/Node/Python/Java/C#/PHP/Go/Ruby/R).
- **Processamento assíncrono para escrita financeira**: criar um evento financeiro não é síncrono — a API devolve um **protocolo** (`ProtocolResponseDTO {status: PENDING|SUCCESS|ERROR}`), e o cliente precisa consultar `GET /v1/protocolo/{id}` até o status mudar. É um padrão de fila, não de escrita direta.

## 2. As 10 áreas da API (estrutura oficial do portal)

| Área | Path base | Descrição oficial |
|---|---|---|
| 🔐 Autenticação | `/auth` | OAuth2, credenciais, metadados |
| 💰 Financeiro/Cobranças/Baixas | `docs/financial-apis-openapi` | Contas a pagar/receber, baixas, conciliação, cobranças, despesas |
| 🧾 Vendas | `docs/sales-apis-openapi` | Criação/consulta/atualização de vendas |
| 👥 Pessoas/Fornecedores | `open-api-docs/open-api-person` | Clientes, fornecedores, transportadoras |
| 📦 Produtos e Serviços | `open-api-docs/open-api-inventory` + `open-api-docs/open-api-service` | Catálogo, estoque, valores |
| 🧮 Notas Fiscais | `open-api-docs/open-api-invoice` | Consulta de NF-e (NFS-e "em breve") |
| 📑 Contratos | `docs/contracts-apis-openapi` | Vendas recorrentes automáticas |
| 📋 Orçamentos | `docs/open-api-proposal` | Propostas comerciais (pré-venda) |
| 🔄 Protocolos | `docs/protocol-apis-openapi` | Acompanhar processamento assíncrono |
| 📸 Captura | `open-api-docs/developer-platform-open-api-capture` | OCR/IA: extrai lançamento financeiro de um documento (boleto/nota) enviado |

---

## 3. Financeiro (o núcleo, mais relevante ao nosso projeto)

### 3.1 Modelo central: Evento Financeiro → Parcelas → Baixas

A unidade atômica **não é a "conta a pagar/receber"** diretamente — é o **Evento Financeiro** (`POST /v1/financeiro/eventos-financeiros/contas-a-receber` ou `.../contas-a-pagar`), que ao ser criado se desdobra em uma ou mais **Parcelas** (via `condicao_pagamento.parcelas`, suporta parcelamento nativo desde a criação — algo que a planilha SFB **não tinha**). Cada Parcela pode receber uma ou mais **Baixas** (pagamentos parciais, com sua própria composição de valor: multa, juros, desconto, taxa) — ou seja, **pagamento parcial e parcelamento são de primeira classe no Conta Azul**, diferente da planilha de referência (que só tinha "pago" binário).

- **`EventoFinanceiroRequest`**: `data_competencia`, `valor`, `descricao`, `contato` (pessoa), `conta_financeira`, `rateio[]`, `condicao_pagamento` (lista de parcelas).
- **`Parcela`**: `status` enum `PENDENTE | QUITADO | CANCELADO | RENEGOCIADO | RECEBIDO_PARCIAL | ATRASADO | PERDIDO` — bem mais rico que "pago/não pago" da planilha. Tem `data_vencimento`, `data_pagamento_previsto`, `valor_pago`, `nao_pago`, `metodo_pagamento` (23 valores possíveis: PIX, boleto, cartão, vale-alimentação, cashback, débito automático etc.), `conciliado` (flag de conciliação bancária), `anexos[]`, `solicitacoes_cobrancas[]`, `renegociacao`.
- **`Baixa`**: `data_pagamento`, `valor_composicao` (multa/juros/desconto/taxa/bruto/líquido), `conta_financeira`, `metodo_pagamento`, `origem` (de onde veio o pagamento — venda, transferência, importação de documento etc.), `id_reconciliacao`.
- **`ContaAReceber`/`ContaAPagar`** (as "views" de leitura, retornadas por `GET .../buscar`): `status_traduzido` enum `PERDIDO | RECEBIDO | EM_ABERTO | RENEGOCIADO | RECEBIDO_PARCIAL | ATRASADO`, `total`, `pago`, `nao_pago`, `data_competencia`, `data_vencimento`, `categorias[]`, `centros_custo[]`, `cliente`/`fornecedor`.

### 3.2 Rateio (cost splitting) — divisão de um único lançamento entre categorias e centros de custo

Um evento financeiro pode ser dividido (`rateio: CategoriaRateio[]`) entre **múltiplas categorias**, e dentro de cada categoria entre **múltiplos centros de custo** (`rateio_centro_custo: CentroCustoRateio[]`), cada um com seu próprio valor em R$. Ex.: uma conta de R$100 pode ser 60% "Aluguel"/Centro A e 40% "Aluguel"/Centro B — tudo dentro do mesmo lançamento, com a soma dos valores do rateio validada contra o total da parcela. **Isso é estruturalmente mais avançado que a planilha SFB**, que só permitia 1 categoria + 1 centro de custo por linha.

### 3.3 Categorias e DRE — plano de contas como estrutura hierárquica nativa

- **`Categoria`**: `categoria_pai` (hierarquia pai/filho nativa via FK, não texto livre como na planilha), `tipo`, `entrada_dre` (aponta para qual linha do DRE essa categoria alimenta), `considera_custo_dre` (boolean).
- **`CategoriaDRE`** (`GET /v1/financeiro/categorias-dre`): `codigo`, `posicao`, `indica_totalizador` (boolean — é subtotal ou linha de detalhe), `representa_soma_custo_medio`, `subitens[]` (hierarquia), `categorias_financeiras[]` (quais categorias do plano de contas alimentam essa linha). **Isso é conceitualmente idêntico** à tabela `tbTotalizadoresDRE` que mapeamos na planilha SFB (linha de DRE como dado configurável, com flag de totalizador e vínculo às categorias/subitens) — confirma que "estrutura de DRE como dado parametrizável" é o padrão de mercado, não invenção da planilha.
- **`GET /v1/categorias/configuracao-padrao`**: retorna um de-para de **tipos de operação especiais pré-mapeados** (fretes recebidos/pagos, impostos retidos em vendas, descontos incondicionais/financeiros obtidos e concedidos, multas e juros recebidos/pagos, tarifas, perdas) para as categorias reais do usuário — ou seja, o Conta Azul reconhece esses ~13 "tipos de operação" contábeis como conceitos de primeira classe do sistema, independente de como o usuário nomeou a categoria.

### 3.4 Contas financeiras

`ContaFinanceira`: `banco` (enum com ~85 bancos/fintechs brasileiros — Itaú, Nubank, Stone, Asaas, Mercado Pago, PicPay, C6, Inter etc.), `tipo` enum `APLICACAO | CAIXINHA | CONTA_CORRENTE | CARTAO_CREDITO | INVESTIMENTO | MEIOS_RECEBIMENTO | POUPANCA | COBRANCAS_CONTA_AZUL | RECEBA_FACIL_CARTAO` — as duas últimas são **contas financeiras "virtuais" que representam produtos próprios do Conta Azul** (cobrança via boleto/PIX gerado por eles, e maquininha/link de cartão "Receba Fácil") — ou seja, o próprio ERP também atua como meio de pagamento/adquirente, não só como livro-razão.

### 3.5 Cobrança / dunning como API de primeira classe

`SolicitacaoCobranca`: cria boleto, boleto registrado, link de pagamento ou cobrança PIX associados a uma parcela, com ciclo de vida próprio (`status_solicitacao_cobranca` enum: `AGUARDANDO_CONFIRMACAO → REGISTRADO → PAGO/QUITADO`, ou `CANCELADO/INVALIDO/EXPIRADO/FALHA_EMISSAO/EXTORNADO`). `NotificacaoCobranca` dispara lembretes por **e-mail, SMS e WhatsApp**, com rastreio de entrega por item (`ItemNotificacaoCobranca.status_entrega: ENVIADO|INVALIDO`) e de abertura (`aberto_em`). **Isso é diretamente relevante** ao histórico do escritório com automação de cobrança (`AutoCobr`) — é essencialmente o mesmo domínio de problema que vocês já automatizam manualmente hoje, só que como produto nativo do ERP concorrente.

### 3.6 Renegociação e transferências

- `Renegociacao`/`RenegociacaoContaAReceber` tratam renegociação de dívida como entidade própria, referenciando o evento original.
- `TransferenciaContaFinanceira`: transferência entre contas financeiras é modelada com `origem`/`destino`, cada lado com sua própria composição de valor (permite transferência com taxa/desconto assimétrico, ex. saque com tarifa).

### 3.7 Rastreabilidade de origem

`Referencia.origem` (enum): `LANCAMENTO_FINANCEIRO | DAS | FOLHA | TRANSFERENCIA | SALDO_CONTA_BANCARIA | VENDA | COMPRA | VENDA_AGENDADA | COMPRA_AGENDADA | IMPORTACAO_DOCUMENTO | IMPOSTO_RETIDO | SIC | NOTA_COMPRA | ANTECIPACAO | RENEGOCIACAO | HONORARIOS_CONTABEIS`. Confirma que **todo módulo do ERP (vendas, compras, folha, impostos, importação de extrato, honorários contábeis) desagua no mesmo ledger financeiro** — arquitetura de "livro-razão único" com múltiplas origens, o mesmo princípio da tabela `fLctos` da planilha, só que aqui com FK real de proveniência em vez de campo solto.

---

## 4. Vendas, Orçamentos e Contratos — o funil comercial que alimenta o financeiro

- **Orçamento** (`Orcamento`, situação `ORCAMENTO`) pode virar **Venda** (`Negociacao`, situação `VENDA`/`APROVADO`/`FATURADO`), que por sua vez pode gerar um **Evento Financeiro** automaticamente (campo `evento_financeiro` na resposta de venda) — funil linear Orçamento → Venda → Financeiro, cada etapa com seu próprio `id` mas rastreável.
- **Contrato** (`docs/contracts-apis-openapi`) automatiza esse funil para receita recorrente: define `Termo` (frequência mensal/anual, dia de emissão, data fim ou "nunca expira") e a cada ciclo gera automaticamente uma nova Venda (`ContratoToCreateResponse.id_venda`) — é a modelagem de assinatura/mensalidade recorrente. **Muito relevante**: se o sistema próprio for cobrar clientes recorrentemente (ex. mensalidade de honorários, ou se for oferecido como SaaS a terceiros), esse é o padrão de referência (contrato → geração automática de venda/cobrança por periodicidade).
- **Item de venda** tem `tipo` enum `PRODUTO | SERVICO | ATIVOS_IMOBILIZADOS | FINANCEIRO | KIT_PRODUTOS` — um lançamento de venda pode misturar produto físico, serviço, ativo imobilizado e um item puramente financeiro na mesma negociação.
- **Pendências de venda** (`TipoPendente` enum): `RESERVA_DE_ESTOQUE | CONCILIACAO_ITENS | PROCESSAMENTO_RESERVA_DE_ESTOQUE | ESPERANDO_CONFIRMACAO | AGUARDANDO_GERACAO_NOTA_FISCAL` — mostra os pontos de espera/workflow que uma venda atravessa antes de ser considerada completa.

## 5. Captura — extração assistida por IA de lançamentos a partir de documentos

Fluxo: `POST /v1/captura/documentos` (envia um PDF/imagem de boleto/nota) → `GET /v1/captura/documentos/status` (polling) → `GET /v1/captura/{id}` retorna uma **prévia de evento financeiro sugerido** (`PreviaEventoFinanceiro`: fornecedor, categoria, centro de custo, valor, parcelas, data de competência — tudo já pré-preenchido pela extração) → o usuário confirma (`POST /v1/captura/{id}`, vira evento financeiro real) ou recusa (`DELETE /v1/captura/{id}`). É basicamente "tire uma foto do boleto e o sistema sugere o lançamento pronto para revisão" — um padrão de UX que reduz radicalmente o trabalho manual de digitação, e que temos know-how adjacente no escritório (extração automatizada de dados de documentos/boletos já aparece nos projetos AutoCobr).

## 6. Pessoas, Produtos e Serviços — cadastros

- **Pessoas** (`Pessoa`): um único cadastro para cliente/fornecedor/transportadora, diferenciado por `perfis[].tipo_perfil` (uma pessoa pode ser cliente E fornecedor ao mesmo tempo). Campos ricos: `atrasos_pagamentos`/`atrasos_recebimentos` (contadores), `pagamentos_mes_atual`/`recebimentos_mes_atual`, `lembretes_vencimento[]`, `mensagem_pagamentos_abertos` (resumo de pendências direto no cadastro da pessoa), `inscricoes[]` (múltiplas inscrições estaduais/municipais/suframa — relevante para empresas com múltiplos estabelecimentos), `optante_simples_nacional`.
- **Produtos**: suporta kit de produtos (`detalhe_kit`), variações (tipo/opção, ex. tamanho/cor), estoque (mínimo/máximo/disponível/reservado/custo médio), dados fiscais (NCM, CEST, unidade de medida), e-commerce (categoria, marca, SEO) — claramente dimensionado para quem vende produto físico com controle de estoque, não é o foco do nosso caso de uso jurídico/serviços.
- **Serviços**: mais simples — código, custo, preço, cenário de tributação (ISS/INSS por município), natureza operacional. Mais próximo do nosso caso (escritório presta serviço, não vende produto).

## 7. Contraste com a API legada (v1, `api.contaazul.com`, em desativação)

A v1 (documentada de forma não-oficial) tinha um modelo mais simples e menos granular: `Statement` (lançamento único, sem parcelas/baixas separadas, com `repeatingCycle` simples para recorrência), `Deal` (venda/compra como uma única entidade com `items[]` e `payments[]` embutidos, sem o conceito de Evento→Parcela→Baixa), `FinanceCategory` plana (sem hierarquia `categoria_pai`, sem vínculo a DRE). A evolução para v2 mostra uma tendência clara de design que vale copiar: **separar o "compromisso financeiro" (evento) do "cronograma de pagamento" (parcela) do "pagamento efetivo" (baixa)** — três entidades, três granularidades, em vez de uma linha só fazendo tudo (que é exatamente a limitação que identificamos na planilha SFB).

## 8. O que isso muda em relação ao que aprendemos da planilha

| Conceito | Planilha SFB (Excel) | Conta Azul (API v2) |
|---|---|---|
| Granularidade do lançamento | 1 linha = 1 fato completo | Evento → N Parcelas → N Baixas (parcelamento e pagamento parcial nativos) |
| Categoria/Centro de Custo | 1 categoria + 1 centro de custo por linha, texto livre | `rateio[]`: N categorias × N centros de custo por evento, com FK real |
| Status do lançamento | binário (Data_Pagamento vazia ou não) | enum rico (`PENDENTE/QUITADO/RENEGOCIADO/RECEBIDO_PARCIAL/ATRASADO/PERDIDO...`) |
| Plano de contas | 30 grupos numerados fixos em abas | `Categoria` hierárquica (`categoria_pai`) + `CategoriaDRE` configurável, com "tipos de operação" especiais pré-mapeados |
| Multi-tenant | inexistente (Empresa é só uma coluna) | Cada conta conectada via OAuth é 1 tenant; API sempre no contexto da empresa autenticada |
| Cobrança/dunning | fora do escopo | de primeira classe: boleto/PIX/link + notificação multi-canal com rastreio |
| Renegociação/parcial | fora do escopo | de primeira classe |
| Origem multi-módulo | só "Lançamentos" manuais | `Referencia.origem` rastreia proveniência de 15 módulos diferentes (venda, compra, folha, imposto, importação...) |
| Rastreamento de mudanças | nenhum (arquivo estático) | `GET .../alteracoes` (poll de IDs alterados) — supre a ausência de webhooks |

Essas duas leituras (planilha + API) já dão uma base de comparação direta: a planilha ensina **como organizar visualmente os relatórios financeiros** (DRE, DFC, aging, ponto de equilíbrio, orçado×realizado) de forma reutilizável; o Conta Azul ensina **como estruturar o ledger por trás desses relatórios** de forma robusta o suficiente para um ERP real, multiempresa, com cobrança e parcelamento. O próximo passo (navegação ao vivo do produto) deve focar em ver como essas duas camadas se conectam na prática — a UX de lançar, conciliar, e o que aparece nos relatórios visuais do Conta Azul.
