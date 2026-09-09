import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { criarReceita, editarReceita } from "@/app/(app)/receitas/actions";
import { criarDespesa, editarDespesa } from "@/app/(app)/despesas/actions";
import { cancelarParcelaAction } from "@/lib/contabil/ciclo-vida-parcela-actions";

// Fluxo de confirmação (Fatia 6, Seção 3 da spec) — a escrita real
// acontece SÓ aqui, fora do loop do modelo, chamando exatamente as mesmas
// server actions que a tela normal usa. Corpo: { mensagemId, acao }.
function valorParaFormData(valor: number): string {
  // criarReceita/criarDespesa esperam o mesmo formato que o campo de valor
  // do formulário manda (parseNumeroBR: vírgula decimal) — nunca ponto,
  // que parseNumeroBR trata como separador de milhar.
  return valor.toFixed(2).replace(".", ",");
}

type PropostaCriarLancamento = {
  acao: "criar_lancamento";
  tipo: "RECEITA" | "DESPESA";
  descricao: string;
  valor: number;
  data: string;
  categoria: { nome: string; id: string | null; categoriaNova: boolean };
  pessoa: { nome: string; id: string | null; pessoaNova: boolean } | null;
};
type PropostaEditarLancamento = {
  acao: "editar_lancamento";
  eventoId: string;
  tipo: "RECEITA" | "DESPESA";
  novaDescricao: string;
  novoValor: number;
};
type PropostaCancelarParcela = { acao: "cancelar_parcela"; parcelaId: string; motivo: string };

async function executarProposta(proposta: unknown, mensagemId: string): Promise<{ erro: string } | { sucesso: true; mensagem: string }> {
  if (!proposta || typeof proposta !== "object" || !("acao" in proposta)) return { erro: "Proposta inválida." };
  const p = proposta as { acao: string };

  if (p.acao === "criar_lancamento") {
    const c = proposta as PropostaCriarLancamento;
    const fd = new FormData();
    fd.set("descricao", c.descricao);
    fd.set("valor", valorParaFormData(c.valor));
    fd.set("data_vencimento", c.data);
    fd.set("numero_parcelas", "1");
    // mensagemId é único por proposta e estável entre tentativas — mesma
    // defesa de idempotência que o formulário manual usa (import_key em
    // criarEventoFinanceiro), agora também no caminho do chat.
    fd.set("idempotency_key", `chat-${mensagemId}`);
    if (c.categoria.id) fd.set("categoria_id", c.categoria.id);
    else if (c.categoria.categoriaNova) fd.set("categoria_nome_novo", c.categoria.nome);
    if (c.pessoa?.id) fd.set("pessoa_id", c.pessoa.id);
    else if (c.pessoa?.pessoaNova) fd.set("pessoa_nome_novo", c.pessoa.nome);

    const resultado = c.tipo === "RECEITA" ? await criarReceita(fd) : await criarDespesa(fd);
    if ("erro" in resultado) return { erro: resultado.erro };
    return { sucesso: true, mensagem: `${c.tipo === "RECEITA" ? "Receita" : "Despesa"} criada com sucesso.` };
  }

  if (p.acao === "editar_lancamento") {
    const e = proposta as PropostaEditarLancamento;
    const fd = new FormData();
    fd.set("descricao", e.novaDescricao);
    fd.set("valor", valorParaFormData(e.novoValor));

    const resultado = e.tipo === "RECEITA" ? await editarReceita(e.eventoId, fd) : await editarDespesa(e.eventoId, fd);
    if ("erro" in resultado) return { erro: resultado.erro };
    return { sucesso: true, mensagem: "Lançamento atualizado com sucesso." };
  }

  if (p.acao === "cancelar_parcela") {
    const c = proposta as PropostaCancelarParcela;
    const fd = new FormData();
    fd.set("parcela_id", c.parcelaId);
    fd.set("motivo", c.motivo);

    const resultado = await cancelarParcelaAction(fd);
    if ("erro" in resultado) return { erro: resultado.erro };
    return { sucesso: true, mensagem: "Parcela cancelada com sucesso." };
  }

  return { erro: "Tipo de proposta desconhecido." };
}

