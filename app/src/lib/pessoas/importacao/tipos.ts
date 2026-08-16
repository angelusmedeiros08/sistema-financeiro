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

export type TipoCorrespondencia = "exata_documento" | "exata_nome" | "aproximada" | "nenhuma";

export type CorrespondenciaPessoa = {
  pessoaId: string | null;
  nome: string | null;
  tipo: TipoCorrespondencia;
};

export type AcaoLinha = "criar" | "atualizar";

// Decisão do usuário por linha — null enquanto uma correspondência
// aproximada ainda não foi confirmada (Seção 6: "precisa confirmar").
export type DecisaoLinha = { acao: AcaoLinha; pessoaId: string | null } | null;

export type StatusLinha = "ok" | "precisa_confirmar" | "erro";

export type LinhaValidadaPessoa = LinhaBrutaPessoa & {
  perfisValidos: PerfilPessoa[];
  naturezaResolvida: NaturezaPessoa | null;
  correspondencia: CorrespondenciaPessoa;
  status: StatusLinha;
  erros: string[];
};
