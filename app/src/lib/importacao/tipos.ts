export type ColunaChave =
  | "data_competencia"
  | "valor"
  | "categoria"
  | "descricao"
  | "data_vencimento"
  | "data_pagamento"
  | "pessoa"
  | "documento_pessoa"
  | "centro_custo"
  | "forma_pagamento";

export type TipoEntidadeImportacao = "categoria" | "centro_custo" | "pessoa" | "forma_pagamento";

// Uma linha da planilha já com as colunas mapeadas pros nossos campos, mas
// ainda em texto bruto — parseLinhas() (validacao.ts) é quem interpreta
// valor/data conforme o formato escolhido e produz LinhaValidada.
export type LinhaBruta = {
  linha: number; // 1-based contando o cabeçalho como linha 1, pra mensagem de erro bater com o que o usuário vê no Excel
  importKey: string;
  dataCompetencia: string;
  valor: string;
  categoria: string;
  descricao: string;
  dataVencimento: string;
  dataPagamento: string;
  pessoa: string;
  documentoPessoa: string;
  centroCusto: string;
  formaPagamento: string;
};

export type StatusLinha = "ok" | "aviso" | "erro";

export type LinhaValidada = LinhaBruta & {
  dataCompetenciaIso: string | null;
  valorNumero: number | null;
  dataVencimentoIso: string | null;
  dataPagamentoIso: string | null;
  status: StatusLinha;
  erros: string[];
  avisos: string[];
};

export type EntidadeExistente = { id: string; nome: string };

export type CorrespondenciaEntidade = {
  valorOriginal: string;
  correspondenciaId: string | null;
  correspondenciaNome: string | null;
  tipoCorrespondencia: "exata" | "aproximada" | "nenhuma";
};

// Decisão do usuário na tela de revisão de entidades, uma por valor único
// encontrado no arquivo — sempre uma das duas (Seção 6 da spec: usar uma
// correspondência existente, sugerida ou escolhida manualmente, ou criar um
// registro novo). null enquanto o usuário ainda não decidiu.
export type ResolucaoEntidade = {
  valorOriginal: string;
  acao: "usar_existente" | "criar_novo";
  entidadeId: string | null; // preenchido quando acao = usar_existente
  tipoCategoriaNova?: "RECEITA" | "DESPESA"; // só relevante pra categoria nova
} | null;
