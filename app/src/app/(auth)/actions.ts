"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { provisionarTenantNovo } from "@/lib/tenant/provisionar";
import { caminhoInternoSeguro } from "@/lib/caminho-seguro";
import { registrarTentativaAuth, obterIpDaRequisicao } from "@/lib/seguranca/rate-limit-auth";
import { CADASTRO_PUBLICO_ATIVO } from "./config";

const MENSAGEM_MUITAS_TENTATIVAS = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";

type ResultadoAcao = { erro: string } | { sucesso: true; mensagem: string };

export async function cadastrar(formData: FormData): Promise<ResultadoAcao> {
  if (!CADASTRO_PUBLICO_ATIVO) {
    return { erro: "Cadastro fechado no momento — peça um convite a quem já usa o sistema." };
  }

  const nomeEmpresa = String(formData.get("nome_empresa") ?? "").trim();
  const nomeUsuario = String(formData.get("nome_usuario") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nomeEmpresa || !nomeUsuario || !email || senha.length < 8) {
    return { erro: "Preencha todos os campos: a senha precisa de pelo menos 8 caracteres." };
  }

  const ip = obterIpDaRequisicao(await headers());
  const { permitido } = await registrarTentativaAuth({ finalidade: "cadastro", email, ip });
  if (!permitido) return { erro: MENSAGEM_MUITAS_TENTATIVAS };

  // 1) cria o usuário no Supabase Auth (endpoint público, sem privilégio elevado)
  const supabase = await createClient();
  const { data: authData, error: erroAuth } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome: nomeUsuario } },
  });

  if (erroAuth) {
    return { erro: erroAuth.message };
  }
  if (!authData.user) {
    return { erro: "Não foi possível criar o usuário." };
  }

  // 2) a partir daqui é operação privilegiada: criar o tenant + seed +
  // vincular o usuário recém-criado como admin. Extraído pra
  // provisionarTenantNovo() (lib/tenant/provisionar.ts), reaproveitado
  // também pelo provisionamento disparado por pagamento confirmado.
  const resultado = await provisionarTenantNovo({ nome: nomeEmpresa, usuarioId: authData.user.id });

  if ("erro" in resultado) {
    return { erro: resultado.erro };
  }

  return {
    sucesso: true,
    mensagem: "Cadastro criado! Verifique seu e-mail para confirmar a conta e depois entre com sua senha.",
  };
}

export async function entrar(formData: FormData): Promise<ResultadoAcao | never> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  const ip = obterIpDaRequisicao(await headers());
  const { permitido } = await registrarTentativaAuth({ finalidade: "entrar", email, ip });
  if (!permitido) return { erro: MENSAGEM_MUITAS_TENTATIVAS };

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { erro: error.message };
  }

  // Só quem tem mais de 1 vínculo ativo passa pela tela de escolha — com 1
  // só (o caso comum) entra direto no painel, sem fricção extra.
  const { count } = await supabase
    .from("usuario_tenant")
    .select("tenant_id", { count: "exact", head: true })
    .eq("usuario_id", data.user.id)
    .eq("ativo", true);

  redirect((count ?? 0) > 1 ? "/escolher-empresa" : "/painel");
}

// Consome o token de convite só quando a pessoa clica de propósito no botão
// "Aceitar convite" (chamada via form POST em /convite/aceitar) — nunca no
// carregamento da página em si. Diferente do fluxo antigo (link do e-mail
// apontando direto pro /verify do Supabase, consumível com um simples GET),
// isso evita que scanners de segurança de e-mail gastem o token sozinhos
// antes do clique real.
export async function aceitarConvite(formData: FormData): Promise<never> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "/convite/definir-senha");

  if (!token || !email) {
    redirect("/entrar?erro=link_invalido");
  }

  // Achado em auditoria (31/08/2026): único dos 4 fluxos de auth sem
  // sessão que não registrava tentativa em tentativas_auth — os outros 3
  // já ganharam isso na auditoria de segurança de 30/08. Risco baixo (o
  // token é um token_hash de alta entropia, não um código curto), mas
  // fecha a inconsistência e deixa rastro de auditoria.
  const ip = obterIpDaRequisicao(await headers());
  const { permitido } = await registrarTentativaAuth({ finalidade: "convite_aceitar", email, ip });
  if (!permitido) redirect("/entrar?erro=muitas_tentativas");

  const supabase = await createClient();
  // token_hash (não "token" com email) — a variante {email, token} espera um
  // código de 6 dígitos, não o hash que geramos em generateLink(). Usar o
  // par errado falha sempre, em qualquer link, não só nos velhos.
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "invite" });

  if (error) {
    redirect("/entrar?erro=link_invalido");
  }

  redirect(caminhoInternoSeguro(next) ?? "/convite/definir-senha");
}

