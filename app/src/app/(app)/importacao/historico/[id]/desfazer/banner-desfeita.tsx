import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { formatarDataHoraBrasil } from "@/lib/formatacao";

// Estado 4 (agora=true, "acabou de acontecer") e Estado 5 (agora=false,
// "já tinha sido desfeita antes") do fluxo de desfazer — mesmo visual
// (verde, ícone de check), texto diferente. `compacto` é a versão de 1
// linha usada na página de detalhe (ver historico/[id]/page.tsx), sem o
// parágrafo de resumo, só pra sinalizar o status sem repetir o dado
// completo que já está na tela dedicada.
export function BannerDesfeita({
  agora,
  quando,
  porNome,
  resumo,
  compacto = false,
}: {
  agora: boolean;
  quando: string;
  porNome?: string | null;
  resumo?: string;
  compacto?: boolean;
}) {
  if (compacto) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-positivo-foreground">
        <CheckCircle size={14} weight="fill" />
        Desfeita em {formatarDataHoraBrasil(quando)}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-positivo/30 bg-positivo/10 p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-positivo text-positivo-foreground">
        <CheckCircle size={16} weight="fill" />
      </span>
      <div>
        <p className="text-sm font-bold text-positivo-foreground">
          {agora ? "Importação desfeita com sucesso" : "Esta importação já foi desfeita"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {!agora && porNome && `Por ${porNome}, em `}
          {!agora && formatarDataHoraBrasil(quando)}
          {resumo && (agora || porNome) && " — "}
          {resumo}
        </p>
      </div>
    </div>
  );
}
