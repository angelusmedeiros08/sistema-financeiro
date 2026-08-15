# Mapeamento técnico — Conta Azul: Indicadores, Analytics e Dashboards

Pesquisa via páginas públicas de marketing (`contaazul.com`), central de ajuda (`ajuda.contaazul.com`) e busca — **sem sessão autenticada** nesta rodada (diferente dos documentos anteriores desta pasta, que tiveram acesso a uma conta ao vivo). Foco exclusivo em indicadores/gráficos/insights, complementando `mapeamento-conta-azul-modulos-catalogo.md`, `mapeamento-conta-azul-modulos-plataforma.md` e `mapeamento-conta-azul-produto-ui.md` (que já mapearam o catálogo de ~25 relatórios em `/relatorios` e a tela "Visão geral" superficialmente — este documento aprofunda cada um).

**Limitação de método**: sem login, não foi possível abrir as telas reais e fotografar cada gráfico. Tudo abaixo vem de artigos da central de ajuda (que descrevem a tela em prosa, às vezes com prints, não capturados aqui) e de páginas de marketing. Onde a central de ajuda não detalhou um campo específico, isso está marcado como **não confirmado** em vez de inferido.

**Achado estrutural mais importante da pesquisa**: existem **dois produtos de analytics distintos**, não um só —

1. **Conta Azul Pro** (`pro.contaazul.com`) — o ERP em si, com a tela "Visão geral" (Início) e o catálogo de ~50 relatórios em `/relatorios`, usado pela própria PME.
2. **Conta Azul Mais** (`mais.contaazul.com`) — plataforma **exclusiva de parceiros** (contadores/BPO financeiro), com 4 **dashboards visuais** (gráficos interativos, drill-down, exportação PDF) que **não existem, com esse nível de sofisticação visual, dentro do Pro**. É a resposta mais concreta às perguntas 2 e 5 do brief.

Isso já é uma correção relevante a um pressuposto comum: "dashboard" na Conta Azul não é uma tela só — é a tela inicial simples do Pro (poucos números) **mais** uma camada de BI separada, vendida/liberada só para o canal contábil, não para o dono do negócio comum.

---

## 1. Painel principal do dono do negócio — tela "Visão geral" (Conta Azul Pro, `/inicio`)

Primeira tela após login. Central de ajuda ("Visão geral", artigo 115007759147) descreve como objetivo "agrupar as principais informações para agilizar suas decisões". Conteúdo confirmado:

- **A receber / a pagar no dia** — valores com vencimento na data atual.
- **Recebimentos e pagamentos em atraso** — contagem/valor do vencido, com filtro por período.
- **Saldo consolidado de contas financeiras** — "todas as contas financeiras centralizadas sem precisar acessar os sites dos bancos" (extrato agregado, não fica claro se por conta individual ou só total).
- **Fluxo de caixa diário** — gráfico (tipo não especificado na fonte).
- **Gráfico de vendas mensal** — faturamento mês a mês.
- Atalho global **"+ Novo registro"** e busca rápida (já mapeados em `mapeamento-conta-azul-produto-ui.md` §1).
- Botão **"Ocultar/Exibir valores"** — modo privacidade (esconde números sensíveis, ex. para tela compartilhada).
- **Restrição de acesso confirmada**: tela só visível a perfis Administrador, Financeiro Sênior ou Financeiro Júnior — outros perfis (Vendedor, Comprador) não veem a Visão geral financeira.

**Frequência de atualização**: não confirmado explicitamente para a Visão geral do Pro. Por comparação, o Dashboard de Fluxo de Caixa do Conta Azul Mais (§3.2) é explicitamente **D-1 (dia anterior)** para saldo bancário — se o padrão for consistente, a Visão geral do Pro provavelmente também não é estritamente tempo real, mas isso é inferência, não confirmação.

Isto é: a tela inicial do dono do negócio é **deliberadamente enxuta** — poucos números-chave (a receber/pagar hoje, atrasado, saldo, 2 gráficos) — nada de heat map, nada de ranking, nada de score. Concentração por cliente/fornecedor/categoria, forma de pagamento e comparativos ficam todos fora da Visão geral, dentro do catálogo de Relatórios (§4) — que exige navegação deliberada, não é "insight empurrado" na tela principal.

---

## 2. Não existe tela "Análise"/"Insights" dedicada dentro do Pro

Não há evidência de uma seção nomeada "Análise", "Insights" ou "Analytics" separada do financeiro básico **dentro do Conta Azul Pro**. O que existe é:

