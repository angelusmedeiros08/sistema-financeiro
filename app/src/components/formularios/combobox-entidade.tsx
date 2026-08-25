"use client";

import { useState } from "react";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type OpcaoComboboxEntidade = {
  id: string;
  rotulo: string;
  subtexto?: string;
  // Só categoria usa isto (Despesa/Receita) — sem grupo, a opção cai num
  // bucket "sem cabeçalho" que sempre aparece primeiro (usado pra manter a
  // sugestão de correspondência em destaque no topo, antes dos grupos).
  grupo?: string;
};

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
  rotuloAcessivel,
}: {
  opcoes: OpcaoComboboxEntidade[];
  valor: ValorComboboxEntidade;
  onMudar: (valor: ValorComboboxEntidade) => void;
  nomeParaCriar: string;
  acoesCriar: AcaoCriar[];
  placeholder?: string;
  // Sem isso, todo combobox sem valor escolhido anuncia só "Escolher
  // ação..." pra leitor de tela — numa tela com uma linha por valor único
  // da planilha, fica impossível saber qual linha cada controle decide.
  rotuloAcessivel?: string;
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

  // Agrupa preservando a ordem de primeira aparição em `opcoes` — quem
  // monta a lista decide a ordem dos grupos (ex.: Despesa antes de
  // Receita), esta função só particiona sem reordenar. Item sem `grupo`
  // (chave null) forma seu próprio bucket, útil pra manter a sugestão de
  // correspondência sempre em primeiro, fora de qualquer cabeçalho.
  const gruposOrdenados: { grupo: string | null; itens: OpcaoComboboxEntidade[] }[] = [];
  {
    const porGrupo = new Map<string | null, OpcaoComboboxEntidade[]>();
    for (const o of filtradas) {
      const chave = o.grupo ?? null;
      if (!porGrupo.has(chave)) {
        porGrupo.set(chave, []);
        gruposOrdenados.push({ grupo: chave, itens: porGrupo.get(chave)! });
      }
      porGrupo.get(chave)!.push(o);
    }
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label={rotuloAcessivel ? `${rotuloAcessivel}: ${rotuloAtual || placeholder}` : undefined}
          className="h-8 w-64 justify-between text-xs font-normal"
        >
          <span className={cn("truncate", !rotuloAtual && "text-muted-foreground")}>{rotuloAtual || placeholder}</span>
          <CaretUpDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar um cadastro existente..." value={busca} onValueChange={setBusca} />
          <CommandList>
            {filtradas.length === 0 && !busca && <CommandEmpty>Nenhum cadastro ainda.</CommandEmpty>}
            {gruposOrdenados.map(({ grupo, itens }) => (
              <CommandGroup key={grupo ?? "__sem_grupo__"} heading={grupo ?? undefined}>
                {itens.map((o) => (
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
              </CommandGroup>
            ))}
            <CommandGroup>
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
