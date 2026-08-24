# Pesquisa — Captura de documento por IA: como o mercado faz

Pesquisa externa aprofundada (24/08/2026), complementando `pesquisa-ia-categorizacao-auto-lancamento.md` (que cobriu a arquitetura de pipeline em abstrato) com evidência concreta de como produtos reais implementam a experiência: Conta Azul (pesquisado à parte, ver abaixo), concorrentes brasileiros, especialistas internacionais em AP automation, plataformas de contabilidade mainstream, e fintechs modernas de gestão de gastos. 4 pesquisadores em paralelo, navegação real (WebFetch/WebSearch), ~25 fontes distintas.

---

## 0. Conta Azul (pesquisado antes desta rodada, incluído aqui por completude)

Feature: **"Conta AI Captura"** (menu "Importações"). 4 canais: upload direto (10MB), WhatsApp arquivo (5MB) ou **texto puro** com `#importações`/`#captura` (sem anexo), e-mail dedicado, e upload inline nas telas de Contas a Pagar/Receber. Um único arquivo pode virar **múltiplos lançamentos** (fatura de cartão lida lançamento a lançamento, PDF com várias notas). **A IA decide sozinha Despesa vs Receita**, com correção pós-hoc via botão "Transformar em Receita/Despesa". Categoria repete a última usada para aquele fornecedor. Fornecedor é criado automaticamente se não existir — erro documentado: a IA às vezes sugere a própria empresa do usuário como fornecedor em vez do emissor real. Fila central lista todo documento pendente até ser salvo. Texto oficial: "Nenhuma IA acerta 100% dos casos — sempre revise antes de salvar."

