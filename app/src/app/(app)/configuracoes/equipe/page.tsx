import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConfiguracoesSubNav } from "../sub-nav";
import { ConvidarForm } from "./convidar-form";
import { AcessoToggleButton } from "./acesso-toggle-button";

const ROTULO_PAPEL: Record<string, string> = {
  admin: "Admin",
  financeiro_senior: "Financeiro sênior",
  financeiro_junior: "Financeiro júnior",
  contador: "Contador",
  cliente_portal: "Cliente (portal)",
};

export default async function PaginaEquipe() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { data: membros } = await supabase
    .from("usuario_tenant")
    .select("usuario_id, papel, ativo, convidado_em, usuarios(nome, email)")
    .eq("tenant_id", contexto.tenantId)
    .order("convidado_em");

  const souAdmin = contexto.papel === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Equipe</h1>
      <ConfiguracoesSubNav />

      {souAdmin && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Convidar</h2>
          <ConvidarForm />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Membros</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Situação</TableHead>
                {souAdmin && <TableHead className="text-right">Ação</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(membros ?? []).map((m) => (
                <TableRow key={m.usuario_id}>
                  <TableCell className="font-medium text-foreground">{m.usuarios?.nome ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.usuarios?.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{ROTULO_PAPEL[m.papel] ?? m.papel}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-none font-semibold", m.ativo ? "bg-[#157F6B]/12 text-[#0F5F50]" : "bg-muted text-muted-foreground")}>
                      {m.ativo ? "Ativo" : "Revogado"}
                    </Badge>
                  </TableCell>
                  {souAdmin && (
                    <TableCell className="text-right">
                      {m.usuario_id !== contexto.user.id && <AcessoToggleButton usuarioId={m.usuario_id} ativo={m.ativo} />}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
