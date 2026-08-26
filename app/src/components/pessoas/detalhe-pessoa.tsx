import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { DadosPessoa, CampoPersonalizadoDefinicao, EventoPessoa } from "@/lib/pessoas/buscar-pessoa";
import { PessoaForm } from "./pessoa-form";
import { EnderecosSecao } from "./enderecos-secao";
import { ContatosSecao } from "./contatos-secao";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";
import { atualizarPessoaAction } from "@/lib/pessoas/pessoas-actions";
import { corPorNome } from "@/lib/cor-por-nome";

const ROTULO_PERFIL: Record<string, string> = {
  CLIENTE: "Cliente",
  FORNECEDOR: "Fornecedor",
  TRANSPORTADORA: "Transportadora",
};

export function DetalhePessoa({
  pessoa,
  camposPersonalizados,
  lancamentos,
  caminhoBase,
  voltar,
}: {
  pessoa: DadosPessoa;
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  lancamentos: EventoPessoa[];
  caminhoBase: "clientes" | "fornecedores";
  // Presente só quando a navegação vem de um clique de drill-down num
  // gráfico (ver spec 2026-08-25-drill-down-graficos) — substitui o
  // breadcrumb normal pelo link de volta pro relatório de origem.
  voltar?: string;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {voltar ? (
        <Link href={voltar} className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Voltar pro relatório
        </Link>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${caminhoBase}`} className="hover:text-foreground">
            {caminhoBase === "clientes" ? "Clientes" : "Fornecedores"}
          </Link>
          <span>/</span>
          <span className="text-foreground">{pessoa.nome}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
          style={{ background: corPorNome(pessoa.nome).texto }}
        >
          {pessoa.nome.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{pessoa.nome}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {pessoa.documento && <span>{pessoa.documento}</span>}
            {pessoa.email && (
              <>
                {pessoa.documento && <span>·</span>}
                <span>{pessoa.email}</span>
              </>
            )}
            {pessoa.perfis.map((perfil) => (
              <span key={perfil} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                {ROTULO_PERFIL[perfil] ?? perfil}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-card shadow-card p-5">
        <h2 className="mb-5 font-heading text-sm font-bold text-foreground">Dados cadastrais</h2>
        <PessoaForm modo="editar" pessoa={pessoa} camposPersonalizados={camposPersonalizados} acao={atualizarPessoaAction} />
      </section>

      <EnderecosSecao pessoaId={pessoa.id} enderecos={pessoa.enderecos} />

      <ContatosSecao pessoaId={pessoa.id} contatos={pessoa.contatos} />

      <section>
        <TabelaEventos eventos={lancamentos} textoVazio="Nenhum lançamento vinculado a esta pessoa ainda." titulo="Histórico de lançamentos" />
      </section>
    </div>
  );
}
