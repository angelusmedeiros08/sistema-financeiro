import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cartaoVariantes = cva("flex flex-col gap-2 rounded-2xl p-5", {
  variants: {
    variant: {
      hero: "bg-gradient-to-br from-[#157F6B] to-[#A87C1F] text-white",
      sage: "border-t-[3px] border-t-[#7A8B5C] bg-card text-card-foreground",
      coral: "border-t-[3px] border-t-[#B23A2E] bg-card text-card-foreground",
      ambar: "border-t-[3px] border-t-[#C98A1F] bg-card text-card-foreground",
      teal: "border-t-[3px] border-t-[#157F6B] bg-card text-card-foreground",
    },
  },
  defaultVariants: { variant: "sage" },
});

const corRotulo: Record<string, string> = {
  hero: "text-white/85",
  sage: "text-[#7A8B5C]",
  coral: "text-[#B23A2E]",
  ambar: "text-[#C98A1F]",
  teal: "text-[#157F6B]",
};

type StatCardProps = VariantProps<typeof cartaoVariantes> & {
  label: string;
  valor: string;
  detalhe?: string;
};

export function StatCard({ label, valor, detalhe, variant }: StatCardProps) {
  return (
    <div className={cn(cartaoVariantes({ variant }), variant !== "hero" && "border border-border")}>
      <span className={cn("text-[11.5px] font-bold uppercase tracking-wide", corRotulo[variant ?? "sage"])}>
        {label}
      </span>
      <span className="font-heading text-[22px] font-bold tracking-tight tabular-nums">{valor}</span>
      {detalhe && (
        <span className={cn("text-xs font-medium", variant === "hero" ? "text-white/80" : "text-muted-foreground")}>
          {detalhe}
        </span>
      )}
    </div>
  );
}
