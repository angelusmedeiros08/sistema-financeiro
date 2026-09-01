type CorImpacto = "reversao" | "remocao" | "protegido";

const ESTILO_COR: Record<CorImpacto, string> = {
  reversao: "bg-[#e0916f] text-[#1a1108]",
  remocao: "bg-destructive text-white",
  protegido: "bg-muted text-muted-foreground",
};

// Linha "ícone + título + descrição" pra cada consequência de uma ação de
// desfazer — substitui o parágrafo corrido que tinha antes (achado nos
// screenshots que o usuário mandou: difícil escanear rápido o que vai
// acontecer). Sem "use client" de propósito — renderizado tanto do Server
// Component da tela dedicada quanto dos Client Components de fluxo.
export function ImpactoLinha({
  icone,
  cor,
  titulo,
  descricao,
}: {
  icone: React.ReactNode;
  cor: CorImpacto;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-none">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-sm ${ESTILO_COR[cor]}`}>{icone}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{descricao}</p>
      </div>
    </div>
  );
}
