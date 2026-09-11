import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { hashEstavel } from "./validacao";
import { ASSINATURAS } from "@/lib/contabil/anexos";
import type { UsageParaCusto } from "@/lib/ia/precos-anthropic";
import type { LinhaBrutaIA } from "./tipos";

// Mesma defesa em profundidade de lib/contabil/anexos.ts: o media_type
// declarado pela chamada (imagemMediaType) é só o que o cliente escolheu
// mandar — a action 'use server' que expõe esta função aceita esse campo
// de qualquer chamador autenticado, não só do formulário com o preview em
// <canvas> que sempre gera JPEG de verdade. Sem checar os bytes de
// verdade, um base64 arbitrário rotulado "image/png" seguiria direto pra
// API da Anthropic (achado real, 09/09/2026).
function conteudoBateComMediaType(base64: string, mediaType: string): boolean {
  const verificar = ASSINATURAS[mediaType];
  if (!verificar) return false;
  try {
    const cabecalho = Buffer.from(base64.slice(0, 24), "base64");
    return verificar(new Uint8Array(cabecalho));
  } catch {
    return false;
  }
}

const CAMPOS_LINHA_BRUTA = [
  "dataCompetencia",
  "valor",
  "categoria",
  "descricao",
  "dataVencimento",
  "dataPagamento",
  "pessoa",
  "documentoPessoa",
  "centroCusto",
  "formaPagamento",
] as const;

// Mesmos campos de LinhaBruta (menos linha/importKey, atribuídos depois),
// todos string — a IA preenche com texto livre, exatamente como uma célula
// de planilha; nunca com um id ou referência a cadastro real (isso quem
// resolve é a etapa de Cadastros já existente, sem mudança nenhuma).
const LinhaExtraidaSchema = z.object({
  dataCompetencia: z.string().describe("Data de competência (quando o fato gerador ocorreu), formato AAAA-MM-DD. Vazio se não for possível determinar."),
  valor: z.string().describe("Valor do lançamento, só dígitos e vírgula/ponto decimal (ex.: '150,00'). Nunca inventado — se não houver valor claro, não gere esta linha."),
  categoria: z.string().describe("Nome livre da categoria (ex.: 'Transporte', 'Honorários'), não precisa bater com nenhum cadastro existente."),
  descricao: z.string().describe("Descrição curta do lançamento."),
  dataVencimento: z.string().describe("Data de vencimento, AAAA-MM-DD. Vazio se não determinável ou se igual à de competência."),
  dataPagamento: z.string().describe("Data em que foi efetivamente pago/recebido, AAAA-MM-DD. Vazio se ainda em aberto ou não determinável."),
  pessoa: z
    .string()
    .describe(
      "Nome da CONTRAPARTE da transação — quem recebeu o pagamento numa despesa (o fornecedor/prestador), ou quem pagou numa receita (o cliente). NUNCA o nome da própria empresa que está usando o sistema. Vazio se não houver.",
    ),
  documentoPessoa: z.string().describe("CPF/CNPJ da pessoa, se aparecer explicitamente. Quase sempre vazio."),
  centroCusto: z.string().describe("Centro de custo, só se explicitamente mencionado. Quase sempre vazio."),
  formaPagamento: z.string().describe("Forma de pagamento (Pix, Cartão, Dinheiro, Boleto, Transferência), se identificável. Vazio se não."),
  camposBaixaConfianca: z
    .array(z.enum(CAMPOS_LINHA_BRUTA))
    .describe("Quais dos campos acima você preencheu com incerteza real (não com certeza absoluta) — nunca deixe essa lista vazia por preguiça, mas também não marque um campo que você tem certeza."),
});

const ExtracaoSchema = z.object({
  linhas: z.array(LinhaExtraidaSchema),
});

