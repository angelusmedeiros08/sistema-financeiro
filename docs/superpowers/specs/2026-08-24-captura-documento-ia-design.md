# Captura de documento por IA

## Contexto

Nenhum concorrente brasileiro de PME (Omie, Bling, Nibo, Tiny, eGestor) replica o modelo "sobe boleto/nota/comprovante → IA extrai → sugestão de lançamento pronta pra revisão" que a Conta Azul construiu ("Conta AI Captura") — é uma lacuna real de mercado, confirmada por pesquisa extensa (`docs/pesquisa-captura-documento-ia-*.md`, 4 rodadas, ~90 fontes). O usuário pediu explicitamente que esse módulo seja "um otimizador diferencial pro sistema" — cobrir o máximo de situações reais dentro do canal já decidido, não só o caminho feliz.

**Princípio central do desenho, confirmado por evidência de produção real** (post de engenharia da fintech Ramp: pedir tudo pra um LLM numa passada só deu 66% de precisão; separar o que é determinístico do que é genuinamente ambíguo subiu pra 87%) e por um segundo caso real encontrado nesta pesquisa (linha digitável de boleto brasileiro tem checksum público, dá pra extrair vencimento/valor com 100% de certeza sem IA nenhuma): **IA nunca faz o que uma regra determinística já resolve.** Isso corre por todo o desenho abaixo.

## Decisões já tomadas (não reabrir sem motivo novo)

- **Escopo de documento**: contas a pagar **e** a receber, mais extrato bancário em PDF (alimentando a Conciliação Bancária já existente).
- **Canal**: só upload manual nesta fatia. E-mail dedicado e WhatsApp ficam pra um ciclo futuro (a infraestrutura de validação de remetente é fracamente documentada até nos líderes de mercado — merece tratamento sério, não versão apressada).
- **Múltiplos lançamentos por arquivo**: sim, desde o início (fatura de cartão com várias compras, PDF com várias notas).
- **Tipo do lançamento (despesa/receita)**: a IA decide sozinha, com correção de 1 clique na revisão se errar — igual ao padrão real da Conta Azul.
- **Fila central dedicada**: sim, uma tela lista todo documento pendente (não só botões soltos nas telas de Contas a Pagar/Receber).
- **Nunca auto-posta**: toda sugestão passa por revisão humana explícita antes de virar lançamento — decisão de segurança, não só de produto (lançamento é imutável depois de criado).
- **Motor de IA**: API da Anthropic (Claude), acesso direto (não via Vertex AI — ver seção Segurança/LGPD abaixo pro motivo).
- **Validação de boleto contra fraude**: mitigação sem dependência de provedor externo nesta fatia (comparação contra histórico do próprio fornecedor) — integração com Celcoin/Kobana/CIP fica como decisão de negócio separada, fora desta spec.

## Fluxo geral

