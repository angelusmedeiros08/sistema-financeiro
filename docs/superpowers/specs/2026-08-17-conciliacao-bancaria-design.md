# Conciliação bancária

## Contexto

Depois de mapear a Conta Azul (pesquisa via agente, cobrindo contaazul.com, ajuda.contaazul.com e sites de comparação) pra identificar o que o sistema ainda não tem, conciliação bancária saiu como a maior lacuna: é a dor mais citada nas comparações de mercado, e hoje o sistema não tem nada nessa área — busca por "conciliac|reconcil|OFX" em todo `app/src` não retorna nenhum resultado.

O terreno já existe: toda baixa registrada (`registrarBaixa()` em `lib/contabil/baixa.ts`) já grava `conta_financeira_id` — ou seja, todo pagamento/recebimento já sabe por qual conta passou. O que falta é comparar isso contra o extrato real do banco.

Uma segunda pesquisa, mais profunda, cobriu 8 sistemas (Omie, Bling, Nibo, Granatum, QuickBooks Online, Xero, FreshBooks, Wave) mais o mecanismo de Open Finance/Pluggy por trás da integração automática da própria Conta Azul. Os achados moldaram este design — citados nas seções relevantes abaixo.

## Escopo

**Dentro:**
- Importação de extrato via **OFX** (autoestruturado) e **CSV genérico** (com passo de mapeamento de coluna, reaproveitando o parser BR-locale já existente em `lib/importacao/parse.ts`)
- Conciliação contra baixas já registradas **e** contra parcelas pendentes/atrasadas (confirmar o match contra uma parcela pendente já registra a baixa)
- **Agrupamento N-para-1**: uma linha do extrato pode ser conciliada contra várias baixas/parcelas cuja soma bate exatamente com o valor do banco (comum quando o banco deposita vários recebimentos juntos)
- Criação de lançamento simplificado direto na tela quando nada bate
- **Regras de categorização por histórico**: toda vez que uma categoria é confirmada pra uma descrição de banco, uma regra nasce sozinha e passa a sugerir a mesma categoria da próxima vez que aquela descrição aparecer
- Tela por conta financeira, acessada de dentro de Configurações → Contas Financeiras
- Linhas do extrato **persistem entre sessões** — importar hoje, conciliar parte, voltar amanhã pro resto

**Fora:**
- Integração bancária automática (feed direto via Open Finance/Pluggy) — confirmado que mesmo a Conta Azul, usando Pluggy, ainda joga tudo numa fila de conciliação manual depois. A importação OFX/CSV + tela de matching que este spec constrói não é trabalho perdido se um dia isso for adicionado: Pluggy viraria só mais uma fonte de entrada pra essa mesma tela. Custo de mercado hoje (Pluggy, a partir de R$2.500/mês) não se paga no estágio atual do produto.
- Regra de categorização "auto-apply silenciosa" (aplicar sem mostrar pro usuário) — pesquisa mostrou que nem Xero recomenda isso por padrão. Regra sempre pré-preenche, nunca decide sozinha.
- Modelo de confiança aprendido/IA (tipo Xero JAX) — exige histórico de dados que o produto ainda não tem; o modelo determinístico por camadas (como a Omie faz) é o ponto de partida defensável.

## Modelo de dados

**`extrato_linhas`** (nova tabela): `id, tenant_id, conta_financeira_id, data, valor (sempre positivo), tipo (CREDITO/DEBITO), descricao, fitid (nullable — id único do OFX), chave_dedup, status (PENDENTE/CONCILIADA/IGNORADA), criado_em`.

Constraint único em `(tenant_id, conta_financeira_id, fitid)` quando a linha tem FITID (OFX), e em `(tenant_id, conta_financeira_id, chave_dedup)` sempre (`chave_dedup` computado a partir de data+valor+descrição pra CSV, que não tem FITID) — reimportar o mesmo extrato pula as linhas repetidas automaticamente.

**`extrato_linha_baixas`** (nova tabela de junção): `extrato_linha_id, baixa_id`. Uma linha do extrato pode linkar contra 1 ou várias baixas (agrupamento N-para-1); o status "conciliada" é derivado de "tem pelo menos 1 baixa ligada". Nenhuma mudança na tabela `baixas` em si.

**`regras_categorizacao`** (nova tabela): `id, tenant_id, descricao_normalizada (via a mesma `normalizarTexto` já usada em todo o import), categoria_id, pessoa_id (nullable), origem (MANUAL/HISTORICO), criado_em`.

