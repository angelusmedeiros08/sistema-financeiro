# Busca de dados (Fatia 4 do dossiê UX)

## Contexto

Dossiê UX: "evoluir o Ctrl+K de 'só telas' pra buscar cliente/lançamento/venda por nome — a lacuna mais citada em todo o benchmark". `CommandPaletteBusca` (`components/layout/command-palette-busca.tsx`) hoje só filtra `TODOS_ITENS_FOLHA` (lista estática de rotas do sidebar), sem tocar nenhuma tabela.

## Design

Nova server action `buscarGlobal(termo)` (`lib/busca/busca-global.ts`) — busca em paralelo (`Promise.all`) em 3 tabelas, tenant-scoped, `ILIKE '%termo%'`, limite de 5 por categoria:

- **pessoas** (nome) → `/clientes/[id]` ou `/fornecedores/[id]`, decidido pelo array `perfis` (CLIENTE tem prioridade se a pessoa tiver os dois papéis).
- **eventos_financeiros** (descrição, excluindo estornados) → `/receitas/[id]` ou `/despesas/[id]`, decidido por `tipo`.
- **vendas**: só por número exato (`numero.eq`), quando o termo é puramente numérico — buscar por nome do cliente exigiria filtrar por uma coluna de recurso aninhado (`pessoas.nome`) dentro de um `.or()`, que o PostgREST não suporta de forma confiável no mesmo nível da tabela principal. Achar uma venda pelo nome do cliente continua possível indiretamente: a busca de pessoas já leva ao cadastro do cliente, que lista as vendas dele.

Componente: debounce de 250ms (mesmo atraso do resto do sistema de loading) aplicado na origem — a busca só dispara depois da pausa de digitação, não a cada tecla. Resultados agrupados por categoria (Clientes/Fornecedores/Lançamentos/Vendas) acima do grupo "Telas" já existente, cada item com ícone por categoria e subtítulo (tipo/valor). Mínimo de 2 caracteres pra evitar buscas de 1 letra retornando ruído.

## Fora de escopo

- Busca por número de documento (CPF/CNPJ) — nome já cobre o caso de uso citado no benchmark.
- Busca por venda via nome do cliente (ver justificativa técnica acima) — limitação aceita, não um bug.
- Histórico de buscas recentes / atalhos aprendidos — YAGNI pra esta fatia.
