"use client";

import { useState } from "react";
import { CaretUpDown, Bank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { BANCOS_BRASILEIROS } from "@/lib/bancos-brasileiros";

// Mais simples que os combobox de quick-create (Categoria/Centro de Custo/
// Forma de Pagamento): não cria entidade nenhuma, `banco` continua sendo
// texto livre na tabela — isso só melhora o preenchimento com sugestão,
// mas aceita qualquer texto que não esteja na lista.
export function BancoCombobox({ defaultValue = "" }: { defaultValue?: string }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [valor, setValor] = useState(defaultValue);

  const filtrados = BANCOS_BRASILEIROS.filter((b) => b.toLowerCase().includes(busca.toLowerCase()));
  const buscaExata = filtrados.some((b) => b.toLowerCase() === busca.trim().toLowerCase());

  function escolher(nome: string) {
    setValor(nome);
    setBusca("");
    setAberto(false);
  }

  return (
    <div>
      <input type="hidden" name="banco" value={valor} />
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={aberto} className="w-full justify-between font-normal">
            <span className={cn("flex items-center gap-2 truncate", !valor && "text-muted-foreground")}>
              <Bank size={15} />
              {valor || "Banco (opcional)..."}
            </span>
            <CaretUpDown size={14} className="shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar ou digitar um banco..." value={busca} onValueChange={setBusca} />
            <CommandList>
              <CommandGroup>
                {valor && (
                  <CommandItem value="__limpar__" onSelect={() => escolher("")}>
                    Nenhum
                  </CommandItem>
                )}
                {filtrados.map((b) => (
                  <CommandItem key={b} value={b} onSelect={() => escolher(b)}>
                    <Bank size={14} />
                    {b}
                  </CommandItem>
                ))}
                {busca.trim() && !buscaExata && (
                  <CommandItem value={`__usar__${busca}`} onSelect={() => escolher(busca.trim())}>
                    Usar &quot;{busca.trim()}&quot;
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
