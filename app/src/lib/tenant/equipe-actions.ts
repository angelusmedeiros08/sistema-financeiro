"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { convidarUsuario, definirAcessoUsuario } from "./equipe";
import { resolverPessoaId } from "@/lib/contabil/evento-financeiro";
import type { Database } from "@/utils/supabase/database.types";

type ResultadoAcao = { erro: string } | { sucesso: true };
type PapelUsuario = Database["public"]["Enums"]["papel_usuario"];

const PAPEIS_VALIDOS: PapelUsuario[] = ["admin", "financeiro_senior", "financeiro_junior", "contador", "cliente_portal"];

export async function convidarUsuarioAction(formData: FormData): Promise<ResultadoAcao> {
  const email = String(formData.get("email") ?? "").trim();
  const papel = String(formData.get("papel") ?? "") as PapelUsuario;

  if (!email || !PAPEIS_VALIDOS.includes(papel)) {
    return { erro: "Informe um e-mail válido e um papel." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  // resolvido ANTES de convidar — se faltar pessoa pra um convite de
  // portal, o erro sai sem gastar um convite de e-mail de verdade.
  let pessoaId: string | undefined;
  if (papel === "cliente_portal") {
    const resolvida = await resolverPessoaId(supabase, contexto.tenantId, {
      pessoaId: String(formData.get("pessoa_id") ?? "") || undefined,
      nomeNovaPessoa: String(formData.get("pessoa_nome_novo") ?? "") || undefined,
      perfil: "CLIENTE",
    });
    if (!resolvida) return { erro: "Selecione ou crie a pessoa vinculada a este acesso de portal." };
    pessoaId = resolvida;
  }

  const resultado = await convidarUsuario(supabase, {
    tenant_id: contexto.tenantId,
    email,
    papel,
    papelChamador: contexto.papel,
    pessoa_id: pessoaId,
  });

  if ("erro" in resultado) return resultado;

  revalidatePath("/configuracoes/equipe");
  return { sucesso: true };
}

export async function definirAcessoUsuarioAction(formData: FormData): Promise<ResultadoAcao> {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const ativo = formData.get("ativo") === "true";

  if (!usuarioId) return { erro: "Usuário inválido." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await definirAcessoUsuario(supabase, {
    tenant_id: contexto.tenantId,
    usuario_id: usuarioId,
    ativo,
    papelChamador: contexto.papel,
  });

  if ("erro" in resultado) return resultado;

  revalidatePath("/configuracoes/equipe");
  return { sucesso: true };
}