// {{TENANT}} — achado real, 11/09/2026: sem saber o nome da própria empresa,
// a IA não tinha como perceber quando o nome mais óbvio no documento era o
// nosso próprio (ex.: um recibo "recebi do (sr) a [nome do tenant]" —
// exatamente o formato de recibo manuscrito brasileiro), e extraía a própria
// empresa como se fosse a pessoa/contraparte do lançamento (um recibo de
// COMPRA virou um cliente nosso, de cabeça pra baixo). Regra de direção
// (quem pagou vs quem recebeu) só é possível de explicar sabendo quem é
// "nós" no documento.
const PROMPT_SISTEMA = `Você extrai lançamentos financeiros (receitas e despesas) de texto livre ou de uma imagem (recibo, comprovante, print de fatura ou extrato) para o sistema financeiro da empresa "{{TENANT}}" — é essa empresa quem usa o sistema, "nós" nas regras abaixo.

Regras rígidas, sem exceção:
- NUNCA invente um valor, data ou nome que não esteja no texto/imagem. Se um campo não está claro, deixe-o como string vazia "" e/ou marque em camposBaixaConfianca — nunca "chute com confiança".
- Cada lançamento identificável vira uma linha separada. Uma entrada pode conter vários lançamentos (ex.: lista de despesas, fatura com várias transações) ou só um (ex.: um comprovante avulso).
- Se não conseguir identificar NENHUM lançamento de verdade (texto sem nada financeiro, imagem ilegível), devolva uma lista vazia — nunca invente uma linha só para preencher.
- Datas relativas ("ontem", "hoje", "dia 15") são resolvidas contra a data de hoje informada abaixo.
- categoria, pessoa, centroCusto e formaPagamento são só sugestões em texto livre — não precisam bater com nenhum cadastro existente, outra etapa do sistema resolve isso depois.
- O campo pessoa é sempre a CONTRAPARTE da transação, nunca a própria empresa "{{TENANT}}". Um recibo que diz "recebi do (sr./sra.) [nome]" está identificando QUEM PAGOU: se esse nome for a própria "{{TENANT}}", o lançamento é uma DESPESA nossa, e o campo pessoa deve ser quem emitiu o recibo/recebeu o pagamento (o vendedor, prestador, revendedor — normalmente no rodapé do documento, junto do CNPJ) — nunca o nome da própria empresa. Se esse nome for de outra pessoa ou empresa (não "{{TENANT}}"), o lançamento é uma RECEITA nossa, e o campo pessoa é esse nome (o cliente que pagou).
- A categoria sugerida também precisa refletir essa direção (ex.: "Compra de material" para uma despesa, nunca "Venda de material" quando quem pagou fomos nós).

Data de hoje: {{HOJE}}`;

export type ResultadoExtracaoIA = ({ linhas: LinhaBrutaIA[] } | { erro: string }) & { usage: UsageParaCusto };

const USAGE_ZERO: UsageParaCusto = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

