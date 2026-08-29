"use server";

import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { obterApresentacaoComSlides, type ApresentacaoComSlides } from "./apresentacoes";

// Chamado pelo ApresentacaoShell (Client Component) ao entrar numa sessão de
// apresentação — layouts não recebem searchParams (só Client Components via
// useSearchParams), então a leitura dos slides não pode acontecer no
// (app)/layout.tsx nem antes dele. RLS de `apresentacoes`/`apresentacao_slides`
// garante que uma sessão apontando pra apresentação de outro tenant volta
// null, mesmo com o id em mãos (caso de borda da spec, Seção 8).
export async function obterApresentacaoParaSessao(apresentacaoId: string): Promise<ApresentacaoComSlides | null> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return null;

  const supabase = await createClient();
  return obterApresentacaoComSlides(supabase, { tenantId: contexto.tenantId, apresentacaoId });
}
