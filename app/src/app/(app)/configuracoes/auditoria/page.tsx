import { redirect } from "next/navigation";
import Link from "next/link";
import { CaretLeft, CaretRight, ArrowUUpLeft, Receipt, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { buscarTrilhaAuditoria, type EventoAuditoria } from "@/lib/auditoria/auditoria";
import { ConfiguracoesSubNav } from "../sub-nav";
import { hrefComPagina } from "@/components/tabela/href-pagina";
import { EstadoVazio } from "@/components/ui/estado-vazio";

const TAMANHO_PAGINA = 25;

const ICONE_ACAO: Record<EventoAuditoria["acao"], { icon: typeof Receipt; cor: string }> = {
  lancamento: { icon: Receipt, cor: "bg-primary" },
  estorno: { icon: ArrowUUpLeft, cor: "bg-destructive" },
  membro: { icon: UserPlus, cor: "bg-positivo" },
};

const ROTULO_ACAO: Record<EventoAuditoria["acao"], string> = {
  lancamento: "Lançamento",
  estorno: "Estorno",
  membro: "Equipe",
};

function tempoCompleto(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// "Quem fez o quê, quando" — requisito básico de enterprise-readiness que
// o sistema ainda não expunha pro usuário final (Fatia 9 do dossiê UX).
// Fonte é o próprio livro-razão (lancamentos, imutável por trigger) +
// entradas de equipe — nenhuma tabela/trigger novo, ver lib/auditoria.
export default async function PaginaAuditoria({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { pagina: paginaBruta } = await searchParams;
  const pagina = Math.max(1, Number(paginaBruta) || 1);

  const supabase = await createClient();
  const { eventos, total } = await buscarTrilhaAuditoria(supabase, contexto.tenantId, { pagina, tamanhoPagina: TAMANHO_PAGINA });
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Trilha de auditoria</h1>
      <ConfiguracoesSubNav />

      <div className="rounded-2xl bg-card shadow-card p-5">
        <div className="mb-1">
          <p className="text-xs text-muted-foreground">Quem fez o quê, e quando — lançamentos, estornos e mudanças de equipe.</p>
        </div>

        {eventos.length === 0 ? (
          <EstadoVazio texto="Nenhuma atividade registrada ainda." />
        ) : (
          <ul className="mt-3 flex flex-col">
            {eventos.map((evento) => {
              const { icon: Icon, cor } = ICONE_ACAO[evento.acao];
              return (
                <li key={evento.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-none">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${cor}`}>
                    <Icon size={15} weight="bold" className="text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      <span className="font-semibold">{evento.quemNome}</span> — {evento.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROTULO_ACAO[evento.acao]} · {tempoCompleto(evento.quando)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex items-center gap-1.5">
              {pagina > 1 ? (
                <Link href={hrefComPagina("/configuracoes/auditoria", pagina - 1)} className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted hover:text-foreground">
                  <CaretLeft size={12} weight="bold" />
                </Link>
              ) : (
                <span className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted opacity-40">
                  <CaretLeft size={12} weight="bold" />
                </span>
              )}
              {pagina < totalPaginas ? (
                <Link href={hrefComPagina("/configuracoes/auditoria", pagina + 1)} className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted hover:text-foreground">
                  <CaretRight size={12} weight="bold" />
                </Link>
              ) : (
                <span className="flex size-6.5 items-center justify-center rounded-[7px] bg-muted opacity-40">
                  <CaretRight size={12} weight="bold" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
