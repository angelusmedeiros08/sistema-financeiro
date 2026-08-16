import { normalizarTexto, parseDataPlanilha } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import { resolverCorrespondenciaPessoa, type PessoaExistente } from "./correspondencia";
import type { LinhaBrutaPessoa, LinhaValidadaPessoa, StatusLinha } from "./tipos";

type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];

function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// Algoritmo padrão de dígito verificador — pega erro de digitação sem
// depender de nenhuma constraint no banco (não existe uma pra documento).
function validarCpf(digitos: string): boolean {
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const calcularDigito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcularDigito(digitos.slice(0, 9), 10);
  const d2 = calcularDigito(digitos.slice(0, 10), 11);
  return d1 === Number(digitos[9]) && d2 === Number(digitos[10]);
}

function validarCnpj(digitos: string): boolean {
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcularDigito = (base: string, pesos: number[]) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcularDigito(digitos.slice(0, 12), pesos1);
  const d2 = calcularDigito(digitos.slice(0, 13), pesos2);
  return d1 === Number(digitos[12]) && d2 === Number(digitos[13]);
}

// null = documento vazio (não valida nada); true/false = resultado real.
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
      return Number.isFinite(Number(valor.replace(",", ".")));
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
): LinhaValidadaPessoa {
  const erros: string[] = [];

  if (!bruta.nome.trim()) erros.push("Nome não informado.");

  const perfisValidos = parsePerfis(bruta.perfil) ?? [];
  if (perfisValidos.length === 0) erros.push("Perfil não informado ou inválido (use Cliente, Fornecedor e/ou Transportadora).");

  const documentoValido = validarDocumento(bruta.documento);
  if (documentoValido === false) erros.push("CPF/CNPJ inválido (dígito verificador não bate).");

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

  let status: StatusLinha = "ok";
  if (erros.length > 0) status = "erro";
  else if (correspondencia.tipo === "aproximada") status = "precisa_confirmar";

  return { ...bruta, perfisValidos, naturezaResolvida, correspondencia, status, erros };
}

export function validarLinhasPessoa(
  brutas: LinhaBrutaPessoa[],
  existentes: PessoaExistente[],
  camposPersonalizados: CampoPersonalizadoDefinicao[],
): LinhaValidadaPessoa[] {
  return brutas.map((b) => validarLinhaPessoa(b, existentes, camposPersonalizados));
}
