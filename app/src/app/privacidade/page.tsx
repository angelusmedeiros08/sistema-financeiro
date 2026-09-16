import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal, SecaoLegal as Secao } from "@/components/legal/pagina-legal";
import { TERMOS_VERSAO } from "@/lib/legal/termos";

const ATUALIZADO_EM = "16 de setembro de 2026";

export const metadata: Metadata = {
  title: "Política de Privacidade — Finanssi",
};

export default function PaginaPrivacidade() {
  // Mesmo canal já usado no mailto: de /assinatura-pendente — sem endereço
  // novo pra manter, um só e-mail de contato pro sistema inteiro.
  const contatoDadosPessoais = process.env.BREVO_SENDER_EMAIL;

  return (
    <PaginaLegal titulo="Política de Privacidade">
      <p className="text-sm text-muted-foreground">
        Versão {TERMOS_VERSAO}, atualizado em {ATUALIZADO_EM}
      </p>

      <Secao titulo="1. Quais dados coletamos">
        <p>Para operar o Finanssi, coletamos e tratamos os seguintes dados:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados de cadastro: nome, e-mail, CPF ou CNPJ, nome da empresa.</li>
          <li>
            Dados financeiros que você insere no sistema: lançamentos, contas a pagar e receber, vendas, documentos
            importados (extratos, recibos, notas fiscais).
          </li>
          <li>
            Dados de pessoas cadastradas por você (clientes e fornecedores), incluindo nome, CPF ou CNPJ, contato e
            endereço. Sua empresa é a controladora desses dados, e o Finanssi trata como operadora.
          </li>
          <li>
            Conteúdo trocado com os recursos de Inteligência Artificial (Chat IA e Importação com IA), incluindo
            documentos enviados para extração de dados.
          </li>
        </ul>
      </Secao>

      <Secao titulo="2. Finalidade e base legal">
        <p>
          Tratamos esses dados para prestar o serviço contratado (execução de contrato, art. 7º, V, da LGPD), ou seja,
          para que o Finanssi funcione como sua ferramenta de gestão financeira. Também tratamos dados de uso e
          técnicos por legítimo interesse (art. 7º, IX), para manter a segurança, prevenir fraude e melhorar o
          sistema.
        </p>
      </Secao>

      <Secao titulo="3. Com quem compartilhamos dados">
        <p>
          Não vendemos seus dados. Compartilhamos dados apenas com prestadores de serviço (operadores) estritamente
          necessários para o funcionamento do Finanssi:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Supabase</strong>: banco de dados e hospedagem dos seus dados.
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong>: hospedagem da aplicação.
          </li>
          <li>
            <strong className="text-foreground">Brevo</strong>: envio de e-mails transacionais (convites, alertas,
            recuperação de senha).
          </li>
          <li>
            <strong className="text-foreground">Asaas</strong>: processamento de pagamento da sua assinatura. Não
            temos acesso aos dados do seu cartão.
          </li>
          <li>
            <strong className="text-foreground">Anthropic</strong>: provedor de IA por trás do Chat IA e da
            Importação com IA. Conteúdo enviado a esses recursos é processado para gerar a resposta ou extração
            solicitada.
          </li>
        </ul>
      </Secao>

      <Secao titulo="4. Seus direitos como titular de dados">
        <p>Conforme o art. 18 da LGPD, você tem direito a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Confirmar a existência de tratamento dos seus dados.</li>
          <li>Acessar seus dados.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
          <li>Solicitar a portabilidade dos seus dados a outro fornecedor.</li>
          <li>Revogar o consentimento, quando aplicável.</li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
          {contatoDadosPessoais ? (
            <a href={`mailto:${contatoDadosPessoais}`} className="font-medium text-foreground underline underline-offset-4">
              {contatoDadosPessoais}
            </a>
          ) : (
            "informado no rodapé das nossas comunicações"
          )}
          . Seu pedido será atendido manualmente, dentro dos prazos previstos na LGPD.
        </p>
      </Secao>

      <Secao titulo="5. Retenção de dados">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Se a assinatura for cancelada, seus dados não são
          apagados automaticamente. Ficam preservados, e inacessíveis, até uma eventual solicitação de exclusão ou
          reativação da conta, respeitando também obrigações legais de guarda de dado financeiro e contábil.
        </p>
      </Secao>

      <Secao titulo="6. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo controle de acesso por
          empresa (cada cliente só acessa os próprios dados), criptografia em trânsito e boas práticas de
          desenvolvimento seguro. Nenhum sistema é 100% livre de risco, e trabalhamos continuamente para reduzi-lo.
        </p>
      </Secao>

      <Secao titulo="7. Alterações desta política">
        <p>
          Podemos atualizar esta Política de Privacidade periodicamente. A data e a versão no topo desta página
          indicam a última atualização.
        </p>
      </Secao>

      <Secao titulo="8. Contato do controlador">
        <p>
          Para dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em contato pelo e-mail{" "}
          {contatoDadosPessoais ? (
            <a href={`mailto:${contatoDadosPessoais}`} className="font-medium text-foreground underline underline-offset-4">
              {contatoDadosPessoais}
            </a>
          ) : (
            "informado no rodapé das nossas comunicações"
          )}
          .
        </p>
      </Secao>

      <p className="text-sm text-muted-foreground">
        Veja também os nossos{" "}
        <Link href="/termos" className="font-medium text-foreground underline underline-offset-4">
          Termos de Uso
        </Link>
        .
      </p>
    </PaginaLegal>
  );
}
