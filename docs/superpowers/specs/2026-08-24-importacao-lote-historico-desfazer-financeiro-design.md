# Importação: lote, histórico e reversão segura pro financeiro

## Contexto

Fatia 4 de 4 (última) da revisão do módulo de Importação. Pedido original: poder desfazer uma importação financeira inteira (planilha errada, competência errada, cadastro mal vinculado) sem precisar caçar lançamento por lançamento. Já existe um sistema de lote/histórico/desfazer completo — só que exclusivo do tipo `pessoas` (`lib/importacoes/importacoes.ts`, tabelas `importacoes`/`importacoes_itens`, tela `/importacao/historico`).

**Achado que muda o tamanho real desta fatia**: confirmado direto no banco (trigger `trg_lancamentos_imutavel`/`trg_partidas_imutavel`, `BEFORE UPDATE OR DELETE`, sem exceção nem pra service-role) que `lancamentos`/`partidas` nunca podem ser apagados ou editados — a mensagem do próprio erro do banco diz "crie um lançamento de estorno em vez de alterar ou apagar". Todo `evento_financeiro` já nasce, na mesma transação de `criar_evento_financeiro`, com um lançamento de reconhecimento imutável — não existe "caso simples, nunca foi tocado" que permita um DELETE de verdade. "Desfazer importação financeira" não pode ser uma feature de exclusão; tem que ser construída sobre reversão contábil de verdade — uma peça de razão contábil que hoje não existe (só há `estornarBaixa()`, que reverte *pagamento*, e `cancelarParcela()`, que só muda status). Essa peça (`estornar_evento_financeiro`) é o núcleo desta fatia; "desfazer importação" é o primeiro consumidor dela, não o problema em si.

## Núcleo: `estornar_evento_financeiro` (RPC)

Mesmo padrão de `criar_evento_financeiro` — uma função de banco, transacional, chamada por um wrapper TS fino (`lib/contabil/evento-financeiro.ts`).

```sql
estornar_evento_financeiro(p_tenant_id uuid, p_evento_id uuid, p_motivo text, p_criado_por uuid) returns void
```

Passos, todos na mesma transação:
1. **Barra se qualquer parcela do evento tem baixa viva** (`exists (select 1 from baixas b join parcelas p on p.id=b.parcela_id where p.evento_financeiro_id=p_evento_id and b.estornado_em is null)`) — mesma checagem que `bloquear_cancelamento_com_baixa()` já faz por parcela, replicada aqui no nível do evento inteiro. Erro explícito: "Existe baixa registrada para este evento — estorne a baixa primeiro."
2. Barra se o evento já foi estornado (`eventos_financeiros.estornado_em is not null`) — idempotência, evita estorno duplo.
3. Localiza o lançamento de reconhecimento: `select * from lancamentos where tenant_id=p_tenant_id and referencia_id=p_evento_id and origem='MANUAL'` (a mesma regra usada na criação — `referencia_id` é referência polimórfica de aplicação, sem FK).
4. Cancela toda parcela do evento — só pode estar `PENDENTE` ou `ATRASADO` neste ponto, porque o passo 1 já bloqueou qualquer evento com baixa viva em qualquer parcela (`RECEBIDO_PARCIAL`/`QUITADO` exigem baixa) (`UPDATE parcelas SET status='CANCELADO', motivo_cancelamento=p_motivo`).
5. Cria o lançamento contrário: mesma `data_competencia`/`descricao` prefixada "Estorno: ", `origem='ESTORNO'`, `estornado_de_id` apontando pro lançamento original, com as partidas invertidas (mesmo padrão de `estornarBaixa()`: para cada partida original, uma nova com `tipo` trocado DEBITO↔CREDITO e mesmo valor).
6. `UPDATE eventos_financeiros SET estornado_em = now() WHERE id = p_evento_id`.

Nunca toca em `RENEGOCIADO` — parcela renegociada já gerou linhagem própria (`renegociacoes`), reverter o evento original nesse estado é ambíguo o bastante pra tratar como "protegido, precisa de atenção manual" em vez de decidir sozinho.

## Detecção de modificação posterior

