// Título padrão de toda tela do sistema — peso e tamanho consistentes,
// nunca mais escrito à mão por página (achado em varredura de design,
// 03/09/2026: h1 de 20px tinha quase o mesmo peso visual de um rótulo de
// seção — sem contraste real, o sistema "não tinha hierarquia visual").
// A barra lateral usa a cor de marca — mesmo sinal que já marca o item
// ativo na navegação — pra reforçar "você está neste módulo" com cor
// funcional, não decorativa.
export function TituloPagina({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="flex items-center gap-2.5 text-[28px] leading-tight font-bold tracking-tight text-foreground">
      <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full bg-primary" />
      {children}
    </h1>
  );
}
