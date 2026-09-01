# Configurações reorganizada (Fatia 7 do dossiê UX)

## Contexto

Dossiê UX: "página-índice + resgatar as 3 subtelas órfãs. Pode ser a passada 'dedicada' de IA que ficou prometida antes do lançamento."

## Achado ao investigar (o dossiê estava desatualizado em parte)

As "3 subtelas órfãs" (`importar-pessoas`, `importar-planilha`, `orcamento`, todas em `configuracoes/`) **não são órfãs** — são stubs de redirect deliberados, cada um com comentário explicando a migração (importação virou módulo de topo próprio; orçamento virou parte de Previsionamento). Preservados só pra não quebrar link salvo/histórico do navegador. Nada a resgatar aqui — é arquitetura correta, não um bug.

O que realmente falta: **`/configuracoes` não tem página-índice própria** — hoje é um `redirect("/configuracoes/centros-custo")` puro, então quem entra na seção cai direto na primeira subtela sem nenhuma visão geral do que existe. `ConfiguracoesSubNav` já lista os 11 itens reais em 4 grupos (Cadastros/Automação/Personalização/Equipe) — a página-índice só precisa reaproveitar essa mesma estrutura, no mesmo padrão visual do hub de `/importacao` (grid de cards) que já existe no sistema.

## Fora de escopo (decisão já registrada antes desta sessão)

Reorganização mais ampla de navegação/sidebar continua **explicitamente adiada** — decisão já tomada: "reorganização de navegação é etapa futura dedicada, não otimizar isso incrementalmente agora". Esta fatia não mexe no sub-nav, no sidebar, nem em nenhum outro módulo — só adiciona a página-índice que falta, usando os grupos que já existem.

## Design

`configuracoes/page.tsx` deixa de redirecionar e passa a renderizar um índice: título "Configurações" + os 4 grupos de `ConfiguracoesSubNav` (mesmos rótulos/agrupamento, fonte única — a lista de grupos migra pra um módulo compartilhado `configuracoes/grupos.ts` que tanto a página-índice quanto `ConfiguracoesSubNav` importam, pra nunca divergir) renderizados como cards clicáveis (mesmo padrão visual do hub de `/importacao`: ícone + nome + descrição curta por item). `ConfiguracoesSubNav` continua aparecendo nas subtelas, como já é hoje.