Fontes: [Conta AI Captura: como funciona](https://ajuda.contaazul.com/hc/pt-br/articles/36240294322445-Conta-AI-Captura-como-funciona) · [Como revisar e editar lançamentos importados](https://ajuda.contaazul.com/hc/pt-br/articles/46021620224013-Importa%C3%A7%C3%B5es-como-revisar-e-editar-lan%C3%A7amentos-importados) · [Página comercial](https://contaazul.com/funcionalidades/conta-ai/)

---

## 1. Concorrentes brasileiros — nenhum replica o modelo da Conta Azul

**Achado central: a Conta Azul está genuinamente à frente do mercado brasileiro de PME nesse desenho específico de produto.**

- **Omie**: sem equivalente unificado. O mais próximo é DDA via Omie.CASH (só boletos, sem WhatsApp/e-mail, cria conta a pagar automaticamente mas cai em fila de revisão antes de virar lançamento definitivo). Nota de entrada (XML) → conta a pagar é manual (checkbox). "Omie IA.Fiscal" não lê documento externo, só sugere impostos em notas de saída.
- **Bling**: sem captura de documento por IA/OCR. Tem um assistente de chat que cria conta a pagar via **comando de texto digitado**, não upload.
- **Nibo**: IA existe mas é escopada para **conciliação bancária/extrato**, não para "documento de fornecedor → lançamento a pagar". Confirma parcialmente o padrão "aprende com a primeira correção, sem tela de configuração" (usado como referência pro nosso `regras_categorizacao`), mas aplicado à categorização de transação bancária, não à captura de documento.
- **Conta Simples**: modelo *inverso* e mais recente (jul/2026) — "Conferência Automatizada de Despesas": a IA roda a cada transação de **cartão corporativo próprio** (não upload de documento), vincula a nota fiscal correspondente automaticamente, notifica só exceção. Meta declarada: >95% das transações chegando ao fechamento já conferidas sem intervenção humana — é o único concorrente com número de autonomia publicado. Parte de uma estratégia declarada de "banco agêntico B2B". Referência estratégica interessante, não comparável 1:1 (não gera lançamento contábil formal, é conferência de cartão).
- **Tiny/Olist, eGestor**: só o padrão antigo de XML de NF-e estruturado, sem OCR/IA de documento não-estruturado.

Fontes: ver relatório completo do agente (Omie: ajuda.omie.com.br × 3 artigos + store.omie.com.br; Bling: ajuda.bling.com.br; Nibo: ajuda.nibo.com.br × 3 artigos; Conta Simples: tiinside.com.br, em.com.br, startups.com.br; Tiny/eGestor: fontes de terceiros).

---

## 2. Especialistas internacionais em AP automation (Rossum, Mindee, Nanonets, Stampli, Tipalti)

Mercado maduro, preço de escala empresarial (Rossum: US$18k/ano+; Nanonets: consumo, ~US$2/fatura ponta a ponta; Tipalti: a partir de US$99/mês). Padrões relevantes:

- **Score de confiança configurável por fila/campo é o modelo mais maduro** — Rossum: threshold padrão de auto-post é **97,5%** (2,5% de erro tolerado), ajustável por campo, porque campos diferentes toleram erro diferente; a própria doc reconhece que "alguns clientes aceitam 75%, outros exigem 99%" — o trade-off é do cliente, não fixo no produto.
- **Mindee**: 4 níveis de confiança coloridos (Certain/High/Medium/Low), score baseado em **consenso entre múltiplos modelos independentes**, não probabilidade simples de um único modelo.
- **Stampli**: esconde o número, expõe só comportamento — sugestão "soft" (lista de opções) vs. "strong" >80% (preenche sozinho). UX mais simples de comunicar que um score numérico.
- **Duplicidade em múltiplas camadas, não só no upload**: Stampli roda checagem em 5 pontos do ciclo (upload → revisão → despacho → liberação → export); Rossum compara hash exato primeiro, depois regras fuzzy configuráveis (vendor+valor+data, tolerando variação de formatação).
- **Nenhuma das 5 documenta publicamente como fica visualmente a tela de correção de item de linha múltiplo** — lacuna consistente; o que existe de mais concreto é o conceito de "templates de alocação" da Stampli (% pré-definido por linha, aprendido do padrão de fatura recorrente).
- **GL coding automático por linha com ~95% de acurácia** é o número mais citado entre acurácia de classificação contábil (Tipalti Auto-Coding AI).

Fontes: knowledge-base.rossum.ai (×4), rossum.ai (×2), docs.mindee.com (×2), mindee.com (×2), nanonets.com (×3), stampli.com (×5), tipalti.com (×4).

---

## 3. Plataformas mainstream (QuickBooks, Xero/Hubdoc, Dext, AutoEntry)

- **QuickBooks nativo é a opção mais fraca tecnicamente**: só extração de cabeçalho (sem linha a linha), **múltiplos recibos numa imagem confundem o sistema** (recomendação oficial: 1 recibo por arquivo) — cautionary tale direto pro nosso desenho de "1 arquivo pode virar N lançamentos", que precisa ser bem testado, não assumido como trivial.
- **Xero/Hubdoc**: 1 documento → 1 rascunho de bill (não quebra em múltiplos). Tem "Supplier Rules" que pode **pular a revisão inteiramente** pra fornecedores recorrentes de baixo risco — as próprias fontes descrevem isso como arriscado pra documentos que exigem julgamento contábil. Reforça que nossa decisão de "sempre revisão humana" é a escolha conservadora correta, não uma limitação.
- **Dext (ex-Receipt Bank) é a ferramenta mais madura e especializada** entre as pesquisadas nessa categoria: extração linha a linha real, "Smart Split" (divide fatura em múltiplas linhas com contas contábeis diferentes automaticamente), modo de e-mail `@multiple.dext.cc` onde cada página de um PDF vira um item separado (cobre fatura de cartão com várias páginas). Estados de item: **"To Review"** (falta algo) vs. **"Ready"** (passou em todas as checagens, pronto pra publicar com 1 clique) — padrão de UX direto e replicável.
- **AutoEntry**: fluxo declarado em 3 etapas — **Capture → Categorise → Publish**. Cobra "3 créditos por página" pra extrato bancário/cartão, confirmando que cada página vira itens separados.
- **Acurácia "99%+" é alegação de marketing recorrente** (Dext, AutoEntry) sem metodologia publicada verificável — tratar com ceticismo, não como benchmark a perseguir cegamente.

Fontes: quickbooks.intuit.com, gentlefrog.com, certumsolutions.com, invoicedataextraction.com; central.xero.com, hubdoc.com, blog.xero.com, learn.hubdoc.com, expensent.com (×2); dext.com (×3), help.dext.com (×3); autoentry.com, ca-marketplace.sage.com.

---

## 4. Fintechs modernas de spend management (Ramp, Brex, Bill.com, Ottimate, Stampli)

A categoria com a UX mais avançada — vale estudar os padrões de interação, não só a capacidade técnica.

- **Multi-canal de baixíssimo atrito**: Ramp e Brex aceitam SMS, WhatsApp, Slack, e-mail — "responder a uma mensagem" em vez de "abrir o app e navegar até um formulário".
- **Captura server-side proativa** (o extremo mais avançado): a Ramp busca o recibo direto com o fornecedor usando dados da transação (nome, e-mail, 4 últimos dígitos do cartão), **sem nenhuma ação do usuário**, hoje coberto pra uma lista fechada de fornecedores (Adobe, companhias aéreas, Walmart).
- **Revisão por exceção é o padrão**, não "confirmar item por item": o sistema processa tudo, o humano só vê o que ficou com baixa confiança ou foi sinalizado. Ramp: submissão de 1 clique quando a confiança é alta, resultou em 34% menos revisões manuais.
- **Confiança progressiva/adaptativa**: o nível de automação da Ramp se ajusta conforme o usuário aceita sugestões anteriores (memo auto-preenchido sem revisão em categorias de baixo risco).
- **Matching tolerante, não exato**: Brex considera um recibo "verificado" batendo **2 de 3 campos** (data/valor/merchant) — tolera ruído de OCR/formatação em vez de exigir match perfeito. Relevante pro nosso caso: razão social vs. nome fantasia do fornecedor brasileiro varia muito.
- **Duplicidade como aviso explícito, nunca bloqueio silencioso** (Bill.com, Stampli).
- **Stampli: documento como hub de colaboração persistente** — em vez de uma tela de revisão isolada, cada fatura vira uma "conversa" (comentários, perguntas, aprovações) ancorada nela — o diferencial de UX mais distinto encontrado em toda a pesquisa. Fora de escopo pra nós agora (exige workflow de aprovação multi-pessoa que não temos), mas vale lembrar se o sistema crescer nessa direção.
- **Bill.com confirma divisão automática de documento**: detecta e separa automaticamente múltiplas faturas contidas num único arquivo multi-página — mesmo padrão que decidimos adotar.

**Achado técnico mais acionável de toda a pesquisa** — post de engenharia da Ramp ("Automating Receipt Collection", abr/2026): testaram 3 versões do matching recibo↔transação.
- v1 (comparação de string determinística pura) falhou com variação de formatação/OCR.
- v2 (1 chamada de LLM perguntando merchant+data+valor tudo de uma vez) teve só **66% de precisão e 18% de recall**.
- v3, a que foi pro ar: **híbrida** — extração determinística (`String.dataDetectorMatches`, nativo do SO) pra data e valor; o LLM é usado **só** pro matching de nome do fornecedor (a única parte genuinamente ambígua). Resultado: recall mais que dobrado, precisão de **87%**, 3x mais rápido, e caiu de 3 chamadas de LLM pra 1.

Isso confirma com evidência de produção real (não só teoria) o princípio que já estava na pesquisa anterior deste projeto (`pesquisa-ia-categorizacao-auto-lancamento.md`, seção 1: "CFOP/NCM/CST → plano de contas é regra determinística, IA só na borda"): **usar IA pra tudo de uma vez é pior que separar o que é determinístico do que é genuinamente ambíguo.**

Fontes: ramp.com/receipt-automation, support.ramp.com (×2), ramp.com/blog (×2), **engineering.ramp.com/post/apple-intelligence-receipt-matching**, modal.com/blog/ramp-case-study, microsoft.com/customers/story (Ramp+Azure); brex.com/support (×3), brex.com/product-announcements (×2), zenml.io/llmops-database, venturebeat.com; bill.com/product/ai, bill.com/learning, bill.com/accountant-resource-center; ottimate.com; stampli.com (×3).

---

## O que isso significa pra nós — ajustes ao desenho já discutido com o usuário

1. **Sempre revisão humana antes de postar continua a escolha certa** — confirmado por Xero/Hubdoc citando o auto-skip como arriscado, e pelo texto padrão-de-mercado "nenhuma IA acerta 100%".
2. **Múltiplos lançamentos por arquivo é um padrão real e maduro** (Dext, AutoEntry, Bill.com, Ramp) — mas QuickBooks nativo mostra que é fácil fazer mal (múltiplos recibos numa imagem "confundem" o sistema). Vale testar pesado especificamente esse caso antes de considerar pronto.
3. **Novo: aplicar o achado de engenharia da Ramp** — separar extração em determinístico (validação de CNPJ/CPF por checksum, formato de data, valor numérico bem formado — o mesmo validador já escrito em `lib/pagamentos/cpf-cnpj.ts` pro checkout é reaproveitável aqui) do que é genuinamente ambíguo pra IA (identidade do fornecedor, sugestão de categoria, tipo despesa/receita). Design original já ia nessa direção via reaproveitar `regras_categorizacao`/`correspondencia.ts`; a pesquisa dá evidência concreta de que vale reforçar isso, não deixar a IA "decidir tudo num parágrafo só".
4. **Novo: adicionar dedup fuzzy em cima do dedup por hash de arquivo** — hash pega o mesmo arquivo reenviado; não pega a mesma transação chegando por dois arquivos diferentes (foto + PDF do mesmo boleto). Padrão Stampli/Rossum: fornecedor+valor+data próximos como segunda camada de checagem, aviso explícito ao usuário (nunca bloqueio silencioso).
5. **Novo: estados por sugestão** ("Pronta" vs. "Revisar", padrão Dext) em vez de lista neutra — sinaliza visualmente quais sugestões só precisam de 1 clique vs. quais têm algo pra olhar (fornecedor não resolvido automaticamente, categoria sem regra prévia, dedup suspeita).
6. Canais além de upload manual (e-mail, WhatsApp) continuam fora deste ciclo (decisão já tomada) — mas a pesquisa mostra que **validação de remetente é fracamente documentada até nos líderes de mercado** (QuickBooks, Hubdoc, Dext) — quando chegar a vez desse ciclo, vale tratar como problema de segurança genuíno a resolver bem, não copiar o padrão frouxo do mercado.
