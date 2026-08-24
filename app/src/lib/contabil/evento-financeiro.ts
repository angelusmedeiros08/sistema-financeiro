import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { buscarContaGenericaPorTipo } from "./plano-contas";
import { criarCategoria } from "./categorias";
import { registrarLancamento } from "./ledger";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

// Resolve o pessoa_id de um lançamento: usa o existente se veio um ID, cria
// um cadastro mínimo se veio só um nome digitado (fluxo de "criar na hora"
// do combobox), ou retorna null se nenhum dos dois foi informado — pessoa é
// sempre opcional, nunca bloqueia o lançamento.
export async function resolverPessoaId(
  supabase: Cliente,
  tenantId: string,
  params: { pessoaId?: string; nomeNovaPessoa?: string; documentoNovaPessoa?: string; perfil: "CLIENTE" | "FORNECEDOR" },
): Promise<string | null> {
  if (params.pessoaId) {
    // confirma posse antes de aceitar o ID vindo do formulário — sem isso,
    // um pessoa_id de outro tenant passaria batido até virar um vínculo
    // quebrado (ex.: convite de portal apontando pra pessoa inexistente no
    // tenant do convite).
    const { data } = await supabase.from("pessoas").select("id").eq("id", params.pessoaId).eq("tenant_id", tenantId).maybeSingle();
    return data?.id ?? null;
  }

  const nome = params.nomeNovaPessoa?.trim();
  if (!nome) return null;

  const { data } = await supabase
    .from("pessoas")
    .insert({
      tenant_id: tenantId,
      nome,
      documento: params.documentoNovaPessoa?.trim() || null,
      perfis: [params.perfil],
    })
    .select("id")
    .single();

  return data?.id ?? null;
}

// Mesmo fluxo "criar na hora" do combobox de pessoa, aplicado ao centro de
// custo do modo simples do formulário: se veio um nome novo digitado (e
// nenhum ID), cria o centro de custo e escreve o ID de volta no próprio
// FormData — assim extrairLinhasCategoria (que lê centro_custo_id de forma
// síncrona) nem precisa saber que uma criação aconteceu.
export async function resolverCentroCustoIdSimples(supabase: Cliente, tenantId: string, formData: FormData): Promise<void> {
  if (formData.get("centro_custo_id")) return;

  const nome = String(formData.get("centro_custo_nome_novo") ?? "").trim();
  if (!nome) return;

  const { data } = await supabase.from("centros_custo").insert({ tenant_id: tenantId, nome }).select("id").single();
  if (data?.id) formData.set("centro_custo_id", data.id);
}

// Mesmo fluxo de resolverCentroCustoIdSimples, aplicado à categoria do modo
// simples do formulário — categoria nova nasce vinculada à conta contábil
// genérica do tipo (Receitas/Despesas Operacionais), reclassificável depois
// em Configurações → Categorias.
export async function resolverCategoriaIdSimples(
  supabase: Cliente,
  tenantId: string,
  tipo: TipoCategoria,
  formData: FormData,
): Promise<{ erro: string } | void> {
  if (formData.get("categoria_id")) return;

  const nome = String(formData.get("categoria_nome_novo") ?? "").trim();
  if (!nome) return;

  const contaContabilId = await buscarContaGenericaPorTipo(supabase, { tenantId, tipo });
  if (!contaContabilId) return { erro: "Conta contábil genérica não encontrada para essa categoria." };

  const resultado = await criarCategoria(supabase, { tenantId, nome, tipo, contaContabilId });
  if ("erro" in resultado) return resultado;
  formData.set("categoria_id", resultado.id);
}

export type LinhaCentroCusto = { centro_custo_id: string; valor: number };

export type LinhaCategoria = {
  categoria_id: string;
  valor: number;
  // no máximo um dos dois: centro de custo único pra linha inteira, ou
  // dividida em N — nunca os dois ao mesmo tempo (a UI garante isso).
  centro_custo_id?: string;
  centros_custo?: LinhaCentroCusto[];
};

