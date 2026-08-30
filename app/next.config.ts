import type { NextConfig } from "next";

// Cabeçalhos HTTP de segurança (achado em auditoria, 30/08/2026): o projeto
// não tinha nenhum — nem o básico de X-Frame-Options/nosniff. CSP fica
// deliberadamente sem `script-src` restrito por ora (exigiria nonce em todo
// script inline do Next.js — mudança maior, arriscada de fazer sem testar
// cada página) — `frame-ancestors 'self'` já cobre o principal (clickjacking),
// mesmo papel do X-Frame-Options abaixo, só que reconhecido por mais navegadores.
const HEADERS_SEGURANCA = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  // Some o header X-Powered-By: Next.js (achado em auditoria) — vaza a
  // presença/versão do framework sem necessidade nenhuma.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: HEADERS_SEGURANCA }];
  },
  experimental: {
    // Importação financeira/Pessoas agora manda o lote inteiro (até 500
    // linhas) numa única Server Action, em vez de uma chamada por linha —
    // o padrão de 1MB do Next.js podia não sobrar pra um arquivo grande
    // com descrição/endereço/contato longos em cada linha (achado em
    // revisão de código; ver spec 2026-08-26-importacao-execucao-servidor).
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
