import { revalidatePath } from "next/cache";

// Fonte única de "toda tela que deriva de lançamento" — toda ação que
// cria/edita/estorna/cancela/renegocia/dá baixa (direto ou indiretamente,
// como aprovar Venda/Orçamento, conciliação bancária, importação em lote)
// precisa chamar isto, além de qualquer revalidação específica sua (ex.:
// `/despesas/${eventoId}`). Consolidado numa função só — achado em
// auditoria: cada ação tinha sua própria lista parcial e duplicada
// (`revalidarPaginasFinanceiras` existia solta em 2 arquivos diferentes), e
// NENHUMA delas incluía Relatórios/Indicadores/Lançamentos, só as telas de
// lançamento em si.
//
// Next 16 aqui não tem Full Route Cache nem Data Cache pra nenhuma dessas
// rotas — toda página usa `createClient()` -> `cookies()`, o que já força
// renderização 100% dinâmica (confirmado em node_modules/next/dist/docs).
// Então isso não é o que evita "número velho" num clique normal em link
// (isso já não acontece, de qualquer forma). O que isto protege de verdade:
// (1) Voltar/Avançar do navegador reaproveitando uma página já visitada na
// mesma aba, e (2) o efeito colateral hoje "temporário" do Next 16 (uma
// Server Action revalidando um path também atualiza as demais páginas já
// visitadas na aba) — a própria doc do Next avisa que essa amplitude vai
// ser restrita só ao path passado no futuro, então listar os paths de
// verdade aqui é o que continua funcionando quando isso mudar.
export function revalidarTelasFinanceiras() {
  revalidatePath("/painel");
  revalidatePath("/lancamentos");
  revalidatePath("/contas-a-receber");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/despesas");
  revalidatePath("/receitas");
  revalidatePath("/indicadores");
  revalidatePath("/relatorios/dre");
  revalidatePath("/relatorios/dfc");
  revalidatePath("/relatorios/fluxo-caixa");
  revalidatePath("/relatorios/ponto-equilibrio");
  revalidatePath("/relatorios/aging");
  revalidatePath("/relatorios/despesas");
  revalidatePath("/relatorios/centro-custo");
  revalidatePath("/relatorios/comparativos");
  revalidatePath("/relatorios/contas-bancarias");
  revalidatePath("/relatorios/visao-geral");
  revalidatePath("/relatorios/orcado-realizado");
  revalidatePath("/portal");
}
