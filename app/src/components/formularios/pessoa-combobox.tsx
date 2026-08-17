"use client";

import { useState } from "react";
import { CaretUpDown, Plus, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Pessoa = { id: string; nome: string };

export function PessoaCombobox({
  pessoas,
  perfil,
  label,
  pessoaInicial,
}: {
  pessoas: Pessoa[];
  perfil: "CLIENTE" | "FORNECEDOR";
  label: string;
  pessoaInicial?: Pessoa | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Pessoa | null>(pessoaInicial ?? null);
  const [novoNome, setNovoNome] = useState("");

  const filtradas = pessoas.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));
  const buscaExata = filtradas.some((p) => p.nome.toLowerCase() === busca.trim().toLowerCase());
  const rotuloAtual = selecionada?.nome ?? (novoNome ? `${novoNome} (novo)` : "");

  return (
    <div>
      {selecionada && <input type="hidden" name="pessoa_id" value={selecionada.id} />}
      {!selecionada && novoNome && <input type="hidden" name="pessoa_nome_novo" value={novoNome} />}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={aberto}
            className="w-full justify-between font-normal"
          >
            <span className={cn("flex items-center gap-2 truncate", !rotuloAtual && "text-muted-foreground")}>
              <User size={15} />
              {rotuloAtual || label}
            </span>
            <CaretUpDown size={14} className="shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar ou digitar um nome..." value={busca} onValueChange={setBusca} />
            <CommandList>
              {filtradas.length === 0 && !busca && <CommandEmpty>Nenhum cadastro ainda.</CommandEmpty>}
              <CommandGroup>
                {filtradas.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      setSelecionada(p);
                      setNovoNome("");
                      setBusca("");
                      setAberto(false);
                    }}
                  >
                    <User size={14} />
                    {p.nome}
                  </CommandItem>
                ))}
                {busca.trim() && !buscaExata && (
                  <CommandItem
                    value={`__criar__${busca}`}
                    onSelect={() => {
                      setNovoNome(busca.trim());
                      setSelecionada(null);
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
