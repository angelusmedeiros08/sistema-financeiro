# Pesquisa — Captura de documento por IA: viabilidade técnica (API Claude), estrutura determinística de boleto/NFS-e, LGPD e custo

Segunda rodada de pesquisa (24/08/2026), aprofundando além de `pesquisa-captura-documento-ia-concorrentes.md` (que cobriu como o mercado faz a experiência). Esta rodada cobre 4 frentes técnicas/legais concretas, em paralelo, navegação real. ~20 fontes adicionais, incluindo texto primário da LGPD, resoluções da ANPD, documentação oficial da Anthropic, e código-fonte de biblioteca de parsing de boleto.

---

## 1. Boleto bancário — 100% determinístico, achado que muda a arquitetura

**Confirmado via especificação FEBRABAN e código-fonte real**: dado o código de barras (44 posições) ou a linha digitável (47 dígitos) de um boleto, **vencimento e valor são extraíveis com regex + aritmética, sem OCR/IA nenhuma** — mesma categoria de "regra determinística com checksum" que CPF/CNPJ, só que com dois algoritmos (módulo 10 e módulo 11) em vez de um.

- **Código de barras (44 posições)**: banco (1-3), moeda (4), DV geral módulo 11 (5), **fator de vencimento** (6-9, dias corridos desde uma data-base), **valor nominal** (10-19, 10 dígitos, 2 casas implícitas), campo livre definido por banco (20-44).
- **Ponto de atenção crítico pra 2026**: o fator de vencimento (4 dígitos) estourou o limite em 21/02/2025 — a partir de 22/02/2025 (FEBRABAN FB-009/2023) reiniciou em 1000 com **nova data-base 2025-02-22** (a antiga era 1997-10-07). Um parser precisa de lógica condicional pra escolher a data-base certa conforme a data do boleto.
- **Biblioteca pronta e mantida**: [`@mrmgomes/boleto-utils`](https://github.com/mrmgomes/boleto-utils) (npm, MIT, última versão 1.3.3 em 29/04/2025, **já inclui a correção do fator de vencimento 2025**) — `validarBoleto()`, `calculaMod10()`, `calculaMod11()`, extração de fator/valor de código de barras e linha digitável, conversão entre os dois formatos. Única dependência: `moment-timezone`. Alternativas encontradas (`boleto-brasileiro-validator`, `node-boleto`, `boleto-validator`) estão desatualizadas ou não cobrem parsing de linha recebida — não usar.

**Implicação de arquitetura**: boleto nunca deveria depender de IA pra vencimento/valor — só pra identificar o fornecedor (quando o campo livre não é suficiente) e sugerir categoria. Isso separa exatamente "determinístico" de "ambíguo", confirmando com um segundo caso real (além de CNPJ) o achado de engenharia da Ramp já registrado na pesquisa anterior.

Fontes: [Layout Código de Barras FEBRABAN v7](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%207%20-%2001_03_2023_mn.pdf) · [mudança do fator de vencimento 2025](https://assinaturas.superlogica.com/hc/pt-br/articles/29654851094807-Fator-de-Vencimento-dos-Boletos-Atualiza%C3%A7%C3%A3o-FEBRABAN-o-que-vai-mudar) · [especificação dos 47 dígitos](https://www.toolspace.com.br/blog/o-que-sao-os-47-digitos-boleto) · [algoritmo módulo 10/11](https://blog.marvinsiq.com/2008/09/30/utilizando-modulo-10-para-calcular-digito-verificador/)

## 2. NFS-e — virou padrão nacional XML em janeiro/2026, mas transição ainda em curso

Até 2025 não havia padrão único (ABRASF em várias versões incompatíveis + layouts proprietários por município). **Desde janeiro de 2026 (LC 214/2025), a NFS-e Padrão Nacional é obrigatória** — schema XML unificado, Ambiente de Dados Nacional (ADN) centralizado, adesão de 5.568/5.570 municípios (99,9% da população). Municípios sem adesão ficam sujeitos a bloqueio de repasses federais.

**Mas a fragmentação não acabou de imediato**: municípios grandes mantêm sistema legado em paralelo até o fim de 2026 — na prática hoje (ago/2026) ainda existem duas fontes possíveis pro mesmo CNPJ, e um parser robusto precisa de fallback pro legado ABRASF (múltiplas versões) durante a transição. NF-e (produto) continua XML estruturado/assinado, sem mudança de natureza (só novos campos/atores: PAA, CNPJ alfanumérico, IBS/CBS da Reforma Tributária).

**Implicação pro nosso MVP**: como o ciclo atual é só upload manual de PDF/foto (não integração com SEFAZ/prefeitura), continuamos dependendo de leitura de PDF/imagem pra nota de serviço mesmo com XML estruturado existindo "por trás" — a integração direta com o Ambiente de Dados Nacional fica como evolução natural de um ciclo futuro (reduziria a maior parte da superfície de IA também pra NFS-e, não só boleto).

Fontes: [Portal oficial NFS-e](https://www.gov.br/nfse/pt-br) · [obrigatoriedade jan/2026](https://www.gov.br/fazenda/pt-br/assuntos/noticias/2025/agosto/a-partir-de-janeiro-de-2026-a-nota-fiscal-de-servico-eletronica-nfs-e-sera-obrigatoria-a-fim-de-simplificar-cotidiano-das-empresas) · [situação de transição/duas fontes](https://fiscaldefender.com.br/blog/download-xml-nfse-guia-completo)

## 3. API Claude — capacidades técnicas confirmadas

- **PDF nativo** via content block `type: "document"` (base64/URL/Files API) — Anthropic converte cada página em imagem E extrai o texto, manda os dois juntos pro modelo (por isso "vê" tabela/carimbo/logo, não só texto OCR puro). Até 600 páginas/requisição (100 se contexto <1M — não é o caso de Opus 5/Sonnet 5), 32MB/requisição.
- **Imagem**: JPEG/PNG/GIF/WebP, até 10MB, até 100-600 imagens/requisição, 8000×8000px máx.
- **Todos os modelos ativos suportam PDF/visão** — não é exclusivo de um tier.
- **Structured output real**: `output_config: {format: {type: "json_schema", schema: {...}}}` — grammar-constrained sampling, validação garantida no servidor (não é "espero que obedeça"). Helper com Zod em TypeScript. Limitações: sem `$ref` externo/recursão, sem `minLength`/`maximum` nativos, `additionalProperties: false` obrigatório, incompatível com `citations`.
- **Não existe cookbook oficial da Anthropic pra extração de nota fiscal/recibo** — gap real, vamos compor o padrão nós mesmos (PDF/vision + structured output), não copiar um exemplo pronto.
- **Benchmarks de acurácia**: nenhum testou boleto/NF-e brasileiro especificamente. Sinal misto entre provedores — Gemini com vantagem em OCR puro de documento escaneado de baixa qualidade; Claude bem avaliado em "extração estruturada com raciocínio" (schema confiável, JSON válido). Nanonets IDP Leaderboard (9.000+ docs genéricos): Sonnet/Opus ~80-81, Haiku 71, sem quebra por tipo de documento. **Só um teste piloto nosso, com documento brasileiro real, vai responder isso de verdade.**
- **Preço** (platform.claude.com/docs, confirmado ao vivo — tabela cacheada anterior estava errada, Sonnet 5 $2/$10 é definitivo, não vai pra $3/$15): Opus 5 $5/$25 por MTok, Sonnet 5 $2/$10, Haiku 4.5 $1/$5 (input/output).
- **Prompt caching aplicável** (cachear plano de contas/categorias do tenant) mas ganho modesto aqui (~25-30%, não os ~90% típicos) porque a maior parte do custo por documento vem da imagem em si, que varia a cada chamada e não é cacheável.
- **Zero Data Retention existe mas não é self-service** — precisa contato com vendas. **Files API NÃO é elegível pra ZDR** — usar base64/URL inline em vez de upload de arquivo mantém o fluxo sob o guarda-chuva ZDR quando o documento cabe no limite de 32MB (praticamente sempre, no nosso caso). Retenção padrão sem ZDR: 30 dias.
- **Confirmado nos Commercial Terms**: "Anthropic may not train models on Customer Content from Services" — API comercial não treina modelo com nosso dado, isso é padrão contratual, não só política.

Fontes: [pdf-support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) · [vision](https://platform.claude.com/docs/en/build-with-claude/vision) · [structured-outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) · [pricing](https://platform.claude.com/docs/en/about-claude/pricing) · [prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [api-and-data-retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) · [rate-limits](https://platform.claude.com/docs/en/api/rate-limits)

## 4. Custo — irrelevante pra decisão de precificação

Faixa estimada: **US$0,003 a US$0,03 por documento** (1 página, Haiku a Sonnet, tier padrão a alta resolução). PME pequena (30-100 docs/mês): US$0,09-2,80/mês. PME média (300-1.000 docs/mês): US$0,90-28/mês. **50 a 500× mais barato** que o preço cobrado por concorrentes especializados (Nanonets ~US$2/fatura, Rossum ~US$1.500/mês fixo) — mas essa comparação não é 1:1, o preço deles embute UI completa, matching, SLA, suporte, não só inferência.

**Incerteza real, documentada**: tier de resolução (standard vs. high-res) pra Haiku 4.5/Sonnet 5 não está explícito na doc (pode variar custo em até 3×); volume de documento de PME brasileira não tem fonte primária confiável (Sebrae dá 3,2 notas/mês por emitente — enviesado por MEI de baixíssimo volume — vs. proxy internacional de ~217/mês). **Conclusão prática**: o custo de IA não deve pesar na decisão de escopo — o gargalo de custo real está em engenharia/revisão/suporte, não em tokens.

Fontes: mesmas de pricing/vision acima · [Agência Sebrae — emissor gratuito de NF](https://agenciasebrae.com.br/inovacao-e-tecnologia/emissor-gratuito-de-notas-fiscais-gera-economia-de-r-358-milhoes-para-pequenos-negocios/)

## 5. LGPD — achado mais importante desta rodada: gap real, não resolvido, ação vigente desde 23/08/2025

**Este é o ponto que mais precisa de decisão explícita do usuário antes de seguir.**

- O documento capturado (boleto/nota) frequentemente contém dado pessoal de **terceiro** — o cliente/fornecedor do tenant, que **não é parte do contrato entre o tenant e nosso ERP**. Isso torna "execução de contrato" (Art. 7º, V da LGPD) uma base legal frágil; a base mais defensável é "legítimo interesse" (Art. 7º, IX), que exige teste de proporcionalidade documentado (LIA) — não encontrei orientação oficial da ANPD tratando especificamente desse cenário (dado de terceiro extraído por IA subcontratada). É lacuna doutrinária real, não simplificação minha.
- **Transferência internacional (EUA) exige mecanismo válido desde 23/08/2025** (prazo de adequação da Resolução CD/ANPD nº 19/2024 **já venceu** — não é exigência futura, é vigente agora). O mecanismo padrão são as cláusulas-padrão contratuais do Anexo II dessa resolução.
- **Achado crítico**: a política de privacidade da Anthropic tem uma seção específica pra LGPD/Brasil (SCCs, direitos do titular) — **mas ela mesma diz explicitamente que não se aplica a clientes comerciais/API** ("This Privacy Policy does not apply to content that we process on behalf of customers of our business offerings"). O **DPA comercial** (o que rege dado mandado via API) cita GDPR/UK GDPR/Suíça — **não cita LGPD nem Brasil nominalmente**, e usa SCCs europeias, não as cláusulas do Anexo II da resolução brasileira. Não há confirmação pública de que o DPA comercial cobre LGPD.
- Ponto positivo confirmado: Anthropic não treina modelo com conteúdo de cliente da API (contratual, não só política), retenção padrão 30 dias, ZDR disponível (mas via vendas, não self-service).
- **Prática de mercado real**: nenhum concorrente pesquisado (Conta Azul incluída) documenta publicamente qual fornecedor de IA processa o documento nem a base legal específica — a política da Conta Azul menciona a feature de IA mas fica genérica sobre transferência internacional. Minimização/mascaramento de PII antes de enviar a imagem pra IA **não é praticável** nesse caso (precisaria de OCR local prévio pra localizar a região do CPF, o que anularia parte do motivo de usar IA) e nenhum concorrente faz isso publicamente — o padrão real do mercado é mandar o documento inteiro e resolver conformidade em nível contratual.

**Conclusão honesta**: existe uma lacuna real entre "o que a LGPD exige desde ago/2025" e "o que está publicamente confirmado sobre o DPA comercial da Anthropic". Isso não impede necessariamente a construção do recurso, mas é uma pergunta que precisa ser respondida — via contato direto com vendas/jurídico da Anthropic confirmando se o DPA comercial incorpora as cláusulas do Anexo II da Resolução 19/2024 — antes de processar documento real de cliente em produção. A ANPD também já sinalizou IA como eixo prioritário de fiscalização pra 2026-2027.

Fontes: [Art. 7º LGPD](https://www.lgpd-brasil.info) (texto espelhado do planalto.gov.br) · [Resolução CD/ANPD 19/2024 — cobertura Opice Blum](https://opiceblum.com.br) · [Anthropic Privacy Policy — Seção 12 Brasil](https://www.anthropic.com/legal/privacy) · [Anthropic DPA](https://www.anthropic.com/legal/data-processing-addendum) · [Anthropic Commercial Terms](https://www.anthropic.com/legal/commercial-terms) · [Nota Técnica ANPD 12/2025](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts-06-2024-nt-12-2025-consolidacao-das-contribuicoes.pdf) · política de privacidade Conta Azul (contaazul.com/termos/privacidade)

---

## O que isso muda no desenho (além dos ajustes já registrados no doc anterior)

1. **Boleto ganha um parser determinístico dedicado** (`@mrmgomes/boleto-utils` ou equivalente escrito por nós inspirado nele) — vencimento e valor **nunca** passam pela IA quando o documento é um boleto com linha digitável legível. IA entra só pra identificar fornecedor (se o campo livre não bastar) e sugerir categoria. Isso reduz drasticamente a superfície de erro de IA pra uma fração grande dos documentos reais de contas a pagar.
2. **Usar base64/URL inline, nunca a Files API**, pra manter o fluxo elegível a Zero Data Retention se/quando ativarmos.
3. **Pendência explícita a resolver antes de produção real** (não antes do MVP/piloto interno com dado de teste): confirmar com a Anthropic se o DPA comercial cobre LGPD/Brasil especificamente. Enquanto isso, o recurso pode ser desenvolvido e testado com dados fictícios/de teste sem esse bloqueio — o gap importa pro momento de processar documento real de cliente.
4. **Structured output nativo da API** (`output_config.format`) é o mecanismo certo pra forçar o schema — não precisamos inventar um esquema de "tool use com retry manual".
