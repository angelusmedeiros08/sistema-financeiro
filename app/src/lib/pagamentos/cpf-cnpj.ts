// Validação por checksum real (dígito verificador), não só formato — CPF/CNPJ
// com dígitos certos mas checksum errado (ex. "111.111.111-11") passa fácil em
// qualquer regex de formato, e esse é exatamente o tipo de dado forjado que um
// endpoint público de criação de customer precisa rejeitar antes de gastar uma
// chamada à API do Asaas.

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function todosDigitosIguais(valor: string): boolean {
  return valor.split("").every((c) => c === valor[0]);
}

function calcularDigitoCpf(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function validarCpf(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11 || todosDigitosIguais(cpf)) return false;

  const digito1 = calcularDigitoCpf(cpf.slice(0, 9), 10);
  if (digito1 !== Number(cpf[9])) return false;

  const digito2 = calcularDigitoCpf(cpf.slice(0, 10), 11);
  if (digito2 !== Number(cpf[10])) return false;

  return true;
}

function calcularDigitoCnpj(base: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

const PESOS_CNPJ_DIGITO1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_DIGITO2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function validarCnpj(valor: string): boolean {
  const cnpj = apenasDigitos(valor);
  if (cnpj.length !== 14 || todosDigitosIguais(cnpj)) return false;

  const digito1 = calcularDigitoCnpj(cnpj.slice(0, 12), PESOS_CNPJ_DIGITO1);
  if (digito1 !== Number(cnpj[12])) return false;

  const digito2 = calcularDigitoCnpj(cnpj.slice(0, 13), PESOS_CNPJ_DIGITO2);
  if (digito2 !== Number(cnpj[13])) return false;

  return true;
}

// Aceita os dois formatos (com ou sem máscara) — decide pelo tamanho depois
// de limpar, igual o próprio Asaas faz no campo cpfCnpj do Checkout.
export function validarCpfCnpj(valor: string): boolean {
  const limpo = apenasDigitos(valor);
  if (limpo.length === 11) return validarCpf(limpo);
  if (limpo.length === 14) return validarCnpj(limpo);
  return false;
}
