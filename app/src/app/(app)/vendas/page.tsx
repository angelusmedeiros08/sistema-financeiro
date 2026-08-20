import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarVendas } from "@/lib/vendas/vendas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type StatusVenda = Database["public"]["Enums"]["status_venda"];

const FILTROS: { valor: string; rotulo: string; status?: StatusVenda }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "rascunho", rotulo: "Rascunho", status: "RASCUNHO" },
  { valor: "enviado", rotulo: "Enviado", status: "ENVIADO" },
  { valor: "aprovada", rotulo: "Aprovada", status: "APROVADO" },
  { valor: "recusada", rotulo: "Recusada", status: "RECUSADO" },
];

function badgeStatus(status: StatusVenda) {
  const mapa: Record<StatusVenda, { rotulo: string; className: string }> = {
    RASCUNHO: { rotulo: "Rascunho", className: "bg-muted text-muted-foreground" },
    ENVIADO: { rotulo: "Enviado", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
    APROVADO: { rotulo: "Aprovada", className: "bg-[#157F6B]/12 text-[#0F5F50]" },
    RECUSADO: { rotulo: "Recusada", className: "bg-[#B23A2E]/12 text-[#B23A2E]" },
  };
  const { rotulo, className } = mapa[status];
  return <Badge variant="outline" className={cn("border-none text-[10px] font-semibold", className)}>{rotulo}</Badge>;
}

export default async function PaginaVendas({ searchParams }: { searchParams: Promise<{ situacao?: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { situacao = "todas" } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === situacao) ?? FILTROS[0];

  const supabase = await createClient();
  const vendas = await listarVendas(supabase, contexto.tenantId, { status: filtro.status });

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

      <div className="flex gap-1">
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

      {vendas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma venda nessa situação.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map((venda) => (
                <TableRow key={venda.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/vendas/${venda.id}`} className="block font-medium text-foreground">
                      #{venda.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{venda.pessoaNome}</TableCell>
                  <TableCell className="text-muted-foreground">{formatarDataIsoParaBR(venda.dataEmissao)}</TableCell>
                  <TableCell>{badgeStatus(venda.status)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarMoeda(venda.valorTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
