import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConfiguracoesSubNav } from "../sub-nav";
import { ConvidarForm } from "./convidar-form";
import { AcessoToggleButton } from "./acesso-toggle-button";
import { CancelarConviteButton } from "./cancelar-convite-button";

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
  const [{ data: membros }, { data: clientes }] = await Promise.all([
    supabase
      .from("usuario_tenant")
      .select("usuario_id, papel, ativo, senha_definida, convidado_em, usuarios(nome, email)")
      .eq("tenant_id", contexto.tenantId)
      .order("convidado_em"),
    supabase
      .from("pessoas")
      .select("id, nome")
      .eq("tenant_id", contexto.tenantId)
      .contains("perfis", ["CLIENTE"])
      .order("nome"),
  ]);

  const souAdmin = contexto.papel === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Equipe</h1>
      <ConfiguracoesSubNav />

      {souAdmin && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Convidar</h2>
          <ConvidarForm clientes={clientes ?? []} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Membros</h2>
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
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
              {(membros ?? []).map((m) => {
                // Independe de `ativo`: um convite pendente pode ter sido
                // revogado numa tentativa anterior sem nunca ter sido aceito
                // — nesse caso ainda precisa do botão de cancelar (que apaga
                // a conta de auth), não do de reativar. senha_definida (não
                // email_confirmed_at do Supabase) é o sinal certo: esse
                // último já fica true assim que a pessoa clica em "Aceitar
                // convite", antes de existir senha de verdade.
                const pendente = !m.senha_definida;
                return (
                  <TableRow key={m.usuario_id}>
                    <TableCell className="font-medium text-foreground">{m.usuarios?.nome ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.usuarios?.email ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{ROTULO_PAPEL[m.papel] ?? m.papel}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border-none font-semibold",
                          pendente
                            ? "bg-amber-500/12 text-amber-700"
                            : m.ativo
                              ? "bg-[#157F6B]/12 text-[#0F5F50]"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {pendente ? "Convite pendente" : m.ativo ? "Ativo" : "Revogado"}
                      </Badge>
                    </TableCell>
                    {souAdmin && (
                      <TableCell className="text-right">
                        {m.usuario_id !== contexto.user.id &&
                          (pendente ? (
                            <CancelarConviteButton usuarioId={m.usuario_id} />
                          ) : (
                            <AcessoToggleButton usuarioId={m.usuario_id} ativo={m.ativo} />
                          ))}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
