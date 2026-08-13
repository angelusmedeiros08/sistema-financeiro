# Pesquisa — Open Finance Brasil e conectividade bancária

Pesquisa externa para embasar a decisão de como o sistema vai obter dado bancário: lançamento manual/captura por IA (como o Conta Azul promove na UI) vs. conexão automática via Open Finance.

---

## Achado mais importante — corrige uma premissa nossa

**O Conta Azul já não depende só de lançamento manual/captura por IA.** Confirmado nos Termos de Uso públicos: a Pluggy "atua na qualidade de parceira tecnológica e subcontratada" do Conta Azul, recebendo credenciais/autorização via Open Finance e devolvendo extrato/saldo/dados de conta para a plataforma. A **Conta PJ** (conta digital própria, que mapeamos antes) é uma linha de produto **separada** (movimentação financeira própria) — não é o mecanismo pelo qual eles conciliam extratos de bancos de terceiros. A Omie está no mesmo caminho (parceria de Open Finance anunciada com Banco do Brasil, Santander e Itaú).

Isso muda a pergunta de "devemos usar Open Finance em vez de conta PJ própria" para: **"devemos nascer com Open Finance no dia 1, já que é o padrão de fato dos dois maiores concorrentes"**.

## 1. Open Finance Brasil — o padrão regulatório

Iniciativa regulada pelo Banco Central desde 2021. Uma empresa (PJ) pode compartilhar, mediante consentimento explícito e revogável (validade típica 3-12 meses): dados cadastrais, dados de conta (extrato, saldo, limites), cartão de crédito, operações de crédito e investimentos.

Sem custo para quem consome via consentimento do cliente final. Custo de governança existe só para **instituições participantes diretas** (regras por faixa de patrimônio líquido, IN BCB 485/2024) — não é custo de quem usa agregador.

Escala 2026: 700+ instituições participantes, ~55 milhões de usuários ativos, cobertura próxima de 100% da população bancarizável — o mercado de Open Finance mais abrangente do mundo.

**Virar participante direto** (sem intermediário) exige autorização do Bacen como instituição financeira/de pagamento: capital mínimo recém-elevado de R$ 1 milhão para **R$ 30 milhões**, processo de 1-2 anos.

## 2. Pluggy — o agregador que o Conta Azul usa

- API única padronizada (saldo, extrato, cartões, investimentos, identidade) de "qualquer banco do Brasil", SDKs prontos (Node/Python/.NET/Java), webhooks para sincronização incremental sem polling.
- **Categorização automática pronta**: enriquecimento via ML treinado em dados brasileiros — categoria/subcategoria, nome limpo do estabelecimento, detecção de recorrência (assinaturas/contas fixas), sem precisar escrever regra própria.
- Autorizada pelo Bacen como **Iniciadora de Transação de Pagamento (ITP)** — já fez o credenciamento regulatório que levaria 1-2 anos e R$ 30 milhões pra fazer sozinho.
- **Preço**: plano Dados a partir de **R$ 2.500/mês** (Open Finance + acesso direto a banco + saldo/extrato/cartão/investimento + KYC + webhooks + categorização), plano Pagamentos (Pix) a partir de R$ 500/mês, excedente cobrado por requisição acima do volume incluso. Sandbox gratuito sem cartão de crédito. Existe "Meu Pluggy" grátis, mas só para uso pessoal — uso comercial vedado.

## 3. Belvo — comparação

Atua em toda a América Latina, foco forte em dado de PJ/empresa, sem infraestrutura bancária própria tão integrada quanto a Pluggy. Preço reportado por desenvolvedores em torno de **R$ 6.000/mês** (piso), ~2,4x mais caro que a Pluggy. Melhor cobertura de dado PJ complexo, mas mais caro e menos "tudo em um".

## 4. Outros agregadores

**Klavi** (400M+ transações processadas, 4-5 milhões de conexões, rodada Série A de US$15M) e **Quanto** (já com licença própria de ITP) — concorrentes diretos entre si, focados em geração de insight de crédito. **Tecnospeed** — opção mais barata reportada (~R$1.500 de entrada + R$540/mês), historicamente mais forte em nota fiscal, expandindo pra Open Finance.

## 5. Como Conta Azul e Omie usam Open Finance hoje

**Conta Azul**: importa extrato automaticamente de bancos reais do cliente sem exigir conta digital própria. Cobertura curada: Sicoob, Nubank, Banco do Brasil, Bradesco, Inter, C6, Itaú, Santander, Sicredi, Caixa (não é "qualquer banco", é uma lista dos ~10 maiores). Fluxo: autentica no banco via Pluggy (D-1, às vezes até 48h) → volta pro Conta Azul → conciliação automática por regras de correspondência (valor+data exatos, ou valor igual com até 5 dias de tolerância). OFX manual continua existindo como fallback.

**Omie**: mesma direção — Open Finance com BB/Santander/Itaú, mais integrações legadas via CNAB/API direta pros bancos que ainda não estão no rol.

**Conclusão prática**: os dois líderes já rodam sobre agregador terceirizado, cobrindo os bancos de maior volume de PME, com importação manual/OFX como rede de segurança pra cauda longa.

