# Orçamento diário de IA por custo real (não por contagem de mensagem)

## Contexto

O limite de uso de IA hoje (`lib/chat-ia/rate-limit.ts`,
`lib/importacao/rate-limit-ia.ts`, ambos sobre a fábrica
`lib/ia/limitador-uso-diario.ts`) conta **tentativas**, não custo: 15
mensagens/dia no Chat IA, 10 usos/dia na Importação, cada tentativa vale
"1" independente do tamanho. Achado do usuário (09/09/2026): isso não é
preciso nem justo — um "oi" e uma mensagem de 8.000 caracteres (o teto
já existente por mensagem) consomem a mesma fatia da cota, mesmo custando
ordens de grandeza diferentes de verdade.

Decisão do usuário: manter a proteção de margem em **R$30/mês por
tenant**, mas trocar o critério de contagem de mensagem pra **custo real
em token**, dividido numa cota diária (R$30 ÷ 30 = ~R$1/dia), com Chat IA
e Importação com IA **compartilhando o mesmo orçamento** (não dois tetos
separados). O valor em si mostrado no indicador já existente não muda de
forma (continua uma porcentagem) — só o que ela mede.

Fora de escopo desta leva, mencionado pelo usuário como direção futura,
não decisão de agora: sistema de créditos, ou upgrade de plano pra mais
uso de IA — fica pra quando a capitalização do negócio permitir pensar
nisso.

## Cálculo de custo real

A API da Anthropic devolve `usage` (tokens de entrada, saída, escrita de
cache, leitura de cache) em toda resposta — `stream.finalMessage()` no
Chat IA, `client.messages.parse()` na Importação. Módulo novo,
`lib/ia/precos-anthropic.ts`:

```ts
// Sonnet 5 (claude-sonnet-5), por milhão de tokens — mesmos valores já
// usados nos comentários de custo desta sessão (confirmados pelo usuário
// via print da própria Anthropic).
const PRECO_ENTRADA_USD_POR_MTOK = 2;
const PRECO_SAIDA_USD_POR_MTOK = 10;
const PRECO_CACHE_ESCRITA_USD_POR_MTOK = 2.5;
const PRECO_CACHE_LEITURA_USD_POR_MTOK = 0.2;

export function calcularCustoUsd(usage: Anthropic.Usage): number {
  return (
    (usage.input_tokens * PRECO_ENTRADA_USD_POR_MTOK +
      usage.output_tokens * PRECO_SAIDA_USD_POR_MTOK +
      (usage.cache_creation_input_tokens ?? 0) * PRECO_CACHE_ESCRITA_USD_POR_MTOK +
      (usage.cache_read_input_tokens ?? 0) * PRECO_CACHE_LEITURA_USD_POR_MTOK) /
    1_000_000
  );
}
```

Preço fica só neste arquivo — se o modelo mudar (Sonnet 6, outro
provedor) ou a Anthropic reajustar preço, é o único lugar a atualizar.

## Orçamento diário combinado

Novo módulo `lib/ia/orcamento-diario.ts`, substitui
`limitador-uso-diario.ts` (esse fica sem uso depois desta migração —
apagar, não deixar código morto).

```ts
// R$30/mês (decisão do usuário, 10/09/2026) ÷ 30 dias, convertido em
// dólar pela cotação de referência do momento (~R$5,10/US$1, 10/09/2026 —
// aproximação documentada, revisar se o câmbio se mover muito;
// arredondado pra cima, US$0,196 → US$0,20, levemente mais generoso que
// R$1,00 exato).
export const TETO_DIARIO_IA_USD = 0.2;

// Checagem PRÉVIA — só lê, nunca escreve. Diferente do mecanismo antigo
// (que incrementava contagem antes da chamada), aqui não dá pra saber o
// custo de uma chamada antes dela acontecer, então a única coisa que dá
// pra checar de antemão é se o tenant JÁ estourou o orçamento com
// chamadas anteriores.
export async function verificarOrcamentoDiario(tenantId: string): Promise<{ permitido: boolean; usadoUsd: number; limiteUsd: number }> { ... }

// Registro PÓS-chamada — sempre grava o custo real, mesmo que isso
// estoure o orçamento (a chamada já aconteceu e já foi paga pra Anthropic
// nesse momento; não tem como "não cobrar" depois). Mesma filosofia de
// "sempre registrar, mesmo negando" que todo rate-limit deste projeto já
// segue, adaptada: aqui o que sempre acontece é o registro do gasto real,
// o "negar" é ANTES, não depois.
export async function registrarCustoIA(params: { tenantId: string; usuarioId: string; recurso: "chat" | "importacao"; custoUsd: number }): Promise<void> { ... }
```

