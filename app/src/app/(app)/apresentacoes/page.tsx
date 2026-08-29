import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, PencilSimple, Play, MonitorPlay } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarApresentacoes } from "@/lib/apresentacao/apresentacoes";
import { montarUrlSlide } from "@/lib/apresentacao/sessao";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ExcluirApresentacaoButton } from "./excluir-apresentacao-button";

export default async function PaginaApresentacoes() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const apresentacoes = await listarApresentacoes(supabase, contexto.tenantId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Apresentação</h1>
          <p className="text-sm text-muted-foreground">
            Monte um roteiro de telas do sistema pra apresentar numa reunião ou deixar rodando numa TV.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/apresentacoes/novo">
            <Plus size={15} weight="bold" />
            Nova apresentação
          </Link>
        </Button>
      </div>

      {apresentacoes.length === 0 ? (
        <EstadoVazio texto="Nenhuma apresentação criada ainda." icon={MonitorPlay} />
      ) : (
        <div className="flex flex-col gap-3">
          {apresentacoes.map((a) => {
            const semSlides = a.totalSlides === 0 || !a.primeiraRota;
            return (
              <div key={a.id} className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4 shadow-card">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.totalSlides} {a.totalSlides === 1 ? "slide" : "slides"} · Modo TV a cada {a.intervaloSegundos}s
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" asChild aria-label={`Editar ${a.nome}`}>
                    <Link href={`/apresentacoes/${a.id}`}>
                      <PencilSimple size={15} />
                    </Link>
                  </Button>
                  {semSlides ? (
                    <Button variant="outline" size="sm" disabled title="Adicione ao menos um slide">
                      <Play size={14} />
                      Apresentar
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={montarUrlSlide(a.primeiraRota!, { apresentacaoId: a.id, indice: 0, modo: "apresentador" })}>
                        <Play size={14} />
                        Apresentar
                      </Link>
                    </Button>
                  )}
                  {semSlides ? (
                    <Button variant="outline" size="sm" disabled title="Adicione ao menos um slide">
                      <MonitorPlay size={14} />
                      Modo TV
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={montarUrlSlide(a.primeiraRota!, { apresentacaoId: a.id, indice: 0, modo: "tv" })}>
                        <MonitorPlay size={14} />
                        Modo TV
                      </Link>
                    </Button>
                  )}
                  <ExcluirApresentacaoButton apresentacaoId={a.id} nome={a.nome} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
