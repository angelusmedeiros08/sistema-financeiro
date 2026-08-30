import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarOrcamentoPorToken } from "@/lib/vendas/orcamento-publico";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarDataIsoParaBR } from "@/lib/importacao/locale-br";
import { OrcamentoPublicoAcoes } from "./orcamento-publico-acoes";

// Nunca indexar — é uma proposta comercial de um cliente específico
// (nome, preços), não conteúdo público de propósito; só quem tem o link
// (token na URL) deveria conseguir chegar aqui.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Rota pública, sem sessão — mesmo padrão de segurança de /assinar. Nunca
// abre a policy staff-only de vendas/venda_itens pra `anon`: a leitura passa
// pelo client administrativo dentro de buscarOrcamentoPorToken, filtrada
// pelo token da URL, que já é a única autorização que existe aqui.
export default async function PaginaOrcamentoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orcamento = await buscarOrcamentoPorToken(token);
  if (!orcamento) notFound();

  const podeDecidir = orcamento.status === "ENVIADO" && !orcamento.efetivamenteExpirado;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">Finanssi</span>

        <div className="rounded-2xl bg-card shadow-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">Orçamento #{orcamento.numero}</h1>
              <p className="text-sm text-muted-foreground">{orcamento.tenantNome}</p>
            </div>
            <StatusOrcamento status={orcamento.status} efetivamenteExpirado={orcamento.efetivamenteExpirado} />
          </div>

          <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="text-sm font-medium text-foreground">{orcamento.clienteNome}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Emitido em</dt>
              <dd className="text-sm font-medium text-foreground">{formatarDataIsoParaBR(orcamento.dataEmissao)}</dd>
            </div>
            {orcamento.validade && (
              <div>
                <dt className="text-xs text-muted-foreground">Válido até</dt>
                <dd className="text-sm font-medium text-foreground">{formatarDataIsoParaBR(orcamento.validade)}</dd>
              </div>
            )}
            {orcamento.formaPagamentoNome && (
              <div>
                <dt className="text-xs text-muted-foreground">Forma de pagamento sugerida</dt>
                <dd className="text-sm font-medium text-foreground">
                  {orcamento.formaPagamentoNome}
                  {orcamento.numeroParcelas > 1 ? ` em ${orcamento.numeroParcelas}x` : ""}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl bg-card shadow-card p-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Itens</h2>
          <div className="space-y-2">
            {orcamento.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {item.descricao} <span className="text-muted-foreground">× {item.quantidade}</span>
                </span>
                <span className="tabular-nums text-foreground">{formatarMoeda(item.valorTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <p className="text-base font-semibold text-foreground">Total: {formatarMoeda(orcamento.valorTotal)}</p>
          </div>
        </div>

        {orcamento.observacoes && (
          <div className="rounded-2xl bg-card shadow-card p-6">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Observações</h2>
            <p className="text-sm text-foreground">{orcamento.observacoes}</p>
          </div>
        )}

        <div className="rounded-2xl bg-card shadow-card p-6">
          {podeDecidir ? (
            <OrcamentoPublicoAcoes token={token} />
          ) : (
            <MensagemResolvido status={orcamento.status} efetivamenteExpirado={orcamento.efetivamenteExpirado} motivoRecusa={orcamento.motivoRecusa} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusOrcamento({ status, efetivamenteExpirado }: { status: string; efetivamenteExpirado: boolean }) {
  if (efetivamenteExpirado || status === "EXPIRADO") {
    return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Expirado</span>;
  }
  const mapa: Record<string, { rotulo: string; className: string }> = {
    ENVIADO: { rotulo: "Aguardando resposta", className: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
    APROVADO: { rotulo: "Aprovado", className: "bg-positivo/12 text-positivo-foreground" },
    RECUSADO: { rotulo: "Recusado", className: "bg-destructive/12 text-destructive-foreground" },
  };
  const info = mapa[status];
  if (!info) return null;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.className}`}>{info.rotulo}</span>;
}

function MensagemResolvido({
  status,
  efetivamenteExpirado,
  motivoRecusa,
}: {
  status: string;
  efetivamenteExpirado: boolean;
  motivoRecusa: string | null;
}) {
  if (efetivamenteExpirado || status === "EXPIRADO") {
    return <p className="text-sm text-muted-foreground">Essa proposta expirou. Entre em contato pra pedir uma nova.</p>;
  }
  if (status === "APROVADO") {
    return <p className="text-sm text-positivo-foreground">Você aprovou esta proposta. Obrigado!</p>;
  }
  if (status === "RECUSADO") {
    return (
      <div className="text-sm text-muted-foreground">
        <p>Você recusou esta proposta.</p>
        {motivoRecusa && <p className="mt-1 italic">&quot;{motivoRecusa}&quot;</p>}
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground">Essa proposta ainda não está disponível pra decisão.</p>;
}
