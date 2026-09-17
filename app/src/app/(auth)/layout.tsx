// Todo o grupo (auth) — login, cadastro, checkout, convite, recuperação de
// senha — é sempre claro. Claro/escuro é preferência de quem já usa o
// sistema por dentro (ver theme-toggle.tsx no topbar), não faz sentido
// pedir essa decisão antes da pessoa nem ter entrado. .tema-claro-forcado
// (globals.css) reaplica os tokens claros mesmo que o navegador já tenha
// "escuro" salvo de uma sessão anterior dentro do app.
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return <div className="tema-claro-forcado">{children}</div>;
}
