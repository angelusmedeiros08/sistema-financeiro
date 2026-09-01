# Ações em lote (Fatia 5 do dossiê UX)

## Contexto

Dossiê UX: "seleção múltipla + barra de ação contextual nas tabelas de listagem (despesas, contas a pagar/receber, vendas)". Investigação no código real mudou o escopo prático: `TabelaLista` (`components/tabela/tabela-lista.tsx`) é o motor único por trás de todas as listagens, mas o que cada uma pode fazer em lote depende do que já existe como ação seletiva de linha — e **despesas/receitas não têm nenhuma ação de exclusão** (decisão deliberada de arquitetura, documentada em `docs/schema-aplicado-supabase.md`: "nenhuma tabela tem policy de DELETE... qualquer exclusão real é operação privilegiada"). Cancelamento é uma operação de **parcela**, não de evento financeiro — só existe em Contas a Pagar/Receber.

## Escopo real

**Infraestrutura genérica em `TabelaLista`**: nova prop `selecao` (opcional) — quando presente, a tabela ganha uma coluna de checkbox (cabeçalho seleciona/desmarca a página atual — seleção é sempre por página, `paginacaoServidor` já significa que só a página atual está em memória, "selecionar tudo" através de todas as páginas exigiria outra arquitetura fora do escopo aqui) e uma barra de ação contextual fixa no rodapé quando `selecao.selecionados.size > 0`. A coluna de checkbox é tratada à parte do `linkPara` (que hoje envolve toda célula num `<Link>`) — o `<input>` recebe `stopPropagation` no clique, então funciona nas duas tabelas que usam `linkPara` (Despesas/Receitas/Vendas também usam, mas ver abaixo) sem quebrar a navegação por linha nas outras células.

**Ação real implementada**: **Contas a Pagar e Contas a Receber** — "Cancelar selecionadas" na barra contextual, habilitado só quando a seleção contém parcelas `PENDENTE`/`RENEGOCIADO` (mesmo domínio que a tela já filtra em "Em aberto"). Reaproveita `cancelarParcela` (já existe, já é a ação usada individualmente na tela de detalhe) chamada em sequência pra cada parcela selecionada — pede motivo uma vez só (modal simples), aplica a todas. Confirmação antes de executar (mesmo padrão de qualquer ação destrutiva no sistema).

## Fora de escopo (e por quê)

- **Despesas/Receitas**: não têm ação de lote nesta fatia — não existe nenhuma ação segura de exclusão/estado em lote pra evento financeiro na listagem (a única operação parecida, estornar, já teve o achado nesta sessão de que precisa de cuidado individual — motivo, confirmação, trava de já-estornado — replicar isso em lote é uma fatia própria, não uma extensão barata desta).
- **Vendas**: "recusar em lote" só se aplicaria a vendas `RASCUNHO` (caso mais raro que contas a pagar/receber pendentes) — fica como próximo passo natural, não construído agora, pra manter esta fatia entregável dentro do ciclo maior de 8 fatias ainda por fazer.
- Seleção que atravessa páginas (todas as N mil parcelas de um filtro, não só a página atual) — YAGNI, ninguém pediu isso e o volume típico de "Em aberto" cabe em poucas páginas.
