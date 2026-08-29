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

// Categoria já foi resolvida por valor único na etapa Cadastros — aqui só se
// consulta o mapa, nunca se refaz a correspondência por linha.
function validarLinhaProduto(
  l: LinhaBrutaProduto,
  produtosExistentes: ProdutoExistente[],
  resolucaoCategoria: Map<string, ResolucaoEntidade>,
  primeiraLinhaPorCodigo: Map<string, number>,
  primeiraLinhaPorNomeNovo: Map<string, number>,
): LinhaValidadaProduto {
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

  // Duas linhas com o mesmo código/SKU na MESMA planilha nunca correspondem
  // entre si sozinhas (correspondência só olha pro que já existe no banco) —
  // sem essa checagem, as duas viram "criar novo" e nascem dois produtos com
  // o mesmo código. Mesmo padrão de "CPF/CNPJ repetido" em
  // lib/pessoas/importacao/validacao.ts.
  const codigoNormalizado = normalizarTexto(l.codigoReferencia);
  if (codigoNormalizado) {
    const primeiraLinha = primeiraLinhaPorCodigo.get(codigoNormalizado);
    if (primeiraLinha !== undefined && primeiraLinha !== l.linha) {
      erros.push(`Código repetido — já usado na linha ${primeiraLinha} desta mesma planilha.`);
    }
  }

  // Mesmo problema, mas pelo nome: duas linhas sem código e sem ninguém
  // cadastrado que bata com confiança (as duas iam "criar novo" de qualquer
  // jeito) nascem como dois produtos idênticos se ninguém avisar. Só entra
  // aqui quando a linha não tem código (código já cobriu o caso acima).
  if (!codigoNormalizado && (correspondencia.tipo === "nenhuma" || correspondencia.tipo === "fraca")) {
    const chaveNome = normalizarTexto(l.nome);
    const primeiraLinha = chaveNome ? primeiraLinhaPorNomeNovo.get(chaveNome) : undefined;
    if (primeiraLinha !== undefined && primeiraLinha !== l.linha) {
      erros.push(`Nome repetido — já usado na linha ${primeiraLinha} desta mesma planilha (nenhuma das duas bate com cadastro existente).`);
    }
  }

  const status: LinhaValidadaProduto["status"] = erros.length > 0 ? "erro" : avisos.length > 0 ? "precisa_confirmar" : "ok";

  return { ...l, tipoResolvido, precoVendaNumero, correspondencia, status, erros, avisos };
}

export function validarLinhasProduto(
  linhasBrutas: LinhaBrutaProduto[],
  produtosExistentes: ProdutoExistente[],
  resolucaoCategoria: Map<string, ResolucaoEntidade>,
): LinhaValidadaProduto[] {
  const primeiraLinhaPorCodigo = new Map<string, number>();
  for (const l of linhasBrutas) {
    const codigo = normalizarTexto(l.codigoReferencia);
    if (codigo && !primeiraLinhaPorCodigo.has(codigo)) primeiraLinhaPorCodigo.set(codigo, l.linha);
  }

  // Precisa da correspondência resolvida antes de comparar nomes entre
  // linhas — só interessa colisão entre linhas que não bateram em ninguém
  // já cadastrado (ver comentário em validarLinhaProduto).
  const primeiraLinhaPorNomeNovo = new Map<string, number>();
  for (const l of linhasBrutas) {
    if (normalizarTexto(l.codigoReferencia)) continue;
    const tipo = resolverCorrespondenciaProduto({ nome: l.nome, codigoReferencia: l.codigoReferencia }, produtosExistentes).tipo;
    if (tipo !== "nenhuma" && tipo !== "fraca") continue;
    const chave = normalizarTexto(l.nome);
    if (chave && !primeiraLinhaPorNomeNovo.has(chave)) primeiraLinhaPorNomeNovo.set(chave, l.linha);
  }

  return linhasBrutas.map((l) => validarLinhaProduto(l, produtosExistentes, resolucaoCategoria, primeiraLinhaPorCodigo, primeiraLinhaPorNomeNovo));
}
