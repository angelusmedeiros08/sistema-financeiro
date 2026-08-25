"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Spinner, WarningCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/lib/formatacao";
import { normalizarTexto, type FormatoNumerico } from "@/lib/importacao/locale-br";
import { validarLinhas, aplicarAvisosDuplicata, type ResolvedorEntidade } from "@/lib/importacao/validacao";
import type { LinhaBruta, LinhaValidada, ResolucaoEntidade, TipoEntidadeImportacao } from "@/lib/importacao/tipos";
import type { EntidadesExistentes } from "@/lib/importacao/resolucao";
import type { Database } from "@/utils/supabase/database.types";
import { verificarDuplicatasAction } from "./actions";
import { cn } from "@/lib/utils";

type TipoCategoria = Database["public"]["Enums"]["tipo_categoria"];

export type LinhaPronta = {
  linha: LinhaValidada;
  categoriaId: string;
  tipo: TipoCategoria;
  pessoaId: string | null;
  centroCustoId: string | null;
  formaPagamentoId: string | null;
};

export function PassoPreview({
  linhasBrutas,
  formatoNumerico,
  resolucoes,
  entidadesExistentes,
  onVoltar,
  onImportar,
}: {
  linhasBrutas: LinhaBruta[];
  formatoNumerico: FormatoNumerico;
  resolucoes: Record<TipoEntidadeImportacao, Map<string, ResolucaoEntidade>>;
  entidadesExistentes: EntidadesExistentes;
  onVoltar: () => void;
  onImportar: (linhas: LinhaPronta[]) => void;
}) {
  const categoriaPorId = useMemo(() => new Map(entidadesExistentes.categorias.map((c) => [c.id, c])), [entidadesExistentes]);

  const resolver: ResolvedorEntidade = useMemo(
    () => (tipo, valorOriginal) => {
      const d = resolucoes[tipo].get(normalizarTexto(valorOriginal));
      return d?.acao === "usar_existente" ? d.entidadeId : null;
    },
    [resolucoes],
  );

  const [linhas, setLinhas] = useState<LinhaValidada[]>(() => validarLinhas(linhasBrutas, formatoNumerico, resolver));
  const [incluidas, setIncluidas] = useState<Set<string>>(() => new Set(linhas.filter((l) => l.status !== "erro").map((l) => l.importKey)));
  const [carregandoDuplicatas, setCarregandoDuplicatas] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const datas = linhas.filter((l) => l.dataCompetenciaIso).map((l) => l.dataCompetenciaIso as string);
      const resultado = await verificarDuplicatasAction(datas);
      if (cancelado) return;
      if (!("erro" in resultado)) {
        setLinhas((atual) => aplicarAvisosDuplicata(atual, new Set(resultado.chaves)));
      }
      setCarregandoDuplicatas(false);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function editarCampo(importKey: string, campo: "dataCompetencia" | "valor", texto: string) {
    setLinhas((atual) =>
      atual.map((l) => {
        if (l.importKey !== importKey) return l;
        const bruta: LinhaBruta = { ...l, [campo]: texto };
        return validarLinha_(bruta, formatoNumerico, resolver, l.avisos);
      }),
    );
    // "incluídas" só é inicializado 1x no mount — uma linha que nasceu com
    // erro nunca entra nesse Set, então corrigir o campo e fazer o status
    // virar ok/aviso não bastava: o checkbox continuava desmarcado e a
    // linha ficava fora do "prontas" mesmo depois de corrigida. Corrigir o
    // campo já é o sinal de que o usuário quer importar essa linha.
    setIncluidas((atual) => new Set(atual).add(importKey));
  }

  function alternarInclusao(importKey: string) {
    setIncluidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(importKey)) novo.delete(importKey);
      else novo.add(importKey);
      return novo;
    });
  }

  const prontas = linhas.filter((l) => l.status !== "erro" && incluidas.has(l.importKey));
  const comErro = linhas.filter((l) => l.status === "erro");
  const comAviso = linhas.filter((l) => l.status === "aviso");
  // Único jeito de o operador conferir contra o total da planilha original
  // antes de importar — achado ao vivo com uma planilha real: a soma do
  // sistema saiu diferente da soma da planilha, e não existia lugar nenhum
  // pra notar isso antes do fato consumado (só contagem de linha, nunca
  // valor). Erro não soma (valorNumero inválido), por isso o aviso ao lado
  // é contagem, não um segundo total.
  const somaProntas = prontas.reduce((acc, l) => acc + (l.valorNumero ?? 0), 0);

  // Reconciliação visível: uma linha contada em "prontas" nunca deveria
  // falhar aqui (status !== "erro" já deveria garantir que esses campos
  // resolveram) — mas se acontecer, entra numa lista visível em vez de
  // um `continue` silencioso. O número que a tela mostra tem que ser
  // garantidamente o número que chega no banco.
  const [puladasNoFinal, setPuladasNoFinal] = useState<{ linha: LinhaValidada; motivo: string }[]>([]);

  function importar() {
    const linhasProntas: LinhaPronta[] = [];
    const puladas: { linha: LinhaValidada; motivo: string }[] = [];
    for (const l of prontas) {
      const categoriaId = resolver("categoria", l.categoria);
      const categoria = categoriaId ? categoriaPorId.get(categoriaId) : null;
      if (!categoriaId || !categoria) {
        puladas.push({ linha: l, motivo: `Categoria "${l.categoria}" não resolveu — volte à etapa Cadastros e confirme essa categoria.` });
        continue;
      }
      if (l.valorNumero === null) {
        puladas.push({ linha: l, motivo: "Valor inválido no momento de importar." });
        continue;
      }
      if (l.dataCompetenciaIso === null) {
        puladas.push({ linha: l, motivo: "Data de competência inválida no momento de importar." });
        continue;
      }

      linhasProntas.push({
        linha: l,
        categoriaId,
        tipo: categoria.tipo,
        pessoaId: l.pessoa.trim() ? resolver("pessoa", l.pessoa) : null,
        centroCustoId: l.centroCusto.trim() ? resolver("centro_custo", l.centroCusto) : null,
        formaPagamentoId: l.formaPagamento.trim() ? resolver("forma_pagamento", l.formaPagamento) : null,
      });
    }

    if (puladas.length > 0) {
      setPuladasNoFinal(puladas);
      return; // nunca importa parcialmente sem o usuário ver o que ficou de fora
    }
    onImportar(linhasProntas);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card shadow-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">4. Confira cada linha antes de importar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Corrija data ou valor direto na grade se algo saiu errado — não precisa reenviar o arquivo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
        <span className="text-xs text-muted-foreground">{linhasBrutas.length} linhas na planilha</span>
        <span className="flex items-center gap-1 font-medium text-positivo-foreground">
          <CheckCircle size={15} weight="fill" />
          {prontas.length} prontas
        </span>
        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
          <WarningCircle size={15} weight="fill" />
          {comAviso.length} avisos de duplicata
        </span>
        <span className="flex items-center gap-1 font-medium text-destructive">
          <XCircle size={15} weight="fill" />
          {comErro.length} com erro
        </span>
        {carregandoDuplicatas && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner size={12} className="animate-spin" />
            checando duplicatas...
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
        <div>
          <p className="text-xs text-muted-foreground">Soma do que está pronto pra importar</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{formatarMoeda(somaProntas)}</p>
        </div>
        {comErro.length > 0 && (
          <p role="alert" className="max-w-72 text-right text-xs text-destructive">
            {comErro.length} linha{comErro.length !== 1 ? "s" : ""} com erro não {comErro.length !== 1 ? "entram" : "entra"} nessa soma — confira antes de
            importar, pra não fechar um total menor do que a sua planilha original.
          </p>
        )}
      </div>

      {puladasNoFinal.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">
            {puladasNoFinal.length} linha(s) não puderam ser importadas agora — nada foi importado ainda:
          </p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {puladasNoFinal.map((p, i) => (
              <li key={i}>
                Linha {p.linha.linha}: {p.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.importKey} className={cn(l.status === "erro" && "bg-destructive/5")}>
                <TableCell>
                  <Checkbox
                    checked={incluidas.has(l.importKey)}
                    disabled={l.status === "erro"}
                    onCheckedChange={() => alternarInclusao(l.importKey)}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.linha}</TableCell>
                <TableCell>
                  <StatusIcone status={l.status} />
                  {(l.erros.length > 0 || l.avisos.length > 0) && (
                    <p className="mt-0.5 max-w-40 text-xs text-muted-foreground">{[...l.erros, ...l.avisos].join(" ")}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    className="h-7 w-28 text-xs"
                    value={l.dataCompetencia}
                    onChange={(e) => editarCampo(l.importKey, "dataCompetencia", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input className="h-7 w-24 text-xs" value={l.valor} onChange={(e) => editarCampo(l.importKey, "valor", e.target.value)} />
                  {l.valorNumero !== null && <p className="mt-0.5 text-xs text-muted-foreground">{formatarMoeda(l.valorNumero)}</p>}
                </TableCell>
                <TableCell className="max-w-32 truncate text-sm">{l.categoria}</TableCell>
                <TableCell className="max-w-48 truncate text-sm">{l.descricao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={onVoltar}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button type="button" disabled={prontas.length === 0} onClick={importar}>
          Importar {prontas.length} {prontas.length === 1 ? "linha" : "linhas"}
        </Button>
      </div>
    </div>
  );
}

function StatusIcone({ status }: { status: LinhaValidada["status"] }) {
  if (status === "ok") return <CheckCircle size={16} weight="fill" className="text-positivo" />;
  if (status === "aviso") return <WarningCircle size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />;
  return <XCircle size={16} weight="fill" className="text-destructive" />;
}

// Reaplica a validação de campo numa única linha editada sem perder os
// avisos de duplicata já calculados (que dependem de uma consulta ao banco,
// não recalculados a cada tecla digitada).
function validarLinha_(bruta: LinhaBruta, formato: FormatoNumerico, resolver: ResolvedorEntidade, avisosAnteriores: string[]): LinhaValidada {
  const [linhaValidada] = validarLinhas([bruta], formato, resolver);
  return linhaValidada.status === "erro" ? linhaValidada : { ...linhaValidada, avisos: avisosAnteriores, status: avisosAnteriores.length > 0 ? "aviso" : "ok" };
}
