"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import type { Database, Json } from "@/utils/supabase/database.types";
import {
  criarPessoa,
  atualizarPessoa,
  adicionarEndereco,
  substituirEndereco,
  adicionarContato,
  substituirContato,
  criarCampoPersonalizado,
  removerCampoPersonalizado,
} from "./pessoas";

type ResultadoAcao = { erro: string } | { sucesso: true };
type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];
type TipoEndereco = Database["public"]["Enums"]["tipo_endereco"];
type TipoCampoPersonalizado = Database["public"]["Enums"]["tipo_campo_personalizado"];
type EscopoCampoPersonalizado = Database["public"]["Enums"]["escopo_campo_personalizado"];

function lerPerfis(formData: FormData): PerfilPessoa[] {
  return formData.getAll("perfis") as PerfilPessoa[];
}

function revalidarPaginasPessoa(pessoaId?: string) {
  revalidatePath("/clientes");
  revalidatePath("/fornecedores");
  if (pessoaId) {
    revalidatePath(`/clientes/${pessoaId}`);
    revalidatePath(`/fornecedores/${pessoaId}`);
  }
  // Marco de "Primeiros passos" (Painel) depende de existir pessoa cadastrada
  // — sem isso, quem navega de volta pro Painel via um link já pré-carregado
  // continua vendo o passo como pendente (mesma causa do bug achado no
  // convite de equipe: cache do cliente do Next não sabe que o dado mudou
  // até alguém chamar revalidatePath).
  revalidatePath("/painel");
}

type EnderecoJson = {
  tipo: TipoEndereco;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  principal: boolean;
};

type ContatoJson = {
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  principal: boolean;
};

