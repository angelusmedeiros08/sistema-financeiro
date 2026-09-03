import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Satoshi + Plus Jakarta Sans trocadas por Inter única (achado em varredura
// de design, 03/09/2026: o par anterior — mesma fundição da General Sans,
// popularizado por Fontshare/v0/Cursor — virou o "segundo clichê" depois
// do próprio Inter, reconhecível como kit de fonte de SaaS-starter).
// Referências premium (Linear, Attio) usam Inter puro — a diferenciação
// vem de peso/tracking/disciplina de escala, não de fonte exótica.
// `next/font/google` baixa e auto-hospeda em build, sem requisição de
// terceiro em runtime (mesma garantia que o setup local anterior tinha).
const fonteDisplay = Inter({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const fonteCorpo = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finanssi",
  description: "Finanssi — núcleo financeiro multi-tenant",
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
