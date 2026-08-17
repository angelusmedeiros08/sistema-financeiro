import type { Database } from "@/utils/supabase/database.types";

type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];

// Colunas fixas do modelo + uma chave dinâmica por campo personalizado do
// tenant (`campo:<id>`) — o conjunto de colunas não é estático porque cada
// tenant define os próprios campos personalizados (Seção 3 da spec).
export type ColunaChaveFixa =
  | "nome"
  | "perfil"
  | "documento"
  | "natureza"
  | "email"
  | "telefone"
  | "endereco_cep"
  | "endereco_logradouro"
  | "endereco_numero"
  | "endereco_complemento"
  | "endereco_bairro"
  | "endereco_cidade"
  | "endereco_uf"
  | "contato_nome"
  | "contato_cargo"
  | "contato_email"
  | "contato_telefone";

export type ColunaChave = ColunaChaveFixa | `campo:${string}`;

export type LinhaBrutaPessoa = {
  linha: number; // 1-based contando o cabeçalho como linha 1
  nome: string;
  perfil: string;
  documento: string;
  natureza: string;
  email: string;
  telefone: string;
  enderecoCep: string;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUf: string;
  contatoNome: string;
  contatoCargo: string;
  contatoEmail: string;
  contatoTelefone: string;
  // campo_id -> valor bruto da célula
  camposPersonalizados: Record<string, string>;
};

// documento_conflito: nome bate com um cadastro, mas o documento informado
// na linha diverge do documento desse cadastro (ou o cadastro não tem
// documento) — pode ser a mesma pessoa com dado desatualizado, pode ser
// homônimo real. fraca: nome parecido abaixo do limiar de sugestão, só uma
// dica pra evitar duplicata por variação de grafia (nunca decide sozinho).
export type TipoCorrespondencia = "exata_documento" | "documento_conflito" | "exata_nome" | "aproximada" | "fraca" | "nenhuma";

// Entrada mínima que a resolução de correspondência precisa — deliberadamente
// menor que LinhaBrutaPessoa pra poder ser reaproveitada pelo import
// financeiro (que tem seu próprio formato de linha, só nome+documento importam).
export type EntradaCorrespondenciaPessoa = { nome: string; documento: string };

export type CandidatoPessoa = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
};

// candidatos sempre carrega todo mundo que bateu (não só o "melhor") — é
// isso que permite a tela avisar "tem mais de um" em vez de escolher
// silenciosamente o primeiro (Seção "Modelo de correspondência" da spec de
// homônimos). Só decide sozinho quando tipo === "exata_documento" e
// candidatos.length === 1.
export type CorrespondenciaPessoa = {
  tipo: TipoCorrespondencia;
  candidatos: CandidatoPessoa[];
};

export type AcaoLinha = "criar" | "atualizar";

// Decisão do usuário por linha — null enquanto uma correspondência que
// precisa de confirmação humana ainda não foi confirmada (Seção 6: "precisa
// confirmar").
export type DecisaoLinha = { acao: AcaoLinha; pessoaId: string | null } | null;

export type StatusLinha = "ok" | "precisa_confirmar" | "erro";

export type LinhaValidadaPessoa = LinhaBrutaPessoa & {
  perfisValidos: PerfilPessoa[];
  naturezaResolvida: NaturezaPessoa | null;
  correspondencia: CorrespondenciaPessoa;
  status: StatusLinha;
  erros: string[];
  // Não bloqueiam a linha (diferente de erros) — só chamam atenção antes de
  // confirmar, pro caso de conflito de documento ou correspondência fraca.
  avisos: string[];
};
