"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/utils/supabase/database.types";
import type { DadosPessoa, CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";

type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type ResultadoAcao = { erro: string } | { sucesso: true };

const PERFIS: { valor: PerfilPessoa; rotulo: string }[] = [
  { valor: "CLIENTE", rotulo: "Cliente" },
  { valor: "FORNECEDOR", rotulo: "Fornecedor" },
  { valor: "TRANSPORTADORA", rotulo: "Transportadora" },
];

const estadoInicial = { erro: "" };

export function PessoaForm({
  modo,
  perfilPadrao,
  pessoa,
  camposPersonalizados,
  acao,
}: {
  modo: "criar" | "editar";
  perfilPadrao?: PerfilPessoa;
  pessoa?: DadosPessoa;
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  acao: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const [perfisSelecionados, setPerfisSelecionados] = useState<PerfilPessoa[]>(
    pessoa?.perfis ?? (perfilPadrao ? [perfilPadrao] : []),
  );
  const [valoresCampos, setValoresCampos] = useState<Record<string, unknown>>(
    pessoa?.campos_personalizados ?? {},
  );

  const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await acao(formData);
    if ("erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  function alternarPerfil(perfil: PerfilPessoa, marcado: boolean) {
    setPerfisSelecionados((atual) => (marcado ? [...atual, perfil] : atual.filter((p) => p !== perfil)));
  }

  const camposVisiveis = camposPersonalizados.filter(
    (c) => c.aplica_a === "AMBOS" || perfisSelecionados.includes(c.aplica_a as PerfilPessoa),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {pessoa && <input type="hidden" name="pessoa_id" value={pessoa.id} />}
      <input type="hidden" name="campos_personalizados" value={JSON.stringify(valoresCampos)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nome">Nome / Razão social</Label>
          <Input id="nome" name="nome" type="text" required defaultValue={pessoa?.nome} placeholder="Nome completo ou razão social" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="natureza">Tipo de pessoa</Label>
          <Select name="natureza" defaultValue={pessoa?.natureza ?? ""}>
            <SelectTrigger id="natureza" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FISICA">Física</SelectItem>
              <SelectItem value="JURIDICA">Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="documento">CPF/CNPJ</Label>
          <Input id="documento" name="documento" type="text" defaultValue={pessoa?.documento ?? ""} placeholder="Opcional" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={pessoa?.email ?? ""} placeholder="Opcional" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" type="text" defaultValue={pessoa?.telefone ?? ""} placeholder="Opcional" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Perfis</Label>
        <div className="flex flex-wrap gap-4">
          {PERFIS.map((p) => (
            <label key={p.valor} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                name="perfis"
                value={p.valor}
                checked={perfisSelecionados.includes(p.valor)}
                onCheckedChange={(marcado) => alternarPerfil(p.valor, marcado === true)}
              />
              {p.rotulo}
            </label>
          ))}
        </div>
      </div>

      {camposVisiveis.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Campos personalizados</Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {camposVisiveis.map((campo) => (
              <div key={campo.id} className="space-y-1.5">
                <Label htmlFor={`campo-${campo.id}`}>{campo.rotulo}</Label>
                {campo.tipo === "BOOLEANO" ? (
                  <label className="flex h-8 items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      id={`campo-${campo.id}`}
                      checked={valoresCampos[campo.id] === true}
                      onCheckedChange={(marcado) =>
                        setValoresCampos((atual) => ({ ...atual, [campo.id]: marcado === true }))
                      }
                    />
                    Sim
                  </label>
                ) : (
                  <Input
                    id={`campo-${campo.id}`}
                    type={campo.tipo === "NUMERO" ? "number" : campo.tipo === "DATA" ? "date" : "text"}
                    value={(valoresCampos[campo.id] as string) ?? ""}
                    onChange={(e) => setValoresCampos((atual) => ({ ...atual, [campo.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : modo === "criar" ? "Criar cadastro" : "Salvar alterações"}
        </Button>
        {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}
      </div>
    </form>
  );
}
