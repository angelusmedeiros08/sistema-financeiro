# Plano de Contas e Categorias — telas de gestão

## 1. Contexto

O sistema já tem um plano de contas contábil real por trás do ledger de partida dobrada (`contas_contabeis`, com `conta_pai_id` pra hierarquia, `tipo`/`natureza`, usado em toda partida) — mas só 9 contas fixas são criadas no signup, sem hierarquia populada, e **nenhuma tela** existe pra ver/editar isso. `categorias_financeiras` (o que o usuário realmente usa no dia a dia, ex. "Aluguel") tem o mesmo problema, agravado: só as 2 categorias genéricas do signup existem, e **não há nenhum jeito de criar uma categoria nova pelo app** — nem tela dedicada, nem criação rápida inline (diferente de Centro de Custo, que já tem os dois). Isso é um gap real de uso, não só uma lacuna de visualização.

Pesquisa de mercado (Conta Azul, Omie, Nibo, padrão CFC/SPED) confirma: Categoria (operacional, editável) e Plano de Contas (contábil formal) são conceitos deliberadamente separados em todo sistema pesquisado. A Nibo usa árvore/tabela indentada de categorias com subcategoria; validado com mockup real que tabela indentada (sempre tudo visível) é preferível à árvore recolhível pra esse volume de contas (~22-30).

Decisões de escopo validadas com o usuário: este ciclo expande o template padrão do plano de contas (não só constrói a tela sobre as 9 contas atuais); cria a conta de passivo "Valores de Terceiros em Trânsito" agora, como base pro ciclo futuro de custas processuais adiantadas (achado da pesquisa de concorrentes); adiciona campo `codigo_referencial_sped` nullable na tabela, sem UI de exportação ainda.

## 2. Escopo

**Dentro:**
- Expandir o template padrão de `contas_contabeis` de 9 para ~22 contas, 3 níveis (Grupo → Subgrupo → Conta), incluindo a nova conta de passivo.
- `contas_contabeis` ganha `codigo_referencial_sped text null` (sem UI de exportação).
- Nova página Configurações → Plano de Contas: tabela indentada por hierarquia, criar/editar conta (contas `sistema: true` têm nome/tipo/natureza travados, mas aparecem normalmente).
- Nova página Configurações → Categorias: 2 seções (Receitas/Despesas), suporte a subcategoria via `categoria_pai_id` (já existe no schema, nunca exposto), campo de conta contábil obrigatório (dropdown filtrado por tipo compatível, default = conta genérica "Operacionais"), `eh_custo_fixo` só pra despesa.
- Criação rápida inline de categoria no formulário de Despesa/Receita — mesmo padrão de `resolverCentroCustoIdSimples`, conta contábil default automática.
- Sub-nav de Configurações: `Categorias` e `Plano de Contas` entram no início da lista.

**Fora:** exportação SPED/ECD em si (só o campo, sem funcionalidade); alerta/regra de negócio nova em cima da conta de Valores de Terceiros em Trânsito (só a conta existe, a feature de conta corrente de custas processuais fica pra ciclo futuro); Patrimônio Líquido (tipo já existe no enum, mas nada no ledger produz esse tipo de partida hoje — fora de escopo até existir necessidade real); soft-disable de categoria (não existe coluna `ativo`, não inventar agora).

## 3. Template expandido de `contas_contabeis`

| Código | Nome | Tipo | Natureza | Sistema |
|---|---|---|---|---|
| 1 | Ativo | ATIVO | DEVEDORA | não (grupo) |
| 1.1 | Ativo Circulante | ATIVO | DEVEDORA | não (grupo) |
| 1.1.1 | Caixa e Bancos | ATIVO | DEVEDORA | sim |
| 1.1.2 | Contas a Receber | ATIVO | DEVEDORA | sim |
| 2 | Passivo | PASSIVO | CREDORA | não (grupo) |
| 2.1 | Passivo Circulante | PASSIVO | CREDORA | não (grupo) |
| 2.1.1 | Contas a Pagar | PASSIVO | CREDORA | sim |
| 2.1.2 | Valores de Terceiros em Trânsito | PASSIVO | CREDORA | não |
| 3 | Receita | RECEITA | CREDORA | não (grupo) |
| 3.1 | Receitas Operacionais | RECEITA | CREDORA | sim |
| 3.2 | Receitas Financeiras | RECEITA | CREDORA | sim |
| 3.3 | Descontos Obtidos | RECEITA | CREDORA | sim |
| 4 | Despesa | DESPESA | DEVEDORA | não (grupo) |
| 4.1 | Despesas Operacionais | DESPESA | DEVEDORA | sim |
| 4.2 | Despesas Financeiras | DESPESA | DEVEDORA | sim |
| 4.3 | Descontos Concedidos | DESPESA | DEVEDORA | sim |

Contas "sistema" são as mesmas 7 folhas já referenciadas por código em `plano-padrao.ts` (`CODIGO_CAIXA_E_BANCOS` etc.) — só ganham pai (grupo/subgrupo) e, no caso das duas novas (Contas a Receber/Pagar já existiam, mas agora com subgrupo pai), continuam com o mesmo código raiz. Grupos e subgrupos (1, 1.1, 2, 2.1, 3, 4) são contas "totalizadoras" — não recebem partida diretamente (nenhum código de grupo é usado em `criarEventoFinanceiro`), só existem pra hierarquia/visualização.

## 4. Migration de dados dos 3 tenants de teste

Backfill segue o mesmo padrão já usado nas migrations `032`/`036`/`037`: idempotente, insere os grupos/subgrupos novos, reatribui `conta_pai_id` das 9 contas existentes pro subgrupo certo, sem alterar `id`/`codigo` das contas já referenciadas por código nem tocar em nenhuma partida já lançada (imutáveis por trigger).

## 5. Testes

- `obterSaldoEmCaixa`/`criarEventoFinanceiro` continuam achando as contas por código depois do backfill (nenhum código raiz muda).
- Categoria nova (tela e inline) grava com conta contábil default; lançamento nela gera partida balanceada correta.
- Subcategoria aparece indentada sob a categoria pai nas telas que já existem (DRE, Orçamento, Análise de despesas) sem quebrar a agregação por categoria.
- Conta `sistema: true` não deixa editar nome/tipo/natureza pela UI; conta comum deixa.
- Regressão: as 3 categorias de teste (`Receita Geral`, `Despesa Geral`, e as que já existem via seed) continuam com dado histórico intacto.
