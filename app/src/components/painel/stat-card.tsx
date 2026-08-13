import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cartaoVariantes = cva("flex flex-col gap-2 rounded-2xl p-5", {
  variants: {
    variant: {
      hero: "bg-gradient-to-br from-[#6A56D8] to-[#D8583A] text-white",
      violeta: "border-t-[3px] border-t-[#6A56D8] bg-card text-card-foreground",
      coral: "border-t-[3px] border-t-[#D8583A] bg-card text-card-foreground",
      ambar: "border-t-[3px] border-t-[#C98A1F] bg-card text-card-foreground",
      teal: "border-t-[3px] border-t-[#157F6B] bg-card text-card-foreground",
    },
  },
  defaultVariants: { variant: "violeta" },
});

const corRotulo: Record<string, string> = {
  hero: "text-white/85",
  violeta: "text-[#6A56D8]",
  coral: "text-[#D8583A]",
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
      <span className={cn("text-[11.5px] font-bold uppercase tracking-wide", corRotulo[variant ?? "violeta"])}>
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
