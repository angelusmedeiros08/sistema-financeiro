// Script de uso único, local — cria um tenant novo e limpo pra um sócio,
// com o mesmo provisionamento que cadastrar() faz em (auth)/actions.ts,
// mas sem passar por nenhuma rota pública. Só roda na sua máquina, com a
// SUPABASE_SERVICE_ROLE_KEY que já está em app/.env.local (nunca exposta,
// nunca commitada). O convite é gerado (mesmo mecanismo seguro de
// generateLink({type:"invite"}) já usado no convite de equipe — token só
// consumido no clique explícito) mas NÃO enviado por e-mail automático:
// o link é só impresso no console pra você mandar pro sócio pelo canal
// que quiser.
//
// Uso: pnpm exec tsx scripts/provisionar-tenant-socio.ts

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { GRUPOS_CONTAS_PADRAO, CONTAS_CONTABEIS_PADRAO, CODIGO_CAIXA_E_BANCOS, CODIGO_RECEITAS_GERAL, CODIGO_DESPESAS_GERAL } from "../src/lib/contabil/plano-padrao";
import { CATEGORIAS_PADRAO } from "../src/lib/contabil/categorias-padrao";
import { MODELO_COMPLETO_DRE } from "../src/lib/relatorios/dre";
import type { Database } from "../src/utils/supabase/database.types";

// --- dados do próximo tenant a provisionar (edite aqui antes de rodar) ---
const NOME_EMPRESA: string = "TROQUE_AQUI";
const NOME_RESPONSAVEL = "TROQUE_AQUI";
const EMAIL = "TROQUE_AQUI@exemplo.com";
// ---------------------------------------------------------------------

function carregarEnvLocal() {
  const caminho = resolve(__dirname, "..", ".env.local");
  if (!existsSync(caminho)) throw new Error(".env.local não encontrado em app/.env.local");
  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const l = linha.trim();
    if (!l || l.startsWith("#")) continue;
    const idx = l.indexOf("=");
    if (idx === -1) continue;
    const chave = l.slice(0, idx).trim();
    const valor = l.slice(idx + 1).trim();
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}