export async function extrairLancamentosIA(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" },
  nomeTenant: string,
): Promise<ResultadoExtracaoIA> {
  // Checado explícito ANTES de chamar a API — sem isso, a ausência da chave
  // vira uma exceção síncrona do SDK (lançada montando os headers, antes de
  // qualquer request de verdade) que não é nenhuma das classes de erro
  // capturadas abaixo, e escapava como erro não tratado em vez da mensagem
  // amigável (achado testando com ANTHROPIC_API_KEY ainda não configurada).
  // Mesmo padrão de validação explícita que criarTransportadorBrevo() já usa.
  if (!process.env.ANTHROPIC_API_KEY) {
    return { erro: "IA não configurada (ANTHROPIC_API_KEY ausente no ambiente).", usage: USAGE_ZERO };
  }

  if ("imagemBase64" in entrada && !conteudoBateComMediaType(entrada.imagemBase64, entrada.imagemMediaType)) {
    return { erro: "Arquivo de imagem inválido ou corrompido.", usage: USAGE_ZERO };
  }

  const client = new Anthropic();
  const hojeIso = hojeIsoBrasil();

  const conteudo: Anthropic.MessageParam["content"] =
    "texto" in entrada
      ? [{ type: "text", text: entrada.texto }]
      : [
          { type: "image", source: { type: "base64", media_type: entrada.imagemMediaType, data: entrada.imagemBase64 } },
          { type: "text", text: "Extraia os lançamentos financeiros desta imagem." },
        ];

  let resposta;
  try {
    resposta = await client.messages.parse({
      model: "claude-sonnet-5",
      // 8000 (valor original) truncava um extrato bancário real de
      // centenas de movimentações no meio da geração — o JSON saía
      // incompleto, e o parse (zodOutputFormat) quebrava numa exceção não
      // tratada em vez de mensagem amigável (achado numa conversa sobre
      // limites de IA: uma linha extraída gira em torno de ~100 tokens, e
      // 8000 tokens de saída cabem só ~80 linhas — bem abaixo de "centenas
      // de movimentações"). 16000 dá espaço pra ~160 linhas antes de
      // precisar do aviso abaixo; o custo real só sobe se o texto de fato
      // tiver esse volume, o teto em si não custa nada enquanto não é usado.
      max_tokens: 16000,
      // Cache de prompt (achado em cálculo de custo, 08/09/2026): o texto do
      // prompt (nome do tenant + data, ambos fixos dentro de uma sessão de
      // uso) é recobrado por completo a US$2/MTok em toda extração — marcando
      // o bloco como cacheável, chamadas dentro da janela de 5 min pagam
      // US$0,20/MTok de leitura em vez do preço cru. Cache agora é por
      // tenant (não mais compartilhado entre todos, como antes de 11/09/2026
      // — precisou incluir o nome do tenant no prompt pra corrigir um achado
      // real: sem saber quem é "nós", a IA confundia a própria empresa com
      // a contraparte do lançamento), ainda vale a pena porque um mesmo
      // tenant tipicamente faz várias extrações seguidas na mesma sessão.
      system: [{ type: "text", text: PROMPT_SISTEMA.replaceAll("{{TENANT}}", nomeTenant).replace("{{HOJE}}", hojeIso), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: conteudo }],
      output_config: { format: zodOutputFormat(ExtracaoSchema) },
    });
  } catch (erro) {
    // Nenhum destes 3 tipos chega a consumir token de verdade — a
    // requisição é rejeitada antes de processar (chave inválida, limite
    // de taxa, erro de validação do request em si).
    if (erro instanceof Anthropic.AuthenticationError) return { erro: "IA não configurada (chave de API ausente ou inválida).", usage: USAGE_ZERO };
    if (erro instanceof Anthropic.RateLimitError) return { erro: "IA temporariamente sobrecarregada — tente de novo em instantes.", usage: USAGE_ZERO };
    if (erro instanceof Anthropic.APIError) return { erro: `Falha ao consultar a IA: ${erro.message}`, usage: USAGE_ZERO };
    throw erro;
  }

  // A partir daqui a chamada já aconteceu de verdade e já foi cobrada —
  // todo retorno abaixo carrega o usage real, mesmo quando o resultado é
  // um erro de conteúdo (recusa, corte por tamanho, zero lançamentos).
  const usage: UsageParaCusto = {
    input_tokens: resposta.usage.input_tokens,
    output_tokens: resposta.usage.output_tokens,
    cache_creation_input_tokens: resposta.usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: resposta.usage.cache_read_input_tokens ?? 0,
  };

  if (resposta.stop_reason === "refusal") {
    return { erro: "A IA não conseguiu processar esse conteúdo. Tente reformular o texto ou enviar outra imagem.", usage };
  }

  // Corte por tamanho — precisa ser checado ANTES de tocar em
  // parsed_output: com a saída cortada no meio, o JSON fica incompleto e o
  // parse quebraria numa exceção não tratada, sem explicação nenhuma pra
  // quem enviou um extrato grande demais pra caber numa chamada só.
  if (resposta.stop_reason === "max_tokens") {
    return { erro: "Esse documento tem lançamentos demais para processar de uma vez. Divida em partes menores (ex.: mês a mês) e tente novamente.", usage };
  }

  const extraido = resposta.parsed_output;
  if (!extraido || extraido.linhas.length === 0) {
    return { erro: "Não consegui identificar nenhum lançamento nesse texto/imagem. Tente reformular ou enviar uma imagem mais nítida.", usage };
  }

  const linhas: LinhaBrutaIA[] = extraido.linhas.map((linha, i) => ({
    linha: i + 1,
    importKey: `ia-${i}-${hashEstavel(JSON.stringify(linha))}`,
    // Extração por IA não tenta detectar parcelamento — vazio = 1 (à vista),
    // mesmo padrão de "campo que a planilha manual também deixaria vazio".
    numeroParcelas: "",
    ...linha,
  }));

  return { linhas, usage };
}
