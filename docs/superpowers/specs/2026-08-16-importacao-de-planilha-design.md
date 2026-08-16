# Importação de Planilha — módulo de entrada em massa de lançamentos

## 1. Contexto

Gap confirmado na auditoria contra a planilha de referência (`docs/mapeamento-planilha-controle-financeiro.md`, mecanismo "Tabela de Conversão"): o sistema não tem nenhum jeito de trazer histórico financeiro de quem já mantém uma planilha própria — hoje o único caminho é lançar um a um pelos formulários de Receita/Despesa. Para um produto que se propõe a substituir a planilha, isso é fricção real de virada de cliente.

Pesquisa de mercado (Conta Azul, Omie, Bling, Nibo, Xero, QuickBooks, Wave — 4 rodadas de pesquisa nesta sessão) confirma um padrão universal: **mapear colunas → validar/pré-visualizar → confirmar**, nunca importar direto sem revisão. Nenhuma ferramenta dedicada de mercado (Dromo, CSVBox, TableFlow, Flatfile) compensa: os conceitos que precisam ser mapeados (categoria, centro de custo, forma de pagamento) são específicos do nosso domínio, então a lógica de validação é nossa de qualquer jeito.

**Achado que muda a arquitetura**: `criarEventoFinanceiro()` (`lib/contabil/evento-financeiro.ts`) faz 4-5 inserts em sequência (evento → rateio de categoria → rateio de centro de custo → parcelas → lançamento contábil → partidas) **sem transação atômica** — se um insert do meio falhar, os anteriores ficam órfãos (evento sem rateio, ou lançamento contábil desbalanceado). Isso já existe hoje para qualquer lançamento manual, mas um import de centenas de linhas multiplica a exposição por centenas de vezes. Pesquisa confirmou o padrão certo de correção: encapsular a sequência inteira numa função de banco (`plpgsql`), que roda dentro de uma transação implícita — qualquer erro no meio desfaz tudo automaticamente.

Escopo explicitamente **não inclui** IA/OCR de extrato bancário — o usuário já sinalizou que isso é uma fase futura e separada (reconciliação contra o banco, não criação pura de histórico). Este ciclo é só a entrada estruturada de uma planilha que o cliente já mantém.

## 2. Escopo

**Dentro:**
- Refatorar `criarEventoFinanceiro()` para chamar uma função de banco atômica (RPC) em vez de inserts sequenciais — corrige o problema de atomicidade pra **todo** chamador (formulários manuais, job de recorrência, e o import novo), sem duplicar a lógica de negócio em dois lugares.
- Página de import em Configurações: upload de `.csv`/`.xlsx` → detecção de colunas com sugestão de mapeamento → confirmação de formato de data/decimal quando ambíguo → tela de revisão de entidades novas (categoria/centro de custo/pessoa/forma de pagamento) com sugestão de correspondência aproximada → grade de pré-visualização linha a linha com status → confirmar → progresso → resumo final.
- CTA de destaque ("Importar planilha") nas telas de Receitas, Despesas e Painel quando o tenant ainda não tem nenhum lançamento.
- Chave de idempotência por linha (retomar um import interrompido sem duplicar o que já foi criado).
- Aviso de possível duplicata (mesma data + valor já existe no tenant) — nunca bloqueia, só sinaliza.
- Baixa automática por linha quando a planilha trouxer data de pagamento (decisão já validada com o usuário).

**Fora:**
- Importação de extrato bancário (OFX/CNAB) ou captura por IA — fase futura e separada, reconciliação é um problema diferente de criação pura de histórico.
- Atomicidade de `registrarBaixa()` — a baixa de cada linha continua sendo uma chamada TypeScript normal (não RPC). Justificativa na Seção 4.
- Parcelamento multi-parcela vindo da planilha — cada linha importada vira sempre 1 parcela à vista; quem já lança parcela por parcela na própria planilha (comum) já produz o resultado certo sem essa feature.
- Suporte a mais de um arquivo/conta financeira por import — mesma simplificação do Conta Azul (1 conta financeira por execução).

## 3. Refatoração: `criar_evento_financeiro` como função de banco atômica

Nova função `plpgsql` (`create or replace function criar_evento_financeiro(...)`) que replica exatamente a lógica hoje em `evento-financeiro.ts`: calcula as parcelas (mesmo algoritmo de `calcularParcelas`/`adicionarMeses`), valida soma do rateio contra o valor total, insere evento → rateio_categoria → rateio_centro_custo (se houver) → parcelas → lancamento → partidas, tudo dentro da transação implícita da função — qualquer `raise exception` no meio desfaz tudo. Recebe um `p_import_key text` opcional; se vier preenchido e já existir um evento com essa chave para o tenant, retorna o `id` existente em vez de inserir de novo (idempotência).

`eventos_financeiros` ganha coluna `import_key text null`, com índice único parcial `(tenant_id, import_key) where import_key is not null` — lançamento manual nunca preenche essa coluna, só o import.

