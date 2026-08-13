import Link from "next/link";
import type { DadosPessoa, CampoPersonalizadoDefinicao, EventoPessoa } from "@/lib/pessoas/buscar-pessoa";
import { PessoaForm } from "./pessoa-form";
import { EnderecosSecao } from "./enderecos-secao";
import { ContatosSecao } from "./contatos-secao";
import { TabelaEventos } from "@/components/lancamentos/tabela-eventos";
import { atualizarPessoaAction } from "@/lib/pessoas/pessoas-actions";

export function DetalhePessoa({
  pessoa,
  camposPersonalizados,
  lancamentos,
  caminhoBase,
}: {
  pessoa: DadosPessoa;
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  lancamentos: EventoPessoa[];
  caminhoBase: "clientes" | "fornecedores";
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${caminhoBase}`} className="hover:text-foreground">
          {caminhoBase === "clientes" ? "Clientes" : "Fornecedores"}
        </Link>
        <span>/</span>
        <span className="text-foreground">{pessoa.nome}</span>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h1 className="mb-5 text-xl font-bold tracking-tight text-foreground">Dados cadastrais</h1>
        <PessoaForm modo="editar" pessoa={pessoa} camposPersonalizados={camposPersonalizados} acao={atualizarPessoaAction} />
      </section>

      <EnderecosSecao pessoaId={pessoa.id} enderecos={pessoa.enderecos} />

      <ContatosSecao pessoaId={pessoa.id} contatos={pessoa.contatos} />

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Histórico de lançamentos</h2>
        <TabelaEventos eventos={lancamentos} textoVazio="Nenhum lançamento vinculado a esta pessoa ainda." />
      </section>
    </div>
  );
}
