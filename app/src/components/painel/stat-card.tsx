import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

const cartaoVariantes = cva("group/stat relative flex flex-col gap-2.5 overflow-hidden rounded-2xl p-5", {
  variants: {
    variant: {
      hero: "bg-gradient-to-br from-[#D8583A] to-[#A87C1F] text-white shadow-card",
      sage: "bg-card text-card-foreground shadow-card",
      coral: "bg-card text-card-foreground shadow-card",
      ambar: "bg-card text-card-foreground shadow-card",
      teal: "bg-card text-card-foreground shadow-card",
    },
  },
  defaultVariants: { variant: "sage" },
});

const corAccent: Record<string, string> = {
  hero: "",
  sage: "#7A8B5C",
  coral: "#B23A2E",
  ambar: "#C98A1F",
  teal: "#157F6B",
};

const corRotulo: Record<string, string> = {
  hero: "text-white/80",
  sage: "text-[#7A8B5C]",
  coral: "text-[#B23A2E]",
  ambar: "text-[#C98A1F]",
  teal: "text-[#157F6B]",
};

type StatCardProps = VariantProps<typeof cartaoVariantes> & {
  label: string;
  valor: string;
  detalhe?: string;
  delta?: number;
  serie?: number[];
};

export function StatCard({ label, valor, detalhe, variant, delta, serie }: StatCardProps) {
  const v = variant ?? "sage";
  const deltaPositivo = typeof delta === "number" && delta >= 0;
  const corDelta = v === "hero" ? "text-white" : deltaPositivo ? "text-[#157F6B]" : "text-[#B23A2E]";
  const corSpark = v === "hero" ? "#ffffff" : deltaPositivo ? "#157F6B" : "#B23A2E";

  return (
    <div className={cn(cartaoVariantes({ variant }))}>
      {v !== "hero" && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: corAccent[v] }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-[11px] font-bold uppercase tracking-wider", corRotulo[v])}>{label}</span>
        {typeof delta === "number" && (
          <span className={cn("flex items-center gap-0.5 text-xs font-bold tabular-nums", corDelta)}>
            {deltaPositivo ? <ArrowUpRight size={13} weight="bold" /> : <ArrowDownRight size={13} weight="bold" />}
            {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        )}
      </div>

      <span className="font-heading text-[26px] font-bold leading-none tracking-tight tabular-nums">{valor}</span>

      {detalhe && (
        <span className={cn("text-xs font-medium", v === "hero" ? "text-white/80" : "text-muted-foreground")}>
          {detalhe}
        </span>
      )}

      {serie && serie.length > 1 && (
        <div className="-mx-1 mt-1 h-9">
          <Sparkline dados={serie} cor={corSpark} />
        </div>
      )}
    </div>
  );
}
