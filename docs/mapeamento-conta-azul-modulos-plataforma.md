# Mapeamento técnico — Conta Azul Pro: Importações (IA), Conta PJ, Planos e Marketplace

Exploração ao vivo (conta demo/nova) via navegador. Fecha o mapeamento com a camada "plataforma": como o Conta Azul captura dado automaticamente, como monetiza (planos + add-ons + marketplace), e onde ele mesmo terceiriza funcionalidade em vez de construir.

---

## 1. Importações → na verdade é "Conta Azul IA" (hub de captura automática)

Não é um importador clássico de planilha de cadastro — é um hub de **captura de documentos por IA**, com 4 canais configuráveis (todos "Não configurado" por padrão numa conta nova):

- **Upload direto**: arrastar PDF/imagem (até 10MB) na própria tela — "Nossas IAs leem até fatura de cartão de crédito".
- **WhatsApp**: vincula um número via QR code + código de validação único; documentos enviados por esse número viram lançamento sugerido.
- **E-mail**: cada empresa recebe um e-mail de captura único; qualquer usuário pode autorizar remetentes adicionais (lista compartilhada entre todos os usuários da conta) — regra explícita: usar o e-mail de destino só no campo "Para", outros remetentes vão em "Cópia (CC)".
- **Grupo de WhatsApp**: mesmo padrão do WhatsApp individual, para grupos.
- **DDA**: exige ativar a Conta PJ primeiro — aí os boletos emitidos contra o CNPJ chegam automaticamente para virar lançamento, sem nenhum documento precisar ser enviado manualmente.

Esse hub é literalmente a interface de usuário do recurso "Captura" que já tínhamos mapeado na API pública (`POST /v1/captura/documentos` → prévia sugerida → confirma ou recusa). O canal WhatsApp é tratado como carro-chefe na comunicação do produto.

## 2. Conta PJ — banco digital embutido ("Conta Azul IP")

O nome "Conta Azul IP" sugere Instituição de Pagamento própria (regulada, com selo "Autorizado pelo Banco Central do Brasil"). Proposta de valor: **Pix grátis e ilimitado**, **dinheiro na conta na hora** (recebimento Pix instantâneo), **conciliação automática** com o ERP, e **pagamento de despesas e tributos direto pelo sistema**.

Operada via app mobile próprio ("Conta Azul de Bolso"), login compartilhado com o Conta Azul Pro mas **senha de transação separada** — ou seja, mesmo tendo uma identidade só, movimentar dinheiro exige uma segunda credencial (boa prática de segurança a copiar se decidirmos oferecer meio de pagamento próprio no futuro).

É o backbone que alimenta tanto o DDA (recebimento automático de boleto) quanto a reconciliação bancária automática — a Conta PJ não é um recurso isolado, é a peça que fecha o ciclo "lançamento → cobrança → pagamento → conciliação" sem sair do sistema.

## 3. Planos e monetização

Estrutura confirmada por evidência direta na conta explorada: plano contratado = **"Controle II"**, recorrência anual, valor de tabela **R$ 4.198,80/ano** (zerado nesta conta por cupom de 100%, sinal de conta demo/parceiro). O nome confirma uma linha "**Controle**" com múltiplos níveis numerados (I/II/III, hipoteticamente), e o RBAC já mapeado antes mostrou perfis extras (`Cliente (Plano CA+)`, `Contador (Plano CA+)`) — ou seja, **o portal do cliente e o acesso do contador são add-ons de um tier acima do plano padrão**, não parte do plano base.

Outros detalhes da área de plano: histórico de pagamento tabular, dados de faturamento (CNPJ/razão social/endereço para nota fiscal do próprio Conta Azul), e um botão de **"Backup da conta"** — direito de portabilidade de dado exposto como funcionalidade de primeira classe, vale copiar (constrói confiança: "seus dados são seus, dá pra levar embora").

## 4. Configurações fiscais e certificado digital

Notas fiscais têm configuração separada por tipo — **NFS-e** (emissão + busca automática), **NF-e** (emissão + regras de automatização de impostos + busca automática), **NFC-e** (emissão) — cada uma como sua própria sub-seção, não uma tela genérica de "notas fiscais".

Um único **certificado digital** (A1 via upload de arquivo, ou A3 via token/cartão físico) alimenta múltiplos fluxos: assinatura de notas fiscais emitidas E autenticação para buscar notas na Sefaz (tanto notas de venda quanto notas de compra recebidas contra o CNPJ). Um certificado, vários consumidores — mesmo padrão de "recurso central reutilizado" que já vimos no componente de condição de pagamento.

