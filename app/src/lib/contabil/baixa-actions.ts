"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { registrarBaixa, resolverFormaPagamentoIdSimples } from "./baixa";
import { extrairAnexosDraftDoFormData, anexarDraftsAoDono } from "./anexos";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function darBaixa(formData: FormData): Promise<ResultadoAcao> {
  const parcela_id = String(formData.get("parcela_id") ?? "");
  const conta_financeira_id = String(formData.get("conta_financeira_id") ?? "");
  const data_pagamento = String(formData.get("data_pagamento") ?? "");

  const parseValor = (nome: string) => {
    const texto = String(formData.get(nome) ?? "").replace(",", ".");
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  };
  const valor_pago = parseValor("valor_pago");

  if (!parcela_id || !conta_financeira_id || !data_pagamento || valor_pago <= 0) {
    return { erro: "Preencha conta, data e valor pago (maior que zero)." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  const { nome: metodo_pagamento } = await resolverFormaPagamentoIdSimples(supabase, contexto.tenantId, formData);
  const forma_pagamento_id = String(formData.get("forma_pagamento_id") ?? "") || undefined;

  const resultado = await registrarBaixa(supabase, {
    tenant_id: contexto.tenantId,
    parcela_id,
    conta_financeira_id,
    data_pagamento,
    valor_pago,
    valor_juros: parseValor("valor_juros"),
    valor_multa: parseValor("valor_multa"),
    valor_desconto: parseValor("valor_desconto"),
    valor_taxa: parseValor("valor_taxa"),
    metodo_pagamento: metodo_pagamento ?? undefined,
    forma_pagamento_id,
    criado_por: contexto.user.id,
  });

  if ("erro" in resultado) return { erro: resultado.erro };

  const anexosDraft = extrairAnexosDraftDoFormData(formData);
  if (anexosDraft.length > 0) {
    await anexarDraftsAoDono(supabase, anexosDraft, {
      tenant_id: contexto.tenantId,
      baixa_id: resultado.baixa_id,
      criado_por: contexto.user.id,
    });
  }

  revalidatePath("/contas-a-receber");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/painel");
  return { sucesso: true };
}
