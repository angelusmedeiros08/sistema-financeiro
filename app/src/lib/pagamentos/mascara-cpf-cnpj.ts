import { apenasDigitos } from "./cpf-cnpj";

// Máscara progressiva enquanto digita — decide CPF ou CNPJ pela quantidade
// de dígitos já digitados (>=12 vira CNPJ), igual ao formulário do próprio
// Asaas. Só formatação visual: validarCpfCnpj já aceita com ou sem máscara.
export function mascararCpfCnpj(valorAnterior: string): string {
  const digitos = apenasDigitos(valorAnterior).slice(0, 14);

  if (digitos.length <= 11) {
    return digitos
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
