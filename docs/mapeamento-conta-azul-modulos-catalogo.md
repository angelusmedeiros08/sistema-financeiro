# Mapeamento técnico — Conta Azul Pro: Produtos, Serviços, Estoque e Compras

Exploração ao vivo (conta demo/nova, listagens vazias) via navegador, complementando os três documentos anteriores desta pasta. Foco nos módulos de catálogo e suprimentos — fora do núcleo financeiro, mas relevantes para entender até onde vai a superfície de um ERP "completo" como o Conta Azul, e o que fica de fora se optarmos por não replicar tudo.

---

## 0. Estrutura de menu — como os módulos se cruzam

**Produtos** (`#/ca/vendas/produtos`): Orçamentos, Vendas de produtos, Contratos, Parcelas a receber, Notas fiscais de produto, Consulta Serasa | Cadastros: Clientes, Produtos, Transportadoras | Configurações: notas fiscais, modelo de e-mail, séries de nota.

**Serviços** (`#/ca/vendas/servicos`): mesma estrutura de Produtos, trocando "Vendas de produtos" por "Vendas de serviços" e adicionando "Ordens de serviço".

**Compras** (`#/ca/compras`): Compras | Notas Fiscais de Compra (produto/serviço/importação) | Financeiro: Parcelas a pagar | Cadastros: Fornecedores, Produtos, Serviços, Transportadoras.

**Estoque** (`#/ca/estoque`): Situação de estoque, Movimentações manuais, Inventários | Cadastros: Produtos, Tabelas de preços, Marcas, Unidades de medida, Categorias de produtos, Locais de estoque | Configurações.

**Achado estrutural**: "Produtos", "Serviços", "Clientes", "Fornecedores" e "Transportadoras" são **cadastros compartilhados**, referenciados a partir de múltiplos módulos (a mesma tela de Produtos aparece em Produtos, Compras e Estoque) — não há duplicação de entidade por módulo. É o padrão que também vale a pena adotar: catálogo e pessoas como serviços centrais, módulos de negócio (venda/compra/estoque) como consumidores desses cadastros.

---

## 1. Produto — o cadastro mais complexo do sistema

Formulário em 3 formatos (abas): **Simples / Com variação / Kit de produtos**.

- **Básico**: Nome, Código (SKU), Valor de venda, Código de barras (EAN), Unidade de medida, Centro de custo, Observações.
- **Estoque**: Quantidade disponível, Custo médio, Estoque mínimo/máximo, Categoria.
- **Dados fiscais**: CEST, NCM, Tipo de produto, Origem — mais uma seção avançada de **Regras Fiscais** (ICMS-ST por NCM, isenção por produto específico, com prioridade entre regras).
- **Pesos e dimensões**: altura/largura/profundidade/peso líquido/peso bruto/volumes — para logística/frete.
- **Fotos** (múltiplas) + **E-commerce** (condição, categoria, marca, descrição rich-text) + **SEO** (título ≤70 char, URL, descrição ≤250 char) — o cadastro de produto já nasce pensado pra alimentar uma vitrine de e-commerce, não só o ERP interno.
- **Variação**: gera uma tabela de combinações (ex. tamanho × cor) a partir de campos "Descrição" + "Variação" (aceita múltiplos valores separados por vírgula/Tab/Enter) — cada linha gerada tem seu próprio EAN/SKU/estoque/valor.
- **Kit**: composição de outros produtos (Produto, Quantidade, Valor unitário/total no kit), com valor de venda do kit calculado automaticamente mas editável manualmente.

Categorias de produto vêm com 12 categorias contábeis pré-cadastradas (Ativo Imobilizado, Matéria-Prima, Mercadoria para Revenda, Produto Acabado, etc.) — mapeiam para classificação contábil de estoque, não são livres.

## 2. Serviço — mais simples, mas com tributação municipal detalhada

Campos centrais: Nome, Código interno, **Tipo** (Prestado / Tomado / Prestado e Tomado — o mesmo cadastro serve pra quando a empresa vende OU compra o serviço), Centro de custo, Valor de venda/custo.

**Dados fiscais**: CNAE (com checkbox "usar CNAE principal da empresa"), Natureza de operação, código de serviço municipal, Código NBS, LC 116.

