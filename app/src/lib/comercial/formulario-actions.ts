import { revalidatePath } from "next/cache";
import type { ItemComercialEntrada } from "./itens";

// Compartilhado entre vendas-actions.ts e orcamentos-comerciais-actions.ts —
// os dois formulários (VendaForm/OrcamentoForm, por baixo do
// DocumentoComercialForm compartilhado) mandam o mesmo formato de FormData.
// Extraído em revisão de código: as duas cópias eram idênticas, só o nome
// do tipo de item mudava (ItemVendaEntrada/ItemOrcamentoEntrada, hoje os
// dois são só ItemComercialEntrada).
export function lerItensComerciaisJson(formData: FormData): ItemComercialEntrada[] {
  const bruto = String(formData.get("itens_json") ?? "[]");
  try {
    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.map((item) => ({
      produtoServicoId: String(item.produtoServicoId ?? ""),
      quantidade: Number(item.quantidade),
      precoUnitario: Number(item.precoUnitario),
    }));
  } catch {
    return [];
  }
}

export function lerCabecalhoComercial(formData: FormData) {
  return {
    pessoaId: String(formData.get("pessoa_id") ?? ""),
    dataEmissao: String(formData.get("data_emissao") ?? ""),
    formaPagamentoId: String(formData.get("forma_pagamento_id") ?? ""),
    numeroParcelas: Number(formData.get("numero_parcelas") ?? 1),
    primeiroVencimento: String(formData.get("primeiro_vencimento") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
}

// `caminhoBase`: "/vendas" ou "/orcamentos".
export function revalidarDocumentoComercial(caminhoBase: string, id?: string) {
  revalidatePath(caminhoBase);
  if (id) revalidatePath(`${caminhoBase}/${id}`);
}
