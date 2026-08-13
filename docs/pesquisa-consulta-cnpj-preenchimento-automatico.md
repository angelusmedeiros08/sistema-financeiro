# Pesquisa — API de consulta pública de CNPJ para preenchimento automático de cadastro

Pesquisa externa (13/08/2026) pra decidir como buscar dados cadastrais de uma pessoa jurídica a partir do CNPJ digitado, no mesmo espírito do autopreenchimento de endereço via CEP já implementado (`lib/cep.ts`, `components/formularios/campos-endereco.tsx`).

## 1. Não existe API pública oficial da Receita Federal

A Receita Federal não expõe uma API pública de consulta individual de CNPJ. O dado é público (Cadastro Nacional da Pessoa Jurídica é aberto por lei), mas distribuído como **arquivo bruto mensal** (dump completo do cadastro). Todo serviço de "consulta CNPJ" do mercado (BrasilAPI, ReceitaWS, CNPJ.ws, CNPJá, OpenCNPJ, minhaReceita) é um terceiro que baixa esse dump e expõe como API — nenhum é "a fonte oficial", todos são espelhos do mesmo dado público.

## 2. Comparativo das opções gratuitas testadas

| Serviço | Autenticação | Limite (plano grátis) | Cobertura de campos | CORS (uso client-side) |
|---|---|---|---|---|
| **BrasilAPI** | Nenhuma | Sem limite fixo publicado, só bloqueio de abuso | Rica: razão social, nome fantasia, endereço completo já separado por campo (logradouro/número/complemento/bairro/município/UF/CEP), telefone, e-mail, situação cadastral, natureza jurídica, CNAE, porte, Simples/MEI | **Sim** (`access-control-allow-origin: *`, confirmado ao vivo) |
| OpenCNPJ | Nenhuma | ~50 req/s por IP (o mais permissivo) | Boa, mas endereço menos padronizado que a BrasilAPI nos testes | Não confirmado |
| ReceitaWS | Nenhuma (grátis) | 3 requisições/minuto | Similar à BrasilAPI | Não verificado |
| CNPJ.ws | Nenhuma (grátis) | 3 requisições/minuto | Similar | Não verificado |
| CNPJá | Nenhuma (grátis) | 5 requisições/minuto | Rica, tem plano pago com mais volume | Não verificado |

**Testado ao vivo** (`curl https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, CNPJ real da Nu Pagamentos): resposta HTTP 200, JSON completo com todos os campos relevantes já separados, CORS aberto — funciona chamado direto do navegador, mesmo padrão do ViaCEP.

## 3. Recomendação: BrasilAPI

Mesma lógica da escolha do ViaCEP: gratuita, sem chave, mantida por comunidade ativa (é a mesma família de projeto que também serve CEP, feriados, tabela FIPE, bancos — já um nome conhecido no ecossistema BR), sem limite de taxa restritivo pro nosso volume esperado, e o formato de resposta já vem com os campos de endereço separados exatamente como `ValoresEndereco` espera — menos parsing que os concorrentes, que em alguns casos devolvem endereço como string única.

Único ponto de atenção pra escala (centenas/milhares de usuários, conforme a preocupação que motivou a pergunta): BrasilAPI **não publica um limite fixo**, o que é bom pro dia 1 mas é um risco não quantificado — se o volume de consultas de CNPJ crescer muito (ex.: campanha de onboarding em massa), vale reavaliar um plano pago (CNPJá ou ReceitaWS Pro chegam a 2.000 req/min) ou colocar um cache simples no nosso lado (o CNPJ de uma empresa não muda todo dia — cachear resposta por, digamos, 30 dias evita bater na API de novo pro mesmo CNPJ).

## 4. Onde isso entra no cadastro de pessoas

Mapeamento direto pros campos já existentes em `pessoas` e no endereço:

| Campo da API (BrasilAPI) | Campo no sistema |
|---|---|
| `razao_social` (ou `nome_fantasia` se preenchido) | `pessoas.nome` |
| CNPJ digitado | `pessoas.documento` |
| `email` | `pessoas.email` |
| `ddd_telefone_1` | `pessoas.telefone` |
| — (sempre) | `pessoas.natureza = 'JURIDICA'` |
| `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf`, `cep` | endereço via `CamposEndereco` (mesmo componente do CEP) |
| `descricao_situacao_cadastral` (ex.: "ATIVA", "BAIXADA", "SUSPENSA") | não vira campo salvo — só um aviso na tela se vier diferente de "ATIVA", pra sinalizar CNPJ baixado/irregular antes de cadastrar |

**UX proposta**: campo de documento no formulário de pessoa já filtra por `natureza`/quantidade de dígitos — quando o usuário digita um CNPJ completo (14 dígitos) e sai do campo, dispara a busca (mesmo padrão de `onBlur` do CEP), preenche nome/e-mail/telefone/endereço automaticamente, e mostra um aviso não bloqueante se a situação cadastral não for "ATIVA". CPF (11 dígitos) não dispara nada — não existe API pública de consulta de CPF (dado protegido por LGPD, exige autenticação/consentimento), então pessoa física continua com preenchimento manual.

## 5. Escopo da implementação (quando aprovada)

Mesmo formato reutilizável já estabelecido pro CEP:
- `lib/cnpj.ts` — função `buscarEmpresaPorCnpj(cnpj)` client-side, sem chave.
- Cache simples opcional (ex.: sessionStorage) pra não repetir a chamada se o usuário digitar o mesmo CNPJ duas vezes na mesma sessão.
- Só entra no formulário de **criação** de pessoa (`PessoaForm` modo `"criar"`) — em edição, sobrescrever nome/endereço de um cadastro já existente e possivelmente já customizado pelo usuário é mais arriscado que ajuda; se quiser "ressincronizar" um cadastro existente, isso é uma ação explícita separada ("Atualizar dados via Receita"), não um efeito colateral de editar outro campo.

## Fontes

- [BrasilAPI](https://brasilapi.com.br/)
- [API de consulta de CNPJ: 8 opções comparadas (guia 2026)](https://blog.hubdodesenvolvedor.com.br/api-de-consulta-de-cnpj/)
- [OpenCNPJ: API gratuita e sem limites](https://casado.dev/noticias/consultar-cnpjs-api-gratuita-opencnpj)
- [CNPJ.ws — API de Consulta de CNPJ](https://www.cnpj.ws/pt-BR)
- [CNPJá — API de Consulta CNPJ](https://cnpja.com/en/api)
- [CNPJ – Consulta de Empresas — Catálogo de APIs governamentais (gov.br)](https://www.gov.br/conecta/catalogo/apis/consulta-cnpj)
- Teste ao vivo: `curl https://brasilapi.com.br/api/cnpj/v1/18236120000158` (13/08/2026)
