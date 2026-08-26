# Importação: execução migra pro servidor (fecha o bug de abandono no meio)

**Data:** 2026-08-26

## 1. Contexto

Usuário reportou: sair do módulo de Importação logo depois de iniciar uma importação (ou uma reversão) faz a operação "continuar" sem ele saber. Pediu progresso/tela de carregamento pra evitar bugs.

Investigação (`Explore`) achou uma causa mais profunda do que "falta spinner": a importação (planilha financeira e Pessoas) roda como um **loop no navegador** — `useEffect` num `for` que chama uma Server Action por linha, sequencialmente, aguardando cada uma antes da próxima (`app/src/app/(app)/importacao/planilha/passo-resultado.tsx:32-66`, mesmo padrão em `.../pessoas/passo-resultado.tsx:24-76`). Nada trava a navegação — sidebar e breadcrumb ficam clicáveis o tempo todo, sem `beforeunload`, sem confirmação.

- **Navegação SPA** (clicar em qualquer link do app) não destrói o loop — o componente desmonta, mas a `Promise` da IIFE do `useEffect` não está presa ao ciclo de vida do React; o loop continua rodando escondido até o fim, gravando as linhas restantes no banco sem nenhuma UI mostrando isso.
- **Fechar a aba** para o loop depois que a linha em voo termina (a Server Action já disparada roda até o fim no servidor mesmo com o cliente desconectado — comportamento documentado do Next.js), deixando a importação parcialmente feita.

Em ambos os casos, `importacoes.status` só vira `"concluida"` quando o loop cliente termina e chama `finalizarImportacaoFinanceiraAction`/`finalizarImportacaoPessoasAction` — se o loop for abandonado, isso nunca roda, e o lote fica `"em_andamento"` pra sempre (sem timeout, sem job de limpeza). O botão "Retomar" (`historico/[id]/page.tsx`, `podeRetomar`) só aparece quando `status === "concluida" || "cancelada"` — nunca em `"em_andamento"`, que é exatamente o estado que sobra de um abandono. E mesmo se aparecesse, hoje quebraria pro caso financeiro: não existe placeholder "pendente" por linha criado de antemão (diferente de Pessoas), o dado original da linha nunca é persistido (`dados_normalizados: {}` hardcoded em `importacoes-financeiro.ts`), e `retomarItemAction` está fixo no importador de Pessoas independente do tipo do lote.

"Desfazer importação" já é mais seguro nesse sentido — é uma única Server Action (`desfazerImportacaoFinanceiraAction`/`desfazerImportacaoPessoasAction`), então o loop de reversão sempre roda até o fim no servidor, mesmo se o cliente sair. Mas não dá nenhum feedback se o usuário sair no meio.

Checado ao vivo no banco: **30 importações estão travadas em `"em_andamento"` hoje**, todas em tenants de desenvolvimento/teste — confirma que o bug é facilmente reproduzível, não hipotético.

## 2. Decisão de arquitetura

A execução migra do navegador pro servidor: **uma única Server Action recebe o lote inteiro** (todas as linhas já parseadas da planilha) e roda o loop do início ao fim dentro da mesma requisição — o mesmo padrão que "Desfazer importação" já usa com segurança hoje. `finalizarImportacaoFinanceiraAction`/`finalizarImportacaoPessoasAction` deixam de ser uma chamada separada no fim de um loop cliente e passam a rodar dentro dessa mesma ação, sempre — nunca mais fica pra trás se alguém sair da tela.

Consequência: fechar a aba, navegar pra qualquer lugar do app, cair a internet — nada disso interrompe a importação depois que começou. O pior cenário passa a ser "não vi a tela de confirmação", nunca mais "o banco ficou pela metade".

**Efeito colateral aceito**: o botão "Cancelar" que hoje existe no importador de Pessoas (`StopCircle`, interrompe o loop no meio) sai — não faz sentido cancelar uma operação que já virou uma única chamada ao servidor.

**Os 30 lotes já travados hoje**: ficam como estão. São registros de teste em tenants de dev, sem lançamento pendente real por trás na maioria (a maior parte tem 1 linha ou é o mesmo arquivo repetido) — não vale mexer em dado sem pedido específico; o conserto vale pra importações novas daqui pra frente.

## 3. Componentes e fluxo de dados

