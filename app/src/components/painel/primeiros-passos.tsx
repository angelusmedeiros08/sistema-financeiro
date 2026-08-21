import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import type { PrimeirosPassos } from "@/app/(app)/painel/dados";
import { cn } from "@/lib/utils";

const PASSOS = [
  { chave: "contaFinanceira" as const, rotulo: "Cadastre uma conta financeira", href: "/configuracoes/contas-financeiras" },
  { chave: "cliente" as const, rotulo: "Cadastre seu primeiro cliente", href: "/clientes/novo" },
  { chave: "lancamento" as const, rotulo: "Registre seu primeiro lançamento", href: "/despesas" },
];

export function PrimeirosPassosCard({ passos }: { passos: PrimeirosPassos }) {
  const concluidos = PASSOS.filter((p) => passos[p.chave]).length;
  if (concluidos === PASSOS.length) return null;

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <h2 className="font-heading text-sm font-bold text-foreground">Primeiros passos</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {concluidos} de {PASSOS.length} concluídos — o essencial pra tirar o máximo do sistema.
      </p>

      <ul className="mt-4 flex flex-col gap-1">
        {PASSOS.map((passo) => {
          const feito = passos[passo.chave];
          return (
            <li key={passo.chave}>
              <Link
                href={passo.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                  feito ? "text-muted-foreground" : "font-medium text-foreground hover:bg-muted",
                )}
              >
                {feito ? (
                  <CheckCircle size={18} weight="fill" className="shrink-0 text-[#157F6B]" />
                ) : (
                  <Circle size={18} className="shrink-0 text-border" />
                )}
                <span className={cn(feito && "line-through")}>{passo.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
