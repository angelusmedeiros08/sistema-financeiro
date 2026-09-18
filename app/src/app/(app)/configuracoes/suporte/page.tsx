import { redirect } from "next/navigation";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { TituloPagina } from "@/components/layout/titulo-pagina";
import { Button } from "@/components/ui/button";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

// Único canal de suporte do sistema hoje: e-mail, mesma variável de
// ambiente já usada no contato de dados pessoais (privacidade/page.tsx) e
// no "Falar com o suporte" de assinatura-pendente/page.tsx — trocar o
// remetente ali troca aqui também, sem precisar caçar 3 lugares (achado em
// varredura de conteúdo pré-lançamento, 18/09/2026: o app logado não tinha
// nenhum canal de ajuda visível pra quem já é cliente, só quem lê a
// Política de Privacidade).
export default async function PaginaSuporte() {
  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) redirect("/entrar");

  const emailContato = process.env.BREVO_SENDER_EMAIL;
  const assunto = encodeURIComponent(`Suporte Finanssi: ${contexto.tenantNome}`);

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina>Suporte</TituloPagina>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ficou com dúvida sobre como usar o sistema, achou algo que parece errado, ou precisa de ajuda com a sua empresa (
          <span className="font-medium text-foreground">{contexto.tenantNome}</span>) no Finanssi? Mande um e-mail direto pra
          gente — respondemos o mais rápido possível.
        </p>

        {emailContato ? (
          <Button asChild className="w-fit gap-2">
            <a href={`mailto:${emailContato}?subject=${assunto}`}>
              <EnvelopeSimple size={16} />
              {emailContato}
            </a>
          </Button>
        ) : (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Canal de suporte ainda não configurado.
          </p>
        )}
      </div>
    </div>
  );
}
