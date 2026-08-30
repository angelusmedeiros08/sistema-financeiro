import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { itemCatalogoDaRota } from "./catalogo";

type Cliente = SupabaseClient<Database>;

export type ApresentacaoResumo = {
  id: string;
  nome: string;
  intervaloSegundos: number;
  permiteModoTv: boolean;
  totalSlides: number;
  primeiraRota: string | null;
};

export type SlideApresentacao = {
  id: string;
  ordem: number;
  rota: string;
  rotulo: string;
};

export type ApresentacaoComSlides = {
  id: string;
  nome: string;
  intervaloSegundos: number;
  permiteModoTv: boolean;
  slides: SlideApresentacao[];
};

// Usado pela listagem de gestão (`/apresentacoes`) — só o necessário pra
// mostrar a linha e decidir se "Apresentar"/"Modo TV" ficam habilitados.
export async function listarApresentacoes(supabase: Cliente, tenantId: string): Promise<ApresentacaoResumo[]> {
  const { data, error } = await supabase
    .from("apresentacoes")
    .select("id, nome, intervalo_segundos, permite_modo_tv, apresentacao_slides(rota, ordem)")
    .eq("tenant_id", tenantId)
    .order("nome");

  if (error || !data) return [];

  return data.map((a) => {
    // Filtra contra o catálogo atual — mesma regra de obterApresentacaoComSlides
    // (achado em revisão de código: sem isso, uma rota removida/renomeada do
    // catálogo deixava a contagem daqui divergir do que a sessão de verdade
    // mostra, e habilitava "Apresentar" apontando pra um slide que não carrega).
    const slidesValidos = a.apresentacao_slides.filter((s) => itemCatalogoDaRota(s.rota) !== undefined);
    const slidesOrdenados = slidesValidos.sort((x, y) => x.ordem - y.ordem);
    return {
      id: a.id,
      nome: a.nome,
      intervaloSegundos: a.intervalo_segundos,
      permiteModoTv: a.permite_modo_tv,
      totalSlides: slidesOrdenados.length,
      primeiraRota: slidesOrdenados[0]?.rota ?? null,
    };
  });
}

// Usado pelo editor (pré-carregar o formulário) e pelo runtime do
// Apresentador/Modo TV ((app)/layout.tsx) — mesma fonte pros dois, pra não
// duplicar a leitura de slides em ordem. RLS de `apresentacao_slides` já
// garante que uma apresentação de outro tenant não aparece aqui (cai em
// null), mesmo com o id em mãos.
export async function obterApresentacaoComSlides(
  supabase: Cliente,
  { tenantId, apresentacaoId }: { tenantId: string; apresentacaoId: string },
): Promise<ApresentacaoComSlides | null> {
  // As duas consultas rodam em paralelo — a segunda só precisa do id (que o
  // chamador já tem), não de nenhum dado da primeira; RLS, não a primeira
  // consulta, é quem protege o isolamento por tenant aqui (achado em revisão
  // de código: rodar em série custava uma volta de rede inteira a mais no
  // caminho mais usado da feature — carregar o editor ou iniciar uma sessão).
  const [{ data: apresentacao, error: erroApresentacao }, { data: slides, error: erroSlides }] = await Promise.all([
    supabase
      .from("apresentacoes")
      .select("id, nome, intervalo_segundos, permite_modo_tv")
      .eq("tenant_id", tenantId)
      .eq("id", apresentacaoId)
      .maybeSingle(),
    supabase.from("apresentacao_slides").select("id, ordem, rota, rotulo").eq("apresentacao_id", apresentacaoId).order("ordem"),
  ]);

  // Erro na segunda consulta antes não era checado — silenciosamente virava
  // "apresentação encontrada, 0 slides", indistinguível de uma apresentação
  // de verdade vazia (achado em revisão de código). Tratar como inacessível,
  // igual à primeira consulta, é o que deixa o chamador (ApresentacaoShell)
  // conseguir mostrar o aviso de "não existe mais/sem acesso".
  if (erroApresentacao || !apresentacao || erroSlides) return null;

  return {
    id: apresentacao.id,
    nome: apresentacao.nome,
    intervaloSegundos: apresentacao.intervalo_segundos,
    permiteModoTv: apresentacao.permite_modo_tv,
    slides: (slides ?? []).filter((s) => itemCatalogoDaRota(s.rota) !== undefined),
  };
}
