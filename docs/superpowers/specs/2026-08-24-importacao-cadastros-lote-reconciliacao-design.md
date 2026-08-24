# Importação: ações em lote na etapa Cadastros e reconciliação de linhas

## Contexto

Fatia 3 de 4 da revisão do módulo de Importação (Fatias 1 e 2 já concluídas). Duas queixas do pedido original do usuário, verificadas contra o código real: "62 clientes/fornecedores exigem conferência individual" (etapa Cadastros sem ação em lote) e "não pode sumir linha sem saber por quê" (sem reconciliação visível). Investigando a segunda, achei um bug real, não só uma lacuna de UX.

## Achado: perda silenciosa em `passo-preview.tsx`

A etapa de Revisão mostra "X prontas" (`prontas.length`, linha ~100), mas `importar()` (linha ~104-119) monta o array final que de fato vai pro banco com um `continue` silencioso: `if (!categoriaId || !categoria || l.valorNumero === null || l.dataCompetenciaIso === null) continue;`. Uma linha pode estar contada em "prontas" e ainda assim não entrar na importação, sem nenhum aviso — o número que o usuário vê na tela não é garantidamente o número que chega no banco. É defensivo (não deveria disparar em uso normal, já que `status !== "erro"` deveria implicar que esses campos resolveram), mas exatamente por ser inesperado é o tipo de coisa que precisa aparecer, não desaparecer.

**Correção**: o `continue` vira uma coleta `puladasNoFinal: { linha: LinhaValidada; motivo: string }[]`. Se não-vazio, a tela mostra um aviso explícito antes de prosseguir (mesmo padrão visual da lista de "com erro" já existente) — nunca um número que engana silenciosamente.

## Reconciliação de contagem, ponta a ponta

Contador visível desde a etapa 2 (Colunas) até a 5 (Importação), carregando `linhasBrutas.length` (linhas encontradas no arquivo original) como referência fixa. Na Revisão, ao lado de "X prontas / Y com erro", mostra "Z linhas no arquivo" — se `prontas + comErro + descartadasPorValidacao !== Z`, motivo explícito. No resultado final, junta com o que já existe (sucessos/falhas) numa única linha de reconciliação: "62 na planilha → 60 prontas, 2 com erro → 60 importados, 0 perdidos silenciosamente".

## Ações em lote na etapa Cadastros

Dois botões por seção (Categorias, Centros de custo, Formas de pagamento, Clientes/Fornecedores):

- **"Aceitar sugestões"** — aplica `usar_existente` a todo valor cuja correspondência já é de candidato único e não-ambíguo: `tipoCorrespondencia === "aproximada"` nas 3 seções genéricas (o tipo `CorrespondenciaEntidade` já carrega `correspondenciaId` singular, nunca lista — é estruturalmente candidato único); para pessoa, só `tipo === "aproximada" && candidatos.length === 1` (mais restrito de propósito — `candidatosPorSimilaridade` pode teoricamente devolver mais de um nome acima do limiar 0.85, e nesse caso continua exigindo escolha manual, mesma regra de nunca decidir em ambiguidade).
- **"Criar todos os novos"** — aplica `criar_novo` a todo valor com `tipoCorrespondencia === "nenhuma"` (genéricas) ou `tipo === "nenhuma"` (pessoa). Categoria continua pedindo o seletor Receita/Despesa por linha depois — não dá pra inferir isso em lote, então o botão avança o resto e deixa só essa escolha residual.
- **Deliberadamente fora do lote**: `exata_nome` (nome bate mas é o "buraco original" da spec de homônimos — nunca decide sozinho, nem em lote), `documento_conflito`, `exata_documento` com múltiplos candidatos, `fraca`. Nenhum desses é elegível a ação em lote — continuam exigindo decisão linha a linha, porque são exatamente os casos onde decidir errado tem custo real (duplicar cadastro ou juntar duas pessoas diferentes).
- Já existente e sem mudança: correspondência `exata` (genéricas) e `exata_documento` com 1 candidato (pessoa) já vêm pré-selecionadas ao montar a tela — os botões de lote não duplicam isso, só cobrem o que hoje exige clique manual.

## Reexame do pedido "não repetir confirmação" (item 4 do ChatGPT)

Já resolvido no wizard financeiro (correspondência de pessoa agrupada por valor único desde antes desta fatia). No wizard de Clientes/Fornecedores **não se aplica da mesma forma**: cada linha da planilha é uma pessoa a criar/atualizar, não uma referência a resolver — duas linhas com o mesmo nome são dado duplicado (já corretamente sinalizado como erro), não "a mesma pergunta repetida". Nenhuma mudança nesse wizard nesta fatia.

## Testes

- Botão "Aceitar sugestões" em Categorias com 3 valores "aproximada" e 1 "nenhuma" → só os 3 "aproximada" mudam para `usar_existente`, o "nenhuma" continua sem decisão.
- Botão "Criar todos os novos" em Clientes/Fornecedores com 2 valores "nenhuma" e 1 "exata_nome" → só os 2 "nenhuma" viram `criar_novo`, o "exata_nome" continua pedindo decisão manual.
- Pessoa com `tipo: "aproximada"` e 2 candidatos (caso raro) → "Aceitar sugestões" não decide essa linha, continua manual.
- Simular (via teste unitário da função extraída, não via UI) uma linha que chega em `prontas` mas falha o guard de `categoriaId`/`valorNumero`/`dataCompetenciaIso` → aparece na lista de "puladas", nunca desaparece sem rastro.
- Planilha de 62 linhas válidas → contador de reconciliação mostra 62 em todas as etapas, sem diferença no resultado final.
