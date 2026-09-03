import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { createClient } from "@/utils/supabase/server";
import { listarRegrasMapeamento } from "@/lib/importacao/regras-mapeamento";
import { COLUNAS_TEMPLATE } from "@/lib/importacao/template";
import { COLUNAS_TEMPLATE_FIXAS } from "@/lib/pessoas/importacao/template";
import { TabelaMapeamento } from "./tabela-mapeamento";
import { TituloPagina } from "@/components/layout/titulo-pagina";

const ROTULO_POR_CHAVE: Record<string, string> = Object.fromEntries(
  [...COLUNAS_TEMPLATE, ...COLUNAS_TEMPLATE_FIXAS].map((c) => [c.chave, c.rotulo]),
);

export default async function PaginaMapeamentoColunas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const regras = await listarRegrasMapeamento(supabase, contexto.tenantId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <TituloPagina>Mapeamento de colunas</TituloPagina>
        <p className="mt-1 text-sm text-muted-foreground">
          Toda vez que você corrige manualmente uma coluna na importação de planilha, o sistema memoriza esse cabeçalho e passa a mapeá-lo sozinho da
          próxima vez.
        </p>
      </div>

      <TabelaMapeamento
        regrasIniciais={regras.map((r) => ({ ...r, chaveColunaRotulo: ROTULO_POR_CHAVE[r.chaveColuna] ?? r.chaveColuna }))}
      />
    </div>
  );
}
