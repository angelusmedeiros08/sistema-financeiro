# Mapeamento técnico — Produto Conta Azul Pro (navegação ao vivo)

Exploração ao vivo da interface do Conta Azul Pro (`pro.contaazul.com`), na conta já autenticada do usuário, via navegador. Complementa os outros dois documentos desta pasta (planilha de referência e API pública) com o que só se vê na UX real: como os conceitos da API viram tela, e funcionalidades que não estão documentadas na API pública.

---

## 1. Arquitetura de navegação (IA do produto)

Menu lateral: **Início, Favoritos, Importações, Frente de caixa, Produtos, Serviços, Compras, Financeiro, Antecipações, Estoque, Relatórios, Loja de aplicativos.**

Dentro de **Financeiro**: Extrato da Conta PJ, Outras contas, Visão de competência, Contas a pagar, DDA, Contas a receber, Inadimplentes (Beta), Extrato de movimentações, Fluxo de caixa, Histórico, e um grupo **Cadastros** (Categorias financeiras, Centros de custo, Conta PJ e Cobranças, entre outros).

Existe também um atalho global **"Novo registro"** na barra superior (disponível em qualquer tela, com atalhos de teclado): Receita (Alt+R), Despesa (Alt+D), Venda de produto (Alt+V), Venda de serviço (Alt+V), Orçamento (Alt+O), Compra de produto (Alt+P), Compra de serviço (Alt+S), Contrato (Alt+B), Transferência (Alt+T), Produto (Alt+X), Serviço (Alt+Q), Cliente (Alt+L). Vale copiar esse padrão: qualquer lançamento a um atalho de teclado de duas teclas, acessível de qualquer tela.

## 2. O formulário de lançamento ("Nova despesa" / "Nova receita")

Tela dividida em 3 blocos:

1. **Informações do lançamento**: Fornecedor (ou Cliente), Data de competência, Descrição, Valor — depois **Categoria** e **Centro de custo** lado a lado, mais Código de referência (campo livre para ID externo — ponto de integração). Um toggle **"Habilitar rateio"** (desligado por padrão) troca os campos simples de Categoria/Centro de custo por uma **tabela de rateio**: Categoria | Valor total | Porcentagem | Centro de custo, com um botão extra **"Rateio de centro de custo"** por linha — permitindo dividir uma única categoria entre vários centros de custo (rateio aninhado, exatamente como documentado na API). A complexidade de rateio multi-categoria/multi-centro fica **escondida atrás de um toggle**, não exposta por padrão — boa referência de progressive disclosure.
2. **Condição de pagamento**: Parcelamento (À vista / parcelado), Vencimento, Forma de pagamento, Conta de pagamento (com uma conta padrão pré-selecionada, ícone de raio), checkboxes **Pago** e **Agendado**.
3. **Observações / Anexo** (abas) — texto livre + upload de comprovante.

Toggle **"Repetir lançamento?"** acima da condição de pagamento cobre recorrência (mensal, etc.) sem precisar de tela separada.

## 3. Categorias financeiras — plano de contas padrão pré-provisionado

Ao contrário de Centro de Custo (que nasce vazio), **Categorias financeiras já vêm pré-cadastradas** com uma numeração formal em 2 níveis, aparentemente alinhada a um plano de contas contábil padrão:

- Receita: **3.01 Receitas de Vendas e de Serviços** (Fretes recebidos, Receitas de Serviços, Receitas de Vendas), **3.02 Receitas Financeiras**, **3.03 Outras Receitas e Entradas**.
- Despesa: **4.01 Impostos sobre Vendas e sobre Serviços**, **4.02 Despesas com Vendas e Serviços**, **4.03 Despesas com Salários e Encargos**, **4.04 Despesas com Colaboradores** (e mais grupos abaixo, não totalmente enumerados).

Um botão **"Configurar categorias padrão"** mapeia essas categorias reais do usuário a ~13 tipos de operação especiais do sistema (fretes, descontos, juros, multas — os mesmos vistos na API `configuracao-padrao`) — ou seja, a tela existe justamente para reconciliar nomenclatura livre do usuário com semântica fixa do sistema.

