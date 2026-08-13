# Pesquisa — IA para categorização e auto-lançamento a partir de nota fiscal

Pesquisa externa aprofundando como transformar um documento fiscal (estruturado ou não) em lançamento contábil automático, com o mínimo de erro e máximo de confiança auditável.

---

## 1. CFOP/NCM/CST → plano de contas: é regra determinística, IA só na borda

A tradução código fiscal → conta contábil é fundamentalmente uma **tabela de-para determinística**, não um problema de IA — o CFOP já declara por desenho a natureza da operação (venda, compra, devolução, transferência, bonificação), então mapear "CFOP 5.102 → Receita de Venda de Mercadoria" é regra fixa. Omie e Bling confirmam esse padrão: cadastro prévio de categoria/conta vinculado ao código fiscal, aplicado automaticamente na importação — sem inferência.

**Onde entra IA de verdade, em três pontos de borda:**
1. Sugestão de NCM a partir da descrição do produto quando o cadastro do fornecedor está incompleto — comparando com classificações históricas de produtos similares.
2. Validação cruzada de CFOP contra UF origem/destino e regime tributário, sinalizando combinações fora do padrão — aprende com as correções da equipe, refinando a acurácia por cliente específico.
3. Triagem: revisar só os itens sinalizados como divergentes, não a nota inteira.

**Implicação de desenho**: núcleo do motor de classificação = tabela de regras versionada e auditável (CFOP × natureza × regime do tenant → conta/categoria/centro de custo), com classificador de ML por cima só para os casos que a regra não cobre — nunca o contrário.

## 2. XML estruturado vs. PDF/foto não-estruturado — a vantagem estrutural brasileira

Ponto mais importante para o caso brasileiro: a NF-e/NFS-e **já chega como XML estruturado e assinado** na maioria dos casos — algo que players globais (Vic.ai, Rossum) tratam como caso raro/premium, porque nos EUA/Europa a maioria das faturas ainda chega em PDF não-estruturado (o "PDF trap": mandar PDF por e-mail não é e-invoicing de verdade, não permite straight-through processing).

**Consequência prática**: para NF-e/NFS-e com XML disponível, **não precisa de OCR nem extração probabilística nos campos fiscais** (CNPJ, valor, CFOP, NCM, itens, impostos) — é parsing XML determinístico com confiança ~100%. A IA/ML entra **depois** do parsing: (a) mapear pra categoria financeira do tenant, (b) casos que só têm foto/PDF (recibo, nota de MEI sem NFS-e eletrônica, cupom, comprovante estrangeiro) — aí sim pipeline tipo Rossum/Nanonets com OCR + confidence score.

Isso concentra a incerteza real onde ela genuinamente existe: **classificação contábil, centro de custo e detecção de anomalia** — não na extração do dado em si.

## 3. Confidence scoring por campo — o padrão de UX que se repete em todo player sério

- **Score por campo individual, não por documento** (Rossum: score 0.975 ≈ 97,5% de acurácia esperada nesse threshold; acima → exporta automático, abaixo → fila de revisão).
- **Mindee**: roda múltiplos modelos e mede concordância entre eles pra gerar o score; codifica por cor (alta/média/baixa confiança).
- **Klippa/Nanonets**: score determina roteamento pra fila de exceção; revisor corrige só os campos de baixa certeza, não redigita o documento inteiro — padrão de UX vencedor.
- **Booke.ai**: pede input humano abaixo de 90% de confiança; aprende com as correções; relata 95% de tratamento autônomo.
- **Vic.ai**: acurácia geral 97-99%, mas a **predição de dimensão contábil (conta/departamento/centro de custo) cai pra até 95%** — mesmo eles reconhecem que classificar é mais difícil que extrair. Autonomia configurável por threshold; a fração autônoma cresce materialmente nos primeiros 90 dias conforme o modelo aprende o plano de contas e padrões de fornecedor daquele cliente.

## 4. Detecção de fraude/anomalia — dois problemas distintos

**Nota fria/fraude de emissão** (Brasil): detecção primária é **verificação determinística contra a fonte oficial** — chave de acesso de 44 dígitos consultada na SEFAZ, situação cadastral do CNPJ emissor (SINTEGRA). A chave de acesso da NF-e já é um identificador único global, então duplicidade de nota estruturada é trivialmente determinística (chave já vista antes → bloqueio automático).

