"use client";

import { useState } from "react";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type OpcaoComboboxEntidade = { id: string; rotulo: string; subtexto?: string };

export type ValorComboboxEntidade = { tipo: "existente"; id: string } | { tipo: "criar_novo"; tipoCategoriaNova?: "RECEITA" | "DESPESA" } | null;

type AcaoCriar = { rotulo: string; tipoCategoriaNova?: "RECEITA" | "DESPESA" };

// Adapta o mesmo padrão Command+Popover já usado em categoria-combobox.tsx/
// pessoa-combobox.tsx (busca filtra, "Criar X" aparece logo após o
// resultado filtrado, nunca no fim de uma lista alfabética) pro contexto da
// etapa Cadastros da importação: precisa de badge de correspondência
// externa e de mais de uma ação de criar (categoria nova pede Receita/
// Despesa). Diferente dos comboboxes de formulário simples, aqui o nome do
// cadastro novo é sempre `nomeParaCriar` (o valor tal como veio da
// planilha) — nunca o texto digitado na busca, que serve só pra filtrar a
// lista de existentes; criar algo com um nome diferente do que está na
// linha quebraria o mapeamento de volta pra ela.
export function ComboboxEntidade({
  opcoes,
  valor,
  onMudar,
  nomeParaCriar,
  acoesCriar,
  placeholder = "Escolher ação...",
}: {
  opcoes: OpcaoComboboxEntidade[];
  valor: ValorComboboxEntidade;
  onMudar: (valor: ValorComboboxEntidade) => void;
  nomeParaCriar: string;
  acoesCriar: AcaoCriar[];
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const buscaNormalizada = busca.trim().toLowerCase();
  const filtradas = opcoes.filter(
    (o) => o.rotulo.toLowerCase().includes(buscaNormalizada) || (o.subtexto?.toLowerCase().includes(buscaNormalizada) ?? false),
  );

  const rotuloAtual =
    valor?.tipo === "existente" ? (opcoes.find((o) => o.id === valor.id)?.rotulo ?? "") : valor?.tipo === "criar_novo" ? `${nomeParaCriar} (novo)` : "";

  function escolherExistente(id: string) {
    onMudar({ tipo: "existente", id });
    setBusca("");
    setAberto(false);
  }

  function escolherCriar(acao: AcaoCriar) {
    onMudar({ tipo: "criar_novo", tipoCategoriaNova: acao.tipoCategoriaNova });
    setBusca("");
    setAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={aberto} className="h-8 w-64 justify-between text-xs font-normal">
          <span className={cn("truncate", !rotuloAtual && "text-muted-foreground")}>{rotuloAtual || placeholder}</span>
          <CaretUpDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar um cadastro existente..." value={busca} onValueChange={setBusca} />
          <CommandList>
            {filtradas.length === 0 && !busca && <CommandEmpty>Nenhum cadastro ainda.</CommandEmpty>}
            <CommandGroup>
              {filtradas.map((o) => (
                <CommandItem key={o.id} value={o.id} onSelect={() => escolherExistente(o.id)}>
                  <span className="flex flex-1 items-center gap-1.5 truncate">
                    {valor?.tipo === "existente" && valor.id === o.id && <Check size={14} />}
                    <span className="flex flex-col truncate">
                      <span className="truncate">{o.rotulo}</span>
                      {o.subtexto && <span className="text-[10px] text-muted-foreground">{o.subtexto}</span>}
                    </span>
                  </span>
                </CommandItem>
              ))}
              {acoesCriar.map((acao) => (
                <CommandItem key={acao.rotulo} value={`__criar__${acao.rotulo}`} onSelect={() => escolherCriar(acao)}>
                  {valor?.tipo === "criar_novo" && valor.tipoCategoriaNova === acao.tipoCategoriaNova && <Check size={14} />}
                  <Plus size={14} />
                  {acao.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
