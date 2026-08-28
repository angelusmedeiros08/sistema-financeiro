# Concentração de despesa — 7º indicador da Central de Indicadores

**Data:** 2026-08-27

## 1. Contexto

O usuário lembrava de um indicador "Risco: X% de..." que associava ao mesmo estilo visual de "Top 3 clientes = X% da receita" (Concentração de Receita, já no ar) e "Caixa negativo em 7 dias" (Saldo Projetado, já no ar). Investigação confirmou que nada foi removido: é um conceito já pesquisado e documentado em `docs/pesquisa-indicadores-contabeis-fundamentos.md` (seção 4, "Concentração de Receita/Despesa — risco de carteira", pesquisa de 15/08/2026), cuja implementação real só cobriu o lado da receita. O texto da pesquisa já registrava a fórmula espelhada: *"% do gasto total concentrado nos 3-5 maiores fornecedores/categorias — concentração de despesa é o mesmo cálculo aplicado ao plano de contas em vez de à carteira de clientes."*

Este spec fecha a implementação do lado da despesa, reaproveitando ao máximo o que já existe.

## 2. Decisões validadas com o usuário

- **Dimensão: por fornecedor/pessoa**, espelhando exatamente Concentração de Receita (não por categoria/conta — ficou descartado por ora).
- **Limiares do semáforo: idênticos ao lado da receita** — Top 3 ≥ 50% = Risco alto, ≥ 30% = Médio, abaixo = Baixo.
- **Localização na tela**: mesma seção da Concentração de Receita, lado a lado (`grid sm:grid-cols-2`) — a seção passa a se chamar "Concentração de receita e despesa". Mesmo padrão visual que "Prazos médios e aging" (PMR/PMP) e "Aging" (a receber/a pagar) já usam na mesma página.
- **Drill-down**: clicar numa fatia leva pra `/lancamentos` filtrado por aquele fornecedor + `tipo: DESPESA` — mesmo mecanismo (`montarHrefLancamentos`) já usado do lado da receita, só trocando o tipo.

## 3. Reuso e generalização

`buscarConcentracaoReceita` (`lib/relatorios/concentracao-receita.ts`) já calcula tudo que a despesa precisa — agrupa `buscarMovimento` por pessoa, calcula % do total, Top 3, nível de risco — só que hardcoded pra `tipo: "RECEITA"`. Em vez de duplicar o arquivo inteiro, a função é generalizada:

- Arquivo renomeado `concentracao-receita.ts` → `concentracao.ts`.
- `buscarConcentracaoReceita(supabase, params)` → `buscarConcentracao(supabase, { ...params, tipo: "RECEITA" | "DESPESA" })`.
- O filtro interno `linha.tipo !== "RECEITA"` (hoje fixo) passa a comparar contra `params.tipo`.
- O rótulo `href` construído via `montarHrefLancamentos` já aceita `tipo` como parâmetro — só passar o valor recebido em vez do literal `"RECEITA"`.
- Tipo exportado `ConcentracaoReceita` → `ConcentracaoEntidade` (nome genérico, já que serve pros dois lados agora).

`BadgeRiscoConcentracao` ganha dois props novos, com default pra não quebrar o call site existente:
- `entidadeLabel: "clientes" | "fornecedores"` (default `"clientes"`).
- `totalLabel: "receita" | "despesa"` (default `"receita"`).

Texto montado: `${ROTULO_NIVEL} · Top 3 ${entidadeLabel} = ${percentual} da ${totalLabel}`.

## 4. Tela

Em `indicadores/page.tsx`, a seção existente:

```tsx
<section>
  <h2>Concentração de receita</h2>
  <BadgeRiscoConcentracao ... />
  <TopCategoriasDonut titulo="Top clientes por receita (últimos 12 meses)" ... />
</section>
```

vira:

```tsx
<section>
  <h2>Concentração de receita e despesa</h2>
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div>
      <BadgeRiscoConcentracao nivelRisco={concentracaoReceita.nivelRisco} percentualTop3={concentracaoReceita.percentualTop3} />
      <TopCategoriasDonut titulo="Top clientes por receita (últimos 12 meses)" ... />
    </div>
    <div>
      <BadgeRiscoConcentracao nivelRisco={concentracaoDespesa.nivelRisco} percentualTop3={concentracaoDespesa.percentualTop3} entidadeLabel="fornecedores" totalLabel="despesa" />
      <TopCategoriasDonut titulo="Top fornecedores por despesa (últimos 12 meses)" ... />
    </div>
  </div>
</section>
```

`buscarConcentracao` é chamada duas vezes (tipo RECEITA e DESPESA) dentro do mesmo `Promise.all` que já busca os outros indicadores da página — sem round-trip extra além da query que já existiria de qualquer forma.

## 5. Fora de escopo

- Concentração de despesa por categoria/conta (descartado nesta leva — pode virar pedido futuro).
- Limiares configuráveis por tenant (mesma decisão já tomada pros outros indicadores desta central).
- Índice HHI (fórmula mais rigorosa mencionada na pesquisa) — Top 3 já é o padrão usado no resto do sistema.
