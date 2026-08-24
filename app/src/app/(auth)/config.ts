// Fechado de novo (2026-08-23) — ficou aberto por poucos minutos pra um
// teste e foi revertido a pedido explícito do usuário: cadastro público
// é superfície de ataque (qualquer um na internet pode criar tenant),
// não deve ficar no ar sem necessidade ativa. Criação de tenant novo
// passa a ser feita por um caminho controlado pelo próprio usuário, não
// por essa rota pública. Reverter pra true só com decisão explícita e
// escopo de tempo claro.
//
// Separado de actions.ts porque um arquivo "use server" só pode exportar
// função async — uma const aqui quebra o build.
export const CADASTRO_PUBLICO_ATIVO = false;
