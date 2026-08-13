# Design — Módulo de Clientes/Fornecedores (Pessoas) e portal filtrado

## 1. Contexto

Hoje `pessoas` é um cadastro mínimo (nome, documento, natureza, perfis) criado quase sempre "na hora" pelo combobox do formulário de despesa/receita — nunca teve tela própria, nunca foi pensado como módulo central. Ao mesmo tempo, o mapeamento do Conta Azul (`docs/mapeamento-conta-azul-produto-ui.md` §8) já apontava o portal do cliente como "a lacuna mais clara do concorrente principal — oportunidade real de diferenciação".

**Achado ao explorar esta fase**: os dois problemas são o mesmo problema. O portal do cliente (Fase 2) autentica um `cliente_portal` mas não o vincula a nenhum cadastro de pessoa — hoje ele vê o painel financeiro *inteiro* da empresa, não os próprios lançamentos. Um módulo de Pessoas de verdade, com vínculo ao login do portal, é o que fecha essa lacuna e torna o portal um pilar real do produto, não um extra incompleto como no Conta Azul.

## 2. Escopo desta fase

**Dentro do escopo:**
- Cadastro completo de pessoa: dados fiscais, múltiplos endereços e contatos com histórico (nunca editados em lugar, sempre versionados), campos personalizados definidos por tenant.
- Duas telas de primeiro nível na sidebar, `/clientes` e `/fornecedores` (mesmo padrão do Conta Azul) — a mesma tabela `pessoas` por baixo, só o filtro de perfil muda; Transportadora vive como aba dentro de Fornecedores.
- Vínculo `usuario_tenant.pessoa_id`: o convite de um `cliente_portal` passa a exigir escolher/criar a pessoa correspondente.
- Portal (Fase 2) passa a filtrar painel e histórico pelo `pessoa_id` vinculado, quando existir.
- Tela de gestão de campos personalizados em Configurações.

**Fora do escopo:**
- Reversão/edição do vínculo `usuario_tenant.pessoa_id` depois de definido no convite (se precisar trocar, revoga o acesso e convida de novo — mesma filosofia de "nunca editar em lugar" já aplicada a acesso na Fase 2).
- Histórico/versionamento de campos personalizados (só endereço e contato têm essa exigência explícita nesta fase).
- Importação em massa de cadastros (CSV/planilha) — mencionado como padrão do Conta Azul na pesquisa, mas sem pedido explícito aqui; fica pra quando houver volume real de dado legado.
- Qualquer coisa de Vendas/Orçamentos/Notas Fiscais que também referenciaria `pessoas` no futuro — esta fase só entrega o cadastro central, os módulos que vão consumi-lo vêm depois.

## 3. Modelo de dados

### 3.1 `pessoas` — extensão

Colunas novas: `email`, `telefone` (contato principal, direto na pessoa — não é a mesma coisa que os contatos adicionais de 3.2), `campos_personalizados jsonb not null default '{}'`. Todas opcionais — o fluxo de criação rápida do combobox (`resolverPessoaId`, já existente) continua criando com só `nome`, sem quebrar.

### 3.2 `pessoa_enderecos` e `pessoa_contatos` — histórico real, nunca `UPDATE`

```sql
create type tipo_endereco as enum ('COMERCIAL', 'COBRANCA', 'ENTREGA', 'OUTRO');

create table pessoa_enderecos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  tipo tipo_endereco not null default 'COMERCIAL',
  cep text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  substituido_em timestamptz -- null = ativo
);

create table pessoa_contatos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  nome text not null, cargo text, email text, telefone text,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  substituido_em timestamptz
);
```

"Editar" um endereço/contato nunca é um `UPDATE` — a aplicação insere uma linha nova e marca a anterior com `substituido_em = now()`, mesmo padrão já usado em `baixas.estornado_em` e `renegociacoes`. O estado atual é sempre `where substituido_em is null`; o histórico completo (o que mudou, quando) fica consultável sem nenhuma tabela de auditoria extra. `principal` é redefinido junto na mesma operação (nunca mais de um `principal = true` ativo por pessoa — checado na aplicação, não em constraint, pelo mesmo motivo de `renegociacoes` não ter trigger: é uma regra de fluxo, não um invariante contábil).

### 3.3 Campos personalizados

```sql
create type tipo_campo_personalizado as enum ('TEXTO', 'NUMERO', 'DATA', 'BOOLEANO');
create type escopo_campo_personalizado as enum ('CLIENTE', 'FORNECEDOR', 'AMBOS');

create table campos_personalizados_definicao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  rotulo text not null,
  tipo tipo_campo_personalizado not null,
  aplica_a escopo_campo_personalizado not null default 'AMBOS',
  criado_em timestamptz not null default now()
);
```

