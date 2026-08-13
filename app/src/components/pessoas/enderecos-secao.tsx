"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/utils/supabase/database.types";
import { salvarEnderecoAction } from "@/lib/pessoas/pessoas-actions";

type Endereco = Database["public"]["Tables"]["pessoa_enderecos"]["Row"];

const ROTULO_TIPO: Record<string, string> = {
  COMERCIAL: "Comercial",
  COBRANCA: "Cobrança",
  ENTREGA: "Entrega",
  OUTRO: "Outro",
};

function formatarLinha(e: Endereco) {
  const partes = [
    e.logradouro && e.numero ? `${e.logradouro}, ${e.numero}` : e.logradouro,
    e.bairro,
    e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade,
    e.cep,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : "Endereço incompleto";
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const estadoInicial = { erro: "" };

function EnderecoForm({
  pessoaId,
  enderecoBase,
  aoConcluir,
}: {
  pessoaId: string;
  enderecoBase?: Endereco;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [principal, setPrincipal] = useState(enderecoBase?.principal ?? false);

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await salvarEnderecoAction(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    router.refresh();
    aoConcluir();
    return { erro: "" };
  }, estadoInicial);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
      <input type="hidden" name="pessoa_id" value={pessoaId} />
      {enderecoBase && <input type="hidden" name="endereco_id" value={enderecoBase.id} />}
      <input type="hidden" name="principal" value={principal ? "true" : "false"} />

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select name="tipo" defaultValue={enderecoBase?.tipo ?? "COMERCIAL"}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROTULO_TIPO).map(([valor, rotulo]) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>CEP</Label>
        <Input name="cep" defaultValue={enderecoBase?.cep ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Logradouro</Label>
        <Input name="logradouro" defaultValue={enderecoBase?.logradouro ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Número</Label>
        <Input name="numero" defaultValue={enderecoBase?.numero ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Complemento</Label>
        <Input name="complemento" defaultValue={enderecoBase?.complemento ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Bairro</Label>
        <Input name="bairro" defaultValue={enderecoBase?.bairro ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>Cidade</Label>
        <Input name="cidade" defaultValue={enderecoBase?.cidade ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label>UF</Label>
        <Input name="uf" maxLength={2} defaultValue={enderecoBase?.uf ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <Checkbox checked={principal} onCheckedChange={(v) => setPrincipal(v === true)} />
        Definir como endereço principal
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

export function EnderecosSecao({ pessoaId, enderecos }: { pessoaId: string; enderecos: Endereco[] }) {
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const ativos = enderecos.filter((e) => !e.substituido_em);
  const historico = enderecos.filter((e) => e.substituido_em);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Endereços</h2>
        <button
          type="button"
          onClick={() => {
            setModoAdicionar((v) => !v);
            setEditandoId(null);
          }}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {modoAdicionar ? "Fechar" : "Adicionar endereço"}
        </button>
      </div>

      {ativos.length === 0 && !modoAdicionar && (
        <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
      )}

      <ul className="flex flex-col gap-2">
        {ativos.map((e) => (
          <li key={e.id}>
            {editandoId === e.id ? (
              <EnderecoForm pessoaId={pessoaId} enderecoBase={e} aoConcluir={() => setEditandoId(null)} />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{ROTULO_TIPO[e.tipo] ?? e.tipo}</span>
                    {e.principal && <Badge className="border-none bg-[#157F6B]/12 font-semibold text-[#0F5F50]">Principal</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{formatarLinha(e)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditandoId(e.id)}>
                  Editar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {modoAdicionar && (
        <div className="mt-3">
          <EnderecoForm pessoaId={pessoaId} aoConcluir={() => setModoAdicionar(false)} />
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
              {historico.map((e) => (
                <li key={e.id} className="text-xs text-muted-foreground">
                  <span className="line-through">{formatarLinha(e)}</span> — substituído em {formatarData(e.substituido_em!)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