function parseLinhaCentroCusto(bruto: unknown): LinhaCentroCusto | { erro: string } {
  if (typeof bruto !== "object" || bruto === null) return { erro: "Rateio de centro de custo inválido." };
  const { centro_custo_id, valor } = bruto as Record<string, unknown>;
  const valorNumero = Number(valor);
  if (typeof centro_custo_id !== "string" || !centro_custo_id || !Number.isFinite(valorNumero) || valorNumero <= 0) {
    return { erro: "Rateio de centro de custo inválido." };
  }
  return { centro_custo_id, valor: valorNumero };
}

// Lê o rateio do FormData: se veio rateio_json (toggle "Dividir entre
// categorias" ligado no formulário), usa as N linhas de lá; senão, cai no
// caminho simples de sempre — 1 linha com a categoria única escolhida. Cada
// linha (nos dois modos) pode trazer opcionalmente um centro de custo único
// ou dividido — mesmo formato nos dois casos.
export function extrairLinhasCategoria(
  formData: FormData,
  categoriaIdSimples: string,
  valorTotal: number,
): LinhaCategoria[] | { erro: string } {
  const rateioJson = formData.get("rateio_json");
  if (!rateioJson) {
    const centroCustoId = String(formData.get("centro_custo_id") ?? "") || undefined;
    return [{ categoria_id: categoriaIdSimples, valor: valorTotal, centro_custo_id: centroCustoId }];
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(rateioJson));
  } catch {
    return { erro: "Rateio inválido." };
  }

  if (!Array.isArray(bruto) || bruto.length < 2) {
    return { erro: "O rateio precisa de pelo menos 2 categorias." };
  }

  const linhas: LinhaCategoria[] = [];
  for (const linha of bruto) {
    if (typeof linha !== "object" || linha === null) return { erro: "Rateio inválido." };
    const { categoria_id, valor, centro_custo_id, centros_custo } = linha as Record<string, unknown>;
    const valorNumero = Number(valor);
    if (typeof categoria_id !== "string" || !categoria_id || !Number.isFinite(valorNumero) || valorNumero <= 0) {
      return { erro: "Rateio inválido." };
    }

    const linhaCategoria: LinhaCategoria = { categoria_id, valor: valorNumero };

    if (Array.isArray(centros_custo) && centros_custo.length > 0) {
      const linhasCentroCusto: LinhaCentroCusto[] = [];
      for (const cc of centros_custo) {
        const resultado = parseLinhaCentroCusto(cc);
        if ("erro" in resultado) return resultado;
        linhasCentroCusto.push(resultado);
      }
      const somaCentroCusto = linhasCentroCusto.reduce((acc, l) => acc + l.valor, 0);
      if (Math.round((somaCentroCusto - valorNumero) * 100) !== 0) {
        return { erro: "A soma dos centros de custo não bate com o valor da categoria." };
      }
      linhaCategoria.centros_custo = linhasCentroCusto;
    } else if (typeof centro_custo_id === "string" && centro_custo_id) {
      linhaCategoria.centro_custo_id = centro_custo_id;
    }

    linhas.push(linhaCategoria);
  }

  return linhas;
}

export type ParametrosEventoFinanceiro = {
  tenant_id: string;
  tipo: TipoCategoria;
  descricao: string;
  valor_total: number;
  data_competencia: string;
  // 1 linha = caso simples de sempre; 2+ linhas = rateio entre categorias.
  // O mesmo caminho de código serve os dois — não há um "modo rateio"
  // separado, só um array de tamanho diferente.
  categorias: LinhaCategoria[];
  pessoa_id?: string | null;
  numero_parcelas: number;
  primeiro_vencimento: string;
  criado_por?: string;
  // preenchido só quando o evento é gerado pelo job de recorrência —
  // rastreabilidade pura, nenhum comportamento depende disso depois de criado.
  regra_recorrencia_id?: string;
  // preenchido só pelo módulo de importação de planilha — dá idempotência a
  // uma linha (uma segunda chamada com a mesma chave retorna o evento já
  // criado em vez de duplicar, ver Seção 3 de
  // docs/superpowers/specs/2026-08-16-importacao-de-planilha-design.md).
  import_key?: string;
};