function lerJsonArray<T>(formData: FormData, campo: string): T[] {
  const bruto = String(formData.get(campo) ?? "");
  if (!bruto) return [];
  try {
    const parsed = JSON.parse(bruto);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Redireciona pra página de detalhe da pessoa recém-criada assim que os
// dados básicos + endereços/contatos coletados no formulário de criação
// são persistidos — endereço/contato só podem ser INSERTs de verdade
// depois que a pessoa (e o pessoa_id de FK) existe.
export async function criarPessoaAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const perfis = lerPerfis(formData);
  const supabase = await createClient();
  const resultado = await criarPessoa(supabase, {
    tenant_id: contexto.tenantId,
    nome: String(formData.get("nome") ?? ""),
    documento: String(formData.get("documento") ?? "") || null,
    natureza: (String(formData.get("natureza") ?? "") || null) as NaturezaPessoa | null,
    email: String(formData.get("email") ?? "") || null,
    telefone: String(formData.get("telefone") ?? "") || null,
    perfis,
  });

  if ("erro" in resultado) return resultado;

  const enderecos = lerJsonArray<EnderecoJson>(formData, "enderecos_json");
  for (const e of enderecos) {
    await adicionarEndereco(supabase, {
      tenant_id: contexto.tenantId,
      pessoa_id: resultado.id,
      tipo: e.tipo,
      cep: e.cep || null,
      logradouro: e.logradouro || null,
      numero: e.numero || null,
      complemento: e.complemento || null,
      bairro: e.bairro || null,
      cidade: e.cidade || null,
      uf: e.uf || null,
      principal: e.principal,
    });
  }

  const contatos = lerJsonArray<ContatoJson>(formData, "contatos_json");
  for (const c of contatos) {
    if (!c.nome?.trim()) continue;
    await adicionarContato(supabase, {
      tenant_id: contexto.tenantId,
      pessoa_id: resultado.id,
      nome: c.nome,
      cargo: c.cargo || null,
      email: c.email || null,
      telefone: c.telefone || null,
      principal: c.principal,
    });
  }

  revalidarPaginasPessoa(resultado.id);
  const destino = perfis.includes("CLIENTE") ? "clientes" : "fornecedores";
  redirect(`/${destino}/${resultado.id}`);
}

export async function atualizarPessoaAction(formData: FormData): Promise<ResultadoAcao> {
  const pessoaId = String(formData.get("pessoa_id") ?? "");
  if (!pessoaId) return { erro: "Cadastro inválido." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  let camposPersonalizados: Record<string, Json> | undefined;
  const bruto = String(formData.get("campos_personalizados") ?? "");
  if (bruto) {
    try {
      camposPersonalizados = JSON.parse(bruto);
    } catch {
      return { erro: "Campos personalizados inválidos." };
    }
  }

  const supabase = await createClient();
  const resultado = await atualizarPessoa(supabase, {
    tenant_id: contexto.tenantId,
    pessoa_id: pessoaId,
    nome: String(formData.get("nome") ?? ""),
    documento: String(formData.get("documento") ?? "") || null,
    natureza: (String(formData.get("natureza") ?? "") || null) as NaturezaPessoa | null,
    email: String(formData.get("email") ?? "") || null,
    telefone: String(formData.get("telefone") ?? "") || null,
    perfis: lerPerfis(formData),
    campos_personalizados: camposPersonalizados,
  });

  if ("erro" in resultado) return resultado;

  revalidarPaginasPessoa(pessoaId);
  return { sucesso: true };
}

function lerCamposEndereco(formData: FormData) {
  return {
    tipo: String(formData.get("tipo") ?? "COMERCIAL") as TipoEndereco,
    cep: String(formData.get("cep") ?? "") || null,
    logradouro: String(formData.get("logradouro") ?? "") || null,
    numero: String(formData.get("numero") ?? "") || null,
    complemento: String(formData.get("complemento") ?? "") || null,
    bairro: String(formData.get("bairro") ?? "") || null,
    cidade: String(formData.get("cidade") ?? "") || null,
    uf: String(formData.get("uf") ?? "") || null,
    principal: formData.get("principal") === "true",
  };
}

// Um único endpoint pra criar e "editar" (substituir) endereço — o
// formulário decide qual operação enviando ou não endereco_id, mas a regra
// de nunca fazer UPDATE em linha existente vive só em lib/pessoas.
export async function salvarEnderecoAction(formData: FormData): Promise<ResultadoAcao> {
  const pessoaId = String(formData.get("pessoa_id") ?? "");
  const enderecoId = String(formData.get("endereco_id") ?? "");
  if (!pessoaId) return { erro: "Cadastro inválido." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const campos = lerCamposEndereco(formData);
  const resultado = enderecoId
    ? await substituirEndereco(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId, endereco_id: enderecoId, ...campos })
    : await adicionarEndereco(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId, ...campos });

  if ("erro" in resultado) return resultado;

  revalidarPaginasPessoa(pessoaId);
  return { sucesso: true };
}

function lerCamposContato(formData: FormData) {
  return {
    nome: String(formData.get("nome_contato") ?? ""),
    cargo: String(formData.get("cargo") ?? "") || null,
    email: String(formData.get("email_contato") ?? "") || null,
    telefone: String(formData.get("telefone_contato") ?? "") || null,
    principal: formData.get("principal") === "true",
  };
}

export async function salvarContatoAction(formData: FormData): Promise<ResultadoAcao> {
  const pessoaId = String(formData.get("pessoa_id") ?? "");
  const contatoId = String(formData.get("contato_id") ?? "");
  if (!pessoaId) return { erro: "Cadastro inválido." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const campos = lerCamposContato(formData);
  const resultado = contatoId
    ? await substituirContato(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId, contato_id: contatoId, ...campos })
    : await adicionarContato(supabase, { tenant_id: contexto.tenantId, pessoa_id: pessoaId, ...campos });

  if ("erro" in resultado) return resultado;

  revalidarPaginasPessoa(pessoaId);
  return { sucesso: true };
}

export async function criarCampoPersonalizadoAction(formData: FormData): Promise<ResultadoAcao> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await criarCampoPersonalizado(supabase, {
    tenant_id: contexto.tenantId,
    rotulo: String(formData.get("rotulo") ?? ""),
    tipo: String(formData.get("tipo") ?? "TEXTO") as TipoCampoPersonalizado,
    aplica_a: String(formData.get("aplica_a") ?? "AMBOS") as EscopoCampoPersonalizado,
  });

  if ("erro" in resultado) return resultado;

  revalidatePath("/configuracoes/campos-personalizados");
  return { sucesso: true };
}

export async function removerCampoPersonalizadoAction(formData: FormData): Promise<ResultadoAcao> {
  const campoId = String(formData.get("campo_id") ?? "");
  if (!campoId) return { erro: "Campo inválido." };

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  const resultado = await removerCampoPersonalizado(supabase, { tenant_id: contexto.tenantId, campo_id: campoId });

  if ("erro" in resultado) return resultado;

  revalidatePath("/configuracoes/campos-personalizados");
  return { sucesso: true };
}
