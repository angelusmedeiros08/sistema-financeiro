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

async function executarProposta(proposta: unknown): Promise<{ erro: string } | { sucesso: true; mensagem: string }> {
  if (!proposta || typeof proposta !== "object" || !("acao" in proposta)) return { erro: "Proposta inválida." };
  const p = proposta as { acao: string };

  if (p.acao === "criar_lancamento") {
    const c = proposta as PropostaCriarLancamento;
    const fd = new FormData();
    fd.set("descricao", c.descricao);
    fd.set("valor", valorParaFormData(c.valor));
    fd.set("data_vencimento", c.data);
    fd.set("numero_parcelas", "1");
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

  // RLS garante que só volta a linha se pertencer ao próprio usuário/tenant
  // — sem isso, um mensagemId de outra conversa simplesmente não aparece.
  const { data: msg } = await supabase.from("chat_mensagens").select("id, papel, ferramenta_output, proposta_confirmada").eq("id", mensagemId).maybeSingle();

  if (!msg || msg.papel !== "ferramenta" || !msg.ferramenta_output) {
    return Response.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  if (msg.proposta_confirmada !== null) {
    return Response.json({ erro: "Essa proposta já foi confirmada ou descartada antes." }, { status: 409 });
  }

  if (acao === "descartar") {
    await supabase.from("chat_mensagens").update({ proposta_confirmada: false }).eq("id", mensagemId);
    return Response.json({ sucesso: true });
  }

  const resultado = await executarProposta(msg.ferramenta_output);

  if ("erro" in resultado) {
    // Erro de validação (ex.: valor inválido) fica com proposta_confirmada
    // ainda null de propósito — a pessoa pode corrigir e tentar de novo, o
    // cartão não morre por causa de um erro que a tela normal também
    // mostraria e deixaria tentar de novo.
    return Response.json({ erro: resultado.erro }, { status: 400 });
  }

  await supabase.from("chat_mensagens").update({ proposta_confirmada: true }).eq("id", mensagemId);
  return Response.json(resultado);
}
