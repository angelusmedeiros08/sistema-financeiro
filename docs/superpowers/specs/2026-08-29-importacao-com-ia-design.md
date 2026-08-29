# Importação com IA — 3ª entrada da tela de Importação

**Data:** 2026-08-29

## 1. Contexto

A tela `/importacao` já tem dois fluxos reais (Lançamentos financeiros via planilha, Clientes/Fornecedores via planilha) e dois cards ainda em placeholder: "Produtos" (texto desatualizado — o módulo `/produtos-servicos` já existe desde 24/08, mas isso é outra spec) e **"Importar com IA"** ("Em breve — cole um texto ou envie um print e deixe a IA extrair os dados"). Este spec fecha o segundo.

Pedido do usuário (28/08/2026): tirar o card do "em breve". Pesquisa de apoio, não repetida aqui: `docs/pesquisa-ia-categorizacao-auto-lancamento.md` (pipeline completo de extração fiscal — usado como referência de padrões de UX/confiança, não como escopo integral desta versão).

## 2. Decisões já validadas com o usuário

- **Lote, não um lançamento por vez.** Uma única entrada (texto colado ou imagem) pode gerar vários lançamentos — ex.: print de fatura de cartão inteira, mensagem de WhatsApp listando várias despesas. A saída é sempre uma lista, nunca um único registro.
- **Provedor de IA: Claude (Anthropic API), único no sistema inteiro.** Decisão pesquisada (não só preferência) e explicitamente pedida como escolha única pra todo recurso de IA do produto (este, o Chat com IA futuro, leitura de documento futuro) — não uma escolha isolada pra esta feature. Motivo registrado: confiabilidade de JSON estruturado (evita quebrar o pipeline por saída malformada), menor taxa de alucinação de valor (crítico em dado financeiro), e infraestrutura de cache/contexto que serve tanto extração pontual quanto conversa longa futura.
- **Indicador de confiança por campo.** A IA marca quais campos ela teve menos certeza; a tela de revisão (já existente) destaca esses campos visualmente, além da validação normal.

## 3. Arquitetura — reaproveitar 3 dos 4 passos do wizard

O wizard de planilha (`/importacao/planilha`) já resolve tudo que vem **depois** de ter uma lista de linhas em formato `LinhaBruta[]`: resolução de cadastros (categoria/pessoa/centro de custo/forma de pagamento existentes ou novos), tela de revisão linha a linha, commit atômico, histórico. Este spec só substitui a **origem** dessas linhas — de "ler Excel + mapear colunas" para "IA lê texto/imagem".

Upload de imagem aceita o que o input `accept="image/*"` do navegador oferecer no aparelho — em iPhone isso inclui HEIC; a conversão pra um formato aceito pela API (JPEG) acontece no cliente antes do envio (`canvas`/`createImageBitmap`), não é responsabilidade do usuário escolher formato.

Novo wizard `ImportarIAWizard` (`/importacao/ia`), 4 etapas:

```
1. Entrada (NOVO)         2. Cadastros (reaproveitado)   3. Revisão (reaproveitado,
   cola texto ou             PassoEntidades, sem            com 1 extensão pontual)   4. Importação (reaproveitado)
   sobe imagem                mudança nenhuma                PassoPreview               PassoResultado
        │                          │                              │                          │
        ▼                          ▼                              ▼                          ▼
   Server action chama       resolve "categoria: Uber"       usuário confere/edita      commit atômico,
   Claude, devolve            contra categorias reais          cada linha antes de         mesmo de sempre
   LinhaBrutaIA[]              do tenant (existente)            importar
```

Só a etapa 1 é código novo de verdade. As etapas 2 e 4 são os componentes existentes sem alteração. A etapa 3 ganha uma extensão pontual (Seção 5).

## 4. Etapa 1 — Extração por IA

**Novo arquivo `lib/importacao/extracao-ia.ts`** (`"server-only"`, nunca roda no navegador — a chave da API Claude não pode vazar pro cliente):

```ts
export async function extrairLancamentosIA(
  entrada: { texto: string } | { imagemBase64: string; imagemMediaType: "image/jpeg" | "image/png" | "image/webp" }
): Promise<{ linhas: LinhaBrutaIA[] } | { erro: string }>
```

