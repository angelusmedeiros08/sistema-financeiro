# Central de Importações: histórico, retomar e desfazer (Importação de Clientes/Fornecedores)

## Contexto

A importação de clientes/fornecedores por planilha (já implementada e testada) roda hoje inteiramente na memória do navegador: cada linha é enviada uma de cada vez pra uma server action (`importarLinhaPessoaAction`), o progresso vive só no `useState` de `PassoResultado`, e nada fica gravado no banco além das próprias pessoas criadas/atualizadas. Se a conexão cair, a aba fechar, ou o usuário clicar duas vezes em "Importar", não existe proteção contra duplicar, não existe registro de que aquela importação aconteceu, e não existe como corrigir só as linhas que falharam sem refazer o assistente inteiro.

Pesquisa de mercado (18-19/08/2026) mostrou que isso é uma lacuna real, não um exagero de escopo:

- **QuickBooks e Xero não têm desfazer importação nenhum** — a orientação oficial é filtrar e excluir em lote manualmente.
- **Salesforce** tem uma forma de desfazer, mas primitiva: não rastreia lotes, o usuário precisa achar um registro criado pela importação, estimar o horário de início/fim a partir do campo "Criado em", e rodar exclusão em massa filtrada por esse intervalo — limitado a 250 registros por vez.
- **Conta Azul, Omie e Bling** (concorrentes diretos, mercado de PME brasileira) não têm histórico, retomar ou desfazer — a estratégia deles é 100% preventiva (modelo de planilha rígido, validação de formatação). Bling e Conta Azul convergem no mesmo limite de 500 linhas por importação — não é uma limitação nossa, é padrão do segmento.
- **HubSpot** é a referência mais próxima do que queremos: mantém histórico navegável de importações passadas e permite desfazer uma importação apagando os registros que ela criou (atualizações em cadastros existentes não podem ser desfeitas — limitação aceita mesmo lá).
- **Airtable** confirma o padrão de resumo pré-confirmação (contagem de novos/atualizados) antes do clique final que grava os registros.

Rastrear cada importação como um lote de verdade no banco — não só na tela — resolve de uma vez integridade (idempotência), auditoria (quem importou o quê, quando) e recuperação (retomar, desfazer), no nível de HubSpot e à frente de Salesforce/QuickBooks/Xero/Conta Azul especificamente no segmento financeiro.

## Escopo

**Dentro:**
- Registrar toda importação de pessoas como um lote persistido (`importacoes` + `importacoes_itens`), com o resultado de cada linha gravado conforme commita — não só em memória do navegador.
- Resumo pré-confirmação na tela de revisão: contagem de "novos" vs. "atualizações" antes do clique que efetivamente grava.
- Cancelar uma importação em andamento: para de enviar novas linhas; as já commitadas ficam gravadas (mesmo comportamento do Bulk API do Salesforce).
- Retomar/tentar de novo: reabre um lote específico e reenvia só as linhas com status de erro.
- Central de Importações (nova tela em Configurações): lista lotes passados com contagem de sucesso/erro/pendente, link pro detalhe de cada um.
- Desfazer importação: apaga as pessoas que aquele lote **criou** (nunca atualizações em pessoas já existentes) — com trava de segurança: uma pessoa criada pela importação só pode ser removida se não tiver nenhum lançamento financeiro vinculado (`eventos_financeiros.pessoa_id`). Pessoas protegidas aparecem listadas como "não removidas" no resultado do desfazer.
- Mais campos editáveis na grade de revisão: e-mail, telefone e CEP passam a ser corrigíveis inline (hoje só nome/perfil/documento são).

**Fora:**
- Fila de processamento em background (Redis/BullMQ ou equivalente) — desproporcional ao volume atual (centenas de linhas, não milhões); o commit client-driven sequencial que já existe continua sendo o mecanismo de execução, só ganha rastro persistido.
- Processamento em paralelo de múltiplas linhas — linhas que apontam pra mesma pessoa existente dependem de ordem (união de perfis lê o estado atual antes de escrever); manter sequencial evita essa classe de condição de corrida.
- Aumentar o limite de 500 linhas / 10MB — confirmado como padrão de mercado no segmento (Bling e Conta Azul usam o mesmo número), não é lacuna competitiva.
- Edição inline de campos personalizados na grade de revisão — variam por tenant, adicionar depois se aparecer necessidade real.
- Aplicar o mesmo mecanismo de histórico/desfazer no módulo de importação de **lançamentos financeiros** (`lib/importacao/`) — esse já tem idempotência via `import_key`; portar pra ele o conceito de "lote navegável" fica pra um ciclo futuro, não é parte deste.

## Modelo de dados

**`importacoes`** (novo): `id`, `tenant_id`, `tipo` (enum, só `'pessoas'` por enquanto — deixa aberto pra futuro reuso com lançamentos), `nome_arquivo`, `status` (`'em_andamento' | 'concluida' | 'cancelada'`), `total_linhas`, `criado_por` (FK `usuarios`), `criado_em`.

