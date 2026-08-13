import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { sair } from "../(auth)/actions";
import { NovaDespesaForm } from "./novo-despesa-form";

export default async function PaginaDespesas() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) {
    redirect("/entrar");
  }
  const { user, tenantId } = contexto;

  const supabase = await createClient();

  const [{ data: categorias }, { data: eventos }] = await Promise.all([
    supabase
      .from("categorias_financeiras")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .eq("tipo", "DESPESA")
      .order("nome"),
    supabase
      .from("eventos_financeiros")
      .select(
        "id, descricao, valor_total, data_competencia, parcelas(status, data_vencimento), rateio_categoria(categorias_financeiras(nome))",
      )
      .eq("tenant_id", tenantId)
      .eq("tipo", "DESPESA")
      .order("data_competencia", { ascending: false }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Despesas</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <form action={sair}>
          <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-900">
            Sair
          </button>
        </form>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Nova despesa
        </h2>
        <NovaDespesaForm categorias={categorias ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Lançadas
        </h2>
        {!eventos || eventos.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma despesa registrada ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Descrição</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {eventos.map((evento) => {
                  const parcela = evento.parcelas?.[0];
                  const categoriaNome = evento.rateio_categoria?.[0]?.categorias_financeiras?.nome;
                  return (
                    <tr key={evento.id}>
                      <td className="px-4 py-2">{evento.descricao}</td>
                      <td className="px-4 py-2 text-neutral-600">{categoriaNome ?? "—"}</td>
                      <td className="px-4 py-2 text-neutral-600">
                        {parcela?.data_vencimento
                          ? new Date(parcela.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-neutral-600">{parcela?.status ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-medium text-neutral-900">
                        {evento.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
