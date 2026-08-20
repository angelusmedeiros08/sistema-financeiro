import { Manrope } from "next/font/google";
import { Wallet, HandCoins } from "@phosphor-icons/react/dist/ssr";
import { StatCard } from "@/components/painel/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagCategoria } from "@/components/ui/tag-categoria";

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "700", "800"] });

// Página só pra comparar Manrope × Cabinet Grotesk lado a lado com os
// componentes reais do sistema — não é uma tela de produto, é descartável
// depois da decisão. Sobrescreve --font-display só dentro do wrapper
// local (não muda a fonte do resto do app).
export default function PaginaTesteFonte() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-card">
        Tela de teste — compare esta página (Manrope nos títulos/números) com o resto do sistema (Cabinet Grotesk). Não afeta nada fora daqui.
      </div>

      <div style={{ "--font-display": manrope.style.fontFamily } as React.CSSProperties} className="flex flex-col gap-8">
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Com Manrope</span>

          <div className="flex flex-col gap-6 rounded-2xl border border-dashed border-border p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
                <p className="text-sm capitalize text-muted-foreground">20 de agosto de 2026</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full">Nova despesa</Button>
                <Button size="sm" variant="outline" className="rounded-full">Nova receita</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard variant="hero" label="Saldo em caixa" valor="R$ 10.257,84" />
              <StatCard variant="teal" icon={HandCoins} label="A receber (30 dias)" valor="R$ 6.900,00" delta={12.4} />
              <StatCard variant="ambar" icon={Wallet} label="A pagar (30 dias)" valor="R$ 3.070,00" delta={-4.1} />
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-card">
              <h2 className="mb-3 font-heading text-sm font-bold text-foreground">Lançamentos recentes</h2>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
                  <span className="font-medium text-foreground">Pró-labore sócio agosto</span>
                  <TagCategoria nome="Pró-labore" />
                  <Badge className="border-none bg-[#E3A62F]/15 font-semibold text-[#B4691E]">Pendente</Badge>
                  <span className="font-semibold tabular-nums text-foreground">R$ 1.600,00</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium text-foreground">Honorários Cliente Deltrano</span>
                  <TagCategoria nome="Receita de Serviços" />
                  <Badge className="border-none bg-[#0FA37E]/15 font-semibold text-[#1F7A4D]">Quitado</Badge>
                  <span className="font-semibold tabular-nums text-foreground">R$ 1.859,64</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Só os títulos/números em tamanho grande, pra comparar de perto</span>
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-6">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
            <span className="font-heading text-[40px] font-bold tabular-nums text-foreground">R$ 10.257,84</span>
            <span className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">Saldo em caixa</span>
          </div>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Como está hoje (Cabinet Grotesk), pra comparar</span>
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-6">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Painel financeiro</h1>
          <span className="font-heading text-[40px] font-bold tabular-nums text-foreground">R$ 10.257,84</span>
          <span className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">Saldo em caixa</span>
        </div>
      </div>
    </div>
  );
}
