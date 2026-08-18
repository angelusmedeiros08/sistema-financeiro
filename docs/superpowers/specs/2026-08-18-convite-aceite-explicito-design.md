# Convite com aceite explícito (sem consumo prematuro de token)

## Contexto

O link de convite atual (`admin.auth.admin.inviteUserByEmail`) aponta direto pro endpoint de verificação do Supabase (`*.supabase.co/auth/v1/verify?token=...`), que consome o token de uso único com uma simples requisição GET. Scanners de segurança de e-mail (Gmail, Outlook Safe Links, antivírus corporativo) visitam automaticamente links recebidos por e-mail pra checar se são maliciosos — isso consome o token antes da pessoa convidada clicar de verdade, e ela vê "link expirado ou já usado" no primeiro clique real dela.

Achado nos logs do Supabase: um convite (`angelusbatera@gmail.com`) nunca teve nenhuma chamada `/verify` registrada, nem sucesso nem falha — consistente com um scanner batendo no link antes do log de auth capturar, ou o link nunca tendo sido de fato clicado pela pessoa a tempo.

Esse mecanismo de convite (gerar link + mandar e-mail + página de aceite) é também a base de infraestrutura que será reaproveitada quando o sistema ganhar cadastro automático pós-pagamento — a pessoa paga, recebe um link, clica, define senha, já está dentro. Por isso o design abaixo generaliza a geração do link e o envio do e-mail para não ficarem amarrados à UI de "admin convida colega".

## Escopo

**Dentro:**
- Gerar o link de convite via `admin.auth.admin.generateLink()` em vez de `inviteUserByEmail()` — não dispara e-mail automaticamente, só retorna o token.
- Enviar o e-mail de convite pelo próprio código do app (Brevo SMTP, via `nodemailer`), com link pra uma página nossa (`/convite/aceitar`), não pro endpoint do Supabase.
- Nova página `/convite/aceitar`: mostra nome do tenant e papel, exige clique explícito num botão antes de consumir o token (`supabase.auth.verifyOtp`).
- Depois do aceite, segue pro fluxo existente (`/convite/definir-senha`) sem mudança.
- Middleware: liberar `/convite/aceitar` como rota pública (usuário ainda não tem sessão nesse ponto).

**Fora:**
- Qualquer coisa de pagamento/checkout — este spec só prepara a infraestrutura de aceite, não liga a nenhum gateway.
- Reenvio self-service pelo próprio convidado (se o link expirar de verdade) — a mensagem de erro já orienta a pedir novo convite ao admin; não vale a complexidade de um mecanismo de notificação automática pra 2-4 pessoas.
- Mudar o mecanismo de "Cancelar convite" já construído — continua funcionando igual, porque `generateLink` também cria o usuário em `auth.users` do mesmo jeito que `inviteUserByEmail`.

## Modelo técnico

**`lib/tenant/convite-email.ts`** (novo) — `enviarEmailConvite({ email, tenantNome, papel, linkAceite })`: monta um e-mail HTML simples (mesma identidade visual do resto do app) e manda via `nodemailer` usando as variáveis de ambiente `BREVO_SMTP_HOST`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASSWORD` (mesma SMTP key já ativa no Brevo, só que agora também disponível pro app, não só pro Supabase).

**`lib/tenant/equipe.ts`** — `convidarUsuario()` passa a:
1. Chamar `admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo: siteUrl + "/convite/aceitar" } })` em vez de `inviteUserByEmail`.
2. Response de `generateLink` traz `properties.hashed_token` (o token pra `verifyOtp`) — monta `linkAceite = ${siteUrl}/convite/aceitar?token=${hashed_token}&email=${email}&next=/convite/definir-senha`.
3. Chama `enviarEmailConvite()` com esse link.
4. Resto do fluxo (vínculo em `usuario_tenant`, tratamento de `email_exists`) fica igual.

**`app/(auth)/convite/aceitar/page.tsx`** (novo) — server component: lê `token`, `email`, `tenantNome` (opcional, só exibição), `papel`, `next` da URL. Renderiza texto "Você foi convidado pra {tenantNome} como {papel}" + form com botão "Aceitar convite".

**`app/(auth)/actions.ts`** — nova função `aceitarConvite(formData)`: extrai `token`/`email`/`next` de campos hidden do form, chama `supabase.auth.verifyOtp({ email, token, type: "invite" })`. Sucesso → `redirect(next)`. Falha → `redirect("/entrar?erro=link_invalido")` (reaproveita a mensagem já existente).

**`utils/supabase/middleware.ts`** — adiciona `/convite/aceitar` à lista de rotas públicas (junto de `/entrar`, `/cadastro`, `/auth`).

## Testes

- Convite novo: e-mail chega pelo Brevo com link pra `/convite/aceitar` (não mais pro domínio do Supabase).
- Página de aceite mostra tenant/papel corretos e não consome o token só por ser carregada (confirmar isso simulando um GET automatizado na página, sem clicar no botão, e checando que o token continua válido depois).
- Clique no botão consome o token e redireciona pra `/convite/definir-senha`.
- Link usado duas vezes: segunda tentativa cai em `/entrar?erro=link_invalido` com a mensagem já existente.
- Convite de e-mail já registrado continua caindo no mesmo erro de "não foi possível enviar" (comportamento herdado, sem mudança).
- "Cancelar convite" continua funcionando pra convites pendentes gerados por este novo fluxo.
