"use server";

import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";

export type ResultadoBusca = {
  categoria: "cliente" | "fornecedor" | "lancamento" | "venda";
  titulo: string;
  subtitulo: string;
  href: string;
};

const LIMITE_POR_CATEGORIA = 5;

// Busca por nome/descrição em pessoas, lançamentos e vendas do tenant —
// evolução do Ctrl+K, que antes só filtrava a lista estática de telas
// (lacuna mais citada no benchmark do dossiê UX). Mínimo de 2 caracteres
// pra não disparar 3 queries a cada tecla no início da digitação; quem
// chama já debounça antes de invocar esta action.
export async function buscarGlobal(termo: string): Promise<ResultadoBusca[]> {
  const consulta = termo.trim();
  if (consulta.length < 2) return [];

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return [];

  const supabase = await createClient();
  const padrao = `%${consulta}%`;

  // vendas não busca por nome do cliente direto — PostgREST não filtra de
  // forma confiável uma coluna de recurso aninhado (pessoas.nome) dentro de
  // um .or() no mesmo nível da tabela principal. Busca por número (se o
  // termo for numérico) resolve o caso mais comum ("venda 42"); achar pelo
  // nome do cliente já funciona indiretamente (a busca de pessoas acima
  // leva ao cadastro do cliente, que lista as vendas dele).
  const buscaPorNumero = /^\d+$/.test(consulta);

  const [pessoas, eventos, vendas] = await Promise.all([
    supabase
      .from("pessoas")
      .select("id, nome, perfis")
      .eq("tenant_id", contexto.tenantId)
      .ilike("nome", padrao)
      .order("nome")
      .limit(LIMITE_POR_CATEGORIA),
    supabase
      .from("eventos_financeiros")
      .select("id, tipo, descricao, valor_total")
      .eq("tenant_id", contexto.tenantId)
      .is("estornado_em", null)
      .ilike("descricao", padrao)
      .order("data_competencia", { ascending: false })
      .limit(LIMITE_POR_CATEGORIA),
    buscaPorNumero
      ? supabase
          .from("vendas")
          .select("id, numero, pessoas(nome)")
          .eq("tenant_id", contexto.tenantId)
          .eq("numero", Number(consulta))
          .limit(LIMITE_POR_CATEGORIA)
      : Promise.resolve({ data: [] as { id: string; numero: number; pessoas: { nome: string } | null }[] }),
  ]);

  const resultados: ResultadoBusca[] = [];

  for (const p of pessoas.data ?? []) {
    const ehCliente = (p.perfis ?? []).includes("CLIENTE");
    resultados.push({
      categoria: ehCliente ? "cliente" : "fornecedor",
      titulo: p.nome,
      subtitulo: ehCliente ? "Cliente" : "Fornecedor",
      href: ehCliente ? `/clientes/${p.id}` : `/fornecedores/${p.id}`,
    });
  }

  for (const e of eventos.data ?? []) {
    resultados.push({
      categoria: "lancamento",
      titulo: e.descricao ?? "",
      subtitulo: e.tipo === "RECEITA" ? "Receita" : "Despesa",
      href: e.tipo === "RECEITA" ? `/receitas/${e.id}` : `/despesas/${e.id}`,
    });
  }

  for (const v of vendas.data ?? []) {
    resultados.push({
      categoria: "venda",
      titulo: `Venda #${v.numero}`,
      subtitulo: v.pessoas?.nome ?? "",
      href: `/vendas/${v.id}`,
    });
  }

  return resultados;
}
