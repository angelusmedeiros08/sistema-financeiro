"use client";

// Controle da página de DFC — só Ano (a DFC não tem Regime: mostra
// Previsto x Realizado lado a lado na própria matriz, não é uma leitura
// alternativa de dado como na DRE). Mesmo cartão-pill do resto de
// Relatórios em vez da pill crua que existia antes.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AnoStepper } from "@/components/relatorios/ano-stepper";

export function DfcControles({ ano }: { ano: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function navegarCom(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(chave, valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  return <AnoStepper ano={ano} onMudar={(novoAno) => navegarCom("ano", String(novoAno))} />;
}
