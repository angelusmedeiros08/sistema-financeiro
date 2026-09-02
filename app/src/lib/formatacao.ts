import { FUSO_BRASIL } from "./data-brasil";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor);
}

// Variante pra telas onde zero de verdade (nenhum movimento) deve ler como
// "-" em vez de "R$0,00" repetido — não é o padrão de formatarMoeda em si
// (formulários/totais continuam querendo "R$0,00" explícito), só de telas
// específicas que já adotaram essa convenção (ex.: Contas bancárias, pra
// bater com os subcampos ao lado que já usam formatarNumeroCompacto).
export function formatarMoedaOuTraco(valor: number): string {
  return valor === 0 ? "-" : formatarMoeda(valor);
}

const formatadorPercentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatarPercentual(valor: number): string {
  return formatadorPercentual.format(valor);
}

const formatadorNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Sem símbolo de moeda e zero vira "-" — formato compacto pra tabelas com
// muitas colunas de valor lado a lado (matriz de DRE), onde repetir "R$" em
// toda célula só rouba espaço sem acrescentar leitura (a coluna inteira já
// é dinheiro, o contexto já deixa isso claro).
export function formatarNumeroCompacto(valor: number): string {
  if (valor === 0) return "-";
  return formatadorNumero.format(valor);
}

// Abreviado com sufixo (mil/mi/bi) — só pra rótulo dentro de forma de
// tamanho fixo (centro de rosca, dentro de anel), onde formatarNumeroCompacto
// (sem abreviação nenhuma) pode virar uma string arbitrariamente longa e
// vazar pra fora do espaço disponível. Tamanho sempre limitado (~8
// caracteres), não importa a magnitude do valor.
export function formatarNumeroAbreviado(valor: number): string {
  const abs = Math.abs(valor);
  const opcoes = { maximumFractionDigits: 1, minimumFractionDigits: 0 };
  if (abs >= 1_000_000_000) return `${(valor / 1_000_000_000).toLocaleString("pt-BR", opcoes)} bi`;
  if (abs >= 1_000_000) return `${(valor / 1_000_000).toLocaleString("pt-BR", opcoes)} mi`;
  if (abs >= 1_000) return `${(valor / 1_000).toLocaleString("pt-BR", opcoes)} mil`;
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

const formatadorIndice = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Índice adimensional (ex.: liquidez aproximada) — sempre 1 casa decimal,
// vírgula em vez de ponto (diferente de dias.toFixed(1) usado em PMR/PMP,
// onde o padrão já estabelecido não localiza o separador).
export function formatarIndice(valor: number): string {
  return formatadorIndice.format(valor);
}

// Contraparte de parse pro formato pt-BR (vírgula decimal, ponto de milhar)
// — usada por todo input de valor em texto livre, cliente e servidor.
// Remove o separador de milhar ANTES de trocar a vírgula por ponto: sem
// essa ordem, "1.500,00" (jeito natural de digitar um valor de 4+ dígitos)
// vira Number("1.500.00") = NaN (achado em auditoria — vários inputs de
// valor faziam só texto.replace(",", "."), zerando o valor em silêncio
// sempre que alguém digitava o separador de milhar).
export function parseNumeroBR(texto: string): number {
  const numero = Number(texto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

const NOMES_MES_ABREVIADO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Recebe uma chave "AAAA-MM" (o que as buscas de série mensal já devolvem)
// e devolve a abreviação em português — usado nos eixos das mini-tendências
// junto dos gauges.
export function formatarMesAbreviado(chaveAnoMes: string): string {
  return NOMES_MES_ABREVIADO[Number(chaveAnoMes.slice(5, 7)) - 1] ?? chaveAnoMes;
}

export function formatarDataCurta(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// Com ano — pra período que pode passar de 12 meses (ex: janela da
// Concentração de Receita), onde "26 de ago." sozinho não diz se é 2025 ou
// 2026.
export function formatarDataComAno(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Pra timestamp de verdade (`criado_em`/`atualizado_em`, com hora — não uma
// data corrida tipo `data_vencimento`), sempre com `timeZone` explícito: sem
// isso, `toLocaleDateString` renderizado num Server Component usa o fuso do
// processo Node (UTC na Vercel, não Brasília) — bug real, achado ao vivo
// (hora exibida 3h adiantada). Ver lib/data-brasil.ts.
export function formatarDataHoraBrasil(isoDatetime: string): string {
  return new Date(isoDatetime).toLocaleString("pt-BR", {
    timeZone: FUSO_BRASIL,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
