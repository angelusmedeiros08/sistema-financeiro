import "server-only";
import type { Cliente } from "@/lib/relatorios/regime";
import type { ContextoChat } from "./tipos";
import { buscarEntidadesExistentes } from "@/lib/importacao/resolucao";
import { resolverCorrespondencia } from "@/lib/importacao/fuzzy";
import type { DefinicaoTool } from "./tools-leitura";

// Tools de proposta de ação — NENHUMA delas escreve no banco (Seção 3 da
// spec). Cada uma monta uma estrutura de proposta que a UI renderiza como
// cartão; a escrita real só acontece no clique de confirmar (Fatia 6),
// fora do loop do modelo, chamando a mesma server action que a tela normal
// usa. `tenantId` sempre vem de ContextoChat, nunca do input do modelo.

const JANELA_BUSCA_DIAS = 90;

function dataLimiteBusca(): string {
  const d = new Date();
  d.setDate(d.getDate() - JANELA_BUSCA_DIAS);
  return d.toISOString().slice(0, 10);
}

function textoObrigatorio(input: Record<string, unknown>, campo: string): string {
  const valor = input[campo];
  if (typeof valor !== "string" || !valor) throw new Error(`Parâmetro '${campo}' ausente ou inválido.`);
  return valor;
}
function numeroObrigatorio(input: Record<string, unknown>, campo: string): number {
  const valor = input[campo];
  if (typeof valor !== "number") throw new Error(`Parâmetro '${campo}' ausente ou inválido.`);
  return valor;
}