O cadastro de empresa exige explicitamente **"Minha empresa vende: Produto e/ou Serviço"** (checkbox obrigatório, pelo menos um marcado) — essa resposta provavelmente é o que determina quais módulos/menus aparecem depois (hipótese: uma empresa que marca só "Serviço" talvez não veja Estoque/Produtos com o mesmo peso). Vale considerar o mesmo gate de onboarding no nosso sistema: perguntar o perfil do negócio antes de mostrar tudo.

## 5. "Meus parceiros" — a ponte com contadores/BPO

Tela dedicada para conectar a conta a um escritório de contabilidade ou BPO financeiro externo — mostra o parceiro conectado (nome, e-mail, opção desconectar) ou, se vazio, direciona para um **diretório próprio do Conta Azul de contadores parceiros** (`contaazul.com/encontre-contador`). É o mecanismo concreto por trás do perfil "Contador (Plano CA+)" do RBAC: não é um usuário comum da conta, é uma relação de parceria com aprovação bilateral.

**Implicação de modelo de negócio**: o Conta Azul não só vende para a PME — ele também constrói um canal de indicação com contadores (que por sua vez indicam o Conta Azul pros seus clientes). É um padrão de distribuição B2B2B que pode valer a pena considerar: se o público for genérico, contadores/escritórios de contabilidade são um canal de aquisição natural, igual ou mais importante que venda direta.

## 6. Loja de aplicativos — o Conta Azul terceiriza o que não constrói fundo

Marketplace com **~50 integrações em 16 categorias**, cada app rotulado por modelo de preço (Plano pago / Teste grátis / Freemium). As categorias mais reveladoras:

- **Dashboards, relatórios e BI** (11 apps — a categoria mais populosa: BIWISE, Chat BI, Controladoria Digital, Data4Company, Koredash, Ultradash, Vizul, WowBPO, etc.) — confirma que, apesar do catálogo de ~25 relatórios nativos que já mapeamos, **existe demanda real por BI mais avançado que o próprio Conta Azul não tenta resolver internamente** — terceiriza para parceiros.
- **Régua de cobrança e gestão da inadimplência** (Avisa App, IRecebi, Kolek, Quatz) — **achado crítico**: o Conta Azul tem uma tela nativa "Inadimplentes" mas ela está em **Beta** e é só um kanban de 3 estados; para régua de cobrança de verdade (fluxo automatizado de tentativas, escalonamento, negociação), eles **dependem de parceiros terceiros**. Isso valida com evidência de mercado real (múltiplos apps concorrendo nesse nicho dentro do próprio marketplace do Conta Azul) que cobrança/inadimplência é uma dor não resolvida por padrão — exatamente o território de domínio que o escritório já tem com o AutoCobr.
- **Conciliação financeira** (Conciflex) — outro sinal de que a conciliação bancária nativa não é suficiente para todo mundo.
- **Planejamento financeiro e orçamentário** (Treasy) — mesmo território do "planilha BI" que motivou este projeto: mesmo o Conta Azul reconhece que orçamento/planejamento avançado é melhor resolvido por um parceiro especializado do que pelo módulo "Orçamento" nativo.

**Leitura estratégica**: a Loja de Aplicativos é, sem querer, um mapa de "onde o líder de mercado admite que não é bom o suficiente sozinho". BI avançado, régua de cobrança, conciliação e planejamento orçamentário são categorias inteiras terceirizadas — todas dentro do escopo que este projeto já está mapeando a fundo (a planilha BI + o know-how de cobrança do escritório). Não é um sinal de "não vale a pena fazer" — é o oposto: são lacunas validadas por um mercado de apps pagos que já existe em cima da base de clientes do próprio concorrente.

---

## Índice de todos os documentos de pesquisa desta pasta

1. `mapeamento-planilha-controle-financeiro.md` — planilha BI de referência (modelo de dados, DRE, DFC, aging, ponto de equilíbrio).
2. `mapeamento-conta-azul-api.md` — API pública v2 (schema completo dos 10 domínios: Financeiro, Vendas, Pessoas, Produtos, Serviços, Notas Fiscais, Contratos, Orçamentos, Protocolos, Captura).
3. `mapeamento-conta-azul-produto-ui.md` — UX ao vivo do núcleo financeiro, relatórios e RBAC.
4. `mapeamento-conta-azul-modulos-catalogo.md` — UX ao vivo de Produtos, Serviços, Estoque, Compras.
5. `mapeamento-conta-azul-modulos-plataforma.md` (este documento) — Importações/IA, Conta PJ, Planos, Configurações fiscais, Marketplace.