- O hub **`/relatorios`** (já mapeado em `mapeamento-conta-azul-produto-ui.md` §5) — catálogo de relatórios em abas Favoritos/Padrão/Personalizados/Antigos, incluindo uma categoria chamada **"Análise financeira"** (~15 relatórios) — mas é uma categoria dentro do catálogo de relatórios tradicional (tabelas + alguns gráficos simples), não uma tela de BI separada com storytelling visual.
- A central de ajuda reorganiza esse catálogo em 8 seções temáticas (confirmadas por listagem direta da seção "Relatórios"): *Criar relatórios personalizáveis com IA*, *Explorar relatórios gerenciais*, *Analisar DRE*, *Acompanhar fluxo de caixa*, **"Monitorar a saúde financeira"** (nome literal da seção — mas o conteúdo dela são os mesmos relatórios de Contas a Pagar/Receber/Posição de contas, não um score), *Gerenciar o desempenho comercial*, *Acompanhar relatórios de compras*, *Gerenciar movimentação de estoque*.
- Existe uma "**nova tela de relatórios**" (artigo "Novidade: a nova tela de relatórios da Conta Azul") com **relatórios personalizados via IA** — usuário descreve o que quer em linguagem natural e o sistema monta o relatório (campos, estrutura, formato de visualização definidos por IA). Isso é o mais próximo de "insight automático" confirmado no Pro — mas é geração de relatório sob demanda a partir de um comando do usuário, não um insight proativo que o sistema mostra sozinho.
- A verdadeira camada de BI visual (gráficos interativos, drill-down, Top 10, previsão) só existe no **Conta Azul Mais** (§3), que é do contador/BPO, não do dono do negócio — reforça o achado já registrado em `mapeamento-conta-azul-modulos-plataforma.md` §6 de que BI avançado é uma lacuna que o próprio Conta Azul terceiriza (para apps do marketplace) ou reserva ao canal contábil.

---

## 3. Conta Azul Mais — a camada de BI real (exclusiva de contador/BPO parceiro)

Plataforma de gestão do parceiro (`mais.contaazul.com`), oferecida gratuitamente a contadores/BPOs inscritos no Programa de Parceria. O parceiro escolhe um cliente da sua carteira e visualiza 4 dashboards visuais sobre a Conta Azul Pro **daquele cliente**. Acesso confirmado: Menu lateral → Dashboard → Clientes → selecionar cliente → Visualizar.

Note que estes dashboards não têm um nome de "produto" separado do cliente — eles leem os dados da conta Pro do cliente e os apresentam de forma mais visual do que o Pro apresenta nativamente.

### 3.1 Dashboard de Contas a Pagar e Receber

- **Visão geral de Contas a Receber**: Valor em aberto (não considera inadimplência), Valor realizado (já recebido), Valor em aberto + realizado.
- **Prazo médio de recebimento**: gráfico de linha mensal, em dias — zero dias = lançamento e pagamento no mesmo dia.
- **Visão geral de Contas a Pagar**: estrutura espelhada (Em aberto / Realizado / Em aberto + realizado) + gráfico de **prazo médio de pagamento por mês**, incluindo previsão futura.
- **Saldo de contas bancárias**: detalhamento por conta individual.
- **Previsão financeira acumulada**: gráfico único de recebimentos + pagamentos + saldo acumulado, com buckets de **7, 15, 30, 45, 60 e >60 dias**.
- **Inadimplência acumulada**: indicador "em dia" (sem atraso) ou detalhamento de vencidos nos mesmos buckets (7/15/30/45+ dias); resumo de vencido a receber/pagar; identifica os **principais clientes e fornecedores em atraso**, com drill-down até o item vencido específico.
- **Top 10**: 4 rankings — top 10 clientes por valor recebido, top 10 categorias de recebimento, top 10 fornecedores por valor pago, top 10 categorias de pagamento (inferido pelo padrão simétrico — a fonte confirma clientes/categorias de recebimento e fornecedores explicitamente, "categorias de pagamento" por simetria não está 100% explícito). Cada Top 10 permite filtrar e fazer drill-down.
- **Filtros**: período (custom), ano, mês, cliente/fornecedor específico (mostra previsão e histórico de prazo daquela entidade isolada).

Isto é a resposta mais direta à pergunta 4 do brief (concentração por cliente/fornecedor/categoria) — mas está **trancada no Conta Azul Mais**, não no Pro que o dono do negócio usa no dia a dia. O dono do negócio só tem os Top 10/concentração se pedir ao seu contador parceiro para abrir essa visão para ele, ou via relatórios equivalentes no Pro (§4).

