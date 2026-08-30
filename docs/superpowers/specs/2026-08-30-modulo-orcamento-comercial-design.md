# Módulo Orçamento comercial — módulo próprio em Comercial

30/08/2026. Substitui a Parte B do spec [2026-08-30-previsionamento-orcamento-comercial-design.md](2026-08-30-previsionamento-orcamento-comercial-design.md), que tratou "Orçamento" como uma extensão de status dentro da própria tabela `vendas` — uma leitura errada, corrigida pelo usuário: Orçamento é um **módulo próprio** dentro de Comercial, relacionado a Vendas e a Produtos e serviços, mas com sua própria tabela, sua própria numeração e sua própria tela. A Parte A daquele spec (renomear o módulo antigo de metas por categoria pra "Previsionamento") continua válida e não é afetada por este documento.

## 1. Reversão do que ficou errado

Tudo que a leva anterior (commits `a028f0a`, `0a2143a`) adicionou em cima de `vendas` sai, e junto sai também o "Enviar orçamento" que já existia dentro de Vendas **antes** desta sessão (raiz da confusão original: staff clicando Aprovar/Recusar no lugar do cliente, sem link real).

- `status_venda` recriado só com `RASCUNHO`/`APROVADO`/`RECUSADO` (sai `ENVIADO` e `EXPIRADO` — nenhuma linha real usa esses dois valores, é seguro recriar o tipo).
- Colunas `validade`/`token_publico`/`motivo_recusa` saem de `vendas`.
- Função e cron `expirar_orcamentos_diario` são removidos.
- Rota `/orcamento/[token]` (a que lia de `vendas`) é removida — o módulo novo recria a mesma URL lendo da tabela nova.
- `venda-acoes.tsx` volta a só ter Aprovar/Recusar (sem Enviar/Reenviar). `venda-form.tsx` perde o campo "Validade do orçamento". `vendas.ts`/`vendas-actions.ts` perdem `enviarOrcamento`/`reenviarOrcamento`/`validadeSugerida` e os campos extras de `VendaDetalhe`; `recusarVenda` volta a não ter `motivoRecusa`.
- A venda de teste criada durante a verificação da leva errada ("Cliente Alfa Ltda", Consultoria Avulsa R$ 15.000, status ENVIADO) é apagada.
- `tentativas_auth` mantém a finalidade `orcamento_publico` (migration 047) — vai ser reaproveitada pelo módulo novo, sem mudança.
- Sidebar: "Previsionamento" volta pro grupo Análise, ao lado de Indicadores.

## 2. Modelo de dados

Duas tabelas novas, espelhando `vendas`/`venda_itens` exatamente na forma (mesmas colunas, mesmo padrão de RLS, mesmo padrão de numeração por trigger):

```sql
create type status_orcamento_comercial as enum ('RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'EXPIRADO');

create table orcamentos_comerciais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  numero integer not null,
  pessoa_id uuid not null references pessoas(id),
  status status_orcamento_comercial not null default 'RASCUNHO',
  data_emissao date not null,
  forma_pagamento_id uuid references formas_pagamento(id),
  numero_parcelas integer not null default 1,
  primeiro_vencimento date,
  observacoes text,
  validade date,
  token_publico text,
  motivo_recusa text,
  venda_gerada_id uuid references vendas(id),
  criado_por uuid,
  criado_em timestamptz not null default now()
);
create unique index orcamentos_comerciais_token_publico_unico on orcamentos_comerciais (token_publico) where token_publico is not null;

create table orcamento_comercial_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  orcamento_id uuid not null references orcamentos_comerciais(id) on delete cascade,
  produto_servico_id uuid not null references produtos_servicos(id),
  descricao text not null,
  quantidade numeric not null,
  preco_unitario numeric not null,
  valor_total numeric generated always as (quantidade * preco_unitario) stored
);
```

- Numeração: trigger `before insert` idêntico ao de `vendas` (`select coalesce(max(numero),0)+1 from orcamentos_comerciais where tenant_id = new.tenant_id`), sequência própria — o orçamento #1 não tem relação com a venda #1.
- RLS: cópia exata das policies de `vendas`/`venda_itens` (select/insert/update/delete restritos a staff do tenant com papel admin/financeiro_senior/financeiro_junior/contador; select também exige `eh_staff_do_tenant`). O link público nunca usa essas policies — passa pelo client administrativo, igual `/assinar`.
- `produto_servico_id` com `on delete no action` (mesmo padrão de `venda_itens` — produto nunca é apagado de verdade enquanto referenciado, só desativado via `ativo=false`; a UI de criação de orçamento já filtra por `apenasAtivos`, igual Vendas faz hoje).

## 3. A ponte Orçamento → Venda

Função nova, `gerar_venda_de_orcamento(p_tenant_id, p_orcamento_id, p_criado_por)`, `security invoker`:

