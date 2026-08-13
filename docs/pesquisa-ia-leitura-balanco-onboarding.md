# Pesquisa — IA leitora de balanço/DRE para onboarding e migração

Pesquisa sobre extrair dado de demonstrações financeiras já prontas (PDF de balanço/DRE de outro sistema ou contador) para acelerar a migração de um cliente novo, em vez de digitação manual ou mapeamento de planilha.

---

## 1. Document AI genérico (Azure/AWS/Google) — não resolve o problema semântico

Nenhum dos três grandes provedores tem modelo pré-treinado dedicado a balanço/DRE. Todos têm modelos prontos pra documento padronizado (extrato bancário, nota fiscal, recibo, contracheque) — balanço/DRE cai em "documento genérico com tabelas" (Azure General Document/Layout API, AWS Textract `AnalyzeDocument` com `TABLES`, Google Form/Layout Parser). A própria AWS reconhece na documentação: "balanços não têm um conjunto fixo de campos ou formato fixo".

**Conclusão**: os três serviços resolvem bem "onde estão as tabelas e o que tem dentro" (OCR + estrutura tabular), mas nenhum resolve o problema semântico central — mapear "Caixa e Equivalentes", "Fornecedores a Pagar" etc. para o plano de contas do sistema de destino. Isso teria que ser construído por cima (LLM), porque a variabilidade de layout entre contador/empresa é justamente o que eles não resolvem nativamente.

## 2. LLMs multimodais lendo balanço direto de imagem/PDF — benchmarks reais, com resultado divergente por complexidade

- **Teste em 120 documentos financeiros reais**: Claude 3.5 Sonnet 89%, GPT-4o 87%, Gemini 1.5 Pro 84% de acurácia geral por campo. Mas por tipo: extrato bancário 92-96%, fatura 89-93%, **documentos de trade finance (complexidade estrutural mais próxima de um balanço com hierarquia de conta) caem para 71-78%**.
- **FinSheet-Bench** (planilha financeira complexa): melhores modelos ficam 80-82% em lookup simples, mas **despenca pra 48,6%** em planilha grande/complexa (152 empresas, 8 fundos) vs. 86,2% no arquivo mais fácil.
- **ExtractBench** (PDF→JSON em escala): acurácia por campo entre 65-80%, agregado 72,9%.
- **GPT-4o em documento financeiro multi-estruturado** (tabela+gráfico+texto misturado, comum em balanço de PDF de contador): apenas **56% de acurácia em QA** com input direto; sobe pra 61,3% com pré-processamento (separar tabela do texto antes de mandar pro LLM).
- **Autovalidação natural de documento hierárquico**: colunas devem somar aos totais nos níveis superiores — permite validação algorítmica pós-extração sem depender só da "confiança" do modelo.
- **Risco específico do formato brasileiro**: relatos documentados de LLM confundindo separador de milhar com decimal em locale `R$ 1.234,56` (ex.: arredondando `1.105` para `1.1` até instrução explícita de formato ser adicionada ao prompt) — risco concreto, não hipotético, pro nosso caso.

**LLM vs. Document AI tradicional**: LLM é mais flexível (layout variável, hierarquia semântica) mas **não é mais confiável em acurácia bruta** — literatura recomenda consistentemente validação e camada de revisão antes de uso em produção financeira.

## 3. Ferramentas especializadas em extração financeira — nicho de balanço/DRE ainda não resolvido

Mercado maduro para **extrato bancário e nota fiscal** (Klippa, Veryfi, DocuClipper — 99%+ de acurácia declarada), mas nada consolidado especificamente pra "ler balanço em PDF e importar saldo de abertura". Parseur/Unstract/Landing AI oferecem extração configurável mais genérica, sem caso de uso publicado específico pra esse cenário.

**Conclusão**: existe tecnologia de prateleira madura pra documento de formato relativamente padronizado por banco/órgão emissor. Balanço/DRE — sem padrão de formato, gerado por centenas de escritórios contábeis diferentes — **não tem produto de mercado consolidado e testado**. Nicho ainda não resolvido de forma robusta e amplamente adotada por ninguém.

## 4. Padrão de mercado para saldo de abertura na migração — hoje é 100% manual, inclusive nos líderes

- **QuickBooks Online**: upload de planilha (.xls/.csv, template fixo) via "Import Data > Trial Balances", ou lançamento manual via Journal Entry. Sem IA lendo PDF.
- **Xero**: "Conversion Balances" — contador fornece trial balance, usuário digita/insere manualmente linha por linha, com checklist explícito: *"certifique-se de que os saldos de abertura batem exatamente com o trial balance anterior, conta por conta."* Zero IA nesse fluxo.
- **Omie** (referência direta): baixa planilha padrão → preenche situação devedora/credora e valor por conta → reimporta → valida manualmente → clica "Gerar lançamentos" — exatamente o padrão de mapeamento manual que a `Tabela_Conversao` da planilha SFB já fazia.
- **Glitter.io** (ferramenta brasileira de nicho, PDF/Excel → TXT pro Domínio): baseada em regra/estrutura fixa, não em IA generativa, com etapa de conferência obrigatória e bloqueante — *"nunca gere um arquivo TXT com pendências acusando erro"*.

**Conclusão**: nenhum concorrente direto (nem QuickBooks, nem Xero, nem Omie) usa IA pra ler PDF de balanço e popular saldo de abertura automaticamente. Todo mundo usa planilha estruturada + conferência manual linha a linha. Isso é espaço em branco genuíno se executado bem — mas o motivo de ninguém ter feito ainda é provavelmente o mesmo risco/retorno desfavorável, não falta de tentativa.

