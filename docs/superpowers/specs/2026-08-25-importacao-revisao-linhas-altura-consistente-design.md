# Revisão da importação: mensagem de erro/aviso trunca numa linha só

## Contexto

Usuário apontou (via screenshot de um elemento específico) que os textos de erro/aviso dentro das tabelas de Revisão da importação ("Valor precisa ser numérico e maior que zero.") quebram em 2+ linhas e deixam a altura das linhas da tabela desigual — visualmente bagunçado, mais perceptível numa planilha grande (62 linhas, caso real do Erick).

Esse padrão (mensagem pequena abaixo do ícone de status, classe `max-w-40 text-xs text-muted-foreground`) existe em 2 lugares, sempre na mesma tabela: `passo-preview.tsx` (Revisão do wizard financeiro) e `passo-revisao.tsx` (Revisão do wizard de Clientes/Fornecedores). Nos dois casos, a coluna "Descrição"/"Nome" da mesma tabela já trunca com reticências numa linha só (`truncate`) — só a mensagem de erro/aviso destoa desse padrão já estabelecido.

## Mudança

A mensagem de erro/aviso passa a truncar numa linha só (`truncate`, sem `max-w-40` fixo — ocupa a largura disponível da célula), com o texto completo acessível via `title` (tooltip nativo do navegador ao passar o mouse). Mesmo tratamento nos dois arquivos.

Resultado: toda linha da tabela fica com a mesma altura, não importa se tem erro/aviso ou não. Nenhuma informação se perde — só fica sob demanda (hover) em vez de sempre visível, igual já acontece hoje com a Descrição/Nome quando o texto é longo.

## Escopo

Só os 2 arquivos onde esse padrão existe. Sem mudança de comportamento funcional (erros/avisos continuam os mesmos, só a apresentação visual muda).

## Teste

Planilha com uma linha de erro cuja mensagem é mais longa que a célula — confirma que a linha fica com a mesma altura das linhas vizinhas sem erro, e que passar o mouse sobre o texto truncado mostra a mensagem completa.
