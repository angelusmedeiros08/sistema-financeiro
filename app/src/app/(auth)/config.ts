// Reaberto temporariamente (2026-08-23) pra um sócio criar o próprio
// tenant limpo e separado via /cadastro (pedido explícito do usuário,
// não o modelo de convite-pro-mesmo-tenant que a spec do deploy de
// demo previa). Desligar de novo assim que o cadastro em questão for
// concluído — não deixar aberto ao público por mais tempo que o
// necessário.
//
// Separado de actions.ts porque um arquivo "use server" só pode exportar
// função async — uma const aqui quebra o build.
export const CADASTRO_PUBLICO_ATIVO = true;
