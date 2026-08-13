"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buscarEnderecoPorCep } from "@/lib/cep";
import type { Database } from "@/utils/supabase/database.types";

type TipoEndereco = Database["public"]["Enums"]["tipo_endereco"];

export type ValoresEndereco = {
  tipo: TipoEndereco;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export const ENDERECO_VAZIO: ValoresEndereco = {
  tipo: "COMERCIAL",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export const ROTULO_TIPO_ENDERECO: Record<string, string> = {
  COMERCIAL: "Comercial",
  COBRANCA: "Cobrança",
  ENTREGA: "Entrega",
  OUTRO: "Outro",
};

type NomesCampos = Partial<Record<keyof ValoresEndereco, string>>;

const NOMES_PADRAO: NomesCampos = {
  tipo: "tipo",
  cep: "cep",
  logradouro: "logradouro",
  numero: "numero",
  complemento: "complemento",
  bairro: "bairro",
  cidade: "cidade",
  uf: "uf",
};

// Bloco de campos de endereço reutilizável em qualquer formulário do
// sistema (cadastro de pessoas hoje; qualquer módulo futuro que precise
// de endereço amanhã) — busca automática de logradouro/bairro/cidade/UF
// via ViaCEP ao sair do campo CEP, sem nunca sobrescrever o que o usuário
// já tiver digitado manualmente num campo que a API não retornar preenchido.
//
// `names`: passe um mapa de nomes pra os inputs participarem de um
// <form action={...}> nativo via FormData; passe `null` (formulário de
// rascunho local, ainda sem dono pra salvar) pra não renderizar `name`
// nenhum e evitar vazar esses campos num submit que não é sobre eles.
export function CamposEndereco({
  valores,
  onChange,
  names = NOMES_PADRAO,
  mostrarTipo = true,
}: {
  valores: ValoresEndereco;
  onChange: (proximo: ValoresEndereco) => void;
  names?: NomesCampos | null;
  mostrarTipo?: boolean;
}) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");

  function campo<K extends keyof ValoresEndereco>(chave: K, valor: ValoresEndereco[K]) {
    onChange({ ...valores, [chave]: valor });
  }

  async function aoSairDoCep() {
    const cepLimpo = valores.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setErroCep("");
      return;
    }
    setBuscandoCep(true);
    setErroCep("");
    const dados = await buscarEnderecoPorCep(valores.cep);
    setBuscandoCep(false);
    if (!dados) {
      setErroCep("CEP não encontrado.");
      return;
    }
    onChange({
      ...valores,
      logradouro: dados.logradouro || valores.logradouro,
      bairro: dados.bairro || valores.bairro,
      cidade: dados.cidade || valores.cidade,
      uf: dados.uf || valores.uf,
    });
  }

  return (
    <>
      {mostrarTipo && (
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select name={names?.tipo} value={valores.tipo} onValueChange={(v) => campo("tipo", v as TipoEndereco)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROTULO_TIPO_ENDERECO).map(([valor, rotulo]) => (
                <SelectItem key={valor} value={valor}>
                  {rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>CEP</Label>
        <Input
          name={names?.cep}
          value={valores.cep}
          onChange={(e) => campo("cep", e.target.value)}
          onBlur={aoSairDoCep}
          placeholder="00000-000"
        />
        {buscandoCep && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
        {erroCep && <p className="text-xs text-destructive">{erroCep}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Logradouro</Label>
        <Input name={names?.logradouro} value={valores.logradouro} onChange={(e) => campo("logradouro", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Número</Label>
        <Input name={names?.numero} value={valores.numero} onChange={(e) => campo("numero", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Complemento</Label>
        <Input name={names?.complemento} value={valores.complemento} onChange={(e) => campo("complemento", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Bairro</Label>
        <Input name={names?.bairro} value={valores.bairro} onChange={(e) => campo("bairro", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Cidade</Label>
        <Input name={names?.cidade} value={valores.cidade} onChange={(e) => campo("cidade", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>UF</Label>
        <Input
          name={names?.uf}
          maxLength={2}
          value={valores.uf}
          onChange={(e) => campo("uf", e.target.value.toUpperCase())}
        />
      </div>
    </>
  );
}
