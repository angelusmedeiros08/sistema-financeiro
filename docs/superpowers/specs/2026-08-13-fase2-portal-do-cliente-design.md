# Design — Fase 2: convite de usuários + portal do cliente

## 1. Contexto

Com o ciclo financeiro completo (Fase 1), o próximo passo já estava registrado no spec original como "Fase 2 (portal do cliente)". Pesquisa fresca confirma que vale a pena: a atualização de 2026 do Conta Azul não trata portal do cliente como pilar — é um perfil ("Cliente CA+") travado atrás de plano pago, sem tela de customização de permissão, incompleto (`mapeamento-conta-azul-produto-ui.md`, seção 6). É a lacuna mais clara do concorrente principal.

**Achado ao investigar esta fase**: o schema já reserva o enum `papel_usuario` com 5 valores (`admin`, `financeiro_senior`, `financeiro_junior`, `contador`, `cliente_portal`) e a função `private.usuario_tem_papel()` já existe — mas **nenhuma policy de RLS a usa hoje**. Toda policy de INSERT/UPDATE/SELECT do domínio financeiro só checa posse de tenant (`tenant_id in tenants_do_usuario_atual()`), não papel. Ou seja, se um `cliente_portal` fosse convidado hoje, ele teria os mesmos poderes de um `admin` — pode criar despesa, dar baixa, tudo. Isso é uma lacuna de segurança latente, não só de produto.

**Segundo achado**: não existe *nenhum* mecanismo de convite. `cadastrar()` só sabe criar um tenant com exatamente 1 usuário (o admin fundador). Portal do cliente não faz sentido sem primeiro resolver "como um segundo usuário entra num tenant que já existe" — então esta fase cobre as duas coisas juntas, não só a tela do portal.

## 2. Escopo desta fase

**Dentro do escopo:**
- Convite de usuário por e-mail, com papel escolhido no convite (`admin` só pode convidar; os 5 papéis do enum ficam disponíveis, incluindo `cliente_portal`).
- RLS reescrita para diferenciar por papel nas operações de escrita do domínio financeiro — hoje é tudo-ou-nada por tenant, precisa virar "todos os papéis internos podem escrever, `cliente_portal` só lê".
- Portal do cliente: shell de app separado (mais simples) para quem loga com papel `cliente_portal` — painel + histórico de lançamentos, sem formulário de criação, sem ação de baixa, sem sidebar cheia.
- Tela de "Equipe" (lista de usuários do tenant + convidar + revogar acesso) — mínima, dentro de Configurações.

**Fora do escopo** (fica para fases próprias):
- Customização granular de permissão por funcionalidade dentro de um papel (o que o Conta Azul faz para o perfil Administrador) — os 5 papéis do enum são fixos nesta fase, sem tela de "escolher exatamente o que cada um vê".
- "Meus parceiros" (contador acessando múltiplos tenants de clientes diferentes sem virar usuário formal de cada um) — já é suportado estruturalmente pelo `usuario_tenant` N:N (um usuário contador pode já pertencer a vários tenants), mas o seletor de "qual empresa estou vendo agora" na UI ainda não existe; fica para quando houver um usuário real testando esse caso.
- Portal do cliente com ação (aprovar/contestar um lançamento, upload de documento) — v1 é leitura, ação fica para quando houver sinal real de necessidade.
- Notificação por e-mail/WhatsApp de novidades no portal — fora de escopo, mesma fase que cobrança/dunning.

## 3. Modelo de dados e RLS

Nenhuma tabela nova. O trabalho é todo em RLS:

### 3.1 Policies de escrita passam a checar papel

Toda policy de INSERT/UPDATE hoje parecida com:
```sql
with check (tenant_id in (select private.tenants_do_usuario_atual()))
```
em `eventos_financeiros`, `rateio_categoria`, `rateio_centro_custo`, `parcelas`, `baixas`, `lancamentos`, `partidas`, `pessoas`, `categorias_financeiras`, `centros_custo`, `contas_financeiras` passa a exigir também:
```sql
and private.usuario_tem_papel(tenant_id, array['admin','financeiro_senior','financeiro_junior','contador']::papel_usuario[])
```
`cliente_portal` mantém SELECT em tudo (é o próprio dinheiro da empresa dele — não faz sentido esconder despesa/receita própria), só perde a capacidade de escrever.

### 3.2 `usuario_tenant` — quem pode convidar/gerenciar

