import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { NovaDespesaForm } from "./novo-despesa-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";

export default async function PaginaDespesas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { tenantId } = contexto;

  const supabase = await createClient();

  const [{ data: categorias }, { data: eventos }] = await Promise.all([
    supabase
      .from("categorias_financeiras")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("tipo", "DESPESA")
      .order("nome"),
    supabase
      .from("eventos_financeiros")
      .select(
        "id, descricao, valor_total, data_competencia, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))",
      )
      .eq("tenant_id", tenantId)
      .eq("tipo", "DESPESA")
      .order("data_competencia", { ascending: false }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Despesas</h1>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Nova despesa
        </h2>
        <NovaDespesaForm categorias={categorias ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Lançadas
        </h2>
        {!eventos || eventos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma despesa registrada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.map((evento) => {
                  const parcela = evento.parcelas?.[0];
                  const categoriaNome = evento.rateio_categoria?.[0]?.categorias_financeiras?.nome;
                  return (
                    <TableRow key={evento.id}>
                      <TableCell className="font-medium text-foreground">{evento.descricao}</TableCell>
                      <TableCell className="text-muted-foreground">{categoriaNome ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {parcela?.data_vencimento
                          ? new Date(parcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {parcela?.status ? (
                          <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[parcela.status])}>
                            {ROTULO_STATUS_PARCELA[parcela.status] ?? parcela.status}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-foreground">
                        {formatarMoeda(evento.valor_total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
