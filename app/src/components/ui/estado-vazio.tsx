import { Tray } from "@phosphor-icons/react/dist/ssr";
import { Empty, EmptyHeader, EmptyMedia, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;

export function EstadoVazio({ texto, icon: Icon = Tray, className }: { texto: string; icon?: IconType; className?: string }) {
  return (
    <Empty className={cn("rounded-2xl border border-dashed border-border bg-muted/20 py-8", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon size={18} />
        </EmptyMedia>
        <EmptyDescription>{texto}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
