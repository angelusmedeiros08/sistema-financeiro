import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { registrarLancamento } from "./ledger";
import { CODIGO_CONTAS_A_RECEBER, CODIGO_CONTAS_A_PAGAR } from "./plano-padrao";

type Cliente = SupabaseClient<Database>;
type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

// Soma 1 mês de calendário a uma data ISO (YYYY-MM-DD), com o dia grudado no
// último dia do mês de destino quando ele não existir (ex.: 31/jan + 1 mês
// não vira 3/mar, vira 28 ou 29/fev) — sem isso, parcelamento com
// vencimento no fim do mês desliza de forma silenciosamente errada.
function adicionarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const primeiroDiaAlvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDiaDoMesAlvo = new Date(
    Date.UTC(primeiroDiaAlvo.getUTCFullYear(), primeiroDiaAlvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDiaDoMesAlvo);
  return new Date(Date.UTC(primeiroDiaAlvo.getUTCFullYear(), primeiroDiaAlvo.getUTCMonth(), diaFinal))
    .toISOString()
    .slice(0, 10);
}

function calcularParcelas(valorTotal: number, numeroParcelas: number, primeiroVencimento: string) {
  const valorBase = Math.floor((valorTotal / numeroParcelas) * 100) / 100;
  let somaAlocada = 0;
  const parcelas = [];
  for (let i = 0; i < numeroParcelas; i++) {
    const ultima = i === numeroParcelas - 1;
    // a diferença de arredondamento da divisão inteira vai inteira na
    // última parcela — nunca fica escondida/perdida em nenhuma delas.
    const valor = ultima ? Math.round((valorTotal - somaAlocada) * 100) / 100 : valorBase;
    somaAlocada += valor;
    parcelas.push({ numero: i + 1, valor, data_vencimento: adicionarMeses(primeiroVencimento, i) });
  }
  return parcelas;
}

// Resolve o pessoa_id de um lançamento: usa o existente se veio um ID, cria
// um cadastro mínimo se veio só um nome digitado (fluxo de "criar na hora"
// do combobox), ou retorna null se nenhum dos dois foi informado — pessoa é
// sempre opcional, nunca bloqueia o lançamento.
export async function resolverPessoaId(
  supabase: Cliente,
  tenantId: string,
  params: { pessoaId?: string; nomeNovaPessoa?: string; documentoNovaPessoa?: string; perfil: "CLIENTE" | "FORNECEDOR" },
): Promise<string | null> {
  if (params.pessoaId) return params.pessoaId;

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
};

