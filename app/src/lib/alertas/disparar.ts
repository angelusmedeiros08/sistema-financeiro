import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import { buscarSaldoProjetado, somarDias } from "@/lib/relatorios/saldo-projetado";
import { buscarVencimentosProximos, buscarMembrosEquipeAtivos, type ParcelaVencimento } from "./vencimentos";
import { jaEnviadoHoje, registrarEnvio } from "./dedup";
import { enviarResumoEquipe, enviarCobrancaCliente } from "./alertas-email";

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

// Chamada uma vez por dia pelo cron (via /api/cron/alertas-vencimento).
// Atravessa todos os tenants numa passada só, igual gerarOcorrenciasPendentes
// já faz pra recorrência — cada linha já carrega o próprio tenant_id.
export async function dispararAlertasDiarios(supabase: Cliente): Promise<{ resumosEnviados: number; cobrancasEnviadas: number; erros: string[] }> {
  const hojeIso = new Date().toISOString().slice(0, 10);
  const d3Iso = somarDias(hojeIso, 3);

  const [{ data: tenants }, vencimentos] = await Promise.all([
    supabase.from("tenants").select("id"),
    buscarVencimentosProximos(supabase, hojeIso, d3Iso),
  ]);

  const erros: string[] = [];
  let resumosEnviados = 0;
  let cobrancasEnviadas = 0;

  for (const tenant of tenants ?? []) {
    const doTenant = vencimentos.filter((v) => v.tenantId === tenant.id);
    const aPagar = doTenant.filter((v) => v.tipo === "DESPESA");
    const aReceber = doTenant.filter((v) => v.tipo === "RECEITA");

    const saldoProjetado = await buscarSaldoProjetado(supabase, tenant.id);
    const emRuptura = saldoProjetado.projecoes.find((p) => p.dias === 7)?.ruptura ?? false;

    if (aPagar.length > 0 || aReceber.length > 0 || emRuptura) {
      const membros = await buscarMembrosEquipeAtivos(supabase, tenant.id);
      for (const membro of membros) {
        const jaFoi = await jaEnviadoHoje(supabase, { tenantId: tenant.id, tipo: "resumo_equipe", destinatarioId: membro.usuarioId, referenciaData: hojeIso });
        if (jaFoi) continue;

        const resultado = await enviarResumoEquipe({ email: membro.email, nome: membro.nome, aPagar, aReceber, saldoProjetado });
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
  }

  return { resumosEnviados, cobrancasEnviadas, erros };
}
