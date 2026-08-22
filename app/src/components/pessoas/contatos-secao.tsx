"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Database } from "@/utils/supabase/database.types";
import { salvarContatoAction } from "@/lib/pessoas/pessoas-actions";

type Contato = Database["public"]["Tables"]["pessoa_contatos"]["Row"];

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const estadoInicial = { erro: "" };

function ContatoForm({
  pessoaId,
  contatoBase,
  aoConcluir,
}: {
  pessoaId: string;
  contatoBase?: Contato;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [principal, setPrincipal] = useState(contatoBase?.principal ?? false);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await salvarContatoAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    router.refresh();
    aoConcluir();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
      <input type="hidden" name="pessoa_id" value={pessoaId} />
      {contatoBase && <input type="hidden" name="contato_id" value={contatoBase.id} />}
      <input type="hidden" name="principal" value={principal ? "true" : "false"} />

      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input name="nome_contato" required defaultValue={contatoBase?.nome ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Cargo</Label>
        <Input name="cargo" defaultValue={contatoBase?.cargo ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <Input name="email_contato" type="email" defaultValue={contatoBase?.email ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Telefone</Label>
        <Input name="telefone_contato" defaultValue={contatoBase?.telefone ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <Checkbox checked={principal} onCheckedChange={(v) => setPrincipal(v === true)} />
        Definir como contato principal
      </label>

      {estado.erro && <p className="text-sm text-destructive sm:col-span-2">{estado.erro}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={aoConcluir}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ContatosSecao({ pessoaId, contatos }: { pessoaId: string; contatos: Contato[] }) {
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const ativos = contatos.filter((c) => !c.substituido_em);
  const historico = contatos.filter((c) => c.substituido_em);

  return (
    <section className="rounded-2xl bg-card shadow-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contatos</h2>
        <button
          type="button"
          onClick={() => {
            setModoAdicionar((v) => !v);
            setEditandoId(null);
          }}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {modoAdicionar ? "Fechar" : "Adicionar contato"}
        </button>
      </div>

      {ativos.length === 0 && !modoAdicionar && (
        <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
      )}

      <ul className="flex flex-col gap-2">
        {ativos.map((c) => (
          <li key={c.id}>
            {editandoId === c.id ? (
              <ContatoForm pessoaId={pessoaId} contatoBase={c} aoConcluir={() => setEditandoId(null)} />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.nome}</span>
                    {c.cargo && <span className="text-xs text-muted-foreground">{c.cargo}</span>}
                    {c.principal && <Badge className="border-none bg-positivo/12 font-semibold text-positivo-foreground">Principal</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {[c.email, c.telefone].filter(Boolean).join(" · ") || "Sem e-mail/telefone"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditandoId(c.id)}>
                  Editar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {modoAdicionar && (
        <div className="mt-3">
          <ContatoForm pessoaId={pessoaId} aoConcluir={() => setModoAdicionar(false)} />
        </div>
      )}

      {historico.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setMostrarHistorico((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {mostrarHistorico ? "Ocultar histórico" : "Ver histórico"}
          </button>
          {mostrarHistorico && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {historico.map((c) => (
                <li key={c.id} className="text-xs text-muted-foreground">
                  <span className="line-through">{c.nome} {[c.email, c.telefone].filter(Boolean).join(" · ")}</span> (substituído em{" "}
                  {formatarData(c.substituido_em!)})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
