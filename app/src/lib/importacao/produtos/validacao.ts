import { parseValorPlanilha, normalizarTexto } from "@/lib/importacao/locale-br";
import { resolverCorrespondenciaProduto, type ProdutoExistente } from "./correspondencia";
import type { LinhaBrutaProduto, LinhaValidadaProduto } from "./tipos";
import type { ResolucaoEntidade } from "@/lib/importacao/tipos";

// Aceita "produto"/"serviço"/"servico" (com/sem cedilha e acento — dado de
// planilha varia), case-insensitive. Qualquer outra coisa não resolve.
function resolverTipo(bruto: string): "PRODUTO" | "SERVICO" | null {
  const normalizado = normalizarTexto(bruto);
  if (normalizado === "produto") return "PRODUTO";
  if (normalizado === "servico") return "SERVICO";
  return null;
}

// Categoria já foi resolvida por valor único na etapa Cadastros (Fatia 4) —
// aqui só se consulta o mapa, nunca se refaz a correspondência por linha.
export function validarLinhasProduto(
  linhasBrutas: LinhaBrutaProduto[],
  produtosExistentes: ProdutoExistente[],
  resolucaoCategoria: Map<string, ResolucaoEntidade>,
): LinhaValidadaProduto[] {
  return linhasBrutas.map((l) => {
    const erros: string[] = [];
    const avisos: string[] = [];

    if (!l.nome.trim()) erros.push("Nome em branco.");

    const tipoResolvido = resolverTipo(l.tipo);
    if (!tipoResolvido) erros.push('Tipo precisa ser "Produto" ou "Serviço".');

    const precoVendaNumero = parseValorPlanilha(l.precoVenda, "BR");
    if (precoVendaNumero === null || precoVendaNumero < 0) erros.push("Preço de venda inválido.");

    const decisaoCategoria = l.categoria.trim() ? resolucaoCategoria.get(normalizarTexto(l.categoria)) : null;
    if (!l.categoria.trim()) erros.push("Categoria em branco.");
    else if (!decisaoCategoria) erros.push(`Categoria "${l.categoria}" não resolvida — volte à etapa Cadastros.`);

    const correspondencia = resolverCorrespondenciaProduto({ nome: l.nome, codigoReferencia: l.codigoReferencia }, produtosExistentes);
    if (correspondencia.tipo === "codigo_conflito") avisos.push("Código bate com o nome de um cadastro com código diferente — confira antes de decidir.");
    if (correspondencia.tipo === "aproximada") avisos.push(`Parece "${correspondencia.candidatos[0].nome}" — confirme antes de criar um produto novo.`);

    const status: LinhaValidadaProduto["status"] = erros.length > 0 ? "erro" : avisos.length > 0 ? "precisa_confirmar" : "ok";

    return { ...l, tipoResolvido, precoVendaNumero, correspondencia, status, erros, avisos };
  });
}
