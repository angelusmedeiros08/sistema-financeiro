"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkle, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComboboxEntidade, type ValorComboboxEntidade } from "@/components/formularios/combobox-entidade";
import { extrairValoresUnicos, resolverTodasCorrespondencias } from "@/lib/importacao/fuzzy";
import { normalizarTexto } from "@/lib/importacao/locale-br";
import { criarCategoriaReceitaProdutoAction } from "./actions";
import type { LinhaBrutaProduto } from "@/lib/importacao/produtos/tipos";
import type { ResolucaoEntidade } from "@/lib/importacao/tipos";

export type CategoriaReceita = { id: string; nome: string };
export type CategoriaNovaProduto = { valorOriginal: string; id: string };

// Etapa Cadastros aqui é enxuta de propósito — só resolve categoria de
// receita (a única entidade referenciada; produto não tem centro de
// custo/pessoa/forma de pagamento). Duplicata do PRÓPRIO produto mora na
// Revisão (próxima fatia), não aqui — ver "Refinamento" no plano.
export function PassoCadastros({
  linhasBrutas,
  categoriasExistentesIniciais,
  onVoltar,
  onAvancar,
}: {
  linhasBrutas: LinhaBrutaProduto[];
  categoriasExistentesIniciais: CategoriaReceita[];
  onVoltar: () => void;
  onAvancar: (resolucaoCategoria: Map<string, ResolucaoEntidade>, categoriasNovas: CategoriaNovaProduto[]) => void;
}) {
  const [categoriasExistentes, setCategoriasExistentes] = useState(categoriasExistentesIniciais);

  const valores = useMemo(() => extrairValoresUnicos(linhasBrutas.map((l) => l.categoria)), [linhasBrutas]);
  const correspondencias = useMemo(() => resolverTodasCorrespondencias(valores, categoriasExistentes), [valores, categoriasExistentes]);

  const [decisoes, setDecisoes] = useState<Record<string, ResolucaoEntidade>>(() => {
    const inicial: Record<string, ResolucaoEntidade> = {};
    for (const c of correspondencias) {
      if (c.tipoCorrespondencia === "exata") {
        inicial[normalizarTexto(c.valorOriginal)] = { valorOriginal: c.valorOriginal, acao: "usar_existente", entidadeId: c.correspondenciaId };
      }
    }
    return inicial;
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function definirDecisao(valorOriginal: string, decisao: ResolucaoEntidade) {
    setDecisoes((atual) => ({ ...atual, [normalizarTexto(valorOriginal)]: decisao }));
  }

  function aceitarSugestoes() {
    setDecisoes((atual) => {
      const novo = { ...atual };
      for (const c of correspondencias) {
        const chave = normalizarTexto(c.valorOriginal);
        if (c.tipoCorrespondencia === "aproximada" && c.correspondenciaId && !atual[chave]) {
          novo[chave] = { valorOriginal: c.valorOriginal, acao: "usar_existente", entidadeId: c.correspondenciaId };
        }
      }
      return novo;
    });
  }

  const numAproximadas = correspondencias.filter(
    (c) => c.tipoCorrespondencia === "aproximada" && !decisoes[normalizarTexto(c.valorOriginal)],
  ).length;
  const pendencias = valores.filter((v) => !decisoes[normalizarTexto(v)]).length;
  const todasResolvidas = pendencias === 0;

  async function avancar() {
    setErro("");
    const paraCriar = valores.filter((v) => decisoes[normalizarTexto(v)]?.acao === "criar_novo");

    if (paraCriar.length === 0) {
      const mapa = new Map(valores.map((v) => [normalizarTexto(v), decisoes[normalizarTexto(v)]]));
      onAvancar(mapa, []);
      return;
    }

    setEnviando(true);
    const categoriasNovas: CategoriaNovaProduto[] = [];
    const decisoesAtualizadas = { ...decisoes };
    for (const valorOriginal of paraCriar) {
      const resultado = await criarCategoriaReceitaProdutoAction(valorOriginal);
      if ("erro" in resultado) {
        setEnviando(false);
        setErro(`Falha ao criar "${valorOriginal}": ${resultado.erro}`);
        return;
      }
      decisoesAtualizadas[normalizarTexto(valorOriginal)] = { valorOriginal, acao: "usar_existente", entidadeId: resultado.id };
      categoriasNovas.push({ valorOriginal, id: resultado.id });
    }
    setEnviando(false);
    setCategoriasExistentes((atual) => [...atual, ...categoriasNovas.map((c) => ({ id: c.id, nome: c.valorOriginal }))]);

    const mapa = new Map(valores.map((v) => [normalizarTexto(v), decisoesAtualizadas[normalizarTexto(v)]]));
    onAvancar(mapa, categoriasNovas);
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">3. Categoria de receita</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cada categoria única na planilha precisa apontar pra uma categoria de receita existente ou virar uma nova.</p>
      </div>

      {valores.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada nas linhas mapeadas.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Categorias ({valores.length})</h3>
            {numAproximadas > 1 && (
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={aceitarSugestoes}>
                Aceitar {numAproximadas} sugestões
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            {correspondencias.map((c) => (
              <LinhaCategoria
                key={c.valorOriginal}
                correspondencia={c}
                existentes={categoriasExistentes}
                decisao={decisoes[normalizarTexto(c.valorOriginal)] ?? null}
                onMudar={(d) => definirDecisao(c.valorOriginal, d)}
              />
            ))}
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar} disabled={enviando}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {pendencias > 0 && <span className="text-xs text-muted-foreground">Falta decidir {pendencias} categoria(s).</span>}
          <Button type="button" className="gap-1.5" disabled={!todasResolvidas || enviando} onClick={avancar}>
            {enviando ? (
              <>
                <Spinner size={14} className="animate-spin" />
                Criando categorias...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LinhaCategoria({
  correspondencia,
  existentes,
  decisao,
  onMudar,
}: {
  correspondencia: { valorOriginal: string; correspondenciaId: string | null; correspondenciaNome: string | null; tipoCorrespondencia: "exata" | "aproximada" | "nenhuma" };
  existentes: CategoriaReceita[];
  decisao: ResolucaoEntidade;
  onMudar: (decisao: ResolucaoEntidade) => void;
}) {
  function converterEChamar(valor: ValorComboboxEntidade) {
    if (!valor) return;
    if (valor.tipo === "existente") {
      onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "usar_existente", entidadeId: valor.id });
    } else {
      onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "criar_novo", entidadeId: null, tipoCategoriaNova: "RECEITA" });
    }
  }

  const opcoesExistentes = existentes.filter((e) => e.id !== correspondencia.correspondenciaId);
  const opcoes = [
    ...(correspondencia.correspondenciaId ? [{ id: correspondencia.correspondenciaId, rotulo: `Usar "${correspondencia.correspondenciaNome}"` }] : []),
    ...opcoesExistentes.map((e) => ({ id: e.id, rotulo: e.nome })),
  ];

  const valorAtual: ValorComboboxEntidade = !decisao
    ? null
    : decisao.acao === "criar_novo"
      ? { tipo: "criar_novo", tipoCategoriaNova: decisao.tipoCategoriaNova }
      : decisao.entidadeId
        ? { tipo: "existente", id: decisao.entidadeId }
        : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
      <div className="min-w-32 flex-1">
        <p className="text-sm font-medium text-foreground">{correspondencia.valorOriginal}</p>
        {correspondencia.tipoCorrespondencia === "exata" && (
          <Badge variant="outline" className="mt-1 gap-1 border-none bg-positivo/12 text-positivo-foreground">
            <Check size={11} />
            Igual a &quot;{correspondencia.correspondenciaNome}&quot;
          </Badge>
        )}
        {correspondencia.tipoCorrespondencia === "aproximada" && (
          <Badge variant="outline" className="mt-1 gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
            <Sparkle size={11} />
            Parece &quot;{correspondencia.correspondenciaNome}&quot; — confirme
          </Badge>
        )}
      </div>

      <ComboboxEntidade
        opcoes={opcoes}
        valor={valorAtual}
        onMudar={converterEChamar}
        nomeParaCriar={correspondencia.valorOriginal}
        acoesCriar={[{ rotulo: "Criar nova categoria de receita", tipoCategoriaNova: "RECEITA" }]}
        rotuloAcessivel={`Ação para "${correspondencia.valorOriginal}"`}
      />
    </div>
  );
}
