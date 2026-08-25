# Importação financeira: bloquear avanço se o rastreamento do lote falhar

## Contexto

Achado investigando um relato do Erick ("fiz uma importação mas ela não aparece"): a etapa Cadastros da importação financeira registra o lote (`iniciarImportacaoFinanceiraAction`, cria a linha em `importacoes`) numa chamada separada da criação dos lançamentos em si — e o código já documentava de propósito que, se essa chamada falhar, a importação "segue sem rastreamento em vez de travar o usuário". Na prática: os lançamentos nascem reais e visíveis em Despesas/Receitas, mas ninguém acha o lote na Central de Importações nem consegue desfazê-lo depois — foi exatamente o que aconteceu com o Erick (47 lançamentos reais, zero linha em `importacoes`).

## Correção

`PassoEntidades` passa a tratar falha na inicialização do rastreamento como bloqueio, não como algo pra ignorar:

- Se `iniciarImportacaoFinanceiraAction` falhar, aparece um aviso — "Não foi possível preparar o rastreamento desta importação" — com um botão **Tentar de novo** que refaz só essa chamada (não precisa reenviar o arquivo nem perder a classificação de categorias/pessoas já feita).
- O botão **Continuar** fica desabilitado enquanto não houver um `importacaoId` confirmado — não importa se a linha teria ou não criado cadastro novo, porque o rastreamento também é necessário mais adiante, na hora de comitar cada linha (Revisão → Importação).
- O resto da etapa Cadastros continua usável durante a falha — classificar categorias/pessoas não depende do `importacaoId`, só o avanço final depende.

## Escopo

Só `app/(app)/importacao/planilha/passo-entidades.tsx` muda: adiciona estado de erro/tentativa pra a chamada existente e o aviso bloqueante. Sem migration, sem mudança no formato de `iniciarImportacaoFinanceiraAction` em si.

## Teste

Simular falha na primeira chamada (ex.: interceptar a network request) — o aviso aparece, Continuar fica desabilitado mesmo com tudo já classificado; clicar "Tentar de novo" com a rede normalizada resolve o `importacaoId` e libera o avanço.
