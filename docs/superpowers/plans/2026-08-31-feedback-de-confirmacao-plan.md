# Plano de implementação: Feedback de confirmação de ações

**Spec:** [docs/superpowers/specs/2026-08-31-feedback-de-confirmacao-design.md](../specs/2026-08-31-feedback-de-confirmacao-design.md)
**Data:** 2026-08-31

Ordem por dependência: primeiro o helper central (nada visível ainda), depois cada módulo listado na Seção 6 da spec como sua própria fatia — mecanicamente repetitivo (mesmo padrão de 2 linhas em cada arquivo), mas fatiado por módulo pra cada leva ficar testável ao vivo isoladamente antes de seguir pra próxima, mesmo padrão já usado nesta sessão pra rollouts grandes. Contas a pagar/receber não é fatia própria — reaproveita os mesmos componentes de `components/lancamentos/` que a Fatia 2 já cobre (`formulario-baixa.tsx`, `formulario-renegociar.tsx`, `cancelar-dialog.tsx`, `detalhe-parcela.tsx`), confirmado na spec.

Cada fatia segue a mesma receita mecânica (Seções 2-3 da spec) em cada arquivo tocado:
1. Depois de `await algumaAction(...)`, chamar `notificarResultado(resultado, "<Entidade> <particípio>.")`.
2. Remover a renderização inline do erro (`{estado.erro && <p ...>}` ou equivalente em `useState` local) — o toast já cobre.
3. Não mexer em `router.refresh()`/`revalidatePath`/`redirect()` existentes — o toast é aditivo.

## Fatia 1 — Helper central

`src/lib/feedback/notificar-resultado.ts` (Seção 2 da spec): `notificarResultado(resultado, mensagemSucesso)`, usando `toast` de `sonner` (já instalado, `<Toaster richColors closeButton />` já montado em `src/app/layout.tsx` — nenhuma mudança de configuração do Toaster necessária).

_Depende de:_ nada.
_Teste:_ sem UI própria — validado indiretamente na Fatia 2 (primeiro call site real).

## Fatia 2 — Lançamentos (despesas/receitas/parcelas)

Arquivos (todos `components/lancamentos/` ou `components/formularios/`, exceto o indicado):
- `components/formularios/evento-financeiro-form.tsx` — criar despesa/receita. Mensagem condicional pelo prop `tipo`: `"Despesa salva."` / `"Receita salva."`.
- `components/lancamentos/editar-evento-financeiro.tsx` — editar lançamento. `"Despesa atualizada."` / `"Receita atualizada."` (ou `"salva"`, mesmo texto genérico serve pros dois modos — decidir na hora, Seção 5 da spec).
- `components/lancamentos/formulario-baixa.tsx` — dar baixa. `"Baixa registrada."`.
- `components/lancamentos/formulario-renegociar.tsx` — renegociar parcela. `"Parcela renegociada."`.
- `components/lancamentos/cancelar-dialog.tsx` — cancelar parcela. `"Parcela cancelada."`.
- `components/lancamentos/detalhe-parcela.tsx` — estornar baixa (`acionarEstorno`). Achado ao investigar: hoje esse call site **nem trata erro** (ignora silenciosamente se `estornarBaixaAction` retornar `{ erro }`) — corrigir isso faz parte desta fatia, não é escopo extra, é o mesmo bug de classe já corrigido em outros botões nesta sessão. `"Baixa estornada."`.
- `components/lancamentos/anexo-form.tsx` — anexar documento. `"Anexo adicionado."`.
- `components/lancamentos/anexos-lista.tsx` — remover anexo, se houver ação de remoção com resultado `{erro}|{sucesso}` (conferir ao abrir o arquivo). `"Anexo removido."`.

Essas mesmas telas são as que Contas a Pagar/Contas a Receber usam por baixo — nenhum arquivo extra nessas duas seções.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — registrar uma despesa nova (o exemplo original do usuário) e confirmar o toast "Despesa salva." aparece; editar um lançamento existente; dar baixa numa parcela, depois estornar essa baixa; cancelar uma parcela; renegociar uma parcela; forçar um erro (ex.: valor zerado) e confirmar que agora aparece como toast vermelho, não mais texto inline.

## Fatia 3 — Comercial (vendas e orçamentos)

