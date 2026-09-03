import Link from "next/link";
import { redirect } from "next/navigation";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarImportacoes } from "@/lib/importacoes/importacoes";
import { TabelaHistoricoImportacoes } from "./tabela-historico";
import { TituloPagina } from "@/components/layout/titulo-pagina";

export default async function PaginaHistoricoImportacoes() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const importacoes = await listarImportacoes(supabase, contexto.tenantId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <TituloPagina>Central de Importações</TituloPagina>
        <p className="mt-1 text-sm text-muted-foreground">Histórico de lotes importados, com resultado linha a linha, retomar e desfazer.</p>
      </div>

      {importacoes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ClockCounterClockwise size={20} />
          </span>
          <p className="text-sm text-muted-foreground">Nenhuma importação registrada ainda.</p>
          <Link href="/importacao" className="text-sm font-medium text-primary">
            Ir para Importação
          </Link>
        </div>
      ) : (
        <TabelaHistoricoImportacoes importacoes={importacoes} />
      )}
    </div>
  );
}
