import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type TipoEndereco = Database["public"]["Enums"]["tipo_endereco"];
type TipoCampoPersonalizado = Database["public"]["Enums"]["tipo_campo_personalizado"];
type EscopoCampoPersonalizado = Database["public"]["Enums"]["escopo_campo_personalizado"];
type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];

type Resultado = { sucesso: true } | { erro: string };

export async function criarPessoa(
  supabase: Cliente,
  params: {
    tenant_id: string;
    nome: string;
    documento?: string | null;
    natureza?: NaturezaPessoa | null;
    email?: string | null;
    telefone?: string | null;
    perfis: PerfilPessoa[];
    campos_personalizados?: Record<string, Json>;
  },
): Promise<{ sucesso: true; id: string } | { erro: string }> {
  const nome = params.nome.trim();
  if (!nome) return { erro: "Nome é obrigatório." };
  if (params.perfis.length === 0) return { erro: "Selecione ao menos um perfil (cliente ou fornecedor)." };

  const { data, error } = await supabase
    .from("pessoas")
    .insert({
      tenant_id: params.tenant_id,
      nome,
      documento: params.documento || null,
      natureza: params.natureza || null,
      email: params.email || null,
      telefone: params.telefone || null,
      perfis: params.perfis,
      ...(params.campos_personalizados !== undefined ? { campos_personalizados: params.campos_personalizados } : {}),
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao criar cadastro." };
  return { sucesso: true, id: data.id };
}

export async function atualizarPessoa(
  supabase: Cliente,
  params: {
    tenant_id: string;
    pessoa_id: string;
    nome?: string;
    documento?: string | null;
    natureza?: NaturezaPessoa | null;
    email?: string | null;
    telefone?: string | null;
    perfis?: PerfilPessoa[];
    campos_personalizados?: Record<string, Json>;
  },
): Promise<Resultado> {
  const { tenant_id, pessoa_id, ...campos } = params;

  if (campos.nome !== undefined && !campos.nome.trim()) {
    return { erro: "Nome é obrigatório." };
  }
  if (campos.perfis !== undefined && campos.perfis.length === 0) {
    return { erro: "Selecione ao menos um perfil (cliente ou fornecedor)." };
  }

  const { error } = await supabase.from("pessoas").update(campos).eq("id", pessoa_id).eq("tenant_id", tenant_id);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

export type CamposEndereco = {
  tipo: TipoEndereco;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  principal: boolean;
};

// Nunca mais de um endereço/contato principal ativo por pessoa — redefinido
// junto na mesma operação de inserção, checado na aplicação (é regra de
// fluxo, não invariante contábil, mesmo raciocínio de renegociacoes não ter
// trigger de banco).
async function despriorizarEnderecosAtivos(supabase: Cliente, tenant_id: string, pessoa_id: string) {
  return supabase
    .from("pessoa_enderecos")
    .update({ principal: false })
    .eq("tenant_id", tenant_id)
    .eq("pessoa_id", pessoa_id)
    .eq("principal", true)
    .is("substituido_em", null);
}

export async function adicionarEndereco(
  supabase: Cliente,
  params: { tenant_id: string; pessoa_id: string } & CamposEndereco,
): Promise<Resultado> {
  const { tenant_id, pessoa_id, principal, ...resto } = params;

  if (principal) {
    const { error: erroDesprioriza } = await despriorizarEnderecosAtivos(supabase, tenant_id, pessoa_id);
    if (erroDesprioriza) return { erro: erroDesprioriza.message };
  }

  const { error } = await supabase.from("pessoa_enderecos").insert({ tenant_id, pessoa_id, principal, ...resto });
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// "Substituir" é sempre as duas operações juntas — marca o antigo como
// substituído e insere o novo — nunca exposto como UPDATE separado pro
// chamador poder errar a ordem (ou esquecer uma das duas).
export async function substituirEndereco(
  supabase: Cliente,
  params: { tenant_id: string; pessoa_id: string; endereco_id: string } & CamposEndereco,
): Promise<Resultado> {
  const { tenant_id, pessoa_id, endereco_id, ...camposNovo } = params;

  const { error: erroSubstituir } = await supabase
    .from("pessoa_enderecos")
    .update({ substituido_em: new Date().toISOString() })
    .eq("id", endereco_id)
    .eq("tenant_id", tenant_id)
    .eq("pessoa_id", pessoa_id)
    .is("substituido_em", null);

  if (erroSubstituir) return { erro: erroSubstituir.message };

  return adicionarEndereco(supabase, { tenant_id, pessoa_id, ...camposNovo });
}

export async function listarHistoricoEnderecos(supabase: Cliente, params: { tenant_id: string; pessoa_id: string }) {
  const { data, error } = await supabase
    .from("pessoa_enderecos")
    .select("*")
    .eq("tenant_id", params.tenant_id)
    .eq("pessoa_id", params.pessoa_id)
    .order("criado_em");

  if (error) return [];
  return data;
}

export type CamposContato = {
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  principal: boolean;
};

async function despriorizarContatosAtivos(supabase: Cliente, tenant_id: string, pessoa_id: string) {
  return supabase
    .from("pessoa_contatos")
    .update({ principal: false })
    .eq("tenant_id", tenant_id)
    .eq("pessoa_id", pessoa_id)
    .eq("principal", true)
    .is("substituido_em", null);
}

export async function adicionarContato(
  supabase: Cliente,
  params: { tenant_id: string; pessoa_id: string } & CamposContato,
): Promise<Resultado> {
  const { tenant_id, pessoa_id, principal, nome, ...resto } = params;

  if (!nome.trim()) return { erro: "Nome do contato é obrigatório." };

  if (principal) {
    const { error: erroDesprioriza } = await despriorizarContatosAtivos(supabase, tenant_id, pessoa_id);
    if (erroDesprioriza) return { erro: erroDesprioriza.message };
  }

  const { error } = await supabase
    .from("pessoa_contatos")
    .insert({ tenant_id, pessoa_id, nome: nome.trim(), principal, ...resto });
  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function substituirContato(
  supabase: Cliente,
  params: { tenant_id: string; pessoa_id: string; contato_id: string } & CamposContato,
): Promise<Resultado> {
  const { tenant_id, pessoa_id, contato_id, ...camposNovo } = params;

  const { error: erroSubstituir } = await supabase
    .from("pessoa_contatos")
    .update({ substituido_em: new Date().toISOString() })
    .eq("id", contato_id)
    .eq("tenant_id", tenant_id)
    .eq("pessoa_id", pessoa_id)
    .is("substituido_em", null);

  if (erroSubstituir) return { erro: erroSubstituir.message };

  return adicionarContato(supabase, { tenant_id, pessoa_id, ...camposNovo });
}

export async function listarHistoricoContatos(supabase: Cliente, params: { tenant_id: string; pessoa_id: string }) {
  const { data, error } = await supabase
    .from("pessoa_contatos")
    .select("*")
    .eq("tenant_id", params.tenant_id)
    .eq("pessoa_id", params.pessoa_id)
    .order("criado_em");

  if (error) return [];
  return data;
}

export async function criarCampoPersonalizado(
  supabase: Cliente,
  params: { tenant_id: string; rotulo: string; tipo: TipoCampoPersonalizado; aplica_a: EscopoCampoPersonalizado },
): Promise<Resultado> {
  const rotulo = params.rotulo.trim();
  if (!rotulo) return { erro: "Informe um rótulo para o campo." };

  const { error } = await supabase
    .from("campos_personalizados_definicao")
    .insert({ tenant_id: params.tenant_id, rotulo, tipo: params.tipo, aplica_a: params.aplica_a });
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Só marca indisponível pra novo uso — nunca apaga a definição, senão o
// valor já preenchido em pessoas.campos_personalizados fica órfão sem
// rótulo/tipo pra exibir.
export async function removerCampoPersonalizado(
  supabase: Cliente,
  params: { tenant_id: string; campo_id: string },
): Promise<Resultado> {
  const { error } = await supabase
    .from("campos_personalizados_definicao")
    .update({ disponivel: false })
    .eq("id", params.campo_id)
    .eq("tenant_id", params.tenant_id);
  if (error) return { erro: error.message };
  return { sucesso: true };
}
