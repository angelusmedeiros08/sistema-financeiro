import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Fontes auto-hospedadas (não usamos Google Fonts CDN em runtime — nada de
// requisição de terceiro no carregamento da página). Satoshi não tem versão
// variável na Fontshare — 3 arquivos estáticos (500/700/900) cobrem os pesos
// que os títulos/KPIs realmente usam. Plus Jakarta Sans é variável
// (200–800), um único arquivo — só o subset "latin" (cobre todos os
// acentos do português: ã, ç, õ etc.).
const fonteDisplay = localFont({
  src: [
    { path: "./fonts/satoshi-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/satoshi-bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/satoshi-black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

const fonteCorpo = localFont({
  src: "./fonts/plus-jakarta-sans.woff2",
  variable: "--font-body",
  weight: "200 800",
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
      suppressHydrationWarning
      className={`${fonteDisplay.variable} ${fonteCorpo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
