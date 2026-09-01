# Trilha de auditoria (Fatia 9 do dossiê UX)

## Contexto

Dossiê UX: "tela de 'quem fez o quê, quando' — requisito enterprise-ready básico, hoje inexistente pro usuário final."

## Design

Sem tabela nem trigger novos — a fonte é o próprio `lancamentos`, o livro-razão em si, imutável por trigger (`bloquear_alteracao_ledger`, já documentado nesta sessão) desde que criado. É, por definição, o registro de auditoria mais confiável que existe no sistema: cada linha já tem `criado_por`/`criado_em`, e um estorno é, ele mesmo, uma nova linha no ledger (`estornado_de_id` aponta pra linha original) — "lançamento criado" e "lançamento estornado" saem os dois da mesma tabela, sem esforço extra. `usuario_tenant` (convidado_em) completa com o outro tipo de evento que o dossiê citava (mudança de equipe), que não vive no ledger.

Nova função `buscarTrilhaAuditoria` (`lib/auditoria/auditoria.ts`) busca as duas fontes, resolve nome de usuário num segundo SELECT (`usuarios.nome` pelos ids distintos encontrados) e intercala por data — cada fonte pagina com folga (até o fim da página pedida) e o corte final acontece depois do merge, pra não cortar cedo demais numa das duas.

Nova página `configuracoes/auditoria` (grupo "Equipe" de `ConfiguracoesSubNav`/página-índice, ver Fatia 7) — feed cronológico simples (ícone por tipo de evento + "quem — o quê" + timestamp completo), mesmo padrão visual de "Lançamentos recentes" do Painel, com paginação de 25 por página.

## Fora de escopo

- Auditoria de TODA operação do sistema (edição de cadastro, mudança de categoria, etc.) — o ledger cobre o que importa mais (dinheiro entrando/saindo/sendo revertido); ampliar pra outras tabelas exigiria trigger novo em cada uma, escopo bem maior que "básico".
- Filtro por usuário/período/tipo de evento — a lista cronológica simples já responde "quem fez o quê, quando"; filtros ficam pra quando o volume justificar.
- Exportação (CSV/PDF) da trilha — YAGNI por ora.
