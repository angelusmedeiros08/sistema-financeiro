import type { Metadata } from "next";
import Link from "next/link";
import { DESCRICAO_PLANO, TRIAL_DIAS, VALOR_PLANO_MENSAL } from "@/lib/pagamentos/plano";
import { formatarMoeda } from "@/lib/formatacao";
import { PaginaLegal, SecaoLegal as Secao } from "@/components/legal/pagina-legal";
import { TERMOS_VERSAO } from "@/lib/legal/termos";

const ATUALIZADO_EM = "16 de setembro de 2026";

export const metadata: Metadata = {
  title: "Termos de Uso — Finanssi",
};

export default function PaginaTermos() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <p className="text-sm text-muted-foreground">
        Versão {TERMOS_VERSAO} — atualizado em {ATUALIZADO_EM}
      </p>

      <Secao titulo="1. Quem somos e o que é o Finanssi">
        <p>
          O Finanssi é um sistema de gestão financeira (ERP financeiro) oferecido como serviço (SaaS) para empresas e
          profissionais, permitindo controle de lançamentos, contas a pagar e receber, vendas, relatórios financeiros,
          importação de dados e outras funcionalidades relacionadas à gestão financeira do seu negócio.
        </p>
        <p>
          Estes Termos de Uso regulam a relação entre o Finanssi (&quot;nós&quot;) e a empresa ou profissional que
          contrata o serviço (&quot;você&quot;, &quot;cliente&quot;, &quot;tenant&quot;). Ao criar uma conta ou usar o
          Finanssi, você concorda com estes termos.
        </p>
      </Secao>

      <Secao titulo="2. Cadastro e assinatura">
        <p>
          O cadastro exige informações verídicas sobre você e sua empresa, incluindo CPF ou CNPJ válido. O plano atual
          é {DESCRICAO_PLANO}, no valor de {formatarMoeda(VALOR_PLANO_MENSAL)}/mês, com {TRIAL_DIAS} dias de teste
          gratuito para assinaturas via cartão de crédito.
        </p>
        <p>
          A cobrança é recorrente e processada pelo Asaas, nosso parceiro de processamento de pagamentos. Não
          armazenamos dados do seu cartão — eles são coletados diretamente pelo ambiente seguro do Asaas.
        </p>
        <p>
          Você pode cancelar a assinatura a qualquer momento pela tela de Configurações &gt; Assinatura. O cancelamento
          mantém o acesso ao sistema até o fim do período já pago (carência); depois disso, o acesso é bloqueado até
          uma nova contratação, sem que seus dados sejam apagados.
        </p>
      </Secao>

      <Secao titulo="3. Suas obrigações">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fornecer dados verídicos no cadastro e mantê-los atualizados.</li>
          <li>Usar o Finanssi apenas para fins lícitos, dentro da gestão financeira legítima do seu negócio.</li>
          <li>Manter a confidencialidade das credenciais de acesso da sua conta e da sua equipe.</li>
          <li>Não tentar contornar limites técnicos ou de segurança do sistema.</li>
        </ul>
      </Secao>

      <Secao titulo="4. Recursos de Inteligência Artificial">
        <p>
          O Finanssi oferece recursos de IA (Chat IA e Importação com IA) que auxiliam na leitura de documentos e na
          sugestão de lançamentos financeiros. É importante entender como isso funciona:
        </p>
        <p>
          <strong className="text-foreground">A IA nunca executa uma ação financeira sozinha.</strong> Toda sugestão
          gerada pela IA — seja um lançamento extraído de um extrato, uma proposta de categorização, ou qualquer outra
          ação — é apresentada para sua conferência e só se torna um registro real depois da sua confirmação explícita.
          Você é sempre responsável por revisar o que a IA sugere antes de aprovar.
        </p>
        <p>
          O uso dos recursos de IA está sujeito a uma cota mensal, dimensionada para o uso normal do plano contratado.
        </p>
      </Secao>

      <Secao titulo="5. Propriedade intelectual">
        <p>
          O software, marca, layout e demais elementos do Finanssi são de nossa propriedade ou licenciados a nós. Os
          dados que você insere no sistema (lançamentos, cadastros, documentos importados) continuam sendo seus — não
          reivindicamos propriedade sobre o conteúdo financeiro da sua empresa.
        </p>
      </Secao>

      <Secao titulo="6. Limitação de responsabilidade">
        <p>
          O Finanssi é uma ferramenta de apoio à gestão financeira. Você continua responsável pela exatidão dos dados
          inseridos, pelas decisões financeiras, fiscais e contábeis tomadas com base nas informações do sistema, e
          pela conferência de qualquer sugestão gerada por recursos de IA antes de confirmá-la.
        </p>
        <p>
          Fazemos esforços razoáveis para manter o serviço disponível e seguro, mas não garantimos operação
          ininterrupta ou livre de falhas. Na extensão permitida por lei, não respondemos por danos indiretos
          decorrentes do uso do sistema.
        </p>
      </Secao>

      <Secao titulo="7. Rescisão">
        <p>
          Podemos suspender ou encerrar o acesso em caso de inadimplência, uso indevido ou violação destes termos, com
          aviso prévio sempre que razoavelmente possível. Você pode encerrar sua conta a qualquer momento, conforme
          descrito na seção 2.
        </p>
      </Secao>

      <Secao titulo="8. Alterações destes termos">
        <p>
          Podemos atualizar estes Termos de Uso periodicamente, para refletir mudanças no serviço ou na legislação. A
          data e a versão no topo desta página indicam a última atualização.
        </p>
      </Secao>

      <Secao titulo="9. Foro">
        <p>
          Fica eleito o foro da comarca do domicílio da empresa responsável pelo Finanssi para dirimir eventuais
          controvérsias decorrentes destes termos, com renúncia a qualquer outro, por mais privilegiado que seja.
        </p>
      </Secao>

      <p className="text-sm text-muted-foreground">
        Veja também a nossa{" "}
        <Link href="/privacidade" className="font-medium text-foreground underline underline-offset-4">
          Política de Privacidade
        </Link>
        .
      </p>
    </PaginaLegal>
  );
}
