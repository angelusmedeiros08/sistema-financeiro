// Todo e-mail transacional monta o corpo por template string, sem escape —
// campos de texto livre do próprio usuário (nome do tenant, nome de pessoa,
// descrição de lançamento) entravam direto no HTML, permitindo injetar link/
// imagem de phishing num e-mail que sai com SPF/DKIM legítimos do domínio
// (achado em auditoria de segurança, 29/08/2026). Nenhum desses campos
// precisa de HTML de propósito, então escapar entidades basta — não precisa
// de DOMPurify.
export function escaparHtml(bruto: string): string {
  return bruto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
