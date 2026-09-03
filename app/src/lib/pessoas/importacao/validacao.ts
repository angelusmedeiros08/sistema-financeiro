import { normalizarTexto, parseDataPlanilha, parseValorPlanilha } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import { apenasDigitos, validarCpf, validarCnpj } from "@/lib/pagamentos/cpf-cnpj";
import { resolverCorrespondenciaPessoa, type PessoaExistente } from "./correspondencia";
import type { LinhaBrutaPessoa, LinhaValidadaPessoa, StatusLinha } from "./tipos";

type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];

// null = documento vazio (não valida nada); true/false = resultado real.
// Algoritmo de dígito verificador vem de lib/pagamentos/cpf-cnpj.ts — era
// reimplementado aqui do zero (achado em varredura de melhorias: risco de
// um bug de checksum ser corrigido num lugar e o outro ficar desatualizado).
function validarDocumento(bruto: string): boolean | null {
  const digitos = apenasDigitos(bruto);
  if (!digitos) return null;
  if (digitos.length === 11) return validarCpf(digitos);
  if (digitos.length === 14) return validarCnpj(digitos);
  return false;
}

function inferirNatureza(bruto: string, documento: string): NaturezaPessoa | null {
  if (bruto.trim()) {
    const normalizado = normalizarTexto(bruto);
    if (normalizado === "fisica") return "FISICA";
    if (normalizado === "juridica") return "JURIDICA";
    return null; // valor desconhecido — vira erro em validarLinhaPessoa
  }
  const digitos = apenasDigitos(documento);
  if (digitos.length === 11) return "FISICA";
  if (digitos.length === 14) return "JURIDICA";
  return null;
}

const ROTULO_PARA_PERFIL: Record<string, PerfilPessoa> = {
  cliente: "CLIENTE",
  fornecedor: "FORNECEDOR",
  transportadora: "TRANSPORTADORA",
};

function parsePerfis(bruto: string): PerfilPessoa[] | null {
  if (!bruto.trim()) return null;
  const partes = bruto
    .split(",")
    .map((p) => normalizarTexto(p))
    .filter(Boolean);
  const perfis: PerfilPessoa[] = [];
  for (const parte of partes) {
    const perfil = ROTULO_PARA_PERFIL[parte];
    if (!perfil) return null;
    if (!perfis.includes(perfil)) perfis.push(perfil);
  }
  return perfis.length > 0 ? perfis : null;
}

function validarCampoPersonalizado(valor: string, tipo: CampoPersonalizadoDefinicao["tipo"]): boolean {
  if (!valor.trim()) return true;
  switch (tipo) {
    case "TEXTO":
      return true;
    case "NUMERO":
      return parseValorPlanilha(valor, "BR") !== null;
    case "DATA":
      return parseDataPlanilha(valor, "BR") !== null;
    case "BOOLEANO": {
      const normalizado = normalizarTexto(valor);
      return ["sim", "nao", "true", "false", "1", "0"].includes(normalizado);
    }
    default:
      return true;
  }
}

