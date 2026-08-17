# Deploy de demonstração (Vercel + Supabase existente)

## Contexto

O usuário quer que os sócios acessem o sistema pra dar sugestões e opinar sobre os módulos ainda simples, antes de decidir prioridade de evolução. Isso é uma decisão de infraestrutura temporária, não uma feature de produto: o objetivo é o link mais barato e rápido possível de colocar no ar, sabendo que será substituído por um servidor de produção real — dimensionado, com testes de segurança pesados — antes de qualquer lançamento comercial.

O repositório hoje é só local (sem remoto), e não existe nenhuma config de deploy (`vercel.json`, `Dockerfile`) no projeto. O banco (Supabase, projeto `oeixjnyvfxifyxunzlre`) já está hospedado e não muda — só o Next.js passa a rodar em produção em vez de `localhost`.

**Achado durante a exploração técnica**: o job de recorrência diária (`gerar-recorrencias-diario`, pg_cron) está configurado no Vault do Supabase com `cron_target_url = http://localhost:3000/api/cron/gerar-recorrencias` — ou seja, nunca disparou de fato fora do ambiente de dev. Publicar o app é a primeira vez que esse job pode funcionar de verdade.

## Escopo

**Dentro:**
- Deploy no Vercel (plano Hobby/gratuito), repositório GitHub privado (`https://github.com/angelusmedeiros08/sistema-financeiro`) conectado pra deploy automático a cada commit.
- Reaproveitar o projeto Supabase existente sem nenhuma mudança de schema.
- Desativar o cadastro público (`/cadastro`) enquanto a demo estiver no ar — só quem for convidado entra. Reversível com uma linha quando fizer sentido reabrir.
- Atualizar `NEXT_PUBLIC_SITE_URL`, a config de Site URL/Redirect URLs do Supabase Auth, e o `cron_target_url` no Vault pra apontarem pra URL real do Vercel.
- Limpar dados de teste (pessoas/lançamentos/categorias com nome óbvio de teste) do tenant principal antes de convidar os sócios.
- Convidar cada sócio como `admin` via Configurações → Equipe (fluxo já existente).

**Fora:**
- Domínio próprio — usa a URL padrão do Vercel (`*.vercel.app`).
- Qualquer item de `docs/seguranca-e-escalabilidade.md` (headers de segurança, rate limiting, MFA, CI de RLS) — documento já existente, fica como checklist pro servidor de produção real, não faz parte deste ciclo.
- Qualquer feature de produto nova ou papel de usuário "somente leitura".
- Mudança de schema/migration no Supabase.

## Divisão de responsabilidade (quem faz o quê)

Isso não é um plano de código — é uma checklist de deploy, e parte dela envolve contas (GitHub, Vercel) e segredos que não devem passar pelas minhas mãos:

**Eu faço:**
1. Desativo `/cadastro` (código, commit).
2. Limpo os dados de teste do tenant principal (SQL direto no Supabase).
3. Configuro o remote git e faço push pro repositório que você criou.
4. Depois que o deploy estiver no ar com uma URL: atualizo o Site URL/Redirect URLs no Supabase Auth (se der pra fazer via API/MCP; senão te aviso o valor exato pra colar no painel) e o `cron_target_url` no Vault (isso eu faço direto, é config do meu lado, não segredo de terceiro).

**Você faz** (ações com conta/credencial, que eu não devo tocar):
1. Criar o projeto no Vercel importando o repositório GitHub (login com sua conta GitHub, alguns cliques).
2. Colar as 5 variáveis de ambiente no painel do Vercel — os nomes e onde encontrar cada valor (seu `.env.local` atual) eu te passo exatos, mas colar o valor é você.
3. Depois do primeiro deploy, me passar a URL gerada (tipo `sistema-financeiro.vercel.app`) pra eu terminar os ajustes que dependem dela.
4. Convidar os sócios pelo próprio Configurações → Equipe, já no ambiente publicado (envio de e-mail de convite é uma ação que só você autoriza, um por um).

## Variáveis de ambiente

As mesmas 5 já usadas em dev, sem nenhuma nova: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (valores idênticos ao `.env.local` atual) e `NEXT_PUBLIC_SITE_URL` (novo valor — a URL do Vercel, não mais `localhost:3000`).

## Testes

- `pnpm build` local sem erro antes do push (garante que o Vercel não vai falhar o build por algo que passa despercebido em `pnpm dev`).
- `/cadastro` retorna indisponível/redireciona depois de desativado — confirmar que não dá pra criar tenant novo por essa rota.
- Fluxo de convite ponta a ponta no ambiente publicado: e-mail chega, link de confirmação aponta pro domínio certo (não `localhost`), sócio consegue definir senha e entrar.
- Uma ação que grava dado (criar uma despesa, por exemplo) funciona ponta a ponta no ambiente publicado.
- Cron job dispara — testar chamando a rota manualmente com o header `x-cron-secret` correto, sem esperar o horário agendado.

## Depois desta demo

Quando for a hora do servidor de produção real: revisitar `docs/seguranca-e-escalabilidade.md` como checklist, reabrir cadastro público se fizer sentido pro modelo comercial, e decidir domínio próprio + provedor com garantia de SLA (Vercel Hobby não tem).
