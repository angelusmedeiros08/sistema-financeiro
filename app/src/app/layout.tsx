import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Fontes auto-hospedadas (não usamos Google Fonts CDN em runtime — nada de
// requisição de terceiro no carregamento da página). Cabinet Grotesk não
// tem versão variável na Fontshare — 3 arquivos estáticos (500/700/900)
// cobrem os pesos que os títulos/KPIs realmente usam. Public Sans é
// variável (100–900), um único arquivo — só o subset "latin" (inclui
// Latin-1 Supplement, cobre todos os acentos do português: ã, ç, õ etc.).
const fonteDisplay = localFont({
  src: [
    { path: "./fonts/cabinet-grotesk-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cabinet-grotesk-bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/cabinet-grotesk-black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

const fonteCorpo = localFont({
  src: "./fonts/public-sans.woff2",
  variable: "--font-body",
  weight: "100 900",
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
