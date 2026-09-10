# Páginas legais e canal LGPD

## Contexto

O Finanssi não tem, hoje, nenhuma página de Termos de Uso nem Política de
Privacidade — em lugar nenhum do sistema, nem no cadastro (`/assinar`), nem
no rodapé, nem dentro do app. Também não existe nenhum caminho, manual ou
automatizado, pra um titular de dado pedir exportação ou exclusão de dados
pessoais, exigência da LGPD (Lei 13.709/2018) para qualquer empresa que trate
dado pessoal de brasileiro — o Finanssi guarda CPF/CNPJ e dados de contato de
pessoas (clientes/fornecedores) cadastradas por cada tenant, além do dado
financeiro completo do próprio tenant.

Escolhido pelo usuário dentro de um mapeamento mais amplo de "o que falta
pro SaaS em si" (excluindo por ora o provedor de IA e o provedor de
pagamento, ainda em decisão à parte).

## Escopo desta leva

1. Duas páginas públicas de conteúdo: `/termos` e `/privacidade`.
2. Aceite obrigatório e registrado no cadastro (`/assinar`).
3. Canal manual (não self-service) pra pedido de exportação/exclusão de
   dados pessoais, descrito dentro da própria Política de Privacidade.

Exportar/excluir dados via botão de verdade em Configurações fica fora
desta leva (decisão explícita do usuário) — pode entrar num ciclo futuro se
o volume de pedidos justificar automatizar.

## Conteúdo jurídico

O texto de verdade das duas páginas é escrito na implementação (é conteúdo,
não arquitetura), grounded no que o sistema realmente faz — não é texto
genérico de internet. Estrutura de cada página:

**Termos de Uso**: identificação do serviço; objeto (ERP financeiro
multi-tenant); cadastro e assinatura (trial, cobrança recorrente via Asaas,
cancelamento com carência até o fim do período pago — mesma regra do
autoatendimento de assinatura); obrigações do usuário (dado verídico, uso
lícito); papel do recurso de IA (Chat IA e Importação com IA propõem, nunca
executam uma ação financeira sozinhos — toda proposta passa por confirmação
humana antes de virar lançamento real); propriedade intelectual; limitação
de responsabilidade; rescisão; alterações nos termos; foro.

**Política de Privacidade**: dados coletados (cadastro, financeiro, pessoas
com CPF/CNPJ, conteúdo trocado com a IA); finalidade e base legal LGPD
(execução de contrato, legítimo interesse); subprocessadores reais —
Supabase (banco/hospedagem de dado), Vercel (hospedagem da aplicação),
Brevo (e-mail transacional), Asaas (processamento de pagamento), Anthropic
(Chat IA/Importação com IA); direitos do titular (LGPD Art. 18: acesso,
correção, exclusão, portabilidade) e como exercer — ver "Canal de dados
pessoais" abaixo; retenção de dado; segurança (nível de descrição adequado a
documento público, não detalhe técnico de RLS); alterações na política;
contato do controlador.

Cada página leva a data da última atualização visível, e um número de
versão simples (`v1`) — é o valor gravado em `termos_versao` no aceite (ver
"Aceite obrigatório no cadastro" abaixo).

## Aceite obrigatório no cadastro

`/assinar` (`app/src/app/(auth)/assinar/page.tsx`) ganha um checkbox
obrigatório antes do botão de submeter: "Li e aceito os Termos de Uso e a
Política de Privacidade", com "Termos de Uso" e "Política de Privacidade"
como links pra `/termos`/`/privacidade` (abrem em nova aba, o formulário não
perde o que já foi preenchido). Client-side: botão de submeter fica
desabilitado até o checkbox marcado — mesmo padrão de validação client-first
já usado no resto do formulário (`required` nos campos).

**Registro do aceite, não só validação de UI.** Sem persistir isso, não há
como provar depois que alguém aceitou de verdade.

Isso não pode ser gravado em `provisionarTenantNovo` — cheguei a desenhar
assim numa primeira passada, mas é uma inconsistência real: essa função só
roda dias depois, disparada pelo *webhook* do Asaas confirmando o
pagamento, e o webhook não tem nenhum canal pra saber se o checkbox foi
marcado — essa informação existe só na requisição original do formulário
`/assinar`, numa reação HTTP totalmente separada da do Asaas. O único jeito
de levar esse dado adiante até o webhook seria embutir no
`externalReference` do Checkout, o que colidiria com o formato que o
autoatendimento de assinatura já usa nesse mesmo campo (`tenant:{id}` pra
reativação/upgrade) — gambiarra, não solução.

A correção de verdade: o aceite é o que aconteceu na hora do clique em
`/assinar`, então é gravado ali mesmo, antes de redirecionar pro Checkout —
não depois, e não atrelado a um tenant que ainda nem existe. Tabela nova,
independente de `tenants`:

```sql
create table aceites_termos (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  cpf_cnpj text not null,
  termos_versao text not null,
  aceito_em timestamptz not null default now(),
  ip text not null
);
```

`assinar()` (`lib/pagamentos/assinatura-actions.ts`) confirma a presença do
campo do checkbox no FormData (HTML só envia o valor de um checkbox
marcado, nunca de um desmarcado) e insere essa linha logo antes de chamar
`criarCheckoutAssinatura` — mesmo IP já capturado ali pra
`registrarTentativaAssinatura`. Prova o aceite por e-mail/CPF-CNPJ, sem
depender do provisionamento do tenant ter sucesso depois (inclusive cobre o
caso limite de alguém que aceita e paga, mas o provisionamento falha por
outro motivo — o aceite continua provado, independente disso). Sem RLS de
`authenticated`/`anon` nenhuma — mesmo padrão das tabelas de rate limit
(`tentativas_assinatura` etc.), só `service_role` escreve, ninguém de fora
lê.

## Canal de dados pessoais

Sem rota nova, sem botão novo. Dentro da seção de direitos do titular na
Política de Privacidade, um endereço de contato dedicado (reaproveita
`BREVO_SENDER_EMAIL`, mesmo mecanismo já usado no `mailto:` de
`/assinatura-pendente`) com instrução clara de que pedidos de
acesso/correção/exclusão/portabilidade são atendidos por esse canal,
atendidos manualmente pelo tempo que a LGPD prevê.

## Fora de escopo (decisão explícita, não esquecimento)

- Self-service de exportar/excluir dados (botão em Configurações) — fica
  pra quando o volume de pedidos justificar.
- Re-aceite obrigatório quando os termos mudarem de versão — hoje só
  captura o aceite inicial no cadastro; um mecanismo de "termos mudaram,
  usuários existentes precisam re-aceitar" é decisão de produto separada,
  não modelada aqui.
- Rodapé com link permanente nas telas — usuário escolheu só o aceite no
  cadastro por ora, não pediu link visível em outro lugar.

## Teste

A parte central desta leva não depende do Asaas estar configurado: as duas
páginas carregam e renderizam; o checkbox trava o botão de `/assinar` até
marcado; submeter sem o Asaas configurado já é suficiente pra confirmar que
`aceites_termos` recebe a linha (o insert acontece antes da chamada ao
Asaas) — só o redirect final pro Checkout que não completa nesse cenário,
o que não impede validar o registro do aceite em si.