Os valores em si vivem em `pessoas.campos_personalizados` (jsonb, chave = `campos_personalizados_definicao.id`). Escolha de jsonb em vez de uma tabela EAV: o acesso é sempre "todos os campos de uma pessoa de uma vez" (renderizar o formulário, mostrar o cadastro), nunca "toda pessoa que tem X no campo Y" — uma coluna resolve sem o custo de mais uma tabela relacionada por valor, mesmo raciocínio já usado em `regras_recorrencia.categorias_json`.

### 3.4 `usuario_tenant.pessoa_id`

```sql
alter table usuario_tenant add column pessoa_id uuid references pessoas(id);
```

Nullable, só preenchido quando `papel = 'cliente_portal'`. É o vínculo que a Seção 6.3 usa pra filtrar o portal.

## 4. RLS

`pessoas`, `pessoa_enderecos`, `pessoa_contatos`, `campos_personalizados_definicao` seguem exatamente o padrão já em vigor no resto do domínio desde a Fase 2: INSERT/UPDATE exigem `private.usuario_tem_papel(tenant_id, array['admin','financeiro_senior','financeiro_junior','contador'])`; SELECT aberto pra qualquer papel do tenant (`cliente_portal` incluso — precisa enxergar pelo menos o próprio cadastro, e potencialmente o de quem ele negocia com o escritório).

**Checar explicitamente na migration** (lição da Fase 1/017, repetida aqui de propósito): cada uma dessas 4 tabelas novas precisa de policy de UPDATE se algum fluxo for editar em lugar — `pessoas` sim (dados cadastrais mudam), `pessoa_enderecos`/`pessoa_contatos` não (são só INSERT, nunca UPDATE, por design — o "editar" é sempre um INSERT novo).

## 5. Fluxos de aplicação

Novo módulo `src/lib/pessoas/`:

- **`atualizarPessoa(supabase, { pessoa_id, tenant_id, ...campos })`** — `UPDATE` direto nos dados cadastrais simples (nome, documento, email, telefone, perfis, campos_personalizados). Reaproveita a mesma validação de "não confiar no que vem do cliente sem revalidar tenant" de sempre.
- **`adicionarEndereco` / `substituirEndereco`** e **`adicionarContato` / `substituirContato`** — o "substituir" é sempre as duas operações juntas (marca `substituido_em` no antigo + insere o novo), nunca exposto como um `UPDATE` separado pro chamador poder errar a ordem.
- **`listarHistoricoEnderecos` / `listarHistoricoContatos`** — todas as linhas (ativas e substituídas) de uma pessoa, ordenadas por `criado_em`.
- **`criarCampoPersonalizado` / `removerCampoPersonalizado`** (remoção só marca indisponível pra novo uso — não apaga definição de campo que pessoas já preencheram, senão o valor salvo em `pessoas.campos_personalizados` fica órfão sem rótulo pra exibir).
- **`obterDadosPainel`** (já existente, Fase 2) ganha um parâmetro opcional `pessoaId` — quando presente, cada sub-query interna acrescenta `.eq("pessoa_id", pessoaId)` na cadeia de `eventos_financeiros`/`parcelas`. `/portal/page.tsx` e `/portal/lancamentos/page.tsx` passam a resolver `usuario_tenant.pessoa_id` do usuário logado e repassar.
- **`convidarUsuario`** (Fase 2, `src/lib/tenant/equipe.ts`) ganha `pessoa_id?: string` no parâmetro — obrigatório quando `papel === 'cliente_portal'` (validado na action antes de sequer chamar `inviteUserByEmail`, pra não gastar um convite de verdade numa submissão incompleta).

## 6. UI

### 6.1 Sidebar

Dois itens novos, mesmo nível de Receitas/Despesas: **Clientes** (`/clientes`) e **Fornecedores** (`/fornecedores`).

### 6.2 Listagem

Tabela (nome, documento, e-mail, telefone, cidade/UF) com busca por nome, cada linha é um link pra `/clientes/[pessoaId]` (ou `/fornecedores/[pessoaId]`) — mesmo padrão de navegação já usado em `/contas-a-pagar/[parcelaId]`. Botão "Novo cliente"/"Novo fornecedor" leva a `/clientes/novo`, mesma página de detalhe em modo criação. Fornecedores ganha uma aba "Transportadoras" (filtro `perfis @> ['TRANSPORTADORA']`) no topo da listagem, mesmo componente de tabela.

### 6.3 Página de detalhe (`/clientes/[pessoaId]`)

Página cheia, seções:

