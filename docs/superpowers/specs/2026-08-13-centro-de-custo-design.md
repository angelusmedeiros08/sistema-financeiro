# Design — Centro de custo

## 1. Contexto

Segundo dos quatro ciclos de aprofundamento da Fase 1 (o primeiro, rateio multi-categoria, já foi commitado). Centro de custo é uma das duas dimensões que ficaram deliberadamente fora daquele ciclo — hoje não existe em nenhuma tela: sem cadastro, sem campo no formulário, sem uso em lugar nenhum, apesar de `centros_custo` e `rateio_centro_custo` existirem desde a migration `004_camada_dominio`.

O Conta Azul mostra o padrão de referência (`mapeamento-conta-azul-produto-ui.md` seção 2 e 3): centro de custo nasce vazio (usuário cadastra o seu, tela própria com Código | Nome | Situação), aparece ao lado de Categoria no formulário de lançamento, e — quando o rateio entre categorias está ligado — cada linha de categoria pode ainda se dividir entre centros de custo via um botão "Rateio de centro de custo" por linha (rateio aninhado). Esta rodada fecha o padrão inteiro de uma vez, não uma versão reduzida — decisão explícita, seguindo a mesma lógica de "não simplificar além do necessário" da rodada anterior.

**Achado importante**: centro de custo não tem nenhum efeito contábil — é uma dimensão de relatório (base pra "P&L por centro de custo" que a planilha de referência já mapeia, mas isso é Fase 3), não uma conta contábil. Nenhuma partida nova é criada por causa dele.

## 2. Escopo desta fase

**Dentro do escopo:**
- CRUD mínimo de centro de custo: criar, listar (com filtro Ativos/Inativos/Todos), ativar/desativar. Sem exclusão.
- Nova seção `/configuracoes/centros-custo` — ativa a sidebar "Configurações" (hoje "em breve"), com centro de custo como primeira (e por enquanto única) seção.
- Campo "Centro de custo" no formulário de lançamento, ao lado de "Categoria", opcional — só aparece se o tenant tiver ao menos 1 centro de custo cadastrado.
- Rateio aninhado de verdade: quando o rateio de categoria está ativo, cada linha pode opcionalmente se dividir entre N centros de custo, com a mesma mecânica de soma/diferença R$ já usada no rateio de categoria, um nível mais fundo.

**Fora do escopo:**
- Qualquer relatório que use centro de custo (P&L por centro de custo, etc.) — Fase 3.
- Edição de centro de custo já usado num rateio existente (segue a mesma regra geral do sistema: nada de lançamento se edita depois de criado).
- Os outros dois ciclos de aprofundamento da Fase 1 (ciclo de vida da parcela, recorrência+anexo, transferência entre contas+parcelamento avançado).

## 3. Modelo de dados

Nenhuma tabela nova. Um trigger novo, mesmo padrão dos anteriores:

### 3.1 Soma do rateio de centro de custo por linha de categoria

```sql
-- para qualquer rateio_categoria_id que tenha >=1 linha em rateio_centro_custo,
-- a soma dessas linhas precisa bater exatamente com o valor daquela linha de categoria
select sum(valor) from rateio_centro_custo where rateio_categoria_id = :id
-- deve bater com rateio_categoria.valor (não com o valor_total do evento)
```

Constraint trigger *deferred*, `AFTER INSERT OR UPDATE OR DELETE ON rateio_centro_custo`, agrupando por `rateio_categoria_id` — mesmo padrão de `checar_soma_rateio_categoria` e `checar_partidas_balanceadas`. Se uma linha de categoria não tiver nenhuma linha de centro de custo, o trigger nunca dispara pra ela (centro de custo é opcional por linha).

## 4. CRUD de centro de custo

Página `/configuracoes/centros-custo`: tabela (Código | Nome | Situação) com filtro Ativos/Inativos/Todos, formulário de criação (Nome obrigatório, Código opcional — mesmo padrão de campos livres já usado em `contas_financeiras`), e um toggle de ativar/desativar por linha (sem exclusão — desativar não quebra nenhum rateio histórico que já referencia o centro).

