import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