- **`executarImportacaoFinanceiraAction(importacaoId, linhas[])`** (nova, substitui o trio hoje espalhado — loop cliente + `importarLinhaAction` por linha + `finalizarImportacaoFinanceiraAction` separado, em `app/src/app/(app)/importacao/planilha/actions.ts`): recebe todas as linhas parseadas de uma vez, roda `commitarLinhaImportacao` (`lib/importacao/commit.ts`) linha a linha dentro do servidor, grava cada resultado em `importacoes_itens`, e ao final já marca `status: "concluida"` — tudo dentro da mesma requisição, do ponto de vista do cliente é uma chamada só.
- **`executarImportacaoPessoasAction(importacaoId, linhas[])`** — mesma ideia, substituindo o loop hoje em `.../pessoas/passo-resultado.tsx` e `importarLinhaPessoaAction` chamado por linha.
- **Conserto do Retomar (financeiro)**, pra fechar o único buraco que sobra (queda real do servidor no meio do loop):
  - Cada linha ganha uma linha `"pendente"` em `importacoes_itens` **antes** de tentar processar — mesmo padrão que Pessoas já usa (`registrarItemImportacaoFinanceira` hoje só grava depois de tentar; uma linha nunca tentada simplesmente não existe, escondendo quanto ficou faltando via `contagemPendente`).
  - `dados_normalizados` passa a guardar o dado real da linha (hoje é sempre `{}` hardcoded em `importacoes-financeiro.ts`) — sem isso não tem como reprocessar.
  - `retomarItemAction` (`historico/actions.ts`, hoje sempre chama `importarLinhaPessoaAction`) passa a decidir pelo `tipo` da importação (`financeiro` | `pessoas`), chamando o commit certo em cada caso.
- **UI de progresso**: o contador "Processando linha X de Y" (que dependia de observar o loop cliente linha a linha, impossível de saber uma vez que virou uma chamada única) vira um estado único: "Importando N lançamentos... isso pode levar alguns segundos, não feche esta janela", com spinner, enquanto a Server Action está em voo. Mesmo tratamento visual no botão "Desfazer" (hoje só troca o texto pra "Desfazendo...", sem contexto) — ganha o mesmo aviso.

## 4. Tratamento de erro e casos de borda

- **Erro numa linha específica** (categoria inválida, valor malformado etc.): já é tratado hoje por linha (try/catch dentro do commit) — comportamento idêntico, só que agora dentro do loop server-side; resultado de cada linha continua indo pra `importacoes_itens` e aparecendo na tela de revisão, igual hoje.
- **Timeout de plataforma**: rodar até 500 linhas com escrita real no banco (evento + parcela + rateio + baixa por linha) numa única requisição pode esbarrar em limite de duração de função serverless, dependendo de onde isso for hospedado — hospedagem ainda não decidida neste projeto. Risco conhecido, registrado aqui, **não resolvido nesta leva**; se um dia a hospedagem impuser um teto curto, a saída natural é lotes menores (a própria Server Action processando em páginas), não voltar pro loop client-side.
- **Queda real do servidor no meio do loop** (único cenário que ainda deixa `status: "em_andamento"` travado depois desta correção): com o Retomar consertado (seção 3), a tela de histórico mostra o botão certo pra continuar de onde parou, sem duplicar nem perder linha — tanto pra financeiro quanto pra Pessoas.
- **Desfazer**: sem mudança de comportamento em erro — continua registrando por item, só ganha o aviso visual de "não feche esta janela".

## 5. Fora de escopo

Progresso ao vivo linha-a-linha (contador em tempo real) — decisão explícita do usuário de trocar por um estado único "aguarde", em troca de eliminar o bug pela raiz sem introduzir um padrão de streaming novo no código (SSE/polling, que não existe hoje em nenhum outro lugar do sistema). Limpeza dos 30 lotes já travados. Resolver o limite de duração de função serverless antes de decidir hospedagem.

## 6. Teste

Ao vivo: importar uma planilha de ~50-100 linhas e fechar a aba/navegar pra outro módulo no meio — conferir que a importação termina sozinha no servidor e o histórico mostra "Concluída" certo, sem linha faltando nem duplicada. Forçar erro numa linha específica (categoria inexistente) e conferir que só aquela linha falha, resto segue normalmente. Simular o cenário de Retomar (interromper de propósito em dev, se der) e conferir que retoma as linhas certas com o dado certo, tanto financeiro quanto Pessoas. Testar Desfazer com o aviso novo. Confirmar que "Cancelar" saiu do fluxo de Pessoas sem deixar código morto (import quebrado, referência ao componente removido).
