import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarImportacao } from "@/lib/importacoes/importacoes";
import type { Json } from "@/utils/supabase/database.types";
import { BadgeStatusImportacao } from "../badge-status";
import { RetomarPainel } from "./retomar-painel";
import { DesfazerPainel } from "./desfazer-painel";
import { DesfazerPainelFinanceiro } from "./desfazer-painel-financeiro";
import { TabelaErrosImportacao } from "./tabela-erros";

const ROTULO_TIPO: Record<string, string> = {
  pessoas: "Clientes/Fornecedores",
  financeiro: "Lançamentos financeiros",
};

function nomeDoItem(dados: Json): string {
  if (dados && typeof dados === "object" && !Array.isArray(dados) && "nome" in dados) {
    const nome = (dados as Record<string, unknown>).nome;
    if (typeof nome === "string" && nome.trim()) return nome;
  }
  return "-";
}

export default async function PaginaDetalheImportacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const resultado = await buscarImportacao(supabase, { tenant_id: contexto.tenantId, importacao_id: id });
  if (!resultado) notFound();

  const { importacao, itens } = resultado;
  const itensComErro = itens.filter((it) => it.status === "erro");
  const contagemPendente = importacao.erros + importacao.pendentes;
  // "em_andamento" entra na lista — com a execução rodando inteira no
  // servidor (ver spec 2026-08-26-importacao-execucao-servidor), esse
  // status só sobra de uma queda real do servidor no meio do loop, nunca
  // mais de alguém ter saído da tela. Antes, era exatamente o estado em
  // que Retomar nunca aparecia, porque a checagem original só cobria o
  // caso — já resolvido — de o cliente terminar de orquestrar o loop
  // sozinho (achado em revisão de código).
  const podeRetomar = (importacao.status === "concluida" || importacao.status === "cancelada" || importacao.status === "em_andamento") && contagemPendente > 0;

  const itensCriadosSucesso = itens.filter((it) => it.acao === "criar" && it.status === "sucesso");
  const contagemAtiva = itensCriadosSucesso.filter((it) => !it.desfeitoEm).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/importacao/historico" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          ← Central de Importações
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{importacao.nomeArquivo}</h1>
          <BadgeStatusImportacao status={importacao.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {ROTULO_TIPO[importacao.tipo] ?? importacao.tipo} · importado por {importacao.criadoPorNome ?? "-"} em{" "}
          {new Date(importacao.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-card shadow-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total de linhas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{importacao.totalLinhas}</p>
        </div>
        <div className="rounded-2xl bg-card shadow-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Sucesso</p>
          <p className="mt-1 text-2xl font-bold text-positivo-foreground">{importacao.sucessos}</p>
        </div>
        <div className="rounded-2xl bg-card shadow-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Erro</p>
          <p className="mt-1 text-2xl font-bold text-destructive">{importacao.erros}</p>
        </div>
        <div className="rounded-2xl bg-card shadow-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Pendente</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{importacao.pendentes}</p>
        </div>
      </div>

      {(podeRetomar || itensCriadosSucesso.length > 0) && (
        <div className="flex flex-wrap items-start gap-6 rounded-2xl bg-card shadow-card p-4">
          {podeRetomar && <RetomarPainel importacaoId={importacao.id} contagemPendente={contagemPendente} tipo={importacao.tipo} />}
          {itensCriadosSucesso.length > 0 && importacao.tipo === "financeiro" && <DesfazerPainelFinanceiro importacaoId={importacao.id} />}
          {itensCriadosSucesso.length > 0 && importacao.tipo === "pessoas" && <DesfazerPainel importacaoId={importacao.id} contagemAtiva={contagemAtiva} />}
        </div>
      )}

      {itensComErro.length > 0 && (
        <TabelaErrosImportacao
          itens={itensComErro.map((it) => ({ id: it.id, linhaNumero: it.linhaNumero, nome: nomeDoItem(it.dadosNormalizados), erro: it.erro }))}
        />
      )}
    </div>
  );
}
