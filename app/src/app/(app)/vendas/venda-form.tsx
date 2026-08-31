"use client";

import {
  DocumentoComercialForm,
  type ProdutoOpcaoComercial,
  type DadosComerciaisIniciais,
} from "@/components/formularios/documento-comercial-form";
import { criarVendaAction, editarVendaAction } from "@/lib/vendas/vendas-actions";

export function VendaForm({
  modo,
  vendaId,
  pessoas,
  produtosIniciais,
  formasPagamento,
  vendaInicial,
}: {
  modo: "criar" | "editar";
  vendaId?: string;
  pessoas: { id: string; nome: string }[];
  produtosIniciais: ProdutoOpcaoComercial[];
  formasPagamento: { id: string; nome: string }[];
  vendaInicial?: DadosComerciaisIniciais;
}) {
  return (
    <DocumentoComercialForm
      tituloSecaoDados="Dados da venda"
      modo={modo}
      idDocumento={vendaId}
      pessoas={pessoas}
      produtosIniciais={produtosIniciais}
      formasPagamento={formasPagamento}
      dadosIniciais={vendaInicial}
      acaoCriar={criarVendaAction}
      acaoEditar={editarVendaAction}
      botaoCriarSecundario={{ valorAcao: "direto", rotulo: "Confirmar venda", rotuloPendente: "Confirmando..." }}
      mensagemSucesso="Venda salva."
    />
  );
}
