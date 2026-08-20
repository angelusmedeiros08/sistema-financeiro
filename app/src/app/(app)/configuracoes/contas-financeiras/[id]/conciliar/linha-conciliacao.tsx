"use client";

import { useState } from "react";
import { Check, Sparkle, Spinner, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import { confirmarMatchAction, criarLancamentoSimplificadoAction, ignorarLinhaExtratoAction, revalidarPosConciliacaoAction, type LinhaConciliacao } from "./actions";
import { cn } from "@/lib/utils";

function badgeCorrespondencia(correspondencia: LinhaConciliacao["correspondencia"]) {
  if (correspondencia === "exata") {
    return (
      <Badge variant="outline" className="gap-1 border-none bg-[#157F6B]/12 text-[#0F5F50]">
        <Check size={11} />
        Igual — só confirmar
      </Badge>
    );
  }
  if (correspondencia === "aproximada") {
    return (
      <Badge variant="outline" className="gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
        <Sparkle size={11} />
        Data próxima — confirme
      </Badge>
    );
  }
  if (correspondencia === "multipla") {
    return (
      <Badge variant="outline" className="gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
        <Sparkle size={11} />
        Mais de um com esse valor — escolha qual
      </Badge>
    );
  }
  return null;
}

export function LinhaConciliacaoCard({
  linha,
  contaFinanceiraId,
  categorias,
  pessoas,
  onResolvida,
}: {
  linha: LinhaConciliacao;
  contaFinanceiraId: string;
  categorias: { id: string; nome: string; tipo: string }[];
  pessoas: { id: string; nome: string }[];
  onResolvida: () => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(() => {
    // Só pré-seleciona no caso que decide sozinho: exatamente 1 candidato
    // com o MESMO valor da linha (Seção "Correspondência" da spec) — nunca
    // em ambiguidade. `candidatos` inclui itens de valor menor pra permitir
    // agrupamento manual, então não dá pra usar candidatos.length aqui: um
    // candidato de valor menor no mesmo raio de data não deve impedir o
    // auto-select do único candidato que bate o valor exato.
    if (linha.correspondencia !== "exata") return new Set();
    const comValorIgual = linha.candidatos.filter((c) => c.valor === linha.valor);
    return comValorIgual.length === 1 ? new Set([comValorIgual[0].chave]) : new Set();
  });
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [categoriaId, setCategoriaId] = useState(linha.regraSugerida?.categoriaId ?? "");
  const [pessoaId, setPessoaId] = useState(linha.regraSugerida?.pessoaId ?? "");
  const [descricaoNovo, setDescricaoNovo] = useState(linha.descricao);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const somaSelecionada = linha.candidatos.filter((c) => selecionados.has(c.chave)).reduce((soma, c) => soma + c.valor, 0);
  const somaBate = Math.abs(somaSelecionada - linha.valor) < 0.005;

  function alternarCandidato(chave: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  async function confirmar() {
    setEnviando(true);
    setErro("");
    const candidatosSelecionados = linha.candidatos.filter((c) => selecionados.has(c.chave)).map((c) => ({ chave: c.chave, origem: c.origem, id: c.id, valor: c.valor }));
    const resultado = await confirmarMatchAction({ extratoLinhaId: linha.id, contaFinanceiraId, candidatos: candidatosSelecionados });
    setEnviando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    await revalidarPosConciliacaoAction();
    onResolvida();
  }

  async function confirmarCriacao() {
    if (!categoriaId) {
      setErro("Escolha uma categoria.");
      return;
    }
    setEnviando(true);
    setErro("");
    const resultado = await criarLancamentoSimplificadoAction({
      extratoLinhaId: linha.id,
      contaFinanceiraId,
      categoriaId,
      pessoaId: pessoaId || null,
      descricao: descricaoNovo,
    });
    setEnviando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    await revalidarPosConciliacaoAction();
    onResolvida();
  }

  async function ignorar() {
    setEnviando(true);
    setErro("");
    const resultado = await ignorarLinhaExtratoAction(linha.id);
    setEnviando(false);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    onResolvida();
  }

  const categoriasDoTipo = categorias.filter((c) => c.tipo === (linha.tipo === "CREDITO" ? "RECEITA" : "DESPESA"));

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{formatarMoeda(linha.valor)}</span>
            <Badge className={cn("border-none text-[10px] font-semibold", linha.tipo === "CREDITO" ? "bg-[#157F6B]/12 text-[#0F5F50]" : "bg-[#B23A2E]/12 text-[#B23A2E]")}>
              {linha.tipo === "CREDITO" ? "Crédito" : "Débito"}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatarDataIsoParaBR(linha.data)}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{linha.descricao || "(sem descrição)"}</p>
        </div>
        {badgeCorrespondencia(linha.correspondencia)}
      </div>

      {linha.candidatos.length > 0 && !criandoNovo && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/30 p-3">
          {linha.candidatos.map((c) => (
            <label key={c.chave} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={selecionados.has(c.chave)} onCheckedChange={() => alternarCandidato(c.chave)} />
              <span className="flex-1 text-foreground">{c.descricao || "(sem descrição)"}</span>
              <span className="text-xs text-muted-foreground">{formatarDataIsoParaBR(c.data)}</span>
              <span className="w-24 text-right tabular-nums font-medium text-foreground">{formatarMoeda(c.valor)}</span>
            </label>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-xs">
            <span className={cn("font-medium", somaBate ? "text-[#0F5F50]" : "text-muted-foreground")}>
              {formatarMoeda(somaSelecionada)} selecionado de {formatarMoeda(linha.valor)} do extrato
            </span>
            <Button type="button" size="sm" className="h-7 text-xs" disabled={!somaBate || selecionados.size === 0 || enviando} onClick={confirmar}>
              {enviando ? <Spinner size={13} className="animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </div>
      )}

      {criandoNovo ? (
        <div className="flex flex-col gap-2 rounded-xl bg-muted/30 p-3">
          <Input className="h-8 text-xs" value={descricaoNovo} onChange={(e) => setDescricaoNovo(e.target.value)} placeholder="Descrição" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categoriasDoTipo.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pessoaId} onValueChange={setPessoaId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pessoa (opcional)..." />
              </SelectTrigger>
              <SelectContent>
                {pessoas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {linha.regraSugerida && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkle size={11} />
              Categoria sugerida a partir do histórico — confira antes de confirmar.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCriandoNovo(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" disabled={enviando} onClick={confirmarCriacao}>
              {enviando ? <Spinner size={13} className="animate-spin" /> : "Confirmar criação"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" disabled={enviando} onClick={ignorar}>
            <X size={12} />
            Ignorar
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCriandoNovo(true)}>
            + Criar lançamento
          </Button>
        </div>
      )}

      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