`eventos_financeiros` e `parcelas` ganham `atualizado_em timestamptz not null default now()`, mantida por trigger `BEFORE UPDATE` (mesmo padrão de qualquer outro `atualizado_em` já usado no projeto). "Desfazer importação" nunca reverte silenciosamente um registro cujo `atualizado_em` diverge do `criado_em` — foi editado à mão depois da importação, entra na lista de "precisa de atenção" em vez de ser revertido automaticamente.

## Rastreamento do lote financeiro

- `tipo_importacao` ganha o valor `'financeiro'` (`ALTER TYPE ... ADD VALUE`, migration própria por causa da regra de não usar o valor novo na mesma transação que o cria).
- `importacoes_itens` ganha `evento_financeiro_id uuid references eventos_financeiros(id)` — o que aquela linha criou (paralelo ao `pessoa_id` já existente, usado pelo import de Pessoas).
- **Tabela nova `importacoes_entidades_criadas`**: `id`, `importacao_id references importacoes`, `tenant_id`, `tipo_entidade text check (categoria, centro_custo, forma_pagamento, pessoa)`, `entidade_id uuid`, `criado_em`. Motivo de ser tabela própria e não reaproveitar `importacoes_itens`: no import financeiro, categoria/centro de custo/forma de pagamento/pessoa nascem **uma vez por valor único**, na etapa Cadastros, antes de qualquer linha ser processada — não é 1:1 com uma linha do arquivo (diferente do import de Pessoas, onde cada linha *é* uma pessoa). RLS staff-only, policy de INSERT/SELECT (sem UPDATE/DELETE — é só rastro de proveniência, nunca editado).

### Onde o lote nasce

Diferente do import de Pessoas (que só cria o lote bem no fim, ao abrir a etapa de execução), o import financeiro precisa do `importacao_id` **antes** da etapa Cadastros, pra poder registrar as entidades criadas ali. `iniciarImportacaoFinanceira()` roda ao entrar na etapa Cadastros (status `em_andamento`, `total_linhas` = linhas válidas vindas do mapeamento). `criarEntidadesAprovadasAction` (já existente) ganha um parâmetro a mais (`importacaoId`) e grava uma linha em `importacoes_entidades_criadas` por entidade nova. Ao entrar na etapa de execução (5. Importação), os itens "pendente" (um por linha) são criados como já acontece hoje no import de Pessoas — e cada `importarLinhaAction` bem-sucedida atualiza o item com o `evento_financeiro_id` retornado.

## Fluxo de desfazer

**`preverDesfazerImportacaoFinanceira(importacaoId)`** — só leitura, nenhuma mutação, roda antes de qualquer botão de confirmação real aparecer:
- Para cada item `criar`/`sucesso` com `evento_financeiro_id`: classifica em **a reverter** (sem baixa, sem modificação posterior), **protegido por baixa** (tem baixa viva em alguma parcela), ou **protegido por modificação** (evento ou alguma parcela com `atualizado_em` divergente do `criado_em`).
- Para cada entidade em `importacoes_entidades_criadas`: verifica se tem uso fora deste lote (evento/rateio/parcela referenciando ela que não seja um dos itens já marcados "a reverter" desta mesma importação) → **entidade a remover** ou **entidade preservada** (com o motivo).
- Devolve os 4 conjuntos com contagem e uma amostra legível (nome/descrição), pra montar a tela de prévia — nada é alterado nesta chamada.

**`desfazerImportacaoFinanceira(importacaoId, { incluirModificados: boolean })`** — a ação real, chamada só depois da prévia confirmada:
1. Roda `estornar_evento_financeiro` pra cada item "a reverter" (e também os "protegido por modificação" se `incluirModificados=true`, decisão explícita do usuário, nunca padrão).
2. Marca cada `importacoes_itens.desfeito_em`.
3. Pras entidades em `importacoes_entidades_criadas`: usa `createAdminClient()` (mesmo padrão já usado por `desfazerImportacao` de Pessoas — `categorias_financeiras`/`centros_custo`/`formas_pagamento`/`pessoas` não têm policy de DELETE de propósito) pra apagar só as que a prévia já classificou como "a remover"; nunca reavalia isso na hora, usa exatamente o snapshot da prévia que o usuário confirmou.
4. Fecha o lote (`importacoes.status = 'concluida'`, mantendo o próprio registro do lote pra sempre — nunca é apagado, mesmo depois de desfeito, fica com `status` refletindo o resultado).
5. Tudo dentro de uma transação por evento estornado (a RPC já garante isso por evento; a remoção de entidade em lote roda depois, sequencial — se uma falhar no meio, as anteriores já se foram, mas o rastro em `importacoes_entidades_criadas`/`importacoes_itens` mostra exatamente até onde chegou, nunca um estado ambíguo).

