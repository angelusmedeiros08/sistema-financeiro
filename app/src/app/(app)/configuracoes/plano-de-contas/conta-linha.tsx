"use client";

import { useActionState, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { editarContaContabilAction } from "@/lib/contabil/plano-contas-actions";
import type { ContaContabilComNivel } from "@/lib/contabil/plano-contas";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const estadoInicial = { erro: "" };

const OPCOES_TIPO = [
  { valor: "ATIVO", rotulo: "Ativo" },
  { valor: "PASSIVO", rotulo: "Passivo" },
  { valor: "PATRIMONIO_LIQUIDO", rotulo: "Patrimônio líquido" },
  { valor: "RECEITA", rotulo: "Receita" },
  { valor: "DESPESA", rotulo: "Despesa" },
] as const;

const OPCOES_NATUREZA = [
  { valor: "DEVEDORA", rotulo: "Devedora" },
  { valor: "CREDORA", rotulo: "Credora" },
] as const;

const ROTULO_TIPO: Record<string, string> = Object.fromEntries(OPCOES_TIPO.map((t) => [t.valor, t.rotulo]));

// Mesma leitura positivo/negativo já usada na DRE (receita e ativo puxam pra
// teal, despesa e passivo pra coral) — o ponto colorido deixa a coluna
// Tipo escaneável sem precisar ler o texto linha a linha.
const COR_TIPO: Record<string, string> = {
  ATIVO: "var(--positivo)",
  RECEITA: "var(--positivo)",
  PASSIVO: "var(--destructive)",
  DESPESA: "var(--destructive)",
  PATRIMONIO_LIQUIDO: "#7A8B5C",
};

export function ContaLinha({ conta, todasContas }: { conta: ContaContabilComNivel; todasContas: ContaContabilComNivel[] }) {
  const [editando, setEditando] = useState(false);
  const opcoesConteudoPai = todasContas.filter((c) => c.id !== conta.id);
  const ehGrupo = conta.nivel === 0;

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    formData.set("conta_id", conta.id);
    const resultado = await editarContaContabilAction(formData);
    notificarResultado(resultado, "Conta contábil salva.");
    if ("erro" in resultado) return { erro: resultado.erro };
    setEditando(false);
    return { erro: "" };
  }, estadoInicial);

  if (!editando) {
    return (
      <TableRow className={ehGrupo ? "bg-muted/40" : undefined}>
        <TableCell className={cn("tabular-nums text-muted-foreground", ehGrupo && "font-bold text-foreground")}>{conta.codigo}</TableCell>
        <TableCell className={cn("text-foreground", ehGrupo ? "font-bold" : "font-medium")} style={{ paddingLeft: `${12 + conta.nivel * 20}px` }}>
          <span className="flex items-center gap-1.5">
            {conta.nome}
            {conta.sistema && (
              <Badge className="border-none bg-muted font-medium text-muted-foreground" title="Nome, tipo e natureza fixos pelo sistema">
                Sistema
              </Badge>
            )}
          </span>
        </TableCell>
        <TableCell className={cn("text-muted-foreground", ehGrupo && "font-bold")}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 shrink-0 rounded-full" style={{ background: COR_TIPO[conta.tipo] }} />
            {ROTULO_TIPO[conta.tipo]}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={cn("border-none font-semibold", conta.natureza === "DEVEDORA" ? "bg-[#7A8B5C]/12 text-[#4F5C3A]" : "bg-positivo/12 text-positivo-foreground")}>
            {conta.natureza === "DEVEDORA" ? "Devedora" : "Credora"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground tabular-nums">{conta.codigoReferencialSped || "-"}</TableCell>
        <TableCell className="text-right">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(true)}>
            <PencilSimple size={14} />
            Editar
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={6} className="whitespace-normal border-l-2 border-l-primary bg-muted/30 align-top">
        <form action={formAction} className="grid gap-3 py-1 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Código</span>
            <p className="flex h-9 items-center text-sm tabular-nums text-muted-foreground">{conta.codigo}</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Nome</span>
            {conta.sistema ? (
              <p className="flex h-9 items-center text-sm text-foreground">{conta.nome}</p>
            ) : (
              <Input name="nome" type="text" defaultValue={conta.nome} required />
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Tipo</span>
            {conta.sistema ? (
              <p className="flex h-9 items-center text-sm text-foreground">{ROTULO_TIPO[conta.tipo]}</p>
            ) : (
              <Select name="tipo" defaultValue={conta.tipo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_TIPO.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Natureza</span>
            {conta.sistema ? (
              <p className="flex h-9 items-center text-sm text-foreground">{conta.natureza === "DEVEDORA" ? "Devedora" : "Credora"}</p>
            ) : (
              <Select name="natureza" defaultValue={conta.natureza}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_NATUREZA.map((n) => (
                    <SelectItem key={n.valor} value={n.valor}>
                      {n.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Conta pai</span>
            <Select name="conta_pai_id" defaultValue={conta.contaPaiId ?? undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nenhuma (raiz)" />
              </SelectTrigger>
              <SelectContent>
                {opcoesConteudoPai.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Código referencial SPED</span>
            <Input name="codigo_referencial_sped" type="text" defaultValue={conta.codigoReferencialSped ?? ""} placeholder="Opcional" />
          </div>

          <div className="flex items-end gap-2 lg:col-span-5">
            <Button type="submit" size="sm" disabled={pendente}>
              {pendente ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)} disabled={pendente}>
              Cancelar
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}
