import "server-only";

// Sonnet 5 (claude-sonnet-5), por milhão de tokens — mesmos valores já
// usados nos comentários de custo desta sessão (confirmados pelo usuário
// via print da própria página de preços da Anthropic, 08/09/2026). Se o
// modelo mudar (Sonnet 6, outro provedor) ou a Anthropic reajustar preço,
// é o único lugar a atualizar — lib/ia/orcamento-ia.ts nunca conhece o
// valor em si, só chama calcularCustoUsd.
const PRECO_ENTRADA_USD_POR_MTOK = 2;
const PRECO_SAIDA_USD_POR_MTOK = 10;
const PRECO_CACHE_ESCRITA_USD_POR_MTOK = 2.5;
const PRECO_CACHE_LEITURA_USD_POR_MTOK = 0.2;

// Só os 4 campos que entram na conta — não o Anthropic.Usage inteiro do
// SDK (que carrega vários outros campos irrelevantes aqui, tipo
// service_tier/server_tool_use). loop.ts e extracao-ia.ts extraem esses 4
// da resposta de verdade da API; os `?? 0` deles cobrem o `null` que o
// SDK devolve quando o request não usa cache_control nenhum.
export type UsageParaCusto = { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number };

export function calcularCustoUsd(usage: UsageParaCusto): number {
  return (
    (usage.input_tokens * PRECO_ENTRADA_USD_POR_MTOK +
      usage.output_tokens * PRECO_SAIDA_USD_POR_MTOK +
      usage.cache_creation_input_tokens * PRECO_CACHE_ESCRITA_USD_POR_MTOK +
      usage.cache_read_input_tokens * PRECO_CACHE_LEITURA_USD_POR_MTOK) /
    1_000_000
  );
}