**`importacoes_itens`** (novo): `id`, `importacao_id` (FK, cascade), `tenant_id`, `linha_numero`, `status` (`'sucesso' | 'erro' | 'pendente'`), `acao` (`'criar' | 'atualizar'`), `pessoa_id` (nullable — preenchido só quando `status = 'sucesso'`), `erro` (texto, nullable), `dados_normalizados` (jsonb — os mesmos campos que hoje só existem no `LinhaPronta` do cliente, persistidos pra permitir retomar sem reprocessar o arquivo original), `criado_em`.

RLS em ambas: mesmo padrão staff-only já usado em `pessoas`/`extrato_linhas` (SELECT via `eh_staff_do_tenant`, INSERT/UPDATE/DELETE via `usuario_tem_papel` com os papéis financeiros — não restrito a admin, já que financeiro_junior/senior já podem importar pessoas hoje).

## Fluxo de execução

1. Ao entrar em "4. Importando" (`passo-resultado.tsx`), a primeira ação é criar a linha em `importacoes` (`status: 'em_andamento'`) e uma linha em `importacoes_itens` por linha do arquivo (`status: 'pendente'`) — isso substitui o `useState` local como fonte de verdade do progresso.
2. O loop sequencial client-driven continua igual (uma linha por vez, aguardando resposta antes da próxima), mas cada resultado agora **atualiza** o item persistido (`sucesso`/`erro` + `pessoa_id`/`erro`) em vez de só empilhar num array em memória.
3. **Cancelar**: um botão para o loop antes do próximo envio (a linha em voo termina normalmente). `importacoes.status` vira `'cancelada'`; os itens que não rodaram ficam `'pendente'`.
4. **Retomar**: só aparece pra lotes `'cancelada'` ou `'concluida'` com pelo menos um item `'erro'`/`'pendente'`. Busca os `dados_normalizados` desses itens específicos (sem precisar do arquivo original) e roda o mesmo loop só neles.
5. **Desfazer**: busca todos os itens `sucesso` + `acao: 'criar'` do lote, verifica quais `pessoa_id` têm linha em `eventos_financeiros` — os sem lançamento são apagados (pessoa + endereço/contato em cascata) e o item marcado como desfeito; os com lançamento ficam protegidos e aparecem na resposta como "não removidos, em uso em lançamentos".

## UI

- **Passo de revisão** (`passo-revisao.tsx`): antes do botão final de importar, um resumo fixo mostra "X pessoas novas · Y atualizações" — computado dos mesmos dados que já alimentam a grade, sem chamada nova ao servidor.
- **Grade de revisão**: campos de e-mail, telefone e CEP passam de texto fixo pra input editável, seguindo o mesmo padrão dos 3 campos já editáveis hoje.
- **`passo-resultado.tsx`**: ganha botão "Cancelar" (visível só enquanto roda) e, ao concluir/cancelar, os botões "Tentar de novo" (retomar) somem se não houver itens pendentes/erro.
- **Central de Importações** (`/configuracoes/importacoes`, nova, listada na sub-nav de Configurações): tabela com data, arquivo, quem importou, contagem sucesso/erro, status. Cada linha abre o detalhe (`/configuracoes/importacoes/[id]`): lista de itens com erro (mesmo formato do CSV de erro já existente, mas navegável na tela), botão "Retomar" se aplicável, botão "Desfazer importação" com confirmação explicando quantas pessoas serão removidas e quantas ficarão protegidas.

Telas novas seguem o padrão visual já estabelecido no projeto (página cheia, sem modal/drawer) — tratamento estético fica pro `/frontend-design` na hora de implementar.

## Testes

- Importar um arquivo, fechar a aba no meio, reabrir a Central de Importações: o lote aparece como "em andamento" com o progresso real gravado (não perdido).
- Cancelar no meio de uma importação: linhas já gravadas permanecem; itens não processados ficam `pendente`; retomar reenvia só esses.
- Provocar erro proposital em algumas linhas (documento inválido, por exemplo), concluir a importação, retomar: só as linhas com erro são reenviadas, as de sucesso não duplicam.
- Desfazer uma importação sem nenhum lançamento vinculado: todas as pessoas criadas somem.
- Desfazer uma importação onde uma das pessoas criadas já foi usada numa venda/lançamento: essa pessoa específica fica protegida, as demais são removidas, resposta lista qual ficou de fora e por quê.
- Reenviar a mesma planilha duas vezes sem cancelar nada no meio: confirma que não há duplicação de pessoas (o comportamento de correspondência por documento/nome já existente continua sendo a proteção primária; o lote persistido é a proteção contra reenvio acidental do mesmo processamento).
- Resumo pré-confirmação bate com o resultado real após a importação rodar.