`/configuracoes` (a rota base) redireciona direto pra `/configuracoes/centros-custo` — é a única seção real por enquanto; quando outro cadastro precisar de tela própria (plano de contas, contas financeiras), ganha `/configuracoes/<secao>` do mesmo jeito, e `/configuracoes` vira um índice de verdade.

Sidebar: item "Configurações" deixa de ser `disponivel: false`.

## 5. Formulário de lançamento

### 5.1 Modo simples (rateio de categoria desligado)

"Categoria" e "Centro de custo" lado a lado — select opcional, populado só com centros `ativo = true` do tenant. Se o tenant não tem nenhum centro de custo cadastrado, o campo inteiro não renderiza (evita mostrar um select permanentemente vazio pra quem não usa a feature).

### 5.2 Modo rateio de categoria (dentro do `RateioCategorias`)

Cada linha de categoria ganha, opcionalmente, um centro de custo — mesma lógica em miniatura do nível de cima:
- Por padrão, um select único de centro de custo na própria linha (se o tenant tiver centros cadastrados).
- Um link "Dividir centro de custo" nessa linha troca o select único por uma sub-tabela (Centro de Custo | R$), com a mesma mecânica de sincronização e indicador de diferença já usada no nível de categoria — só que a soma alvo é o valor **daquela linha de categoria**, não o total do evento.

### 5.3 Serialização

O formato de cada linha dentro do `rateio_json` já existente ganha um campo opcional:
```json
{ "categoria_id": "...", "valor": 600.00, "centro_custo_id": "..." }
```
ou, se dividido:
```json
{ "categoria_id": "...", "valor": 600.00, "centros_custo": [{ "centro_custo_id": "...", "valor": 400.00 }, { "centro_custo_id": "...", "valor": 200.00 }] }
```
Nenhum campo novo no formulário fora do `rateio_json` — mesmo canal de sempre, formato mais rico.

## 6. Servidor

`criarEventoFinanceiro()` ganha um passo depois de inserir as linhas de `rateio_categoria`: para cada linha que trouxe `centro_custo_id` (único) ou `centros_custo[]` (dividido), revalida cada `centro_custo_id` contra o tenant (nunca confia no cliente, mesmo princípio de sempre) e insere as linhas correspondentes em `rateio_centro_custo`. **Nenhuma mudança nas partidas do lançamento** — centro de custo não participa do débito/crédito.

No modo simples (sem rateio de categoria), o mesmo caminho se aplica à única linha implícita de categoria que já existe hoje.

## 7. Segurança

Mesmo padrão: RLS + revalidação server-side de cada `centro_custo_id` contra o tenant são a garantia real. O trigger deferred no banco garante a soma independente de qual caminho de código tentou inserir.

## 8. Testes

- Trigger via `DO` block: soma de centro de custo por linha de categoria correta passa; incorreta é rejeitada; linha de categoria sem centro de custo nenhum não dispara o trigger.
- Fluxo real ponta a ponta: despesa de R$1.000 rateada em 2 categorias (600/400), cada uma dividida em 2 centros de custo — confere 4 linhas em `rateio_centro_custo` e confirma que o ledger continua com as mesmas 3 partidas do rateio de categoria (nenhuma partida extra).
- CRUD: criar centro de custo → aparece como opção em um lançamento novo → desativar → some das opções de lançamentos novos, mas o rateio já feito com ele continua íntegro e visível.
- Regressão: tenant sem nenhum centro de custo cadastrado não vê o campo em lugar nenhum, formulário funciona exatamente como hoje.

## 9. Riscos e decisões em aberto

- **Profundidade da UI aninhada**: dois níveis de "dividir" (categoria → centro de custo) é mais complexo de testar manualmente do que os ciclos anteriores — vale um cuidado extra na verificação em navegador antes de considerar fechado.

## 10. Fora de escopo desta fase, explicitamente

Relatórios por centro de custo (Fase 3), edição pós-criação, os outros dois ciclos de aprofundamento da Fase 1 (ciclo de vida da parcela, recorrência+anexo, transferência entre contas+parcelamento avançado), Fase 2 (portal do cliente) e Fase 3 (BI avançado).
