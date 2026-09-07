"use client";

import { useState } from "react";
import { ChatCircleDots } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChatPainel } from "./chat-painel";

// Ponto de entrada visual pro chat de dúvidas — comportamento real
// implementado na Fatia 7 do plano do Chat IA (docs/superpowers/specs/
// 2026-09-07-chat-ia-design.md). Painel mais largo que o antigo `max-w-md`:
// cartão de proposta de ação e referência a valor precisam de mais espaço
// que um "em breve" de uma linha só.
export function ChatDuvidasMenu() {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <Button variant="ghost" size="icon" aria-label="Tirar dúvidas" title="Tirar dúvidas" onClick={() => setAberto(true)}>
        <ChatCircleDots size={19} weight="bold" />
      </Button>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Tirar dúvidas</SheetTitle>
          <SheetDescription>Pergunte sobre como usar o sistema ou sobre os seus próprios lançamentos.</SheetDescription>
        </SheetHeader>
        {aberto && <ChatPainel />}
      </SheetContent>
    </Sheet>
  );
}
