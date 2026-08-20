import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarCamposPersonalizados } from "@/lib/pessoas/buscar-pessoa";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConfiguracoesSubNav } from "../sub-nav";
import { NovoCampoForm } from "./novo-campo-form";
import { RemoverCampoButton } from "./remover-campo-button";

const ROTULO_TIPO: Record<string, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  DATA: "Data",
  BOOLEANO: "Sim/Não",
};

const ROTULO_APLICA_A: Record<string, string> = {
  AMBOS: "Clientes e fornecedores",
  CLIENTE: "Só clientes",
  FORNECEDOR: "Só fornecedores",
};

export default async function PaginaCamposPersonalizados() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const campos = await listarCamposPersonalizados(supabase, { tenant_id: contexto.tenantId });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Campos personalizados</h1>
      <ConfiguracoesSubNav />
      <p className="text-sm text-muted-foreground">
        Campos adicionais que aparecem no cadastro de clientes e fornecedores, além dos que já vêm no sistema.
      </p>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Novo campo</h2>
        <NovoCampoForm />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cadastrados</h2>
        {campos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum campo personalizado cadastrado ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Rótulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.rotulo}</TableCell>
                    <TableCell className="text-muted-foreground">{ROTULO_TIPO[c.tipo] ?? c.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">{ROTULO_APLICA_A[c.aplica_a] ?? c.aplica_a}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-none font-semibold", c.disponivel ? "bg-[#157F6B]/12 text-[#0F5F50]" : "bg-muted text-muted-foreground")}>
                        {c.disponivel ? "Ativo" : "Removido"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.disponivel && <RemoverCampoButton campoId={c.id} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
