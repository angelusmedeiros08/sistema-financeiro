"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ReactECharts from "echarts-for-react";
import type { FluxoSankey } from "@/lib/relatorios/dfc";
import { formatarMoeda } from "@/lib/formatacao";

const NO_RECEITA_TOTAL = "Receita realizada";
const NO_SALDO = "Saldo do período";
const NO_DEFICIT = "Déficit do período";

const PALETA_RECEITA = ["#0FA37E", "#22C39F", "#4C7DF0", "#8CB84A", "#B45FC7", "#EF6F9A"];
const PALETA_DESPESA = ["#B23A2E", "#C94A3D", "#E3A62F", "#D8583A", "#B45FC7", "#EF6F9A"];

type ParametroTooltip = {
  dataType: "node" | "edge";
  name?: string;
  value?: number;
  data: { source?: string; target?: string; value?: number };
};

// Sankey via ECharts — biblioteca nova no stack, entra só pra isso porque
// nem Recharts nem @visx/shape têm um motor de fluxo direcionado com
// conservação de nós; @nivo tem, mas fragmentaria o stack por só um
// gráfico (ver pesquisa-referencias-visuais-reforma-design.md §5).
// Mostra de onde a receita veio e pra onde ela foi — composição que a
// matriz da DFC (tabela ao lado) não deixa ver.
export function SankeyFluxoCaixa({ fluxo }: { fluxo: FluxoSankey }) {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const escuro = montado && resolvedTheme === "dark";
  const corTexto = escuro ? "#edebe7" : "#1a1d1f";

  if (fluxo.nos.length === 0 || fluxo.links.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem movimentação suficiente no período selecionado.</p>;
  }

  const indiceCentral = fluxo.nos.findIndex((n) => n.nome === NO_RECEITA_TOTAL);

  function corDoNo(nome: string, indice: number): string {
    if (nome === NO_RECEITA_TOTAL) return "#4C7DF0";
    if (nome === NO_SALDO) return "#0FA37E";
    if (nome === NO_DEFICIT) return "#B23A2E";
    return indice < indiceCentral
      ? PALETA_RECEITA[indice % PALETA_RECEITA.length]
      : PALETA_DESPESA[(indice - indiceCentral - 1) % PALETA_DESPESA.length];
  }

  const option = {
    tooltip: {
      trigger: "item",
      backgroundColor: "#1A1D1F",
      borderWidth: 0,
      padding: 10,
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: (parametro: ParametroTooltip) => {
        if (parametro.dataType === "edge") {
          return `${parametro.data.source} → ${parametro.data.target}<br/><strong>${formatarMoeda(parametro.data.value ?? 0)}</strong>`;
        }
        return `${parametro.name}<br/><strong>${formatarMoeda(parametro.value ?? 0)}</strong>`;
      },
    },
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        nodeGap: 16,
        nodeWidth: 14,
        lineStyle: { color: "gradient", opacity: 0.22, curveness: 0.5 },
        label: { color: corTexto, fontSize: 11, fontWeight: 600 },
        data: fluxo.nos.map((n, i) => ({ name: n.nome, itemStyle: { color: corDoNo(n.nome, i), borderWidth: 0 } })),
        links: fluxo.links.map((l) => ({ source: l.origem, target: l.destino, value: l.valor })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 380 }} notMerge />;
}
