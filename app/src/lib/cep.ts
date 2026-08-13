export type EnderecoViaCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

// ViaCEP é uma API pública brasileira, sem chave/autenticação — chamada
// direto do navegador (client-side), sem precisar de rota própria no
// servidor. Usado em qualquer formulário do sistema que tenha campo de
// CEP, não só no cadastro de pessoas.
export async function buscarEnderecoPorCep(cepBruto: string): Promise<EnderecoViaCep | null> {
  const cep = cepBruto.replace(/\D/g, "");
  if (cep.length !== 8) return null;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    if (dados.erro) return null;

    return {
      logradouro: dados.logradouro ?? "",
      bairro: dados.bairro ?? "",
      cidade: dados.localidade ?? "",
      uf: dados.uf ?? "",
    };
  } catch {
    return null;
  }
}
