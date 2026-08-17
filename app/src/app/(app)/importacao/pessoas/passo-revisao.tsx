"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { montarLinhasBrutas } from "@/lib/pessoas/importacao/template";
import { validarLinhasPessoa } from "@/lib/pessoas/importacao/validacao";
import type { PessoaExistente } from "@/lib/pessoas/importacao/correspondencia";
import type { CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import type { ColunaChave, DecisaoLinha, LinhaValidadaPessoa } from "@/lib/pessoas/importacao/tipos";
import type { ParametrosImportarLinhaPessoa } from "./actions";
import { cn } from "@/lib/utils";

export type LinhaPronta = ParametrosImportarLinhaPessoa & { linhaNumero: number; nomeExibicao: string };

function decisaoPadrao(l: LinhaValidadaPessoa): DecisaoLinha {
  if (l.status === "erro") return null;
  // Único caso que ainda decide sozinho: documento bateu com EXATAMENTE um
  // cadastro. Nome sozinho (mesmo "exata_nome") nunca mais pré-decide —
  // pode ser homônimo (Seção "Modelo de correspondência" da spec).
  const decideSozinho = l.correspondencia.tipo === "exata_documento" && l.correspondencia.candidatos.length === 1;
  if (decideSozinho) return { acao: "atualizar", pessoaId: l.correspondencia.candidatos[0].id };
  if (l.correspondencia.tipo === "nenhuma" || l.correspondencia.tipo === "fraca") return { acao: "criar", pessoaId: null };
  return null;
}

function rotuloCandidato(p: { documento: string | null; email: string | null; telefone: string | null }): string | null {
  const partes = [p.documento, p.email, p.telefone].filter((v): v is string => Boolean(v));
  return partes.length > 0 ? partes.join(" · ") : null;
}

export function PassoRevisao({
  linhasTexto,
  mapeamento,
  pessoasExistentes,
  camposPersonalizados,
  onVoltar,
  onImportar,
}: {
  linhasTexto: string[][];
  mapeamento: Partial<Record<ColunaChave, number>>;
  pessoasExistentes: PessoaExistente[];
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  onVoltar: () => void;
  onImportar: (linhas: LinhaPronta[]) => void;
}) {
  const linhasBrutas = useMemo(() => montarLinhasBrutas(linhasTexto, mapeamento, camposPersonalizados), [linhasTexto, mapeamento, camposPersonalizados]);
  const [linhas, setLinhas] = useState<LinhaValidadaPessoa[]>(() => validarLinhasPessoa(linhasBrutas, pessoasExistentes, camposPersonalizados));

  const [decisoes, setDecisoes] = useState<Record<number, DecisaoLinha>>(() => {
    const inicial: Record<number, DecisaoLinha> = {};
    for (const l of linhas) inicial[l.linha] = decisaoPadrao(l);
    return inicial;
  });
  const [incluidas, setIncluidas] = useState<Set<number>>(() => new Set(linhas.filter((l) => decisaoPadrao(l) !== null).map((l) => l.linha)));

  function editarCampo(linhaNum: number, campo: "nome" | "perfil" | "documento", texto: string) {
    setLinhas((atual) => {
      // Revalida o conjunto inteiro (não só a linha editada) — a checagem
      // de CPF/CNPJ repetido dentro do próprio arquivo depende de ver todas
      // as linhas juntas, senão editar uma linha não refletiria se ela
      // passou a colidir (ou deixou de colidir) com outra.
      const atualizadas = atual.map((l) => (l.linha === linhaNum ? { ...l, [campo]: texto } : l));
      const revalidadas = validarLinhasPessoa(atualizadas, pessoasExistentes, camposPersonalizados);
      const linhaRevalidada = revalidadas.find((l) => l.linha === linhaNum)!;
      const decisao = decisaoPadrao(linhaRevalidada);
      setDecisoes((d) => ({ ...d, [linhaNum]: decisao }));
      setIncluidas((inc) => {
        const novo = new Set(inc);
        if (decisao) novo.add(linhaNum);
        else novo.delete(linhaNum);
        return novo;
      });
      return revalidadas;
    });
  }

  function mudarDecisao(linhaNum: number, decisao: DecisaoLinha) {
    setDecisoes((d) => ({ ...d, [linhaNum]: decisao }));
    setIncluidas((inc) => new Set(inc).add(linhaNum));
  }

  function alternarInclusao(linhaNum: number) {
    setIncluidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(linhaNum)) novo.delete(linhaNum);
      else novo.add(linhaNum);
      return novo;
    });
  }

  const prontas = linhas.filter((l) => l.status !== "erro" && decisoes[l.linha] && incluidas.has(l.linha));
  const precisamConfirmar = linhas.filter((l) => l.status !== "erro" && !decisoes[l.linha]);
  const comErro = linhas.filter((l) => l.status === "erro");

  function importar() {
    const linhasProntas: LinhaPronta[] = prontas.map((l) => {
      const decisao = decisoes[l.linha]!;
      const pessoaExistente = decisao.acao === "atualizar" ? pessoasExistentes.find((p) => p.id === decisao.pessoaId) : undefined;
      // Só confia na grafia da própria linha pra sobrescrever o nome quando
      // a correspondência veio de documento ou de nome idêntico (incluindo
      // conflito de documento, que também exige nome idêntico) — aproximada
      // ou fraca (ou uma pessoa escolhida manualmente, que pode ter sido só
      // uma correção de rota) significa que o texto da linha pode ser só um
      // erro de digitação da pessoa já cadastrada, não o nome real dela.
      const permitirAtualizarNome = ["exata_documento", "exata_nome", "documento_conflito"].includes(l.correspondencia.tipo);
      return {
        linhaNumero: l.linha,
        nomeExibicao: l.nome || pessoaExistente?.nome || `Linha ${l.linha}`,
        acao: decisao.acao,
        pessoaIdExistente: decisao.pessoaId,
        permitirAtualizarNome,
        nome: l.nome,
        documento: l.documento.trim() || null,
        natureza: l.naturezaResolvida,
        email: l.email.trim() || null,
        telefone: l.telefone.trim() || null,
        perfisNovos: l.perfisValidos,
        campos_personalizados: Object.keys(l.camposPersonalizados).length > 0 ? l.camposPersonalizados : undefined,
        endereco:
          l.enderecoCep || l.enderecoLogradouro || l.enderecoNumero || l.enderecoBairro || l.enderecoCidade || l.enderecoUf
            ? {
                cep: l.enderecoCep || null,
                logradouro: l.enderecoLogradouro || null,
                numero: l.enderecoNumero || null,
                complemento: l.enderecoComplemento || null,
                bairro: l.enderecoBairro || null,
                cidade: l.enderecoCidade || null,
                uf: l.enderecoUf || null,
              }
            : undefined,
        contato: l.contatoNome.trim() ? { nome: l.contatoNome, cargo: l.contatoCargo || null, email: l.contatoEmail || null, telefone: l.contatoTelefone || null } : undefined,
      };
    });
    onImportar(linhasProntas);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-sm font-bold text-foreground">3. Confira cada linha antes de importar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Corrija nome, perfil ou documento direto na grade — não precisa reenviar o arquivo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
        <span className="flex items-center gap-1 font-medium text-[#0F5F50]">
          <CheckCircle size={15} weight="fill" />
          {prontas.length} prontas
        </span>
        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
          <WarningCircle size={15} weight="fill" />
          {precisamConfirmar.length} aguardando confirmação
        </span>
        <span className="flex items-center gap-1 font-medium text-destructive">
          <XCircle size={15} weight="fill" />
          {comErro.length} com erro
        </span>
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => {
              const decisao = decisoes[l.linha];
              const idsCandidatos = new Set(l.correspondencia.candidatos.map((c) => c.id));
              const opcoesPessoa = [...l.correspondencia.candidatos, ...pessoasExistentes.filter((p) => !idsCandidatos.has(p.id))];

              const valorSelect = decisao ? (decisao.acao === "criar" ? "__criar__" : decisao.pessoaId ?? "") : "";

              return (
                <TableRow key={l.linha} className={cn(l.status === "erro" && "bg-destructive/5")}>
                  <TableCell>
                    <Checkbox checked={incluidas.has(l.linha)} disabled={l.status === "erro" || !decisao} onCheckedChange={() => alternarInclusao(l.linha)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.linha}</TableCell>
                  <TableCell>
                    {l.status === "erro" ? (
                      <XCircle size={16} weight="fill" className="text-destructive" />
                    ) : l.status === "precisa_confirmar" ? (
                      <WarningCircle size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
                    ) : (
                      <CheckCircle size={16} weight="fill" className="text-[#157F6B]" />
                    )}
                    {l.erros.length > 0 && <p className="mt-0.5 max-w-40 text-xs text-muted-foreground">{l.erros.join(" ")}</p>}
                    {l.avisos.length > 0 && <p className="mt-0.5 max-w-40 text-xs text-amber-700 dark:text-amber-400">{l.avisos.join(" ")}</p>}
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-36 text-xs" value={l.nome} onChange={(e) => editarCampo(l.linha, "nome", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-28 text-xs" value={l.perfil} onChange={(e) => editarCampo(l.linha, "perfil", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 w-32 text-xs" value={l.documento} onChange={(e) => editarCampo(l.linha, "documento", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={valorSelect}
                      onValueChange={(v) => mudarDecisao(l.linha, v === "__criar__" ? { acao: "criar", pessoaId: null } : { acao: "atualizar", pessoaId: v })}
                    >
                      <SelectTrigger className="h-7 w-48 text-xs">
                        <SelectValue placeholder="Escolher ação..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__criar__">+ Criar pessoa nova</SelectItem>
                        {opcoesPessoa.map((p) => {
                          const rotulo = rotuloCandidato(p);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex flex-col">
                                <span>Atualizar &quot;{p.nome}&quot;</span>
                                {rotulo && <span className="text-[10px] text-muted-foreground">{rotulo}</span>}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
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
