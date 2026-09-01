"use client";

import Link from "next/link";
import { Bell, Receipt, HandCoins, Wallet, FileX } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { NotificacaoItem, TipoNotificacao } from "@/lib/notificacoes/notificacoes";

const ICONE_TIPO: Record<TipoNotificacao, { icon: typeof Bell; cor: string }> = {
  resumo_equipe: { icon: Receipt, cor: "bg-muted-foreground" },
  vencimento_pagar: { icon: Wallet, cor: "bg-destructive" },
  vencimento_receber: { icon: HandCoins, cor: "bg-positivo" },
  erro_importacao: { icon: FileX, cor: "bg-destructive" },
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

export function NotificacoesMenu({ notificacoes }: { notificacoes: NotificacaoItem[] }) {
  const hoje = diaEm(new Date());
  const temNovaHoje = notificacoes.some((n) => diaEm(new Date(n.quando)) === hoje);

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
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificacoes.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma notificação recente.</p>
        ) : (
          notificacoes.map((n) => {
            const { icon: Icon, cor } = ICONE_TIPO[n.tipo];
            return (
              <DropdownMenuItem key={n.id} asChild>
                <Link href={n.href} className="flex items-start gap-2.5 whitespace-normal">
                  <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${cor}`}>
                    <Icon size={12} weight="bold" className="text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{n.titulo}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {n.subtitulo && <span>{n.subtitulo} ·</span>}
                      {formatarQuando(n.quando)}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
