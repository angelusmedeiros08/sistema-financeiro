# Design — Recorrência de lançamentos e anexo de documentos

## 1. Contexto

Terceiro dos quatro ciclos de aprofundamento da Fase 1 pela ordem aprovada (rateio multi-categoria, centro de custo e ciclo de vida da parcela já commitados). Hoje um lançamento (evento financeiro) só existe se alguém preencher o formulário manualmente, uma vez, sem nenhum jeito de anexar o documento que originou ele (nota fiscal, contrato, comprovante de pagamento) — tudo isso hoje vive fora do sistema, em e-mail ou pasta local.

Pesquisa de referência (ao vivo, sessão autenticada no Conta Azul Pro, 2026-08-13 — detalhado em `docs/mapeamento-conta-azul-produto-ui.md` §2.1) confirmou dois pontos que mudam o desenho original:

1. **Nenhuma tela de lançamento no Conta Azul é um painel lateral (Sheet) com fundo borrado.** "Nova despesa", "Detalhes da despesa" e "Informar pagamento" são todas telas cheias (overlay de viewport inteira). A tela de detalhe funde o que a versão anterior deste produto separava em "histórico de baixas" numa única tabela, com um dropdown pequeno e ancorado por linha — não um Sheet. Isso disparou um rework do padrão visual dos 4 componentes de ação de parcela introduzidos no ciclo anterior (`baixa-sheet.tsx`, `renegociar-sheet.tsx`, `historico-baixas-sheet.tsx`, `cancelar-dialog.tsx`), que é parte do escopo desta fase (ver §6).
2. Conta Azul só encerra recorrência por "Após N ocorrências" ou "Dia específico" (sem indefinido) e nunca deixa uma série recorrente ser parcelada. Este produto vai além dos dois pontos deliberadamente (ver §3.1 e §3.3) — grounded na pesquisa, mas mais completo, seguindo o princípio já estabelecido de nunca escolher a opção mais simples quando uma mais completa é viável.

## 2. Escopo desta fase

**Dentro do escopo:**
- Recorrência de lançamentos: série com frequência configurável, término por N ocorrências, data específica, ou indefinido; geração automática via job agendado; edição da série afeta só ocorrências futuras; cancelamento da série.
- Anexo de documentos: no evento financeiro (nota fiscal, contrato, documento de cobrança) e na baixa (comprovante de pagamento) — arquivo ou link, múltiplos por registro.
- Rework visual dos 4 componentes de ação de parcela do ciclo anterior, de Sheet/Dialog para páginas cheias / modal pequeno conforme o caso — necessário porque o anexo de comprovante entra exatamente na tela de "dar baixa".

**Fora do escopo:**
- Editor de série tipo agenda ("esta ocorrência" vs. "esta e as futuras" vs. "todas") — só "série completa daqui pra frente" (ver §3.1).
- Fila de revisão/aprovação antes de uma ocorrência gerada virar lançamento — geração é direta, igual a um lançamento manual.
- OCR/IA extraindo dados do anexo (isso é o módulo "Captura" do Conta Azul, mapeado como parte da Fase 3 de IA, não desta fase).
- Transferência entre contas e parcelamento avançado (4º e último ciclo desta sequência).

## 3. Modelo de dados

### 3.1 Recorrência

Tabela nova `regras_recorrencia`: guarda o molde completo de uma série — todos os parâmetros que `criarEventoFinanceiro()` já recebe hoje (tipo, descrição, valor_total, categorias/rateio, centro de custo, pessoa, número de parcelas por ocorrência) mais o agendamento:

- `unidade_intervalo` (`DIA | SEMANA | MES`) + `intervalo` (inteiro positivo) — cobre semanal, quinzenal, mensal, trimestral, semestral, anual ou qualquer ciclo custom com só dois campos, em vez de um enum fixo por frequência.
- `data_inicio` — data da primeira ocorrência.
- `numero_ocorrencias` (nullable) e `data_fim` (nullable) — **no máximo um dos dois preenchido** (mesmo padrão de exclusividade mútua já usado em `centro_custo_id` vs. `centros_custo[]` do rateio); os dois nulos = indefinido, o job continua gerando dentro da janela rolante até a série ser cancelada. Isso vai além do Conta Azul (que só oferece os dois primeiros modos) deliberadamente — cobre despesas de fato sem prazo (aluguel) sem forçar uma data arbitrária no futuro.
- `ocorrencias_geradas` (contador, pra checar contra `numero_ocorrencias`).
- `ativa` (boolean, default `true`) — cancelar a série é só desligar essa flag; o job para de gerar, as ocorrências já criadas continuam intactas. Mesmo princípio de nunca apagar histórico já usado em `estornado_em`.
- `ultima_geracao_em` (timestamptz, controle de até onde o job já gerou).
- `tenant_id`, `criado_por`, `criado_em`.