Tabela nova, substitui `tentativas_chat_ia`/`tentativas_importacao_ia`
(apagadas nesta migração — nada mais as referencia depois da troca):

```sql
create table uso_ia (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  usuario_id uuid not null references usuarios(id),
  recurso text not null check (recurso in ('chat', 'importacao')),
  custo_usd numeric not null,
  criado_em timestamptz not null default now()
);
```

RLS habilitada, sem nenhuma policy — mesmo padrão das tabelas que
substitui (só `service_role` lê/escreve). `verificarOrcamentoDiario`
soma `custo_usd` de **ambos** os recursos juntos (`SUM(custo_usd) WHERE
tenant_id = X AND criado_em > now() - 24h`, sem filtrar `recurso`) — é
isso que implementa o orçamento combinado.

## Onde entra em cada fluxo

**Chat IA** (`lib/chat-ia/loop.ts` + `api/chat/route.ts`):
- `route.ts` troca `registrarTentativaChatIA` (que bloqueava E já contava
  de antemão) por `verificarOrcamentoDiario` antes de montar o stream —
  só checa, não registra nada ainda.
- `loop.ts` acumula `usage` de cada iteração do loop (pode ser até 8
  chamadas por turno) e devolve o total pro chamador junto do resultado,
  em vez de só `textoFinal`/`mensagens`/`ferramentasExecutadas`.
- `route.ts`, depois que o loop termina (sucesso ou erro — mesmo uma
  chamada que falhou no meio pode ter gasto token nas iterações
  anteriores), chama `registrarCustoIA` com o total acumulado.
- O evento SSE `{tipo: "uso", ...}` que a UI já consome passa a carregar
  `usadoUsd`/`limiteUsd` (ou já convertido pra porcentagem) em vez de
  contagem de mensagem — `chat-painel.tsx` não muda de estrutura visual,
  só o que os números significam.

**Importação com IA** (`lib/importacao/extracao-ia.ts` +
`app/(app)/importacao/ia/actions.ts`): mesmo padrão — `actions.ts` troca
`registrarTentativaImportacaoIA` por `verificarOrcamentoDiario` (mesma
função do Chat IA, é o MESMO orçamento) antes de chamar
`extrairLancamentosIA`; `extracao-ia.ts` devolve o `usage` da resposta
junto do resultado; `actions.ts` chama `registrarCustoIA` com
`recurso: "importacao"` depois.

## UI

Os dois indicadores já construídos (`IndicadorUsoChatIA` dentro do painel
de Chat IA, `IndicadorUsoImportacaoIA` na tela de Importação) continuam
mostrando uma porcentagem — não
precisam de redesenho. A mudança real: como o orçamento agora é
**compartilhado**, usar a Importação também move o ponteiro do indicador
do Chat IA, e vice-versa. Vale um texto pequeno deixando isso explícito
(“inclui Chat IA + Importação”) pra não parecer bug quando o tenant usar
os dois e notar os dois indicadores mudando juntos.

## Precisão aceita, não escondida

Uma chamada que começa quando o tenant está a poucos centavos do teto
ainda é permitida e é cobrada por inteiro — não tem como saber o custo
exato antes da resposta voltar. O teto para chamadas **futuras**, não
corta uma chamada no meio. Mesmo comportamento de qualquer sistema de
orçamento por uso (nuvem, telefonia), não é bug.
