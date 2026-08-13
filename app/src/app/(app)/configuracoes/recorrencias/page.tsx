import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { ConfiguracoesSubNav } from "../sub-nav";
import { CancelarSerieButton } from "./cancelar-serie-button";

const ROTULO_UNIDADE: Record<string, string> = { DIA: "dia(s)", SEMANA: "semana(s)", MES: "mês(es)" };

export default async function PaginaRecorrencias() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const { data: regras } = await supabase
    .from("regras_recorrencia")
    .select(
      "id, descricao, tipo, valor_total, unidade_intervalo, intervalo, data_inicio, numero_ocorrencias, data_fim, ocorrencias_geradas, ativa, ultima_geracao_em",
    )
    .eq("tenant_id", contexto.tenantId)
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">Recorrências</h1>
      <ConfiguracoesSubNav />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Séries</h2>
          <p className="text-xs text-muted-foreground">
            Criadas ao marcar &quot;Repetir lançamento?&quot; numa despesa ou receita.
          </p>
        </div>

        {!regras || regras.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma série recorrente cadastrada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Descrição</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Geradas</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((r) => {
                  const termino = r.numero_ocorrencias
                    ? `Após ${r.numero_ocorrencias} ocorrências`
                    : r.data_fim
                      ? `Até ${new Date(r.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}`
                      : "Indefinido";

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-foreground">{r.descricao}</TableCell>
                      <TableCell className="text-muted-foreground">
                        A cada {r.intervalo} {ROTULO_UNIDADE[r.unidade_intervalo]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{termino}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatarMoeda(Number(r.valor_total))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{r.ocorrencias_geradas}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border-none font-semibold",
                            r.ativa ? "bg-[#157F6B]/12 text-[#0F5F50]" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {r.ativa ? "Ativa" : "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.ativa && <CancelarSerieButton regraId={r.id} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