### 3.2 Dashboard de Fluxo de Caixa

- Três categorias de valor: **Realizado** (já lançado no Pro), **Previsto** (a vencer), **Orçado** (vinculado a um orçamento em andamento — cruza com o módulo de Orçamento).
- **Análise vertical e horizontal** de receitas/despesas (% e R$ de variação).
- **Saldos bancários**: linha contínua = realizado, linha tracejada = previsão futura. **Atualização diária em D-1** (confirmado explicitamente — "até o dia anterior").
- **Resultado anual** (recebimentos, pagamentos, saldo do ano) e **resultado mensal** (idem + saldo bancário do mês).
- **Margem de geração de caixa**: métrica em % que resume o resultado do mês; texto da fonte states "margem acima de 100% em pagamentos indica saídas maiores que entradas" — ou seja, é uma razão pagamentos/recebimentos (ou despesas/receitas) expressa como percentual, funcionando como sinal simples de alerta (>100% = queimando caixa no mês).
- **Top 10**: categorias de recebimento/pagamento, clientes, fornecedores, com drill down/up.
- **Filtros**: período, ano, mês, categoria, centro de custo, banco, cliente. **Importante**: filtros afetam os gráficos mas **não** o saldo bancário exibido, que "sempre mostra o valor real" (o saldo bancário nunca é filtrado/hipotético).
- Recursos de UI: modo foco (ampliar gráfico), exportação PDF, drill up/down.

A "margem de geração de caixa" é o indicador mais próximo de um "health score" simplificado que a pesquisa encontrou — mas é um número por mês, não um score composto contínuo, e só existe no Mais (contador), não no painel do dono do negócio.

### 3.3 Dashboard de Vendas e Contratos

- **Vendas**: valor total vendido, quantidade de vendas, ticket médio, total de clientes compradores; evolução mensal (gráfico de barras); distribuição geográfica (mapa por cidade + tabela de % de participação por município); ranking dos 10 principais clientes; ranking de produtos/serviços mais vendidos.
- **Contratos recorrentes**: **MRR** (receita recorrente mensal de contratos vigentes) e **ARR** (projeção anual), churn de receita, contratos ativos/cancelados/a vencer/novos por período.
- Indicadores de contas a receber e inadimplência cruzados com vendas.
- **Filtros**: período (mensal/trimestral/anual), tipo (produto/serviço/ambos), cliente (CNPJ específico ou grupo consolidado — sinaliza suporte a visão de múltiplas empresas/franquias de um mesmo grupo), condição de pagamento (à vista/parcelado) **e forma de pagamento (Pix, boleto, cartão, transferência)** como filtro — mas não confirmado se existe um gráfico dedicado de "distribuição por forma de pagamento" (a forma de pagamento aparece como **filtro** aplicável às vendas, não necessariamente como métrica visualizada por padrão; não há confirmação de um gráfico de pizza/barras "% de vendas por forma de pagamento").
- Análise individual ou consolidada (grupos/franquias) — o único ponto confirmado de "visão multi-empresa" nativa nesta pesquisa.

Este é o dashboard com o **MRR/ARR** — métrica de receita recorrente que não aparece em nenhum outro documento desta série; relevante caso o sistema em construção venha a ter assinaturas/contratos recorrentes como linha de receita.

### 3.4 Dashboard de DRE

- Baseado em **competência** (quando o fato gerador ocorreu, não quando foi pago).
- **Métricas anuais** (janeiro até o mês corrente): Receita líquida, EBITDA, Resultado líquido, Resultado final.
- **Métricas mensais**: as mesmas 4, com % sobre a receita bruta total do mês.
- Gráficos: **Receita total vs. Receita líquida** (mostra efeito de descontos/sazonalidade) e **EBITDA e Resultado final** (evolução mês a mês até dezembro).
- **Detalhamento hierárquico**: grupo → subgrupo → categoria (ex. Receitas de Serviços, Fretes Recebidos, Despesas Administrativas) — mesma estrutura de `CategoriaDRE` já documentada na API.
- **Análise vertical** (% de participação de cada item na receita/despesa total) e **análise horizontal** (R$ e % de variação mês a mês) — os dois métodos contábeis clássicos, confirmando o padrão já visto no relatório DRE do Pro.
- **Análise por cliente**: permite filtrar a DRE inteira por um cliente específico, para entender o impacto/contribuição de margem daquele cliente isoladamente — achado relevante para a pergunta 4 (concentração), aplicado à lucratividade e não só ao faturamento bruto.
- **Filtros**: ano, período/competência, centro de custo, categoria em 3 níveis, limpeza de filtro individual.