A função TypeScript `criarEventoFinanceiro()` mantém exatamente a mesma assinatura pública (nenhum chamador existente muda) — por dentro, passa a só montar os parâmetros e chamar `supabase.rpc('criar_evento_financeiro', {...})`. Isso corrige a janela de corrupção pra Receitas, Despesas, o job de recorrência e o import, todos de uma vez, sem lógica duplicada em dois lugares.

`registrarBaixa()` **não** entra nessa refatoração agora — sua cadeia própria (insert de `baixas` + `registrarLancamento`, que já é só 2 inserts) é bem mais curta, e uma falha no meio deixa um estado recuperável (a parcela continua existindo, só sem baixa) em vez de um órfão sem rateio. Ganho marginal menor, escopo maior — fica pra um ciclo futuro se algum dia justificar.

## 4. Parsing — robustez de planilha brasileira

Client-side, biblioteca `xlsx` (SheetJS) — lê `.csv` e `.xlsx` com a mesma API.

- **`.xlsx`**: célula já vem tipada pelo próprio formato binário (número, texto, data) — confiável direto, sem heurística. Datas são serial numbers independentes de locale do Excel (confirmado: BR e US armazenam o mesmo valor, só a exibição muda).
- **`.csv`**: sem nenhum metadado de tipo — precisa de uma camada própria, porque tanto PapaParse quanto SheetJS têm bugs documentados de detecção errada de delimitador/encoding especificamente em arquivo brasileiro:
  - **Delimitador**: conta ocorrências de `;` vs `,` na primeira linha, fora de aspas — se `;` aparecer, usa `;` (Excel BR exporta com `;` porque `,` já é o separador decimal). Passa o delimitador detectado explicitamente pro parser, nunca confia no auto-detect das libs.
  - **Encoding**: tenta decodificar como UTF-8 estrito (`TextDecoder('utf-8', {fatal: true})`); se falhar, cai para Windows-1252 (cobre a grande maioria dos exports do Excel Windows BR). Mostra uma prévia decodificada das primeiras linhas **antes** de prosseguir, com dropdown manual (UTF-8 / Windows-1252 / ISO-8859-1) — nunca decide silenciosamente, porque detecção automática de encoding é estatisticamente pouco confiável em arquivo curto.
  - **Decimal e data**: como o produto é só Brasil, assume `,` decimal / `.` milhar e `DD/MM/AAAA` por padrão (sem tentar auto-detectar entre BR/US — pesquisa confirmou que não existe heurística realmente confiável pra isso), com opção manual de trocar pra formato americano se o arquivo vier de um sistema exportado em outro locale. Mostra as primeiras 5 linhas já interpretadas nesse formato antes do usuário confirmar.

## 5. Template e colunas

Botão "Baixar modelo" no topo da tela — colunas nomeadas em português, mesma lógica de obrigatoriedade do Conta Azul (mercado já validou esse conjunto):

| Coluna | Obrigatória | Observação |
|---|---|---|
| Data de competência | Sim | |
| Valor | Sim | positivo, sem sinal — o tipo (receita/despesa) vem da Categoria, não do sinal do valor (ver abaixo) |
| Categoria | Sim | nome livre — resolvido/criado na etapa de revisão de entidades |
| Descrição | Sim | |
| Data de vencimento | Não | vazio = igual à Data de competência |
| Data de pagamento | Não | vazio = fica pendente; preenchido = baixa automática |
| Cliente/Fornecedor | Não | nome livre — resolvido/criado como Pessoa |
| CPF/CNPJ | Não | só usado se Cliente/Fornecedor também vier preenchido |
| Centro de custo | Não | nome livre — resolvido/criado |
| Forma de pagamento | Não | só relevante se Data de pagamento vier preenchida; vazio nesse caso vira "Não informado" |

**Sem coluna de "Tipo" (receita/despesa)** — decisão deliberada, diferente do Conta Azul: nosso schema já amarra `tipo` na própria categoria (`categorias_financeiras.tipo`), então uma Categoria existente já resolve o tipo sem ambiguidade. Categoria nova exige que o usuário escolha Receita ou Despesa no momento de confirmar a criação (Seção 6) — a mesma pergunta que `criarCategoria()` já exige, só que uma vez por categoria nova, não por linha.

## 6. Resolução de entidades — nunca mesclar às cegas

Depois do mapeamento de colunas, antes da grade de pré-visualização: o sistema busca todas as Categorias, Centros de Custo, Pessoas e Formas de Pagamento já cadastradas no tenant, e pra cada valor único encontrado nas colunas correspondentes do arquivo:

1. Normaliza (minúsculo, trim, sem acento) e compara contra os nomes existentes (normalizados do mesmo jeito) — resolve "Aluguel"/"aluguel"/"ALUGUEL " como a mesma categoria sem criar 3.
2. Se não bater exato, roda correspondência aproximada (`fastest-levenshtein`, distância normalizada) contra os nomes existentes — se houver um candidato com similaridade acima de 0,85 (constante fixa no código, não configurável nesta versão), sugere "Aluguél — você quis dizer Aluguel?" como opção, mas não decide sozinho.
3. Tela de revisão lista cada valor único encontrado, com 3 ações possíveis por item: usar correspondência existente (exata ou sugerida), escolher outra categoria/centro/pessoa/forma manualmente, ou confirmar criação de um registro novo (categoria nova pede Receita/Despesa nesse momento).