`eventos_financeiros` ganha `regra_recorrencia_id uuid null references regras_recorrencia(id)` — só rastreabilidade (pra UI mostrar "gerado pela série X" e a tela de gestão listar as ocorrências de uma série). Depois de criada, uma ocorrência se comporta 100% como um evento manual — mesmo ciclo de vida de parcela, mesmo estorno/cancelamento/renegociação já existentes, sem nenhum acoplamento extra de comportamento.

**Recorrência com parcelamento**: cada ocorrência pode ter `numero_parcelas > 1` (reaproveita o campo que já existe em `criarEventoFinanceiro()`), diferente do Conta Azul que força à vista quando a recorrência está ligada. Decisão consciente: cobre um caso real (ex. honorário trimestral recorrente, pago em 3x) sem custo de modelagem adicional, já que o job só invoca `criarEventoFinanceiro()` com os mesmos parâmetros de sempre.

### 3.2 Anexo

Tabela nova `anexos`:

- `id`, `tenant_id`
- `evento_financeiro_id` (nullable) e `baixa_id` (nullable) — `CHECK` garantindo que exatamente uma esteja preenchida. Mesmo padrão de FK real (nunca associação polimórfica solta) já usado em todo o schema.
- `forma` (`ARQUIVO | LINK`).
- `tipo` (`CONTRATO | DOCUMENTO_FISCAL | DOCUMENTO_COBRANCA | OUTROS`) — mesmo catálogo confirmado ao vivo no Conta Azul.
- `descricao` (text, opcional).
- `storage_path`, `nome_arquivo`, `tamanho_bytes`, `mime_type` — preenchidos só quando `forma = ARQUIVO`.
- `url` — preenchido só quando `forma = LINK`.
- `criado_por`, `criado_em`.

Bucket privado no Supabase Storage (`comprovantes`), path `{tenant_id}/{evento_financeiro_id ou baixa_id}/{uuid}-{nome_arquivo}`. RLS em `storage.objects` espelhando `tenants_do_usuario_atual()` — nunca público; visualização/download sempre via URL assinada de curta duração. Tipos aceitos: PDF, JPG, PNG, WEBP; limite de 10MB por arquivo.

Sem policy de DELETE em `anexos` (mesmo padrão do resto do domínio) — um anexo errado não é apagado, só substituído por um novo registro. Isso também evita depender de UPDATE nessa tabela, então não há risco de repetir o bug de RLS achado no ciclo anterior (§ do spec de ciclo de vida da parcela) — só INSERT e SELECT são necessários.

## 4. Geração de ocorrências (job)

`pg_cron` roda 1x/dia e chama uma function SQL leve que só decide **quais** `regras_recorrencia` ativas têm a próxima ocorrência vencendo dentro da janela rolante (próximos 3 meses) e ainda não gerada — e dispara, via `pg_net`, uma chamada HTTP autenticada por segredo (header comparado contra uma env var, nunca exposta ao cliente) pra uma rota interna `/api/cron/gerar-recorrencias`.

Essa rota roda no Next.js e chama `criarEventoFinanceiro()` de verdade pra cada ocorrência pendente, com `data_competencia`/`primeiro_vencimento` calculados a partir de `data_inicio` + `unidade_intervalo`/`intervalo` + quantas ocorrências já foram geradas (reaproveitando a mesma lógica de `adicionarMeses()` já existente para o caso `unidade_intervalo = MES`, generalizada para dia/semana). Depois de cada criação bem-sucedida: incrementa `ocorrencias_geradas`, atualiza `ultima_geracao_em`, e desativa a regra (`ativa = false`) se `numero_ocorrencias` ou `data_fim` foi atingido.

**Zero duplicação de lógica de negócio** — rateio, centro de custo, parcelamento e o lançamento contábil de reconhecimento continuam vivendo só em `criarEventoFinanceiro()`, já testada. O job é só um agendador por cima do que já funciona.

Idempotência: a function SQL de decisão só considera regras onde `ultima_geracao_em` é anterior à próxima data esperada — uma segunda chamada acidental do cron não duplica ocorrências.

## 5. Fluxos de aplicação

