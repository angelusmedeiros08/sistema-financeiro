export type PapelMensagem = "usuario" | "assistente" | "ferramenta";

export type Conversa = {
  id: string;
  titulo: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type MensagemChat = {
  id: string;
  conversaId: string;
  papel: PapelMensagem;
  conteudo: string | null;
  ferramentaNome: string | null;
  ferramentaInput: unknown;
  ferramentaOutput: unknown;
  propostaConfirmada: boolean | null;
  criadoEm: string;
};

// Contexto sempre resolvido pelo servidor a partir da sessão autenticada —
// nunca um campo que o modelo preenche ou que vem cru do corpo da
// requisição (Seção 5 da spec: tenant_id nunca é parâmetro de tool).
export type ContextoChat = {
  tenantId: string;
  usuarioId: string;
};