## Correspondência

Modelo determinístico por camadas (validado pela pesquisa como o ponto de partida certo pra quem ainda não tem histórico de dados suficiente pra um modelo aprendido — é assim que a Omie faz, e é o único dos 8 sistemas pesquisados com o algoritmo publicado em detalhe):

1. **Exata**: valor idêntico (ou soma exata de múltiplos candidatos) + mesma data.
2. **Aproximada**: valor idêntico (ou soma exata) + data dentro de ±5 dias.
3. **Nenhuma**: sem candidato → oferece criar novo.

Candidatos vêm de dois lugares: baixas já registradas nessa conta e ainda não conciliadas, e parcelas pendentes/atrasadas do tipo certo (crédito de banco → categoria de receita, débito → despesa). Igual ao que já vale pra pessoa: **nunca decide sozinho quando há mais de um jeito de bater o valor** — sempre lista os candidatos (incluindo combinações que somam certo) pra escolha manual, nunca escolhe silenciosamente.

Seleção de candidatos é **múltipla com soma corrente visível** ("R$ 850,00 selecionado de R$ 850,00 do extrato") — só libera confirmar quando a soma bate exatamente com o valor da linha.

## Criar lançamento simplificado

Quando nada bate: formulário mínimo — categoria, pessoa (opcional), descrição. Data e valor já vêm da linha do extrato. Sempre 1 parcela à vista, nasce direto com baixa registrada na conta sendo conciliada (o dinheiro já se moveu — é isso que o extrato prova). Sem rateio, sem parcelamento; quem precisar disso edita depois na tela normal de despesa/receita.

Se a descrição normalizada do banco já bate com uma regra salva, categoria (e pessoa) vêm pré-preenchidas — um clique confirma, ou o usuário troca à vontade. A regra nunca aplica sozinha sem passar pela tela.

## Regras de categorização automática

Toda vez que uma categoria é confirmada ao criar um lançamento a partir da conciliação, se não existir regra pra aquela descrição normalizada, uma nasce sozinha (`origem = HISTORICO`) — sem nenhuma tela extra pra isso funcionar no caso comum, mesmo modelo que a Nibo usa (regra implícita a partir da primeira correção manual, mais barato e mais seguro que uma regra explícita de autoria obrigatória).

Nova página **Configurações → Regras de Categorização**: lista as regras (manuais e geradas por histórico), permite editar categoria/pessoa ou apagar, com um botão "Reprocessar linhas pendentes" que reaplica as regras atuais contra linhas do extrato que ainda esperam decisão — útil se uma regra for corrigida depois de algumas linhas já importadas.

## Fluxo

Botão "Conciliar" em cada conta financeira (Configurações → Contas Financeiras) → upload do arquivo (OFX direto pro parser; CSV passa por um passo de mapeamento de coluna, reaproveitando `sugerirMapeamentoColunas`) → tela única listando as linhas pendentes daquela conta (as novas do import + as que sobraram de importações anteriores), cada uma com sugestão de match (exata/aproximada/nenhuma), seleção múltipla quando aplicável, criar novo (com regra pré-preenchida quando existir) ou ignorar → resumo final (conciliadas, criadas, ignoradas, já conhecidas/puladas por dedupe).

## Navegação

Dentro de Contas Financeiras — cada conta ganha um botão "Conciliar", que leva pra tela de conciliação daquela conta específica. Segue o mesmo padrão de "Visão geral" que já existe ali. Não é um item de topo na sidebar: é uma ação periódica (tipicamente mensal), não um destino que se visita toda hora como Despesas/Receitas.

## Testes

- Reimportar o mesmo OFX não duplica linha (nem em CSV, via `chave_dedup`)
- Duas baixas pendentes com valores que juntos batem o valor da linha do extrato exigem seleção manual, nunca agrupam sozinhas
- Confirmar match contra parcela pendente registra a baixa de verdade, com a conta financeira certa
- Criar lançamento simplificado aparece corretamente em Despesas/Receitas depois, já conciliado
- Segunda linha do extrato com a mesma descrição de uma já categorizada vem com categoria pré-preenchida, mas ainda pede confirmação
- Editar/apagar uma regra em Configurações → Regras de Categorização e reprocessar reflete nas linhas pendentes
- CSV com colunas em ordem diferente do modelo pede mapeamento manual, igual ao import de planilha já existente
- Regressão: nenhuma mudança em `baixas`, `registrarBaixa()` ou nos relatórios de Contas Bancárias/Fluxo de Caixa existentes