export async function POST(request: Request) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return Response.json({ erro: contexto.erro }, { status: 401 });

  const corpo: unknown = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") return Response.json({ erro: "Corpo inválido." }, { status: 400 });
  const { mensagemId, acao } = corpo as { mensagemId?: unknown; acao?: unknown };
  if (typeof mensagemId !== "string" || (acao !== "confirmar" && acao !== "descartar")) {
    return Response.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const supabase = await createClient();

  // tenant_id filtrado explicitamente, não só o id — RLS permite qualquer
  // tenant que o usuário tenha vínculo (plural), não só o tenant ativo.
  // Sem este filtro, uma proposta de OUTRA empresa do mesmo usuário (cartão
  // de ação que ficou na tela depois de trocar de empresa no topbar, já que
  // o painel do chat não é remontado nessa troca) seria confirmada aqui e
  // executada contra o tenant ATIVO — criaria/editaria lançamento na
  // empresa errada com o valor/categoria/pessoa da proposta de outra
  // empresa (achado real, 09/09/2026).
  const { data: msg } = await supabase
    .from("chat_mensagens")
    .select("id, papel, ferramenta_output, proposta_confirmada")
    .eq("id", mensagemId)
    .eq("tenant_id", contexto.tenantId)
    .maybeSingle();

  if (!msg || msg.papel !== "ferramenta" || !msg.ferramenta_output) {
    return Response.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  if (msg.proposta_confirmada !== null) {
    return Response.json({ erro: "Essa proposta já foi confirmada ou descartada antes." }, { status: 409 });
  }

  // Reivindicação atômica: o UPDATE só afeta a linha se proposta_confirmada
  // ainda for null (.is(...)) — o Postgres serializa dois UPDATEs
  // concorrentes na mesma linha, então só um dos dois de fato muda o valor
  // e volta com dado em `data`; o outro não encontra nenhuma linha pra
  // atualizar (proposta_confirmada já não é mais null quando ele roda) e
  // volta null. Sem isso, o check acima (linha 112) é só leitura — dois
  // cliques rápidos, ou duas abas, liam proposta_confirmada === null antes
  // de qualquer UPDATE acontecer e os dois disparavam a escrita financeira
  // de verdade (achado real, 09/09/2026: sem essa trava, "Confirmar"
  // clicado duas vezes cria o lançamento duas vezes).
  const valorReivindicado = acao === "confirmar";
  const { data: reivindicado } = await supabase
    .from("chat_mensagens")
    .update({ proposta_confirmada: valorReivindicado })
    .eq("id", mensagemId)
    .eq("tenant_id", contexto.tenantId)
    .is("proposta_confirmada", null)
    .select("id")
    .maybeSingle();

  if (!reivindicado) {
    return Response.json({ erro: "Essa proposta já foi confirmada ou descartada antes." }, { status: 409 });
  }

  if (acao === "descartar") {
    return Response.json({ sucesso: true });
  }

  const resultado = await executarProposta(msg.ferramenta_output, mensagemId);

  if ("erro" in resultado) {
    // Erro de validação (ex.: valor inválido) devolve proposta_confirmada
    // pra null — a pessoa pode corrigir e tentar de novo, o cartão não
    // morre por causa de um erro que a tela normal também mostraria e
    // deixaria tentar de novo. A reivindicação acima já bloqueou qualquer
    // tentativa concorrente enquanto isso executava.
    await supabase.from("chat_mensagens").update({ proposta_confirmada: null }).eq("id", mensagemId).eq("tenant_id", contexto.tenantId);
    return Response.json({ erro: resultado.erro }, { status: 400 });
  }

  return Response.json(resultado);
}
