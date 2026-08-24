# Pesquisa — Captura de documento por IA: validação de boleto (gateways) e Claude via Vertex AI na prática

Quarta rodada (24/08/2026), aprofundando os dois pontos em aberto da rodada anterior.

---

## 1. Validação de boleto de terceiro — Asaas confirmado sem suporte; Celcoin e Kobana são alternativas reais

- **Asaas (nosso gateway)**: confirmado por leitura direta da doc completa — `POST /v3/bill` (pagamento de conta) não devolve beneficiário/CNPJ, só valida formato/integridade do próprio boleto. Sem endpoint de consulta prévia equivalente ao da Iugu.
- **Núclea/CIP direta**: acesso restrito a instituições autorizadas pelo BACEN (processo de credenciamento de meses, não viável pra um ERP SaaS). O caminho realista é sempre via um provedor já credenciado.
- **Celcoin**: tem endpoint equivalente à Iugu — `POST /v5/transactions/billpayments/authorize`, devolve `assignor`, `registerData.documentRecipient` (CPF/CNPJ do beneficiário), valores, datas. Consulta expira em 30 min. Exige contrato com produto "Pagamento de Contas" habilitado.
- **Kobana**: produto dedicado só de consulta (`POST /v2/data/bank_billet_queries`), parece a opção mais especializada — mas venda consultiva, sem preço público.
- **Iugu**: nenhuma evidência de "chamada avulsa sem contrato" — parece exigir conta ativa (mesmo no plano mais barato) pra acessar qualquer endpoint, incluindo validação. Precisa confirmação comercial direta.
- **Mitigação sem depender de nenhum gateway externo**: decodificar o CNPJ do beneficiário direto da linha digitável **não é confiável** (o "campo livre" é definido por cada banco emissor, sem padrão único) — descartar essa ideia. O que É viável sem integração externa: **comparar banco/agência/conta do boleto atual contra o histórico de pagamentos anteriores ao mesmo fornecedor** — se o fornecedor sempre recebeu pelo Banco X e o novo boleto aponta pro Banco Y, é sinal forte de adulteração, e isso é só consulta ao nosso próprio banco de dados, zero custo/dependência externa. Não substitui consulta à CIP (não pega fraude na primeira transação com um fornecedor novo), mas é uma camada real e barata.

**Conclusão**: validação forte (via CIP/Núclea) exige contratar Celcoin, Kobana ou Iugu especificamente pra isso — custo/burocracia de virar cliente de mais um provedor, não uma chamada de API solta. A mitigação de "comparar contra histórico do próprio fornecedor" é implementável já, sem esperar essa decisão.

Fontes: [Asaas — criar pagamento de conta](https://docs.asaas.com/reference/criar-um-pagamento-de-conta) · [Asaas — regras importantes](https://docs.asaas.com/docs/regras-importantes) · [Celcoin — pagamento de contas](https://developers.celcoin.com.br/docs/pagamento-de-contas-1) · [Kobana — consultas boleto/Pix](https://www.kobana.com.br/funcionalidades/consultas-boleto-e-pix) · [Iugu — validar pagamento](https://dev.iugu.com/reference/baas-validar-pagamento)

## 2. Claude via Vertex AI na prática — achado que muda a conclusão anterior

- **SDK oficial existe** (`@anthropic-ai/vertex-sdk`), API idêntica ao SDK direto — migração de código é trivial.
- **Autenticação é genuinamente mais complexa**: hoje é uma `ANTHROPIC_API_KEY`; via Vertex passa a ser Google Cloud IAM/service account — funciona no Vercel (JSON da service account numa env var), mas com gestão de credencial mais pesada (rotação manual, permissão IAM, risco de uma credencial mais poderosa vazando).
- **Achado crítico que muda a recomendação da rodada anterior**: a doc oficial da Anthropic diz literalmente **"Specific regional endpoints support Claude Sonnet 4.6 and earlier; newer models use the global or multi-region endpoints"** — ou seja, pra Opus 5/Sonnet 5 (os modelos atuais, os que usaríamos), **pode não existir um endpoint fixo em São Paulo** — só "global" (roteamento dinâmico, sem garantia de local) ou "multi-region" (`us`/`eu` — nenhum `latam`/`br`). A "residência de dados no Brasil" que motivou considerar Vertex em primeiro lugar pode simplesmente não estar disponível pro modelo que usaríamos.
- **A cobertura contratual de LGPD (SCCs) provavelmente continua valendo mesmo sem residência física no Brasil** — evidência forte (não 100% literal) de que "Generative AI on Vertex AI" está dentro do escopo do Apêndice 4 do CDPA, que é o mesmo apêndice referenciado pelas SCCs brasileiras. Ou seja: o ganho de Vertex não é mais "processa no Brasil", é "tem cláusula contratual LGPD nomeada mesmo processando fora" — ainda um ganho real, mas menor que o imaginado.
- **Preço**: mesma tabela nominal da API direta, mas com **sobretaxa de 10%** pra fixar um endpoint regional/multi-region (em vez de usar o "global"). Cache automático (implícito) não existe no Vertex — só cache manual via `cache_control`, que já era o plano.
- **Zero Data Retention**: regido pelos termos do Google Cloud, não da Anthropic — logging de request/response é opt-in e fica no projeto GCP do próprio cliente, sem acesso do Google/Anthropic por padrão.

**Conclusão**: usar Vertex AI ainda dá uma cobertura contratual de LGPD mais nomeada, mas **não entrega mais "dado processado fisicamente no Brasil"** pros modelos atuais — o benefício ficou mais estreito, e o custo de engenharia (gestão de credencial GCP) é real e imediato. Isso muda o cálculo: a decisão vira "aceitar mais complexidade de infraestrutura por uma cláusula contratual mais forte" em vez de "aceitar mais complexidade por dado no Brasil + cláusula mais forte".

Fontes: [Anthropic — Claude on Vertex AI](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai) (fonte principal, oficial) · [anthropic-sdk-typescript/vertex-sdk](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/packages/vertex-sdk/README.md) · [Google Cloud — services in scope](https://cloud.google.com/security/compliance/services-in-scope) · [Google Cloud — BR SCCs](https://cloud.google.com/sccs/br-c2p)

---

## Atualização da recomendação

Com este achado, a escolha entre API direta da Anthropic e Vertex AI deixou de ser "óbvia a favor de Vertex" — é um trade-off genuíno: API direta é mais simples de operar mas com gap de LGPD documentado; Vertex tem cláusula LGPD mais forte mas sem o benefício de residência física que se imaginava, e custa complexidade de infraestrutura real. Ambos os caminhos usam o mesmo modelo Claude por baixo — dá pra começar com a API direta (mais simples) e migrar pra Vertex depois, se a resolução do gap LGPD com a Anthropic direta não avançar, sem re-desenhar a lógica de extração (só a camada de chamada à API muda).