**Duplicidade de lançamento e valor fora do padrão** (aqui sim há ML real): match exato de número primeiro, depois **fuzzy matching multi-campo** (fornecedor+valor+data+itens) pra pegar duplicatas disfarçadas — benchmark: 95-99% de detecção via IA vs. 40-60% em revisão manual. Anomalia de valor por padrão histórico via outlier detection (autoencoder/k-NN) sobre transações daquele fornecedor+categoria; alerta quando muda dado bancário cadastrado do fornecedor (vetor clássico de fraude de desvio de pagamento).

O ML relevante pro nosso caso é sobre **duplicidade de lançamento financeiro derivado** (mesmo PDF subido duas vezes, nota chegando via XML automático E upload manual) e **anomalia de valor/fornecedor** — não sobre autenticidade da nota em si (isso é checagem determinística).

## 5. Three-way match (nota × pedido de compra × recebimento)

Processo clássico de AP: compara PO, nota fiscal e comprovante de recebimento antes de aprovar pagamento. Quando bate dentro da tolerância configurada (% ou valor absoluto), processa straight-through sem intervenção; quando não bate, vira exceção roteada por alçada de aprovação (faixa de valor determina quem aprova). **Só faz sentido se o tenant tiver módulo de pedido de compra ativo** — para PME usando só o financeiro, esse matching não existe e a nota vai direto pra classificação. Desenhar como módulo opcional, não etapa obrigatória.

## 6. Geração assistida de DRE/Balanço — processo gerar → validar

**Puzzle.io**: dois estágios — (1) revisão contínua em tempo real de 100% das transações, sinalizando inconsistência fornecedor/categoria e descrição/fornecedor divergente; (2) "AI Statement Accuracy Review" sob demanda no fechamento, varrendo: irregularidades em contas a receber, classificação de despesa suspeita, discrepância de conciliação bancária, lacuna de integridade de dado, erro de "roll-forward" de patrimônio líquido. Cada achado vem com nível de confiança + recomendação acionável, com link direto pro dado-fonte.

**Zeni.ai**: filosofia híbrida — mesmo o rascunho gerado por IA passa por contador humano antes de virar demonstração oficial, reforçando o padrão "copiloto + humano aprova o irreversível".

**O padrão de validação real**: nunca é "o LLM lê o relatório e diz se está certo" — é um conjunto de **checagens determinísticas de sanidade contábil** (saldo negativo onde não deveria, crédito em conta de natureza devedora, contas que não batem entre período, fonte desconectada) rodando sobre resultado já calculado deterministicamente. A IA entra só pra **traduzir a checagem que falhou em explicação legível e recomendação de ação** — reforça o achado central já confirmado antes: LLM nunca calcula o número, só explica.

---

## Pipeline completo recomendado (documento → lançamento aprovado e postado)

