# Pesquisa — IA em produtos financeiros/contábeis (estado da arte)

Pesquisa externa sobre como produtos financeiros modernos usam IA de verdade, para calibrar até onde vale mirar além da "Captura" do Conta Azul.

---

## 0. Onde o Conta Azul está hoje (Conta AI Captura)

Pipeline OCR + extração de campos + sugestão com humano no loop: documento chega (upload/WhatsApp/e-mail) → IA extrai valor/vencimento/fornecedor/categoria → tela de revisão pré-preenchida → usuário confirma → lançamento criado. Sem reconciliação bancária automática, sem aprendizado visível de padrão ao longo do tempo, sem chat conversacional, sem previsão de fluxo de caixa, sem detecção de anomalia. É o nível mais básico do espectro que existe hoje no mercado.

## 1. Puzzle.io — "AI-powered, human-led" / "governed automation"

Razão reconstruído do zero como append-only/imutável, "agent-native". Múltiplos modelos de ML especializados (não um LLM genérico único) — um para classificação, um para anomalias, um para validação, mais um processo generativo de duas etapas (gerar→validar) pra demonstrações financeiras. **Nada é postado sem aprovação humana.** Métricas: 85-95% do trabalho repetitivo automatizado, 90-98% de categorização automática, fechamento até 50% mais rápido.

## 2. Digits — "Agentic General Ledger"

Modelos preditivos especializados não-generativos (não LLM puro) para classificação/reconciliação — similaridade vetorial + modelo de linguagem customizado só para classificação contábil. Treinado em 170M+ transações (US$875 bi). **Auto-booking de até 95%** direto no razão sem toque humano; o resto vai pra fila de exceção (não revisão transação-por-transação). "Ask Digits": assistente conversacional. Fechamento mensal usa detecção de anomalia como gate antes de fechar o período.

## 3. Pilot.com e Bench — "IA + humano", e uma lição de risco

**Pilot** lançou "AI Accountant" (fev/2026): autônomo no caminho feliz (conecta banco/Stripe/Gusto → categoriza → reconcilia → gera P&L/fluxo/balanço sem toque humano), mas **escalação para humano em decisão de julgamento com impacto material real é o mecanismo de segurança central** — "só humanos podem tomar decisões accountable".

**Bench** (agora Employer.com) é o caso de alerta: a empresa **colapsou em dez/2024**, travando o acesso de milhares de PMEs aos próprios dados em plena temporada fiscal, comprada e relançada em 2025 com reputação ainda manchada em 2026. Lição: modelo "serviço gerenciado com humano" tem exposição operacional que pode quebrar a empresa mesmo com boa tecnologia — se decidirmos competir nessa camada (BPO financeiro), tratar como negócio de operações com SLA e redundância, não como extra de marketing.

## 4. Vic.ai e Booke.ai — automação de contas a pagar

**Vic.ai**: treinado em 1 bilhão+ de faturas, 97% de precisão out-of-the-box subindo a 99% com o tempo. Matching PO/recebimento 2/3/4-way com validação multidimensional mesmo com discrepância. "Autopilot": em 6 meses, clientes atingem até 85% de faturas no-touch. **Confiança é construída incrementalmente por cliente** — começa conservador, expande autonomia conforme acumula histórico.

**Booke.ai**: não é plataforma própria — roda como automação (RPA+GPT-4) **dentro do QuickBooks/Xero já existente** do cliente, agindo direto na UI/API em vez de só sugerir.

## 5. Zeni.ai — flux analysis (diferencial pouco visto)

Reconciliação em tempo real (não batch mensal), matching de recibo multi-fonte (cartão, banco, e-mail, **Slack**). "Flux analysis": decompõe a variação mês-a-mês por fornecedor/categoria/classe — um explicador automático de "por que o número mudou", não só o número em si.

## 6. Líderes estabelecidos: Intuit Assist (QuickBooks) e Xero JAX

**Intuit Assist**: múltiplos agentes especializados (contabilidade, pagamentos, clientes, finanças). Previsão de fluxo de caixa: 18-24 meses de histórico → previsão de 13 semanas, com alerta de falta de caixa + ação sugerida.

**Xero JAX** — o caso mais interessante em arquitetura de confiança: automatiza reconciliação/entrada/faturas (inclusive por WhatsApp), prevê **quando cada cliente específico vai pagar** uma fatura. **"JAX Assure"**: o LLM nunca calcula o número final — um **cálculo determinístico** roda sobre os dados permitidos, o LLM só traduz o resultado para linguagem natural. Citação da Xero: *"In accounting, there's just no room for this kind of hallucination."*

