import Link from "next/link";
import { redirect } from "next/navigation";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarPessoas } from "@/lib/pessoas/buscar-pessoa";
import { TabelaPessoas } from "@/components/pessoas/tabela-pessoas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ABAS = [
  { valor: "fornecedores", rotulo: "Fornecedores", perfil: "FORNECEDOR" },
  { valor: "transportadoras", rotulo: "Transportadoras", perfil: "TRANSPORTADORA" },
] as const;

export default async function PaginaFornecedores({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; aba?: string }>;
}) {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const { busca, aba = "fornecedores" } = await searchParams;
  const abaAtual = ABAS.find((a) => a.valor === aba) ?? ABAS[0];

  const supabase = await createClient();
  const fornecedores = await listarPessoas(supabase, { tenant_id: contexto.tenantId, perfil: abaAtual.perfil, busca });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Fornecedores</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/fornecedores/novo">
            <Plus size={15} weight="bold" />
            Novo fornecedor
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border pb-3">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/fornecedores?aba=${a.valor}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              abaAtual.valor === a.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      <form method="get" className="relative max-w-sm">
        <input type="hidden" name="aba" value={abaAtual.valor} />
        <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input name="busca" defaultValue={busca} placeholder="Buscar por nome..." className="pl-9" />
      </form>

      <TabelaPessoas
        pessoas={fornecedores}
        caminhoBase="fornecedores"
        textoVazio={abaAtual.valor === "transportadoras" ? "Nenhuma transportadora cadastrada ainda." : "Nenhum fornecedor cadastrado ainda."}
      />
    </div>
  );
}
