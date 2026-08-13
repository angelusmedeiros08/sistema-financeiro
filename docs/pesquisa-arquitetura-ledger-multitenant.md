# Pesquisa — Arquitetura de ledger e multi-tenant em sistemas financeiros maduros

Pesquisa externa (não mais sobre o Conta Azul) para embasar a decisão de arquitetura do núcleo financeiro, antes de fechar a estrutura técnica da Fase 0+1.

---

## 1. Modern Treasury — por que partida dobrada mesmo fora de bancos

Modern Treasury vende "ledger infrastructure" pra empresas que não são banco, e documenta publicamente por quê. Modelo: `ledger_account` (conta contábil clássica) → `transaction` → múltiplas `entries` (débito ou crédito, sempre batendo por moeda). **Imutável**: nenhuma transação publicada é deletada/editada — correções são sempre entradas reversas novas, com versionamento por timestamp, versão de conta (snapshot de saldo) e versão de transação.

**O argumento central não é compliance contábil — é engenharia de consistência.** Modern Treasury cita publicamente que Uber, Square e Airbnb tiveram problemas sérios de rastreamento de dinheiro por não terem partida dobrada desde o início. Débito=crédito funciona como um invariante estrutural verificável (um checksum do dinheiro) — sem ele, reconciliação em escala depende 100% de disciplina de código de aplicação, e é exatamente isso que quebra silenciosamente conforme o volume cresce.

## 2. Stripe — ledger como state machine imutável, em escala real

O Ledger interno da Stripe modela dinheiro como água em canos (processos) terminando em reservatórios (`Accounts`). `Events` movem dinheiro entre contas, com IDs que persistem mesmo fora de ordem (sistemas distribuídos assíncronos). Mesma regra de imutabilidade — correções via entradas reversas, com ferramenta própria de "correção em escala" protegida por análise de impacto.

Escala real: **5 bilhões de eventos/dia**, 99,99% do volume em dólares verificado em até 4 dias, 99,9999% de explicabilidade do movimento de dinheiro mantida mesmo com 10x de crescimento. A plataforma de qualidade de dados deles (Clearing/Timeliness/Completeness) só é possível **porque** o modelo é uniforme (double-entry) — dá pra aplicar o mesmo framework a fontes heterogêneas sem conhecimento especializado de cada uma.

## 3. Quando partida dobrada compensa (e quando é exagero)

Compensa quando dinheiro passa por múltiplas contas/partes como parte do modelo de negócio — marketplace, split de pagamento, produto que precisa provar "de onde veio, pra onde foi" o dinheiro. É exagero para ferramentas de controle pessoal/freelancer simples (ex. QuickBooks Simple Start).

**Onde o Conta Azul se encaixa**: não é "single-entry" pejorativo — tem rateio, parcelas e baixas, com bastante rastreabilidade de fluxo de caixa/competência. Mas **não garante estruturalmente** que todo evento tenha contrapartida obrigatória em outra conta (não impõe débito=crédito como invariante de banco de dados). É um "livro de eventos categorizados", bom pra controle de caixa e DRE simplificado — mas não pra balanço patrimonial rigoroso, nem pra produto que movimenta dinheiro entre contas de terceiros.

## 4. Multi-entity (NetSuite/Sage Intacct) vs. multi-tenant — a distinção que importa pro nosso caso de contador/BPO

Essa é uma distinção tecnicamente real, com nomes próprios na indústria:

- **NetSuite OneWorld**: até 250 subsidiárias dentro de **uma única instância compartilhada**, cada uma com plano de contas/moeda/registro fiscal próprios, em hierarquia (holding → filhas). Transações intercompany e eliminação de consolidação no fechamento são automatizadas.
- **Sage Intacct**: mesmo padrão — centenas de entidades legais num ambiente compartilhado, com plano de contas e dimensões comuns; lançamentos due-to/due-from automáticos quando uma entidade paga por outra.

**Por que isso importa**: se o público inclui contadores/BPO gerindo múltiplas empresas-cliente, existem dois modelos que não podem ser confundidos:
- **Multi-tenant puro**: tenants isolados, sem visão cruzada — cada empresa-cliente é uma ilha.
- **Multi-entity/multi-book**: um usuário-contador precisa enxergar e alternar entre várias empresas-cliente (cada uma com seu próprio livro), com controle de acesso por entidade e possivelmente consolidação.

Um sistema só multi-tenant simples (isolamento total) não atende bem um contador com 30 empresas-cliente — ele precisa de um "workspace" que federa múltiplos tenants sob a mesma identidade de usuário, com troca de contexto rápida. **Isso é decisão de modelagem organizacional, não só de isolamento de dado** — precisa entrar no desenho desde o schema de autenticação/autorização.

## 5. Row-Level Security do Postgres em produção — riscos reais documentados

RLS reescreve a query **antes do planejamento**, então uma política `tenant_id = current_setting(...)` bem escrita usa índice normalmente — o mito de "RLS é lento" não se sustenta quando bem configurado. Mas há armadilhas documentadas repetidamente por quem já rodou isso em produção:

