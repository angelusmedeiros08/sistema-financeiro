"use client";

import { useState } from "react";
import { CaretUpDown, Plus, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type FormaPagamento = { id: string; nome: string };

export function FormaPagamentoCombobox({ formasPagamento }: { formasPagamento: FormaPagamento[] }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<FormaPagamento | null>(null);
  const [novoNome, setNovoNome] = useState("");

  const filtrados = formasPagamento.filter((f) => f.nome.toLowerCase().includes(busca.toLowerCase()));
  const buscaExata = filtrados.some((f) => f.nome.toLowerCase() === busca.trim().toLowerCase());
  const rotuloAtual = selecionado?.nome ?? (novoNome ? `${novoNome} (novo)` : "");

  return (
    <div>
      {selecionado && <input type="hidden" name="forma_pagamento_id" value={selecionado.id} />}
      {!selecionado && novoNome && <input type="hidden" name="forma_pagamento_nome_novo" value={novoNome} />}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={aberto} className="w-full justify-between font-normal">
            <span className={cn("flex items-center gap-2 truncate", !rotuloAtual && "text-muted-foreground")}>
              <Wallet size={15} />
              {rotuloAtual || "Forma de pagamento..."}
            </span>
            <CaretUpDown size={14} className="shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar ou digitar um nome..." value={busca} onValueChange={setBusca} />
            <CommandList>
              {filtrados.length === 0 && !busca && <CommandEmpty>Nenhuma forma de pagamento ainda.</CommandEmpty>}
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
                    Nenhuma
                  </CommandItem>
                )}
                {filtrados.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={f.id}
                    onSelect={() => {
                      setSelecionado(f);
                      setNovoNome("");
                      setBusca("");
                      setAberto(false);
                    }}
                  >
                    <Wallet size={14} />
                    {f.nome}
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
