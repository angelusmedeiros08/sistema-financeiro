# Previsionamento × Orçamento comercial

**Data:** 2026-08-30

## 1. Contexto

Duas mudanças de nomenclatura relacionadas, trazidas pelo usuário em 28/08/2026 (ver memória `ideias_novas_ux_ia_28_08.md`), sob o mesmo nome "Orçamento" hoje usado em dois lugares diferentes do sistema:

- **`/orcamento`** (criado na Fase 4, ver `docs/superpowers/specs/2026-08-26-liquidez-ciclo-caixa-design.md`) — metas de valor previsto por categoria/mês, comparadas contra o realizado. É planejamento financeiro/administrativo.
- **O fluxo `RASCUNHO → ENVIADO → APROVADO/RECUSADO` de Vendas** (`app/src/app/(app)/vendas/`) — já usa a palavra "orçamento" na UI (botão "Enviar orçamento"), mas é uma proposta comercial pra um cliente específico, que vira uma venda de verdade quando aprovada.

Antes de qualquer pergunta de brainstorm, uma investigação de código (seguindo instrução explícita da memória do projeto) confirmou que o segundo já tem a máquina de estado certa — `aprovar_venda` (RPC) só cria o lançamento financeiro na aprovação — mas está estruturalmente incompleto como "orçamento pra cliente": o cliente nunca vê nem aprova nada (é sempre o staff clicando internamente), sem link público, sem validade, sem reenvio. Isso foi decisão consciente de escopo do spec original (`docs/superpowers/specs/2026-08-17-produtos-servicos-vendas-design.md`, linha 23: "Portal do cliente — cliente não vê nem aprova orçamento pelo portal neste ciclo"), não um esquecimento.

Esta spec resolve a ambiguidade de nome (parte A) e constrói a feature completa de orçamento comercial (parte B).

## 2. Parte A — Rename `/orcamento` para "Previsionamento"

Cobertura completa, não só a tela principal — todo canto do sistema que hoje fala "Orçamento" nesse sentido (planejamento por categoria/mês) muda junto, pra não sobrar inconsistência ("Previsionamento" no menu, "Orçado" no relatório que puxa o mesmo dado):

| Hoje | Depois |
|---|---|
| `/orcamento` | `/previsionamento` |
| `/configuracoes/orcamento` | `/configuracoes/previsionamento` |
| Item "Orçamento" na Sidebar | "Previsionamento" |
| `/relatorios/orcado-realizado` ("Orçado × Realizado") | `/relatorios/previsto-realizado` ("Previsto × Realizado") |

URLs mudam junto com os rótulos (não só o texto) — decisão do usuário: o sistema ainda não tem cliente pagante usando link salvo, o custo de quebrar bookmark é baixo agora, e a URL bate com o que a pessoa vê.

Identificadores internos (nomes de arquivo/função, ex. `lib/relatorios/orcamento.ts` se existir com esse nome) são renomeados por consistência de código durante a implementação — decisão de implementação, sem necessidade de validação com o usuário.

**Fora de escopo:** nenhuma mudança de dado, cálculo ou comportamento — é rename de rota/rótulo, ponto.

## 3. Parte B — Orçamento comercial (módulo Vendas)

### 3.1 Modelo de dados

Em `vendas`:

- `validade date null` — data-limite pro cliente aprovar/recusar. Nula em `RASCUNHO`; obrigatória a partir de `ENVIADO`.
- `token_publico text null unique` — string aleatória opaca (ex. `gen_random_uuid()::text` ou equivalente), gerada **só quando o orçamento é enviado pela primeira vez** (nunca existe pra um `RASCUNHO`) e mantida a mesma em reenvios subsequentes (edição pós-envio não troca o token — ver 3.4). Um token de rascunho vazado não seria possível porque ele simplesmente não existe até o envio.
- `motivo_recusa text null` — preenchido opcionalmente pelo cliente ao recusar.

Enum `status_venda` ganha um valor novo: `EXPIRADO`.

Migration segue o padrão já estabelecido no projeto (nova coluna nullable + `ALTER TYPE ... ADD VALUE` em migration própria, já que não dá pra usar um valor de enum recém-criado na mesma transação que o cria — mesmo cuidado já registrado em `docs/schema-aplicado-supabase.md` entrada 43).

### 3.2 Fluxo completo

1. **Criar** — igual hoje, nasce `RASCUNHO`, sem `validade`/`token_publico`.
2. **Enviar orçamento** (`enviarOrcamento()`, `vendas.ts`) — staff escolhe a validade (campo de data, com sugestão padrão de hoje+15 dias, editável). Ação:
   - Se a pessoa (cliente) não tiver e-mail cadastrado, a ação é bloqueada com uma mensagem clara pedindo pra cadastrar um e-mail antes de enviar — o e-mail automático é a única forma de notificação desta primeira versão (ver 3.3), então sem e-mail não há como avisar o cliente.
   - Gera `token_publico` (só na primeira vez), grava `validade`, muda status pra `ENVIADO`.
   - Dispara e-mail (ver 3.3) com o link público `/orcamento/[token]`.
