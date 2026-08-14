import type { Cliente, Regime } from "./regime";
import { buscarMovimento, valorComSinal } from "./regime";
import type { Database } from "@/utils/supabase/database.types";

type TipoLinhaDre = Database["public"]["Enums"]["tipo_linha_dre"];
type Resultado = { sucesso: true } | { erro: string };

export type LinhaDreResultado = {
  id: string;
  ordem: number;
  rotulo: string;
  tipo: TipoLinhaDre;
  valorDireto: number;
  valorAcumulado: number;
};

// A estrutura do DRE é dado (linhas_dre + linha_dre_categorias), não
// fórmula — cada linha FOLHA soma direto as categorias vinculadas a ela;
// cada linha SUBTOTAL é a soma corrida de tudo que veio antes na ordem
// (nunca conta um subtotal duas vezes porque só FOLHA tem categoria
// vinculada, logo só FOLHA contribui valor não-nulo). Mesma lógica
// alimenta a visão tabular (usa valorAcumulado) e o waterfall (usa
// valorDireto por linha, com a base flutuante calculada no componente de
// gráfico a partir da mesma ordem).
export async function buscarDRE(
  supabase: Cliente,
  params: { tenantId: string; regime: Regime; dataInicio: string; dataFim: string },
): Promise<LinhaDreResultado[]> {
  const [{ data: linhas }, movimento] = await Promise.all([
    supabase
      .from("linhas_dre")
      .select("id, ordem, rotulo, tipo, linha_dre_categorias(categoria_id)")
      .eq("tenant_id", params.tenantId)
      .order("ordem"),
    buscarMovimento(supabase, params),
  ]);

  if (!linhas) return [];

  const somaPorCategoria = new Map<string, number>();
  for (const linha of movimento) {
    if (!linha.categoriaId) continue;
    somaPorCategoria.set(linha.categoriaId, (somaPorCategoria.get(linha.categoriaId) ?? 0) + valorComSinal(linha));
  }

  let acumulado = 0;
  return linhas.map((linha) => {
    const valorDireto =
      linha.tipo === "FOLHA"
        ? linha.linha_dre_categorias.reduce((soma, c) => soma + (somaPorCategoria.get(c.categoria_id) ?? 0), 0)
        : 0;
    acumulado += valorDireto;
    return { id: linha.id, ordem: linha.ordem, rotulo: linha.rotulo, tipo: linha.tipo, valorDireto, valorAcumulado: acumulado };
  });
}

export type LinhaDreConfig = {
  id: string;
  ordem: number;
  rotulo: string;
  tipo: TipoLinhaDre;
  categorias: { id: string; nome: string }[];
};

export async function listarLinhasDreConfig(
  supabase: Cliente,
  params: { tenantId: string },
): Promise<LinhaDreConfig[]> {
  const { data } = await supabase
    .from("linhas_dre")
    .select("id, ordem, rotulo, tipo, linha_dre_categorias(categorias_financeiras(id, nome))")
    .eq("tenant_id", params.tenantId)
    .order("ordem");

  return (data ?? []).map((l) => ({
    id: l.id,
    ordem: l.ordem,
    rotulo: l.rotulo,
    tipo: l.tipo,
    categorias: l.linha_dre_categorias.map((c) => c.categorias_financeiras).filter((c): c is { id: string; nome: string } => c !== null),
  }));
}

