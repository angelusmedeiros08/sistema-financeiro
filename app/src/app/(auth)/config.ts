// Cadastro público fica desligado durante o deploy de demonstração pros
// sócios (spec 2026-08-17-deploy-demo-vercel-design.md) — só quem for
// convidado entra. Reverter pra true quando cadastro público fizer
// sentido de novo (ex.: lançamento comercial).
//
// Separado de actions.ts porque um arquivo "use server" só pode exportar
// função async — uma const aqui quebra o build.
export const CADASTRO_PUBLICO_ATIVO = false;
