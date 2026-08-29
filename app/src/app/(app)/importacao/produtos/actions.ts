"use server";

import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { createClient } from "@/utils/supabase/server";
import { criarEntidadeAprovada } from "@/lib/importacao/resolucao";

// Reaproveita criarEntidadeAprovada (lib/importacao/resolucao.ts) — mesma
// função que a etapa Cadastros de Lançamentos já usa pra criar categoria
// nova, sempre com tipoCategoria "RECEITA" aqui (produto só referencia
// categoria de receita, mesma exigência do cadastro manual).
export async function criarCategoriaReceitaProdutoAction(nome: string): Promise<{ id: string } | { erro: string }> {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();
  return criarEntidadeAprovada(supabase, contexto.tenantId, { tipo: "categoria", nome, tipoCategoria: "RECEITA" });
}
