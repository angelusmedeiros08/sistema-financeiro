import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { ApresentacaoForm } from "../apresentacao-form";

export default async function PaginaNovaApresentacao() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Nova apresentação</h1>
      <ApresentacaoForm />
    </div>
  );
}
