import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { CODIGO_RECEITAS_GERAL, CODIGO_DESPESAS_GERAL } from "./plano-padrao";

type Cliente = SupabaseClient<Database>;
type TipoContaContabil = Database["public"]["Enums"]["tipo_conta_contabil"];
type NaturezaConta = Database["public"]["Enums"]["natureza_conta"];
type Resultado = { erro: string } | { sucesso: true };

export type ContaContabil = {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoContaContabil;
  natureza: NaturezaConta;
  sistema: boolean;
  contaPaiId: string | null;
  codigoReferencialSped: string | null;
};

// Ordena por código (comparação numérica por segmento, não alfabética —
// "2.10" precisa vir depois de "2.9", não entre "2.1" e "2.2") e calcula a
// profundidade de indentação a partir da cadeia de conta_pai_id, não do
// código — o código é só rótulo, quem define a hierarquia de verdade é
// conta_pai_id.
function ordenarPorCodigo(a: { codigo: string }, b: { codigo: string }): number {
  const segA = a.codigo.split(".").map(Number);
  const segB = b.codigo.split(".").map(Number);
  for (let i = 0; i < Math.max(segA.length, segB.length); i++) {
    const diff = (segA[i] ?? 0) - (segB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export type ContaContabilComNivel = ContaContabil & { nivel: number };

export async function listarPlanoDeContas(supabase: Cliente, params: { tenantId: string }): Promise<ContaContabilComNivel[]> {
  const { data } = await supabase
    .from("contas_contabeis")
    .select("id, codigo, nome, tipo, natureza, sistema, conta_pai_id, codigo_referencial_sped")
    .eq("tenant_id", params.tenantId);

  const contas = (data ?? []).map((c) => ({
    id: c.id,
    codigo: c.codigo,
    nome: c.nome,
    tipo: c.tipo,
    natureza: c.natureza,
    sistema: c.sistema,
    contaPaiId: c.conta_pai_id,
    codigoReferencialSped: c.codigo_referencial_sped,
  }));

  const porId = new Map(contas.map((c) => [c.id, c]));
  function nivel(conta: ContaContabil): number {
    let n = 0;
    let atual: ContaContabil | undefined = conta;
    while (atual?.contaPaiId) {
      atual = porId.get(atual.contaPaiId);
      n++;
      if (n > 10) break; // trava de segurança contra ciclo acidental
    }
    return n;
  }

  return contas.map((c) => ({ ...c, nivel: nivel(c) })).sort(ordenarPorCodigo);
}

export async function criarContaContabil(
  supabase: Cliente,
  params: {
    tenantId: string;
    codigo: string;
    nome: string;
    tipo: TipoContaContabil;
    natureza: NaturezaConta;
    contaPaiId?: string | null;
    codigoReferencialSped?: string | null;
  },
): Promise<Resultado> {
  if (!params.codigo.trim() || !params.nome.trim()) {
    return { erro: "Informe código e nome da conta." };
  }

  const { error } = await supabase.from("contas_contabeis").insert({
    tenant_id: params.tenantId,
    codigo: params.codigo.trim(),
    nome: params.nome.trim(),
    tipo: params.tipo,
    natureza: params.natureza,
    conta_pai_id: params.contaPaiId || null,
    codigo_referencial_sped: params.codigoReferencialSped || null,
    sistema: false,
  });

  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Contas "sistema" (referenciadas por código fixo no restante do
// código-fonte, ex. Caixa e Bancos) não deixam mudar nome/tipo/natureza —
// mudaria o sentido contábil de algo que o ledger já assume. Reclassificar
// (conta_pai_id) e anotar o código SPED continuam livres mesmo pra elas.
export async function editarContaContabil(
  supabase: Cliente,
  params: {
    tenantId: string;
    contaId: string;
    nome: string;
    tipo: TipoContaContabil;
    natureza: NaturezaConta;
    contaPaiId?: string | null;
    codigoReferencialSped?: string | null;
  },
): Promise<Resultado> {
  const { data: conta } = await supabase
    .from("contas_contabeis")
    .select("sistema")
    .eq("id", params.contaId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (!conta) return { erro: "Conta não encontrada." };

  type AtualizacaoConta = Database["public"]["Tables"]["contas_contabeis"]["Update"];
  const atualizacao: AtualizacaoConta = {
    conta_pai_id: params.contaPaiId || null,
    codigo_referencial_sped: params.codigoReferencialSped || null,
  };
  if (!conta.sistema) {
    if (!params.nome.trim()) return { erro: "Informe o nome da conta." };
    atualizacao.nome = params.nome.trim();
    atualizacao.tipo = params.tipo;
    atualizacao.natureza = params.natureza;
  }

  const { error } = await supabase.from("contas_contabeis").update(atualizacao).eq("id", params.contaId).eq("tenant_id", params.tenantId);
  if (error) return { erro: error.message };
  return { sucesso: true };
}

// Conta genérica de destino pra categoria nova sem classificação manual
// ainda (cadastro rápido inline) — mesmo código raiz que criarEventoFinanceiro()
// já usa pra resolver a contrapartida, então sempre existe.
export async function buscarContaGenericaPorTipo(
  supabase: Cliente,
  params: { tenantId: string; tipo: "RECEITA" | "DESPESA" },
): Promise<string | null> {
  const codigo = params.tipo === "RECEITA" ? CODIGO_RECEITAS_GERAL : CODIGO_DESPESAS_GERAL;
  const { data } = await supabase.from("contas_contabeis").select("id").eq("tenant_id", params.tenantId).eq("codigo", codigo).maybeSingle();
  return data?.id ?? null;
}