Só depois dessa tela confirmada é que os registros novos aprovados são de fato criados (poucos itens, tipicamente dezenas no máximo — reaproveita `criarCategoria`, `centros_custo` insert direto, `resolverPessoaId`, `formas_pagamento` insert direto, sem necessidade de RPC atômica própria, dado o volume baixo).

## 7. Validação e pré-visualização

Grade com uma linha por registro da planilha, coluna de status (✓ OK / ⚠ Aviso / ✗ Erro), editável inline célula a célula sem precisar re-upload:

- **Erro (bloqueia a linha, não bloqueia o arquivo)**: valor não numérico ou ≤ 0, data de competência inválida, categoria/descrição vazias.
- **Aviso (não bloqueia, só sinaliza)**: possível duplicata — já existe um evento no tenant com a mesma `data_competencia` + `valor_total` (consulta direta, sem coluna de hash — volume não justifica); usuário decide por linha se importa mesmo assim ou pula.
- Resumo fixo no topo da grade: "X linhas prontas · Y com erro · Z avisos de duplicata".
- Botão "Importar" só habilita com pelo menos 1 linha pronta; linhas com erro ficam de fora automaticamente (não trava o resto do arquivo).

## 8. Commit

Duas etapas, na ordem:

1. **Entidades novas aprovadas** (Seção 6) — poucas dezenas de inserts no máximo, sequenciais, sem RPC.
2. **Lançamentos** — um `server action` por linha, chamando `criarEventoFinanceiro()` (já com o `import_key` — um UUID gerado no navegador no momento do parse, não no momento do envio, pra sobreviver a um reload) e, se a linha tiver data de pagamento, `registrarBaixa()` em seguida com `forma_pagamento_id` resolvido e a conta financeira única escolhida no início do fluxo. Barra de progresso linha a linha (sem fila em background — mantém simples, dentro do limite de linhas da Seção 9).

Se o navegador fechar no meio e o usuário reabrir a mesma tela de import com o mesmo arquivo: linhas cujo `import_key` já existe no banco retornam o `id` já criado (idempotência) em vez de duplicar — a barra de progresso simplesmente pula essas linhas rápido.

## 9. Limites

- Só `.csv` e `.xlsx`, até 10MB.
- Até 500 linhas por arquivo (mesmo teto do Conta Azul) — arquivo maior precisa ser dividido antes do upload; mensagem clara explica o motivo (mantém o import síncrono simples, sem fila em background).
- Uma conta financeira por execução de import (selecionada uma vez, usada em toda baixa automática do arquivo).

## 10. UI

- **Configurações → Importar Planilha**, mesmo padrão de navegação das outras telas de Configurações.
- **CTA de destaque** ("Nenhum lançamento ainda. Cadastre manualmente ou importe sua planilha") nas telas de Receitas, Despesas e no Painel quando o tenant não tem nenhum evento financeiro — mesmo padrão de "empty state como pitch de produto" que a pesquisa confirmou no Conta Azul.
- Resumo final pós-import: "X importados com sucesso, Y falharam" com motivo por linha, botão "Baixar linhas com erro" (gera um novo `.csv` só com as linhas que falharam, pronto pra corrigir e reimportar).

## 11. Testes

- Migration: `import_key` idempotente — duas chamadas ao RPC com a mesma chave retornam o mesmo `id`, sem duplicar evento/rateio/parcela/lançamento.
- RPC atômica: forçar um erro no meio da função (ex. categoria de outro tenant) e confirmar que nada foi inserido (nem o evento) — não deve sobrar linha órfã em nenhuma tabela.
- Regressão: Receitas, Despesas e o job de recorrência continuam funcionando exatamente igual depois da refatoração de `criarEventoFinanceiro()` pra RPC (nenhuma mudança de comportamento externo esperada).
- Parsing: arquivo `.csv` exportado de Excel BR real (`;` delimitador, Windows-1252, `1.234,56`) importa os valores certos sem intervenção manual; arquivo UTF-8 com `,` delimitador também funciona.
- Entidade nova: planilha com "Aluguel" e "aluguél" (erro de digitação) na mesma execução gera sugestão de correspondência na tela de revisão, não duas categorias.
- Duplicata: reimportar o mesmo arquivo duas vezes gera aviso de duplicata em todas as linhas da segunda vez, sem bloquear — usuário decide.
- Baixa automática: linha com data de pagamento preenchida nasce com parcela Quitada e a baixa correta; linha sem data nasce Pendente.
- Teste real no navegador: import de uma planilha de teste (~20 linhas, alguns erros propositais, uma categoria nova, uma duplicata) do começo ao fim, conferindo o resultado no banco.
