"use client";

import { useState } from "react";
import { CaretUpDown, Package, Plus, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { criarProdutoServicoRapidoAction } from "@/lib/produtos-servicos/produtos-servicos-actions";
import { cn } from "@/lib/utils";

type ProdutoServicoOpcao = { id: string; nome: string; precoVenda: number };

// Controlado (não usa hidden input) — o valor escolhido precisa alimentar
// o preço/subtotal ao vivo na linha de item da venda, diferente do padrão
// uncontrolled dos outros combobox de quick-create do sistema. Criar aqui
// nasce direto no banco (via criarProdutoServicoRapidoAction) em vez de
// diferir a criação pro submit do formulário, porque o preço do item
// precisa existir imediatamente pra calcular o subtotal da linha.
export function ProdutoServicoCombobox({
  produtos,
  value,
  onChange,
  onCriado,
}: {
  produtos: ProdutoServicoOpcao[];
  value: string;
  onChange: (produtoServicoId: string, produto: ProdutoServicoOpcao) => void;
  onCriado?: (produto: ProdutoServicoOpcao) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);

  const selecionado = produtos.find((p) => p.id === value) ?? null;
  const filtrados = produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));
  const buscaExata = filtrados.some((p) => p.nome.toLowerCase() === busca.trim().toLowerCase());

  async function criarNovo(nome: string) {
    setCriando(true);
    const resultado = await criarProdutoServicoRapidoAction(nome);
    setCriando(false);
    if ("erro" in resultado) return;
    const novo = { id: resultado.id, nome, precoVenda: resultado.precoVenda };
    onCriado?.(novo);
    onChange(novo.id, novo);
    setBusca("");
    setAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={aberto} className="w-full justify-between font-normal">
          <span className={cn("flex items-center gap-2 truncate", !selecionado && "text-muted-foreground")}>
            <Package size={15} />
            {selecionado?.nome ?? "Produto ou serviço..."}
          </span>
          <CaretUpDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar ou digitar um nome..." value={busca} onValueChange={setBusca} />
          <CommandList>
            {filtrados.length === 0 && !busca && <CommandEmpty>Nenhum produto ou serviço ainda.</CommandEmpty>}
            <CommandGroup>
              {filtrados.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id, p);
                    setBusca("");
                    setAberto(false);
                  }}
                >
                  <Package size={14} />
                  {p.nome}
                </CommandItem>
              ))}
              {busca.trim() && !buscaExata && (
                <CommandItem value={`__criar__${busca}`} disabled={criando} onSelect={() => criarNovo(busca.trim())}>
                  {criando ? <Spinner size={14} className="animate-spin" /> : <Plus size={14} />}
                  Criar &quot;{busca.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
