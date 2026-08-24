# Seletor de tenant (trocar entre múltiplos vínculos)

**Data:** 2026-08-23
**Status:** aprovado

## Contexto

`usuario_tenant` já é uma tabela N:N (um usuário pode ter vínculo ativo com mais de um tenant) e a RLS já suporta isso de verdade: `private.tenants_do_usuario_atual()` retorna `SETOF uuid` — todos os tenants ativos do usuário, não um só. O que falta é só a aplicação: `obterUsuarioETenantAtual()` (`lib/tenant/atual.ts`) pega arbitrariamente "o primeiro vínculo ativo" via `.limit(1)`, e não existe nenhuma UI pra escolher. Motivado por um caso real: um usuário (Erick) já tem vínculo admin ativo num tenant e precisa de acesso a um segundo tenant limpo e separado — hoje ele não conseguiria alcançar o segundo pela UI de jeito nenhum.

**Escopo confirmado com o usuário: só trocar entre tenants, sem visão agregada** (nenhuma tela mostra dado de mais de um tenant ao mesmo tempo — trocar sempre troca o contexto inteiro).

## Desenho

- **Seletor sempre visível na sidebar** (mesmo espírito de um trocador de workspace): mostra o nome do tenant atual, clicável, abre lista dos outros tenants ativos do usuário. Só aparece se o usuário tiver mais de 1 vínculo ativo — usuário comum (1 tenant só) não vê nada diferente de hoje.
- **Tenant atual é guardado num cookie** (`tenant_ativo`, httpOnly, `SameSite=Lax`, sem data de expiração curta — é preferência, não sessão). Escolher um tenant no seletor chama uma server action que valida e grava o cookie, depois redireciona pra `/painel`.
- **`obterUsuarioETenantAtual()` passa a buscar TODOS os vínculos ativos do usuário** (não mais `.limit(1)`), e escolhe entre eles: se o cookie aponta pra um `tenant_id` que está na lista de vínculos ativos do usuário, usa esse; senão (primeiro acesso, cookie ausente/inválido/apontando pra tenant que o usuário não pertence mais), usa o primeiro da lista — mesmo comportamento de fallback de hoje, então nenhum usuário existente percebe diferença.
- **Segurança do cookie:** o valor do cookie nunca é confiado como autorização — é só uma preferência de UI. Toda vez que é lido, `obterUsuarioETenantAtual()` confere se aquele `tenant_id` está mesmo entre os vínculos ativos do usuário (consulta real ao banco, RLS aplicada). Um cookie adulterado apontando pra um tenant alheio simplesmente não bate com nenhum vínculo real e cai no fallback — não existe caminho onde o cookie por si só concede acesso a nada.

## Fora de escopo

Visão agregada entre tenants, painel dedicado de contador/BPO (isso fica pra quando for maior que "trocar contexto"), qualquer mudança na RLS (já está correta).
