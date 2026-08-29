import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { hashEstavel } from "./validacao";
import type { LinhaBrutaIA } from "./tipos";

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
  pessoa: z.string().describe("Nome de quem pagou ou recebeu, se identificável. Vazio se não houver."),
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

const PROMPT_SISTEMA = `Você extrai lançamentos financeiros (receitas e despesas) de texto livre ou de uma imagem (recibo, comprovante, print de fatura ou extrato) para um sistema financeiro brasileiro.

Regras rígidas, sem exceção:
- NUNCA invente um valor, data ou nome que não esteja no texto/imagem. Se um campo não está claro, deixe-o como string vazia "" e/ou marque em camposBaixaConfianca — nunca "chute com confiança".
- Cada lançamento identificável vira uma linha separada. Uma entrada pode conter vários lançamentos (ex.: lista de despesas, fatura com várias transações) ou só um (ex.: um comprovante avulso).
- Se não conseguir identificar NENHUM lançamento de verdade (texto sem nada financeiro, imagem ilegível), devolva uma lista vazia — nunca invente uma linha só para preencher.
- Datas relativas ("ontem", "hoje", "dia 15") são resolvidas contra a data de hoje informada abaixo.
- categoria, pessoa, centroCusto e formaPagamento são só sugestões em texto livre — não precisam bater com nenhum cadastro existente, outra etapa do sistema resolve isso depois.

Data de hoje: {{HOJE}}`;

export async function extrairLancamentosIA(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" },
): Promise<{ linhas: LinhaBrutaIA[] } | { erro: string }> {
  // Checado explícito ANTES de chamar a API — sem isso, a ausência da chave
  // vira uma exceção síncrona do SDK (lançada montando os headers, antes de
  // qualquer request de verdade) que não é nenhuma das classes de erro
  // capturadas abaixo, e escapava como erro não tratado em vez da mensagem
  // amigável (achado testando com ANTHROPIC_API_KEY ainda não configurada).
  // Mesmo padrão de validação explícita que criarTransportadorBrevo() já usa.
  if (!process.env.ANTHROPIC_API_KEY) {
    return { erro: "IA não configurada (ANTHROPIC_API_KEY ausente no ambiente)." };
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
      max_tokens: 8000,
      system: PROMPT_SISTEMA.replace("{{HOJE}}", hojeIso),
      messages: [{ role: "user", content: conteudo }],
      output_config: { format: zodOutputFormat(ExtracaoSchema) },
    });
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) return { erro: "IA não configurada (chave de API ausente ou inválida)." };
    if (erro instanceof Anthropic.RateLimitError) return { erro: "IA temporariamente sobrecarregada — tente de novo em instantes." };
    if (erro instanceof Anthropic.APIError) return { erro: `Falha ao consultar a IA: ${erro.message}` };
    throw erro;
  }

  if (resposta.stop_reason === "refusal") {
    return { erro: "A IA não conseguiu processar esse conteúdo. Tente reformular o texto ou enviar outra imagem." };
  }

  const extraido = resposta.parsed_output;
  if (!extraido || extraido.linhas.length === 0) {
    return { erro: "Não consegui identificar nenhum lançamento nesse texto/imagem. Tente reformular ou enviar uma imagem mais nítida." };
  }

  const linhas: LinhaBrutaIA[] = extraido.linhas.map((linha, i) => ({
    linha: i + 1,
    importKey: `ia-${i}-${hashEstavel(JSON.stringify(linha))}`,
    ...linha,
  }));

  return { linhas };
}
