"use client";

import { useState } from "react";
import { CaretUpDown, FolderSimple, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Categoria = { id: string; nome: string };

// Espelha CentroCustoCombobox — mesmo padrão de busca + criação inline, mas
// categoria é obrigatória (sem opção "Nenhuma"). Categoria nova nasce ligada
// à conta contábil genérica do tipo (resolvido no servidor, ver
// resolverCategoriaIdSimples), reclassificável depois em Configurações →
// Categorias.
export function CategoriaCombobox({ categorias, categoriaInicial }: { categorias: Categoria[]; categoriaInicial?: Categoria | null }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Categoria | null>(categoriaInicial ?? null);
  const [novoNome, setNovoNome] = useState("");

  const filtradas = categorias.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
  const buscaExata = filtradas.some((c) => c.nome.toLowerCase() === busca.trim().toLowerCase());
  const rotuloAtual = selecionada?.nome ?? (novoNome ? `${novoNome} (nova)` : "");

  return (
    <div>
      {selecionada && <input type="hidden" name="categoria_id" value={selecionada.id} />}
      {!selecionada && novoNome && <input type="hidden" name="categoria_nome_novo" value={novoNome} />}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={aberto} className="w-full justify-between font-normal">
            <span className={cn("flex items-center gap-2 truncate", !rotuloAtual && "text-muted-foreground")}>
              <FolderSimple size={15} />
              {rotuloAtual || "Selecione a categoria..."}
            </span>
            <CaretUpDown size={14} className="shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar ou digitar um nome..." value={busca} onValueChange={setBusca} />
            <CommandList>
              {filtradas.length === 0 && !busca && <CommandEmpty>Nenhuma categoria ainda.</CommandEmpty>}
              <CommandGroup>
                {filtradas.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      setSelecionada(c);
                      setNovoNome("");
                      setBusca("");
                      setAberto(false);
                    }}
                  >
                    <FolderSimple size={14} />
                    {c.nome}
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