- Modelo: `claude-sonnet-5` (escolha explícita do usuário — custo por extração ~2,5x menor que Opus 5, aceitável pra este caso de uso dado que toda saída passa por revisão humana antes de qualquer lançamento entrar no sistema; trocar de modelo depois é uma linha de código, não um redesenho).
- Chamada via tool use com `strict: true` — o schema da ferramenta (`registrar_lancamentos_extraidos`) é um array de objetos com exatamente os campos de `LinhaBruta` (data de competência, valor, categoria, descrição, data de vencimento, data de pagamento, pessoa, documento da pessoa, centro de custo, forma de pagamento) mais `camposBaixaConfianca: string[]`. `strict: true` garante que a resposta valida contra o schema sem parsing frágil.
- Texto de entrada vai direto no prompt; imagem vai como content block `image` (base64), no mesmo request — Claude lê os dois nativamente, sem OCR separado.
- Prompt inclui a data de hoje (`hojeIsoBrasil()`) pra resolver referências relativas ("ontem", "dia 15") e instrução explícita: **nunca inventar um valor que não está no texto/imagem** — campo incerto fica vazio ou entra em `camposBaixaConfianca`, nunca um palpite apresentado como certeza.
- Zero lançamentos identificados → retorna erro amigável ("Não consegui identificar nenhum lançamento nesse texto/imagem. Tente reformular ou enviar uma imagem mais nítida."), sem avançar de etapa.

**O ponto central de segurança**: a categoria/pessoa/forma de pagamento que a IA sugere são só texto livre, exatamente como uma célula de planilha — a etapa "Cadastros" (já existente, sem mudança) é quem resolve isso contra cadastros reais do tenant ou pergunta se cria um novo. A IA nunca tem uma ferramenta de escrita no banco; ela só devolve uma estrutura de dados que entra no mesmo pipeline de validação que já existe pra Excel. Nenhum privilégio a mais que um arquivo enviado por um usuário.

**Nova rota** `app/(app)/importacao/ia/page.tsx` + `wizard.tsx` (mesmo padrão de `planilha/wizard.tsx`) + `passo-entrada-ia.tsx` (textarea pra colar texto, upload/drag-drop de imagem com preview, um ou outro por envio — nunca os dois juntos na mesma extração). Server action em `actions.ts` chama `extrairLancamentosIA`.

O card "Importar com IA" em `app/(app)/importacao/page.tsx` troca de placeholder pra `href: "/importacao/ia"`.

## 5. Extensão pontual — indicador de confiança na Revisão

`lib/importacao/tipos.ts` ganha:

```ts
export type LinhaBrutaIA = LinhaBruta & {
  camposBaixaConfianca: (keyof LinhaBruta)[];
};
```

Campo opcional, só populado por este fluxo — `planilha`/`pessoas` continuam produzindo `LinhaBruta` puro, sem essa informação, e `PassoPreview` trata a ausência como "nenhum campo de baixa confiança" (comportamento idêntico ao de hoje pros outros dois fluxos). Na tabela de revisão, a célula de um campo listado em `camposBaixaConfianca` ganha o mesmo tratamento visual (âmbar) que uma linha com aviso de duplicata já usa hoje — reaproveita o vocabulário visual existente, não introduz uma cor/ícone novo.

## 6. Dependências e configuração (a fazer antes de codar)

- Adicionar `@anthropic-ai/sdk` via `pnpm add @anthropic-ai/sdk` (nunca `npm`, ver memória do projeto).
- `ANTHROPIC_API_KEY` precisa existir em `.env.local` (dev) e nas variáveis de ambiente da Vercel (produção) — **isso é o usuário quem cria e cola**, em `console.anthropic.com`, não algo que eu faço por ele.

## 7. Testes planejados

- Texto colado simples ("Paguei 45 reais de Uber ontem") → 1 linha, categoria "Transporte"/"Uber" sugerida, data resolvida corretamente a partir de "ontem".
- Texto com várias linhas (lista tipo WhatsApp) → várias linhas, cada uma com seus próprios campos.
- Imagem de um comprovante real (screenshot) → extrai valor/data/estabelecimento corretamente.
- Caso de baixa confiança forçado (imagem borrada ou texto ambíguo) → campo aparece marcado na Revisão.
- Zero lançamentos identificáveis (texto sem nenhum dado financeiro) → erro amigável, sem quebrar o wizard.
- Confirmar que a Etapa 2 (Cadastros) resolve corretamente uma categoria sugerida pela IA que já existe no tenant, e oferece criar uma nova quando não existe — mesmo comportamento já testado no fluxo de planilha.
- Responsivo mobile + desktop na nova tela de Entrada (upload de imagem e textarea).

## 8. Fora de escopo

- Pipeline fiscal completo (XML de NF-e/NFS-e, validação contra SEFAZ, three-way match) — é a "Captura de documento por IA" já pesquisada em `docs/pesquisa-ia-categorizacao-auto-lancamento.md`, escopo maior, ciclo futuro.
- Limite de uso por tenant (rate limit/cota de custo) — cada extração tem custo real de API; revisar antes de abrir pra usuários reais em produção, junto do item já pendente de SMTP de produção.
- Detecção de duplicata entre a mesma imagem enviada duas vezes (a checagem de duplicata por data já existente no `PassoPreview` continua valendo, mas não há deduplicação específica de "mesmo arquivo/imagem" nesta versão).
- Aprendizado por tenant (a IA não fica mais precisa com o tempo nem usa correções passadas como contexto) — cada extração é isolada.
