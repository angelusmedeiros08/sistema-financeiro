import { candidatosPorSimilaridade, LIMIAR_DICA, LIMIAR_SIMILARIDADE } from "@/lib/importacao/fuzzy";
import { normalizarTexto } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import type { CandidatoPessoa, CorrespondenciaPessoa, EntradaCorrespondenciaPessoa } from "./tipos";

export type PessoaExistente = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  perfis: Database["public"]["Enums"]["perfil_pessoa"][];
};

function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function paraCandidato(p: PessoaExistente): CandidatoPessoa {
  return { id: p.id, nome: p.nome, documento: p.documento, email: p.email, telefone: p.telefone };
}

// Ordem (Seção "Modelo de correspondência" da spec de homônimos): documento
// exato decide sozinho SE só um cadastro bater — dois ou mais (dado legado
// duplicado) nunca decide sozinho. Documento não bate mas o nome bate com
// alguém que tem OUTRO documento (ou nenhum) vira aviso de conflito, nunca
// decide sozinho — pode ser razão social trocada, pode ser homônimo de
// verdade. Nome exato sem documento pra comparar também nunca decide mais
// sozinho (era o buraco original: dois "João Silva" cadastrados, o primeiro
// do SELECT ganhava em silêncio). Nome aproximado e "fraco" seguem só como
// dica, sem pré-seleção.
export function resolverCorrespondenciaPessoa(linha: EntradaCorrespondenciaPessoa, existentes: PessoaExistente[]): CorrespondenciaPessoa {
  const documentoLinha = apenasDigitos(linha.documento);

  if (documentoLinha) {
    const porDocumento = existentes.filter((e) => e.documento && apenasDigitos(e.documento) === documentoLinha);
    if (porDocumento.length > 0) {
      return { tipo: "exata_documento", candidatos: porDocumento.map(paraCandidato) };
    }
  }

  if (!linha.nome.trim()) {
    return { tipo: "nenhuma", candidatos: [] };
  }

  const porNomeExato = existentes.filter((e) => normalizarTexto(e.nome) === normalizarTexto(linha.nome));
  if (porNomeExato.length > 0) {
    return { tipo: documentoLinha ? "documento_conflito" : "exata_nome", candidatos: porNomeExato.map(paraCandidato) };
  }

  const aproximados = candidatosPorSimilaridade(linha.nome, existentes, LIMIAR_SIMILARIDADE);
  if (aproximados.length > 0) {
    return { tipo: "aproximada", candidatos: aproximados.map((c) => paraCandidato(c.entidade)) };
  }

  const fracos = candidatosPorSimilaridade(linha.nome, existentes, LIMIAR_DICA);
  if (fracos.length > 0) {
    return { tipo: "fraca", candidatos: fracos.map((c) => paraCandidato(c.entidade)) };
  }

  return { tipo: "nenhuma", candidatos: [] };
}
