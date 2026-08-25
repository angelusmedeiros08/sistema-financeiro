"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkle, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComboboxEntidade, type ValorComboboxEntidade } from "@/components/formularios/combobox-entidade";
import { cn } from "@/lib/utils";
import { extrairValoresUnicos, resolverTodasCorrespondencias } from "@/lib/importacao/fuzzy";
import { normalizarTexto, type FormatoNumerico } from "@/lib/importacao/locale-br";
import { resolverCorrespondenciaPessoa, type PessoaExistente } from "@/lib/pessoas/importacao/correspondencia";
import { criarEntidadesAprovadasAction, iniciarImportacaoFinanceiraAction } from "./actions";
import type { EntidadesExistentes } from "@/lib/importacao/resolucao";
import type { LinhaBruta, ResolucaoEntidade, TipoEntidadeImportacao } from "@/lib/importacao/tipos";
import type { CorrespondenciaPessoa } from "@/lib/pessoas/importacao/tipos";
import type { Database } from "@/utils/supabase/database.types";

type CategoriaNova = { id: string; nome: string; tipo: Database["public"]["Enums"]["tipo_categoria"] };

type SecaoConfig = { tipo: TipoEntidadeImportacao; titulo: string; campo: keyof LinhaBruta; obrigatoria: boolean };

