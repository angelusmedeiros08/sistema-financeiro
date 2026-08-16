import { resolverCorrespondencia } from "@/lib/importacao/fuzzy";
import type { Database } from "@/utils/supabase/database.types";
import type { LinhaBrutaPessoa, CorrespondenciaPessoa } from "./tipos";

export type PessoaExistente = {
  id: string;
  nome: string;
  documento: string | null;
  perfis: Database["public"]["Enums"]["perfil_pessoa"][];
};

function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// Ordem da Seção 4 da spec: documento exato (mais confiável, mesmo sem
// constraint de unicidade no banco) > nome exato > nome aproximado (só
// sugere) > nenhuma. Nome aproximado nunca decide sozinho — mesma regra já
// usada na resolução de categoria/pessoa do import financeiro.
export function resolverCorrespondenciaPessoa(linha: LinhaBrutaPessoa, existentes: PessoaExistente[]): CorrespondenciaPessoa {
  const documentoLinha = apenasDigitos(linha.documento);
  if (documentoLinha) {
    const porDocumento = existentes.find((e) => e.documento && apenasDigitos(e.documento) === documentoLinha);
    if (porDocumento) {
      return { pessoaId: porDocumento.id, nome: porDocumento.nome, tipo: "exata_documento" };
    }
  }

  if (!linha.nome.trim()) {
    return { pessoaId: null, nome: null, tipo: "nenhuma" };
  }

  const porNome = resolverCorrespondencia(linha.nome, existentes);
  if (porNome.tipoCorrespondencia === "exata") {
    return { pessoaId: porNome.correspondenciaId, nome: porNome.correspondenciaNome, tipo: "exata_nome" };
  }
  if (porNome.tipoCorrespondencia === "aproximada") {
    return { pessoaId: porNome.correspondenciaId, nome: porNome.correspondenciaNome, tipo: "aproximada" };
  }
  return { pessoaId: null, nome: null, tipo: "nenhuma" };
}
