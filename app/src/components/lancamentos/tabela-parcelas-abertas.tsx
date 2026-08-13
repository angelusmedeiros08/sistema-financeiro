import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";
import { AcoesParcela } from "./acoes-parcela";
import type { BaixaHistorico } from "./historico-baixas-sheet";

type ParcelaAberta = {
  id: string;
  valor: number;
  data_vencimento: string;
  status: string;
  baixas: BaixaHistorico[] | null;
  eventos_financeiros: { descricao: string | null; pessoas: { nome: string } | null } | null;
};

type ContaFinanceira = { id: string; nome: string };

export function TabelaParcelasAbertas({
  parcelas,
  contasFinanceiras,
  textoVazio,
  rotuloAcaoBaixa,
}: {
  parcelas: ParcelaAberta[];
  contasFinanceiras: ContaFinanceira[];
  textoVazio: string;
  rotuloAcaoBaixa: string;
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
            <TableHead className="text-right">Ação</TableHead>
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
              <TableRow key={parcela.id}>
                <TableCell className="font-medium text-foreground">{descricao}</TableCell>
                <TableCell className="text-muted-foreground">
                  {parcela.eventos_financeiros?.pessoas?.nome ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(parcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-none font-semibold", COR_STATUS_PARCELA[chaveStatus])}>
                    {ROTULO_STATUS_PARCELA[chaveStatus] ?? chaveStatus}
                    {atrasada && ` · ${diasEmAtraso}d`}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-foreground">
                  {formatarMoeda(saldoResidual)}
                </TableCell>
                <TableCell className="text-right">
                  <AcoesParcela
                    parcelaId={parcela.id}
                    descricao={descricao}
                    valor={Number(parcela.valor)}
                    dataVencimento={parcela.data_vencimento}
                    saldoResidual={saldoResidual}
                    status={parcela.status}
                    baixas={baixas}
                    contasFinanceiras={contasFinanceiras}
                    rotuloAcaoBaixa={rotuloAcaoBaixa}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