// Cria um evento financeiro (receita ou despesa) com seu rateio (1 ou mais
// categorias), parcelas e o lançamento contábil de reconhecimento — usado
// como núcleo comum tanto por "nova despesa" quanto por "nova receita", que
// só invertem qual lado (débito/crédito) recebe a conta da categoria vs.
// Contas a Receber/Pagar.
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

  const { data: contaContrapartida, error: erroContaContrapartida } = await supabase
    .from("contas_contabeis")
    .select("id")
    .eq("tenant_id", params.tenant_id)
    .eq("codigo", params.tipo === "RECEITA" ? CODIGO_CONTAS_A_RECEBER : CODIGO_CONTAS_A_PAGAR)
    .single();

  if (erroContaContrapartida || !contaContrapartida) {
    return { erro: "Conta contábil de Contas a Receber/Pagar não encontrada para este tenant." };
  }

  // nunca confiamos nas categorias vindas do formulário sem revalidar —
  // buscamos de novo no servidor, escopadas ao tenant e ao tipo do evento.
  const categoriaIds = params.categorias.map((c) => c.categoria_id);
  const { data: categoriasEncontradas, error: erroCategorias } = await supabase
    .from("categorias_financeiras")
    .select("id, conta_contabil_id")
    .eq("tenant_id", params.tenant_id)
    .eq("tipo", params.tipo)
    .in("id", categoriaIds);

  if (erroCategorias || !categoriasEncontradas || categoriasEncontradas.length !== new Set(categoriaIds).size) {
    return { erro: "Uma ou mais categorias são inválidas." };
  }

  const contaContabilPorCategoria = new Map(categoriasEncontradas.map((c) => [c.id, c.conta_contabil_id]));
  if (categoriasEncontradas.some((c) => !c.conta_contabil_id)) {
    return { erro: "Categoria sem conta contábil vinculada." };
  }

  const { data: evento, error: erroEvento } = await supabase
    .from("eventos_financeiros")
    .insert({
      tenant_id: params.tenant_id,
      tipo: params.tipo,
      data_competencia: params.data_competencia,
      valor_total: params.valor_total,
      descricao: params.descricao,
      pessoa_id: params.pessoa_id ?? null,
      criado_por: params.criado_por,
      regra_recorrencia_id: params.regra_recorrencia_id,
    })
    .select("id")
    .single();

  if (erroEvento || !evento) {
    return { erro: erroEvento?.message ?? "Falha ao criar evento financeiro." };
  }

  const { data: rateiosCriados, error: erroRateio } = await supabase
    .from("rateio_categoria")
    .insert(
      params.categorias.map((c) => ({
        tenant_id: params.tenant_id,
        evento_financeiro_id: evento.id,
        categoria_id: c.categoria_id,
        valor: c.valor,
      })),
    )
    // uma única instrução INSERT preserva a ordem das linhas no retorno —
    // por isso dá pra casar rateiosCriados[i] com params.categorias[i].
    .select("id");

  if (erroRateio || !rateiosCriados) return { erro: erroRateio?.message ?? "Falha ao gravar rateio de categorias." };

  // centro de custo é sempre opcional, por linha — nenhuma partida do
  // ledger depende dele, é só uma dimensão de relatório.
  const linhasCentroCusto: { tenant_id: string; rateio_categoria_id: string; centro_custo_id: string; valor: number }[] = [];
  params.categorias.forEach((c, indice) => {
    const rateioCategoriaId = rateiosCriados[indice].id;
    if (c.centro_custo_id) {
      linhasCentroCusto.push({ tenant_id: params.tenant_id, rateio_categoria_id: rateioCategoriaId, centro_custo_id: c.centro_custo_id, valor: c.valor });
    } else if (c.centros_custo) {
      for (const cc of c.centros_custo) {
        linhasCentroCusto.push({ tenant_id: params.tenant_id, rateio_categoria_id: rateioCategoriaId, centro_custo_id: cc.centro_custo_id, valor: cc.valor });
      }
    }
  });

  if (linhasCentroCusto.length > 0) {
    // nunca confiamos nos centro_custo_id vindos do formulário sem revalidar.
    const centroCustoIds = [...new Set(linhasCentroCusto.map((l) => l.centro_custo_id))];
    const { data: centrosEncontrados, error: erroCentros } = await supabase
      .from("centros_custo")
      .select("id")
      .eq("tenant_id", params.tenant_id)
      .in("id", centroCustoIds);

    if (erroCentros || !centrosEncontrados || centrosEncontrados.length !== centroCustoIds.length) {
      return { erro: "Um ou mais centros de custo são inválidos." };
    }

    const { error: erroRateioCentroCusto } = await supabase.from("rateio_centro_custo").insert(linhasCentroCusto);
    if (erroRateioCentroCusto) return { erro: erroRateioCentroCusto.message };
  }

  const parcelas = calcularParcelas(params.valor_total, params.numero_parcelas, params.primeiro_vencimento);

  const { error: erroParcelas } = await supabase.from("parcelas").insert(
    parcelas.map((p) => ({
      tenant_id: params.tenant_id,
      evento_financeiro_id: evento.id,
      numero: p.numero,
      data_vencimento: p.data_vencimento,
      valor: p.valor,
      status: "PENDENTE" as const,
    })),
  );

  if (erroParcelas) return { erro: erroParcelas.message };

  // reconhecimento contábil no regime de competência — a saída/entrada de
  // caixa de verdade só vira lançamento quando a parcela for baixada.
  // 1 partida de contrapartida (valor total) + 1 partida por categoria do
  // rateio (seu próprio valor) — com 1 categoria só, é a mesma coisa de
  // sempre (2 partidas); com N, o lado da categoria só se multiplica.
  const tipoLadoCategoria = params.tipo === "RECEITA" ? ("CREDITO" as const) : ("DEBITO" as const);
  const tipoContrapartida = params.tipo === "RECEITA" ? ("DEBITO" as const) : ("CREDITO" as const);

  const partidas = [
    { conta_contabil_id: contaContrapartida.id, tipo: tipoContrapartida, valor: params.valor_total },
    ...params.categorias.map((c) => ({
      conta_contabil_id: contaContabilPorCategoria.get(c.categoria_id)!,
      tipo: tipoLadoCategoria,
      valor: c.valor,
    })),
  ];

  const resultadoLancamento = await registrarLancamento(supabase, {
    tenant_id: params.tenant_id,
    data_competencia: params.data_competencia,
    descricao: params.descricao,
    origem: "MANUAL",
    referencia_id: evento.id,
    criado_por: params.criado_por,
    partidas,
  });

  if ("erro" in resultadoLancamento) {
    return { erro: resultadoLancamento.erro };
  }

  return { evento_id: evento.id };
}
