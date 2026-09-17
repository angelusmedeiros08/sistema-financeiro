"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Fotos reais (licença livre, Pexels/Unsplash) do ambiente de trabalho —
// não são clientes nem depoimentos, só ambientação da tela de login.
// Adicionar mais é só colocar o arquivo em public/auth-carrossel/ e somar
// aqui.
const FOTOS = [
  { src: "/auth-carrossel/equipe-1.jpg", alt: "Equipe sorrindo ao redor de um computador no escritório" },
  { src: "/auth-carrossel/financas-2.jpg", alt: "Profissional apontando para gráficos financeiros na tela do notebook" },
  { src: "/auth-carrossel/financas-3.jpg", alt: "Profissional analisando gráficos financeiros num tablet, com calculadora ao lado" },
];

const INTERVALO_MS = 6000;

export function CarrosselAuth() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (FOTOS.length <= 1) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % FOTOS.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-foreground lg:block">
      {FOTOS.map((foto, i) => (
        <Image
          key={foto.src}
          src={foto.src}
          alt={foto.alt}
          fill
          priority={i === 0}
          sizes="50vw"
          className={`object-cover transition-opacity duration-1000 ease-in-out ${i === indice ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-10">
        <p className="max-w-sm font-heading text-2xl font-bold leading-snug text-white">
          O financeiro da sua empresa, organizado de verdade.
        </p>

        {FOTOS.length > 1 && (
          <div className="mt-6 flex gap-2">
            {FOTOS.map((foto, i) => (
              <span key={foto.src} className={`h-1.5 rounded-full transition-all ${i === indice ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