1. **Bypass pelo dono da tabela** — a armadilha mais comum. Se a aplicação conecta com a role dona da tabela, RLS habilitado mas não *forçado* é **silenciosamente ignorado**. Precisa de `FORCE ROW LEVEL SECURITY` + role de runtime separada da role de migração.
2. **Vazamento de tenant via connection pooling** — sem `SET LOCAL` (escopado à transação), variáveis de sessão persistem entre requisições em conexões reaproveitadas do pool. Descrito como "a forma mais comum de quebrar isolamento de tenant sem querer".
3. **Políticas múltiplas combinam com OR, não AND** — atenção ao empilhar políticas.
4. **`tenant_id` deve ser a primeira coluna de todo índice composto**, senão cai pra sequential scan.
5. **Funções `SECURITY DEFINER`** rodam com as políticas do dono — outra forma comum de vazar acesso cross-tenant sem intenção.
6. **Backup**: `pg_dump` com RLS mal configurado pode exportar zero linhas silenciosamente — testar o pipeline de backup contra RLS antes de produção.

**Contraponto de escala**: análise da PlanetScale conclui que shared-schema com `tenant_id` (RLS ou filtro aplicativo) é a única abordagem que de fato escala pra milhares de tenants. Schema-per-tenant não passa de "algumas centenas" (com 10 mil clientes × 50 tabelas = 500 mil arquivos no diretório do banco, catálogo do sistema inchando, vacuum e planejamento de query degradando, migração precisando rodar em cada schema). Database-per-tenant esbarra em limite de conexão (pooler) muito antes de escalar.

**Filtragem manual sem RLS** (só `WHERE tenant_id = ?` em toda query, na mão) é chamada de "bomba-relógio" — depende 100% de disciplina do time; mais cedo ou mais tarde alguém esquece o filtro num hotfix e vaza dado entre tenants. RLS dá isolamento reforçado pelo banco, funcionando mesmo com bug na aplicação — **mas só se configurado com os cuidados acima**, como camada de defesa em profundidade, não como substituto único do filtro na aplicação.

## 6. Automação de fechamento contábil (BlackLine/FloQast) — fora de escopo agora, mas justifica a escolha de núcleo

BlackLine (US$ 50k–250k+/ano, claramente enterprise) e FloQast (mais amigável, "tie-outs" automatizados comparando razão geral com documentação) resolvem o "month-end close" — reconciliar contas, revisar lançamentos, travar o período antes de gerar demonstrações. **Isso só faz sentido como funcionalidade se o núcleo for de fato um livro contábil com contas que precisam bater** (ativo = passivo + PL) — é consequência natural de ter partida dobrada, não algo aplicável a um modelo evento→parcela→baixa simples.

Não é prioridade agora, mas é um argumento indireto a favor de já nascer com núcleo de partida dobrada: se a visão de médio prazo inclui atender contadores/BPO com rigor de fechamento, o núcleo certo já deixa essa porta aberta sem reescrita.

---

## Recomendações diretas

### (a) Partida dobrada real desde o núcleo — não o modelo "evento→parcela→baixa" puro do Conta Azul

Justificativa: débito=crédito é um invariante estrutural que o banco de dados pode reforçar (constraint/trigger) — funciona como checksum de integridade que o modelo do Conta Azul não tem. Migrar de "evento simples" para partida dobrada depois é reescrita de núcleo cara (é literalmente o problema que fez a Modern Treasury existir como produto). O inverso é trivial: **modelar Evento Financeiro/Parcela/Baixa como camada de domínio/UX por cima de um motor de partida dobrada** — usuário final vê a mesma experiência familiar do Conta Azul (criar despesa, dar baixa, parcelar), mas por baixo cada ação gera lançamentos de débito/crédito corretos automaticamente. Rateio vira múltiplas entradas de débito dividindo entre categorias/centros de custo, sempre batendo com o crédito total.

Custo real desse caminho: mais complexidade conceitual na modelagem inicial (plano de contas, normal balance, moeda por lançamento) e mais disciplina de engenharia (imutabilidade, entrada reversa em vez de UPDATE/DELETE). Proporcional ao domínio, dado que a ambição é competir com um ERP financeiro maduro.

### (b) RLS por tenant_id — mantém a recomendação da Approach A, com checklist obrigatório

Ainda é a escolha certa (mais escalável, gerenciada, sem overhead operacional de schema/database-per-tenant), mas só é segura com: roles separadas (migração vs. runtime), `FORCE ROW LEVEL SECURITY` em toda tabela multi-tenant, `SET LOCAL app.tenant_id` por transação (nunca `SET` de sessão em conexão pooled), `tenant_id` como primeira coluna de índice composto, teste automatizado que tenta ler dado de outro tenant e espera falhar, teste de backup contra RLS forçado.

Para o caso de contador/BPO com múltiplas empresas-cliente, RLS por igualdade direta de `tenant_id` não basta — precisa de um modelo de vínculo `usuario_tenant` (N:N) com política de RLS que verifica pertencimento, não igualdade — desenhado desde o schema de autenticação, não como adendo depois.
