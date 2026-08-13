import type { ValoresEndereco } from "@/components/formularios/campos-endereco";

export type EmpresaPorCnpj = {
  nome: string;
  email: string;
  telefone: string;
  endereco: ValoresEndereco;
  situacaoCadastral: string;
};

// BrasilAPI espelha o cadastro público da Receita (não existe API oficial
// da Receita pra consulta individual) — sem chave, chamada direto do
// navegador. Só funciona pra CNPJ (14 dígitos): não existe consulta
// pública de CPF, dado protegido por LGPD.
export async function buscarEmpresaPorCnpj(cnpjBruto: string): Promise<EmpresaPorCnpj | null> {
  const cnpj = cnpjBruto.replace(/\D/g, "");
  if (cnpj.length !== 14) return null;

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!resposta.ok) return null;

    const dados = await resposta.json();

    return {
      nome: dados.nome_fantasia || dados.razao_social || "",
      email: dados.email || "",
      telefone: dados.ddd_telefone_1 || "",
      endereco: {
        tipo: "COMERCIAL",
        cep: dados.cep || "",
        logradouro: dados.logradouro || "",
        numero: dados.numero || "",
        complemento: dados.complemento || "",
        bairro: dados.bairro || "",
        cidade: dados.municipio || "",
        uf: dados.uf || "",
      },
      situacaoCadastral: dados.descricao_situacao_cadastral || "",
    };
  } catch {
    return null;
  }
}