- `components/formularios/documento-comercial-form.tsx` — compartilhado por Vendas e Orçamentos. Modo `criar` **sem redirect** (ex.: "Salvar rascunho") ganha toast; modo `criar` com `redirect()` (aprovar venda direta, enviar orçamento) não ganha, por causa da Seção 4 da spec — `notificarResultado` já lida com isso sozinho (`resultado === undefined`), não precisa de lógica condicional extra no componente. Modo `editar` sempre ganha. Mensagem vem de uma nova prop (`mensagemSucesso` ou `nomeEntidade`) que `VendaForm`/`OrcamentoForm` já injetam, mesmo padrão de `botaoCriarSecundario` que os dois wrappers já passam hoje.
- `app/(app)/vendas/venda-acoes.tsx` — aprovar/recusar venda. `"Venda aprovada."` / `"Venda recusada."`.
- `app/(app)/orcamentos/orcamento-acoes.tsx` — enviar/reenviar/aprovar/recusar orçamento. `"Orçamento enviado."` / `"Orçamento reenviado."` / `"Orçamento aprovado."` / `"Orçamento recusado."`.
- `app/orcamento/[token]/orcamento-publico-acoes.tsx` — aprovar/recusar pelo link público (o CLIENTE do tenant, não staff). Mesma mecânica, mas confirmar que o tom da mensagem cabe pra esse público (ex.: `"Orçamento aprovado. Obrigado!"` — avaliar na hora, não é staff falando com staff).

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — criar uma venda em rascunho (fica na mesma tela, deve tostar); criar uma venda direta (redireciona pra `/vendas/N`, não deve tostar, a chegada na tela nova já é a confirmação); editar uma venda; aprovar e recusar uma venda de teste; repetir os 4 estados de orçamento (enviar/reenviar/aprovar/recusar); testar o link público de um orçamento de teste (aprovar/recusar como se fosse o cliente).

## Fatia 4 — Pessoas (clientes e fornecedores)

- `components/pessoas/pessoa-form.tsx` — criar (redireciona, sem toast) / editar (sem redirect, com toast). `"Cliente salvo."` / `"Fornecedor salvo."` conforme o perfil.
- `components/pessoas/contatos-secao.tsx` — adicionar/editar/remover contato. `"Contato salvo."` / `"Contato removido."`.
- `components/pessoas/enderecos-secao.tsx` — idem pra endereço. `"Endereço salvo."` / `"Endereço removido."`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — criar um cliente novo (redireciona, sem toast esperado), editar o cliente (com toast), adicionar/editar/remover um contato e um endereço dentro da ficha da pessoa.

## Fatia 5 — Apresentações

- `app/(app)/apresentacoes/apresentacao-form.tsx` — criar/editar apresentação (roteiro salvo). `"Apresentação salva."`.
- `app/(app)/apresentacoes/excluir-apresentacao-button.tsx` — excluir. `"Apresentação excluída."` — acrescenta o toast de sucesso que faltava no bug já corrigido nesta sessão (a correção anterior só tratou o caminho de erro).
- `components/layout/icone-transmitir.tsx` — já tem `toast.error` pro caminho de erro; o caminho de sucesso redireciona pro modo apresentação (Seção 4 da spec, sem toast — chegar já apresentando é a confirmação). Só revisar se o texto do erro já existente bate com o tom da Seção 5, sem adicionar nada novo.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — criar/editar um roteiro de apresentação, excluir uma apresentação de teste e confirmar o toast "Apresentação excluída." aparece antes do item sumir da lista.

## Fatia 6 — Configurações

- `configuracoes/categorias/nova-categoria-form.tsx` (criar) + `categoria-linha.tsx` (editar/ativar-desativar inline). `"Categoria criada."` / `"Categoria salva."`.
- `configuracoes/centros-custo/novo-centro-custo-form.tsx` + `toggle-ativo-button.tsx`. `"Centro de custo criado."` / `"Centro de custo salvo."` (masc.).
- `configuracoes/formas-pagamento/nova-forma-pagamento-form.tsx` + `toggle-ativo-button.tsx`. `"Forma de pagamento criada."`.
- `configuracoes/contas-financeiras/nova-conta-form.tsx` + `toggle-ativo-button.tsx`. `"Conta financeira criada."`. Conciliação bancária (`[id]/conciliar/wizard.tsx`, `linha-conciliacao.tsx`) — avaliar na hora: o wizard já mostra o resultado do match visualmente passo a passo, então só vale adicionar toast nos pontos "terminais" (confirmar conciliação, ignorar linha), não em cada micro-passo do assistente.
- `configuracoes/plano-de-contas/nova-conta-form.tsx` + `conta-linha.tsx`. `"Conta contábil criada."` / `"salva"`.
- `configuracoes/campos-personalizados/novo-campo-form.tsx` + `remover-campo-button.tsx`. `"Campo criado."` / `"Campo removido."`.
- `configuracoes/regras-categorizacao/tabela-regras.tsx` (editar/apagar regra inline, achado ao investigar — não tem form de criação separado, tudo na tabela). `"Regra salva."` / `"Regra removida."`.
- `configuracoes/equipe/convidar-form.tsx`, `cancelar-convite-button.tsx`, `acesso-toggle-button.tsx`. `"Convite enviado."` / `"Convite cancelado."` / `"Acesso revogado."` / `"Acesso reativado."`.
- `configuracoes/estrutura-dre/nova-linha-form.tsx`, `linha-dre-item.tsx` (editar/remover/reordenar — reordenar provavelmente NÃO merece toast, é feedback visual imediato de arrastar; avaliar), `modelo-completo-button.tsx` (aplicar modelo completo). `"Linha do DRE criada."` / `"Modelo aplicado."`.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — cobrir pelo menos 1 criar + 1 editar + 1 ativar/desativar por sub-seção listada acima (são 8 sub-telas, o teste não precisa repetir os 4 verbos em cada uma, só confirmar que o padrão está presente).

