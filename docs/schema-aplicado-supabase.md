# Schema aplicado — projeto Supabase `sistema-financeiro`

Registro do que foi efetivamente implementado no banco (região São Paulo, `sa-east-1`, projeto `oeixjnyvfxifyxunzlre`), a partir da spec `docs/superpowers/specs/2026-08-12-fundacao-nucleo-financeiro-design.md`.

## Migrações aplicadas, em ordem

1. `001_tipos_enumerados` — 9 tipos enumerados (papel de usuário, tipo/natureza de conta contábil, origem de lançamento, tipo de partida, tipo de categoria, natureza de pessoa, perfil de pessoa, status de parcela).
2. `002_fundacao_multitenant` — `tenants`, `usuarios` (espelho de `auth.users`), `usuario_tenant` (vínculo N:N), trigger de auto-cadastro em `usuarios` no signup, funções helper de autorização, RLS nas três tabelas.
3. `003_nucleo_ledger` — `contas_contabeis`, `lancamentos`, `partidas`; trigger que deriva `tenant_id` da partida a partir do lançamento pai; constraint trigger deferida garantindo débito=crédito por moeda; triggers de imutabilidade (bloqueiam UPDATE/DELETE em `lancamentos` e `partidas`); RLS.
4. `004_camada_dominio` — `categorias_financeiras`, `centros_custo`, `contas_financeiras`, `pessoas`, `eventos_financeiros`, `rateio_categoria`, `rateio_centro_custo`, `parcelas`, `baixas`; RLS em todas (sem policy de delete em nenhuma — dado financeiro não é apagado por padrão).
5. `005_endurecer_permissoes_funcoes` — correção: o Supabase concede `EXECUTE` automático a `anon`/`authenticated`/`service_role` em toda função nova do schema `public` (via `ALTER DEFAULT PRIVILEGES`), o que `revoke ... from public` sozinho não desfaz. Revogado explicitamente de cada role.
6. `006_performance_rls_e_indices` — `auth.uid()` envolvido em `(select ...)` nas 3 políticas que ainda usavam a forma direta (evita reavaliação por linha); 14 índices de cobertura para chaves estrangeiras que não tinham.
7. `007_mover_funcoes_para_schema_privado` — as duas funções de autorização (`tenants_do_usuario_atual`, `usuario_tem_papel`) movidas do schema `public` para um schema `private` não exposto pelo PostgREST, fechando o alerta de "função SECURITY DEFINER alcançável via API" sem quebrar nenhuma política (Postgres resolve a referência por OID, não por texto).
8. `009_corrigir_cascade_partidas_tenant` — corrigida inconsistência: `partidas.tenant_id` era a única referência a `tenants(id)` sem `ON DELETE CASCADE` no schema inteiro.
9. `010_teste_de_invariantes_do_ledger` — teste funcional real (não apenas revisão de código): confirma que lançamento desbalanceado é rejeitado, lançamento balanceado funciona, alteração/exclusão de partida e lançamento são bloqueadas, e que a limpeza do dado de teste não deixa rastro.
10. `011_ciclo_baixa_status_e_saldo_residual` — a partir da spec `docs/superpowers/specs/2026-08-13-fase1-ciclo-financeiro-completo-design.md` (Fase 1 completa: receita, contas a receber/pagar, baixa): `checar_saldo_residual_baixa()` (trigger `BEFORE INSERT` em `baixas`, rejeita `valor_pago` que ultrapasse o saldo em aberto da parcela) e `atualizar_status_parcela()` (trigger `AFTER INSERT` em `baixas`, recalcula `PENDENTE → RECEBIDO_PARCIAL → QUITADO` a partir da soma das baixas — nunca escrito manualmente pela aplicação). Testado via `DO` block real: baixa parcial, baixa complementar, e tentativa de baixa acima do saldo residual corretamente rejeitada.
11. `012_checar_soma_rateio_categoria` — a partir da spec `docs/superpowers/specs/2026-08-13-rateio-multi-categoria-design.md` (primeiro dos quatro ciclos de aprofundamento da Fase 1): `checar_soma_rateio_categoria()`, constraint trigger deferred em `rateio_categoria` (mesmo padrão de `checar_partidas_balanceadas`), rejeita qualquer INSERT/UPDATE/DELETE que deixe a soma das linhas de rateio de um evento diferente do `valor_total`. Testado via `DO` block: soma correta aceita, remoção de linha que quebra a soma corretamente rejeitada.
12. `013_checar_soma_rateio_centro_custo` — a partir da spec `docs/superpowers/specs/2026-08-13-centro-de-custo-design.md` (segundo ciclo de aprofundamento da Fase 1): `checar_soma_rateio_centro_custo()`, mesmo padrão deferred, um nível mais fundo — para qualquer linha de `rateio_categoria` que tiver alguma linha de `rateio_centro_custo`, a soma precisa bater com o valor daquela linha de categoria (centro de custo é opcional por linha, e não participa de nenhuma partida do ledger). Testado via `DO` block.

## Verificação final

- `get_advisors` (segurança): **0 alertas**.
- `get_advisors` (performance): só `unused_index` (nível INFO, esperado — banco vazio, sem tráfego ainda; resolve sozinho quando o app começar a rodar).
- 15 tabelas, **RLS ativa em 100%** delas.
- Banco validado com tenants de teste reais (cadastro → despesa/receita → parcelamento → baixa parcial e total → saldo em caixa correto) — não é mais um banco vazio; dado de teste fica no ambiente até o produto ter usuários reais.

## Desvios deliberados em relação à spec original (e por quê)

- **`tenant_id` denormalizado em `partidas`** (a spec original só tinha `lancamento_id`): evita que toda política de RLS em `partidas` precise de um `JOIN` contra `lancamentos` — mais rápido e mais simples de auditar. Populado automaticamente por trigger a partir do lançamento pai, nunca informado pelo chamador.
- **`tenant_id` também denormalizado em `parcelas`, `baixas`, `rateio_categoria`, `rateio_centro_custo`** — mesmo raciocínio, consistente em toda a camada de domínio.
- **`composicao_valor` de `baixas`** (multa/juros/desconto/taxa) virou 4 colunas numéricas simples em vez de um tipo composto — mais direto de consultar em SQL puro.
- **Nenhuma tabela tem policy de DELETE para o papel `authenticated`** — dado financeiro não é apagado por essa via; qualquer exclusão real (ex. corrigir erro de cadastro) é operação privilegiada via `service_role`, fora do alcance de um usuário comum.
- **Funções de autorização vivem em `private`, não em `public`** — mesmo comportamento de RLS, mas sem ficarem alcançáveis como endpoint de API.

## O que ainda não existe (de propósito)

Nenhuma das 4 tabelas de integração externa (`conexoes_bancarias`, `transacoes_importadas`, `documentos_fiscais`, `capturas`) foi criada — como já estava explícito na spec, elas entram só quando a fase de integração correspondente começar. Também não há dado semente (categorias padrão, contas contábeis "de sistema") — isso é decisão de camada de aplicação, não de schema.