export const TOOLS_ACAO: DefinicaoTool[] = [
  {
    definicao: {
      name: "propor_criar_lancamento",
      description:
        "Monta uma PROPOSTA de criar um lançamento (receita ou despesa) — não cria nada de verdade, só monta um cartão que a pessoa precisa confirmar manualmente. Use quando a pessoa descrever algo que pagou ou recebeu.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["RECEITA", "DESPESA"] },
          descricao: { type: "string", description: "Descrição curta do lançamento." },
          valor: { type: "number", description: "Valor em reais, ex.: 50.00" },
          data: { type: "string", description: "Data no formato AAAA-MM-DD." },
          categoria_sugerida: { type: "string", description: "Nome da categoria, em texto livre — não precisa bater exatamente com um cadastro existente." },
          pessoa_sugerida: { type: "string", description: "Nome de quem pagou/recebeu, se identificável. Omitir se não houver." },
        },
        required: ["tipo", "descricao", "valor", "data", "categoria_sugerida"],
      },
    },
    executar: async (supabase: Cliente, input, ctx: ContextoChat) => {
      const tipo = input.tipo === "RECEITA" || input.tipo === "DESPESA" ? input.tipo : (() => { throw new Error("tipo inválido"); })();
      const entidades = await buscarEntidadesExistentes(supabase, ctx.tenantId);
      const categoriasDoTipo = entidades.categorias.filter((c) => c.tipo === tipo);

      const categoria = resolverCorrespondencia(textoObrigatorio(input, "categoria_sugerida"), categoriasDoTipo);
      const pessoaSugerida = typeof input.pessoa_sugerida === "string" ? input.pessoa_sugerida : null;
      const pessoa = pessoaSugerida ? resolverCorrespondencia(pessoaSugerida, entidades.pessoas) : null;

      return {
        acao: "criar_lancamento",
        tipo,
        descricao: textoObrigatorio(input, "descricao"),
        valor: numeroObrigatorio(input, "valor"),
        data: textoObrigatorio(input, "data"),
        categoria: { nome: categoria.correspondenciaNome ?? categoria.valorOriginal, id: categoria.correspondenciaId, categoriaNova: categoria.tipoCorrespondencia === "nenhuma" },
        pessoa: pessoa ? { nome: pessoa.correspondenciaNome ?? pessoa.valorOriginal, id: pessoa.correspondenciaId, pessoaNova: pessoa.tipoCorrespondencia === "nenhuma" } : null,
      };
    },
  },
  {
    definicao: {
      name: "propor_editar_lancamento",
      description:
        "Busca um lançamento existente por um termo de busca (ex.: 'Uber') e, se achar exatamente um, monta uma PROPOSTA de edição — não edita nada de verdade. Se achar mais de um candidato, devolve a lista pra você perguntar qual antes de propor.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          termo_busca: { type: "string", description: "Palavra-chave da descrição do lançamento a editar." },
          nova_descricao: { type: "string" },
          novo_valor: { type: "number" },
        },
        required: ["termo_busca"],
      },
    },
    executar: async (supabase: Cliente, input, ctx: ContextoChat) => {
      const termo = textoObrigatorio(input, "termo_busca");
      const { data } = await supabase
        .from("eventos_financeiros")
        .select("id, descricao, valor_total, data_competencia, tipo")
        .eq("tenant_id", ctx.tenantId)
        .is("estornado_em", null)
        .gte("data_competencia", dataLimiteBusca())
        .ilike("descricao", `%${termo}%`)
        .order("criado_em", { ascending: false })
        .limit(5);

      const candidatos = data ?? [];
      if (candidatos.length !== 1) {
        return { candidatos: candidatos.map((c) => ({ eventoId: c.id, descricao: c.descricao, valor: Number(c.valor_total), data: c.data_competencia, tipo: c.tipo })) };
      }

      const alvo = candidatos[0];
      return {
        acao: "editar_lancamento",
        eventoId: alvo.id,
        tipo: alvo.tipo,
        descricaoAtual: alvo.descricao,
        valorAtual: Number(alvo.valor_total),
        novaDescricao: typeof input.nova_descricao === "string" ? input.nova_descricao : alvo.descricao,
        novoValor: typeof input.novo_valor === "number" ? input.novo_valor : Number(alvo.valor_total),
      };
    },
  },
  {
    definicao: {
      name: "propor_cancelar_parcela",
      description:
        "Busca uma parcela em aberto por um termo de busca na descrição do lançamento e, se achar exatamente uma, monta uma PROPOSTA de cancelamento — não cancela nada de verdade. Se achar mais de uma, devolve a lista pra você perguntar qual.",
      strict: true,
      input_schema: {
        type: "object",
        properties: {
          termo_busca: { type: "string", description: "Palavra-chave da descrição do lançamento cuja parcela deve ser cancelada." },
          motivo: { type: "string", description: "Motivo do cancelamento." },
        },
        required: ["termo_busca", "motivo"],
      },
    },
    executar: async (supabase: Cliente, input, ctx: ContextoChat) => {
      const termo = textoObrigatorio(input, "termo_busca");
      // Só PENDENTE/ATRASADO são de fato canceláveis sem barrar no trigger
      // de "já tem baixa registrada" (QUITADO/RECEBIDO_PARCIAL têm baixa;
      // CANCELADO/RENEGOCIADO/PERDIDO são estados terminais) — filtrar aqui
      // evita propor cancelamento de algo que cancelarParcela recusaria
      // depois (achado testando ao vivo contra dado real, Fatia 5).
      const { data } = await supabase
        .from("parcelas")
        .select("id, valor, data_vencimento, status, eventos_financeiros!inner(descricao, tipo)")
        .eq("tenant_id", ctx.tenantId)
        .in("status", ["PENDENTE", "ATRASADO"])
        .gte("data_vencimento", dataLimiteBusca())
        .filter("eventos_financeiros.descricao", "ilike", `%${termo}%`)
        .limit(5);

      const candidatos = data ?? [];
      if (candidatos.length !== 1) {
        return {
          candidatos: candidatos.map((c) => ({ parcelaId: c.id, descricao: c.eventos_financeiros?.descricao, valor: Number(c.valor), vencimento: c.data_vencimento, status: c.status })),
        };
      }

      const alvo = candidatos[0];
      return {
        acao: "cancelar_parcela",
        parcelaId: alvo.id,
        descricao: alvo.eventos_financeiros?.descricao,
        valor: Number(alvo.valor),
        vencimento: alvo.data_vencimento,
        motivo: textoObrigatorio(input, "motivo"),
      };
    },
  },
];
