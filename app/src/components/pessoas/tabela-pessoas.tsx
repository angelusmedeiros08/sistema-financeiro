import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LinhaPessoa } from "@/lib/pessoas/buscar-pessoa";

export function TabelaPessoas({
  pessoas,
  caminhoBase,
  textoVazio,
}: {
  pessoas: LinhaPessoa[];
  caminhoBase: "clientes" | "fornecedores";
  textoVazio: string;
}) {
  if (pessoas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {textoVazio}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Cidade/UF</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pessoas.map((p) => (
            <TableRow key={p.id} className="cursor-pointer">
              <TableCell className="p-0">
                <Link href={`/${caminhoBase}/${p.id}`} className="block px-4 py-2.5 font-medium text-foreground">
                  {p.nome}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.documento ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{p.email ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{p.telefone ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{p.cidade && p.uf ? `${p.cidade}/${p.uf}` : "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