type CorrespondenciaGenerica = {
  valorOriginal: string;
  correspondenciaId: string | null;
  correspondenciaNome: string | null;
  tipoCorrespondencia: "exata" | "aproximada" | "nenhuma";
};

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
  formatoNumericoAssumido,
  onRevisarColunas,
  onVoltar,
  onAvancar,
}: {
  linhasBrutas: LinhaBruta[];
  nomeArquivo: string;
  entidadesExistentes: EntidadesExistentes;
  colunasFoiPulado: boolean;
  formatoNumericoAssumido: FormatoNumerico;
  onRevisarColunas: () => void;
  onVoltar: () => void;
  onAvancar: (resolucoes: Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>>, categoriasNovas: CategoriaNova[], importacaoId: string | null) => void;
}) {
  // Nasce assim que a etapa Cadastros abre — antes de qualquer entidade ser
  // criada, porque a criação já precisa registrar proveniência
  // (importacoes_entidades_criadas, Fatia 4 da spec) e cada linha comitada
  // mais adiante (Revisão → Importação) também depende deste id pra
  // registrar seu próprio item. Antes, uma falha aqui deixava a importação
  // seguir em frente sem rastreamento nenhum — lançamentos nasciam reais e
  // visíveis, mas ninguém achava o lote na Central de Importações nem
  // conseguia desfazê-lo depois (caso real: Erick importou, 47 lançamentos
  // foram criados, zero linha em `importacoes`). Agora bloqueia: sem
  // importacaoId confirmado, "Continuar" não libera.
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const [erroInicializacao, setErroInicializacao] = useState("");
  const [inicializando, setInicializando] = useState(true);
  const [tentativaInicializacao, setTentativaInicializacao] = useState(0);
  useEffect(() => {
    iniciarImportacaoFinanceiraAction({ nomeArquivo, totalLinhas: linhasBrutas.length }).then((r) => {
      setInicializando(false);
      if ("erro" in r) {
        setErroInicializacao(r.erro);
        return;
      }
      setImportacaoId(r.importacaoId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativaInicializacao]);

  // Dispara pelo clique do botão "Tentar de novo" (nunca sincronamente
  // dentro do efeito acima) — muda o estado pra "tentando" na hora e só
  // então incrementa a dependência do efeito, que refaz a chamada.
  function tentarNovoRastreamento() {
    setInicializando(true);
    setErroInicializacao("");
    setTentativaInicializacao((t) => t + 1);
  }

  // Quando a etapa Colunas foi pulada automaticamente, a tela muda de
  // conteúdo sem nenhuma ação do usuário — sem foco movido pro heading,
  // quem usa leitor de tela nem percebe que já está numa etapa nova
  // (achado na auditoria de acessibilidade). Só move foco nesse caso
  // específico: quando o usuário clicou "Continuar" de propósito, ele já
  // sabe onde está e mover o foco à força seria mais confuso, não menos.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (colunasFoiPulado) headingRef.current?.focus();
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

  // Só pra separar visualmente a seção Categorias em Despesa/Receita —
  // tipo já vem junto de entidadesExistentes.categorias, nenhuma query nova.
  const tipoCategoriaExistentePorId = useMemo(() => {
    const mapa = new Map<string, "RECEITA" | "DESPESA">();
    for (const c of entidadesExistentes.categorias) mapa.set(c.id, c.tipo);
    return mapa;
  }, [entidadesExistentes.categorias]);

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
      // Documento bateu com EXATAMENTE um cadastro decide sozinho, sempre.
      // Nome aproximado com um único candidato também pré-preenche — o
      // badge "Parece X — confirme" continua visível, então o operador
      // ainda revisa, só não precisa abrir a lista pra confirmar o óbvio.
      // Com 2+ candidatos parecidos (ambíguo de verdade) ou nome exato sem
      // documento (pode ser homônimo — era o buraco original) continua sem
      // pré-selecionar.
      const decideSozinho =
        (c.correspondencia.tipo === "exata_documento" || c.correspondencia.tipo === "aproximada") && c.correspondencia.candidatos.length === 1;
      if (decideSozinho) {
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

  function decisaoIncompleta(secao: (typeof secoes)[number], valor: string): boolean {
    const d = decisoes[chaveDecisao(secao.tipo, valor)];
    if (!d) return true;
    if (d.acao === "criar_novo" && secao.tipo === "categoria" && !d.tipoCategoriaNova) return true;
    return false;
  }

  // Numa planilha de 100 linhas isso facilmente passa de 50 valores únicos
  // espalhados por 4 seções — sem contar quantos faltam em cada uma, o
  // usuário só descobre que falta algo quando o botão "Continuar" já está
  // desabilitado, sem saber onde (achado testando ao vivo com um arquivo
  // grande de verdade).
  const pendenciasPorSecao = secoes
    .map((secao) => ({ titulo: secao.titulo, quantidade: secao.valores.filter((v) => decisaoIncompleta(secao, v)).length }))
    .filter((p) => p.quantidade > 0);
  const pendenciasPessoa = valoresPessoa.filter((v) => !decisoesPessoa[v]).length;
  const totalPendencias = pendenciasPorSecao.reduce((acc, p) => acc + p.quantidade, 0) + pendenciasPessoa;

  const todasResolvidas = totalPendencias === 0;

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
        <h2 ref={headingRef} tabIndex={-1} className="text-sm font-bold text-foreground outline-none">
          3. Revise categorias, centros de custo, pessoas e formas de pagamento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada valor único encontrado na planilha precisa apontar pra um cadastro existente ou virar um cadastro novo.
        </p>
        {colunasFoiPulado && (
          <button type="button" onClick={onRevisarColunas} className="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline">
            Colunas reconhecidas automaticamente (formato {formatoNumericoAssumido === "BR" ? "brasileiro" : "americano"}) — Revisar mapeamento de
            colunas
          </button>
        )}
      </div>

      {erroInicializacao && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span>
            Não foi possível preparar o rastreamento desta importação — sem isso, os lançamentos não apareceriam na Central de Importações nem
            poderiam ser desfeitos depois. {erroInicializacao}
          </span>
          <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={inicializando} onClick={tentarNovoRastreamento}>
            {inicializando ? "Tentando..." : "Tentar de novo"}
          </Button>
        </div>
      )}

      {totalPendencias > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
          <span className="font-bold">Falta decidir {totalPendencias}:</span>
          {pendenciasPorSecao.map((p) => (
            <span key={p.titulo}>
              {p.titulo} ({p.quantidade})
            </span>
          ))}
          {pendenciasPessoa > 0 && <span>Clientes / Fornecedores ({pendenciasPessoa})</span>}
        </div>
      )}

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
            {secao.tipo === "categoria" ? (
              (() => {
                const grupos = agruparCorrespondenciasCategoria(secao.correspondencias, tipoCategoriaExistentePorId);
                return (
                  <div className="space-y-4">
                    {grupos.novas.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground/70">
                          Novas — defina o tipo ({grupos.novas.length})
                        </h4>
                        {grupos.novas.map((c) => (
                          <LinhaCategoriaNova
                            key={c.valorOriginal}
                            correspondencia={c}
                            existentes={entidadesExistentes.categorias}
                            decisao={decisoes[chaveDecisao("categoria", c.valorOriginal)] ?? null}
                            onMudar={(d) => definirDecisao("categoria", c.valorOriginal, d)}
                          />
                        ))}
                      </div>
                    )}
                    {grupos.despesa.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground/70">Despesa ({grupos.despesa.length})</h4>
                        {grupos.despesa.map((c) => (
                          <LinhaEntidade
                            key={c.valorOriginal}
                            tipo="categoria"
                            correspondencia={c}
                            existentes={entidadesExistentes.categorias}
                            decisao={decisoes[chaveDecisao("categoria", c.valorOriginal)] ?? null}
                            onMudar={(d) => definirDecisao("categoria", c.valorOriginal, d)}
                          />
                        ))}
                      </div>
                    )}
                    {grupos.receita.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground/70">Receita ({grupos.receita.length})</h4>
                        {grupos.receita.map((c) => (
                          <LinhaEntidade
                            key={c.valorOriginal}
                            tipo="categoria"
                            correspondencia={c}
                            existentes={entidadesExistentes.categorias}
                            decisao={decisoes[chaveDecisao("categoria", c.valorOriginal)] ?? null}
                            onMudar={(d) => definirDecisao("categoria", c.valorOriginal, d)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="space-y-1.5">
                {secao.correspondencias.map((c) => (
                  <LinhaEntidade
                    key={c.valorOriginal}
                    tipo={secao.tipo}
                    correspondencia={c}
                    existentes={entidadesExistentes[chaveExistentes(secao.tipo)]}
                    decisao={decisoes[chaveDecisao(secao.tipo, c.valorOriginal)] ?? null}
                    onMudar={(d) => definirDecisao(secao.tipo, c.valorOriginal, d)}
                  />
                ))}
              </div>
            )}
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

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar} disabled={enviando}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {totalPendencias > 0 && <span className="text-xs text-muted-foreground">Ainda falta decidir {totalPendencias} valor(es) acima.</span>}
          <Button type="button" className="gap-1.5" disabled={!todasResolvidas || !importacaoId || enviando} onClick={avancar}>
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

// Só pra seção Categorias: separa Despesa/Receita/Novas antes de renderizar.
// Baseado só em correspondenciaId + tipoPorId (nunca em decisoes), então um
// item nunca troca de grupo depois de decidido — evita a lista "pular"
// embaixo do cursor enquanto o operador rola (Seção "Agrupamento por tipo"
// da spec).
function agruparCorrespondenciasCategoria(correspondencias: CorrespondenciaGenerica[], tipoPorId: Map<string, "RECEITA" | "DESPESA">) {
  const novas: CorrespondenciaGenerica[] = [];
  const despesa: CorrespondenciaGenerica[] = [];
  const receita: CorrespondenciaGenerica[] = [];
  for (const c of correspondencias) {
    const tipo = c.correspondenciaId ? tipoPorId.get(c.correspondenciaId) : undefined;
    if (tipo === "DESPESA") despesa.push(c);
    else if (tipo === "RECEITA") receita.push(c);
    else novas.push(c);
  }
  return { novas, despesa, receita };
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
  correspondencia: CorrespondenciaGenerica;
  existentes: { id: string; nome: string; tipo?: "RECEITA" | "DESPESA" }[];
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
  // aparece na lista completa de existentes. Nas outras 3 dimensões
  // (centro de custo/forma de pagamento/pessoa via LinhaEntidadePessoa)
  // `tipo` nunca vem preenchido, então nenhuma delas ganha `grupo` — só
  // categoria some misturada com Despesa/Receita numa lista só (achado
  // testando ao vivo: o combobox de busca não separava por tipo, mesmo
  // depois da seção Cadastros já separar).
  const opcoesExistentes = existentes.filter((e) => e.id !== correspondencia.correspondenciaId);
  const opcoes =
    tipo === "categoria"
      ? [
          ...(correspondencia.correspondenciaId ? [{ id: correspondencia.correspondenciaId, rotulo: `Usar "${correspondencia.correspondenciaNome}"` }] : []),
          ...opcoesExistentes.filter((e) => e.tipo === "DESPESA").map((e) => ({ id: e.id, rotulo: e.nome, grupo: "Despesa" })),
          ...opcoesExistentes.filter((e) => e.tipo === "RECEITA").map((e) => ({ id: e.id, rotulo: e.nome, grupo: "Receita" })),
        ]
      : [
          ...(correspondencia.correspondenciaId ? [{ id: correspondencia.correspondenciaId, rotulo: `Usar "${correspondencia.correspondenciaNome}"` }] : []),
          ...opcoesExistentes.map((e) => ({ id: e.id, rotulo: e.nome })),
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
        rotuloAcessivel={`Ação para "${correspondencia.valorOriginal}"`}
      />
    </div>
  );
}

// Só pro grupo "Novas — defina o tipo": categoria sem nenhuma correspondência
// vai virar cadastro novo de qualquer forma, só falta o tipo — clicar
// Despesa/Receita já cria, sem abrir combobox nenhum (Seção "Categoria nova"
// da spec). "Buscar cadastro existente" cobre o caso do fuzzy match não ter
// batido (ex.: planilha trouxe "Honorários de Clientes", já existe
// "Honorários Contratuais") — troca pra busca completa, com link pra voltar.
function LinhaCategoriaNova({
  correspondencia,
  existentes,
  decisao,
  onMudar,
}: {
  correspondencia: CorrespondenciaGenerica;
  existentes: { id: string; nome: string; tipo: "RECEITA" | "DESPESA" }[];
  decisao: ResolucaoEntidade;
  onMudar: (decisao: ResolucaoEntidade) => void;
}) {
  const [modoBusca, setModoBusca] = useState(decisao?.acao === "usar_existente");

  function converterEChamar(valor: ValorComboboxEntidade) {
    if (!valor) return;
    if (valor.tipo === "existente") {
      onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "usar_existente", entidadeId: valor.id });
    } else {
      onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "criar_novo", entidadeId: null, tipoCategoriaNova: valor.tipoCategoriaNova });
    }
  }

  function escolherTipo(tipoCategoriaNova: "DESPESA" | "RECEITA") {
    onMudar({ valorOriginal: correspondencia.valorOriginal, acao: "criar_novo", entidadeId: null, tipoCategoriaNova });
  }

  if (modoBusca) {
    const opcoes = [
      ...existentes.filter((e) => e.tipo === "DESPESA").map((e) => ({ id: e.id, rotulo: e.nome, grupo: "Despesa" })),
      ...existentes.filter((e) => e.tipo === "RECEITA").map((e) => ({ id: e.id, rotulo: e.nome, grupo: "Receita" })),
    ];
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
        <p className="min-w-32 flex-1 text-sm font-medium text-foreground">{correspondencia.valorOriginal}</p>
        <ComboboxEntidade
          opcoes={opcoes}
          valor={decisaoParaValor(decisao)}
          onMudar={converterEChamar}
          nomeParaCriar={correspondencia.valorOriginal}
          acoesCriar={ACOES_CRIAR_POR_TIPO.categoria}
          rotuloAcessivel={`Ação para "${correspondencia.valorOriginal}"`}
        />
        <button
          type="button"
          onClick={() => {
            // Só limpa quando a decisão atual veio da busca
            // ("usar_existente") — sem isso, o cadastro que o operador
            // acabou de rejeitar ficava vivo por baixo do toggle,
            // visualmente sem nada selecionado mas contando como resolvido
            // se o operador seguisse sem tocar em Despesa/Receita de novo
            // (achado testando ao vivo o link "Criar nova"). Se a decisão já
            // era "criar_novo" (o operador só espiou a busca e voltou), o
            // toggle já reflete certo sozinho — não precisa (e não deve)
            // limpar a escolha de Despesa/Receita feita antes.
            if (decisao?.acao === "usar_existente") onMudar(null);
            setModoBusca(false);
          }}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Criar nova
        </button>
      </div>
    );
  }

  const tipoSelecionado = decisao?.acao === "criar_novo" ? decisao.tipoCategoriaNova : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2.5">
      <p className="min-w-32 flex-1 text-sm font-medium text-foreground">{correspondencia.valorOriginal}</p>
      <button
        type="button"
        onClick={() => setModoBusca(true)}
        className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground"
      >
        Buscar cadastro existente
      </button>
      <div role="group" aria-label={`Tipo de "${correspondencia.valorOriginal}"`} className="inline-flex overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          aria-pressed={tipoSelecionado === "DESPESA"}
          onClick={() => escolherTipo("DESPESA")}
          className={cn(
            "px-2.5 py-1.5 text-xs font-semibold transition-colors",
            tipoSelecionado === "DESPESA" ? "bg-destructive/10 text-destructive" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Despesa
        </button>
        <button
          type="button"
          aria-pressed={tipoSelecionado === "RECEITA"}
          onClick={() => escolherTipo("RECEITA")}
          className={cn(
            "border-l border-border px-2.5 py-1.5 text-xs font-semibold transition-colors",
            tipoSelecionado === "RECEITA" ? "bg-positivo/10 text-positivo" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Receita
        </button>
      </div>
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
        rotuloAcessivel={`Ação para "${valorOriginal}"`}
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
