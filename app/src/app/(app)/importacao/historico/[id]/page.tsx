import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarImportacao, contarItensAtivos } from "@/lib/importacoes/importacoes";
import { formatarDataHoraBrasil } from "@/lib/formatacao";
import type { Json } from "@/utils/supabase/database.types";
import { BadgeStatusImportacao } from "../badge-status";
import { RetomarPainel } from "./retomar-painel";
import { BannerDesfeita } from "./desfazer/banner-desfeita";
import { TabelaErrosImportacao } from "./tabela-erros";

const ROTULO_TIPO: Record<string, string> = {
  pessoas: "Clientes/Fornecedores",
  financeiro: "Lançamentos financeiros",
  produtos: "Produtos",
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
  // Não depende mais do status — o lock de reivindicarProcessamento (não
  // o status na tela) é o que de fato impede duas retomadas concorrentes;
  // condicionar aqui pelo status era tautológico (cobria os 3 valores
  // possíveis do enum) e escondia o botão bem no caso — servidor caído no
  // meio do loop, status preso em "em_andamento" — que mais precisa dele
  // (achado em revisão de código).
  const podeRetomar = contagemPendente > 0;

  // Ação de desfazer (Fatia 4 do refino do módulo de Importação) só existe
  // hoje pros tipos pessoas/financeiro — produtos fica de fora de
  // propósito (gap pré-existente, fora de escopo, ver spec).
  const itensCriadosSucesso = itens.filter((it) => it.acao === "criar" && it.status === "sucesso");
  const podeDesfazer = itensCriadosSucesso.length > 0 && (importacao.tipo === "pessoas" || importacao.tipo === "financeiro");
  const jaFoiDesfeita = podeDesfazer && contarItensAtivos(itens) === 0;
  const quandoDesfez = jaFoiDesfeita ? (itensCriadosSucesso.find((it) => it.desfeitoEm)?.desfeitoEm ?? null) : null;

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
          {formatarDataHoraBrasil(importacao.criadoEm)}
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

      {podeRetomar && (
        <div className="rounded-2xl bg-card shadow-card p-4">
          <RetomarPainel importacaoId={importacao.id} contagemPendente={contagemPendente} />
        </div>
      )}

      {podeDesfazer && (
        <div className="rounded-2xl bg-card shadow-card p-4">
          {jaFoiDesfeita && quandoDesfez ? (
            <Link href={`/importacao/historico/${importacao.id}/desfazer`} className="hover:opacity-80">
              <BannerDesfeita agora={false} quando={quandoDesfez} compacto />
            </Link>
          ) : (
            <Link
              href={`/importacao/historico/${importacao.id}/desfazer`}
              className="flex items-center gap-1.5 text-sm font-semibold text-destructive hover:opacity-80"
            >
              Desfazer importação
              <ArrowRight size={14} weight="bold" />
            </Link>
          )}
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