## 7. Agente autônomo vs. copiloto vs. automação silenciosa

Três modelos recorrentes: **(1) automação silenciosa** para tarefas de baixo risco/alta auditabilidade (reconciliação contínua, matching de recibo); **(2) copiloto que sugere, humano aprova** para decisão irreversível (Conta Azul Captura, Puzzle, Vic.ai fora do Autopilot); **(3) agente autônomo ponta a ponta**, só depois de um período visível de "aprendizagem supervisionada" (Pilot, Vic.ai pós-warmup, Digits 95%). **Nenhum produto pesquisado dá autonomia total no dia 1.**

Por que copiloto ainda domina: accountability profissional continua humana mesmo com execução por IA; erro em contabilidade é regulatório/fiscal, não só incômodo; confiança quebra assimetricamente (um erro visível gera desconfiança mesmo de automação depois confiável); determinismo/auditabilidade são exigência do domínio.

## 8. Previsão de fluxo de caixa via IA

Bank of America CashPro: 92% de precisão em 30 dias. Modelos evoluindo de ARIMA para LSTM e mais recentemente GRU/Transformer. Validação predominante: A/B em paralelo (roda previsão antiga e nova lado a lado por um ciclo completo antes de confiar). Tensão central (J.P. Morgan): ganho de precisão de modelo complexo esbarra em exigência de explicabilidade — modelo caixa-preta mais preciso é, na prática, menos vendável a um CFO que um modelo mais simples e auditável.

---

## Síntese: padrões a copiar ou evitar

**Copiar:**

1. **Separar cálculo determinístico de interpretação por LLM** (Xero JAX Assure / Digits) — o número que vai pro balanço nunca é "gerado" por LLM generativo, só código auditável calcula; LLM só traduz. Elimina a classe de erro mais perigosa (alucinação numérica) sem sacrificar UX conversacional.
2. **Nunca postar automaticamente sem trilha de auditoria + aprovação para o irreversível/fiscalmente sensível** (Puzzle) — humano como gate final de postagem, mesmo com 95%+ de automação do rascunho.
3. **Expandir autonomia progressivamente por cliente**, nunca 100% no dia 1 (Vic.ai/Pilot) — confiança em IA financeira se constrói, não se declara.
4. **Fila de exceções em vez de revisão transação-por-transação** (Digits/Zeni/Pilot) — só interrompe o usuário pro que é anômalo, evita fadiga de alerta.
5. **Explicar variações, não só reportar números** (flux analysis da Zeni) — nenhum concorrente brasileiro oferece isso; espaço de diferenciação real.
6. **Multicanal de captura indo além de "ler 1 documento"** (Conta Azul Captura + extensão estilo Xero JAX) — WhatsApp/e-mail também pra cobrança proativa (enviar fatura, prever quando o cliente paga, lembrete personalizado) — ataca a dor mais aguda de PME brasileira: fluxo de caixa no recebível.

**Evitar/cautela:**

7. **Não declarar "agente autônomo" sem instrumentação de confiança visível** — risco do "under-trust gap": se o usuário não entende quando a IA agiu sozinha, ou um erro cedo não é bem explicado, ele volta a conferir tudo manualmente e mata o ROI da automação. Precisa de log de atividade sempre visível em linguagem simples.
8. **Cuidado com "serviço gerenciado com humano" como dependência estrutural de negócio** (lição do colapso da Bench) — se competirem nessa camada, tratar como operação com SLA e redundância, não extra de marketing.

## Fontes principais
Conta Azul: [Conta AI Captura](https://ajuda.contaazul.com/hc/pt-br/articles/36240294322445) · Puzzle: [How it works](https://puzzle.io/how-it-works) · Digits: [digits.com](https://digits.com) · Pilot: [AI Accountant](https://pilot.com/platform/ai-accountant) · Bench: [Ledger Brief](https://www.ledgerbrief.co/tool/bench) · Vic.ai: [AP](https://www.vic.ai/accounts-payable) · Booke.ai: [booke.ai](https://booke.ai/accounts-payable-workflow) · Zeni: [zeni.ai](https://www.zeni.ai/) · Xero JAX: [release](https://www.xero.com/us/media-releases/xeros-ai-financial-superagent-jax-launches-powerful-new-features/) · Intuit: [cash flow forecasts](https://quickbooks.intuit.com/learn-support/en-us/help-article/forecasting/view-customize-ai-assisted-cash-flow-forecasts/L9Y1OnOVP_US_en_US) · J.P. Morgan: [AI cash flow forecasting](https://www.jpmorgan.com/insights/treasury/forecasting-planning/ai-driven-cash-flow-forecasting-the-future-of-treasury)