```
ETAPA 0 — INGESTÃO
   (a) XML via gateway (Focus NFe/PlugNotas) — pull automático        [DETERMINÍSTICO]
   (b) upload manual de XML                                            [DETERMINÍSTICO]
   (c) upload de PDF/foto (recibo, nota de serviço sem XML)            [→ Etapa 2 = IA/OCR]

ETAPA 1 — VALIDAÇÃO DE AUTENTICIDADE                                   [REGRA DETERMINÍSTICA]
   Assinatura digital + chave de acesso contra schema SEFAZ/prefeitura,
   status "autorizada", situação cadastral do CNPJ emissor.
   Falha aqui = bloqueio automático, exige revisão humana explícita.

ETAPA 2 — EXTRAÇÃO DE CAMPOS
   XML estruturado → parsing direto, confiança ~100%.                  [DETERMINÍSTICO]
   PDF/foto → OCR + modelo de extração (Rossum/Nanonets), score por campo. [IA/ML]

ETAPA 3 — DEDUPLICAÇÃO
   Chave de acesso já vista → bloqueio automático (XML, exato).        [DETERMINÍSTICO]
   Fuzzy match multi-campo pra PDF/recibo.                             [IA/ML leve]

ETAPA 4 — CLASSIFICAÇÃO CONTÁBIL
   Tabela de-para CFOP/NCM/CST → conta/categoria/centro de custo.      [DETERMINÍSTICO, regra por tenant]
   Se não mapeado → classificador ML sugere com base em histórico do tenant. [IA/ML]
   Validação cruzada CFOP × UF × regime, sinaliza divergência.         [REGRA + ML de sinalização]

ETAPA 5 — MATCHING (se aplicável)                                      [REGRA DETERMINÍSTICA]
   Three-way match nota×PO×recebimento, se existe PO no sistema.
   Dentro da tolerância → segue; fora → exceção com alçada por faixa de valor.

ETAPA 6 — DETECÇÃO DE ANOMALIA                                         [IA/ML]
   Valor fora do padrão histórico do fornecedor+categoria (outlier).
   Mudança recente de dado bancário do fornecedor → alerta de risco.

ETAPA 7 — CÁLCULO DO LANÇAMENTO                                        [SEMPRE DETERMINÍSTICO]
   Débito/crédito, parcelas, vencimentos — nunca calculado por LLM.
   LLM (se usado) só traduz o resultado em linguagem natural pro resumo.

ETAPA 8 — PONTO DE DECISÃO: AUTO-POST vs. REVISÃO HUMANA
   Critério = MIN(confiança extração, confiança classificação, ausência
   de flag de anomalia/duplicidade, dentro da tolerância de matching)
   ≥ 97% e sem flag de risco → posta sozinho, notifica depois
   90–97%                    → posta como rascunho, pede confirmação de 1 clique
   < 90% ou qualquer flag    → fila de revisão humana, campo/motivo específico
                                destacado (nunca pede revisão do documento inteiro)
   Toda correção humana volta como sinal de treinamento do classificador do tenant
   (autonomia cresce nos primeiros ~90 dias, padrão Vic.ai/Booke.ai)

ETAPA 9 — PÓS-POSTAGEM: VALIDAÇÃO CONTÍNUA                             [REGRA + IA pra explicar]
   Checagens de sanidade contínuas (saldo negativo indevido, fornecedor em
   categorias inconsistentes, conciliação bancária divergente).
   IA traduz achado técnico em explicação/recomendação, nunca decide sozinha.
```

**Racional central**: no Brasil, ao contrário do problema que Vic.ai/Rossum resolvem, **a extração raramente é o problema** (XML já vem estruturado e assinado) — o gargalo de confiança real está em três lugares só: (1) classificação contábil quando o de-para do tenant não cobre o caso, (2) detecção de anomalia/fraude, (3) documento não estruturado (recibo, nota sem XML). Só nesses três pontos vale investir modelo de ML com confidence score e threshold de auto-post — o resto do pipeline permanece regra determinística, auditável, testável e explicável a um contador/auditor sem precisar "confiar" na IA.

## Fontes
[Jettax — Reclassificação fiscal com IA](https://www.jettax.com.br/blog/reclassificacao-fiscal-com-ia-como-escritorios-estao-reduzindo-erros-de-ncm-e-cfop-automaticamente/) · [Ajuda Omie — Importação NF-e via XML](https://ajuda.omie.com.br/pt-BR/articles/6620242-importando-pelo-xml-as-notas-emitidas-pela-minha-empresa-nf-e) · [Ajuda Bling — Lançamento no envio de NF-e](https://ajuda.bling.com.br/hc/pt-br/articles/28210338039063) · [VATupdate — Structured vs PDF Invoices](https://www.vatupdate.com/2026/07/14/e-invoicing-e-reporting-explained-structured-vs-pdf-invoices-why-pdf-by-email-isnt-a-structured-e-invoice/) · [Vic.ai — How AP Autonomy Works](https://www.vic.ai/blog/how-does-vic-ai-ap-autonomy-work) · [Rossum — AI Confidence Thresholds](https://knowledge-base.rossum.ai/docs/using-ai-confidence-thresholds-for-automation-in-rossum) · [Stampli — Duplicate Invoice Detection](https://www.stampli.com/resources/duplicate-invoice-detection/) · [Tipalti — 3-Way Match](https://tipalti.com/resources/learn/3-way-match/) · [Puzzle.io — AI Accuracy Review](https://puzzle.io/blog/ai-accuracy-review-for-accountants) · [Zeni.ai — Financial Reporting Automation](https://www.zeni.ai/blog/financial-reporting-automation-strategies)
