import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarVendas } from "@/lib/vendas/vendas";
import { Button } from "@/components/ui/button";
import { TabelaVendas } from "./tabela-vendas";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

const FILTROS: { valor: string; rotulo: string; status?: StatusVenda }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "rascunho", rotulo: "Rascunho", status: "RASCUNHO" },
  { valor: "enviado", rotulo: "Enviado", status: "ENVIADO" },
  { valor: "aprovada", rotulo: "Aprovada", status: "APROVADO" },
  { valor: "recusada", rotulo: "Recusada", status: "RECUSADO" },
  { valor: "expirado", rotulo: "Expirado", status: "EXPIRADO" },
];

const TAMANHO_PAGINA = 20;

export default async function PaginaVendas({ searchParams }: { searchParams: Promise<{ situacao?: string; pagina?: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { situacao = "todas", pagina: paginaBruta } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === situacao) ?? FILTROS[0];
  const pagina = Math.max(1, Number(paginaBruta) || 1);

  const supabase = await createClient();
  const { vendas, total } = await listarVendas(supabase, contexto.tenantId, {
    status: filtro.status,
    pagina,
    tamanhoPagina: TAMANHO_PAGINA,
  });
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Vendas</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/vendas/nova">
            <Plus size={14} />
            Nova venda
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/vendas?situacao=${f.valor}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              filtro.valor === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      <TabelaVendas
        vendas={vendas}
        paginacao={{ pagina, totalPaginas, totalRegistros: total, tamanhoPagina: TAMANHO_PAGINA, hrefBase: `/vendas?situacao=${filtro.valor}` }}
      />
    </div>
  );
}
