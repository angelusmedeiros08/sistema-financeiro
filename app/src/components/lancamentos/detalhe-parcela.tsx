"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsThree } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarMoeda } from "@/lib/formatacao";
import { ROTULO_STATUS_PARCELA, COR_STATUS_PARCELA } from "@/lib/status-parcela";
import { cn } from "@/lib/utils";
import { estornarBaixaAction } from "@/lib/contabil/ciclo-vida-parcela-actions";
import { AnexosLista, type Anexo } from "./anexos-lista";
import { AnexoForm } from "./anexo-form";
import { CancelarDialog } from "./cancelar-dialog";

type Baixa = {
  id: string;
  data_pagamento: string;
  valor_pago: number;
  valor_juros: number;
  valor_multa: number;
  valor_desconto: number;
  valor_taxa: number;
  estornado_em: string | null;
  anexos: Anexo[];
};

type Renegociacao = {
  id: string;
  data_vencimento_anterior: string;
  data_vencimento_nova: string;
  motivo: string;
  criado_em: string;
};

export type DadosParcela = {
  id: string;
  numero: number;
  valor: number;
  data_vencimento: string;
  status: string;
  motivo_cancelamento: string | null;
  descricao: string;
  pessoaNome: string | null;
  dataCompetencia: string;
  categorias: { nome: string; valor: number; centrosCusto: { nome: string; valor: number }[] }[];
  eventoFinanceiroId: string;
  anexosEvento: Anexo[];
  baixas: Baixa[];
  renegociacoes: Renegociacao[];
};

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function LinhaBaixa({ baixa, caminhoPagina }: { baixa: Baixa; caminhoPagina: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [mostrarAnexo, setMostrarAnexo] = useState(false);
  const router = useRouter();

  const composicao = [
    baixa.valor_juros > 0 && `juros ${formatarMoeda(baixa.valor_juros)}`,
    baixa.valor_multa > 0 && `multa ${formatarMoeda(baixa.valor_multa)}`,
    baixa.valor_desconto > 0 && `desconto ${formatarMoeda(baixa.valor_desconto)}`,
    baixa.valor_taxa > 0 && `taxa ${formatarMoeda(baixa.valor_taxa)}`,
  ]
    .filter(Boolean)
    .join(", ");

  async function acionarEstorno() {
    const formData = new FormData();
    formData.set("baixa_id", baixa.id);
    await estornarBaixaAction(formData);
    router.refresh();
  }

  return (
    <>
      <TableRow>
        <TableCell>{formatarData(baixa.data_pagamento)}</TableCell>
        <TableCell className="text-right tabular-nums">{formatarMoeda(baixa.valor_pago)}</TableCell>
        <TableCell className="text-muted-foreground">{composicao || "-"}</TableCell>
        <TableCell>
          {baixa.anexos.length > 0 ? (
            <AnexosLista anexos={baixa.anexos} />
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          {baixa.estornado_em ? (
            <Badge className="border-none bg-muted font-semibold text-muted-foreground">Estornada</Badge>
          ) : (
            <Badge className="border-none bg-[#157F6B]/12 font-semibold text-[#0F5F50]">Válida</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                Ações
                <DotsThree size={15} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setMostrarAnexo((v) => !v)}>Anexar comprovante</DropdownMenuItem>
              {!baixa.estornado_em && (
                <DropdownMenuItem variant="destructive" disabled={pendente} onSelect={() => iniciarTransicao(acionarEstorno)}>
                  {pendente ? "Estornando..." : "Estornar"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {mostrarAnexo && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <AnexoForm
              donoTipo="baixa_id"
              donoId={baixa.id}
              caminhoPagina={caminhoPagina}
              aoConcluir={() => setMostrarAnexo(false)}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function DetalheParcela({
  parcela,
  caminhoBase,
  rotuloAcaoBaixa,
}: {
  parcela: DadosParcela;
  caminhoBase: "contas-a-pagar" | "contas-a-receber";
  rotuloAcaoBaixa: string;
}) {
  const [mostrarAnexoEvento, setMostrarAnexoEvento] = useState(false);
  const [cancelarAberto, setCancelarAberto] = useState(false);

  const caminhoPagina = `/${caminhoBase}/${parcela.id}`;
  const somaPaga = parcela.baixas
    .filter((b) => !b.estornado_em)
    .reduce((acc, b) => acc + b.valor_pago, 0);
  const saldoResidual = parcela.valor - somaPaga;
  const temBaixaValida = parcela.baixas.some((b) => !b.estornado_em);

  const podeReceberBaixa = ["PENDENTE", "RECEBIDO_PARCIAL", "RENEGOCIADO"].includes(parcela.status);
  const podeRenegociar = !["QUITADO", "CANCELADO"].includes(parcela.status);
  const podeCancelar = parcela.status === "PENDENTE" && !temBaixaValida;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${caminhoBase}`} className="hover:text-foreground">
            {caminhoBase === "contas-a-pagar" ? "Contas a pagar" : "Contas a receber"}
          </Link>
          <span>/</span>
          <span className="text-foreground">Parcela {parcela.numero}</span>
        </div>
        <div className="flex gap-2">
          {podeReceberBaixa && (
            <Button asChild size="sm">
              <Link href={`${caminhoPagina}/baixa`}>{rotuloAcaoBaixa}</Link>
            </Button>
          )}
          {podeRenegociar && (
            <Button asChild size="sm" variant="outline">
              <Link href={`${caminhoPagina}/renegociar`}>Renegociar</Link>
            </Button>
          )}
          {podeCancelar && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelarAberto(true)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-2xl bg-card shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{parcela.descricao}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {parcela.pessoaNome ?? "Sem pessoa vinculada"} · competência {formatarData(parcela.dataCompetencia)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatarMoeda(parcela.valor)}</p>
            <Badge className={cn("mt-1 border-none font-semibold", COR_STATUS_PARCELA[parcela.status])}>
              {ROTULO_STATUS_PARCELA[parcela.status] ?? parcela.status}
            </Badge>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Vencimento</dt>
            <dd className="font-medium text-foreground">{formatarData(parcela.data_vencimento)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pago</dt>
            <dd className="font-medium text-foreground">{formatarMoeda(somaPaga)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Em aberto</dt>
            <dd className="font-medium text-foreground">{formatarMoeda(saldoResidual)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Categoria(s)</dt>
            <dd className="font-medium text-foreground">{parcela.categorias.map((c) => c.nome).join(", ") || "-"}</dd>
          </div>
        </dl>

        {parcela.motivo_cancelamento && (
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Motivo do cancelamento:</span> {parcela.motivo_cancelamento}
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Anexos do lançamento</h2>
            <button
              type="button"
              onClick={() => setMostrarAnexoEvento((v) => !v)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {mostrarAnexoEvento ? "Fechar" : "Adicionar anexo"}
            </button>
          </div>
          {parcela.anexosEvento.length > 0 ? (
            <AnexosLista anexos={parcela.anexosEvento} />
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
          )}
          {mostrarAnexoEvento && (
            <div className="mt-3 rounded-xl border border-border p-3">
              <AnexoForm
                donoTipo="evento_financeiro_id"
                donoId={parcela.eventoFinanceiroId}
                caminhoPagina={caminhoPagina}
                aoConcluir={() => setMostrarAnexoEvento(false)}
              />
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Pagamentos</h2>
        {parcela.baixas.length === 0 ? (
          <EstadoVazio texto="Nenhum pagamento registrado ainda." />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Composição</TableHead>
                  <TableHead>Comprovante</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcela.baixas.map((baixa) => (
                  <LinhaBaixa key={baixa.id} baixa={baixa} caminhoPagina={caminhoPagina} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {parcela.renegociacoes.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Histórico de renegociação</h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-card divide-y divide-border">
            {parcela.renegociacoes.map((r) => (
              <div key={r.id} className="p-4 text-sm">
                <p className="font-medium text-foreground">
                  {formatarData(r.data_vencimento_anterior)} → {formatarData(r.data_vencimento_nova)}
                </p>
                <p className="text-muted-foreground">{r.motivo}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <CancelarDialog aberto={cancelarAberto} onAbertoChange={setCancelarAberto} parcelaId={parcela.id} descricao={parcela.descricao} />
    </div>
  );
}