## Segurança e permissões

Sem tier de permissão novo — reaproveita a mesma checagem de papel já aplicada a toda escrita sensível do domínio financeiro (`private.usuario_tem_papel(tenant_id, array['admin','financeiro_senior','financeiro_junior','contador'])`, já em vigor via RLS em `eventos_financeiros`/`parcelas`/`lancamentos`/`partidas`). Não crio uma hierarquia "usuário comum vs. autorizado vs. admin" nova — o projeto não tem esse nível de granularidade em nenhum outro lugar hoje, e inventar um sistema de permissão só pra esta feature seria inconsistente com o resto do app. `cliente_portal` já não tem acesso a nada deste domínio.

`estornar_evento_financeiro` é `SECURITY INVOKER` (padrão, não `DEFINER`) — corre com o papel de quem chama, então a mesma RLS que protege INSERT em `lancamentos`/`partidas`/`parcelas` continua valendo dentro da função.

## UI

`/importacao/historico` (já existe) passa a listar lotes `tipo='financeiro'` também — mesmo componente, badge de tipo diferenciando. Detalhe do lote financeiro mostra a lista de eventos criados (com link pro lançamento) e o botão "Desfazer esta importação" abre a tela de prévia (novo componente, `previa-desfazer-financeiro.tsx`) antes de qualquer confirmação — replica a estrutura de texto já pedida: "Serão revertidos: X eventos. Serão preservados: Y cadastros (em uso fora desta importação). Precisam de atenção: Z modificados depois, W já baixados" — com os "W já baixados" **nunca** incluídos automaticamente, mesmo marcando "incluir modificados".

## Fora de escopo

"Corrigir e reimportar" (desfazer + reaplicar mapeamento corrigido automaticamente) — mencionado como ideia futura, mas o histórico já guarda `dados_normalizados` de cada item, então fica arquiteturalmente pronto pra isso sem mudança de schema quando alguém pedir. Hierarquia de permissão granular (comum/autorizado/admin) — reaproveita o modelo de papel já existente, ver seção Segurança. Reversão de renegociação (parcela `RENEGOCIADO`) — protegida, nunca revertida automaticamente.

## Testes

- Evento sem baixa, sem modificação → `estornar_evento_financeiro` cria lançamento contrário balanceado, cancela a parcela, marca `estornado_em`.
- Evento com baixa viva → RPC rejeita com mensagem clara; `preverDesfazerImportacaoFinanceira` já classifica como "protegido por baixa" antes mesmo de tentar.
- Evento com parcela editada manualmente depois (data de vencimento mudou) → aparece em "protegido por modificação", não reverte a menos que `incluirModificados=true` seja escolhido explicitamente.
- Categoria criada pela importação e nunca usada fora dela → removida ao desfazer.
- Categoria criada pela importação e depois usada num lançamento manual separado → preservada, com aviso.
- Pessoa criada pela importação, usada só nos eventos desta mesma importação, todos revertidos com sucesso → pessoa é removida.
- Pessoa criada pela importação, mas um dos eventos ficou protegido por baixa (não reverteu) → pessoa é preservada (ainda está em uso).
- Desfazer duas vezes o mesmo lote → segunda tentativa não reprocessa itens já com `desfeito_em` preenchido, não duplica estorno.
- Lote inteiro (todos os eventos revertíveis) → confirma que o saldo/DRE do tenant volta exatamente ao estado anterior à importação (mesmo total, mesmo saldo em caixa).
