import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { buscarSaldoProjetado, somarDias } from "@/lib/relatorios/saldo-projetado";
import { buscarLiquidezAproximada } from "@/lib/relatorios/liquidez-aproximada";
import { buscarVencimentosProximos, buscarMembrosEquipeAtivos, type ParcelaVencimento } from "./vencimentos";
import { jaEnviadoHoje, registrarEnvio } from "./dedup";
import { enviarResumoEquipe, enviarCobrancaCliente } from "./alertas-email";
import { hojeIsoBrasil } from "@/lib/data-brasil";

type Cliente = SupabaseClient<Database>;

function agruparPorPessoa(parcelas: ParcelaVencimento[]): Map<string, ParcelaVencimento[]> {
  const grupos = new Map<string, ParcelaVencimento[]>();
  for (const p of parcelas) {
    if (!p.pessoaId || !p.pessoaEmail) continue;
    const atual = grupos.get(p.pessoaId) ?? [];
    atual.push(p);
    grupos.set(p.pessoaId, atual);
  }
  return grupos;
}

type ResultadoTenant = { resumosEnviados: number; cobrancasEnviadas: number; erros: string[] };

// Um tenant inteiro (membros da equipe + clientes com parcela vencendo) —
// extraído pra rodar em paralelo com os demais tenants em
// dispararAlertasDiarios. Os dois loops internos (membros, pessoas) ficam
// sequenciais de propósito: são poucas dezenas no pior caso por tenant, sem
// o mesmo risco de timeout que centenas de TENANTS em sequência tinham.
async function processarTenant(
  supabase: Cliente,
  tenant: { id: string },
  vencimentos: ParcelaVencimento[],
  hojeIso: string,
): Promise<ResultadoTenant> {
  const erros: string[] = [];
  let resumosEnviados = 0;
  let cobrancasEnviadas = 0;

  const doTenant = vencimentos.filter((v) => v.tenantId === tenant.id);
  const aPagar = doTenant.filter((v) => v.tipo === "DESPESA");
  const aReceber = doTenant.filter((v) => v.tipo === "RECEITA");

  const [saldoProjetado, liquidez] = await Promise.all([
    buscarSaldoProjetado(supabase, tenant.id),
    buscarLiquidezAproximada(supabase, tenant.id),
  ]);
  const emRuptura = saldoProjetado.projecoes.find((p) => p.dias === 7)?.ruptura ?? false;
  const liquidezEmRisco = liquidez.nivel === "RISCO";

  if (aPagar.length > 0 || aReceber.length > 0 || emRuptura || liquidezEmRisco) {
    const membros = await buscarMembrosEquipeAtivos(supabase, tenant.id);
    for (const membro of membros) {
      const jaFoi = await jaEnviadoHoje(supabase, { tenantId: tenant.id, tipo: "resumo_equipe", destinatarioId: membro.usuarioId, referenciaData: hojeIso });
      if (jaFoi) continue;

      const resultado = await enviarResumoEquipe({ email: membro.email, nome: membro.nome, aPagar, aReceber, saldoProjetado, liquidez });
      if ("erro" in resultado) {
        erros.push(`resumo_equipe ${tenant.id}/${membro.usuarioId}: ${resultado.erro}`);
        continue;
      }
      await registrarEnvio(supabase, { tenantId: tenant.id, tipo: "resumo_equipe", destinatarioId: membro.usuarioId, referenciaData: hojeIso });
      resumosEnviados++;
    }
  }

  for (const [pessoaId, parcelas] of agruparPorPessoa(aReceber)) {
    const jaFoi = await jaEnviadoHoje(supabase, { tenantId: tenant.id, tipo: "vencimento_cliente", destinatarioId: pessoaId, referenciaData: hojeIso });
    if (jaFoi) continue;

    const resultado = await enviarCobrancaCliente({ email: parcelas[0].pessoaEmail!, nome: parcelas[0].pessoaNome ?? "cliente", parcelas });
    if ("erro" in resultado) {
      erros.push(`vencimento_cliente ${tenant.id}/${pessoaId}: ${resultado.erro}`);
      continue;
    }
    await registrarEnvio(supabase, { tenantId: tenant.id, tipo: "vencimento_cliente", destinatarioId: pessoaId, referenciaData: hojeIso });
    cobrancasEnviadas++;
  }

  return { resumosEnviados, cobrancasEnviadas, erros };
}

// Chamada uma vez por dia pelo cron (via /api/cron/alertas-vencimento).
// Todos os tenants em paralelo (Promise.all) — achado P0 de escalabilidade
// (25/08): a versão anterior processava tenant por tenant em sequência, com
// risco real de estourar o timeout da function com centenas de tenants
// (falharia em silêncio, sem log, deixando tenants no fim da lista sem
// alerta nenhum naquele dia).
export async function dispararAlertasDiarios(supabase: Cliente): Promise<{ resumosEnviados: number; cobrancasEnviadas: number; erros: string[] }> {
  const hojeIso = hojeIsoBrasil();
  const d3Iso = somarDias(hojeIso, 3);

  const [{ data: tenants }, vencimentos] = await Promise.all([
    supabase.from("tenants").select("id"),
    buscarVencimentosProximos(supabase, hojeIso, d3Iso),
  ]);

  const resultados = await Promise.all((tenants ?? []).map((tenant) => processarTenant(supabase, tenant, vencimentos, hojeIso)));

  return resultados.reduce(
    (acc, r) => ({
      resumosEnviados: acc.resumosEnviados + r.resumosEnviados,
      cobrancasEnviadas: acc.cobrancasEnviadas + r.cobrancasEnviadas,
      erros: [...acc.erros, ...r.erros],
    }),
    { resumosEnviados: 0, cobrancasEnviadas: 0, erros: [] as string[] },
  );
}
