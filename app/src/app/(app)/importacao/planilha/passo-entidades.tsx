"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkle, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComboboxEntidade, type ValorComboboxEntidade } from "@/components/formularios/combobox-entidade";
import { extrairValoresUnicos, resolverTodasCorrespondencias } from "@/lib/importacao/fuzzy";
import { normalizarTexto } from "@/lib/importacao/locale-br";
import { resolverCorrespondenciaPessoa, type PessoaExistente } from "@/lib/pessoas/importacao/correspondencia";
import { criarEntidadesAprovadasAction, iniciarImportacaoFinanceiraAction } from "./actions";
import type { EntidadesExistentes } from "@/lib/importacao/resolucao";
import type { LinhaBruta, ResolucaoEntidade, TipoEntidadeImportacao } from "@/lib/importacao/tipos";
import type { CorrespondenciaPessoa } from "@/lib/pessoas/importacao/tipos";
import type { Database } from "@/utils/supabase/database.types";

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
  nomeArquivo,
  entidadesExistentes,
  colunasFoiPulado,
  onRevisarColunas,
  onVoltar,
  onAvancar,
}: {
  linhasBrutas: LinhaBruta[];
  nomeArquivo: string;
  entidadesExistentes: EntidadesExistentes;
  colunasFoiPulado: boolean;
  onRevisarColunas: () => void;
  onVoltar: () => void;
  onAvancar: (resolucoes: Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>>, categoriasNovas: CategoriaNova[], importacaoId: string | null) => void;
}) {
  // Nasce assim que a etapa Cadastros abre — antes de qualquer entidade
  // ser criada, porque a criação já precisa registrar proveniência
  // (importacoes_entidades_criadas, Fatia 4 da spec). Se falhar, segue sem
  // rastreamento de lote em vez de travar o usuário — desfazer depois não
  // vai listar essa importação, mas o import em si continua funcionando.
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  useEffect(() => {
    iniciarImportacaoFinanceiraAction({ nomeArquivo, totalLinhas: linhasBrutas.length }).then((r) => {
      if (!("erro" in r)) setImportacaoId(r.importacaoId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // Ações em lote: só tocam correspondência de candidato único e
  // não-ambígua — exatamente o que já decidiria certo se o usuário
  // confirmasse linha a linha, só que num clique só. Nunca mexem em
  // "exata_nome" (buraco original da spec de homônimos), conflito de
  // documento, múltiplos candidatos ou "fraca" — esses continuam exigindo
  // decisão manual, porque errar ali tem custo real (duplicar/juntar
  // cadastro errado). E nunca pisam numa linha que o usuário já decidiu à
  // mão (mesmo que a decisão manual seja diferente da sugestão) — sem essa
  // guarda, "Aceitar sugestões" desfazia silenciosamente uma correção
  // manual feita segundos antes na mesma seção.
  function aceitarSugestoes(secao: (typeof secoes)[number]) {
    setDecisoes((atual) => {
      const novo = { ...atual };
      for (const c of secao.correspondencias) {
        const chave = chaveDecisao(secao.tipo, c.valorOriginal);
        if (c.tipoCorrespondencia === "aproximada" && c.correspondenciaId && !atual[chave]) {
          novo[chave] = { valorOriginal: c.valorOriginal, acao: "usar_existente", entidadeId: c.correspondenciaId };
        }
      }
      return novo;
    });
  }

  function criarTodosNovos(secao: (typeof secoes)[number]) {
    setDecisoes((atual) => {
      const novo = { ...atual };
      for (const c of secao.correspondencias) {
        const chave = chaveDecisao(secao.tipo, c.valorOriginal);
        if (c.tipoCorrespondencia === "nenhuma" && !atual[chave]) {
          novo[chave] = { valorOriginal: c.valorOriginal, acao: "criar_novo", entidadeId: null };
        }
      }
      return novo;
    });
  }

  function aceitarSugestoesPessoa() {
    setDecisoesPessoa((atual) => {
      const novo = { ...atual };
      for (const c of correspondenciasPessoa) {
        if (c.correspondencia.tipo === "aproximada" && c.correspondencia.candidatos.length === 1 && !atual[c.valorOriginal]) {
          novo[c.valorOriginal] = { valorOriginal: c.valorOriginal, acao: "usar_existente", entidadeId: c.correspondencia.candidatos[0].id };
        }
      }
      return novo;
    });
  }

  function criarTodosNovosPessoa() {
    setDecisoesPessoa((atual) => {
      const novo = { ...atual };
      for (const c of correspondenciasPessoa) {
        if (c.correspondencia.tipo === "nenhuma" && !atual[c.valorOriginal]) {
          novo[c.valorOriginal] = { valorOriginal: c.valorOriginal, acao: "criar_novo", entidadeId: null };
        }
      }
      return novo;
    });
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
      onAvancar(montarMapaFinal(secoes, decisoes, valoresPessoa, decisoesPessoa), [], importacaoId);
      return;
    }

    setEnviando(true);
    const resultado = await criarEntidadesAprovadasAction(paraCriar, importacaoId ?? undefined);
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

    onAvancar(montarMapaFinal(secoes, decisoesAtualizadas, valoresPessoa, decisoesPessoaAtualizadas), categoriasNovas, importacaoId);
  }

  const numAproximadasPessoa = correspondenciasPessoa.filter(
    (c) => c.correspondencia.tipo === "aproximada" && c.correspondencia.candidatos.length === 1 && !decisoesPessoa[c.valorOriginal],
  ).length;
  const numSemCorrespondenciaPessoa = correspondenciasPessoa.filter((c) => c.correspondencia.tipo === "nenhuma" && !decisoesPessoa[c.valorOriginal]).length;

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">3. Revise categorias, centros de custo, pessoas e formas de pagamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada valor único encontrado na planilha precisa apontar pra um cadastro existente ou virar um cadastro novo.
        </p>
        {colunasFoiPulado && (
          <button type="button" onClick={onRevisarColunas} className="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline">
            Colunas reconhecidas automaticamente — Revisar mapeamento de colunas
          </button>
        )}
      </div>

      {secoes.map((secao) => {
        // Só conta o que o clique em lote realmente vai mudar — exclui
        // linhas já decididas à mão, senão o rótulo do botão promete mais
        // do que aplica (ou pior, sugere que reaplicaria em cima do que já
        // foi decidido).
        const numAproximadas = secao.correspondencias.filter(
          (c) => c.tipoCorrespondencia === "aproximada" && c.correspondenciaId && !decisoes[chaveDecisao(secao.tipo, c.valorOriginal)],
        ).length;
        const numSemCorrespondencia = secao.correspondencias.filter(
          (c) => c.tipoCorrespondencia === "nenhuma" && !decisoes[chaveDecisao(secao.tipo, c.valorOriginal)],
        ).length;
        return (
          <div key={secao.tipo} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {secao.titulo} ({secao.valores.length})
              </h3>
              <div className="flex gap-2">
                {numAproximadas > 1 && (
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => aceitarSugestoes(secao)}>
                    Aceitar {numAproximadas} sugestões
                  </Button>
                )}
                {numSemCorrespondencia > 1 && (
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => criarTodosNovos(secao)}>
                    Criar {numSemCorrespondencia} novos
                  </Button>
                )}
              </div>
            </div>
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
        );
      })}

      {valoresPessoa.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Clientes / Fornecedores ({valoresPessoa.length})</h3>
            <div className="flex gap-2">
              {numAproximadasPessoa > 1 && (
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={aceitarSugestoesPessoa}>
                  Aceitar {numAproximadasPessoa} sugestões
                </Button>
              )}
              {numSemCorrespondenciaPessoa > 1 && (
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={criarTodosNovosPessoa}>
                  Criar {numSemCorrespondenciaPessoa} novos
                </Button>
              )}
            </div>
          </div>
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

// Ações de criar: categoria pede tipo (Receita/Despesa) — cada uma já fecha
// nome + tipo num clique só, sem precisar de um segundo controle em
// sequência (buraco de clique achado testando a Fatia 4 ao vivo).
const ACOES_CRIAR_POR_TIPO: Record<TipoEntidadeImportacao, { rotulo: string; tipoCategoriaNova?: "RECEITA" | "DESPESA" }[]> = {
  categoria: [
    { rotulo: "Criar nova categoria de Despesa", tipoCategoriaNova: "DESPESA" },
    { rotulo: "Criar nova categoria de Receita", tipoCategoriaNova: "RECEITA" },
  ],
  centro_custo: [{ rotulo: "Criar novo centro de custo" }],
  forma_pagamento: [{ rotulo: "Criar nova forma de pagamento" }],
  pessoa: [{ rotulo: "Criar novo cadastro" }],
};

function decisaoParaValor(decisao: ResolucaoEntidade): ValorComboboxEntidade {
  if (!decisao) return null;
  if (decisao.acao === "criar_novo") return { tipo: "criar_novo", tipoCategoriaNova: decisao.tipoCategoriaNova };
  return decisao.entidadeId ? { tipo: "existente", id: decisao.entidadeId } : null;
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
  function converterEChamar(valor: ValorComboboxEntidade) {
    if (!valor) return;
    if (valor.tipo === "existente") {
      onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "usar_existente", entidadeId: valor.id });
    } else {
      onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "criar_novo", entidadeId: null, tipoCategoriaNova: valor.tipoCategoriaNova });
    }
  }

  // Sugestão (se houver) primeiro na lista, sem duplicar quando ela já
  // aparece na lista completa de existentes.
  const opcoes = [
    ...(correspondencia.correspondenciaId ? [{ id: correspondencia.correspondenciaId, rotulo: `Usar "${correspondencia.correspondenciaNome}"` }] : []),
    ...existentes.filter((e) => e.id !== correspondencia.correspondenciaId).map((e) => ({ id: e.id, rotulo: e.nome })),
  ];

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
        valor={decisaoParaValor(decisao)}
        onMudar={converterEChamar}
        nomeParaCriar={correspondencia.valorOriginal}
        acoesCriar={ACOES_CRIAR_POR_TIPO[tipo]}
      />
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
  function converterEChamar(valor: ValorComboboxEntidade) {
    if (!valor) return;
    if (valor.tipo === "existente") {
      onMudar({ valorOriginal, acao: "usar_existente", entidadeId: valor.id });
    } else {
      onMudar({ valorOriginal, acao: "criar_novo", entidadeId: null });
    }
  }

  const idsCandidatos = new Set(correspondencia.candidatos.map((c) => c.id));
  const opcoes = [...correspondencia.candidatos, ...existentes.filter((e) => !idsCandidatos.has(e.id))].map((p) => ({
    id: p.id,
    rotulo: `Usar "${p.nome}"`,
    subtexto: [p.documento, p.email, p.telefone].filter(Boolean).join(" · ") || undefined,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
      <div className="min-w-32 flex-1">
        <p className="text-sm font-medium text-foreground">{valorOriginal}</p>
        <BadgeCorrespondenciaPessoa correspondencia={correspondencia} />
      </div>

      <ComboboxEntidade
        opcoes={opcoes}
        valor={decisaoParaValor(decisao)}
        onMudar={converterEChamar}
        nomeParaCriar={valorOriginal}
        acoesCriar={ACOES_CRIAR_POR_TIPO.pessoa}
      />
    </div>
  );
}

function BadgeCorrespondenciaPessoa({ correspondencia }: { correspondencia: CorrespondenciaPessoa }) {
  const { tipo, candidatos } = correspondencia;

  if (tipo === "exata_documento" && candidatos.length === 1) {
    return (
      <Badge variant="outline" className="mt-1 gap-1 border-none bg-positivo/12 text-positivo-foreground">
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
