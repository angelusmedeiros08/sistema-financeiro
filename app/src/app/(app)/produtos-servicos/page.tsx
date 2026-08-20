import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { listarProdutosServicos } from "@/lib/produtos-servicos/produtos-servicos";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { NovoProdutoServicoForm } from "./novo-produto-servico-form";
import { ProdutoServicoLinha } from "./produto-servico-linha";

export default async function PaginaProdutosServicos() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const supabase = await createClient();
  const [produtosServicos, categoriasResultado] = await Promise.all([
    listarProdutosServicos(supabase, contexto.tenantId),
    supabase.from("categorias_financeiras").select("id, nome").eq("tenant_id", contexto.tenantId).eq("tipo", "RECEITA").order("nome"),
  ]);
  const categoriasReceita = categoriasResultado.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Produtos e serviços</h1>
        <p className="mt-1 text-sm text-muted-foreground">O catálogo que alimenta a tela de Vendas.</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Novo item</h2>
        {categoriasReceita.length === 0 ? (
          <EstadoVazio texto="Cadastre ao menos uma categoria de receita em Configurações → Categorias antes de criar um produto ou serviço." />
        ) : (
          <NovoProdutoServicoForm categoriasReceita={categoriasReceita} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cadastrados</h2>
        {produtosServicos.length === 0 ? (
          <EstadoVazio texto="Nenhum produto ou serviço ainda." />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosServicos.map((produtoServico) => (
                  <ProdutoServicoLinha key={produtoServico.id} produtoServico={produtoServico} categoriasReceita={categoriasReceita} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
