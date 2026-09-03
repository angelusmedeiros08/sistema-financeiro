import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { ApresentacaoForm } from "../apresentacao-form";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaNovaApresentacao() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina>Nova apresentação</TituloPagina>
      <ApresentacaoForm />
    </div>
  );
}