## 5. Risco de efeito cascata e mitigação

Xero reconhece explicitamente na documentação: *"não comece a lançar transações ou fazer conciliação bancária antes de completar os saldos de abertura, pois isso pode levar a erros de relatório e duplicação"* — mesmo processo manual reconhece que erro na base contamina tudo depois.

**Guardrail matematicamente barato e de altíssimo valor**: a soma das contas analíticas deve bater com o total sintético declarado no documento (Ativo Circulante + Não Circulante = Total do Ativo; Total do Ativo = Total do Passivo + PL). Se Ativo ≠ Passivo + PL após a extração, isso é sinal automático e inequívoco de erro — não precisa de revisão humana pra *detectar* o problema, só pra *corrigir*.

## 6. Como Puzzle.io e Zeni.ai validam demonstrações geradas (não lidas) — reforça o padrão

Puzzle: 98%+ de acurácia de auto-categorização quando conectado a fontes ricas, resíduo ambíguo vai pra revisão humana rápida; "AI Accuracy Review" contínuo varre demonstrações já geradas atrás de erro. Zeni: auto-aprova só com alta confiança, escala pra revisão humana os casos incertos, combinado com contadores humanos dedicados pros cenários complexos — não é 100% autônomo mesmo depois de anos de produto.

Padrão comum, válido também no sentido inverso (leitura, não geração): **nunca confiar cegamente no output do modelo generativo; sempre rodar uma segunda camada determinística/estatística de checagem antes de expor ao usuário, roteirizando só os casos de baixa confiança pra revisão humana.**

---

## Recomendação

**Vale investir, mas não como "preenchimento automático sem revisão"** — como assistente de sugestão com validação matemática obrigatória e revisão humana no caminho crítico. Não é "alto risco, baixo retorno" a ponto de descartar; é "risco administrável se o produto colocar o humano no controle da decisão final" — o mesmo padrão que Puzzle, Zeni e até a ferramenta brasileira de nicho Glitter.io já adotam.

**Desenho recomendado:**

1. **IA como copiloto de preenchimento da própria "Tabela de Conversão"**, não substituto dela — usuário faz upload do PDF/foto do balanço, um LLM multimodal (Claude/GPT, ~87-89% de acurácia bruta em documento financeiro real) faz a primeira leitura e pré-preenche a planilha de mapeamento; a planilha continua sendo a superfície de verdade que o usuário revisa e confirma.
2. **Gate matemático obrigatório antes de qualquer importação**: checar Ativo = Passivo + PL (e subtotais batendo com totais declarados no PDF) automaticamente sobre o resultado da extração — se não bater, bloquear a importação e forçar correção manual campo a campo.
3. **Confiança por campo, não por documento**: mostrar exatamente quais linhas foram extraídas com alta confiança (auto-aceitas, mas visíveis/editáveis) vs. quais precisam de atenção humana (valor ilegível, ambiguidade de separador decimal `R$ 1.234,56`, conta sem correspondência clara) — nunca importar tudo silenciosamente.
4. **Escopo inicial restrito**: começar pelo caso mais fácil — balanço/DRE gerado digitalmente (PDF nativo, não foto/scan), poucos períodos, sem conta customizada exótica. Foto/print de baixa qualidade fica pra fase 2, ou vira "sugestão fraca, exige mais revisão".
5. **Nunca tratar saldo importado por IA como pronto pro uso operacional imediato** — passo explícito de confirmação final do usuário (resumo comparativo "extraído vs. total declarado no documento original") antes de virar lançamento contábil real — acelerando a digitação, não eliminando a conferência.

Em suma: tratar como **redução de fricção de digitação** ("de digitar tudo do zero" para "revisar e corrigir uma pré-extração"), não como **automação de confiança**. Essa é a diferença entre diferencial competitivo real de onboarding e incidente de suporte custoso no primeiro mês de um cliente novo.

## Fontes
[Floowed — Claude vs GPT-4o vs Gemini em extração financeira](https://www.floowed.com/insights/chatgpt-claude-gemini-financial-document-extraction-test) · [FinSheet-Bench (arxiv)](https://arxiv.org/html/2603.07316v1) · [ExtractBench (arxiv)](https://arxiv.org/html/2602.12247v2) · [GPT-4o multi-estruturado (arxiv)](https://arxiv.org/html/2506.05182) · [Validação hierárquica (arxiv)](https://arxiv.org/pdf/2511.10659) · [Klippa — Balance Sheets OCR](https://www.klippa.com/en/ocr/financial-documents/balance-sheets/) · [SaasAnt — Import Trial Balance QuickBooks](https://www.saasant.com/blog/import-trial-balance-quickbooks/) · [Xero Central — Convert to Xero](https://central.xero.com/0/guide/a5B3m00000BtKF9EAN/convert-to-xero-from-any-system) · [Ajuda Omie — Saldo inicial módulo contábil](https://ajuda.omie.com.br/pt-BR/articles/15266096-lancando-o-saldo-inicial-no-modulo-contabil) · [Glitter.io](https://www.glitter.io/guides/como-converter-lanamentos-contbeis-em-pdfs-e-importar-no-domnio) · [Statement Extract](https://statementextract.com/blogs/ai-pdf-data-extraction-tools-accountants-comparison/) · [Puzzle.io — AI Accuracy Review](https://puzzle.io/blog/ai-accuracy-review-for-accountants) · [Zeni.ai — Financial Reporting Automation](https://www.zeni.ai/blog/financial-reporting-automation-strategies)