```
1. Upload (tela /importacao/captura, ou atalho "Enviar documento" em
   Contas a Pagar / Contas a Receber / Conciliação Bancária)
   → arquivo salvo no bucket já existente (mesmo padrão de `comprovantes`),
     hash sha256 calculado

2. Extração da linha digitável, antes de qualquer decisão de pipeline:
   - **PDF com camada de texto** (a maioria dos boletos gerados por
     sistema): regex direto no texto extraído do PDF — zero IA, zero
     ambiguidade.
   - **Imagem/foto, ou PDF só-imagem (escaneado)**: aqui a linha
     digitável não existe como texto pra regex — a única forma de
     capturar os 47 dígitos é reconhecimento visual. Usamos Claude
     **só como OCR de uma string conhecida** (tarefa estritamente
     "quais são estes 47 dígitos", não "o que esse documento
     significa") — a interpretação desses dígitos (banco, vencimento,
     valor, checksum) continua 100% determinística depois, no mesmo
     parser dos dois casos. Se o checksum módulo 10/11 não bater com o
     que a IA leu, a leitura é descartada (não corrige "no chute") e o
     documento cai no pipeline geral pedindo confirmação manual desses
     campos — nunca aceita um vencimento/valor sem o checksum validar.
   - Linha digitável (de qualquer uma das duas formas acima) presente e
     validada → pipeline BOLETO. Ausente → pipeline DOCUMENTO GERAL
     (nota fiscal, comprovante, recibo, fatura de cartão). Documento
     marcado como "extrato bancário" pelo usuário na tela de Conciliação
     → pipeline EXTRATO (formato de saída diferente).

3. Pipeline BOLETO:
   - Parser determinístico (linha digitável/código de barras, já
     validada no passo 2): banco, valor, vencimento, campo livre.
   - Claude entra só pra ler o restante do documento (nome do
     fornecedor, CNPJ impresso, descrição) — nunca pra vencimento/valor,
     mesmo quando o passo 2 usou Claude pra OCR dos dígitos (são duas
     chamadas com responsabilidades diferentes: "leia estes dígitos" vs.
     "quem é o fornecedor").
   - Camada de mitigação de fraude: compara banco/agência/conta da linha
     digitável contra o histórico de boletos já pagos daquele fornecedor
     (ver seção Segurança).

4. Pipeline DOCUMENTO GERAL:
   - Claude recebe o PDF/imagem + instrução com schema forçado
     (structured output) + lista de categorias do tenant (cacheada) +
     aviso explícito "a empresa dona do sistema é <nome/CNPJ do tenant>,
     nunca a sugira como fornecedor/cliente" (mitiga o erro documentado
     da própria Conta Azul).
   - Devolve um array de lançamentos sugeridos (1 item = 1 nota; N itens
     se o arquivo tiver várias notas ou for fatura de cartão).

5. Pipeline EXTRATO:
   - Claude devolve uma lista de linhas {data, valor, tipo, descrição} —
     mesmo shape de `LinhaExtratoBruta` que OFX/CSV já produzem em
     `lib/conciliacao/parse.ts`. Entra direto no wizard de conciliação
     existente (`importarLinhas()`), sem UI nova.

6. Cada lançamento sugerido (pipelines 3 e 4) vira uma linha PENDENTE
   na fila /importacao/captura:
   - Resolve fornecedor/cliente via `resolverCorrespondenciaPessoa()`
     (motor já existente, documento decide sozinho, nome sempre pede
     confirmação).
   - Resolve categoria via `buscarRegraPorDescricao()` (regras já
     aprendidas); se não achar, usa a sugestão da IA (dentre as
     categorias já cadastradas do tenant, nunca uma nova).
   - Dedup: hash de arquivo bloqueia reenvio do mesmo documento; camada
     extra fuzzy (fornecedor+valor+data próximos) sinaliza suspeita de
     duplicata sem bloquear — mesma transação chegando por dois arquivos
     diferentes (foto + PDF do mesmo boleto).
   - Estado calculado por sugestão: "Pronta" (fornecedor resolvido,
     categoria resolvida, sem flag de duplicata suspeita, sem flag de
     banco divergente do histórico do fornecedor) vs. "Revisar" (algo
     precisa de atenção) — sinaliza visualmente o que é 1 clique vs. o
     que precisa de olhar, padrão confirmado em uso real (Dext).

7. Tela de revisão (full-page, documento à esquerda / formulário
   pré-preenchido à direita): confirma ou corrige campos, inclusive
   trocar Receita↔Despesa se a IA errou. Confirmar chama
   `criarEventoFinanceiro()` (mesma função central que "Nova
   despesa"/"Nova receita" já usam), anexa o documento original como
   `anexo` tipo DOCUMENTO_FISCAL, e grava `criarRegraSeNaoExiste()` se o
   usuário corrigiu uma categoria sem regra prévia.
```

## Papel da IA — exatamente o que faz e o que não faz

