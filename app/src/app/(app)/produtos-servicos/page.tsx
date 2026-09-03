import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarProdutosServicos } from "@/lib/produtos-servicos/produtos-servicos";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { NovoProdutoServicoForm } from "./novo-produto-servico-form";
import { TabelaProdutosServicos } from "./tabela-produtos-servicos";
import { TituloPagina } from "@/components/layout/titulo-pagina";

const TAMANHO_PAGINA = 20;

export default async function PaginaProdutosServicos({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { pagina: paginaBruta } = await searchParams;
  const pagina = Math.max(1, Number(paginaBruta) || 1);

  const supabase = await createClient();
  const [{ itens: produtosServicos, total }, categoriasResultado] = await Promise.all([
    listarProdutosServicos(supabase, contexto.tenantId, { pagina, tamanhoPagina: TAMANHO_PAGINA }),
    supabase.from("categorias_financeiras").select("id, nome").eq("tenant_id", contexto.tenantId).eq("tipo", "RECEITA").order("nome"),
  ]);
  const categoriasReceita = categoriasResultado.data ?? [];
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <TituloPagina>Produtos e serviços</TituloPagina>
        <p className="mt-1 text-sm text-muted-foreground">O catálogo que alimenta a tela de Vendas.</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Novo item</h2>
        {categoriasReceita.length === 0 ? (
          <EstadoVazio texto="Cadastre ao menos uma categoria de receita em Configurações → Categorias antes de criar um produto ou serviço." />
        ) : (
          <NovoProdutoServicoForm categoriasReceita={categoriasReceita} />
        )}
      </section>

      <section>
        <TabelaProdutosServicos
          produtosServicos={produtosServicos}
          categoriasReceita={categoriasReceita}
          paginacao={{ pagina, totalPaginas, totalRegistros: total, tamanhoPagina: TAMANHO_PAGINA, hrefBase: "/produtos-servicos" }}
        />
      </section>
    </div>
  );
}
