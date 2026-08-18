"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { GRUPOS_CONTAS_PADRAO, CONTAS_CONTABEIS_PADRAO, CODIGO_CAIXA_E_BANCOS, CODIGO_RECEITAS_GERAL, CODIGO_DESPESAS_GERAL } from "@/lib/contabil/plano-padrao";
import { CATEGORIAS_PADRAO } from "@/lib/contabil/categorias-padrao";
import { MODELO_COMPLETO_DRE } from "@/lib/relatorios/dre";
import { CADASTRO_PUBLICO_ATIVO } from "./config";

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

  // 2) a partir daqui é operação privilegiada: criar o tenant e vincular o
  // usuário recém-criado como admin dele. RLS não permite isso para um
  // usuário comum de propósito — só o admin client (service_role) pode.
  const admin = createAdminClient();

  const { data: tenant, error: erroTenant } = await admin
    .from("tenants")
    .insert({ nome: nomeEmpresa })
    .select("id")
    .single();

  if (erroTenant || !tenant) {
    return { erro: erroTenant?.message ?? "Falha ao criar a empresa." };
  }

  const { error: erroVinculo } = await admin.from("usuario_tenant").insert({
    usuario_id: authData.user.id,
    tenant_id: tenant.id,
    papel: "admin",
  });

  if (erroVinculo) {
    return { erro: erroVinculo.message };
  }

  // 3) provisiona o plano de contas do tenant novo — grupo (nível 1,
  // totalizador) primeiro, pra depois referenciar o id gerado como
  // conta_pai_id de cada conta de nível 2.
  const { data: gruposCriados, error: erroGrupos } = await admin
    .from("contas_contabeis")
    .insert(
      GRUPOS_CONTAS_PADRAO.map((g) => ({
        tenant_id: tenant.id,
        codigo: g.codigo,
        nome: g.nome,
        tipo: g.tipo,
        natureza: g.natureza,
        sistema: false,
      })),
    )
    .select("id, codigo");

  if (erroGrupos || !gruposCriados) {
    return { erro: erroGrupos?.message ?? "Falha ao provisionar plano de contas." };
  }

  const grupoPorCodigo = new Map(gruposCriados.map((g) => [g.codigo, g.id]));

  const { data: contasCriadas, error: erroContas } = await admin
    .from("contas_contabeis")
    .insert(
      CONTAS_CONTABEIS_PADRAO.map((c) => ({
        tenant_id: tenant.id,
        codigo: c.codigo,
        nome: c.nome,
        tipo: c.tipo,
        natureza: c.natureza,
        sistema: c.sistema,
        conta_pai_id: grupoPorCodigo.get(c.grupoCodigo),
      })),
    )
    .select("id, codigo");

  if (erroContas || !contasCriadas) {
    return { erro: erroContas?.message ?? "Falha ao provisionar plano de contas." };
  }

  const contaPorCodigo = new Map(contasCriadas.map((c) => [c.codigo, c.id]));
  const contaCaixa = contaPorCodigo.get(CODIGO_CAIXA_E_BANCOS)!;
  const contaReceitas = contaPorCodigo.get(CODIGO_RECEITAS_GERAL)!;
  const contaDespesas = contaPorCodigo.get(CODIGO_DESPESAS_GERAL)!;

  // 4) provisiona as 23 linhas reais de tbTotalizadoresDRE (extraídas da
  // planilha de referência) — precisa vir antes das categorias porque o
  // seed de categoria (Seção 4 de
  // docs/superpowers/specs/2026-08-16-seed-categorias-e-bancos-design.md)
  // vincula cada categoria nova à linha de DRE certa por `ordem`.
  const { data: linhasDreCriadas, error: erroLinhasDre } = await admin
    .from("linhas_dre")
    .insert(
      MODELO_COMPLETO_DRE.map((linha) => ({
        tenant_id: tenant.id,
        ordem: linha.ordem,
        rotulo: linha.rotulo,
        tipo_calc: linha.tipoCalc,
        waterfall_papel: linha.waterfallPapel,
        id_dfc: linha.idDfc,
      })),
    )
    .select("id, ordem");

  if (erroLinhasDre || !linhasDreCriadas) {
    return { erro: erroLinhasDre?.message ?? "Falha ao provisionar estrutura de DRE." };
  }

  const linhaIdPorOrdem = new Map(linhasDreCriadas.map((l) => [l.ordem, l.id]));

  // Categoria não se auto-vincula a uma linha de DRE (isso é feito à parte,
  // via linha_dre_categorias) — sem o vínculo abaixo, toda categoria nova
  // nasceria "não classificada" na cascata. categoria_pai_id referencia o
  // id gerado nesse mesmo insert, então as categorias sem pai (inclusive as
  // que têm filhas) precisam existir antes das subcategorias.
  const categoriasSemPai = CATEGORIAS_PADRAO.filter((c) => !c.paiNome);
  const categoriasComPai = CATEGORIAS_PADRAO.filter((c) => c.paiNome);

  const { data: criadasSemPai, error: erroCategoriasSemPai } = await admin
    .from("categorias_financeiras")
    .insert(
      categoriasSemPai.map((c) => ({
        tenant_id: tenant.id,
        nome: c.nome,
        tipo: c.tipo,
        eh_custo_fixo: c.ehCustoFixo,
        conta_contabil_id: c.tipo === "RECEITA" ? contaReceitas : contaDespesas,
      })),
    )
    .select("id, nome");

  if (erroCategoriasSemPai || !criadasSemPai) {
    return { erro: erroCategoriasSemPai?.message ?? "Falha ao provisionar categorias." };
  }

  const idCategoriaPorNome = new Map(criadasSemPai.map((c) => [c.nome, c.id]));

  const { data: criadasComPai, error: erroCategoriasComPai } = await admin
    .from("categorias_financeiras")
    .insert(
      categoriasComPai.map((c) => ({
        tenant_id: tenant.id,
        nome: c.nome,
        tipo: c.tipo,
        eh_custo_fixo: c.ehCustoFixo,
        conta_contabil_id: c.tipo === "RECEITA" ? contaReceitas : contaDespesas,
        categoria_pai_id: idCategoriaPorNome.get(c.paiNome!),
      })),
    )
    .select("id, nome");

  if (erroCategoriasComPai || !criadasComPai) {
    return { erro: erroCategoriasComPai?.message ?? "Falha ao provisionar subcategorias." };
  }

  for (const [nome, id] of criadasComPai.map((c) => [c.nome, c.id] as const)) idCategoriaPorNome.set(nome, id);

  const { error: erroLinhaDreCategorias } = await admin.from("linha_dre_categorias").insert(
    CATEGORIAS_PADRAO.map((c) => ({
      linha_dre_id: linhaIdPorOrdem.get(c.ordemDre)!,
      categoria_id: idCategoriaPorNome.get(c.nome)!,
    })),
  );

  if (erroLinhaDreCategorias) {
    return { erro: erroLinhaDreCategorias.message };
  }

  const { error: erroContaFinanceira } = await admin.from("contas_financeiras").insert({
    tenant_id: tenant.id,
    nome: "Caixa",
    tipo: "CAIXA",
    conta_contabil_id: contaCaixa,
  });

  if (erroContaFinanceira) {
    return { erro: erroContaFinanceira.message };
  }

  const { error: erroFormasPagamento } = await admin.from("formas_pagamento").insert(
    ["Pix", "Boleto", "Cartão", "Dinheiro"].map((nome) => ({ tenant_id: tenant.id, nome })),
  );

  if (erroFormasPagamento) {
    return { erro: erroFormasPagamento.message };
  }

  return {
    sucesso: true,
    mensagem: "Cadastro criado! Verifique seu e-mail para confirmar a conta e depois entre com sua senha.",
  };
}

export async function entrar(formData: FormData): Promise<ResultadoAcao | never> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { erro: error.message };
  }

  redirect("/painel");
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

  const supabase = await createClient();
  // token_hash (não "token" com email) — a variante {email, token} espera um
  // código de 6 dígitos, não o hash que geramos em generateLink(). Usar o
  // par errado falha sempre, em qualquer link, não só nos velhos.
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "invite" });

  if (error) {
    redirect("/entrar?erro=link_invalido");
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/convite/definir-senha");
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