// Cria um evento financeiro (receita ou despesa) com seu rateio (1 ou mais
// categorias), parcelas e o lançamento contábil de reconhecimento — usado
// como núcleo comum tanto por "nova despesa" quanto por "nova receita", que
// só invertem qual lado (débito/crédito) recebe a conta da categoria vs.
// Contas a Receber/Pagar.
//
// Toda a cadeia (evento, rateio de categoria, rateio de centro de custo,
// parcelas, lançamento contábil, partidas) roda dentro da função de banco
// `criar_evento_financeiro` — a transação implícita da função garante que um
// erro em qualquer ponto desfaz tudo, sem deixar órfão (achado da spec de
// importação: a versão anterior fazia os mesmos inserts em sequência, sem
// transação, e uma falha no meio podia deixar um evento sem rateio ou um
// lançamento desbalanceado).
export async function criarEventoFinanceiro(
  supabase: Cliente,
  params: ParametrosEventoFinanceiro,
): Promise<{ evento_id: string } | { erro: string }> {
  if (params.categorias.length === 0) {
    return { erro: "Informe ao menos uma categoria." };
  }

  const somaCategorias = params.categorias.reduce((acc, c) => acc + c.valor, 0);
  if (Math.round((somaCategorias - params.valor_total) * 100) !== 0) {
    return { erro: "A soma das categorias não bate com o valor total." };
  }

  const { data: eventoId, error } = await supabase.rpc("criar_evento_financeiro", {
    p_tenant_id: params.tenant_id,
    p_tipo: params.tipo,
    p_descricao: params.descricao,
    p_valor_total: params.valor_total,
    p_data_competencia: params.data_competencia,
    p_categorias: params.categorias,
    p_pessoa_id: params.pessoa_id ?? undefined,
    p_numero_parcelas: params.numero_parcelas,
    p_primeiro_vencimento: params.primeiro_vencimento,
    p_criado_por: params.criado_por,
    p_regra_recorrencia_id: params.regra_recorrencia_id,
    p_import_key: params.import_key,
  });

  if (error || !eventoId) {
    return { erro: error?.message ?? "Falha ao criar evento financeiro." };
  }

  return { evento_id: eventoId };
}

