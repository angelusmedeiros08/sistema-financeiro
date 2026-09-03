import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarPlanoDeContas } from "@/lib/contabil/plano-contas";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NovaContaForm } from "./nova-conta-form";
import { ContaLinha } from "./conta-linha";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaPlanoDeContas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const contas = await listarPlanoDeContas(supabase, { tenantId: contexto.tenantId });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <TituloPagina>Plano de contas</TituloPagina>

      <p className="text-sm text-muted-foreground">
        Estrutura contábil formal do tenant — cada categoria usada nos lançamentos aponta pra uma dessas contas. Contas com{" "}
        <span className="font-semibold">cadeado</span> são usadas internamente pelo sistema: dá pra reclassificar (mudar a conta pai) e
        anotar o código do SPED, mas nome, tipo e natureza ficam fixos.
      </p>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Nova conta</h2>
        <NovaContaForm contas={contas} />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Contas cadastradas</h2>
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead>SPED</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => (
                <ContaLinha key={conta.id} conta={conta} todasContas={contas} />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
