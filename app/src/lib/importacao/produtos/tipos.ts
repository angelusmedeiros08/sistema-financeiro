// Linha bruta ainda em texto — LinhaBruta (lib/importacao/tipos.ts) é sobre
// data/valor de lançamento financeiro, não serve pra um cadastro de
// produto. Mesmo espírito de LinhaBrutaPessoa (lib/pessoas/importacao/tipos.ts),
// adaptado pros campos de produtos_servicos.
export type LinhaBrutaProduto = {
  linha: number; // 1-based contando o cabeçalho como linha 1
  nome: string;
  tipo: string;
  descricao: string;
  precoVenda: string;
  categoria: string;
  unidadeMedida: string;
  codigoReferencia: string;
};

// exata_codigo: código/SKU da linha bate com exatamente 1 cadastro — decide
// sozinho. codigo_conflito: código bate com 2+ cadastros (dado sujo) — nunca
// decide sozinho. exata_nome: nome idêntico, sem código pra desempatar.
// aproximada/fraca: nome parecido, acima/abaixo do limiar de sugestão — só
// fraca nunca pré-seleciona. Mesmo modelo de TipoCorrespondencia de pessoa.
export type TipoCorrespondenciaProduto = "exata_codigo" | "codigo_conflito" | "exata_nome" | "aproximada" | "fraca" | "nenhuma";

export type CandidatoProduto = {
  id: string;
  nome: string;
  codigoReferencia: string | null;
  precoVenda: number;
  tipo: "PRODUTO" | "SERVICO";
};

// candidatos sempre carrega todo mundo que bateu, nunca só o "melhor" — é
// isso que permite avisar "tem mais de um" em vez de escolher em silêncio.
export type CorrespondenciaProduto = { tipo: TipoCorrespondenciaProduto; candidatos: CandidatoProduto[] };

export type DecisaoLinhaProduto = { acao: "criar" | "atualizar"; produtoId: string | null } | null;

export type StatusLinhaProduto = "ok" | "precisa_confirmar" | "erro";

export type LinhaValidadaProduto = LinhaBrutaProduto & {
  tipoResolvido: "PRODUTO" | "SERVICO" | null;
  precoVendaNumero: number | null;
  correspondencia: CorrespondenciaProduto;
  status: StatusLinhaProduto;
  erros: string[];
  // Não bloqueia a linha (diferente de erro) — só chama atenção antes de
  // confirmar (ex.: código em conflito, correspondência fraca).
  avisos: string[];
};
