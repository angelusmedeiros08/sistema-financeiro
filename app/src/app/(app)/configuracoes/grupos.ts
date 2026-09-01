import type { ComponentType } from "react";
import {
  Tag,
  BookOpen,
  ChartPieSlice,
  CreditCard,
  Bank,
  MagicWand,
  Table,
  ArrowsClockwise,
  SlidersHorizontal,
  ChartBar,
  Users,
} from "@phosphor-icons/react/dist/ssr";

type IconeConfig = ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string }>;

// Fonte única dos itens de Configurações — ConfiguracoesSubNav (pills nas
// subtelas) e a página-índice (cards) importam daqui, pra nunca divergir.
export const GRUPOS_CONFIGURACOES: {
  rotulo: string;
  itens: { href: string; rotulo: string; descricao: string; icon: IconeConfig }[];
}[] = [
  {
    rotulo: "Cadastros",
    itens: [
      { href: "/configuracoes/categorias", rotulo: "Categorias", descricao: "Categorias de receita e despesa.", icon: Tag },
      { href: "/configuracoes/plano-de-contas", rotulo: "Plano de contas", descricao: "Contas contábeis do livro-razão.", icon: BookOpen },
      { href: "/configuracoes/centros-custo", rotulo: "Centros de custo", descricao: "Divisões internas pra ratear lançamentos.", icon: ChartPieSlice },
      { href: "/configuracoes/formas-pagamento", rotulo: "Formas de pagamento", descricao: "Pix, boleto, cartão e outras.", icon: CreditCard },
      { href: "/configuracoes/contas-financeiras", rotulo: "Contas financeiras", descricao: "Contas bancárias e caixas do tenant.", icon: Bank },
    ],
  },
  {
    rotulo: "Automação",
    itens: [
      { href: "/configuracoes/regras-categorizacao", rotulo: "Regras de categorização", descricao: "Categorização automática por padrão de texto.", icon: MagicWand },
      { href: "/configuracoes/mapeamento-colunas", rotulo: "Mapeamento de colunas", descricao: "Regras aprendidas de importação por planilha.", icon: Table },
      { href: "/configuracoes/recorrencias", rotulo: "Recorrências", descricao: "Lançamentos que se repetem automaticamente.", icon: ArrowsClockwise },
    ],
  },
  {
    rotulo: "Personalização",
    itens: [
      { href: "/configuracoes/campos-personalizados", rotulo: "Campos personalizados", descricao: "Campos extras em cadastros do sistema.", icon: SlidersHorizontal },
      { href: "/configuracoes/estrutura-dre", rotulo: "Estrutura de DRE", descricao: "Linhas e agrupamento do demonstrativo.", icon: ChartBar },
    ],
  },
  {
    rotulo: "Equipe",
    itens: [{ href: "/configuracoes/equipe", rotulo: "Equipe", descricao: "Quem tem acesso e com qual papel.", icon: Users }],
  },
] as const;
