# Cadastros: agrupar categorias por tipo e decidir Despesa/Receita sem abrir combobox

## Contexto

Testando ao vivo em produção com uma planilha real de 100 linhas, a seção "Categorias" da etapa Cadastros mostrou 22 valores únicos — receita e despesa misturados numa lista só, em cascata, sem nenhuma separação visual. O operador precisa ler cada nome pra descobrir se é receita ou despesa antes de decidir o que fazer com ele. Pra categoria genuinamente nova (sem correspondência), a decisão de tipo (Despesa/Receita) hoje exige abrir o combobox de busca — útil quando a correspondência automática pode ter errado, mas pesado demais pro caso comum (categoria claramente nova, só falta dizer o tipo).

Este design cobre a correção imediata (agrupamento visual + decisão sem abrir lista). A ideia maior de eliminar a pergunta na origem, quando a própria planilha já traz o sinal (valor negativo ou uma coluna de tipo), fica registrada como uma fatia futura separada — não faz parte deste design.

## Agrupamento por tipo

A seção "Categorias" (só ela — Centro de custo e Forma de pagamento não têm essa ambiguidade de tipo) passa a renderizar 3 grupos, nessa ordem:

1. **Novas — defina o tipo**: correspondência "nenhuma". É o grupo que mais exige atenção, fica primeiro.
2. **Despesa**: correspondência exata ou aproximada apontando pra uma categoria existente com `tipo = DESPESA` (já disponível em `entidadesExistentes.categorias`, que já traz `tipo` junto — nenhuma query nova).
3. **Receita**: mesma coisa, `tipo = RECEITA`.

Cada grupo tem seu próprio mini-cabeçalho ("Novas — defina o tipo (8)", "Despesa (6)", "Receita (3)"). Os botões de lote existentes ("Aceitar sugestões"/"Criar N novos") continuam no topo da seção inteira, operando em todos os grupos de uma vez — não duplicam por grupo. Um item não muda de grupo em tempo real depois de decidido (evita a lista "pular" embaixo do cursor enquanto o operador rola) — ele só marca visualmente como resolvido onde já está.

## Categoria nova: decidir sem abrir combobox

Só no grupo "Novas — defina o tipo", a linha troca o `ComboboxEntidade` por um controle compacto:

- Nome do valor original da planilha (igual a hoje).
- Toggle de 2 botões selados, "Despesa" / "Receita" — clique direto já cria a categoria com esse tipo (mesmo resultado de 1 clique que "Criar nova categoria de Despesa" no combobox de hoje, só que sem precisar abrir nada).
- Link em texto por extenso, **"Buscar cadastro existente"**, sempre visível ao lado — nunca escondido atrás de um ícone sozinho, porque cobre um caso real e não raro: a planilha trouxe "Honorários de Clientes" e o fuzzy match não bateu com "Honorários Contratuais" já cadastrado (nomes parecidos, mas abaixo do limiar de similaridade) — o operador reconhece que é a mesma coisa e quer vincular ao cadastro existente em vez de criar um duplicado. Clicar troca a linha pro `ComboboxEntidade` de busca completo (mesmo componente de sempre, com toda a lista de categorias existentes pra filtrar), com um link "Criar nova" pra voltar ao estado de 2 botões se o operador mudar de ideia.

Nos grupos "Despesa" e "Receita" (correspondência já resolvida), nada muda — continuam com o `ComboboxEntidade` de hoje, badge de correspondência e tudo.

## Escopo

Só `passo-entidades.tsx` muda: a função `LinhaEntidade` ganha um modo alternativo pro grupo "sem correspondência" da seção categoria (as outras 3 seções — centro de custo, forma de pagamento, e a função `LinhaEntidadePessoa` — ficam exatamente como estão). Sem migration, sem mudança de lógica de correspondência (`fuzzy.ts`) ou de `ACOES_CRIAR_POR_TIPO` (a ação de criar categoria com tipo já existe, só muda como ela é disparada nesse grupo específico).

## Teste

Planilha com categorias novas + categorias já cadastradas de ambos os tipos: confirma que os 3 grupos aparecem na ordem certa com as contagens certas; clicar "Despesa"/"Receita" numa categoria nova cria com o tipo certo sem abrir nenhum combobox; clicar "Buscar cadastro existente" troca pro combobox de busca e permite vincular a um cadastro já existente em vez de criar novo; "Criar nova" volta pro estado de 2 botões.
