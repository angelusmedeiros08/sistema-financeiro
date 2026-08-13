import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";

type BaixaResumo = { valor_pago: number; estornado_em: string | null };

type ParcelaAberta = {
  id: string;
  valor: number;
  data_vencimento: string;
  status: string;
  baixas: BaixaResumo[] | null;
  eventos_financeiros: { descricao: string | null; pessoas: { nome: string } | null } | null;
};

// Cada linha navega pra página cheia de detalhe da parcela (ações de dar
// baixa, renegociar, histórico e cancelar vivem lá, não mais num dropdown
// aqui na tabela — ver docs/mapeamento-conta-azul-produto-ui.md §2.1).
export function TabelaParcelasAbertas({
  parcelas,
  textoVazio,
  caminhoBase,
}: {
  parcelas: ParcelaAberta[];
  textoVazio: string;
  caminhoBase: "contas-a-pagar" | "contas-a-receber";
}) {
  if (parcelas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {textoVazio}
      </p>
    );
  }

  const hojeISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Descrição</TableHead>
            <TableHead>Pessoa</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Em aberto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcelas.map((parcela) => {
            const baixas = parcela.baixas ?? [];
            const somaPaga = baixas
              .filter((b) => !b.estornado_em)
              .reduce((acc, b) => acc + Number(b.valor_pago), 0);
            const saldoResidual = Number(parcela.valor) - somaPaga;
            const atrasada =
              (parcela.status === "PENDENTE" || parcela.status === "RENEGOCIADO") &&
              parcela.data_vencimento < hojeISO;
            const chaveStatus = atrasada ? "ATRASADO" : parcela.status;
            const diasEmAtraso = atrasada
              ? Math.round((Date.parse(hojeISO) - Date.parse(parcela.data_vencimento)) / 86_400_000)
              : 0;
            const descricao = parcela.eventos_financeiros?.descricao ?? "Sem descrição";

            return (
              <TableRow key={parcela.id} className="cursor-pointer">
                <TableCell className="p-0">
                  <Link href={`/${caminhoBase}/${parcela.id}`} className="block px-4 py-3 font-medium text-foreground">
                    {descricao}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/${caminhoBase}/${parcela.id}`} className="block px-4 py-3 text-muted-foreground">
                    {parcela.eventos_financeiros?.pessoas?.nome ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/${caminhoBase}/${parcela.id}`} className="block px-4 py-3 text-muted-foreground">
                    {new Date(parcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/${caminhoBase}/${parcela.id}`} className="block px-4 py-3">
                    <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[chaveStatus])}>
                      {ROTULO_STATUS_PARCELA[chaveStatus] ?? chaveStatus}
                      {atrasada && ` · ${diasEmAtraso}d`}
                    </Badge>
                  </Link>
                </TableCell>
                <TableCell className="p-0 text-right">
                  <Link
                    href={`/${caminhoBase}/${parcela.id}`}
                    className="block px-4 py-3 font-semibold tabular-nums text-foreground"
                  >
                    {formatarMoeda(saldoResidual)}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