**Impostos municipais** é a seção mais distinta: uma tabela onde cada linha é uma **cidade** onde o serviço é prestado, com ISS retido (sim/não), responsável pelo recolhimento, alíquota de ISS e INSS por cidade, botão "Replicar impostos" entre linhas — cobre o caso real de prestador de serviço que atua em múltiplos municípios com alíquotas de ISS diferentes (relevante se pensarmos num escritório jurídico atuando em várias comarcas/municípios).

## 3. Estoque — controle multi-depósito

- **Movimentações manuais**: Entrada / Saída / Ajuste de custo médio (Transferência exige mais de um "Local de estoque" cadastrado) — cobre ajustes que não vêm de compra/venda.
- **Inventário**: fluxo formal de contagem física vs. sistema, com responsável, motivo, e opção de preencher via planilha — "Salvar para depois" / "Concluir inventário" como dois estados distintos (permite inventário em andamento).
- **Tabelas de preços**: preços diferenciados por canal/sazonalidade (atacado vs. varejo), por percentual, valor fixo ou digitação manual — um produto pode ter N preços conforme a tabela usada na venda.
- **Locais de estoque**: multi-depósito (loja, prateleira, canal de venda), com um local "padrão" configurável.
- Única config exposta: toggle "Verificar estoque ao criar venda" — decide se o sistema bloqueia venda sem saldo.

## 4. Compras — pipeline em 3 estágios, e reuso do componente de pagamento

**Tipo de movimento**: **Cotação de Compra → Pedido de Compra → Compra** — o mesmo padrão de "funil com estágios na mesma entidade" que já vimos em Vendas (Orçamento → Venda → Contrato). Cada estágio revela mais campos conforme avança.

Duas variantes de formulário — **Compra de produtos** (Itens com quantidade/valor/conversão de unidade, custos adicionais: desconto/frete/seguro/impostos/outros) vs. **Compra de serviços** (Dados do Serviço, seção "Informações da nota" com série/número/data de emissão, "Retenções" em vez de frete/seguro).

**Confirmação importante**: a seção "Informações de pagamento" (forma de pagamento, condição parcelada, vencimento, botão "Editar parcelas") é **o mesmo componente reutilizado em Despesas e Vendas** — arquitetura de UI com um único "payment condition widget" plugado em qualquer fluxo que gera evento financeiro. Vale muito replicar essa ideia: construir o bloco de condição de pagamento uma vez, reusar em despesa/receita/venda/compra/contrato.

**Captura de NF-e via Sefaz**: tanto em "Compras" quanto em "Notas de compras" existe integração com certificado digital que consulta a Sefaz automaticamente e traz as notas fiscais emitidas contra o CNPJ da empresa (do lado de quem compra) — reduz o trabalho de lançar manualmente compra a compra; o usuário só confirma/vincula.

## 5. Padrões de UX que valem a pena copiar (transversais a todos os módulos)

- **Empty states como pitch de produto**: toda tela vazia tem ilustração + frase de valor ("por que isso importa") + 2 CTAs (cadastro manual vs. importação em massa) — nunca é só uma tabela vazia com um botão "+".
- **Confirmação de descarte** ao fechar formulário com edição não salva ("Descartar edições? Você perderá todas as edições feitas.") — protege contra perda acidental de trabalho.
- **Wizards em etapas colapsáveis** com checkmark de conclusão (Movimentação de estoque, Inventário).
- **Complexidade fiscal sempre opcional/avançada**: NCM, CEST, regras fiscais, ISS multi-cidade — nunca bloqueiam o cadastro básico, ficam em seções que o usuário só abre se precisar.
- **Componente de pagamento único e reutilizado** em despesa/receita/venda/compra — a peça de UI mais reaproveitada do sistema.

## 6. O que isso significa pra nós

Esses 4 módulos (Produtos, Serviços, Estoque, Compras) são o "lado ERP tradicional" do Conta Azul — forte para quem vende/compra produto físico com estoque. Para o nosso caso (foco financeiro genérico, sem hardware físico como núcleo), a lição não é replicar tudo isso — é: **Serviços** (com a tributação municipal por cidade) é o mais próximo do que interessaria se algum dia vendermos "serviço" como item faturável; **Produtos/Estoque completos (variação, kit, multi-depósito, e-commerce/SEO)** são um território enorme que só vale entrar se decidirmos competir de frente pelo mercado de PME que vende produto — não pelo núcleo financeiro que é nosso foco na Fase 1.
