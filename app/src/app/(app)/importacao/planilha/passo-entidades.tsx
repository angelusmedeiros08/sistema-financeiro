"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkle, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extrairValoresUnicos, resolverTodasCorrespondencias } from "@/lib/importacao/fuzzy";
import { normalizarTexto } from "@/lib/importacao/locale-br";
import { resolverCorrespondenciaPessoa, type PessoaExistente } from "@/lib/pessoas/importacao/correspondencia";
import { criarEntidadesAprovadasAction } from "./actions";
import type { EntidadesExistentes } from "@/lib/importacao/resolucao";
import type { LinhaBruta, ResolucaoEntidade, TipoEntidadeImportacao } from "@/lib/importacao/tipos";
import type { CorrespondenciaPessoa } from "@/lib/pessoas/importacao/tipos";
import type { Database } from "@/utils/supabase/database.types";
import { cn } from "@/lib/utils";

type CategoriaNova = { id: string; nome: string; tipo: Database["public"]["Enums"]["tipo_categoria"] };

type SecaoConfig = { tipo: TipoEntidadeImportacao; titulo: string; campo: keyof LinhaBruta; obrigatoria: boolean };

// Pessoa saiu daqui — tem correspondência própria (documento + múltiplos
// candidatos, Seção "Modelo de correspondência" da spec de homônimos), não
// cabe mais no fluxo genérico de nome único usado pelas outras 3 dimensões.
const SECOES: SecaoConfig[] = [
  { tipo: "categoria", titulo: "Categorias", campo: "categoria", obrigatoria: true },
  { tipo: "centro_custo", titulo: "Centros de custo", campo: "centroCusto", obrigatoria: false },
  { tipo: "forma_pagamento", titulo: "Formas de pagamento", campo: "formaPagamento", obrigatoria: false },
];