3. **Cliente abre o link** (`/orcamento/[token]`, rota pública, sem login — ver 3.5) — vê os itens (produto/serviço, quantidade, preço unitário, subtotal), total, forma de pagamento/parcelas sugeridas, observações, data de emissão e validade. Se `status` não for mais `ENVIADO` (já aprovado, recusado ou expirado por outra via), mostra o estado atual em vez dos botões de ação — sem deixar agir de novo sobre uma proposta já resolvida.
4. **Cliente aprova** — chama a mesma `aprovarVenda()`/RPC `aprovar_venda` que o staff já usa hoje, através de uma Server Action pública dedicada. Cria o lançamento financeiro na hora, sem etapa extra de confirmação do staff (é a vontade do cliente que conta; o staff só acompanha depois). Mostra confirmação na página.
5. **Cliente recusa** — campo de motivo opcional (texto livre), grava `motivo_recusa`, muda status pra `RECUSADO`. Mostra confirmação.
6. **Staff edita um orçamento já `ENVIADO`** — itens continuam editáveis (mesmo formulário de hoje). Salvar:
   - Mantém o `token_publico` (o link do cliente continua o mesmo, sem confundir com um segundo link).
   - Reseta `validade` pro padrão sugerido de novo (hoje+15 dias) — proposta editada volta a valer o prazo cheio.
   - Dispara um novo e-mail, avisando que a proposta foi atualizada.
   - Só se aplica quando o status ainda é `ENVIADO` (editar um `RASCUNHO` não notifica nada, porque nunca foi enviado).
7. **Cron diário verifica validade** — mesmo padrão de `alertas-vencimento`/`gerar-recorrencias` (`docs/schema-aplicado-supabase.md` entradas 39/21): uma função `private.expirar_orcamentos_diario()` roda via `pg_cron`, faz `UPDATE vendas SET status = 'EXPIRADO' WHERE status = 'ENVIADO' AND validade < hoje`. Depois de expirado, o link do cliente ainda abre mas mostra "essa proposta expirou" em vez dos botões — com uma indicação pro staff, na tela interna da venda, de que pode reenviar (reenviar reusa o fluxo do passo 6: novo `validade`, mesmo token, novo e-mail).

### 3.3 Notificação por e-mail

Reaproveita a infraestrutura Brevo já usada pra convite de equipe e alertas de vencimento (`lib/email/transportador-brevo.ts`). Dois templates novos:

- **"Orçamento enviado"** — disparado no passo 2. Nome do cliente, nome da empresa (tenant), valor total, validade, link.
- **"Orçamento atualizado"** — disparado no passo 6. Mesmo formato, avisando que os valores/itens mudaram.

Falha no envio de e-mail não deve travar a transição de status (mesmo princípio já usado nos outros disparos de e-mail do sistema — o dado de negócio é gravado primeiro, e-mail é best-effort) — mas deve ficar registrada em log pro staff perceber se o cliente nunca recebeu.

### 3.4 Reenvio / edição pós-envio

Sem versionamento de verdade (sem histórico de "como a proposta era antes da edição N") — é a mesma decisão de simplicidade que o resto do módulo de Vendas já toma (edição in-place). O que muda em relação ao comportamento de hoje: editar um `ENVIADO` agora tem efeito colateral (reset de validade + e-mail), documentado no passo 6, em vez de ser silencioso.

### 3.5 Rota pública e segurança

Segue o mesmo padrão já estabelecido pela outra rota pública do sistema, `/assinar` (checkout de assinatura) — nunca abre RLS de `vendas`/`venda_itens` pra `anon` diretamente:

- `/orcamento/[token]` é uma página fora do grupo `(app)`, sem sessão exigida (mesmo padrão de `middleware.ts`, que já teria que listar essa rota como pública — ver `isPublicRoute` em `utils/supabase/middleware.ts`).
- A busca pelos dados usa o client administrativo (`createAdminClient()`, `service_role`) numa Server Action dedicada, que filtra por `token_publico = <token da URL>` e devolve **só os campos necessários pra exibir a proposta** — nunca a linha inteira de `vendas`, nunca dado de outro cliente, nunca dado de outra venda do mesmo tenant.
- Token opaco e aleatório (não é o `id` sequencial/UUID previsível de `vendas` — embora `vendas.id` já seja UUID, gerar um token dedicado mantém a superfície de exposição separada da chave primária interna, então trocar o mecanismo de token no futuro não exige mudar `id`).
- Aprovar/recusar público passam por rate limit — mesmo mecanismo (`tentativas_auth`, generalizado) criado nesta mesma sessão pra login/cadastro/recuperação de senha (`lib/seguranca/rate-limit-auth.ts`), nova `finalidade` própria (`"orcamento_publico"` ou equivalente) pra não competir com os limites de auth.

## 4. Fora de escopo (nesta leva)

- Geração de PDF da proposta — só a página web.
- Portal do cliente (login) como alternativa ao link — decisão explícita do usuário: link público sem login é o caminho único por ora.
- Histórico de versões de uma proposta editada.
- Reenvio manual fora do fluxo de edição (ex.: "reenviar o mesmo e-mail sem mudar nada") — se precisar, editar e salvar sem mudar itens já cumpre o mesmo papel (reseta validade, reenvia e-mail).
- Aprovação parcial de itens (cliente aprova só parte da proposta) — é tudo ou nada, mesmo padrão binário que Vendas já tem hoje.

## 5. Testes ao vivo (antes de considerar concluído)

- Criar orçamento → enviar (com validade padrão e customizada) → confirmar e-mail disparado.
- Abrir o link público numa aba sem sessão (nunca logada) → aprovar → confirmar lançamento em Contas a Receber, mesmo comportamento de `aprovar_venda` pelo staff.
- Mesmo fluxo até recusar, com e sem motivo.
- Editar um orçamento `ENVIADO` → confirmar validade resetada e novo e-mail disparado, mesmo token.
- Forçar expiração (validade no passado) → rodar o cron manualmente → confirmar status `EXPIRADO` e que o link mostra a mensagem de expirado, sem permitir aprovar/recusar.
- Tentar aprovar/recusar um token que já foi usado (proposta já `APROVADO`/`RECUSADO`) → confirmar que a segunda tentativa não duplica lançamento nem sobrescreve o motivo.
- Tentar "Enviar orçamento" pra um cliente sem e-mail cadastrado → confirmar bloqueio com mensagem clara.
