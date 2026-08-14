"use client";

import { useState } from "react";
import { CaretUpDown, Plus, Tag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type CentroCusto = { id: string; nome: string };

export function CentroCustoCombobox({ centrosCusto }: { centrosCusto: CentroCusto[] }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<CentroCusto | null>(null);
  const [novoNome, setNovoNome] = useState("");

  const filtrados = centrosCusto.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
  const buscaExata = filtrados.some((c) => c.nome.toLowerCase() === busca.trim().toLowerCase());
  const rotuloAtual = selecionado?.nome ?? (novoNome ? `${novoNome} (novo)` : "");

  return (
    <div>
      {selecionado && <input type="hidden" name="centro_custo_id" value={selecionado.id} />}
      {!selecionado && novoNome && <input type="hidden" name="centro_custo_nome_novo" value={novoNome} />}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={aberto} className="w-full justify-between font-normal">
            <span className={cn("flex items-center gap-2 truncate", !rotuloAtual && "text-muted-foreground")}>
              <Tag size={15} />
              {rotuloAtual || "Centro de custo (opcional)..."}
            </span>
            <CaretUpDown size={14} className="shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar ou digitar um nome..." value={busca} onValueChange={setBusca} />
            <CommandList>
              {filtrados.length === 0 && !busca && <CommandEmpty>Nenhum centro de custo ainda.</CommandEmpty>}
              <CommandGroup>
                {selecionado && (
                  <CommandItem
                    value="__limpar__"
                    onSelect={() => {
                      setSelecionado(null);
                      setBusca("");
                      setAberto(false);
                    }}
                  >
                    Nenhum
                  </CommandItem>
                )}
                {filtrados.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      setSelecionado(c);
                      setNovoNome("");
                      setBusca("");
                      setAberto(false);
                    }}
                  >
                    <Tag size={14} />
                    {c.nome}
                  </CommandItem>
                ))}
                {busca.trim() && !buscaExata && (
                  <CommandItem
                    value={`__criar__${busca}`}
                    onSelect={() => {
                      setNovoNome(busca.trim());
                      setSelecionado(null);
                      setBusca("");
                      setAberto(false);
                    }}
                  >
                    <Plus size={14} />
                    Criar &quot;{busca.trim()}&quot;
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
