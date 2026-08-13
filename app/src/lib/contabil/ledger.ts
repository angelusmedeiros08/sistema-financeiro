import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type OrigemLancamento = Database["public"]["Enums"]["origem_lancamento"];

export type PartidaEntrada = {
  conta_contabil_id: string;
  tipo: "DEBITO" | "CREDITO";
  valor: number;
};

// Único ponto do código que escreve no ledger de partida dobrada. Sempre
// débito(s) = crédito(s) — quem chama é responsável por montar as partidas
// certas; o banco (trigger checar_partidas_balanceadas) rejeita qualquer
// coisa desbalanceada de qualquer forma, então isto nunca "engana" a
// integridade dos dados — só evita repetir o insert de lançamento+partidas
// em cada fluxo (criar despesa, dar baixa, estornar).
export async function registrarLancamento(
  supabase: Cliente,
  params: {
    tenant_id: string;
    data_competencia: string;
    descricao: string;
    origem: OrigemLancamento;
    referencia_id?: string;
    criado_por?: string;
    estornado_de_id?: string;
    partidas: PartidaEntrada[];
  },
): Promise<{ lancamento_id: string } | { erro: string }> {
  const somaDebito = params.partidas
    .filter((p) => p.tipo === "DEBITO")
    .reduce((acc, p) => acc + p.valor, 0);
  const somaCredito = params.partidas
    .filter((p) => p.tipo === "CREDITO")
    .reduce((acc, p) => acc + p.valor, 0);

  // checagem no código só para dar erro cedo e com mensagem clara —
  // a garantia de verdade é o trigger no banco, não esta linha.
  if (Math.round((somaDebito - somaCredito) * 100) !== 0) {
    return { erro: "Lançamento desbalanceado: débito e crédito não coincidem." };
  }

  const { data: lancamento, error: erroLancamento } = await supabase
    .from("lancamentos")
    .insert({
      tenant_id: params.tenant_id,
      data_competencia: params.data_competencia,
      descricao: params.descricao,
      origem: params.origem,
      referencia_id: params.referencia_id,
      criado_por: params.criado_por,
      estornado_de_id: params.estornado_de_id,
    })
    .select("id")
    .single();

  if (erroLancamento || !lancamento) {
    return { erro: erroLancamento?.message ?? "Falha ao criar lançamento." };
  }

  // tenant_id aqui é redundante em runtime (o gatilho trg_partidas_definir_tenant
  // sempre sobrescreve com o tenant_id do lançamento), mas o tipo gerado exige
  // a coluna por ela ser NOT NULL sem default — o TypeScript não enxerga o gatilho.
  const { error: erroPartidas } = await supabase.from("partidas").insert(
    params.partidas.map((p) => ({
      lancamento_id: lancamento.id,
      tenant_id: params.tenant_id,
      conta_contabil_id: p.conta_contabil_id,
      tipo: p.tipo,
      valor: p.valor,
    })),
  );

  if (erroPartidas) {
    return { erro: erroPartidas.message };
  }

  return { lancamento_id: lancamento.id };
}
