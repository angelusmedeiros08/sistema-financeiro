# Pesquisa — Infraestrutura fiscal eletrônica brasileira (NF-e/NFS-e/NFC-e)

Mapa técnico de onde a nota fiscal brasileira já é 100% estruturada/grátis via integração padrão, e onde termina essa camada e começa a necessidade real de IA/OCR.

---

## 1. NF-e — 100% estruturada, sem OCR necessário

XML assinado digitalmente, layout público mantido pela SEFAZ nacional: identificação, emitente (CNPJ/IE/regime), destinatário, itens (código, descrição, NCM, CFOP, quantidade, valores), tributação por item (ICMS/IPI/PIS/COFINS com CST/CSOSN, e desde 2026 grupos de CBS/IBS da Reforma Tributária), totais, transporte, chave de acesso de 44 dígitos + protocolo SEFAZ. **Com o XML em mãos, não há ambiguidade nenhuma para IA resolver — é parsing direto.** O problema real é conseguir o XML.

## 2. Manifestação do Destinatário + Distribuição DFe — o mecanismo por trás do "Trazer NF-e da Sefaz" do Conta Azul

**Distribuição DFe** (`NFeDistribuicaoDFe`, webservice nacional SOAP): qualquer ator com interesse legítimo numa nota (emitente, destinatário, transportador, terceiro autorizado) pode consultá-la, autenticado por certificado digital e-CNPJ/e-CPF (cobre qualquer filial via CNPJ-base). Consulta por NSU incremental ou por chave específica; retorna resumos, eventos e o **XML completo**. Gratuito (custo é só a integração). Documentos disponíveis por até 90 dias.

**Manifestação do Destinatário**: evento que o destinatário registra sobre a nota — Ciência da Operação, Confirmação, Operação não Realizada, Desconhecimento — prazo de 180 dias, e em muitos estados é pré-requisito pro acesso ao XML completo via Distribuição DFe.

**Combinados, permitem que um SaaS com o certificado digital do cliente busque automaticamente todas as NF-e emitidas contra o CNPJ dele, sem o emissor precisar mandar nada** — exatamente o "Trazer NF-e da Sefaz" que já mapeamos no Conta Azul.

## 3. NFS-e — de fragmentação municipal para padrão nacional

Legado: ~5.570 municípios, cada um com layout próprio (padrão ABRASF era adoção parcial). **NFS-e Nacional / Ambiente de Dados Nacional (ADN)**: dois modelos de adesão municipal (API ao ADN, ou emissor público gratuito nacional). APIs de produção liberadas em 1º/out/2025, obrigatoriedade nacional a partir de jan/2026. Cobertura em dez/2025: **97% da população, 90% da arrecadação de ISS, todas as capitais aderidas**. A partir de 1º/jul/2026 a API nacional deixa de gerar o DANFSe — passa a ser responsabilidade dos sistemas emissores. Ainda resta cauda longa de municípios pequenos fora do ADN, onde gateways com homologação município-a-município continuam relevantes.

## 4. NFC-e

Nota de varejo/consumidor final presencial, substitui o cupom fiscal — regulada por SEFAZ estadual (ICMS), diferente da NFS-e (municipal, ISS). Mesma lógica estrutural de XML da NF-e.

## 5. Gateways fiscais — comparativo

| Gateway | Cobertura/recursos | Preço | Observação |
|---|---|---|---|
| **Focus NFe** | NFe/NFSe/NFCe/CTe/MDFe/NFCom; >3.000 prefeituras; produto dedicado **API MDe** para manifestação do destinatário | Solo R$89,90/mês (100 notas); Start R$113,90; Growth R$548 (4.000 notas); Enterprise sob consulta. Sem setup, sem fidelidade | Preços públicos e previsíveis — bom pra modelar unit economics |
| **PlugNotas (Tecnospeed)** | NFe/NFCe/NFSe/NFCom/MDFe/CTe; >2.000 cidades homologadas, 153 padrões | Não publicado | Empresa mais consolidada do setor; já é fornecedor nosso via Open Finance |
| **eNotas** | NFSe/NFe, foco em produtos digitais (Hotmart, Kiwify, Shopify) | Não publicado | Foco em emissão de saída, não em consumir notas recebidas |
| **Nuvem Fiscal** | API completa incl. manifestação | — | **Será desativada em 31/07/2026** — não recomendar |
| **Tecnospeed** | = PlugNotas (mesma empresa) | — | — |

## 6. Conclusão: onde termina o grátis estruturado e começa a IA de verdade

**Estruturado, sem OCR**: NF-e/NFC-e via Distribuição DFe + Manifestação do Destinatário (certificado digital do cliente); NFS-e de município já no ADN (~97% da população). PDF não é conversível de forma determinística — é só representação gráfica.

**Onde entra IA/OCR real**: (1) fornecedor pequeno que só manda PDF do DANFE ou imagem, sem XML disponível; (2) NFS-e de município ainda fora do ADN sem gateway homologado; (3) boletos, comprovantes, faturas de cartão — nunca foram XML fiscal estruturado (é o caso de uso central do Conta AI Captura); (4) faturas/recibos estrangeiros, fora do universo SEFAZ/ADN por definição; (5) nota originalmente estruturada mas recebida como imagem/scan via WhatsApp/e-mail, perdendo o acesso "de graça" ao XML.

## Recomendação de arquitetura em camadas

- **Camada 1 (fundação, sem IA)**: Distribuição DFe/Manifestação do Destinatário + API NFS-e Nacional.
- **Camada 2 (gateway)**: **Focus NFe para começar** (preços públicos, produto MDe maduro, sem risco de descontinuação como a Nuvem Fiscal); cotar também PlugNotas/Tecnospeed por já ser parceiro nosso em Open Finance.
- **Camada 3 (IA/OCR)**: reservar exclusivamente para os casos sem XML disponível (boletos, comprovantes, notas estrangeiras, cauda longa municipal) — reduzindo a superfície de risco de erro em campo fiscal crítico ao mínimo necessário.

## Fontes
[Dattos — XML de NF-e](https://www.dattos.com.br/en/blog/xml-de-nf-e) · [Tecnospeed — NT 2025.002](https://blog.tecnospeed.com.br/nota-tecnica-reforma-tributaria-nfe-nfce/) · [Tributos.io — NFeDistribuicaoDFe](https://tributos.io/blog/legislacao-e-normas/nfedistribuicaodfe-consulta-df-e-para-emitentes-e-destinatarios) · [Focus NFe — API MDe](https://focusnfe.com.br/manifestacao-destinatario-mde/) · [Diário do Sudoeste — NFS-e Nacional 2026](https://diariodosudoeste.com.br/nfs-e-nacional-sera-obrigatoria-para-municipios-em-2026/) · [Ajuda Omie — Ambiente Nacional NFS-e](https://ajuda.omie.com.br/pt-BR/articles/12270528-ambiente-nacional-da-nfs-e-o-que-muda-a-partir-de-2026) · [Portal gov.br/nfse](https://www.gov.br/nfse/pt-br) · [Focus NFe — preços](https://focusnfe.com.br/precos/) · [PlugNotas NFSe](https://plugnotas.com.br/nfse/) · [Fórum ACBr — desativação Nuvem Fiscal](https://www.projetoacbr.com.br/forum/topic/91922-comunicado-de-desativa%C3%A7%C3%A3o-do-servi%C3%A7o-nuvem-fiscal-22042026/)