- SELECT: qualquer papel vê a lista de colegas do próprio tenant (necessário pra tela de Equipe funcionar mesmo pra quem só lê).
- INSERT/UPDATE (ativar/desativar vínculo): só `admin`.

## 4. Fluxo de convite

Reaproveita a API administrativa do Supabase Auth (`admin.inviteUserByEmail`, já temos `createAdminClient()` em `src/utils/supabase/admin.ts` com a `service_role`) — mesma infraestrutura usada em `cadastrar()`, não é integração nova.

1. Admin preenche e-mail + papel em `/configuracoes/equipe` (nova tela).
2. Server action (privilegiada, via admin client) chama `admin.inviteUserByEmail(email)` — Supabase envia o e-mail com link de convite.
3. Cria a linha em `usuario_tenant` (`tenant_id`, `usuario_id` do convidado — resolvido depois que o convite for aceito, ou via `inviteUserByEmail`'s retorno de `user.id` já disponível na hora do convite) com o `papel` escolhido, `ativo = true`.
4. Convidado clica no link, define senha (fluxo padrão do Supabase Auth, tela nova `/convite` equivalente ao `/cadastro` mas sem criar tenant novo).
5. Login normal daí em diante — `obterUsuarioETenantAtual()` já funciona sem mudança (só passa a poder retornar qualquer um dos 5 papéis, não só `admin`).

**Revogar acesso**: `admin` desativa (`ativo = false`) em vez de deletar — mesma filosofia de não apagar dado financeiro por padrão já em vigor no resto do schema; histórico de quem fez o quê continua rastreável.

## 5. Portal do cliente — UI

Novo grupo de rotas `(portal)`, layout próprio (não reaproveita `(app)/layout.tsx` — sidebar cheia com Despesas/Receitas/Contas a pagar não faz sentido pra quem não pode criar nada):

- `/portal` — versão somente-leitura do painel (mesmos cards, mesmo gráfico — os componentes de `/painel` já são puramente apresentacionais, dá pra reaproveisar `StatCard`/`FluxoChart` direto).
- `/portal/lancamentos` — histórico combinado de receitas e despesas (reaproveita `TabelaEventos`), sem o formulário de criação acima.

Redirecionamento por papel: `obterUsuarioETenantAtual()` já devolve `papel` — o layout raiz (`src/app/(app)/layout.tsx` e um novo guard) redireciona `cliente_portal` pra `/portal` e bloqueia acesso às rotas internas mesmo que digite a URL direto (dupla proteção: RLS impede escrita no banco de qualquer forma, o redirect é só UX pra não mostrar uma tela cheia de botões que vão falhar).

## 6. Segurança

- **RLS continua sendo a garantia real**, não o redirect de UI — mesmo que alguém contorne a tela e poste direto num form action, a policy de INSERT rejeita.
- `admin.inviteUserByEmail` roda exclusivamente no admin client, server-side, nunca exposto ao bundle client — mesmo padrão já usado em `cadastrar()`.
- Convite não pode escolher papel `admin` implicitamente por engano: o formulário de convite lista os 5 papéis explicitamente, sem default perigoso.

## 7. Testes

- Teste de RLS: usuário com papel `cliente_portal` tenta INSERT em `eventos_financeiros` — RLS rejeita (teste de integração esperando falha, mesmo padrão já usado nas outras tabelas sensíveis).
- Teste de convite ponta a ponta: admin convida e-mail novo com papel `financeiro_junior` → usuário aceita → loga → consegue criar despesa (papel correto tem permissão) mas não consegue acessar tela de Equipe (só admin gerencia).
- Teste de revogação: `ativo = false` em `usuario_tenant` derruba acesso imediatamente na próxima requisição (RLS reavalia a cada query, não há cache de sessão a invalidar).

## 8. Riscos e decisões em aberto

- **E-mail transacional do Supabase (free tier)** tem limite de envio baixo — convite em volume real pode precisar de um provedor de e-mail próprio (Resend, Postmark) antes do produto ter tração; não é bloqueador agora, mas vale registrar.
- **Um usuário só pode ter 1 papel por tenant** (coluna `papel` single-value em `usuario_tenant`, não array) — suficiente pra esta fase; se aparecer necessidade real de "financeiro E contador ao mesmo tempo", isso vira uma migration própria depois.

## 9. Fora de escopo desta fase, explicitamente

Permissão granular por funcionalidade, seletor de múltiplas empresas na UI (embora já suportado no banco), portal com ação (aprovar/contestar/upload), notificação de convite além do e-mail padrão do Supabase Auth, BI avançado, módulos comerciais.
