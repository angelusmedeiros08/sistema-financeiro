import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROTULO_STATUS: Record<string, string> = {
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

// `foiDesfeita` prevalece sobre `status` — o status bruto de
// `importacoes.status` nunca muda pra refletir um desfazer (esse estado
// vive em `importacoes_itens.desfeito_em`, achado ao vivo em auditoria: a
// lista mostrava "Concluída" pra um lote inteiro revertido). Mesmo dourado
// de "Resultado não operacional"/badges de risco médio já usados no
// sistema — nem sucesso puro (verde) nem erro (vermelho), é um estado à
// parte que pede atenção.
export function BadgeStatusImportacao({ status, foiDesfeita }: { status: string; foiDesfeita?: boolean }) {
  if (foiDesfeita) {
    return <Badge className="border-none bg-[#C98A1F]/12 font-semibold text-[#8A5E14] dark:bg-[#C98A1F]/20 dark:text-[#F0BB4E]">Desfeita</Badge>;
  }

  return (
    <Badge
      className={cn(
        "border-none font-semibold",
        status === "em_andamento"
          ? "bg-amber-500/12 text-amber-700"
          : status === "concluida"
            ? "bg-positivo/12 text-positivo-foreground"
            : "bg-muted text-muted-foreground",
      )}
    >
      {ROTULO_STATUS[status] ?? status}
    </Badge>
  );
}
