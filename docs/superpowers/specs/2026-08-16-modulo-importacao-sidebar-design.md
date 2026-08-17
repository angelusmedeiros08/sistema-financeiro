# Módulo "Importação" na sidebar

## Contexto

O sistema já tem dois wizards de importação por planilha, implementados e commitados:

- **Lançamentos financeiros** — `/configuracoes/importar-planilha` (spec: `2026-08-16-importacao-de-planilha-design.md`)
- **Clientes/Fornecedores** — `/configuracoes/importar-pessoas` (spec: `2026-08-16-importacao-de-clientes-fornecedores-design.md`)

Os dois vivem escondidos dentro de Configurações. Durante o brainstorm do import de Clientes/Fornecedores, já tinha surgido a dúvida se não fazia mais sentido um lugar próprio na sidebar — na época a decisão foi adiar pra uma etapa futura dedicada de polimento de navegação.

O motivo pra reabrir agora: um método de importação assistida por IA está no radar como próximo passo do produto. Ele não pertence a nenhum módulo de destino específico (não é "de lançamentos" nem "de pessoas" — pode virar qualquer um dos dois, ou os dois ao mesmo tempo). Um hub central de Importação dá um lugar natural pra ele nascer, e já organiza os dois métodos existentes.

Confirmei via pesquisa (artigos oficiais de ajuda da Conta Azul) que a Conta Azul **não centraliza**: cada import vive dentro do módulo de destino (Produtos/Serviços > Cadastros > Clientes > Importar; Compras > Cadastros > Fornecedores > Importar; Financeiro > Extrato de Movimentações > Importar). A decisão de centralizar aqui é deliberada, motivada pelo cenário de IA que a Conta Azul não tem — não é cópia de um padrão de mercado.

## Escopo

**Dentro do escopo:**
- Item de topo "Importação" na sidebar, entre os itens de módulo existentes
- Tela hub em `/importacao` com cards pros métodos disponíveis
- Mover os dois wizards existentes de `/configuracoes/importar-planilha` e `/configuracoes/importar-pessoas` para `/importacao/planilha` e `/importacao/pessoas` — sem alterar nada da lógica interna de nenhum dos dois
- Redirects nas URLs antigas, preservando querystring
- Remover as duas entradas do sub-nav de Configurações
- Atualizar os CTAs (`CtaImportarPlanilha`, `CtaImportarPessoas`) pras novas URLs
- Cards "em breve" pra Produtos e "Importar com IA" (sem nenhuma lógica funcional — só o registro visual do que vem a seguir)

**Fora do escopo:**
- Qualquer implementação do método de importação por IA (ideia registrada, não especificada)
- Import de Produtos (módulo de Produtos não existe ainda)
- Mudança de comportamento interno dos wizards de planilha (parsing, validação, correspondência) — só reposicionamento de rota

## Estrutura de navegação

O item "Importação" na sidebar é um link direto (sem sub-itens expansíveis, diferente de Relatórios/Configurações) — aponta direto pra `/importacao`, porque a lista de opções já é o conteúdo da própria tela hub, não outro nível de sub-navegação. Ícone `UploadSimple` (phosphor-icons), posicionado depois de Indicadores e antes de Configurações em `ITENS_NAV`.

## Tela hub (`/importacao`)

Grid de cards, cada um com título, descrição curta e ação:

| Card | Estado | Ação |
|---|---|---|
| Lançamentos financeiros | ativo | → `/importacao/planilha` |
| Clientes/Fornecedores | ativo | → `/importacao/pessoas` |
| Produtos | em breve | desabilitado |
| Importar com IA | em breve | desabilitado |

Cards "em breve" seguem o mesmo padrão visual já usado na sidebar pra itens indisponíveis (badge "em breve", visual apagado) — não é um componente novo, é reaproveitar a linguagem visual existente.

## Rotas e redirects

Os dois wizards são movidos fisicamente (diretório inteiro: `page.tsx`, `wizard.tsx`, `actions.ts`, `passo-*.tsx`) para dentro de `app/src/app/(app)/importacao/`. Import relativo pro sub-nav de Configurações (`../sub-nav`) é removido — as páginas movidas não fazem mais parte da seção Configurações, então não mostram mais `<ConfiguracoesSubNav />`. Em vez disso, cada uma ganha um link simples "← Importação" no topo, pra orientação de volta ao hub (mesmo papel que o sub-nav cumpria, sem reintroduzir a lista inteira de Configurações).

As rotas antigas (`/configuracoes/importar-planilha`, `/configuracoes/importar-pessoas`) viram páginas de redirect puro, no mesmo padrão já usado quando Fluxo de Caixa subiu a top-level (`redirect()` preservando querystring) — protege link salvo ou aba aberta de sessão anterior.

## Componentes afetados

- `app/src/components/lancamentos/cta-importar.tsx` — href atualizado pra `/importacao/planilha`
- `app/src/components/pessoas/cta-importar-pessoas.tsx` — href atualizado pra `/importacao/pessoas`
- `app/src/app/(app)/configuracoes/sub-nav.tsx` — remove as duas entradas de import
- `app/src/components/layout/sidebar.tsx` — novo item `ITENS_NAV`

## Testes

- Navegar pelo item novo da sidebar até o hub, confirmar os dois cards ativos e os dois "em breve"
- Completar um import de planilha financeira a partir do hub, confirmar que nada quebrou no wizard em si
- Completar um import de pessoas a partir do hub, mesma confirmação
- Acessar as URLs antigas diretamente e confirmar o redirect (com e sem querystring)
- Confirmar que os CTAs nas telas vazias (Receitas/Despesas/Painel/Clientes/Fornecedores) apontam pras novas URLs
- Confirmar que Configurações não mostra mais as duas entradas de import