1. **Dados cadastrais**: nome/razão social, tipo pessoa (física/jurídica), CPF/CNPJ, e-mail e telefone principal, perfis (checkboxes — uma pessoa pode ser cliente e fornecedor ao mesmo tempo).
2. **Endereços**: lista dos ativos (`substituido_em is null`), badge "Principal" no marcado; "Adicionar endereço" revela o formulário inline (mesmo padrão de progressive disclosure de `AnexoCampos`/`RateioCategorias` — nunca modal pra isso); editar um existente pré-preenche o mesmo formulário e "Salvar" dispara `substituirEndereco`. Link "Ver histórico" expande os substituídos com a data da troca.
3. **Contatos**: idêntico ao de endereços.
4. **Campos personalizados**: renderizados a partir de `campos_personalizados_definicao` filtrado por `aplica_a` conforme os perfis marcados na pessoa; a seção inteira some se o tenant não tiver nenhum campo cadastrado.
5. **Histórico de lançamentos**: `TabelaEventos` filtrada por `pessoa_id` — reaproveita o componente já usado em Despesas/Receitas/Portal.

### 6.4 Configurações → Campos personalizados

Nova sub-página, mesmo padrão de listagem+formulário de Centros de Custo/Recorrências/Equipe: tabela dos campos definidos (rótulo, tipo, aplica a) + formulário de criação.

### 6.5 Convite vinculado (ajuste na Fase 2)

`ConvidarForm` (`/configuracoes/equipe`) ganha um campo condicional: ao escolher papel "Cliente (portal)", aparece o `PessoaCombobox` (mesmo componente já usado nos lançamentos), obrigatório — escolhe uma pessoa existente ou cria uma nova ali mesmo.

### 6.6 Portal filtrado (ajuste na Fase 2)

Sem mudança visível de UI — `/portal` e `/portal/lancamentos` continuam exatamente iguais, só a query por trás passa a filtrar por `pessoa_id` quando o vínculo existir. Contas de `cliente_portal` criadas antes deste módulo (sem vínculo) continuam vendo o tenant inteiro até alguém preencher — comportamento atual preservado, não regride.

## 7. Segurança

- Mesmo padrão de sempre: RLS por papel é a garantia real, revalidação de tenant em toda função de servidor.
- Vínculo `usuario_tenant.pessoa_id` só é gravável por `admin` (mesma policy de UPDATE em `usuario_tenant` já existente da Fase 2 — nenhuma policy nova necessária aqui).
- Filtro por `pessoa_id` no portal é aplicado nas queries do servidor (nunca confia em nenhum valor vindo do cliente) — o `pessoa_id` usado é sempre o lido de `usuario_tenant` no servidor, nunca um parâmetro de URL/formulário.

## 8. Testes

- Migration: `CHECK`/comportamento de "nunca mais de um endereço/contato principal ativo" via teste de aplicação (não é invariante de banco).
- Histórico: criar endereço → substituir → confere que o antigo tem `substituido_em` preenchido e o novo é o único `where substituido_em is null`; `listarHistoricoEnderecos` retorna os dois em ordem.
- Campos personalizados: criar definição `aplica_a = 'CLIENTE'` → não aparece no formulário de um fornecedor puro; preencher valor → persiste em `pessoas.campos_personalizados`; remover definição → pessoa que já tinha valor preenchido não quebra a tela (campo órfão simplesmente não é exibido).
- Portal: `cliente_portal` sem `pessoa_id` vinculado continua vendo o tenant inteiro (regressão da Fase 2); com vínculo, painel e lançamentos batem exatamente com os eventos daquela pessoa, nunca de outra.
- Convite: tentar convidar `cliente_portal` sem escolher pessoa é rejeitado antes de chamar `inviteUserByEmail` (não gasta convite de verdade).
- Regressão: criação rápida de pessoa via combobox (nome só) continua funcionando idêntica; pessoa criada assim aparece na listagem de Clientes/Fornecedores pronta pra enriquecer.

## 9. Riscos e decisões em aberto

- **`campos_personalizados` em jsonb sem tipagem forte no banco** — validação de tipo (ex.: campo `NUMERO` recebendo texto) é responsabilidade da aplicação, não do Postgres. Aceitável nesta fase; se aparecer necessidade de relatório/filtro por campo personalizado no futuro, pode justificar promover pra colunas geradas (`jsonb ->> 'x'` indexado) sem migrar o modelo inteiro.
- **Um único `pessoa_id` por `usuario_tenant`** — um usuário de portal não pode representar duas pessoas jurídicas diferentes ao mesmo tempo (ex.: contador de dois clientes do escritório logando com a mesma conta). Se aparecer esse caso real, é convite separado por pessoa, mesma conta de e-mail pode ter múltiplos vínculos em tenants diferentes (já suportado), mas não múltiplas pessoas no mesmo tenant.

## 10. Fora de escopo desta fase, explicitamente

Edição do vínculo `pessoa_id` pós-convite, histórico/versionamento de campos personalizados, importação em massa de cadastros, qualquer integração com módulos futuros de Vendas/Orçamentos/Notas Fiscais (este módulo só entrega o cadastro central que eles vão consumir depois).
