import { toast } from "sonner";

export type ResultadoComFeedback = { erro: string } | { sucesso: true };

// Disparado logo depois de `await` numa server action que segue o formato
// { erro } | { sucesso: true } — a convenção de retorno da esmagadora
// maioria das actions do sistema. `undefined` cobre o caso de ações que
// redirecionam no sucesso (a Promise nunca resolve pro cliente, a
// navegação já aconteceu antes) — nesse caso não há nada a fazer aqui,
// chegar na tela nova já é a confirmação (spec Seção 4).
export function notificarResultado(resultado: ResultadoComFeedback | undefined, mensagemSucesso: string): void {
  if (!resultado) return;
  if ("erro" in resultado) {
    toast.error(resultado.erro);
    return;
  }
  toast.success(mensagemSucesso);
}
