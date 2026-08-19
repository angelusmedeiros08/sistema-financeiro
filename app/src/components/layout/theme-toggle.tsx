"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  // Evita renderizar o ícone errado no primeiro paint do servidor — o tema
  // real só é conhecido depois da hidratação (next-themes lê localStorage).
  useEffect(() => setMontado(true), []);

  const escuro = montado && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      title={montado ? (escuro ? "Mudar para tema claro" : "Mudar para tema escuro") : "Alternar tema"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {escuro ? <Sun size={19} /> : <Moon size={19} />}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
