"use client";

// Controle da página de DFC — só Ano (a DFC não tem Regime: mostra
// Previsto x Realizado lado a lado na própria matriz, não é uma leitura
// alternativa de dado como na DRE). Mesmo cartão-pill do resto de
// Relatórios em vez da pill crua que existia antes.
import { Spinner } from "@phosphor-icons/react/dist/ssr";
import { AnoStepper } from "@/components/relatorios/ano-stepper";
import { useNavegacaoFiltro } from "@/lib/hooks/use-navegacao-filtro";

export function DfcControles({ ano }: { ano: number }) {
  const { navegarCom, pendente } = useNavegacaoFiltro();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pendente && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Spinner size={13} className="shrink-0 animate-spin" />
          Atualizando…
        </span>
      )}
      <AnoStepper ano={ano} onMudar={(novoAno) => navegarCom({ ano: String(novoAno) })} />
    </div>
  );
}
