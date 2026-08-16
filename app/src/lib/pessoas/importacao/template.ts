import { normalizarTexto } from "@/lib/importacao/locale-br";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import type { ColunaChave, ColunaChaveFixa, LinhaBrutaPessoa } from "./tipos";

export const COLUNAS_TEMPLATE_FIXAS: { chave: ColunaChaveFixa; rotulo: string; obrigatoria: boolean; ajuda?: string }[] = [
  { chave: "nome", rotulo: "Nome", obrigatoria: true },
  { chave: "perfil", rotulo: "Perfil", obrigatoria: true, ajuda: "Cliente, Fornecedor ou Transportadora — mais de um separado por vírgula" },
  { chave: "documento", rotulo: "CPF/CNPJ", obrigatoria: false },
  { chave: "natureza", rotulo: "Natureza", obrigatoria: false, ajuda: "Física ou Jurídica — vazio infere pelo tamanho do documento" },
  { chave: "email", rotulo: "Email", obrigatoria: false },
  { chave: "telefone", rotulo: "Telefone", obrigatoria: false },
  { chave: "endereco_cep", rotulo: "CEP", obrigatoria: false },
  { chave: "endereco_logradouro", rotulo: "Logradouro", obrigatoria: false },
  { chave: "endereco_numero", rotulo: "Número", obrigatoria: false },
  { chave: "endereco_complemento", rotulo: "Complemento", obrigatoria: false },
  { chave: "endereco_bairro", rotulo: "Bairro", obrigatoria: false },
  { chave: "endereco_cidade", rotulo: "Cidade", obrigatoria: false },
  { chave: "endereco_uf", rotulo: "UF", obrigatoria: false },
  { chave: "contato_nome", rotulo: "Nome do contato", obrigatoria: false },
  { chave: "contato_cargo", rotulo: "Cargo do contato", obrigatoria: false },
  { chave: "contato_email", rotulo: "Email do contato", obrigatoria: false },
  { chave: "contato_telefone", rotulo: "Telefone do contato", obrigatoria: false },
];

export type ColunaTemplate = { chave: ColunaChave; rotulo: string; obrigatoria: boolean; ajuda?: string };

// Junta as colunas fixas com uma por campo personalizado do tenant — o
// modelo muda de tenant pra tenant porque campo personalizado é dinâmico
// (Seção 3 da spec).
export function montarColunasTemplate(camposPersonalizados: CampoPersonalizadoDefinicao[]): ColunaTemplate[] {
  const dinamicas: ColunaTemplate[] = camposPersonalizados.map((c) => ({
    chave: `campo:${c.id}` as const,
    rotulo: c.rotulo,
    obrigatoria: false,
  }));
  return [...COLUNAS_TEMPLATE_FIXAS, ...dinamicas];
}

export function gerarModeloCsv(camposPersonalizados: CampoPersonalizadoDefinicao[]): string {
  const colunas = montarColunasTemplate(camposPersonalizados);
  const cabecalho = colunas.map((c) => c.rotulo).join(";");
  const linhaExemplo = colunas
    .map((c) => {
      switch (c.chave) {
        case "nome":
          return "Cliente Exemplo";
        case "perfil":
          return "Cliente";
        case "documento":
          return "";
        case "email":
          return "contato@exemplo.com";
        default:
          return "";
      }
    })
    .join(";");
  return `${cabecalho}\n${linhaExemplo}\n`;
}

export function sugerirMapeamentoColunas(colunasArquivo: string[], colunasTemplate: ColunaTemplate[]): Partial<Record<ColunaChave, number>> {
  const normalizados = colunasArquivo.map(normalizarTexto);
  const mapeamento: Partial<Record<ColunaChave, number>> = {};

  for (const { chave, rotulo } of colunasTemplate) {
    const idx = normalizados.findIndex((c) => c === normalizarTexto(rotulo));
    if (idx >= 0) mapeamento[chave] = idx;
  }

  return mapeamento;
}

export function montarLinhasBrutas(
  linhasTexto: string[][],
  mapeamento: Partial<Record<ColunaChave, number>>,
  camposPersonalizados: CampoPersonalizadoDefinicao[],
): LinhaBrutaPessoa[] {
  const coluna = (celulas: string[], chave: ColunaChave) => {
    const idx = mapeamento[chave];
    return idx === undefined ? "" : (celulas[idx] ?? "").trim();
  };

  return linhasTexto.map((celulas, i) => {
    const camposValores: Record<string, string> = {};
    for (const campo of camposPersonalizados) {
      const valor = coluna(celulas, `campo:${campo.id}`);
      if (valor) camposValores[campo.id] = valor;
    }

    return {
      linha: i + 2,
      nome: coluna(celulas, "nome"),
      perfil: coluna(celulas, "perfil"),
      documento: coluna(celulas, "documento"),
      natureza: coluna(celulas, "natureza"),
      email: coluna(celulas, "email"),
      telefone: coluna(celulas, "telefone"),
      enderecoCep: coluna(celulas, "endereco_cep"),
      enderecoLogradouro: coluna(celulas, "endereco_logradouro"),
      enderecoNumero: coluna(celulas, "endereco_numero"),
      enderecoComplemento: coluna(celulas, "endereco_complemento"),
      enderecoBairro: coluna(celulas, "endereco_bairro"),
      enderecoCidade: coluna(celulas, "endereco_cidade"),
      enderecoUf: coluna(celulas, "endereco_uf"),
      contatoNome: coluna(celulas, "contato_nome"),
      contatoCargo: coluna(celulas, "contato_cargo"),
      contatoEmail: coluna(celulas, "contato_email"),
      contatoTelefone: coluna(celulas, "contato_telefone"),
      camposPersonalizados: camposValores,
    };
  });
}
