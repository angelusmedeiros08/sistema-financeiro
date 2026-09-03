import { redirect } from "next/navigation";
import { GRUPOS_CONFIGURACOES } from "./grupos";

// Redireciona pro primeiro item (mesmo padrão de relatorios/page.tsx) — a
// navegação lateral (ver layout.tsx) já mostra todos os destinos o tempo
// todo, então uma página-índice separada em grade de cartões virou
// redundante (achado em varredura de design, 03/09/2026).
export default function PaginaConfiguracoes() {
  redirect(GRUPOS_CONFIGURACOES[0].itens[0].href);
}
