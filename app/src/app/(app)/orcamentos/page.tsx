import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarOrcamentos } from "@/lib/orcamentos-comerciais/orcamentos-comerciais";
import { Button } from "@/components/ui/button";
import { TabelaOrcamentos } from "./tabela-orcamentos";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusOrcamentoComercial = Database["public"]["Enums"]["status_orcamento_comercial"];

const FILTROS: { valor: string; rotulo: string; status?: StatusOrcamentoComercial }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "rascunho", rotulo: "Rascunho", status: "RASCUNHO" },
  { valor: "enviado", rotulo: "Enviado", status: "ENVIADO" },
  { valor: "aprovado", rotulo: "Aprovado", status: "APROVADO" },
  { valor: "recusado", rotulo: "Recusado", status: "RECUSADO" },
  { valor: "expirado", rotulo: "Expirado", status: "EXPIRADO" },
];

const TAMANHO_PAGINA = 20;

export default async function PaginaOrcamentos({ searchParams }: { searchParams: Promise<{ situacao?: string; pagina?: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { situacao = "todos", pagina: paginaBruta } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === situacao) ?? FILTROS[0];
  const pagina = Math.max(1, Number(paginaBruta) || 1);

  const supabase = await createClient();
  const { orcamentos, total } = await listarOrcamentos(supabase, contexto.tenantId, {
    status: filtro.status,
    pagina,
    tamanhoPagina: TAMANHO_PAGINA,
  });
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Orçamentos</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/orcamentos/nova">
            <Plus size={14} />
            Novo orçamento
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/orcamentos?situacao=${f.valor}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              filtro.valor === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      <TabelaOrcamentos
        orcamentos={orcamentos}
        paginacao={{ pagina, totalPaginas, totalRegistros: total, tamanhoPagina: TAMANHO_PAGINA, hrefBase: `/orcamentos?situacao=${filtro.valor}` }}
      />
    </div>
  );
}
