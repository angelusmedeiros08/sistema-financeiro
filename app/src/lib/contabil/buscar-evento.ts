import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { DadosEventoParaEdicao } from "@/components/lancamentos/editar-evento-financeiro";

type Cliente = SupabaseClient<Database>;

const SELECT_EVENTO = `
  id, tipo, descricao, valor_total, estornado_em,
  pessoas (id, nome),
  rateio_categoria (
    categoria_id, valor,
    categorias_financeiras (id, nome),
    rateio_centro_custo (centro_custo_id, centros_custo (id, nome))
  ),
  parcelas (id, status, baixas (estornado_em))
`;

// Busca e classifica um evento pra tela de edição — usada tanto por
// /receitas/[id] quanto /despesas/[id], só muda o tipo esperado. Editar
// valor/categoria só é permitido quando: 1 parcela, nenhuma baixa viva
// nela, e sem rateio pré-existente (2+ categorias) — mesmas travas de
// editarEventoFinanceiro, replicadas aqui só pra decidir o que a tela
// mostra (a garantia de verdade continua sendo a função em si).
export async function buscarEventoParaEdicao(
  supabase: Cliente,
  params: { tenant_id: string; evento_id: string; tipo: "RECEITA" | "DESPESA" },
): Promise<DadosEventoParaEdicao | null> {
  const { data, error } = await supabase
    .from("eventos_financeiros")
    .select(SELECT_EVENTO)
    .eq("id", params.evento_id)
    .eq("tenant_id", params.tenant_id)
    .eq("tipo", params.tipo)
    .single();

  if (error || !data) return null;

  const rateio = data.rateio_categoria ?? [];
  const primeiraCategoria = rateio[0];
  const centroCustoAtual = primeiraCategoria?.rateio_centro_custo?.[0]?.centros_custo ?? null;

  const parcelas = data.parcelas ?? [];
  const temBaixaViva = parcelas.some((p) => (p.baixas ?? []).some((b) => !b.estornado_em));

  let motivoBloqueio: string | null = null;
  if (rateio.length > 1) {
    motivoBloqueio = "Este lançamento está dividido entre categorias — pra corrigir valor ou categoria, estorne e lance de novo.";
  } else if (parcelas.length !== 1) {
    motivoBloqueio = "Este lançamento está parcelado — pra corrigir valor ou categoria, estorne e lance de novo.";
  } else if (temBaixaViva) {
    motivoBloqueio = "Este lançamento já tem baixa registrada — estorne a baixa primeiro pra corrigir valor ou categoria.";
  }

  return {
    id: data.id,
    tipo: data.tipo,
    descricao: data.descricao ?? "",
    valorTotal: Number(data.valor_total),
    categoriaAtual: primeiraCategoria?.categorias_financeiras ?? null,
    centroCustoAtual,
    pessoaAtual: data.pessoas ?? null,
    estornado: Boolean(data.estornado_em),
    valorCategoriaEditavel: !data.estornado_em && motivoBloqueio === null,
    motivoBloqueio: data.estornado_em ? null : motivoBloqueio,
  };
}

export type { DadosEventoParaEdicao };
