"use client";

import { Bell } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type NotificacaoAlerta = {
  id: string;
  tipo: string;
  enviadoEm: string;
};

const ROTULO_TIPO: Record<string, string> = {
  resumo_equipe: "Resumo diário de vencimentos enviado por e-mail",
};

const FUSO = "America/Sao_Paulo";

// `toDateString()`/`toLocaleDateString()` sem `timeZone` usam o fuso do
// runtime onde o código roda — no servidor (Vercel, UTC) e no navegador
// (Brasil, UTC-3) isso produz dias de calendário diferentes por ~3h todo
// dia (ex.: 23h de Brasília já é dia seguinte em UTC), causando erro de
// hidratação #418 nesse componente global (acha em todas as páginas
// autenticadas). Fixar o fuso explicitamente faz servidor e cliente
// concordarem sempre, independente de onde cada um roda.
function diaEm(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
}

function formatarQuando(iso: string): string {
  const data = new Date(iso);
  const mesmoDia = diaEm(data) === diaEm(new Date());
  if (mesmoDia) return `Hoje, ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO })}`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: FUSO });
}

export function NotificacoesMenu({ notificacoes }: { notificacoes: NotificacaoAlerta[] }) {
  const hoje = diaEm(new Date());
  const temNovaHoje = notificacoes.some((n) => diaEm(new Date(n.enviadoEm)) === hoje);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notificações">
          <Bell size={19} />
          {temNovaHoje && (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificacoes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma notificação recente.</p>
        ) : (
          notificacoes.map((n) => (
            <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 whitespace-normal">
              <span className="text-sm">{ROTULO_TIPO[n.tipo] ?? n.tipo}</span>
              <span className="text-xs text-muted-foreground">{formatarQuando(n.enviadoEm)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
