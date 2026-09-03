import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarPessoas } from "@/lib/pessoas/buscar-pessoa";
import { TabelaPessoas } from "@/components/pessoas/tabela-pessoas";
import { CtaImportarPessoas } from "@/components/pessoas/cta-importar-pessoas";
import { Button } from "@/components/ui/button";
import { TituloPagina } from "@/components/layout/titulo-pagina";

const TAMANHO_PAGINA = 20;

export default async function PaginaClientes({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { pagina: paginaBruta } = await searchParams;
  const pagina = Math.max(1, Number(paginaBruta) || 1);

  const supabase = await createClient();
  const { pessoas: clientes, total } = await listarPessoas(supabase, {
    tenant_id: contexto.tenantId,
    perfil: "CLIENTE",
    pagina,
    tamanhoPagina: TAMANHO_PAGINA,
  });
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina>Clientes</TituloPagina>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/clientes/novo">
            <Plus size={15} weight="bold" />
            Novo cliente
          </Link>
        </Button>
      </div>

      {total === 0 ? (
        <CtaImportarPessoas rotulo="cliente" />
      ) : (
        <TabelaPessoas
          pessoas={clientes}
          caminhoBase="clientes"
          textoVazio="Nenhum cliente encontrado."
          paginacao={{ pagina, totalPaginas, totalRegistros: total, tamanhoPagina: TAMANHO_PAGINA, hrefBase: "/clientes" }}
        />
      )}
    </div>
  );
}