**Centros de custo** nascem vazios (`Código | Nome | Situação`, filtros Ativos/Inativos/Todos) — o usuário precisa criar os seus.

## 4. Inadimplentes (Beta) — um mini-kanban de cobrança

Tela dedicada com 3 abas em formato kanban: **Atrasadas → Em andamento → Resolvidas**. Isto é uma esteira de status de cobrança (workflow), não apenas uma lista — o usuário move um devedor de "atrasada" para "em andamento" enquanto negocia, e para "resolvida" quando quita. **Diretamente equivalente ao domínio de problema do AutoCobr do escritório** — é a mesma ideia (funil de cobrança com estados), só que dentro do ERP genérico, sem o conhecimento jurídico/processual que vocês já têm.

## 5. Relatórios — catálogo por categoria (a "camada BI" do produto)

Hub central em `/relatorios`, com abas **Favoritos / Padrão / Personalizados / Antigos**, um botão **"Novo relatório personalizado"** e um **"Agendador de relatórios"** (agenda envio periódico por e-mail — recurso que a planilha de referência não tinha, mas que é trivial de justificar: ninguém quer entrar no sistema todo dia só para ver o mesmo número).

Categoria **DRE** (3 relatórios): DRE com análise vertical e horizontal, DRE Gerencial, DRE por centros de custo — todos marcados **"Configurável"** (o usuário pode customizar a estrutura de linhas, engenharia igual à `CategoriaDRE` da API).

Categoria **Fluxo de caixa**: relatório diário (Entradas/Saídas/Transferências in/out/Saldo Final por dia, gráfico de linha + tabela — bate exatamente com a aba `FluxoCaixa` da planilha SFB).

Categoria **Visão de caixa (antigo "DRE caixa")**: também configurável — indica que a nomenclatura "DRE Caixa" foi descontinuada em favor de "Visão de caixa", sinal de que o próprio Conta Azul reposicionou esse relatório recentemente.

Categoria **Análise financeira** (a mais rica, ~15 relatórios): Análise de pagamentos, Análise de recebimentos, **Análise de inadimplentes** ("quais clientes ainda não pagaram e há quanto tempo o valor está em atraso" — o aging da planilha, em linguagem de produto), Análise por categorias, Análise por centros de custo, Gráfico de despesas por categoria, Gráfico de receitas e despesas por vencimento, Gráfico de receitas por categoria, Gráfico de saldo mensal por centro de custo, Posição de contas por cliente/fornecedor, Relação de contas a receber/pagar, Relação de lançamentos no caixa, Relação de lançamentos por categorias e centros de custo, Relação detalhada de recebimentos e pagamentos (com multa/juros/desconto/tarifa detalhados), Situação financeira por vendedores.

Categoria **Vendas**: Análise das vendas por cliente, Análise do custo da mercadoria vendida (CMV), Clientes sem vendas há mais tempo, entre outros (não totalmente enumerado — módulo de produto/estoque, fora do nosso foco jurídico/serviços).

**Padrão de design a copiar**: cada relatório é um cartão com nome + 1 frase describindo o que ele responde (não "o que mostra", mas "que pergunta de negócio ele resolve") — bom modelo de copy para a nossa própria central de relatórios.

## 6. RBAC — perfis de acesso prontos (achado mais importante para o "portal do cliente")

Ao convidar um usuário, o Conta Azul oferece perfis pré-configurados (não é preciso montar permissão do zero):

**Administrador, Cliente (Plano CA+), Comprador, Contador (Plano CA+), Financeiro Júnior, Financeiro Sênior, Vendedor Júnior** (e ao menos mais um, não capturado).