async function main() {
  if (NOME_EMPRESA === "TROQUE_AQUI" || EMAIL.includes("TROQUE_AQUI")) {
    throw new Error("Edite NOME_EMPRESA / NOME_RESPONSAVEL / EMAIL no topo do script antes de rodar.");
  }

  carregarEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!url || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes em .env.local");

  const admin = createClient<Database>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Provisionando tenant "${NOME_EMPRESA}" pra ${NOME_RESPONSAVEL} <${EMAIL}>...`);

  // 1) tenant
  const { data: tenant, error: erroTenant } = await admin.from("tenants").insert({ nome: NOME_EMPRESA }).select("id").single();
  if (erroTenant || !tenant) throw new Error(`Falha ao criar tenant: ${erroTenant?.message}`);
  console.log(`  tenant criado: ${tenant.id}`);

  // 2) usuário — se o e-mail já tem conta (ex.: já é membro de outro
  // tenant), reaproveita o login existente em vez de tentar criar de novo
  // (generateLink rejeitaria com "already been registered"). Só gera link
  // de convite/ativação quando é usuário genuinamente novo.
  const { data: usuarioExistente } = await admin.from("usuarios").select("id").eq("email", EMAIL).maybeSingle();

  let usuarioId: string;
  let linkAceite: string | null = null;

  if (usuarioExistente) {
    usuarioId = usuarioExistente.id;
    console.log(`  usuário já existia, reaproveitando login: ${usuarioId}`);
  } else {
    const { data: convite, error: erroConvite } = await admin.auth.admin.generateLink({
      type: "invite",
      email: EMAIL,
      options: { data: { nome: NOME_RESPONSAVEL } },
    });
    if (erroConvite || !convite.user) throw new Error(`Falha ao criar usuário: ${erroConvite?.message}`);
    usuarioId = convite.user.id;
    linkAceite = `${siteUrl}/convite/aceitar?token=${encodeURIComponent(convite.properties.hashed_token)}&email=${encodeURIComponent(EMAIL)}&papel=admin&tenant=${encodeURIComponent(NOME_EMPRESA)}&next=${encodeURIComponent("/convite/definir-senha")}`;
    console.log(`  usuário criado: ${usuarioId}`);
  }

  // 3) vínculo admin
  const { error: erroVinculo } = await admin.from("usuario_tenant").insert({ usuario_id: usuarioId, tenant_id: tenant.id, papel: "admin", senha_definida: !!usuarioExistente });
  if (erroVinculo) throw new Error(`Falha ao vincular: ${erroVinculo.message}`);

  // 4) plano de contas — grupos primeiro, depois contas de nível 2
  const { data: gruposCriados, error: erroGrupos } = await admin
    .from("contas_contabeis")
    .insert(GRUPOS_CONTAS_PADRAO.map((g) => ({ tenant_id: tenant.id, codigo: g.codigo, nome: g.nome, tipo: g.tipo, natureza: g.natureza, sistema: false })))
    .select("id, codigo");
  if (erroGrupos || !gruposCriados) throw new Error(`Falha ao provisionar grupos de contas: ${erroGrupos?.message}`);
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
  if (erroContas || !contasCriadas) throw new Error(`Falha ao provisionar plano de contas: ${erroContas?.message}`);
  const contaPorCodigo = new Map(contasCriadas.map((c) => [c.codigo, c.id]));
  const contaCaixa = contaPorCodigo.get(CODIGO_CAIXA_E_BANCOS)!;
  const contaReceitas = contaPorCodigo.get(CODIGO_RECEITAS_GERAL)!;
  const contaDespesas = contaPorCodigo.get(CODIGO_DESPESAS_GERAL)!;
  console.log(`  plano de contas: ${gruposCriados.length + contasCriadas.length} contas`);

  // 5) DRE
  const { data: linhasDreCriadas, error: erroLinhasDre } = await admin
    .from("linhas_dre")
    .insert(MODELO_COMPLETO_DRE.map((linha) => ({ tenant_id: tenant.id, ordem: linha.ordem, rotulo: linha.rotulo, tipo_calc: linha.tipoCalc, waterfall_papel: linha.waterfallPapel, id_dfc: linha.idDfc })))
    .select("id, ordem");
  if (erroLinhasDre || !linhasDreCriadas) throw new Error(`Falha ao provisionar DRE: ${erroLinhasDre?.message}`);
  const linhaIdPorOrdem = new Map(linhasDreCriadas.map((l) => [l.ordem, l.id]));
  console.log(`  DRE: ${linhasDreCriadas.length} linhas`);

  // 6) categorias (sem pai primeiro, depois subcategorias)
  const categoriasSemPai = CATEGORIAS_PADRAO.filter((c) => !c.paiNome);
  const categoriasComPai = CATEGORIAS_PADRAO.filter((c) => c.paiNome);

  const { data: criadasSemPai, error: erroCategoriasSemPai } = await admin
    .from("categorias_financeiras")
    .insert(categoriasSemPai.map((c) => ({ tenant_id: tenant.id, nome: c.nome, tipo: c.tipo, eh_custo_fixo: c.ehCustoFixo, conta_contabil_id: c.tipo === "RECEITA" ? contaReceitas : contaDespesas })))
    .select("id, nome");
  if (erroCategoriasSemPai || !criadasSemPai) throw new Error(`Falha ao provisionar categorias: ${erroCategoriasSemPai?.message}`);
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
  if (erroCategoriasComPai || !criadasComPai) throw new Error(`Falha ao provisionar subcategorias: ${erroCategoriasComPai?.message}`);
  for (const c of criadasComPai) idCategoriaPorNome.set(c.nome, c.id);
  console.log(`  categorias: ${criadasSemPai.length + criadasComPai.length}`);

  const { error: erroLinhaDreCategorias } = await admin
    .from("linha_dre_categorias")
    .insert(CATEGORIAS_PADRAO.map((c) => ({ linha_dre_id: linhaIdPorOrdem.get(c.ordemDre)!, categoria_id: idCategoriaPorNome.get(c.nome)! })));
  if (erroLinhaDreCategorias) throw new Error(`Falha ao vincular categorias ao DRE: ${erroLinhaDreCategorias.message}`);

  // 7) conta financeira "Caixa" + formas de pagamento padrão
  const { error: erroContaFinanceira } = await admin.from("contas_financeiras").insert({ tenant_id: tenant.id, nome: "Caixa", tipo: "CAIXA", conta_contabil_id: contaCaixa });
  if (erroContaFinanceira) throw new Error(`Falha ao criar conta Caixa: ${erroContaFinanceira.message}`);

  const { error: erroFormasPagamento } = await admin.from("formas_pagamento").insert(["Pix", "Boleto", "Cartão", "Dinheiro"].map((nome) => ({ tenant_id: tenant.id, nome })));
  if (erroFormasPagamento) throw new Error(`Falha ao criar formas de pagamento: ${erroFormasPagamento.message}`);

  console.log("\nTudo pronto.");
  if (linkAceite) {
    console.log("Envie esse link pro sócio (funciona uma vez, expira se não for usado):\n");
    console.log(linkAceite);
  } else {
    console.log(`Login já existia — ${NOME_RESPONSAVEL} entra com a senha de sempre e troca pra "${NOME_EMPRESA}" no menu do avatar (canto superior direito → Trocar de empresa).`);
  }
  console.log("");
}

main().catch((erro) => {
  console.error("\nFALHOU:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