---

## 4. Indicadores equivalentes disponíveis no Pro (fora do Mais) — o que o dono do negócio realmente vê

O catálogo de Relatórios do Pro (`/relatorios`, já listado em `mapeamento-conta-azul-produto-ui.md` §5) cobre parte do mesmo terreno do Mais, mas como tabelas/relatórios individuais navegáveis, não como um dashboard visual consolidado:

- **Concentração por cliente**: relatório **"Análise de Maiores Clientes"** — gráfico de "maiores clientes (total x ticket médio por venda x valor)"; relatório **"Situação Financeira dos Clientes"** — visão da realidade financeira de cada cliente (identificar clientes-chave, prever receita futura, priorizar atendimento); relatório **"Ticket Médio por Cliente"**; relatório **"Data de Última Compra"**; relatório **"Aniversário dos Clientes"** (venda por cliente cruzada com data de nascimento/fundação). Total confirmado: **5 relatórios de análise de clientes** dentro de Relatórios → Padrão → Vendas.
- **Posição por cliente/fornecedor**: relatório **"Posição de contas por cliente/fornecedor"** (em Análise financeira) — mostra, por entidade, o que já foi emitido, pago/recebido e o que falta, com toggle valor líquido (descontando tarifas) vs. valor bruto. Não é um ranking de concentração, é uma posição de saldo por entidade.
- **Concentração por categoria**: gráficos nativos **"Gráfico de despesas por categoria"** e **"Gráfico de receitas por categoria"** (já listados em `mapeamento-conta-azul-produto-ui.md` §5) — cobrem a dimensão categoria, mas não cliente/fornecedor no mesmo gráfico.
- **Curva ABC**: existe como relatório nativo confirmado, mas **apenas em Estoque** ("Relatórios de estoque: o que é e como funciona o relatório de Curva ABC", com telas de acesso/edição/personalização próprias) — classifica **produtos**, não clientes nem fornecedores nem categorias financeiras. Não encontrada nenhuma Curva ABC de clientes/fornecedores/receita no Pro nem no Mais — os textos que mencionavam "curva ABC de clientes" nas buscas eram de sites terceiros (Sankhya, Zydon, blogs de gestão) descrevendo o conceito genérico, não uma tela confirmada do Conta Azul. **Não confirmado.**
- **Forma de pagamento**: não foi encontrado nenhum relatório ou gráfico nativo dedicado a "distribuição de recebimentos/pagamentos por forma de pagamento" (Pix vs. boleto vs. cartão vs. transferência) no Pro. O relatório "Análise de Pagamentos" (central de ajuda, artigo 7322908899341) confirma agrupamento por **categoria** e **centro de custo**, com "Outros" agregando categorias menores após a 10ª coluna — mas a fonte não lista forma de pagamento como coluna/dimensão desse relatório. No Mais, forma de pagamento aparece apenas como **filtro** do Dashboard de Vendas e Contratos (§3.3), não como métrica com gráfico próprio. **Conclusão: "forma de pagamento mais usada" não é um indicador de primeira classe em nenhuma das duas plataformas — é, no máximo, um filtro aplicável a outras análises.** Isso é uma lacuna real do concorrente, não uma omissão da pesquisa.

---

## 5. Conta Azul para Contadores — separação de visão contador vs. dono do negócio

Confirma-se a existência de "Conta Azul para Contadores" como proposta comercial (`contaazul.com/contadores/`), mas a página de marketing **não detalha indicadores exclusivos** — fala genericamente em "mais de 50 relatórios gerenciais" sem distinguir o que é do contador vs. do cliente. A distinção real está espalhada em artigos de central de ajuda distintos:

- **Conta Azul Pro** = produto operacional do dono do negócio (lançamentos, vendas, compras, os ~50 relatórios do catálogo, a Visão geral simples).
- **Conta Azul Mais** = plataforma do parceiro (contador/BPO), com:
  - Lista/gestão de clientes e licenças (3 modalidades de plano: **Pro, Pro BPO, Pro Conciliação Contábil**).
  - Os **4 dashboards visuais** descritos em §3 — a peça de BI mais sofisticada de toda a pesquisa, e **exclusiva do contador logado no Mais**, olhando a conta do cliente.
  - **"Relatório de uso e alertas"** (artigo 360034363211) — não é um indicador financeiro, é um indicador de **adoção/engajamento do cliente com o produto**: mostra, por empresa cliente, a última atividade em 3 frentes (Financeiro = última compra/venda lançada; Nota fiscal = última emissão; Conciliação = última conciliação bancária feita), com atalhos rápidos para a conta bancária/extrato daquele cliente. Tem uma segunda aba de **configuração de alertas proativos**: o parceiro agenda lembretes automáticos (documentos pendentes, notas fiscais, conciliação) disparados em datas fixas do mês (1º dia útil, 2º dia útil, 5º dia útil, último dia útil) — e o **cliente** (não o contador) recebe a notificação automática. É a peça mais próxima de "alerta proativo baseado em dado" confirmada na pesquisa — mas é sobre **higiene de uso do sistema** (cliente esqueceu de mandar documento/conciliar), não sobre saúde financeira do negócio.
  - **Sistema de pontuação/ranking de parceiro** — 5 níveis de parceria, score calculado por uso do Pro/Mais por cada cliente da carteira (regras: cada R$1 em licença paga pelo parceiro = 1 ponto; cada R$1 em tarifa de Cobranças Conta Azul = 1 ponto; cada R$1 em licença indicada = 1,2 pontos). Nível é definido pelo maior score dos últimos 30 dias; pontuação recalculada diariamente (dias úteis) com base no "dia útil anterior". **Importante não confundir**: isso é um programa de fidelidade/comissionamento do canal de distribuição (quanto o contador vendeu/indicou), **não** um indicador de saúde financeira do negócio do cliente final. Benefícios por nível: remuneração sobre vendas/indicação, treinamentos, descontos por volume, suporte prioritário, gerente de conta dedicado, "inteligência de portfólio" (termo usado mas não detalhado) e prioridade em leads nos níveis mais altos.
- **"Meus parceiros"** (dentro do Pro, já mapeado em `mapeamento-conta-azul-produto-ui.md` §6) é a ponte inversa — o mecanismo pelo qual a empresa cliente autoriza um contador a acessá-la via Mais.

**Resposta direta à pergunta 5 do brief**: sim, a distinção existe e é estrutural (dois produtos/subdomínios diferentes, não uma tela com toggle "modo contador"). Os indicadores exclusivos do contador são: os 4 dashboards visuais (§3), o relatório de uso/engajamento do cliente, e o próprio score de parceria (que é sobre o parceiro, não sobre o cliente). O dono do negócio no Pro nunca vê esses dashboards nem esse nível de visualização — a menos que peça ao seu contador para compartilhar tela ou exportar o PDF.

---

## 6. Health score / situação financeira / alertas proativos / recomendações — o que existe e o que não

Sem evidência de um **health score único e explícito do negócio** (tipo "sua empresa está 78/100 saudável") em nenhuma das duas plataformas. O que existe, decomposto:

- **"Monitorar a saúde financeira"** é literalmente o nome de uma seção da central de ajuda (agrupando os relatórios de Contas a Pagar/Receber/Posição de contas/lançamentos no caixa/rateio) — ou seja, "saúde financeira" no vocabulário do Conta Azul é **um conjunto de relatórios tradicionais**, não uma pontuação calculada.
- **Margem de geração de caixa** (Dashboard de Fluxo de Caixa do Mais, §3.2) é o indicador numérico mais próximo de um sinal de alerta simples (>100% = saindo mais do que entrando no mês) — mas é um número por mês, sem histórico de tendência confirmado nem thresholds visuais (semáforo) confirmados.
- **Inadimplência acumulada com buckets de atraso** (7/15/30/45+ dias, §3.1) é o mecanismo de alerta mais rico confirmado — mas é sob consulta (o usuário abre o dashboard), não uma notificação push.
- **Alertas proativos reais e confirmados** existem só no fluxo contador→cliente do Mais (§5: lembretes de documento/nota fiscal/conciliação em datas fixas do mês) — são alertas de **processo/higiene de uso**, não de métrica financeira (ex. não existe confirmação de "alerta: sua margem caiu 20% este mês" ou "alerta: cliente X está inadimplente há 45 dias" sendo empurrado automaticamente).
- **"Score financeiro"/análise de risco**: existe menção (página institucional sobre a fintech do Conta Azul) de que a empresa usa o histórico de dados dos clientes do ERP para "análise de risco mais assertiva" — mas isso é **uso interno da Conta Azul/sua fintech para decidir crédito/Antecipações** (já mapeado como produto de fintech em `mapeamento-conta-azul-modulos-plataforma.md` §2), não um score exposto ao usuário na tela. **Não confirmado** que o usuário final veja esse score.
- **Recomendações automáticas baseadas em dado** (tipo "recomendamos renegociar com o fornecedor X" ou "categoria Y está fora do padrão"): **não confirmado** nenhum recurso desse tipo em nenhuma das fontes públicas consultadas. O único uso de "recomendação"/IA generativa confirmado é o **relatório personalizado por IA** (usuário descreve o que quer, IA monta a estrutura) — que é geração assistida de relatório, não recomendação proativa de ação de negócio.

