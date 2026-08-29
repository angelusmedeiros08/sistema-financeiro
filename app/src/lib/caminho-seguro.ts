// "next"/"voltar" vêm crus de parâmetro de URL (link de e-mail, querystring)
// — sem checagem, um destino externo vira open redirect. `startsWith("//")`
// sozinho não basta: pra esquemas especiais (http/https), o parser de URL
// dos navegadores trata "\" como equivalente a "/" ao resolver uma
// referência relativa, então "/\evil.com" também resolve pro host externo
// "evil.com" (achado em auditoria de segurança, 29/08/2026, explorado de
// verdade no link de convite de e-mail). Por isso barra QUALQUER barra
// invertida na string, não só o prefixo "//".
export function caminhoInternoSeguro(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  if (bruto.includes("\\")) return null;
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return null;
  return bruto;
}
