import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TagCategoria } from "@/components/ui/tag-categoria";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";

type EventoLinha = {
  id: string;
  descricao: string | null;
  valor_total: number;
  parcelas: { status: string; data_vencimento: string }[] | null;
  rateio_categoria: { categorias_financeiras: { nome: string } | null }[] | null;
};

export function TabelaEventos({ eventos, textoVazio }: { eventos: EventoLinha[]; textoVazio: string }) {
  if (eventos.length === 0) {
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
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((evento) => {
            const parcelas = evento.parcelas ?? [];
            const primeiraParcela = parcelas[0];
            const linhasRateio = evento.rateio_categoria ?? [];
            const categoriaNome = linhasRateio[0]?.categorias_financeiras?.nome;
            const outrasCategorias = linhasRateio.length - 1;
            return (
              <TableRow key={evento.id}>
                <TableCell className="font-medium text-foreground">{evento.descricao ?? "Sem descrição"}</TableCell>
                <TableCell>
                  {categoriaNome ? (
                    <span className="inline-flex items-center gap-1">
                      <TagCategoria nome={categoriaNome} />
                      {outrasCategorias > 0 && <span className="text-xs text-muted-foreground">+{outrasCategorias}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {primeiraParcela
                    ? new Date(primeiraParcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
                    : "-"}
                  {parcelas.length > 1 && <span className="ml-1 text-xs">({parcelas.length}x)</span>}
                </TableCell>
                <TableCell>
                  {primeiraParcela ? (
                    <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[primeiraParcela.status])}>
                      {ROTULO_STATUS_PARCELA[primeiraParcela.status] ?? primeiraParcela.status}
                    </Badge>
                  ) : (
                    "-"
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
  );
}
