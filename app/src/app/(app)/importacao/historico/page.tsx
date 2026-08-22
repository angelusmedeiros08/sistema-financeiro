import Link from "next/link";
import { redirect } from "next/navigation";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarImportacoes } from "@/lib/importacoes/importacoes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BadgeStatusImportacao } from "./badge-status";

const ROTULO_TIPO: Record<string, string> = {
  pessoas: "Clientes/Fornecedores",
};

export default async function PaginaHistoricoImportacoes() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const importacoes = await listarImportacoes(supabase, contexto.tenantId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/importacao" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          ← Importação
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Central de Importações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Histórico de lotes importados, com resultado linha a linha, retomar e desfazer.</p>
      </div>

      {importacoes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ClockCounterClockwise size={20} />
          </span>
          <p className="text-sm text-muted-foreground">Nenhuma importação registrada ainda.</p>
          <Link href="/importacao" className="text-sm font-medium text-primary">
            Ir para Importação
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Importado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importacoes.map((i) => (
                <TableRow key={i.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/importacao/historico/${i.id}`} className="block font-medium text-foreground">
                      {i.nomeArquivo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ROTULO_TIPO[i.tipo] ?? i.tipo}</TableCell>
                  <TableCell className="text-muted-foreground">{i.criadoPorNome ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(i.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="text-positivo-foreground">{i.sucessos} ok</span>
                    {i.erros > 0 && <span className="text-destructive"> · {i.erros} erro{i.erros > 1 ? "s" : ""}</span>}
                    {i.pendentes > 0 && <span> · {i.pendentes} pendente{i.pendentes > 1 ? "s" : ""}</span>}
                  </TableCell>
                  <TableCell>
                    <BadgeStatusImportacao status={i.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
