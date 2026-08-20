// Paleta pastel estável por nome — mesma categoria/centro de custo sempre
// cai na mesma cor em qualquer tela, sem precisar de coluna nova no banco
// (hash do nome escolhe o índice). Padrão inspirado no Notion: cada tag
// ganha uma identidade cromática própria, não só semântica verde/vermelho.
const PALETA_TAG = [
  { bg: "#E8F3EC", texto: "#1F7A4D" },
  { bg: "#EAF0FE", texto: "#3457C2" },
  { bg: "#FBEFE3", texto: "#B4691E" },
  { bg: "#F6E9F8", texto: "#8C3FA0" },
  { bg: "#FDEBEE", texto: "#C43B57" },
  { bg: "#E9F6F5", texto: "#1A7F76" },
  { bg: "#F3EFE3", texto: "#8A6D1E" },
  { bg: "#EEEBFB", texto: "#5B4FBE" },
] as const;

function hashSimples(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function corPorNome(nome: string): { bg: string; texto: string } {
  const indice = hashSimples(nome.trim().toLowerCase()) % PALETA_TAG.length;
  return PALETA_TAG[indice];
}
