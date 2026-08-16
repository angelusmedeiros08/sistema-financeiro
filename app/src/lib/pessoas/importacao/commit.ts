import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/utils/supabase/database.types";
import { criarPessoa, atualizarPessoa, adicionarEndereco, adicionarContato } from "@/lib/pessoas/pessoas";

type Cliente = SupabaseClient<Database>;
type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];

export type ParametrosCommitLinhaPessoa = {
  tenant_id: string;
  acao: "criar" | "atualizar";
  pessoaIdExistente: string | null;
  // Só true quando a correspondência foi por documento ou nome idêntico —
  // correspondência aproximada significa que o texto da própria linha é uma
  // grafia diferente da pessoa encontrada (foi isso que fez ela "aproximar",
  // não "bater exato"), então não é seguro usar como nome novo.
  permitirAtualizarNome: boolean;
  nome: string;
  documento: string | null;
  natureza: NaturezaPessoa | null;
  email: string | null;
  telefone: string | null;
  perfisNovos: PerfilPessoa[];
  campos_personalizados?: Record<string, Json>;
  endereco?: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  contato?: {
    nome: string;
    cargo?: string | null;
    email?: string | null;
    telefone?: string | null;
  };
};

// Perfis somam, nunca substituem (Seção 5 da spec) — união calculada aqui
// antes de chamar atualizarPessoa, que faz UPDATE direto do array.
function unirPerfis(atuais: PerfilPessoa[], novos: PerfilPessoa[]): PerfilPessoa[] {
  return [...new Set([...atuais, ...novos])];
}

export async function commitarLinhaPessoa(supabase: Cliente, params: ParametrosCommitLinhaPessoa): Promise<{ pessoa_id: string } | { erro: string }> {
  let pessoaId: string;

  if (params.acao === "criar") {
    const resultado = await criarPessoa(supabase, {
      tenant_id: params.tenant_id,
      nome: params.nome,
      documento: params.documento,
      natureza: params.natureza,
      email: params.email,
      telefone: params.telefone,
      perfis: params.perfisNovos,
      campos_personalizados: params.campos_personalizados,
    });
    if ("erro" in resultado) return resultado;
    pessoaId = resultado.id;
  } else {
    if (!params.pessoaIdExistente) return { erro: "Linha marcada como atualização sem uma pessoa correspondente." };
    pessoaId = params.pessoaIdExistente;

    // Busca o perfis atual na hora do commit em vez de confiar num valor
    // vindo do cliente — se duas linhas do mesmo arquivo apontarem pra
    // mesma pessoa, a segunda precisa enxergar o perfil que a primeira
    // acabou de adicionar, senão a união "reseta" a partir de um estado
    // desatualizado e perde o que a linha anterior já tinha somado.
    const { data: atual, error: erroAtual } = await supabase
      .from("pessoas")
      .select("perfis")
      .eq("id", pessoaId)
      .eq("tenant_id", params.tenant_id)
      .single();
    if (erroAtual || !atual) return { erro: "Pessoa correspondente não encontrada." };

    const resultado = await atualizarPessoa(supabase, {
      tenant_id: params.tenant_id,
      pessoa_id: pessoaId,
      // célula vazia nunca apaga dado já cadastrado (Seção 5) — só entra no
      // UPDATE o que a linha realmente trouxe preenchido. Nome só entra se
      // a correspondência foi confiável o bastante pra confiar na grafia
      // da própria linha (ver comentário no tipo acima).
      ...(params.nome && params.permitirAtualizarNome ? { nome: params.nome } : {}),
      ...(params.documento ? { documento: params.documento } : {}),
      ...(params.natureza ? { natureza: params.natureza } : {}),
      ...(params.email ? { email: params.email } : {}),
      ...(params.telefone ? { telefone: params.telefone } : {}),
      perfis: unirPerfis(atual.perfis, params.perfisNovos),
      ...(params.campos_personalizados ? { campos_personalizados: params.campos_personalizados } : {}),
    });
    if ("erro" in resultado) return resultado;
  }

  if (params.endereco) {
    const resultado = await adicionarEndereco(supabase, {
      tenant_id: params.tenant_id,
      pessoa_id: pessoaId,
      tipo: "COMERCIAL",
      principal: true,
      ...params.endereco,
    });
    if ("erro" in resultado) return { erro: `Pessoa salva, mas o endereço falhou: ${resultado.erro}` };
  }

  if (params.contato?.nome.trim()) {
    const resultado = await adicionarContato(supabase, {
      tenant_id: params.tenant_id,
      pessoa_id: pessoaId,
      principal: true,
      ...params.contato,
    });
    if ("erro" in resultado) return { erro: `Pessoa salva, mas o contato falhou: ${resultado.erro}` };
  }

  return { pessoa_id: pessoaId };
}