Funções novas em `src/lib/contabil/`:

- **`criarRegraRecorrencia(supabase, params)`**: valida os mesmos campos de `criarEventoFinanceiro()` mais o agendamento (rejeita se `numero_ocorrencias` e `data_fim` vierem preenchidos juntos), insere em `regras_recorrencia`.
- **`cancelarRegraRecorrencia(supabase, { regra_id, tenant_id })`**: `UPDATE regras_recorrencia SET ativa = false` — simples, sem trigger de trava (não há invariante a proteger, diferente do cancelamento de parcela).
- **`editarRegraRecorrencia(supabase, { regra_id, tenant_id, ...campos })`**: atualiza o molde (valor, categorias, dia de vencimento etc.) — só afeta gerações futuras, nunca reabre eventos já criados.
- **`gerarOcorrenciasPendentes()`**: chamada pela rota de cron, itera as regras devidas e invoca `criarEventoFinanceiro()` para cada uma.
- **`anexarDocumento(supabase, { tenant_id, evento_financeiro_id OU baixa_id, forma, tipo, descricao, arquivo OU url })`**: se `forma = ARQUIVO`, faz upload pro bucket via Supabase Storage client, grava `storage_path`; se `forma = LINK`, só valida a URL e grava a linha.
- **`obterUrlAssinadaAnexo(supabase, { tenant_id, anexo_id })`**: gera a signed URL de curta duração pra visualização/download, revalidando tenant antes.

Todas seguem o princípio já estabelecido: nunca confiam em nada vindo do cliente sem revalidar contra o tenant do usuário autenticado.

## 6. UI

### 6.1 Rework: página de detalhe da parcela (substitui os 4 componentes do ciclo anterior)

Rotas novas `/contas-a-pagar/[parcelaId]` e `/contas-a-receber/[parcelaId]`, página cheia (mesmo tratamento visual do resto do app, sem overlay/blur):

- **Cabeçalho**: descrição, pessoa, categoria(s), valor total, vencimento, badge de status, com edição inline nos campos simples (ícone de lápis). Lista os anexos do evento financeiro (nome/link + tipo, abre em nova aba via URL assinada) com um botão "Adicionar anexo" que abre o formulário de anexo (mesmo componente usado em §6.5, num modal pequeno — é uma ação isolada de poucos campos, não justifica página própria).
- **Tabela "Pagamentos"** (substitui `historico-baixas-sheet.tsx`): Data | Forma | Conta | Valor | Juros/Multa/Desconto | Situação | Ações. Dropdown pequeno e ancorado por linha ("Estornar", "Ver anexos" quando a baixa tiver comprovante) — sempre visível na própria página.
- **Botões de ação contextuais ao status** (substituem o dropdown genérico `acoes-parcela.tsx`): "Dar baixa" (parcela `PENDENTE`/`RECEBIDO_PARCIAL`/`RENEGOCIADO`) navega pra §6.2; "Renegociar" (qualquer parcela não `QUITADO`/`CANCELADO`) navega pra §6.3; "Cancelar" (só `PENDENTE` sem baixa válida) abre o modal pequeno de §6.4, que sobrevive quase como está.

### 6.2 Página "Dar baixa"

Rota `/contas-a-pagar/[parcelaId]/baixa`, página cheia, mesmos campos que `baixa-sheet.tsx` já tem hoje (conta financeira, data, valor pago, método, juros/multa/desconto/taxa) mais uma seção colapsável **"Anexos"** no rodapé (botão "Adicionar anexo", lista os já anexados àquela baixa) — é exatamente onde o comprovante de pagamento entra, confirmado ao vivo no Conta Azul.

### 6.3 Página "Renegociar"

Rota `/contas-a-pagar/[parcelaId]/renegociar`, página cheia, mesmos campos que `renegociar-sheet.tsx` já tem hoje (nova data de vencimento, motivo).

### 6.4 Modal "Cancelar parcela"

Mantido como está hoje (`cancelar-dialog.tsx`) — confirmação pequena e direta (motivo + botão destrutivo) é exatamente o padrão que o próprio Conta Azul usa pra ação destrutiva, não precisa virar página.

### 6.5 Anexo no formulário de despesa/receita

Aba "Anexo" ao lado de "Observações" (o formulário de despesa/receita já é página cheia, sem rework necessário aqui) — tabela de linhas: Forma (Arquivo/Link), campo de arquivo (drag-and-drop) ou URL, Tipo, Descrição, botão "+ Adicionar anexo" pra múltiplas linhas.

