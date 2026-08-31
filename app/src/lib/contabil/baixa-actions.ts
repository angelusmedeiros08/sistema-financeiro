"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { obterUsuarioETenantAtual } from "@/lib/tenant/atual";
import { registrarBaixa, resolverFormaPagamentoIdSimples } from "./baixa";
import { extrairAnexosDraftDoFormData, anexarDraftsAoDono } from "./anexos";
import { hojeIsoBrasil } from "@/lib/data-brasil";
import { parseNumeroBR } from "@/lib/formatacao";

type ResultadoAcao = { erro: string } | { sucesso: true };

export async function darBaixa(formData: FormData): Promise<ResultadoAcao> {
  const parcela_id = String(formData.get("parcela_id") ?? "");
  const conta_financeira_id = String(formData.get("conta_financeira_id") ?? "");
  const data_pagamento = String(formData.get("data_pagamento") ?? "");

  const parseValor = (nome: string) => parseNumeroBR(String(formData.get(nome) ?? ""));
  const valor_pago = parseValor("valor_pago");

  if (!parcela_id || !conta_financeira_id || !data_pagamento || valor_pago <= 0) {
    return { erro: "Preencha conta, data e valor pago (maior que zero)." };
  }
  // Achado em investigação de divergência de saldo (30/08/2026): nada
  // impedia registrar baixa com data no futuro — o link "Todo o histórico"
  // filtra até hoje, então uma baixa "paga" numa data que ainda não chegou
  // some dos relatórios de período mas continua contando no saldo do
  // Painel (livro-razão sem filtro de data), gerando números divergentes
  // entre as duas telas sem nenhum aviso. O <input max> no formulário já
  // bloqueia no seletor nativo; esta é a guarda de verdade contra alguém
  // burlando isso.
  if (data_pagamento > hojeIsoBrasil()) {
    return { erro: "Data de pagamento não pode ser no futuro." };
  }

  const contexto = await obterUsuarioETenantAtual();
  if ("erro" in contexto) return { erro: contexto.erro };

  const supabase = await createClient();

  const { nome: metodo_pagamento } = await resolverFormaPagamentoIdSimples(supabase, contexto.tenantId, formData);
  const forma_pagamento_id = String(formData.get("forma_pagamento_id") ?? "") || undefined;
  const idempotency_key = String(formData.get("idempotency_key") ?? "") || undefined;

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
    idempotency_key,
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
