import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

type Cliente = SupabaseClient<Database>;
type FormaAnexo = Database["public"]["Enums"]["forma_anexo"];
type TipoAnexo = Database["public"]["Enums"]["tipo_anexo"];

const BUCKET = "comprovantes";
const TIPOS_MIME_ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

export type ParametrosAnexo = {
  tenant_id: string;
  evento_financeiro_id?: string;
  baixa_id?: string;
  regra_recorrencia_id?: string;
  forma: FormaAnexo;
  tipo: TipoAnexo;
  descricao?: string;
  arquivo?: File;
  url?: string;
  criado_por?: string;
};

// Anexa um documento (arquivo pro bucket privado, ou só um link externo) a
// exatamente um dono — evento financeiro, baixa, ou a regra de recorrência
// em si (documento da série, ex. contrato de aluguel, não de uma ocorrência
// específica) — nunca mais de um, mesma garantia que o CHECK do banco já
// exige. Nunca confia na validação do formulário: mime type e tamanho são
// checados de novo aqui antes do upload.
export async function anexarDocumento(
  supabase: Cliente,
  params: ParametrosAnexo,
): Promise<{ anexo_id: string } | { erro: string }> {
  const donos = [params.evento_financeiro_id, params.baixa_id, params.regra_recorrencia_id].filter(Boolean);
  if (donos.length !== 1) {
    return { erro: "Anexo precisa pertencer a exatamente um lançamento, baixa ou série recorrente." };
  }

  if (params.forma === "ARQUIVO") {
    if (!params.arquivo || params.arquivo.size === 0) {
      return { erro: "Selecione um arquivo." };
    }
    if (!TIPOS_MIME_ACEITOS.includes(params.arquivo.type)) {
      return { erro: "Tipo de arquivo não aceito — envie PDF, JPG, PNG ou WEBP." };
    }
    if (params.arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return { erro: "Arquivo maior que 10MB." };
    }

    const dono = params.evento_financeiro_id ?? params.baixa_id ?? params.regra_recorrencia_id;
    const caminho = `${params.tenant_id}/${dono}/${crypto.randomUUID()}-${params.arquivo.name}`;

    const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, params.arquivo, {
      contentType: params.arquivo.type,
    });
    if (erroUpload) return { erro: erroUpload.message };

    const { data, error } = await supabase
      .from("anexos")
      .insert({
        tenant_id: params.tenant_id,
        evento_financeiro_id: params.evento_financeiro_id ?? null,
        baixa_id: params.baixa_id ?? null,
        regra_recorrencia_id: params.regra_recorrencia_id ?? null,
        forma: "ARQUIVO",
        tipo: params.tipo,
        descricao: params.descricao || null,
        storage_path: caminho,
        nome_arquivo: params.arquivo.name,
        tamanho_bytes: params.arquivo.size,
        mime_type: params.arquivo.type,
        criado_por: params.criado_por,
      })
      .select("id")
      .single();

    if (error || !data) {
      // o upload já aconteceu mas o registro falhou — o objeto órfão no
      // bucket é inofensivo (nunca listado sem uma linha em anexos
      // apontando pra ele) e mais seguro que tentar desfazer o upload aqui.
      return { erro: error?.message ?? "Falha ao registrar anexo." };
    }
    return { anexo_id: data.id };
  }

  const url = params.url?.trim();
  if (!url) return { erro: "Informe o link do documento." };
  try {
    new URL(url);
  } catch {
    return { erro: "Link inválido." };
  }

  const { data, error } = await supabase
    .from("anexos")
    .insert({
      tenant_id: params.tenant_id,
      evento_financeiro_id: params.evento_financeiro_id ?? null,
      baixa_id: params.baixa_id ?? null,
      regra_recorrencia_id: params.regra_recorrencia_id ?? null,
      forma: "LINK",
      tipo: params.tipo,
      descricao: params.descricao || null,
      url,
      criado_por: params.criado_por,
    })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Falha ao registrar anexo." };
  return { anexo_id: data.id };
}

export type AnexoDraft = {
  forma: FormaAnexo;
  tipo: TipoAnexo;
  descricao?: string;
  arquivo?: File;
  url?: string;
};

// Lê as linhas de anexo "rascunho" submetidas junto no mesmo <form> de um
// lançamento/série ainda não criado — cada linha usa nomes de campo
// prefixados por índice (anexo_0_forma, anexo_1_forma...) em vez de um
// array, pra não desalinhar quando uma linha LINK simplesmente não tem
// campo de arquivo. `anexo_count` (escrito pelo componente de UI) diz
// quantas linhas existem.
export function extrairAnexosDraftDoFormData(formData: FormData): AnexoDraft[] {
  const total = Number(formData.get("anexo_count") ?? "0") || 0;
  const linhas: AnexoDraft[] = [];

  for (let i = 0; i < total; i++) {
    const forma = String(formData.get(`anexo_${i}_forma`) ?? "") as FormaAnexo;
    if (forma !== "ARQUIVO" && forma !== "LINK") continue;

    const tipo = String(formData.get(`anexo_${i}_tipo`) ?? "OUTROS") as TipoAnexo;
    const descricao = String(formData.get(`anexo_${i}_descricao`) ?? "") || undefined;
    const arquivo = formData.get(`anexo_${i}_arquivo`);
    const url = String(formData.get(`anexo_${i}_url`) ?? "") || undefined;

    if (forma === "ARQUIVO" && (!(arquivo instanceof File) || arquivo.size === 0)) continue;
    if (forma === "LINK" && !url) continue;

    linhas.push({ forma, tipo, descricao, arquivo: arquivo instanceof File ? arquivo : undefined, url });
  }

  return linhas;
}

// Anexa todas as linhas de rascunho a um dono recém-criado — usada logo
// após criarEventoFinanceiro()/criarRegraRecorrencia() ter sucesso. Erros
// de anexo individual não desfazem o lançamento em si (já confirmado);
// ficam só registrados pro chamador decidir se avisa o usuário.
export async function anexarDraftsAoDono(
  supabase: Cliente,
  drafts: AnexoDraft[],
  dono:
    | { tenant_id: string; evento_financeiro_id: string; criado_por?: string }
    | { tenant_id: string; baixa_id: string; criado_por?: string }
    | { tenant_id: string; regra_recorrencia_id: string; criado_por?: string },
): Promise<{ erros: string[] }> {
  const erros: string[] = [];
  for (const draft of drafts) {
    const resultado = await anexarDocumento(supabase, { ...dono, ...draft });
    if ("erro" in resultado) erros.push(resultado.erro);
  }
  return { erros };
}

// URL sempre assinada e de curta duração pra anexo em arquivo — nunca
// acesso público direto ao bucket. Anexo tipo link só devolve a URL crua.
export async function obterUrlAnexo(
  supabase: Cliente,
  params: { tenant_id: string; anexo_id: string },
): Promise<{ url: string } | { erro: string }> {
  const { data: anexo, error } = await supabase
    .from("anexos")
    .select("forma, url, storage_path")
    .eq("id", params.anexo_id)
    .eq("tenant_id", params.tenant_id)
    .single();

  if (error || !anexo) return { erro: "Anexo não encontrado." };

  if (anexo.forma === "LINK") {
    return { url: anexo.url! };
  }

  const { data: assinada, error: erroAssinada } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(anexo.storage_path!, 300);

  if (erroAssinada || !assinada) return { erro: erroAssinada?.message ?? "Falha ao gerar link de acesso." };
  return { url: assinada.signedUrl };
}
