"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FilePdf, Image as ImageIcon, LinkSimple, File as FileIcon } from "@phosphor-icons/react";
import { obterUrlAnexoAction } from "@/lib/contabil/anexos-actions";

export type Anexo = {
  id: string;
  forma: "ARQUIVO" | "LINK";
  tipo: string;
  descricao: string | null;
  nome_arquivo: string | null;
  mime_type: string | null;
  url: string | null;
};

const ROTULO_TIPO: Record<string, string> = {
  CONTRATO: "Contrato",
  DOCUMENTO_FISCAL: "Documento fiscal",
  DOCUMENTO_COBRANCA: "Documento de cobrança",
  OUTROS: "Outros",
};

function IconePara(anexo: Anexo) {
  if (anexo.forma === "LINK") return <LinkSimple size={15} />;
  if (anexo.mime_type === "application/pdf") return <FilePdf size={15} />;
  if (anexo.mime_type?.startsWith("image/")) return <ImageIcon size={15} />;
  return <FileIcon size={15} />;
}

// Lista compacta de anexos — cada item abre numa aba nova via URL assinada
// de curta duração (buscada na hora do clique, nunca guardada em cache).
export function AnexosLista({ anexos }: { anexos: Anexo[] }) {
  const [pendente, iniciarTransicao] = useTransition();

  if (anexos.length === 0) return null;

  function abrir(anexoId: string) {
    iniciarTransicao(async () => {
      const resultado = await obterUrlAnexoAction(anexoId);
      if ("url" in resultado) {
        window.open(resultado.url, "_blank", "noopener,noreferrer");
        return;
      }
      // Abrir o anexo numa aba nova já é a confirmação de sucesso (Seção 4
      // da spec de feedback) — só falta cobrir o caminho de erro, hoje
      // silencioso (botão só volta a ficar habilitado, sem explicação).
      toast.error(resultado.erro);
    });
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {anexos.map((anexo) => (
        <li key={anexo.id}>
          <button
            type="button"
            disabled={pendente}
            onClick={() => abrir(anexo.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
            title={anexo.descricao ?? undefined}
          >
            <IconePara {...anexo} />
            {anexo.nome_arquivo ?? "Link"}
            <span className="text-muted-foreground">· {ROTULO_TIPO[anexo.tipo] ?? anexo.tipo}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
