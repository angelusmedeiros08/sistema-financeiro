"use client";

import { useState } from "react";
import { CheckCircle, FileText, Spinner, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  parseArquivoExtrato,
  montarLinhasBrutasCsv,
  converterLinhaCsv,
  COLUNAS_TEMPLATE_EXTRATO,
  type MapeamentoColunasExtrato,
  type LinhaExtratoBruta,
} from "@/lib/conciliacao/parse";
import { importarExtratoAction, buscarLinhasParaConciliarAction, revalidarPosConciliacaoAction, type LinhaConciliacao } from "./actions";
import { LinhaConciliacaoCard } from "./linha-conciliacao";

type EstadoMapeamentoCsv = { colunas: string[]; linhasTexto: string[][]; mapeamento: MapeamentoColunasExtrato };

export function WizardConciliacao({
  contaFinanceiraId,
  linhasIniciais,
  categorias,
  pessoas,
}: {
  contaFinanceiraId: string;
  linhasIniciais: LinhaConciliacao[];
  categorias: { id: string; nome: string; tipo: string }[];
  pessoas: { id: string; nome: string }[];
}) {
  const [linhas, setLinhas] = useState<LinhaConciliacao[]>(linhasIniciais);
  const [mostrarUpload, setMostrarUpload] = useState(linhasIniciais.length === 0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resumoImportacao, setResumoImportacao] = useState<{ inseridas: number; puladas: number } | null>(null);
  const [mapeamentoCsv, setMapeamentoCsv] = useState<EstadoMapeamentoCsv | null>(null);

  async function importarLinhas(brutas: LinhaExtratoBruta[]) {
    setCarregando(true);
    const resultado = await importarExtratoAction(contaFinanceiraId, brutas);
    if ("erro" in resultado) {
      setCarregando(false);
      setErro(resultado.erro);
      return;
    }

    const linhasAtualizadas = await buscarLinhasParaConciliarAction(contaFinanceiraId);
    setCarregando(false);
    if ("erro" in linhasAtualizadas) {
      setErro(linhasAtualizadas.erro);
      return;
    }

    setLinhas(linhasAtualizadas);
    setResumoImportacao(resultado);
    setMapeamentoCsv(null);
    setMostrarUpload(false);
    await revalidarPosConciliacaoAction();
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setErro("");
    setResumoImportacao(null);
    setCarregando(true);
    const resultado = await parseArquivoExtrato(arquivo);
    setCarregando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }

    if (resultado.tipo === "ofx") {
      await importarLinhas(resultado.linhas);
      return;
    }

    setMapeamentoCsv({ colunas: resultado.colunas, linhasTexto: resultado.linhasTexto, mapeamento: resultado.mapeamentoSugerido });
  }

  async function confirmarMapeamentoCsv() {
    if (!mapeamentoCsv) return;
    setErro("");

    const brutas = montarLinhasBrutasCsv(mapeamentoCsv.linhasTexto, mapeamentoCsv.mapeamento);
    const convertidas = brutas.map(converterLinhaCsv);
    const comErro = convertidas.filter((c) => !c.ok);
    if (comErro.length > 0) {
      setErro(`${comErro.length} linha(s) com data ou valor inválido (ex.: linha ${comErro[0].linha}: ${comErro[0].ok ? "" : comErro[0].erro}).`);
      return;
    }

    await importarLinhas(convertidas.filter((c): c is Extract<typeof c, { ok: true }> => c.ok).map((c) => c.bruta));
  }

  // Recarrega tudo em vez de só remover a linha resolvida do estado local —
  // resolver uma linha pode ter consumido uma baixa/parcela que outra linha
  // pendente ainda listava como candidata (achado testando agrupamento ao
  // vivo: sem isso, a lista desatualizada deixava escolher uma baixa já
  // conciliada em outra linha).
  async function recarregarLinhas() {
    const atualizadas = await buscarLinhasParaConciliarAction(contaFinanceiraId);
    if ("erro" in atualizadas) {
      setErro(atualizadas.erro);
      return;
    }
    setLinhas(atualizadas);
  }

  const mapeamentoCompleto = mapeamentoCsv && COLUNAS_TEMPLATE_EXTRATO.every((c) => mapeamentoCsv.mapeamento[c.chave] !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card shadow-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Importar extrato</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aceita .ofx (direto do internet banking) ou .csv, até 10MB.</p>
          </div>
          {!mostrarUpload && (
            <Button type="button" variant="outline" size="sm" onClick={() => setMostrarUpload(true)}>
              Importar novo extrato
            </Button>
          )}
        </div>

        {mostrarUpload && !mapeamentoCsv && (
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center hover:bg-muted/40">
            <input type="file" accept=".ofx,.csv" className="sr-only" disabled={carregando} onChange={selecionarArquivo} />
            {carregando ? (
              <>
                <Spinner size={22} className="animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lendo arquivo...</span>
              </>
            ) : (
              <>
                <UploadSimple size={22} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Clique para escolher o arquivo</span>
                <span className="text-xs text-muted-foreground">.ofx ou .csv</span>
              </>
            )}
          </label>
        )}

        {mapeamentoCsv && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText size={16} />
              Diga o que é cada coluna do seu CSV
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {COLUNAS_TEMPLATE_EXTRATO.map((col) => (
                <div key={col.chave} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">{col.rotulo}</label>
                  <Select
                    value={mapeamentoCsv.mapeamento[col.chave] !== undefined ? String(mapeamentoCsv.mapeamento[col.chave]) : ""}
                    onValueChange={(v) =>
                      setMapeamentoCsv((atual) => (atual ? { ...atual, mapeamento: { ...atual.mapeamento, [col.chave]: Number(v) } } : atual))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Escolher coluna..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mapeamentoCsv.colunas.map((nomeColuna, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {nomeColuna}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMapeamentoCsv(null)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={!mapeamentoCompleto || carregando} onClick={confirmarMapeamentoCsv}>
                {carregando ? <Spinner size={14} className="animate-spin" /> : "Confirmar e importar"}
              </Button>
            </div>
          </div>
        )}

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}

        {resumoImportacao && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-[#0F5F50]">
            <CheckCircle size={15} weight="fill" />
            {resumoImportacao.inseridas} linha(s) importada(s)
            {resumoImportacao.puladas > 0 ? ` — ${resumoImportacao.puladas} já eram conhecidas, puladas.` : "."}
          </p>
        )}
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma linha pendente pra conciliar nessa conta.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{linhas.length} pendente(s)</p>
          {linhas.map((linha) => (
            <LinhaConciliacaoCard
              key={linha.id}
              linha={linha}
              contaFinanceiraId={contaFinanceiraId}
              categorias={categorias}
              pessoas={pessoas}
              onResolvida={recarregarLinhas}
            />
          ))}
        </div>
      )}
    </div>
  );
}