export function PassoEntidades({
  linhasBrutas,
  entidadesExistentes,
  onVoltar,
  onAvancar,
}: {
  linhasBrutas: LinhaBruta[];
  entidadesExistentes: EntidadesExistentes;
  onVoltar: () => void;
  onAvancar: (resolucoes: Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>>, categoriasNovas: CategoriaNova[]) => void;
}) {
  const secoes = useMemo(
    () =>
      SECOES.map((secao) => {
        const valores = extrairValoresUnicos(linhasBrutas.map((l) => l[secao.campo] as string));
        const existentes = secao.tipo === "categoria" ? entidadesExistentes.categorias : entidadesExistentes[chaveExistentes(secao.tipo)];
        const correspondencias = resolverTodasCorrespondencias(valores, existentes);
        return { ...secao, valores, correspondencias };
      }).filter((s) => s.valores.length > 0),
    [linhasBrutas, entidadesExistentes],
  );

  const [decisoes, setDecisoes] = useState<Record<string, ResolucaoEntidade>>(() => {
    const inicial: Record<string, ResolucaoEntidade> = {};
    for (const secao of secoes) {
      for (const c of secao.correspondencias) {
        if (c.tipoCorrespondencia === "exata") {
          inicial[chaveDecisao(secao.tipo, c.valorOriginal)] = { valorOriginal: c.valorOriginal, acao: "usar_existente", entidadeId: c.correspondenciaId };
        }
      }
    }
    return inicial;
  });

  // Coluna "Cliente/Fornecedor": documento vem da primeira linha do arquivo
  // que citar esse nome com CPF/CNPJ preenchido — mesma extração que já
  // existia só pra popular pessoa nova, agora também usada pra decidir a
  // correspondência (documento passa a valer aqui também, igual ao import
  // de Clientes/Fornecedores).
  const valoresPessoa = useMemo(() => extrairValoresUnicos(linhasBrutas.map((l) => l.pessoa)), [linhasBrutas]);
  const correspondenciasPessoa = useMemo(
    () =>
      valoresPessoa.map((valor) => {
        const documento = linhasBrutas.find((l) => normalizarTexto(l.pessoa) === normalizarTexto(valor) && l.documentoPessoa.trim())?.documentoPessoa ?? "";
        return { valorOriginal: valor, correspondencia: resolverCorrespondenciaPessoa({ nome: valor, documento }, entidadesExistentes.pessoas) };
      }),
    [valoresPessoa, linhasBrutas, entidadesExistentes.pessoas],
  );

  const [decisoesPessoa, setDecisoesPessoa] = useState<Record<string, ResolucaoEntidade>>(() => {
    const inicial: Record<string, ResolucaoEntidade> = {};
    for (const c of correspondenciasPessoa) {
      // Único caso que decide sozinho: documento bateu com EXATAMENTE um
      // cadastro. Nome sozinho nunca mais pré-decide (era o buraco original).
      if (c.correspondencia.tipo === "exata_documento" && c.correspondencia.candidatos.length === 1) {
        inicial[c.valorOriginal] = { valorOriginal: c.valorOriginal, acao: "usar_existente", entidadeId: c.correspondencia.candidatos[0].id };
      }
    }
    return inicial;
  });

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function definirDecisao(tipo: TipoEntidadeImportacao, valorOriginal: string, decisao: ResolucaoEntidade) {
    setDecisoes((atual) => ({ ...atual, [chaveDecisao(tipo, valorOriginal)]: decisao }));
  }

  function definirDecisaoPessoa(valorOriginal: string, decisao: ResolucaoEntidade) {
    setDecisoesPessoa((atual) => ({ ...atual, [valorOriginal]: decisao }));
  }

  const todasResolvidas =
    secoes.every((secao) =>
      secao.valores.every((v) => {
        const d = decisoes[chaveDecisao(secao.tipo, v)];
        if (!d) return false;
        if (d.acao === "criar_novo" && secao.tipo === "categoria" && !d.tipoCategoriaNova) return false;
        return true;
      }),
    ) && valoresPessoa.every((v) => Boolean(decisoesPessoa[v]));

  async function avancar() {
    setErro("");

    // Monta a lista de criação a partir das seções (mantém o tipo junto,
    // já que o Record de decisões só guarda o texto original). Pessoa nova
    // herda o CPF/CNPJ da primeira linha do arquivo que citar esse nome e
    // trouxer o documento preenchido (Seção 5 da spec original: coluna só é
    // usada quando Cliente/Fornecedor também vem preenchido nessa linha).
    const paraCriar: { tipo: TipoEntidadeImportacao; nome: string; tipoCategoria?: "RECEITA" | "DESPESA"; documento?: string }[] = [];
    for (const secao of secoes) {
      for (const valor of secao.valores) {
        const d = decisoes[chaveDecisao(secao.tipo, valor)];
        if (d?.acao === "criar_novo") {
          paraCriar.push({ tipo: secao.tipo, nome: valor, tipoCategoria: d.tipoCategoriaNova });
        }
      }
    }
    for (const valor of valoresPessoa) {
      const d = decisoesPessoa[valor];
      if (d?.acao === "criar_novo") {
        const documento = linhasBrutas.find((l) => normalizarTexto(l.pessoa) === normalizarTexto(valor) && l.documentoPessoa.trim())?.documentoPessoa;
        paraCriar.push({ tipo: "pessoa", nome: valor, documento });
      }
    }

    if (paraCriar.length === 0) {
      onAvancar(montarMapaFinal(secoes, decisoes, valoresPessoa, decisoesPessoa), []);
      return;
    }

    setEnviando(true);
    const resultado = await criarEntidadesAprovadasAction(paraCriar);
    setEnviando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }

    const falhas = resultado.resultados.filter((r) => r.erro);
    if (falhas.length > 0) {
      setErro(`Falha ao criar: ${falhas.map((f) => `"${f.valorOriginal}" (${f.erro})`).join(", ")}`);
      return;
    }

    const decisoesAtualizadas = { ...decisoes };
    const decisoesPessoaAtualizadas = { ...decisoesPessoa };
    const categoriasNovas: CategoriaNova[] = [];
    for (const r of resultado.resultados) {
      if (r.tipo === "pessoa") {
        if (r.id) decisoesPessoaAtualizadas[r.valorOriginal] = { valorOriginal: r.valorOriginal, acao: "usar_existente", entidadeId: r.id };
        continue;
      }
      const secao = secoes.find((s) => s.tipo === r.tipo);
      if (!secao || !r.id) continue;
      decisoesAtualizadas[chaveDecisao(r.tipo, r.valorOriginal)] = { valorOriginal: r.valorOriginal, acao: "usar_existente", entidadeId: r.id };
      if (r.tipo === "categoria") {
        const original = paraCriar.find((p) => p.tipo === "categoria" && p.nome === r.valorOriginal);
        if (original?.tipoCategoria) categoriasNovas.push({ id: r.id, nome: r.valorOriginal, tipo: original.tipoCategoria });
      }
    }

    onAvancar(montarMapaFinal(secoes, decisoesAtualizadas, valoresPessoa, decisoesPessoaAtualizadas), categoriasNovas);
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">3. Revise categorias, centros de custo, pessoas e formas de pagamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada valor único encontrado na planilha precisa apontar pra um cadastro existente ou virar um cadastro novo.
        </p>
      </div>

      {secoes.map((secao) => (
        <div key={secao.tipo} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {secao.titulo} ({secao.valores.length})
          </h3>
          <div className="space-y-1.5">
            {secao.correspondencias.map((c) => (
              <LinhaEntidade
                key={c.valorOriginal}
                tipo={secao.tipo}
                correspondencia={c}
                existentes={secao.tipo === "categoria" ? entidadesExistentes.categorias : entidadesExistentes[chaveExistentes(secao.tipo)]}
                decisao={decisoes[chaveDecisao(secao.tipo, c.valorOriginal)] ?? null}
                onMudar={(d) => definirDecisao(secao.tipo, c.valorOriginal, d)}
              />
            ))}
          </div>
        </div>
      ))}

      {valoresPessoa.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Clientes / Fornecedores ({valoresPessoa.length})</h3>
          <div className="space-y-1.5">
            {correspondenciasPessoa.map((c) => (
              <LinhaEntidadePessoa
                key={c.valorOriginal}
                valorOriginal={c.valorOriginal}
                correspondencia={c.correspondencia}
                existentes={entidadesExistentes.pessoas}
                decisao={decisoesPessoa[c.valorOriginal] ?? null}
                onMudar={(d) => definirDecisaoPessoa(c.valorOriginal, d)}
              />
            ))}
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar} disabled={enviando}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button type="button" className="gap-1.5" disabled={!todasResolvidas || enviando} onClick={avancar}>
          {enviando ? (
            <>
              <Spinner size={14} className="animate-spin" />
              Criando cadastros...
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
  );
}

function chaveExistentes(tipo: TipoEntidadeImportacao): "centrosCusto" | "pessoas" | "formasPagamento" {
  if (tipo === "centro_custo") return "centrosCusto";
  if (tipo === "pessoa") return "pessoas";
  return "formasPagamento";
}

// Usa normalizarTexto (sem acento) em vez de só toLowerCase — precisa bater
// exatamente com a chave que o resolver de passo-preview.tsx usa pra buscar
// no Map (mesma função dos dois lados), senão uma categoria com acento cai
// como "não resolvida" mesmo depois de confirmada aqui.
function chaveDecisao(tipo: TipoEntidadeImportacao, valorOriginal: string): string {
  return `${tipo}::${normalizarTexto(valorOriginal)}`;
}

function montarMapaFinal(
  secoes: { tipo: TipoEntidadeImportacao; valores: string[] }[],
  decisoes: Record<string, ResolucaoEntidade>,
  valoresPessoa: string[],
  decisoesPessoa: Record<string, ResolucaoEntidade>,
): Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>> {
  const mapa: Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>> = {
    categoria: new Map(),
    centro_custo: new Map(),
    pessoa: new Map(),
    forma_pagamento: new Map(),
  };
  for (const secao of secoes) {
    for (const valor of secao.valores) {
      const d = decisoes[chaveDecisao(secao.tipo, valor)];
      mapa[secao.tipo].set(normalizarTexto(valor), d);
    }
  }
  for (const valor of valoresPessoa) {
    mapa.pessoa.set(normalizarTexto(valor), decisoesPessoa[valor]);
  }
  return mapa;
}

function LinhaEntidade({
  tipo,
  correspondencia,
  existentes,
  decisao,
  onMudar,
}: {
  tipo: TipoEntidadeImportacao;
  correspondencia: { valorOriginal: string; correspondenciaId: string | null; correspondenciaNome: string | null; tipoCorrespondencia: "exata" | "aproximada" | "nenhuma" };
  existentes: { id: string; nome: string }[];
  decisao: ResolucaoEntidade;
  onMudar: (decisao: ResolucaoEntidade) => void;
}) {
  const CRIAR_NOVO = "__criar_novo__";
  const selecaoAtual = decisao?.acao === "usar_existente" ? decisao.entidadeId ?? "" : decisao?.acao === "criar_novo" ? CRIAR_NOVO : "";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
      <div className="min-w-32 flex-1">
        <p className="text-sm font-medium text-foreground">{correspondencia.valorOriginal}</p>
        {correspondencia.tipoCorrespondencia === "exata" && (
          <Badge variant="outline" className="mt-1 gap-1 border-none bg-[#157F6B]/12 text-[#0F5F50]">
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

      <Select value={selecaoAtual} onValueChange={(v) => (v === CRIAR_NOVO ? onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "criar_novo", entidadeId: null }) : onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "usar_existente", entidadeId: v }))}>
        <SelectTrigger className="h-8 w-56 text-xs">
          <SelectValue placeholder="Escolher ação..." />
        </SelectTrigger>
        <SelectContent>
          {correspondencia.correspondenciaId && (
            <SelectItem value={correspondencia.correspondenciaId}>Usar &quot;{correspondencia.correspondenciaNome}&quot;</SelectItem>
          )}
          {existentes
            .filter((e) => e.id !== correspondencia.correspondenciaId)
            .map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          <SelectItem value={CRIAR_NOVO}>+ Criar &quot;{correspondencia.valorOriginal}&quot; novo</SelectItem>
        </SelectContent>
      </Select>

      {tipo === "categoria" && decisao?.acao === "criar_novo" && (
        <Select
          value={decisao.tipoCategoriaNova ?? ""}
          onValueChange={(v) => onMudar({ ...decisao, tipoCategoriaNova: v as "RECEITA" | "DESPESA" })}
        >
          <SelectTrigger className={cn("h-8 w-32 text-xs", !decisao.tipoCategoriaNova && "border-destructive text-destructive")}>
            <SelectValue placeholder="Receita/Despesa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RECEITA">Receita</SelectItem>
            <SelectItem value="DESPESA">Despesa</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// Diferente de LinhaEntidade: pessoa pode ter VÁRIOS candidatos (homônimo)
// em vez de um só "melhor" — precisa listar todos, nunca escolher em
// silêncio (Seção "Modelo de correspondência" da spec de homônimos).
function LinhaEntidadePessoa({
  valorOriginal,
  correspondencia,
  existentes,
  decisao,
  onMudar,
}: {
  valorOriginal: string;
  correspondencia: CorrespondenciaPessoa;
  existentes: PessoaExistente[];
  decisao: ResolucaoEntidade;
  onMudar: (decisao: ResolucaoEntidade) => void;
}) {
  const CRIAR_NOVO = "__criar_novo__";
  const selecaoAtual = decisao?.acao === "usar_existente" ? decisao.entidadeId ?? "" : decisao?.acao === "criar_novo" ? CRIAR_NOVO : "";

  const idsCandidatos = new Set(correspondencia.candidatos.map((c) => c.id));
  const opcoes = [...correspondencia.candidatos, ...existentes.filter((e) => !idsCandidatos.has(e.id))];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
      <div className="min-w-32 flex-1">
        <p className="text-sm font-medium text-foreground">{valorOriginal}</p>
        <BadgeCorrespondenciaPessoa correspondencia={correspondencia} />
      </div>

      <Select
        value={selecaoAtual}
        onValueChange={(v) => (v === CRIAR_NOVO ? onMudar({ valorOriginal, acao: "criar_novo", entidadeId: null }) : onMudar({ valorOriginal, acao: "usar_existente", entidadeId: v }))}
      >
        <SelectTrigger className="h-8 w-64 text-xs">
          <SelectValue placeholder="Escolher ação..." />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((p) => {
            const rotulo = [p.documento, p.email, p.telefone].filter(Boolean).join(" · ");
            return (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex flex-col">
                  <span>Usar &quot;{p.nome}&quot;</span>
                  {rotulo && <span className="text-[10px] text-muted-foreground">{rotulo}</span>}
                </span>
              </SelectItem>
            );
          })}
          <SelectItem value={CRIAR_NOVO}>+ Criar &quot;{valorOriginal}&quot; novo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function BadgeCorrespondenciaPessoa({ correspondencia }: { correspondencia: CorrespondenciaPessoa }) {
  const { tipo, candidatos } = correspondencia;

  if (tipo === "exata_documento" && candidatos.length === 1) {
    return (
      <Badge variant="outline" className="mt-1 gap-1 border-none bg-[#157F6B]/12 text-[#0F5F50]">
        <Check size={11} />
        Documento bate com &quot;{candidatos[0].nome}&quot;
      </Badge>
    );
  }
  if (tipo === "exata_documento") {
    return (
      <Badge variant="outline" className="mt-1 gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
        <Sparkle size={11} />
        Documento bate com mais de um cadastro — escolha qual
      </Badge>
    );
  }
  if (tipo === "documento_conflito") {
    return (
      <Badge variant="outline" className="mt-1 gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
        <Sparkle size={11} />
        Nome bate com &quot;{candidatos[0].nome}&quot;, documento é diferente do cadastrado
      </Badge>
    );
  }
  if (tipo === "exata_nome") {
    return (
      <Badge variant="outline" className="mt-1 gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
        <Sparkle size={11} />
        {candidatos.length > 1 ? "Mais de um cadastro com esse nome — escolha qual" : `Mesmo nome de "${candidatos[0].nome}" — confirme`}
      </Badge>
    );
  }
  if (tipo === "aproximada") {
    return (
      <Badge variant="outline" className="mt-1 gap-1 border-none bg-amber-500/12 text-amber-700 dark:text-amber-400">
        <Sparkle size={11} />
        Parece &quot;{candidatos[0].nome}&quot; — confirme
      </Badge>
    );
  }
  if (tipo === "fraca") {
    return (
      <Badge variant="outline" className="mt-1 border-none bg-muted text-muted-foreground">
        Pode ser &quot;{candidatos[0].nome}&quot; — confira antes de criar novo
      </Badge>
    );
  }
  return null;
}