- O perfil **Administrador** tem uma tela de permissão granular por módulo — ex. dentro de "Vendas": Emissão de Notas Fiscais, Configurar Notas Fiscais e Integrações, Vendas e Orçamentos, Financeiro da Venda, Frente de Caixa Online — cada um com Sim/Não. Ou seja, RBAC no nível de **funcionalidade dentro do módulo**, não só "pode ver Financeiro sim/não".
- O perfil **"Cliente (Plano CA+)"** é a peça que mais nos interessa: é literalmente um perfil de **portal do cliente**, mas **trancado atrás de um plano pago superior ("CA+")** e sem a mesma tela de customização de permissões dos outros perfis (aparece vazio/fixo nesta conta, que não tem o CA+) — no Conta Azul, o acesso do cliente final é tratado como um add-on secundário, não como um pilar do produto.
- O perfil **"Contador (Plano CA+)"** é diferente do mecanismo de **"Meus parceiros"** (em Configurações → Empresa): "parceiros" é uma relação de acesso cruzado entre contas — um escritório de contabilidade externo pode ser convidado como "parceiro" para acessar a conta do cliente sem virar um "usuário" comum dela. Isso é conceitualmente o embrião de uma relação **multi-tenant com um operador central enxergando várias contas de clientes** — mas ainda assim, cada empresa é uma conta Conta Azul separada (não existe "um login, várias empresas" nativo).

## 7. Outras funcionalidades notáveis fora do escopo estritamente financeiro

- **Conta PJ digital**: o Conta Azul opera como banco/conta digital embutida (extrato de "Conta PJ", ativação em Configurações) — não é só um livro-razão, é meio de pagamento também (confirma o que a API já indicava com `COBRANCAS_CONTA_AZUL`/`RECEBA_FACIL_CARTAO`).
- **DDA** (Débito Direto Autorizado — registro automático de boletos emitidos contra o CNPJ do usuário, direto do sistema bancário): reduz lançamento manual de contas a pagar recebidas por boleto.
- **Captura via WhatsApp**: o recurso de IA (`Captura`, mapeado na API) é promovido ativamente na UI como "mande uma mensagem ou arquivo no WhatsApp, o sistema sugere o lançamento, você só confirma" — canal de entrada muito mais natural que "entre no sistema e preencha um formulário".
- **Antecipações**: adianta o recebimento de vendas a prazo (baseado em notas fiscais emitidas) via parceiro financeiro — feature de crédito/fintech embutida, não essencial ao nosso caso mas mostra até onde o modelo de negócio de um ERP financeiro pode se estender (monetização além de assinatura).
- **Importações**: importar despesas por planilha é oferecido como atalho na própria tela de Contas a Pagar (não só um recurso "escondido" de configuração) — reforça que a barreira de entrada de dado legado precisa ser baixa desde o primeiro uso.

## 8. Síntese: o que a UX ao vivo confirma ou corrige das outras duas leituras

| Achado | Planilha SFB | API pública | Produto ao vivo |
|---|---|---|---|
| Rateio multi-categoria/centro de custo | não existe | existe (schema) | existe, mas **escondido atrás de um toggle** por padrão — a maioria dos lançamentos é simples |
| Plano de contas | 30 grupos numerados, fixos, sem hierarquia real | `categoria_pai` (FK hierárquica) | **pré-provisionado** com números 3.x/4.x prontos — usuário raramente cria do zero |
| "Em aberto" / status | binário (Data_Pagamento vazia) | enum rico | a UI simplifica de volta para poucos estados visíveis (checkbox "Pago", aba "Atrasadas/Em andamento/Resolvidas" em Inadimplentes) — a riqueza do enum existe no banco, não é toda exposta ao usuário |
| Portal do cliente | fora de escopo | não documentado como recurso de API separado | **existe como perfil RBAC ("Cliente CA+"), mas é add-on pago e incompleto** — oportunidade real de diferenciação: fazer isso ser um pilar do produto, não um extra |
| Cobrança/dunning | fora de escopo | de primeira classe (boleto/PIX/link + notificação) | vira produto de tela própria ("Inadimplentes", kanban de 3 estados) — diretamente no território do AutoCobr |
| BI/relatórios | Power Pivot local, ~40 pivôs | não exposto via API pública (só dados brutos) | catálogo de ~25+ relatórios prontos organizados por "pergunta de negócio", com agendamento por e-mail |

Este documento fecha o ciclo de pesquisa: planilha (como organizar relatórios financeiros), API (como estruturar o ledger por trás), produto ao vivo (como a UX simplifica tudo isso para o usuário final, e onde o Conta Azul deixa lacunas — principalmente o portal do cliente tratado como extra, não como pilar).
