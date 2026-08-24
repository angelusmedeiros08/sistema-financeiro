# Combobox pesquisável na etapa Cadastros da importação

## Contexto

Testando ao vivo o módulo de Importação nesta mesma sessão, o maior atrito real ficou claro na etapa "Cadastros" (passo 3) dos dois wizards (planilha financeira e pessoas): criar um cadastro novo (categoria, centro de custo, forma de pagamento ou pessoa) exige abrir um `Select` do Radix onde a opção "+ Criar novo" fica na última posição, depois de todas as opções existentes em ordem alfabética. Com ~30 categorias cadastradas, isso significa abrir o dropdown e rolar até o fim toda vez — repetido pra cada valor único da planilha (o sócio do usuário, Erick, relatou planilhas com 10-70 pessoas diferentes). Pra categoria nova ainda existe um segundo `Select` em sequência (Receita/Despesa).

Essa reclamação — "o sistema obriga confirmar coisas que poderiam ser automáticas" — já tem metade do problema resolvido: correspondência exata (categoria/centro de custo/forma de pagamento) e correspondência por documento (pessoa) já decidem sozinhas, sem clique nenhum (Fatia 2/3 desta mesma revisão). Ações em lote pra correspondência aproximada/nenhuma também já existem. O que falta é só a interação de **criar um cadastro novo** — e o app já tem exatamente o componente certo pra isso, usado hoje nos formulários de "nova despesa/receita" (`components/formularios/categoria-combobox.tsx`, `pessoa-combobox.tsx`, `centro-custo-combobox.tsx`, `forma-pagamento-combobox.tsx`): um combobox `Command` + `Popover` do shadcn onde digitar filtra a lista e "Criar 'X'" aparece logo depois do resultado filtrado, nunca no fim de uma lista alfabética inteira.

Este design **não é greenfield** — é adaptar esse padrão já validado e em produção pro contexto específico do wizard de importação, que tem 3 necessidades que os comboboxes atuais não cobrem: badge de correspondência (exata/aproximada/fraca), criação de categoria com tipo (Receita/Despesa) em 1 clique só, e pessoa com múltiplos candidatos (homônimos).

## Componente: `ComboboxEntidade`

Novo componente em `components/formularios/combobox-entidade.tsx`, genérico o bastante pra cobrir os 4 tipos de entidade do wizard financeiro e o campo de pessoa do wizard de pessoas. Não estende `CategoriaCombobox`/`PessoaCombobox` existentes (que são de formulário simples, sem badge e sem múltiplas ações de criação) — nasce como um componente irmão, reaproveitando a mesma base `Command`+`Popover`.

Props:
- `opcoes: { id: string; rotulo: string; subtexto?: string }[]` — lista já resolvida (existente + candidato sugerido, se houver).
- `valor: { tipo: "existente"; id: string } | { tipo: "criar_novo"; nome: string; tipoCategoriaNova?: "RECEITA" | "DESPESA" } | null` — estado controlado, espelha `ResolucaoEntidade` já usado no wizard.
- `onMudar: (valor) => void`.
- `acoesCriar: { rotulo: string; tipoCategoriaNova?: "RECEITA" | "DESPESA" }[]` — 1 ação (`Criar "X"`) pro caso comum, 2 ações (`Criar "X" como Despesa` / `Criar "X" como Receita`) só pra categoria.
- `permiteNenhum?: boolean` — centro de custo e forma de pagamento passam `true`; categoria e pessoa não passam (são sempre obrigatórios no wizard).
- `badge?: ReactNode` — a badge de correspondência já calculada por `LinhaEntidade`/`LinhaEntidadePessoa`, renderizada como está hoje, fora do combobox.

Comportamento da lista (dentro do `Popover`):
1. Se `permiteNenhum`, "Nenhum" aparece fixo no topo, sempre visível, mesmo com busca ativa (filtra por texto normalmente pras opções abaixo, mas "Nenhum" nunca some).
2. Opções existentes filtradas por texto (`nome`/`documento`/`email`/`telefone` pra pessoa), na ordem em que chegam (já vêm ordenadas pelo `resolverTodasCorrespondencias` — sugestão de correspondência primeiro, se houver).
3. Se a busca não bate exatamente com nenhuma opção existente, as ações de criar aparecem logo em seguida — nunca precisa rolar além do que a busca já filtrou.

## Adaptação por tipo de entidade

**Categoria** (`passo-entidades.tsx`, `LinhaEntidade` quando `tipo === "categoria"`): duas ações de criar em vez de uma — "Criar 'X' como Despesa" e "Criar 'X' como Receita" — cada uma já fecha nome + tipo num clique só, eliminando o segundo `Select` de Receita/Despesa que existe hoje. `permiteNenhum={false}`.

**Centro de custo / Forma de pagamento**: uma ação de criar ("Criar 'X'"), `permiteNenhum={true}` com "Nenhum" fixo no topo — cobre o caso comum de "essa planilha não tem essa coluna preenchida, mas mesmo assim preciso decidir por linha".

**Pessoa** (`LinhaEntidadePessoa`): cada candidato de `correspondencia.candidatos` vira uma opção com `subtexto` = `[documento, email, telefone].filter(Boolean).join(" · ")`, igual ao que já é mostrado hoje dentro do `SelectItem`. Busca filtra por nome ou documento. Uma ação de criar, `permiteNenhum={false}` (pessoa é sempre obrigatória quando a coluna Cliente/Fornecedor está preenchida — se a célula vier vazia, a linha nem entra na lista de valores únicos, comportamento que não muda).

**Badge de correspondência**: renderizada exatamente como hoje (`Igual a/Parece/Pode ser`), acima do combobox, sem mudança de lógica — só troca o controle abaixo dela de `Select` pra `ComboboxEntidade`.

## Escopo

Arquivos tocados: `passo-entidades.tsx` (wizard financeiro) e o arquivo equivalente do wizard de pessoas (`app/(app)/importacao/pessoas/passo-*.tsx` — a tela que hoje usa o mesmo padrão de `Select` com "+ Criar novo" no fim da lista). Novo componente `components/formularios/combobox-entidade.tsx`.

Não tocado: `categoria-combobox.tsx`, `pessoa-combobox.tsx`, `centro-custo-combobox.tsx`, `forma-pagamento-combobox.tsx` (usados por outras telas, ficam como estão). Sem migration. Sem mudança na lógica de correspondência (`fuzzy.ts`, `resolucao.ts`) nem nas ações em lote já existentes — troca só o controle de decisão por linha, o resto do fluxo (estado `decisoes`/`decisoesPessoa`, `montarMapaFinal`, `avancar`) continua igual.

## Testes

Fluxo completo (planilha com categoria nova, pessoa nova, centro de custo "Nenhum") do upload até "Importar N linha(s)", confirmando que o resultado final bate com o que bateria pelo `Select` antigo — mesmo `ResolucaoEntidade` chega em `montarMapaFinal`. Teste específico: digitar um texto que já existe exatamente (não deve mostrar ação de criar); digitar um texto novo (deve mostrar as 1-2 ações de criar, sem precisar rolar).
