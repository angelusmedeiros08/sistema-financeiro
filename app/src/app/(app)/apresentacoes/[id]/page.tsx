import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { obterApresentacaoComSlides } from "@/lib/apresentacao/apresentacoes";
import { ApresentacaoForm } from "../apresentacao-form";

export default async function PaginaEditarApresentacao({ params }: { params: Promise<{ id: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { id } = await params;
  const supabase = await createClient();
  const apresentacao = await obterApresentacaoComSlides(supabase, { tenantId: contexto.tenantId, apresentacaoId: id });
  if (!apresentacao) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Editar apresentação</h1>
      <ApresentacaoForm
        existente={{
          id: apresentacao.id,
          nome: apresentacao.nome,
          intervaloSegundos: apresentacao.intervaloSegundos,
          permiteModoTv: apresentacao.permiteModoTv,
          rotas: apresentacao.slides.map((s) => s.rota),
        }}
      />
    </div>
  );
}
