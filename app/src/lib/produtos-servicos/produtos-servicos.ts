import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type TipoProdutoServico = Database["public"]["Enums"]["tipo_produto_servico"];
type Resultado = { erro: string } | { sucesso: true };

export type ProdutoServico = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoProdutoServico;
  precoVenda: number;
  categoriaFinanceiraId: string;
  categoriaFinanceiraNome: string;
  unidadeMedida: string | null;
  codigoReferencia: string | null;
  ativo: boolean;
};

// Paginação real no servidor quando `pagina` é informado (achado em
// varredura de melhorias) — antes buscava o catálogo inteiro do tenant sem
// `.range()`, mesma classe de exposição já corrigida em Vendas/Despesas/
// Receitas/Importações. Os chamadores com `apenasAtivos` (comboboxes de
// Vendas/Orçamentos) continuam sem paginar de propósito — precisam da lista
// inteira pra busca client-side.
export async function listarProdutosServicos(
  supabase: Cliente,
  tenantId: string,
  params?: { apenasAtivos?: boolean; pagina?: number; tamanhoPagina?: number },
): Promise<{ itens: ProdutoServico[]; total: number }> {
  let query = supabase
    .from("produtos_servicos")
    .select("id, nome, descricao, tipo, preco_venda, categoria_financeira_id, unidade_medida, codigo_referencia, ativo, categorias_financeiras(nome)", {
      count: "exact",
    })
    .eq("tenant_id", tenantId)
    .order("nome");

  if (params?.apenasAtivos) query = query.eq("ativo", true);

  if (params?.pagina) {
    const tamanhoPagina = params.tamanhoPagina ?? 20;
    const inicio = (Math.max(1, params.pagina) - 1) * tamanhoPagina;
    query = query.range(inicio, inicio + tamanhoPagina - 1);
  }

  const { data, count } = await query;

  const itens = (data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    tipo: p.tipo,
    precoVenda: Number(p.preco_venda),
    categoriaFinanceiraId: p.categoria_financeira_id,
    categoriaFinanceiraNome: p.categorias_financeiras?.nome ?? "",
    unidadeMedida: p.unidade_medida,
    codigoReferencia: p.codigo_referencia,
    ativo: p.ativo,
  }));

  return { itens, total: count ?? itens.length };
}

export async function criarProdutoServico(
  supabase: Cliente,
  params: {
    tenantId: string;
    nome: string;
    descricao?: string | null;
    tipo: TipoProdutoServico;
    precoVenda: number;
    categoriaFinanceiraId: string;
    unidadeMedida?: string | null;
    codigoReferencia?: string | null;
  },
): Promise<{ id: string } | { erro: string }> {
  if (!params.nome.trim()) return { erro: "Informe o nome do produto ou serviço." };
  if (!params.categoriaFinanceiraId) return { erro: "Selecione a categoria financeira de receita." };
  if (!Number.isFinite(params.precoVenda) || params.precoVenda < 0) return { erro: "Informe um preço de venda válido." };

  const { data, error } = await supabase
    .from("produtos_servicos")
    .insert({
      tenant_id: params.tenantId,
      nome: params.nome.trim(),
      descricao: params.descricao?.trim() || null,
      tipo: params.tipo,
      preco_venda: params.precoVenda,
      categoria_financeira_id: params.categoriaFinanceiraId,
      unidade_medida: params.unidadeMedida?.trim() || null,
      codigo_referencia: params.codigoReferencia?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao criar produto ou serviço." };
  return { id: data.id };
}

export async function editarProdutoServico(
  supabase: Cliente,
  params: {
    tenantId: string;
    produtoServicoId: string;
    nome: string;
    descricao?: string | null;
    tipo: TipoProdutoServico;
    precoVenda: number;
    categoriaFinanceiraId: string;
    unidadeMedida?: string | null;
    codigoReferencia?: string | null;
    ativo: boolean;
  },
): Promise<Resultado> {
  if (!params.nome.trim()) return { erro: "Informe o nome do produto ou serviço." };
  if (!params.categoriaFinanceiraId) return { erro: "Selecione a categoria financeira de receita." };
  if (!Number.isFinite(params.precoVenda) || params.precoVenda < 0) return { erro: "Informe um preço de venda válido." };

  const { error } = await supabase
    .from("produtos_servicos")
    .update({
      nome: params.nome.trim(),
      descricao: params.descricao?.trim() || null,
      tipo: params.tipo,
      preco_venda: params.precoVenda,
      categoria_financeira_id: params.categoriaFinanceiraId,
      unidade_medida: params.unidadeMedida?.trim() || null,
      codigo_referencia: params.codigoReferencia?.trim() || null,
      ativo: params.ativo,
    })
    .eq("id", params.produtoServicoId)
    .eq("tenant_id", params.tenantId);

  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Quick-create a partir do combobox na tela de venda — nasce como SERVICO
// (o caso mais comum quando o usuário só digita um nome sem passar pela
// tela de cadastro completa) na primeira categoria de receita do tenant;
// o usuário ajusta tipo/categoria depois em /produtos-servicos se precisar.
export async function criarProdutoServicoRapido(
  supabase: Cliente,
  params: { tenantId: string; nome: string },
): Promise<{ id: string; precoVenda: number } | { erro: string }> {
  const nome = params.nome.trim();
  if (!nome) return { erro: "Informe o nome." };

  const { data: categoria } = await supabase
    .from("categorias_financeiras")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("tipo", "RECEITA")
    .order("nome")
    .limit(1)
    .maybeSingle();

  if (!categoria) return { erro: "Nenhuma categoria de receita cadastrada — crie uma em Configurações → Categorias primeiro." };

  const { data, error } = await supabase
    .from("produtos_servicos")
    .insert({
      tenant_id: params.tenantId,
      nome,
      tipo: "SERVICO",
      preco_venda: 0,
      categoria_financeira_id: categoria.id,
    })
    .select("id, preco_venda")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao criar produto ou serviço." };
  return { id: data.id, precoVenda: Number(data.preco_venda) };
}
