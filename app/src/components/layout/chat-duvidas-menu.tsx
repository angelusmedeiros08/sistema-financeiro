"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChatCircleDots, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatPainel } from "./chat-painel";

// Painel próprio (não o Sheet compartilhado em components/ui/sheet.tsx):
// aquele componente aplica backdrop-blur no overlay, o anti-padrão que a
// convenção visual do projeto proíbe pra fluxo importante. Construído
// direto sobre o primitivo Radix (mesmo que o Sheet usa por baixo) pra
// manter foco/teclado/ESC de graça, mas com overlay sólido (sem blur) e
// bem mais largo — pedido do usuário 10/09/2026 ("deixar ele maior").
export function ChatDuvidasMenu() {
  const [aberto, setAberto] = useState(false);
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
      <Button variant="ghost" size="icon" aria-label="Tirar dúvidas" title="Tirar dúvidas" onClick={() => setAberto(true)}>
        <ChatCircleDots size={19} weight="bold" />
      </Button>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 duration-150",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl duration-200 sm:w-[560px] lg:w-[680px] xl:w-[760px]",
            "data-open:animate-in data-open:slide-in-from-right-8 data-closed:animate-out data-closed:slide-out-to-right-8",
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border p-4">
            <div>
              <DialogPrimitive.Title className="font-heading text-base font-medium text-foreground">Chat IA</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                Pergunte sobre como usar o sistema ou sobre os seus próprios lançamentos.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar">
                <X size={16} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {aberto && <ChatPainel />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
