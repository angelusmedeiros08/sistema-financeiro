import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import { GRUPOS_CONTAS_PADRAO, CONTAS_CONTABEIS_PADRAO, CODIGO_CAIXA_E_BANCOS, CODIGO_RECEITAS_GERAL, CODIGO_DESPESAS_GERAL } from "@/lib/contabil/plano-padrao";
import { CATEGORIAS_PADRAO } from "@/lib/contabil/categorias-padrao";
import { MODELO_COMPLETO_DRE } from "@/lib/relatorios/dre";

type StatusAssinatura = "trial" | "ativo" | "inadimplente" | "cancelado";

type ResultadoProvisionamento = { erro: string } | { tenantId: string };

// Cria um tenant novo do zero — vínculo admin + todo o seed de dados limpos
// (plano de contas, DRE modelo, categorias, conta Caixa, formas de
// pagamento) — e nada além disso. Extraído de cadastrar() em
// (auth)/actions.ts pra ser reaproveitado também pelo provisionamento
// disparado por pagamento confirmado (webhook do Asaas, Fatia 6).
//
// Deliberadamente NÃO cria o usuário de auth nem manda e-mail: os dois
// callers usam mecanismos diferentes pra isso (cadastrar() já tem uma
// senha escolhida via signUp; o fluxo de pagamento usa generateLink de
// convite, só depois do webhook confirmar). Recebe usuarioId já pronto —
// mistura os dois só complicaria sem ganho, já que essa parte não é
// idêntica entre os dois casos.
export async function provisionarTenantNovo(params: {
  nome: string;
  usuarioId: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  statusAssinatura?: StatusAssinatura;
  trialTerminaEm?: string;
}): Promise<ResultadoProvisionamento> {
  const admin = createAdminClient();

  // 1) tenant — RLS não permite isso pra um usuário comum de propósito, só
  // o admin client (service_role) pode.
  const { data: tenant, error: erroTenant } = await admin
    .from("tenants")
    .insert({
      nome: params.nome,
      asaas_customer_id: params.asaasCustomerId,
      asaas_subscription_id: params.asaasSubscriptionId,
      status_assinatura: params.statusAssinatura,
      trial_termina_em: params.trialTerminaEm,
    })
    .select("id")
    .single();

  if (erroTenant || !tenant) {
    return { erro: erroTenant?.message ?? "Falha ao criar a empresa." };
  }

  const { error: erroVinculo } = await admin.from("usuario_tenant").insert({
    usuario_id: params.usuarioId,
    tenant_id: tenant.id,
    papel: "admin",
  });

  if (erroVinculo) {
    return { erro: erroVinculo.message };
  }

  // 2) plano de contas — grupo (nível 1, totalizador) primeiro, pra depois
  // referenciar o id gerado como conta_pai_id de cada conta de nível 2.
  const { data: gruposCriados, error: erroGrupos } = await admin
    .from("contas_contabeis")
    .insert(
      GRUPOS_CONTAS_PADRAO.map((g) => ({
        tenant_id: tenant.id,
        codigo: g.codigo,
        nome: g.nome,
        tipo: g.tipo,
        natureza: g.natureza,
        sistema: false,
      })),
    )
    .select("id, codigo");

  if (erroGrupos || !gruposCriados) {
    return { erro: erroGrupos?.message ?? "Falha ao provisionar plano de contas." };
  }

  const grupoPorCodigo = new Map(gruposCriados.map((g) => [g.codigo, g.id]));

  const { data: contasCriadas, error: erroContas } = await admin
    .from("contas_contabeis")
    .insert(
      CONTAS_CONTABEIS_PADRAO.map((c) => ({
        tenant_id: tenant.id,
        codigo: c.codigo,
        nome: c.nome,
        tipo: c.tipo,
        natureza: c.natureza,
        sistema: c.sistema,
        conta_pai_id: grupoPorCodigo.get(c.grupoCodigo),
      })),
    )
    .select("id, codigo");

  if (erroContas || !contasCriadas) {
    return { erro: erroContas?.message ?? "Falha ao provisionar plano de contas." };
  }

  const contaPorCodigo = new Map(contasCriadas.map((c) => [c.codigo, c.id]));
  const contaCaixa = contaPorCodigo.get(CODIGO_CAIXA_E_BANCOS)!;
  const contaReceitas = contaPorCodigo.get(CODIGO_RECEITAS_GERAL)!;
  const contaDespesas = contaPorCodigo.get(CODIGO_DESPESAS_GERAL)!;

  // 3) as 23 linhas reais de tbTotalizadoresDRE — precisa vir antes das
  // categorias porque o seed de categoria vincula cada categoria nova à
  // linha de DRE certa por `ordem`.
  const { data: linhasDreCriadas, error: erroLinhasDre } = await admin
    .from("linhas_dre")
    .insert(
      MODELO_COMPLETO_DRE.map((linha) => ({
        tenant_id: tenant.id,
        ordem: linha.ordem,
        rotulo: linha.rotulo,
        tipo_calc: linha.tipoCalc,
        waterfall_papel: linha.waterfallPapel,
        id_dfc: linha.idDfc,
      })),
    )
    .select("id, ordem");

  if (erroLinhasDre || !linhasDreCriadas) {
    return { erro: erroLinhasDre?.message ?? "Falha ao provisionar estrutura de DRE." };
  }

  const linhaIdPorOrdem = new Map(linhasDreCriadas.map((l) => [l.ordem, l.id]));

  // Categoria não se auto-vincula a uma linha de DRE — categoria_pai_id
  // referencia o id gerado nesse mesmo insert, então as categorias sem pai
  // (inclusive as que têm filhas) precisam existir antes das subcategorias.
  const categoriasSemPai = CATEGORIAS_PADRAO.filter((c) => !c.paiNome);
  const categoriasComPai = CATEGORIAS_PADRAO.filter((c) => c.paiNome);

  const { data: criadasSemPai, error: erroCategoriasSemPai } = await admin
    .from("categorias_financeiras")
    .insert(
      categoriasSemPai.map((c) => ({
        tenant_id: tenant.id,
        nome: c.nome,
        tipo: c.tipo,
        eh_custo_fixo: c.ehCustoFixo,
        conta_contabil_id: c.tipo === "RECEITA" ? contaReceitas : contaDespesas,
      })),
    )
    .select("id, nome");

  if (erroCategoriasSemPai || !criadasSemPai) {
    return { erro: erroCategoriasSemPai?.message ?? "Falha ao provisionar categorias." };
  }

  const idCategoriaPorNome = new Map(criadasSemPai.map((c) => [c.nome, c.id]));

  const { data: criadasComPai, error: erroCategoriasComPai } = await admin
    .from("categorias_financeiras")
    .insert(
      categoriasComPai.map((c) => ({
        tenant_id: tenant.id,
        nome: c.nome,
        tipo: c.tipo,
        eh_custo_fixo: c.ehCustoFixo,
        conta_contabil_id: c.tipo === "RECEITA" ? contaReceitas : contaDespesas,
        categoria_pai_id: idCategoriaPorNome.get(c.paiNome!),
      })),
    )
    .select("id, nome");

  if (erroCategoriasComPai || !criadasComPai) {
    return { erro: erroCategoriasComPai?.message ?? "Falha ao provisionar subcategorias." };
  }

  for (const c of criadasComPai) idCategoriaPorNome.set(c.nome, c.id);

  const { error: erroLinhaDreCategorias } = await admin.from("linha_dre_categorias").insert(
    CATEGORIAS_PADRAO.map((c) => ({
      linha_dre_id: linhaIdPorOrdem.get(c.ordemDre)!,
      categoria_id: idCategoriaPorNome.get(c.nome)!,
    })),
  );

  if (erroLinhaDreCategorias) {
    return { erro: erroLinhaDreCategorias.message };
  }

  // 4) conta financeira "Caixa" + formas de pagamento padrão
  const { error: erroContaFinanceira } = await admin.from("contas_financeiras").insert({
    tenant_id: tenant.id,
    nome: "Caixa",
    tipo: "CAIXA",
    conta_contabil_id: contaCaixa,
  });

  if (erroContaFinanceira) {
    return { erro: erroContaFinanceira.message };
  }

  const { error: erroFormasPagamento } = await admin
    .from("formas_pagamento")
    .insert(["Pix", "Boleto", "Cartão", "Dinheiro"].map((nome) => ({ tenant_id: tenant.id, nome })));

  if (erroFormasPagamento) {
    return { erro: erroFormasPagamento.message };
  }

  return { tenantId: tenant.id };
}
