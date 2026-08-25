# Desfazer importação de Clientes/Fornecedores: reverter lançamento vinculado em vez de proteger a pessoa

## Contexto

Relato do Erick: importou uma planilha de Clientes/Fornecedores, depois quis desfazer essa importação — mas como os clientes já tinham lançamento financeiro vinculado (de outra importação, ou digitado na mão depois), o sistema deixou os cadastros protegidos e não removeu nada. Pedido explícito: desfazer uma importação, seja de Clientes/Fornecedores ou de Lançamentos, precisa reverter tudo que estiver vinculado, sem exceção.

O desfazer financeiro (`desfazerImportacaoFinanceira`) já passou por um ajuste parecido nesta mesma sessão — parou de proteger lançamento só porque estava quitado, passou a estornar a baixa junto. Este design estende o mesmo princípio pro desfazer de Clientes/Fornecedores (`desfazerImportacao`, em `lib/importacoes/importacoes.ts`), que hoje só remove a pessoa se ela não tiver nenhum lançamento vinculado.

## Escopo decidido

- **Lançamento financeiro vinculado à pessoa**: sempre estornado antes de remover o cadastro, não importa a origem — de outra importação ou digitado manualmente no formulário. Reaproveita `estornarEventoFinanceiro(..., estornarBaixasAutomaticamente: true)`, o mesmo modo que o desfazer financeiro já usa — cobre baixa/quitação junto, sem passo manual.
- **Venda vinculada à pessoa**: fica de fora deste pacote. Não existe hoje uma função de "estornar venda" (mexeria em status de venda, produto, entrega) — fica protegida do jeito que já é, como um problema à parte pra outro momento.
- **Regra de recorrência, regra de categorização automática, ou vínculo com usuário do sistema**: também ficam protegidas — não são lançamento, e mexer nelas está fora do que foi pedido. Isso corrige de quebra uma falha lateral: hoje o código só checa lançamento antes de tentar apagar, então uma pessoa presa só por uma venda (ou por uma dessas outras três) quebraria a exclusão em lote inteira com um erro de banco (FK), em vez de simplesmente proteger aquela pessoa.

## Fluxo (prévia + confirmar)

Mesmo padrão já usado no desfazer financeiro — nunca um clique único direto pra uma ação que agora pode reverter lançamento de verdade:

1. **Prévia** (`preverDesfazerImportacaoPessoas`, só leitura): classifica cada pessoa criada pela importação em
   - **sem vínculo** → remove direto;
   - **só com lançamento(s) vinculado(s)** → remove, mas primeiro lista os lançamentos que serão estornados (descrição + valor, por pessoa);
   - **vinculada a venda / regra de recorrência / regra de categorização / usuário do sistema** → protegida, com o motivo.
2. **Tela**: mostra quantas pessoas serão removidas, quantos lançamentos serão revertidos com o valor total, e a lista de quem continua protegida e por quê. Só depois disso aparece "Confirmar exclusão".
3. **Confirmar** (`desfazerImportacaoPessoas`): recalcula a prévia no servidor a partir só de `importacao_id`/`tenant_id` (nunca confia na lista que veio do cliente) e compara a assinatura contra o que o usuário confirmou — se mudou algo desde que a tela carregou, rejeita e pede pra recarregar. Só executa em cima do que acabou de recalcular.

## Execução e falha parcial

Por pessoa removível-com-lançamento: tenta estornar cada lançamento vinculado (motivo: "Importação de clientes/fornecedores desfeita"). Se todos os lançamentos daquela pessoa forem estornados com sucesso, a pessoa é removida. Se **qualquer um** falhar (ex.: parcela renegociada — mesmo bloqueio que `estornarEventoFinanceiro` já tem hoje e continua tendo), aquela pessoa específica fica protegida com o motivo do erro — as outras pessoas da mesma importação seguem seu caminho normalmente. Nunca trava o lote inteiro por causa de uma linha.

Lançamento estornado por este fluxo nunca é apagado (diferente do "item puro" do desfazer financeiro, que apaga o stub operacional quando o lançamento pertence à própria importação sendo desfeita) — aqui o lançamento pode vir de outra importação ou ter sido digitado à mão, então o registro operacional fica, só marcado como estornado, preservando o rastro de que existiu.

## Resultado e revalidação

Resultado final reporta: pessoas removidas, lançamentos revertidos (com os que deram erro, se houver), e a lista final de protegidas (motivo original + as que ficaram protegidas por falha ao reverter lançamento). `revalidatePath` na action passa a usar `"/"` com escopo `"layout"`, mesmo ajuste já feito no desfazer financeiro — reverter lançamento de verdade se espalha por relatório e indicador, listar rota por rota é frágil.

## Escopo

Arquivos: `lib/importacoes/importacoes.ts` (nova `preverDesfazerImportacaoPessoas` + `desfazerImportacaoPessoas` substituindo a `desfazerImportacao` atual), `app/(app)/importacao/historico/actions.ts` (action de prévia + action de confirmar), `app/(app)/importacao/historico/[id]/desfazer-painel.tsx` (tela de 2 passos). Sem migration — usa tabelas e `estornarEventoFinanceiro` que já existem.

## Teste

Cliente criado por uma importação de Clientes/Fornecedores, depois usado numa despesa lançada manualmente no formulário (não por importação nenhuma) — desfazer a importação do cliente precisa mostrar a prévia com 1 lançamento a reverter, e ao confirmar: lançamento estornado, cliente removido. Outro cliente da mesma importação, mas vinculado a uma venda — continua protegido, com motivo, sem quebrar a exclusão dos outros.