1. `select ... for update` na linha do orçamento (mesmo padrão de lock de `aprovar_venda`) — trava contra dupla-aprovação concorrente (cliente clica no link e staff clica "aprovar manualmente" ao mesmo tempo, ou duplo clique/duplo submit do próprio cliente).
2. Valida `status = 'ENVIADO'` e, se houver `validade`, que ainda não passou — quem chama (ação pública ou ação do staff) já filtra isso antes, mas a função revalida por conta própria: a trava é o `for update`, não a UI.
3. `insert into vendas (...) values (...)` copiando cliente/forma de pagamento/parcelas/primeiro vencimento/observações do orçamento, com `status = 'RASCUNHO'` (único estado que `aprovar_venda` aceita como ponto de partida, ver passo 5).
4. `insert into venda_itens (...) select ...` copiando os itens do orçamento (descrição/quantidade/preço já denormalizados, sem depender do produto ainda existir do jeito que estava).
5. `select aprovar_venda(p_tenant_id, v_nova_venda_id, p_criado_por) into v_evento_id` — **reaproveita a função já existente e testada**, que valida primeiro vencimento, categoria financeira de cada item e cria o lançamento com o rateio certo. Nenhuma lógica de ledger é duplicada.
6. `update orcamentos_comerciais set status='APROVADO', venda_gerada_id=v_nova_venda_id where id=p_orcamento_id`.
7. Devolve o id da venda gerada.

Se o passo 5 falhar (ex: um item aponta pra um produto sem categoria financeira válida — só acontece se o produto foi mexido depois do orçamento criado), a transação inteira desfaz — nem a venda nem a atualização de status ficam pela metade. A ação que chama essa função (tanto a pública quanto a do staff) captura esse erro e devolve uma mensagem genérica ("Não foi possível confirmar este orçamento agora — contate o vendedor"), nunca a mensagem SQL crua, principalmente no caminho público sem autenticação.

Recusa (pelo cliente ou pelo staff) é só um `update orcamentos_comerciais set status='RECUSADO', motivo_recusa=... where status='ENVIADO'` — sem RPC, mesmo padrão que `recusarVenda` já usava.

## 4. Casos de borda cobertos

- **Corrida cliente × staff**: o `for update` no passo 1 serializa qualquer combinação de aprovar/recusar simultâneos — quem chega primeiro vence, o segundo recebe "esse orçamento já foi resolvido".
- **Expiração no meio da decisão**: tanto a leitura pública quanto a ação de aprovar/recusar recalculam `efetivamente_expirado` (`status='ENVIADO' and validade < hoje`) no momento da ação, não confiam no que a página carregou — um cliente com a aba aberta há dias não consegue aprovar um orçamento que expirou nesse meio-tempo.
- **Produto alterado entre criar e aprovar**: itens do orçamento guardam descrição/preço no momento da criação (denormalizado); se o produto perdeu a categoria financeira depois, `aprovar_venda` recusa com erro claro (capturado e traduzido, não vaza SQL).
- **Cliente sem e-mail**: bloqueia o envio (mesma regra já decidida), com mensagem pedindo pra cadastrar o e-mail antes.
- **Orçamento expirado**: reenvio mantém o mesmo token (link antigo do cliente continua funcionando após o reenvio).
- **Orçamento recusado**: não tem reenvio automático — se o cliente mudar de ideia, o staff cria um orçamento novo (mesma regra que já valia pra vendas recusadas: não editável depois de decidido).
- **Múltiplos orçamentos abertos pro mesmo cliente**: permitido, sem trava de unicidade — um cliente pode ter cotações paralelas de projetos diferentes.
- **Rascunho nunca enviado**: fica parado indefinidamente (staff decide quando enviar ou descarta virando RECUSADO manualmente) — mesmo comportamento que rascunho de venda sempre teve.
- **Token adivinhado/força bruta**: rate limit por token via `tentativas_auth` (finalidade `orcamento_publico`, já existente) continua valendo, tanto pra aprovar quanto pra recusar.
- **E-mail malicioso no nome do cliente/observações**: todo campo de texto do e-mail passa por `escaparHtml()` antes de entrar no HTML (mesma proteção já usada em convite/alerta).

## 5. Navegação e telas

- `/orcamentos` — lista com filtros por status (espelha `/vendas`).
- `/orcamentos/nova` — formulário (cliente, itens, forma de pagamento, parcelas, observações; sem "Confirmar venda direta" — o único destino de um orçamento é ser decidido pelo cliente ou pelo staff).
- `/orcamentos/[id]` — detalhe com ações: Enviar/Reenviar, Aprovar manualmente, Recusar manualmente; mostra validade, motivo de recusa quando houver, e link "ver venda gerada" quando aprovado.
- `/orcamento/[token]` — link público do cliente (mesma UI que já existia, agora lendo `orcamentos_comerciais`).
- Sidebar: "Orçamentos" entra no grupo Comercial (Vendas, Produtos e serviços, Orçamentos).

## 6. Fora de escopo

- Revivificar um orçamento recusado (cria um novo).
- Anexar PDF ao orçamento (só a página web pelo link).
- Versionamento/histórico de alterações do orçamento (edição sobrescreve, sem trilha) — mesmo comportamento que vendas já tem hoje.

## 7. Testes ao vivo antes de dar como concluído

1. Criar orçamento → enviar com validade customizada → confirmar e-mail recebido.
2. Abrir link público (navegador sem sessão) → aprovar → confirmar venda gerada em Vendas e lançamento em Contas a Receber.
3. Mesmo fluxo recusando, com e sem motivo.
4. Staff aprova/recusa manualmente pela tela `/orcamentos/[id]` (sem passar pelo link).
5. Editar orçamento ENVIADO → validade reseta, novo e-mail sai.
6. Forçar expiração (backdatar validade) → cron roda → status vira EXPIRADO → link mostra "expirado" sem botões.
7. Reenviar orçamento expirado → mesmo token, novo e-mail.
8. Tentar decidir um token já resolvido → sem efeito duplicado.
9. Cliente sem e-mail → envio bloqueado com mensagem clara.
10. Dois cliques rápidos em Aprovar (staff e cliente simultâneos, ou duplo clique) → só uma venda gerada.
