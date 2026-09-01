import { Spinner } from "@phosphor-icons/react";

// Padrão visual único pras ações que sempre demoram de verdade (import,
// extração por IA, desfazer importação) — cada uma continua dona do
// próprio estado de pending, só a peça visual é compartilhada.
export function IndicadorProcessando({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
      <Spinner size={20} className="shrink-0 animate-spin text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
      </div>
    </div>
  );
}