## 6. Categorização automática — como funciona

Pipeline padrão de mercado (Pluggy, Plaid, Belvo, Salt Edge): normaliza descrição bruta do banco → resolve nome do estabelecimento → classifica via modelo de ML treinado em grande volume rotulado → devolve categoria + subcategoria + merchant limpo + flag de recorrência. Pluggy entrega isso pronto via API — não precisa treinar nada nem escrever árvore de regras (que é o que sistemas menos maduros fazem, e falha em nomes de estabelecimento ambíguos). Referência de escala: Plaid (equivalente americano) processa ~800 milhões de transações/dia — tecnologia madura, não pesquisa em estágio inicial.

## 7. Trade-off: agregador vs. credenciamento direto

| Dimensão | Agregador (Pluggy/Belvo) | Credenciamento direto |
|---|---|---|
| Tempo até 1º extrato | Dias a semanas | 1–2 anos |
| Capital regulatório | Zero (embutido na assinatura) | R$ 30 milhões (novo licenciado) |
| Custo recorrente | R$ 2.500–6.000/mês + excedente | Compliance/DPO/auditoria fixos, altos |
| Cobertura de bancos | Ampla mas curada | Você negocia cada integração |
| Controle técnico | Baixo (depende do fornecedor) | Alto |
| Risco regulatório | Baixo, transferido ao agregador | Alto, permanente, interno |
| Adequação a MVP novo | Alta | Baixa — inviável pra empresa nascente |

Construir credenciamento direto só se justifica pra quem já é instituição de pagamento em escala de milhões de usuários — nem o Conta Azul (scale-up bem capitalizada) fez esse caminho pra conciliação bancária.

---

## Recomendação

**Nascer conectado a Open Finance via agregador desde o dia 1**, com desenho híbrido (não aposta exclusiva):

1. Não é mais "prematuro" — é o padrão de fato do setor; o próprio Conta Azul já roda sobre Pluggy. Lançar sem isso significa UX pior que o incumbente desde o dia 1 ("conecto meu banco e pronto" vs. "preciso lançar/tirar foto de boleto").
2. Custo é administrável para SaaS B2B recorrente: piso de R$2.500/mês da Pluggy coberto por ~15-25 clientes pagantes num plano médio de R$100-150/mês (verificar excedente por requisição com o comercial antes de fechar).
3. Categorização automática vem embutida, eliminando parte do trabalho de ML/regras que hoje é gargalo de UX no "lançamento manual + IA de documento" (que resolve boleto/nota, não o extrato em si).
4. **Não tentar replicar a Conta PJ regulada própria** como pré-requisito — caminho de 1-2 anos e R$30 milhões, e nem é necessário: dá pra conciliar automaticamente plugando no banco que o cliente já usa, sem forçar migração de conta.
5. Manter captura por IA/lançamento manual como **rede de segurança**, não mecanismo primário: cauda longa de bancos regionais fora do agregador, documentos que não passam pelo banco (boleto a pagar antes de vencer, nota fiscal, contrato), e clientes que não querem conectar via Open Finance.
6. Fornecedor primário sugerido: **Pluggy** (melhor DX, sandbox grátis, preço de entrada mais baixo, já validado em produção com Conta Azul em escala PME-BR). Belvo como opção secundária de cobertura ou plano B comercial.

## Fontes
- [Open Finance Brasil — Quem Participa](https://openfinancebrasil.org.br/quem-participa/) · [Custos do Open Finance](https://openfinancebrasil.org.br/2022/11/17/custos-do-open-finance/)
- [Pluggy — Preços](https://www.pluggy.ai/precos) · [Pluggy API](https://www.pluggy.ai/produtos/pluggy-api) · [Enriquecimento de Dados](https://www.pluggy.ai/produtos/enriquecimento-de-dados) · [Webhooks](https://docs.pluggy.ai/docs/webhooks)
- [Conta Azul — Termos de Uso Integração Pluggy](https://contaazul.com/termos/pluggy/) · [Bancos homologados](https://ajuda.contaazul.com/hc/pt-br/articles/46018984858893) · [Como funciona a integração](https://ajuda.contaazul.com/hc/pt-br/articles/22052814567565)
- [Omie — Reforça atuação em Open Finance](https://www.omie.com.br/blog/omie-reforca-atuacao-no-open-finance-e-amplia-parceria-com-bancos/)
- [Belvo — Licença Open Finance quanto custa](https://belvo.com/pt-br/blog/licenca-open-finance-quanto-custa-quando-vale-fintechs/)
- [TabNews — comparação de custos Pluggy/Belvo/Tecnospeed](https://www.tabnews.com.br/GuilhermeVieira/estou-desenvolvendo-um-app-de-financas-pessoais-e-nao-consigo-pagar-o-open-finance-pluggy-r2-5k-mes-belvo-r6k-mes-tecnospeed-r1-5k-de-entrada-r540)
- [Klavi — 5 milhões de conexões](https://klavi.ai/blog/klavi-5-milhoes-conexoes-open-finance)
