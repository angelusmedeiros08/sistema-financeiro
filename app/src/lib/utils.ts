import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Troca um item de posição com o vizinho (pra UI de reordenar com setas
// cima/baixo — configuracoes/estrutura-dre e apresentacoes usavam cada um
// sua própria cópia desse swap, achado em revisão de código). Fora dos
// limites, devolve a lista original sem mudar nada.
export function moverItem<T>(lista: T[], indice: number, direcao: -1 | 1): T[] {
  const alvo = indice + direcao
  if (alvo < 0 || alvo >= lista.length) return lista
  const nova = [...lista]
  ;[nova[indice], nova[alvo]] = [nova[alvo], nova[indice]]
  return nova
}
