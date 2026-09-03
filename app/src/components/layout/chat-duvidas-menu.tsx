"use client";

import { useState } from "react";
import { ChatCircleDots } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/estado-vazio";

// Ponto de entrada visual pro chat de dúvidas (achado em pedido do usuário,
// 03/09/2026 — pensando nos módulos futuros). O COMPORTAMENTO de verdade
// (responder dúvida de uso do sistema + pergunta sobre os próprios dados do
// tenant, com acesso seguro via RLS) fica pra um ciclo de brainstorm
// dedicado — hoje só o botão + painel existem, com estado "em breve".
export function ChatDuvidasMenu() {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <Button variant="ghost" size="icon" aria-label="Tirar dúvidas" title="Tirar dúvidas" onClick={() => setAberto(true)}>
        <ChatCircleDots size={19} />
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tirar dúvidas</SheetTitle>
          <SheetDescription>Pergunte sobre como usar o sistema ou sobre os seus próprios lançamentos.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 items-center justify-center px-4">
          <EstadoVazio texto="Em breve." icon={ChatCircleDots} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
