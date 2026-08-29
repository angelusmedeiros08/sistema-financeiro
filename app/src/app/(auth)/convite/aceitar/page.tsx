import { aceitarConvite } from "../../actions";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";

const ROTULO_PAPEL: Record<string, string> = {
  admin: "Admin",
  financeiro_senior: "Financeiro sênior",
  financeiro_junior: "Financeiro júnior",
  contador: "Contador",
  cliente_portal: "Cliente (portal)",
};

// tenant/papel vêm crus da querystring e o token só é validado de verdade no
// submit do formulário (design de propósito — token de generateLink não dá
// pra "espiar" sem consumir) — até lá, essa tela é alcançável por qualquer
// um com um link forjado, com texto arbitrário nesses campos. `papel` tem
// domínio fechado, então cai num rótulo genérico se não bater com nenhuma
// chave conhecida (em vez de ecoar o valor cru). `tenantNome` não tem
// domínio fechado (é nome de empresa de verdade), então só limita tamanho e
// remove quebra de linha — reduz o espaço pra uma frase de phishing longa,
// sem quebrar nome de empresa legítimo (achado em auditoria de segurança).
function tenantExibicaoSegura(bruto: string): string {
  const semQuebra = bruto.replace(/[\r\n\t]+/g, " ").trim();
  return semQuebra.length > 60 ? `${semQuebra.slice(0, 60)}…` : semQuebra;
}

// Página intermediária de propósito: só existe pra exigir um clique de
// verdade num botão antes de consumir o token de convite. Se o token fosse
// consumido só por carregar a página (como no fluxo antigo, que apontava
// direto pro /verify do Supabase), qualquer scanner de segurança de e-mail
// que visita o link automaticamente já gastaria o convite antes da pessoa
// clicar de propósito.
export default async function PaginaAceitarConvite({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; papel?: string; tenant?: string; next?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const email = params.email ?? "";
  const papel = params.papel ?? "";
  const tenantNome = params.tenant ?? "";
  const next = params.next ?? "/convite/definir-senha";

  if (!token || !email) {
    return (
      <AuthShell titulo="Convite inválido" subtitulo="Esse link está incompleto.">
        <p className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          Esse link não é válido — peça um novo convite a quem te convidou.
        </p>
      </AuthShell>
    );
  }

  const rotuloPapel = ROTULO_PAPEL[papel] ?? "";
  const tenantExibicao = tenantNome ? tenantExibicaoSegura(tenantNome) : "";

  return (
    <AuthShell titulo="Você foi convidado" subtitulo={email}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Você foi convidado pra acessar o sistema financeiro{tenantExibicao ? ` de ${tenantExibicao}` : ""}
          {rotuloPapel ? ` como ${rotuloPapel}` : ""}.
        </p>

        <form action={aceitarConvite}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <Button type="submit" className="w-full">
            Aceitar convite
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
