"use client";

import {
  DocumentoComercialForm,
  type ProdutoOpcaoComercial,
  type DadosComerciaisIniciais,
} from "@/components/formularios/documento-comercial-form";
import { criarOrcamentoAction, editarOrcamentoAction } from "@/lib/orcamentos-comerciais/orcamentos-comerciais-actions";

export function OrcamentoForm({
  modo,
  orcamentoId,
  pessoas,
  produtosIniciais,
  formasPagamento,
  orcamentoInicial,
}: {
  modo: "criar" | "editar";
  orcamentoId?: string;
  pessoas: { id: string; nome: string }[];
  produtosIniciais: ProdutoOpcaoComercial[];
  formasPagamento: { id: string; nome: string }[];
  orcamentoInicial?: DadosComerciaisIniciais;
}) {
  return (
    <DocumentoComercialForm
      tituloSecaoDados="Dados do orçamento"
      modo={modo}
      idDocumento={orcamentoId}
      pessoas={pessoas}
      produtosIniciais={produtosIniciais}
      formasPagamento={formasPagamento}
      dadosIniciais={orcamentoInicial}
      acaoCriar={criarOrcamentoAction}
      acaoEditar={editarOrcamentoAction}
      botaoCriarSecundario={{ valorAcao: "enviar", rotulo: "Salvar e enviar", rotuloPendente: "Enviando..." }}
      mensagemSucesso="Orçamento salvo."
    />
  );
}
