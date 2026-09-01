import Link from "next/link";
import { GRUPOS_CONFIGURACOES } from "./grupos";

// Antes era um redirect puro pra /configuracoes/centros-custo — sem
// nenhuma visão geral, quem entrava na seção caía direto numa subtela
// aleatória. Página-índice reaproveita os mesmos 4 grupos que
// ConfiguracoesSubNav já usa (fonte única em grupos.ts), mesmo padrão
// visual do hub de /importacao (grid de cards com ícone + descrição).
export default function PaginaConfiguracoes() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastros, automação e personalização do sistema.</p>
      </div>

      {GRUPOS_CONFIGURACOES.map((grupo) => (
        <div key={grupo.rotulo} className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{grupo.rotulo}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {grupo.itens.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card transition-colors hover:bg-muted/30"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.rotulo}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.descricao}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