### 6.6 Recorrência no formulário de despesa/receita

Toggle "Repetir lançamento?" no mesmo lugar do Conta Azul. Ligado, abre um modal pequeno e centrado "Configurar recorrência" (poucos campos, não justifica página): "Repetir a cada [N] [Dia(s)/Semana(s)/Mês(es)]", término (radio: N ocorrências | Dia específico | Indefinido). Quando ligado, o campo "Parcelamento" continua disponível (diferente do Conta Azul — ver §3.1).

### 6.7 Gestão de séries recorrentes

Página nova em Configurações → "Recorrências": tabela das séries (descrição, frequência, próxima geração, ocorrências geradas, status ativa/cancelada), mesmo padrão de listagem já usado em Centros de Custo. Ações por linha: editar (só afeta futuras, §5) ou cancelar série (modal pequeno de confirmação, mesmo padrão de §6.4).

## 7. Segurança

- RLS em `regras_recorrencia` e `anexos`: policies de SELECT+INSERT (mesmo padrão de `renegociacoes`); `regras_recorrencia` ganha também UPDATE (pra `ativa`/edição do molde) — **checar explicitamente que a policy de UPDATE existe na migration**, não assumir que SELECT+INSERT cobre (lição do ciclo anterior).
- Bucket `comprovantes` privado, RLS em `storage.objects` espelhando `tenants_do_usuario_atual()`, nunca acesso público direto.
- Rota `/api/cron/gerar-recorrencias` protegida por um segredo compartilhado (env var, nunca no cliente) comparado no header da requisição vinda do `pg_net`; rejeita qualquer chamada sem o header correto.
- Upload de arquivo: valida `mime_type` e `tamanho_bytes` no servidor antes de gravar a linha em `anexos`, nunca confia só na validação client-side.

## 8. Testes

- Migration de `regras_recorrencia`: `CHECK` rejeitando `numero_ocorrencias` e `data_fim` preenchidos juntos.
- Job de geração via `DO` block: regra mensal com `data_inicio` 2 meses atrás gera exatamente as ocorrências esperadas dentro da janela rolante, sem duplicar numa segunda chamada.
- Regra com `numero_ocorrencias = 3`: desativa sozinha (`ativa = false`) depois da 3ª geração.
- Anexo: upload de arquivo grava `storage_path` correto e é recuperável via URL assinada; anexo tipo Link não exige upload; `CHECK` de "exatamente uma FK preenchida" rejeitando as duas nulas e as duas preenchidas.
- Fluxo real ponta a ponta: criar série recorrente mensal com 3x → job gera a 1ª ocorrência → dar baixa com comprovante anexado → estornar → anexo continua acessível na baixa estornada (nunca apagado).
- Regressão: os 4 fluxos de ação de parcela do ciclo anterior (dar baixa, renegociar, ver histórico, cancelar) continuam funcionando idênticos depois do rework visual — só a casca muda, não o comportamento.
- UI: nenhuma das telas novas ou reworkadas usa Sheet/Dialog de painel lateral — checagem manual contra o padrão confirmado em `docs/mapeamento-conta-azul-produto-ui.md` §2.1.

## 9. Riscos e decisões em aberto

- **Job via `pg_cron` + `pg_net`** depende dessas duas extensions estarem disponíveis no plano Supabase do projeto — confirmar na hora de aplicar a migration; se não estiverem, alternativa é um cron externo (Vercel Cron ou similar) chamando a mesma rota, sem mudar nada do desenho da rota em si.
- **Recorrência indefinida** nunca "termina" sozinha — se o usuário esquecer de cancelar uma série (ex. assinatura cancelada na vida real mas não no sistema), o job continua gerando lançamentos incorretos indefinidamente. Mitigação futura possível (fora de escopo agora): alerta no painel pra séries indefinidas sem revisão há mais de N meses.
- **Recorrência com parcelamento** (§3.1) é mais complexo que o Conta Azul faz — se na prática pouca gente usar a combinação, é uma complexidade paga sem uso; decisão consciente de manter mesmo assim, grounded na explicit instrução de priorizar completude.

## 10. Fora de escopo desta fase, explicitamente

Editor de série tipo agenda (esta/esta e futuras/todas), fila de revisão antes de confirmar ocorrência gerada, OCR/IA sobre anexos, transferência entre contas e parcelamento avançado (4º ciclo), Fase 2 (portal do cliente), Fase 3 (BI avançado).