// Chamada pela tela que o link de convite leva depois do /auth/confirm já
// ter trocado o code por uma sessão de verdade — o usuário já está
// autenticado nesse ponto, só falta escolher a senha (equivalente ao
// cadastro() normal, mas sem criar tenant novo, porque usuario_tenant já
// foi criado quando o admin convidou).
export async function definirSenhaConvite(formData: FormData): Promise<ResultadoAcao | never> {
  const nome = String(formData.get("nome") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nome || senha.length < 8) {
    return { erro: "Informe seu nome e uma senha com pelo menos 8 caracteres." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Link de convite expirado ou inválido: peça um novo convite." };
  }

  const { error } = await supabase.auth.updateUser({ password: senha, data: { nome } });
  if (error) return { erro: error.message };

  await supabase.from("usuarios").update({ nome }).eq("id", user.id);
  // marca aqui, não em aceitarConvite() — email_confirmed_at já fica true
  // desde o clique em "Aceitar convite", antes da senha existir de fato.
  // senha_definida é o sinal certo de "consegue entrar" pra tela de Equipe.
  // Client admin (service_role) de propósito: a policy de UPDATE em
  // usuario_tenant é admin-only (não dá pra um convidado comum atualizar a
  // própria linha), e o usuário recém-convidado normalmente não é admin —
  // sem isso o UPDATE seria bloqueado em silêncio pelo RLS. Só grava
  // senha_definida, nunca papel/ativo, então não abre brecha de escalonar
  // privilégio.
  const admin = createAdminClient();
  await admin.from("usuario_tenant").update({ senha_definida: true }).eq("usuario_id", user.id);

  const { data: vinculo } = await supabase
    .from("usuario_tenant")
    .select("papel")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  redirect(vinculo?.papel === "cliente_portal" ? "/portal" : "/painel");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

// Mensagem SEMPRE genérica, independente de o e-mail existir ou não — não
// dá pra um formulário de "esqueci senha" confirmar/negar se um e-mail tem
// conta (achado clássico de enumeração de usuário). resetPasswordForEmail
// do Supabase já se comporta assim (não retorna erro pra e-mail
// inexistente), então basta não diferenciar na nossa própria mensagem.
export async function solicitarRecuperacaoSenha(
  formData: FormData,
): Promise<{ sucesso: true; mensagem: string } | { erro: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const mensagemGenerica = "Se esse e-mail tiver uma conta, enviamos um link pra redefinir a senha.";

  if (!email) return { sucesso: true, mensagem: mensagemGenerica };

  // O contador conta tentativas registradas, não contas existentes — negar
  // aqui não revela se o e-mail tem conta ou não, mesma garantia de
  // mensagemGenerica abaixo.
  const ip = obterIpDaRequisicao(await headers());
  const { permitido } = await registrarTentativaAuth({ finalidade: "recuperacao_senha", email, ip });
  if (!permitido) return { erro: MENSAGEM_MUITAS_TENTATIVAS };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent("/redefinir-senha")}`,
  });

  return { sucesso: true, mensagem: mensagemGenerica };
}

export async function redefinirSenha(formData: FormData): Promise<ResultadoAcao | never> {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Link de recuperação expirado ou inválido: peça um novo." };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: error.message };

  redirect("/entrar");
}
