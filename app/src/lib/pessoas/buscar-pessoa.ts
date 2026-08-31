import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];

export type LinhaPessoa = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
};

// Listagem de /clientes, /fornecedores e da aba Transportadoras — mesma
// tabela pessoas por baixo, só o filtro de perfil muda. Junta a cidade/UF
// do endereço principal ativo (se houver) só pra exibição na tabela.
//
// Paginação real no servidor (achado em auditoria, 31/08/2026) — diferente
// das tabelas transacionais (despesas/receitas/vendas/lançamentos/contas a
// pagar-receber), essa não tinha sido coberta na auditoria de escalabilidade
// de 30/08, apesar de ser uma tabela que só cresce por tenant (nunca "sai",
// diferente de parcela quitada). Mesmo padrão: `pagina`/`tamanhoPagina`
// opcionais (undefined = página 1 inteira, comportamento antigo preservado
// pra quem ainda não migrou a chamada) via `.range()`.
export async function listarPessoas(
  supabase: Cliente,
  params: { tenant_id: string; perfil: PerfilPessoa; pagina?: number; tamanhoPagina?: number },
): Promise<{ pessoas: LinhaPessoa[]; total: number }> {
  const tamanhoPagina = params.tamanhoPagina ?? 20;
  const pagina = Math.max(1, params.pagina ?? 1);
  const inicio = (pagina - 1) * tamanhoPagina;

  const { data, count, error } = await supabase
    .from("pessoas")
    .select("id, nome, documento, email, telefone, pessoa_enderecos(cidade, uf, principal, substituido_em)", { count: "exact" })
    .eq("tenant_id", params.tenant_id)
    .contains("perfis", [params.perfil])
    .order("nome")
    .range(inicio, inicio + tamanhoPagina - 1);
  if (error || !data) return { pessoas: [], total: 0 };

  const pessoas = data.map((p) => {
    const enderecoAtivo = (p.pessoa_enderecos ?? []).find((e) => !e.substituido_em && e.principal)
      ?? (p.pessoa_enderecos ?? []).find((e) => !e.substituido_em);
    return {
      id: p.id,
      nome: p.nome,
      documento: p.documento,
      email: p.email,
      telefone: p.telefone,
      cidade: enderecoAtivo?.cidade ?? null,
      uf: enderecoAtivo?.uf ?? null,
    };
  });

  return { pessoas, total: count ?? 0 };
}

export type DadosPessoa = {
  id: string;
  nome: string;
  documento: string | null;
  natureza: Database["public"]["Enums"]["natureza_pessoa"] | null;
  email: string | null;
  telefone: string | null;
  perfis: PerfilPessoa[];
  campos_personalizados: Record<string, unknown>;
  enderecos: Database["public"]["Tables"]["pessoa_enderecos"]["Row"][];
  contatos: Database["public"]["Tables"]["pessoa_contatos"]["Row"][];
};

export async function buscarDadosPessoa(
  supabase: Cliente,
  params: { tenant_id: string; pessoa_id: string },
): Promise<DadosPessoa | null> {
  const { data: pessoa, error } = await supabase
    .from("pessoas")
    .select("id, nome, documento, natureza, email, telefone, perfis, campos_personalizados")
    .eq("id", params.pessoa_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (error || !pessoa) return null;

  const [{ data: enderecos }, { data: contatos }] = await Promise.all([
    supabase
      .from("pessoa_enderecos")
      .select("*")
      .eq("tenant_id", params.tenant_id)
      .eq("pessoa_id", params.pessoa_id)
      .order("criado_em"),
    supabase
      .from("pessoa_contatos")
      .select("*")
      .eq("tenant_id", params.tenant_id)
      .eq("pessoa_id", params.pessoa_id)
      .order("criado_em"),
  ]);

  return {
    ...pessoa,
    campos_personalizados: (pessoa.campos_personalizados as Record<string, unknown>) ?? {},
    enderecos: enderecos ?? [],
    contatos: contatos ?? [],
  };
}

export type EventoPessoa = {
  id: string;
  descricao: string | null;
  valor_total: number;
  tipo: "RECEITA" | "DESPESA";
  data_competencia: string;
  parcelas: { status: string; data_vencimento: string }[];
  rateio_categoria: { categorias_financeiras: { nome: string } | null }[];
};

export type CampoPersonalizadoDefinicao = Database["public"]["Tables"]["campos_personalizados_definicao"]["Row"];

export async function listarCamposPersonalizados(
  supabase: Cliente,
  params: { tenant_id: string; apenasDisponiveis?: boolean },
): Promise<CampoPersonalizadoDefinicao[]> {
  let query = supabase
    .from("campos_personalizados_definicao")
    .select("*")
    .eq("tenant_id", params.tenant_id)
    .order("rotulo");

  if (params.apenasDisponiveis) query = query.eq("disponivel", true);

  const { data } = await query;
  return data ?? [];
}

export async function listarLancamentosPessoa(
  supabase: Cliente,
  params: { tenant_id: string; pessoa_id: string },
): Promise<EventoPessoa[]> {
  const { data } = await supabase
    .from("eventos_financeiros")
    .select(
      "id, descricao, valor_total, tipo, data_competencia, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))",
    )
    .eq("tenant_id", params.tenant_id)
    .eq("pessoa_id", params.pessoa_id)
    .order("data_competencia", { ascending: false });

  return (data ?? []) as EventoPessoa[];
}