**Faz** (genuinamente ambíguo, exige "entender" o documento):
- Identificar fornecedor/cliente por nome (e CNPJ/CPF se impresso e legível) quando não há linha digitável de boleto.
- Sugerir categoria financeira, só quando não existe regra já aprendida daquele fornecedor.
- Classificar despesa vs. receita.
- Separar um arquivo em múltiplos lançamentos.
- Escrever a descrição do lançamento.
- Extrair linhas de extrato bancário em PDF (data/valor/descrição) quando OFX/CSV não está disponível.

**Não faz** (regra determinística, zero IA):
- Vencimento e valor de boleto — parser de linha digitável, checksum módulo 10/11.
- Validação de CNPJ/CPF — checksum (reaproveita `lib/pagamentos/cpf-cnpj.ts`, já escrito pro checkout).
- Encontrar fornecedor já cadastrado — motor de correspondência existente.
- Aplicar categoria quando já existe regra aprendida — `regras_categorizacao`.
- Confirmar o lançamento — sempre humano.
- Mitigação de fraude de boleto (comparação de banco/conta contra histórico) — consulta ao próprio banco de dados, não IA.

## Modelo de dados

Duas tabelas novas (RLS staff-only, mesmo padrão de `linhas_dre`/`orcamentos` — é operação interna do escritório, `cliente_portal` sem acesso; policy de UPDATE explícita desde o início, lição já repetida 7× neste projeto):

**`documentos_capturados`** — o arquivo em si.
- `id uuid pk`, `tenant_id`, `storage_path text`, `hash_arquivo text` (dedup exato), `tipo_pipeline text check (boleto, documento_geral, extrato)`, `status text check (processando, processado, erro)`, `erro_mensagem text null`, `criado_por uuid references usuarios`, `criado_em timestamptz`.
- Unique `(tenant_id, hash_arquivo)`.

**`sugestoes_lancamento`** — cada lançamento sugerido extraído de um documento (1:N com `documentos_capturados`).
- `id uuid pk`, `documento_capturado_id uuid fk`, `tenant_id`, `tipo text check (DESPESA, RECEITA)`, `pessoa_id uuid null` (já resolvido), `nome_pessoa_sugerido text null` (quando não resolveu automático), `categoria_id uuid null`, `descricao text`, `valor numeric`, `data_competencia date`, `data_vencimento date`, `forma_pagamento_sugerida text null`, `origem_valor_data text check (deterministico, ia)` (rastreabilidade: vencimento/valor de boleto marca `deterministico`), `flag_duplicata_suspeita boolean default false`, `flag_fornecedor_banco_divergente boolean default false` (mitigação de fraude), `status text check (pendente, confirmado, rejeitado)`, `evento_financeiro_id uuid null fk`, `criado_em timestamptz`.

Storage: reaproveita o bucket privado já existente (RLS por `{tenant_id}/...`), sem bucket novo.

## Segurança

### LGPD — pendência documentada, não resolvida, registrada explicitamente

Pesquisa aprofundada (`docs/pesquisa-captura-documento-ia-tecnico-legal.md` e `docs/pesquisa-captura-documento-ia-fraude-lgpd-brasil.md`) encontrou um gap real: desde 23/08/2025 é obrigatório ter mecanismo válido de transferência internacional de dado pessoal (Resolução ANPD 19/2024). A política de privacidade da Anthropic tem seção LGPD/Brasil, mas ela mesma diz não se aplicar a clientes de API comercial; o DPA comercial cita GDPR/Suíça, não LGPD nominalmente. Google Cloud Vertex AI tem cobertura contratual mais forte (SCCs brasileiras nomeadas), mas descobrimos que os modelos atuais (Opus 5/Sonnet 5) podem não ter endpoint físico em São Paulo — só global/multi-region — então o ganho de Vertex é só contratual, não de residência, e custa complexidade real de credencial (Google Cloud IAM em vez de uma API key simples).

**Decisão**: seguir com API direta da Anthropic nesta fatia (mais simples de operar, mesmo padrão já usado pro checkout — chave server-only). **Antes de processar documento real de cliente em produção** (não antes de construir/testar com dado fictício), confirmar diretamente com a Anthropic se o DPA comercial cobre LGPD/Brasil. Se não resolver a tempo, migrar pra Vertex AI é uma troca de camada de autenticação, não um redesenho — o código de extração muda pouco.

