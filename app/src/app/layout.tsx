import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes auto-hospedadas (não usamos Google Fonts CDN em runtime — nada de
// requisição de terceiro no carregamento da página). Cada arquivo é uma
// fonte variável completa (um único .woff2 cobre toda a faixa de peso).
const fonteDisplay = localFont({
  src: "./fonts/bricolage-grotesque.woff2",
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
});

const fonteCorpo = localFont({
  src: "./fonts/hanken-grotesk.woff2",
  variable: "--font-body",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema Financeiro",
  description: "Núcleo financeiro multi-tenant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fonteDisplay.variable} ${fonteCorpo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