export function validarLinhaPessoa(
  bruta: LinhaBrutaPessoa,
  existentes: PessoaExistente[],
  camposPersonalizados: CampoPersonalizadoDefinicao[],
  primeiraLinhaPorDocumento?: Map<string, number>,
  primeiraLinhaPorNomeNovo?: Map<string, number>,
): LinhaValidadaPessoa {
  const erros: string[] = [];

  if (!bruta.nome.trim()) erros.push("Nome não informado.");

  const perfisValidos = parsePerfis(bruta.perfil) ?? [];
  if (perfisValidos.length === 0) erros.push("Perfil não informado ou inválido (use Cliente, Fornecedor e/ou Transportadora).");

  const documentoValido = validarDocumento(bruta.documento);
  if (documentoValido === false) erros.push("CPF/CNPJ inválido (dígito verificador não bate).");

  // Duas linhas com o mesmo CPF/CNPJ na MESMA planilha nunca correspondem
  // entre si sozinhas (a correspondência só olha pro que já existe no
  // banco) — sem essa checagem, ambas viram "criar nova" e nascem dois
  // cadastros com o mesmo documento.
  const digitosDocumento = apenasDigitos(bruta.documento);
  if (digitosDocumento && primeiraLinhaPorDocumento) {
    const primeiraLinha = primeiraLinhaPorDocumento.get(digitosDocumento);
    if (primeiraLinha !== undefined && primeiraLinha !== bruta.linha) {
      erros.push(`CPF/CNPJ repetido — já usado na linha ${primeiraLinha} desta mesma planilha.`);
    }
  }

  const naturezaResolvida = inferirNatureza(bruta.natureza, bruta.documento);
  if (bruta.natureza.trim() && naturezaResolvida === null) erros.push("Natureza inválida (use Física ou Jurídica).");

  if (bruta.email.trim() && !bruta.email.includes("@")) erros.push("Email da pessoa inválido.");
  if (bruta.contatoEmail.trim() && !bruta.contatoEmail.includes("@")) erros.push("Email do contato inválido.");

  for (const campo of camposPersonalizados) {
    const valor = bruta.camposPersonalizados[campo.id];
    if (valor && !validarCampoPersonalizado(valor, campo.tipo)) {
      erros.push(`Campo "${campo.rotulo}" com valor inválido pro tipo ${campo.tipo.toLowerCase()}.`);
    }
  }

  const correspondencia = resolverCorrespondenciaPessoa(bruta, existentes);

  // Mesmo problema do documento repetido, mas pelo nome: duas linhas sem
  // ninguém cadastrado que bata com confiança (as duas iam "criar nova" de
  // qualquer jeito) nascem como dois cadastros idênticos se ninguém avisar.
  // Inclui "fraca" além de "nenhuma" — dica fraca também é, no fundo, "não
  // achou ninguém com confiança". Linhas que já apontam pra alguém existente
  // (mesmo que precisando confirmar) podem legitimamente compartilhar nome.
  if ((correspondencia.tipo === "nenhuma" || correspondencia.tipo === "fraca") && primeiraLinhaPorNomeNovo) {
    const chaveNome = normalizarTexto(bruta.nome);
    const primeiraLinha = chaveNome ? primeiraLinhaPorNomeNovo.get(chaveNome) : undefined;
    if (primeiraLinha !== undefined && primeiraLinha !== bruta.linha) {
      erros.push(`Nome repetido — já usado na linha ${primeiraLinha} desta mesma planilha (nenhuma das duas bate com cadastro existente).`);
    }
  }

  const avisos: string[] = [];
  const decideSozinho = correspondencia.tipo === "exata_documento" && correspondencia.candidatos.length === 1;
  let status: StatusLinha = "ok";
  if (erros.length > 0) {
    status = "erro";
  } else if (correspondencia.tipo === "exata_documento" && !decideSozinho) {
    status = "precisa_confirmar";
    avisos.push(`Documento encontrado em mais de um cadastro (${correspondencia.candidatos.map((c) => c.nome).join(", ")}) — escolha qual é.`);
  } else if (correspondencia.tipo === "documento_conflito") {
    status = "precisa_confirmar";
    const candidato = correspondencia.candidatos[0];
    avisos.push(
      `Nome bate com "${candidato.nome}", mas o documento informado é diferente do cadastrado${candidato.documento ? ` (${candidato.documento})` : " (cadastro sem documento)"} — confirme se é a mesma pessoa.`,
    );
  } else if (correspondencia.tipo === "exata_nome") {
    status = "precisa_confirmar";
    avisos.push(
      correspondencia.candidatos.length > 1
        ? `Mais de um cadastro com esse nome — escolha qual é.`
        : `Mesmo nome de um cadastro existente, sem documento pra confirmar — escolha se é a mesma pessoa ou crie um cadastro novo.`,
    );
  } else if (correspondencia.tipo === "aproximada") {
    status = "precisa_confirmar";
  } else if (correspondencia.tipo === "fraca") {
    avisos.push(`Pode ser "${correspondencia.candidatos[0].nome}" (nome parecido) — confira antes de criar um cadastro novo.`);
  }

  return { ...bruta, perfisValidos, naturezaResolvida, correspondencia, status, erros, avisos };
}

export function validarLinhasPessoa(
  brutas: LinhaBrutaPessoa[],
  existentes: PessoaExistente[],
  camposPersonalizados: CampoPersonalizadoDefinicao[],
): LinhaValidadaPessoa[] {
  const primeiraLinhaPorDocumento = new Map<string, number>();
  for (const b of brutas) {
    const digitos = apenasDigitos(b.documento);
    if (digitos && !primeiraLinhaPorDocumento.has(digitos)) primeiraLinhaPorDocumento.set(digitos, b.linha);
  }

  // Precisa da correspondência resolvida antes de comparar nomes entre
  // linhas — só interessa colisão entre linhas que não bateram em ninguém
  // já cadastrado (ver comentário em validarLinhaPessoa).
  const primeiraLinhaPorNomeNovo = new Map<string, number>();
  for (const b of brutas) {
    const tipo = resolverCorrespondenciaPessoa(b, existentes).tipo;
    if (tipo !== "nenhuma" && tipo !== "fraca") continue;
    const chave = normalizarTexto(b.nome);
    if (chave && !primeiraLinhaPorNomeNovo.has(chave)) primeiraLinhaPorNomeNovo.set(chave, b.linha);
  }

  return brutas.map((b) => validarLinhaPessoa(b, existentes, camposPersonalizados, primeiraLinhaPorDocumento, primeiraLinhaPorNomeNovo));
}
