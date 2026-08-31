"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CATALOGO_SLIDES, type CategoriaSlide, itemCatalogoDaRota } from "@/lib/apresentacao/catalogo";
import { cn, moverItem } from "@/lib/utils";
import { criarApresentacao, atualizarApresentacao } from "./actions";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

const CATEGORIAS: CategoriaSlide[] = ["Painel", "Indicadores", "Relatórios"];

type ApresentacaoExistente = {
  id: string;
  nome: string;
  intervaloSegundos: number;
  permiteModoTv: boolean;
  rotas: string[];
};

export function ApresentacaoForm({ existente }: { existente?: ApresentacaoExistente }) {
  const router = useRouter();
  const [nome, setNome] = useState(existente?.nome ?? "");
  const [permiteModoTv, setPermiteModoTv] = useState(existente?.permiteModoTv ?? true);
  const [intervaloSegundos, setIntervaloSegundos] = useState(existente?.intervaloSegundos ?? 20);
  const [selecionadas, setSelecionadas] = useState<string[]>(existente?.rotas ?? []);
  const [pendente, iniciarTransicao] = useTransition();

  function alternar(rota: string, incluir: boolean) {
    setSelecionadas((atual) => (incluir ? [...atual, rota] : atual.filter((r) => r !== rota)));
  }

  function mover(indice: number, direcao: -1 | 1) {
    setSelecionadas((atual) => moverItem(atual, indice, direcao));
  }

  function salvar() {
    iniciarTransicao(async () => {
      const dados = { nome, intervaloSegundos, permiteModoTv, rotas: selecionadas };
      const resultado = existente ? await atualizarApresentacao(existente.id, dados) : await criarApresentacao(dados);
      notificarResultado(resultado, "Apresentação salva.");
      if ("erro" in resultado) return;
      router.push("/apresentacoes");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-card">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Reunião mensal Cliente X" />
        </div>

        <div className="space-y-1.5">
          <Label>Avanço entre slides</Label>
          <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1 sm:w-fit">
            <button
              type="button"
              onClick={() => setPermiteModoTv(false)}
              className={cn(
                "flex-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors sm:flex-none",
                !permiteModoTv ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Manual — você controla
            </button>
            <button
              type="button"
              onClick={() => setPermiteModoTv(true)}
              className={cn(
                "flex-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors sm:flex-none",
                permiteModoTv ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Automático — Modo TV
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {permiteModoTv
              ? "Além do Modo TV, você sempre pode navegar manualmente durante a apresentação."
              : "Sem cronômetro — os slides só trocam quando você clicar ou usar as setas."}
          </p>
        </div>

        {permiteModoTv && (
          <div className="space-y-1.5 sm:w-[180px]">
            <Label htmlFor="intervalo">Intervalo do Modo TV (segundos)</Label>
            <Input
              id="intervalo"
              type="number"
              min={5}
              max={300}
              value={intervaloSegundos}
              onChange={(e) => setIntervaloSegundos(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Telas disponíveis</h2>
          <div className="flex flex-col gap-4">
            {CATEGORIAS.map((categoria) => (
              <div key={categoria} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{categoria}</p>
                {CATALOGO_SLIDES.filter((item) => item.categoria === categoria).map((item) => (
                  <label key={item.rota} className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={selecionadas.includes(item.rota)}
                      onCheckedChange={(v) => alternar(item.rota, v === true)}
                    />
                    {item.rotulo}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Ordem de apresentação</h2>
          {selecionadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tela selecionada ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {selecionadas.map((rota, indice) => (
                <li key={rota} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="flex-1 text-foreground">{itemCatalogoDaRota(rota)?.rotulo ?? rota}</span>
                  <button
                    type="button"
                    disabled={indice === 0}
                    onClick={() => mover(indice, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Mover pra cima"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={indice === selecionadas.length - 1}
                    onClick={() => mover(indice, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Mover pra baixo"
                  >
                    <ArrowDown size={14} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push("/apresentacoes")}>
          Cancelar
        </Button>
        <Button size="sm" disabled={pendente || !nome.trim()} onClick={salvar}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