**Conclusão da pergunta 6**: não existe health score nem motor de recomendação proativa baseada em dado financeiro no Conta Azul, apesar do nome "saúde financeira" aparecer como rótulo de categoria de relatórios. Isso é uma lacuna genuína (compatível com o achado já registrado em `mapeamento-conta-azul-modulos-plataforma.md` de que BI avançado é terceirizado para o marketplace) — território aberto se decidirmos construir isso no nosso sistema.

---

## 7. Frequência de atualização — o que foi confirmado

| Indicador/Dashboard | Frequência confirmada |
|---|---|
| Saldo bancário — Dashboard de Fluxo de Caixa (Mais) | **D-1** (explícito: "até o dia anterior"); linha tracejada para valores futuros previstos |
| Saldo bancário — filtros do mesmo dashboard | Nunca filtrado — "sempre mostra o valor real" independente dos filtros aplicados aos gráficos |
| Score/pontuação de parceria (Mais, canal contador) | **Diário, dias úteis**, "com base no cenário do dia útil anterior"; nível de parceria = maior score dos últimos 30 dias |
| Relatório de uso e alertas (última atividade do cliente) | Não confirmado o SLA exato de atualização (provavelmente próximo a tempo real, já que reflete lançamentos/emissões/conciliações do cliente, mas não há confirmação textual de "tempo real" vs. batch) |
| Visão geral do Pro (Início) | **Não confirmado** — nenhuma fonte especifica se é tempo real ou com algum delay |
| Demais relatórios do catálogo (`/relatorios`) | **Não confirmado** — provavelmente consulta direta ao banco transacional no momento do acesso (sem menção de cache/batch), mas isso é inferência, não confirmação textual |

O único ponto duro confirmado é o **D-1 do saldo bancário no dashboard do Mais** — sugere que a extração/consolidação bancária usada para BI roda em batch noturno, separada da leitura transacional usada nos relatórros comuns do Pro (que aparentam ser on-demand/tempo real, mas sem confirmação explícita).

---

## 8. Síntese — o que isso significa para o nosso sistema

- **A tela inicial (painel) do Conta Azul Pro é deliberadamente simples** — validamos que o commit recente `0c28647` ("Painel: mostra Recebido e Pago do mes ao lado de A receber/A pagar") já está no mesmo espírito de indicador direto e sem ruído que o Conta Azul usa na Visão geral. Não há sinal de que estejamos "atrás" do concorrente nesse ponto — estamos no mesmo território (poucos números-chave, sem gráfico de vaidade).
- **A verdadeira diferenciação está no que falta nos dois lados**: nem o Pro nem o Mais têm (a) health score, (b) recomendação proativa baseada em dado, (c) indicador de forma de pagamento como dimensão de primeira classe, (d) alerta financeiro proativo (só alerta de processo/higiene de uso). Isso é uma lacuna real e validada por pesquisa direta, não suposição — território livre para diferenciação, consistente com a "ambição de produto" já registrada na memória do projeto.
- **A separação contador vs. dono do negócio é feita via produto/subdomínio inteiro** (Mais vs. Pro), não via toggle de UI — decisão de arquitetura a considerar se algum dia construirmos uma visão de contador/BPO: pode valer mais a pena um espaço de "carteira de clientes" separado (mesmo padrão RBAC de "parceiro" já mapeado) do que tentar encaixar tudo dentro do mesmo shell do usuário final.
- **MRR/ARR e churn de receita** (achado novo, §3.3) só fazem sentido se o sistema vier a ter contratos recorrentes como linha de receita — vale guardar como conceito, não implementar agora.
- **Concentração de receita/despesa por cliente/fornecedor/categoria já é parcialmente coberta** pelos relatórios que a Conta Azul chama de "Análise de Maiores Clientes", "Situação Financeira dos Clientes" e "Top 10" (no Mais) — bom vocabulário de nomes de tela a reaproveitar se construirmos o equivalente.
