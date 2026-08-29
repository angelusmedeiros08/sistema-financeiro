import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { itemCatalogoDaRota } from "./catalogo";

type Cliente = SupabaseClient<Database>;

export type ApresentacaoResumo = {
  id: string;
  nome: string;
  intervaloSegundos: number;
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
  slides: SlideApresentacao[];
};

// Usado pela listagem de gestão (`/apresentacoes`) — só o necessário pra
// mostrar a linha e decidir se "Apresentar"/"Modo TV" ficam habilitados.
export async function listarApresentacoes(supabase: Cliente, tenantId: string): Promise<ApresentacaoResumo[]> {
  const { data, error } = await supabase
    .from("apresentacoes")
    .select("id, nome, intervalo_segundos, apresentacao_slides(rota, ordem)")
    .eq("tenant_id", tenantId)
    .order("nome");

  if (error || !data) return [];

  return data.map((a) => {
    const slidesOrdenados = [...a.apresentacao_slides].sort((x, y) => x.ordem - y.ordem);
    return {
      id: a.id,
      nome: a.nome,
      intervaloSegundos: a.intervalo_segundos,
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
  const { data: apresentacao, error } = await supabase
    .from("apresentacoes")
    .select("id, nome, intervalo_segundos")
    .eq("tenant_id", tenantId)
    .eq("id", apresentacaoId)
    .maybeSingle();

  if (error || !apresentacao) return null;

  const { data: slides } = await supabase
    .from("apresentacao_slides")
    .select("id, ordem, rota, rotulo")
    .eq("apresentacao_id", apresentacaoId)
    .order("ordem");

  return {
    id: apresentacao.id,
    nome: apresentacao.nome,
    intervaloSegundos: apresentacao.intervalo_segundos,
    slides: (slides ?? []).filter((s) => itemCatalogoDaRota(s.rota) !== undefined),
  };
}