## Fatia 7 — Recorrências e Previsionamento

- `configuracoes/recorrencias/cancelar-serie-button.tsx`. `"Série cancelada."`.
- `previsionamento/grade-previsionamento.tsx`: **exceção deliberada, sem toast** — a grade já tem indicador "salvando…/salvo/erro" por célula, junto do nome da categoria (Seção 7 da spec cobre esse tipo de caso, mas aqui a frequência é alta demais: preencher um orçamento anual dispara uma chamada por célula perdendo foco, um toast por célula seria ruído, não confirmação). Não mexer neste arquivo.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — cancelar uma série de recorrência de teste; confirmar (sem alterar nada) que a grade de previsionamento continua com seu indicador inline de sempre, sem toast novo.

## Fatia 8 — Produtos e serviços

- `produtos-servicos/novo-produto-servico-form.tsx` (criar) + `tabela-produtos-servicos.tsx` (editar inline). `"Produto criado."` / `"Serviço criado."` conforme o tipo, ou `"Produto/serviço salvo."` se não valer a pena diferenciar (avaliar o texto real da tela ao implementar).

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — criar um produto e um serviço, editar um existente.

## Fatia 9 — Importação (só os pontos de risco real)

Por causa da Seção 6 da spec (a Central de Importações já tem barra de progresso e feedback próprio nos passos do assistente — não duplicar), esta fatia cobre só as ações **discretas e de risco** de desfazer/retomar, onde hoje não há nenhuma confirmação:
- `importacao/historico/[id]/desfazer-painel.tsx` — desfazer importação de pessoas/produtos. `"Importação desfeita."`.
- `importacao/historico/[id]/desfazer-painel-financeiro.tsx` — desfazer importação financeira. `"Importação desfeita."`.
- `importacao/historico/[id]/retomar-painel.tsx` — retomar importação travada. `"Importação retomada."`.

Os passos do assistente (`passo-upload.tsx`, `passo-preview.tsx`, `passo-entidades.tsx`, `passo-cadastros.tsx`, `passo-entrada-ia.tsx` em cada um dos 3 sub-fluxos de importação) ficam **de fora** — cada um já avança de tela/passo visivelmente quando dá certo, e mostra erro inline específico do passo; adicionar toast ali seria redundante com a própria navegação do assistente.

_Depende de:_ Fatia 1.
_Teste:_ ao vivo — desfazer uma importação de teste (financeira ou de cadastro) e confirmar o toast; se houver uma importação travada disponível pra testar, retomar e confirmar.

## Fatia 10 — Teste end-to-end e revisão de código

Percorrer o checklist de todas as fatias numa sessão só no deploy Vercel (nunca local), sem pular nenhuma tela. Conferir os 2 casos de borda da Seção 7 da spec (múltiplos toasts em sequência não se sobrepõem; erro de validação client-side/`required` não dispara toast fantasma). Revisão de código focada em: nenhum formulário deixou `estado.erro` órfão no JSX (parâmetro sem uso, achado clássico de refactor mecânico); nenhum call site esqueceu de passar a segunda vírgula (`mensagemSucesso`) pro helper.

_Depende de:_ Fatias 1–9.
_Teste:_ critério de saída — todo módulo da Seção 6 da spec com pelo menos 1 ação testada ao vivo mostrando toast de sucesso e 1 mostrando toast de erro; nenhum `<p>{estado.erro}</p>` inline sobrevivendo em nenhum arquivo tocado.

## Fora de escopo (herdado da spec)

Consolidar o padrão de "pendente" (`disabled` + texto no gerúndio/spinner) num componente compartilhado. Rotas de `(auth)` (login/cadastro/recuperação de senha) — não estão na Seção 6 da spec, e os fluxos de sucesso ali já redirecionam (mesma exceção da Seção 4).
