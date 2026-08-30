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
//
// Os dois INSERTs (lancamentos, depois partidas) rodam dentro da RPC
// `registrar_lancamento`, na mesma transação — antes eram duas chamadas
// PostgREST separadas, sem rollback entre elas: se a de partidas falhasse
// depois da de lancamentos ter sucesso, sobrava um lançamento órfão sem
// partida nenhuma. Numa retentativa de estornar, a checagem de reentrância
// (que só olha se existe a linha em `lancamentos`) encontrava esse órfão e
// pulava a criação do estorno de verdade — o razão nunca era revertido, mas
// o sistema marcava como se tivesse sido (achado em revisão de código).
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
  // `codigoPostgres` é o SQLSTATE do erro (ex. "23505" = unique_violation) —
  // exposto pra quem chama distinguir uma corrida esperada (ex.: dois
  // cliques em "Estornar" quase simultâneos, ambos batendo no índice único
  // de `estornado_de_id`) de uma falha real. Achado em auditoria de
  // integridade financeira (30/08/2026): sem isso, `estornarBaixa` só via
  // uma mensagem de texto genérica e não tinha como recuperar do jeito
  // certo (que é: reconhecer que outra requisição já fez o estorno).
): Promise<{ lancamento_id: string } | { erro: string; codigoPostgres?: string }> {
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

  const { data: lancamentoId, error } = await supabase.rpc("registrar_lancamento", {
    p_tenant_id: params.tenant_id,
    p_data_competencia: params.data_competencia,
    p_descricao: params.descricao,
    p_origem: params.origem,
    p_partidas: params.partidas.map((p) => ({ conta_contabil_id: p.conta_contabil_id, tipo: p.tipo, valor: p.valor })),
    ...(params.referencia_id ? { p_referencia_id: params.referencia_id } : {}),
    ...(params.criado_por ? { p_criado_por: params.criado_por } : {}),
    ...(params.estornado_de_id ? { p_estornado_de_id: params.estornado_de_id } : {}),
  });

  if (error || !lancamentoId) {
    return { erro: error?.message ?? "Falha ao registrar lançamento.", codigoPostgres: error?.code };
  }

  return { lancamento_id: lancamentoId };
}
