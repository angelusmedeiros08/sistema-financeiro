# Fluxo de Caixa e Orçamento como módulos do menu, Contas Financeiras com "a receber" prospectivo

## 1. Contexto

Pedido literal de um dos sócios: "Colocar no menu: Previsto x Realizado / Orçamentos / Uma aba no inicial de contas financeiras com o saldo, a receber diário e mensal x a pagar (vencidos e vencem hoje) / Fluxo de caixa".

Levantamento do estado atual encontrou:
- "Previsto × Realizado" já existe como aba dentro de `/relatorios/fluxo-caixa` — o pedido é sobre visibilidade no menu, não sobre a funcionalidade em si.
- Orçamento (cadastro de meta + Orçado×Realizado, ambos entregues no ciclo anterior) está **implementado mas ausente do menu lateral** — bug real: o `sidebar.tsx` tem suas próprias listas de drill-down (`SUB_ITENS_RELATORIOS`/`SUB_ITENS_CONFIGURACOES`) que não foram atualizadas junto com os sub-navs internos das páginas. `Ponto de Equilíbrio` tem o mesmo problema.
- Configurações → Contas Financeiras → Visão geral já mostra saldo total e "a pagar vencido/vence hoje", mas **não mostra nada de "a receber" além do vencido** — falta o total prospectivo (hoje e no mês) que o sócio pediu.

Decisões de escopo validadas com o usuário (incluindo 2 mockups de estrutura de menu no companion de brainstorming): Fluxo de Caixa e Orçamento sobem a nível de primeiro item do menu, cada um como link direto (sem drill-down, já que só têm 2 sub-visualizações cada — mesmo padrão de abas internas já usado em DRE); módulo de Orçamento unifica cadastro de meta e Orçado×Realizado numa página só; o novo "a receber" em Contas Financeiras é assimétrico em relação a "a pagar" (planejamento de entrada vs. cobrança do que já venceu).

## 2. Escopo

**Dentro:**
- Reordenar `ITENS_NAV` do sidebar: novos itens `Fluxo de caixa` e `Orçamento`, flat, entre Fornecedores e Relatórios.
- Corrigir `SUB_ITENS_RELATORIOS`: adicionar `Ponto de equilíbrio` (bug do ciclo anterior); remover `Fluxo de caixa` (agora top-level).
- Corrigir `SUB_ITENS_CONFIGURACOES`: remover `Orçamento` (unificado no novo módulo top-level).
- Mover `/relatorios/fluxo-caixa` → `/fluxo-caixa` (mesmo conteúdo/abas). Redirect da rota antiga.
- Nova página `/orcamento` com abas `Cadastro de meta` / `Orçado × Realizado`, absorvendo o conteúdo de `/configuracoes/orcamento` e `/relatorios/orcado-realizado`. Redirect das duas rotas antigas.
- `ResumoVencimentos` (`lib/relatorios/aging.ts`) ganha `venceEsteMesTotal`/`venceEsteMesQuantidade`, calculado do mesmo dataset já buscado (sem query nova) — parcela com `data_vencimento` entre amanhã e o fim do mês corrente.
- `VisaoGeralContasFinanceiras`: card "A receber" ganha linha de detalhe "Vence este mês: R$X" além do Vencido/Vence hoje que já existe. Card "A pagar" não muda.

**Fora:** drill-down de sidebar pros dois módulos novos (2 sub-visualizações não justificam o padrão, viram abas internas); alerta/notificação de vencimento (já adiado em ciclo anterior); mudar o Painel (o pedido do sócio é especificamente sobre o menu e sobre Contas Financeiras).

## 3. Sidebar — ordem final

Painel, Receitas, Despesas, Contas a receber, Contas a pagar, Clientes, Fornecedores, **Fluxo de caixa**, **Orçamento**, Relatórios ›, Configurações ›.

## 4. Testes

- Navegar pelo menu: `/fluxo-caixa` e `/orcamento` abrem direto (sem passo de drill-down); `Relatórios ›` mostra Ponto de equilíbrio na lista; `Configurações ›` não mostra mais Orçamento.
- Redirects: `/relatorios/fluxo-caixa`, `/configuracoes/orcamento` e `/relatorios/orcado-realizado` continuam funcionando (chegam no lugar novo).
- `/orcamento`: as duas abas (cadastro/comparativo) preservam exatamente o comportamento já testado no ciclo anterior (autosave por célula, copiar pro resto do ano, comparação com desvio%).
- Contas Financeiras → Visão geral: "Vence este mês" bate com a soma manual de 2-3 parcelas de teste com vencimento depois de hoje mas dentro do mês corrente; card "A pagar" continua idêntico ao que já existia.
- Regressão: nenhuma página existente perde link — sub-navs de Relatórios/Configurações continuam corretos pros itens que não saíram de lá.