export async function criarLinhaDre(
  supabase: Cliente,
  params: { tenantId: string; rotulo: string; tipo: TipoLinhaDre },
): Promise<Resultado> {
  const rotulo = params.rotulo.trim();
  if (!rotulo) return { erro: "Informe um rótulo para a linha." };

  const { data: ultima } = await supabase
    .from("linhas_dre")
    .select("ordem")
    .eq("tenant_id", params.tenantId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("linhas_dre")
    .insert({ tenant_id: params.tenantId, rotulo, tipo: params.tipo, ordem: (ultima?.ordem ?? 0) + 1 });

  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function removerLinhaDre(supabase: Cliente, params: { tenantId: string; linhaId: string }): Promise<Resultado> {
  const { error } = await supabase.from("linhas_dre").delete().eq("id", params.linhaId).eq("tenant_id", params.tenantId);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Reescreve a ordem de todas as linhas do tenant conforme a lista recebida
// (arrasta-e-solta na UI). Duas passagens: primeiro joga todo mundo pra
// ordem negativa (nunca colide com o intervalo positivo real nem entre si),
// depois grava a ordem final — evita violar a constraint unique(tenant_id,
// ordem) no meio do caminho, já que o cliente Supabase não expõe uma
// transação multi-statement pra isso.
export async function reordenarLinhasDre(
  supabase: Cliente,
  params: { tenantId: string; linhaIdsEmOrdem: string[] },
): Promise<Resultado> {
  for (let i = 0; i < params.linhaIdsEmOrdem.length; i++) {
    const { error } = await supabase
      .from("linhas_dre")
      .update({ ordem: -(i + 1) })
      .eq("id", params.linhaIdsEmOrdem[i])
      .eq("tenant_id", params.tenantId);
    if (error) return { erro: error.message };
  }
  for (let i = 0; i < params.linhaIdsEmOrdem.length; i++) {
    const { error } = await supabase
      .from("linhas_dre")
      .update({ ordem: i + 1 })
      .eq("id", params.linhaIdsEmOrdem[i])
      .eq("tenant_id", params.tenantId);
    if (error) return { erro: error.message };
  }
  return { sucesso: true };
}

export async function vincularCategoriaDre(
  supabase: Cliente,
  params: { tenantId: string; linhaId: string; categoriaId: string },
): Promise<Resultado> {
  // confirma posse da linha antes de inserir — linha_dre_categorias não
  // tem tenant_id próprio, a garantia real já é a policy RLS (EXISTS na
  // tabela pai), isso aqui só evita uma mensagem de erro genérica.
  const { data: linha } = await supabase
    .from("linhas_dre")
    .select("id")
    .eq("id", params.linhaId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();
  if (!linha) return { erro: "Linha de DRE não encontrada." };

  const { error } = await supabase.from("linha_dre_categorias").insert({ linha_dre_id: params.linhaId, categoria_id: params.categoriaId });
  if (error) return { erro: error.message };
  return { sucesso: true };
}

export async function desvincularCategoriaDre(
  supabase: Cliente,
  params: { linhaId: string; categoriaId: string },
): Promise<Resultado> {
  const { error } = await supabase
    .from("linha_dre_categorias")
    .delete()
    .eq("linha_dre_id", params.linhaId)
    .eq("categoria_id", params.categoriaId);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Cascata brasileira padrão — substitui a estrutura atual (as categorias
// já vinculadas ficam órfãs, o usuário redistribui manualmente depois).
// Ponto de partida, não configuração final: nenhuma linha nasce com
// categoria vinculada, porque não temos como adivinhar qual categoria do
// tenant é "CMV" ou "Despesas Comerciais".
const MODELO_COMPLETO_DRE: { rotulo: string; tipo: TipoLinhaDre }[] = [
  { rotulo: "Receita Bruta", tipo: "FOLHA" },
  { rotulo: "Deduções e Impostos sobre Venda", tipo: "FOLHA" },
  { rotulo: "Receita Líquida", tipo: "SUBTOTAL" },
  { rotulo: "Custo dos Produtos/Serviços", tipo: "FOLHA" },
  { rotulo: "Lucro Bruto", tipo: "SUBTOTAL" },
  { rotulo: "Despesas com Pessoal", tipo: "FOLHA" },
  { rotulo: "Despesas Gerais e Administrativas", tipo: "FOLHA" },
  { rotulo: "Despesas Comerciais", tipo: "FOLHA" },
  { rotulo: "EBITDA", tipo: "SUBTOTAL" },
  { rotulo: "Depreciação e Amortização", tipo: "FOLHA" },
  { rotulo: "EBIT (Lucro Operacional)", tipo: "SUBTOTAL" },
  { rotulo: "Receitas e Despesas Financeiras", tipo: "FOLHA" },
  { rotulo: "LAIR", tipo: "SUBTOTAL" },
  { rotulo: "IR e CSLL", tipo: "FOLHA" },
  { rotulo: "Lucro Líquido", tipo: "SUBTOTAL" },
];

export async function aplicarModeloCompletoDre(supabase: Cliente, params: { tenantId: string }): Promise<Resultado> {
  const { error: erroLimpeza } = await supabase.from("linhas_dre").delete().eq("tenant_id", params.tenantId);
  if (erroLimpeza) return { erro: erroLimpeza.message };

  const { error } = await supabase.from("linhas_dre").insert(
    MODELO_COMPLETO_DRE.map((linha, i) => ({ tenant_id: params.tenantId, ordem: i + 1, rotulo: linha.rotulo, tipo: linha.tipo })),
  );
  if (error) return { erro: error.message };
  return { sucesso: true };
}