### Fraude de boleto — mitigação sem dependência externa

Pesquisa (`docs/pesquisa-captura-documento-ia-fraude-lgpd-brasil.md`, `docs/pesquisa-captura-documento-ia-boleto-gateways-vertex.md`) confirmou que existe infraestrutura oficial de validação de boleto contra a fonte de verdade (CIP/Núclea, via gateways como Celcoin/Kobana — não o Asaas, que não tem esse endpoint) — mas exige virar cliente de mais um provedor, decisão de negócio fora desta spec.

Mitigação implementável agora, sem dependência externa: ao processar um boleto, comparar banco+agência+conta da linha digitável contra o histórico de boletos já pagos daquele mesmo fornecedor (`pessoa_id`). Primeira vez pagando um fornecedor: sem baseline, sem alerta (não dá falso positivo). A partir da segunda vez, banco diferente do histórico → `flag_fornecedor_banco_divergente = true`, sugestão nunca fica "Pronta" (força revisão humana), mensagem explícita "Este boleto aponta para um banco diferente do que [Fornecedor] usou nas últimas vezes — confira antes de pagar." Não é substituto de uma validação contra a CIP (não pega fraude na primeira transação com fornecedor novo), mas é real, barato, e mais do que qualquer concorrente brasileiro pesquisado oferece hoje.

### Outros pontos (padrão já estabelecido no projeto, reaplicado)

- `ANTHROPIC_API_KEY` só em `lib/captura-documento/` (server-only), nunca `NEXT_PUBLIC_`, mesmo isolamento de `lib/asaas/`.
- Nunca logar o documento nem a resposta bruta da IA em texto livre (pode conter dado pessoal de terceiro).
- Structured output nativo da API (`output_config.format` com JSON Schema) — validação garantida no servidor, não "espero que o modelo obedeça".
- RLS staff-only nas duas tabelas novas, policy de UPDATE explícita desde o início.

## Testes

- Boleto real (linha digitável válida) → vencimento/valor batem exatos, sem chamar a IA pra esses dois campos (confirmar via log/trace que a chamada à IA não aconteceu, ou aconteceu só pro resto dos campos).
- Boleto com linha digitável adulterada manualmente (trocar 1 dígito) → checksum rejeita, mensagem clara.
- Fornecedor com histórico de 2+ boletos do mesmo banco, terceiro boletos de banco diferente → `flag_fornecedor_banco_divergente`, sugestão não fica "Pronta".
- PDF com 3 notas fiscais diferentes → 3 sugestões separadas.
- Fatura de cartão com várias compras → várias sugestões separadas, cada uma com fornecedor/categoria próprios.
- Mesmo arquivo enviado duas vezes → bloqueado por hash.
- Mesma transação real (boleto) enviada como foto e depois como PDF → não bloqueado por hash (arquivos diferentes), mas sinalizado pela camada fuzzy.
- Documento ilegível/corrompido → status `erro`, mensagem clara, sem sugestão criada, sem travar a fila.
- Extrato em PDF de um banco real → linhas extraídas entram no wizard de conciliação existente e casam contra baixas/parcelas normalmente.
- Categoria já tem regra aprendida pro fornecedor → sugestão vem com a categoria certa sem chamar a IA pra esse campo.
- CPF/CNPJ inválido no documento (formato errado ou checksum falho) → não trava o fluxo, campo fica em branco/editável, sem bloquear a criação da sugestão.

## Fora de escopo desta fatia

Canais automatizados (e-mail dedicado, WhatsApp); integração com Celcoin/Kobana/CIP pra validação forte de boleto (decisão de negócio separada); auto-post por score de confiança; three-way match com pedido de compra; captura de recibo de despesa de cartão corporativo próprio (não é o modelo de negócio hoje); OCR/parsing determinístico de XML de NFS-e via Ambiente de Dados Nacional (evolução natural de um ciclo futuro, reduziria ainda mais a superfície de IA).
