import { distance } from "fastest-levenshtein";
import { normalizarTexto } from "./locale-br";
import type { CorrespondenciaEntidade, EntidadeExistente } from "./tipos";

// Constante fixa (não configurável nesta versão) — Seção 6 da spec.
const LIMIAR_SIMILARIDADE = 0.85;

function similaridade(a: string, b: string): number {
  const maiorTamanho = Math.max(a.length, b.length);
  if (maiorTamanho === 0) return 1;
  return 1 - distance(a, b) / maiorTamanho;
}

// Nunca decide sozinho: exato vira correspondência direta, aproximado vira
// só uma sugestão pra tela de revisão confirmar ou rejeitar.
export function resolverCorrespondencia(valorOriginal: string, existentes: EntidadeExistente[]): CorrespondenciaEntidade {
  const normalizado = normalizarTexto(valorOriginal);

  const exata = existentes.find((e) => normalizarTexto(e.nome) === normalizado);
  if (exata) {
    return { valorOriginal, correspondenciaId: exata.id, correspondenciaNome: exata.nome, tipoCorrespondencia: "exata" };
  }

  let melhor: { id: string; nome: string; score: number } | null = null;
  for (const existente of existentes) {
    const score = similaridade(normalizado, normalizarTexto(existente.nome));
    if (score >= LIMIAR_SIMILARIDADE && (!melhor || score > melhor.score)) {
      melhor = { id: existente.id, nome: existente.nome, score };
    }
  }
  if (melhor) {
    return { valorOriginal, correspondenciaId: melhor.id, correspondenciaNome: melhor.nome, tipoCorrespondencia: "aproximada" };
  }

  return { valorOriginal, correspondenciaId: null, correspondenciaNome: null, tipoCorrespondencia: "nenhuma" };
}

export function resolverTodasCorrespondencias(valoresUnicos: string[], existentes: EntidadeExistente[]): CorrespondenciaEntidade[] {
  return valoresUnicos.map((v) => resolverCorrespondencia(v, existentes));
}

// Valores únicos de uma coluna, ignorando vazio — preserva a 1ª grafia
// encontrada (não importa qual, já que a comparação é sempre normalizada).
export function extrairValoresUnicos(valores: string[]): string[] {
  const vistos = new Set<string>();
  const unicos: string[] = [];
  for (const v of valores) {
    const trim = v.trim();
    if (!trim) continue;
    const chave = normalizarTexto(trim);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(trim);
  }
  return unicos;
}