// Reverte um evento financeiro inteiro (nunca só uma baixa): mesmo
// princípio de estornarBaixa() — lancamentos/partidas são imutáveis por
// trigger de banco, então nunca edita/apaga nada, sempre cria um
// lançamento contrário. Primeiro consumidor é "desfazer importação", mas é
// capacidade central do razão contábil, não uma função exclusiva de
// import — qualquer despesa/receita criada errada pode usar isto.
export async function estornarEventoFinanceiro(
  supabase: Cliente,
  params: { tenant_id: string; evento_id: string; motivo: string; criado_por?: string },
): Promise<{ sucesso: true } | { erro: string }> {
  const { data: evento, error: erroEvento } = await supabase
    .from("eventos_financeiros")
    .select("id, descricao, estornado_em")
    .eq("id", params.evento_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (erroEvento || !evento) return { erro: "Evento financeiro não encontrado." };
  if (evento.estornado_em) return { erro: "Este evento já foi estornado." };

  const { data: parcelas, error: erroParcelas } = await supabase
    .from("parcelas")
    .select("id, status")
    .eq("evento_financeiro_id", params.evento_id);

  if (erroParcelas || !parcelas) return { erro: "Falha ao consultar as parcelas do evento." };

  if (parcelas.some((p) => p.status === "RENEGOCIADO")) {
    return { erro: "Este evento tem parcela renegociada — não é possível estornar automaticamente." };
  }

  const idsParcelas = parcelas.map((p) => p.id);
  if (idsParcelas.length > 0) {
    const { data: baixasVivas } = await supabase.from("baixas").select("id").in("parcela_id", idsParcelas).is("estornado_em", null);
    if (baixasVivas && baixasVivas.length > 0) {
      return { erro: "Existe baixa registrada para este evento — estorne a baixa primeiro." };
    }
  }

  // referencia_id é referência polimórfica de aplicação (sem FK) — mesma
  // regra usada na criação, em criar_evento_financeiro: origem='MANUAL',
  // referencia_id=evento_id.
  const { data: lancamentoOriginal, error: erroLancamento } = await supabase
    .from("lancamentos")
    .select("id, descricao")
    .eq("tenant_id", params.tenant_id)
    .eq("referencia_id", params.evento_id)
    .eq("origem", "MANUAL")
    .maybeSingle();

  if (erroLancamento || !lancamentoOriginal) return { erro: "Lançamento de reconhecimento não encontrado para este evento." };

  const { data: partidasOriginais, error: erroPartidasOriginais } = await supabase
    .from("partidas")
    .select("conta_contabil_id, tipo, valor")
    .eq("lancamento_id", lancamentoOriginal.id);

  if (erroPartidasOriginais || !partidasOriginais || partidasOriginais.length === 0) {
    return { erro: "Partidas do lançamento original não encontradas." };
  }

  // Reentrância: se uma tentativa anterior já criou o lançamento contrário
  // mas falhou antes de marcar estornado_em (achado ao vivo: RLS sem
  // policy de UPDATE em eventos_financeiros bloqueava o passo final em
  // silêncio), uma nova chamada não pode criar um SEGUNDO lançamento de
  // estorno — só completa o que faltou.
  const { data: estornoJaExiste } = await supabase.from("lancamentos").select("id").eq("estornado_de_id", lancamentoOriginal.id).maybeSingle();

  if (!estornoJaExiste) {
    const partidasInvertidas = partidasOriginais.map((p) => ({
      conta_contabil_id: p.conta_contabil_id,
      tipo: (p.tipo === "DEBITO" ? "CREDITO" : "DEBITO") as "DEBITO" | "CREDITO",
      valor: p.valor,
    }));

    const resultadoLancamento = await registrarLancamento(supabase, {
      tenant_id: params.tenant_id,
      data_competencia: new Date().toISOString().slice(0, 10),
      descricao: `Estorno: ${lancamentoOriginal.descricao}`,
      origem: "ESTORNO",
      estornado_de_id: lancamentoOriginal.id,
      criado_por: params.criado_por,
      partidas: partidasInvertidas,
    });

    if ("erro" in resultadoLancamento) return { erro: resultadoLancamento.erro };
  }

  // Só pode estar PENDENTE ou ATRASADO neste ponto — RECEBIDO_PARCIAL/
  // QUITADO exigem baixa viva, já barrado acima; RENEGOCIADO já barrado
  // acima também.
  const pendentes = parcelas.filter((p) => p.status === "PENDENTE" || p.status === "ATRASADO");
  for (const p of pendentes) {
    await supabase.from("parcelas").update({ status: "CANCELADO", motivo_cancelamento: params.motivo }).eq("id", p.id);
  }

  // WHERE estornado_em is null: mesma proteção de atomicidade-por-guarda de
  // estornarBaixa() contra estorno em duplicidade concorrente.
  const { data: marcado, error: erroMarcar } = await supabase
    .from("eventos_financeiros")
    .update({ estornado_em: new Date().toISOString() })
    .eq("id", params.evento_id)
    .is("estornado_em", null)
    .select("id");

  if (erroMarcar || !marcado || marcado.length === 0) {
    return { erro: "Não foi possível marcar o evento como estornado (já pode ter sido estornado em paralelo)." };
  }

  return { sucesso: true };
}
