"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { CONTAS_CONTABEIS_PADRAO, CODIGO_CAIXA_E_BANCOS, CODIGO_RECEITAS_GERAL, CODIGO_DESPESAS_GERAL } from "@/lib/contabil/plano-padrao";

type ResultadoAcao = { erro: string } | { sucesso: true; mensagem: string };

export async function cadastrar(formData: FormData): Promise<ResultadoAcao> {
  const nomeEmpresa = String(formData.get("nome_empresa") ?? "").trim();
  const nomeUsuario = String(formData.get("nome_usuario") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nomeEmpresa || !nomeUsuario || !email || senha.length < 8) {
    return { erro: "Preencha todos os campos — a senha precisa de pelo menos 8 caracteres." };
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

  // 3) provisiona o plano de contas mínimo do tenant novo
  const { data: contasCriadas, error: erroContas } = await admin
    .from("contas_contabeis")
    .insert(
      CONTAS_CONTABEIS_PADRAO.map((c) => ({
        tenant_id: tenant.id,
        codigo: c.codigo,
        nome: c.nome,
        tipo: c.tipo,
        natureza: c.natureza,
        sistema: true,
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

  const { error: erroCategorias } = await admin.from("categorias_financeiras").insert([
    { tenant_id: tenant.id, nome: "Receita Geral", tipo: "RECEITA", conta_contabil_id: contaReceitas },
    { tenant_id: tenant.id, nome: "Despesa Geral", tipo: "DESPESA", conta_contabil_id: contaDespesas },
  ]);

  if (erroCategorias) {
    return { erro: erroCategorias.message };
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

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
