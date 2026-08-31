# Feedback de confirmação de ações (toast em todo o sistema)

**Data:** 2026-08-31

## 1. Contexto

Pedido direto do usuário: hoje, ao salvar/editar/excluir/aprovar/cancelar qualquer coisa no sistema, não fica claro que a ação de fato aconteceu — um operador desatento pode não perceber. Exemplo concreto trazido: registrar uma despesa não mostra confirmação nenhuma de que foi salva.

Levantamento do estado atual (antes desta spec) confirmou o problema é sistêmico, não isolado:
- `sonner` (biblioteca de toast) já está instalada e com `<Toaster richColors closeButton />` montado no layout raiz (`src/app/layout.tsx`) — cobre `(auth)`, `(app)` e `(portal)` — mas é usada em só 2 lugares do código inteiro, nenhum deles um `toast.success` de mutação de servidor.
- O padrão de **erro** é consistente: texto vermelho inline perto do botão, em praticamente todo formulário.
- O padrão de **sucesso** é inconsistente e majoritariamente silencioso: 5 variantes diferentes encontradas (reset de formulário, remount via `key`, `redirect()` da própria action, `router.refresh()` mudo, fechar modal), e nenhuma delas diz explicitamente "salvo com sucesso". Botões de ação isolada (Excluir, Aprovar, Recusar, Dar baixa, Cancelar, Ativar/Desativar, Revogar acesso — ~16-20 pontos) seguem o mesmo silêncio: só `router.refresh()`/`revalidatePath`, sem nenhum toast.
- Já existe evidência real de que isso causou confusão: `excluir-apresentacao-button.tsx` recebeu uma reclamação direta do usuário ("NÃO ESTÁ EXCLUINDO") quando uma falha de rede na exclusão passou despercebida por falta de feedback — corrigido pontualmente ali, mas o mesmo padrão de risco existe em outras dezenas de pontos.

Quase toda action do sistema já devolve o mesmo formato — `{ erro: string } | { sucesso: true }` — confirmado em `vendas-actions.ts`, `orcamentos-comerciais-actions.ts`, `despesas/actions.ts` e dezenas de outros. Essa convenção já consistente é a base do mecanismo abaixo: não precisa mudar nenhuma action, só adicionar um ponto de disparo de toast onde cada componente já lê esse resultado.

Decisões já confirmadas com o usuário:
- **Mecanismo**: toast (reaproveita a infraestrutura já instalada e ociosa do `sonner`).
- **Erro**: também vira toast — unifica com sucesso num canal único, substituindo o texto vermelho inline.
- **Mensagem**: específica por ação (`"Despesa salva."`, `"Venda aprovada."`), nunca genérica.
- **Escopo**: todo o sistema de uma vez, não uma leva piloto.

## 2. O helper central

`src/lib/feedback/notificar-resultado.ts` (novo):

```ts
import { toast } from "sonner";

export type ResultadoComFeedback = { erro: string } | { sucesso: true };

// Disparado logo depois de `await` numa server action que segue o formato
// { erro } | { sucesso: true } — já a convenção de retorno da esmagadora
// maioria das actions do sistema. `undefined` cobre o caso de ações que
// redirecionam no sucesso (a Promise nunca resolve pro cliente — ver Seção 4);
// nesse caso não há nada a fazer aqui.
export function notificarResultado(resultado: ResultadoComFeedback | undefined, mensagemSucesso: string): void {
  if (!resultado) return;
  if ("erro" in resultado) {
    toast.error(resultado.erro);
    return;
  }
  toast.success(mensagemSucesso);
}
```

Sem estado, sem dependência de React — pode ser chamado tanto de dentro de um reducer de `useActionState` quanto de dentro de um `startTransition` de botão de ação isolada.

## 3. Como cada padrão existente se conecta

**Formulários com `useActionState`** (ex.: `EventoFinanceiroForm`, `DocumentoComercialForm`, `pessoa-form.tsx`): a chamada entra na função passada pro `useActionState`, logo após obter `resultado` da action e antes de decidir o que o reducer retorna:

```ts
const [estado, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
  const resultado = await criarDespesa(formData);
  notificarResultado(resultado, "Despesa salva.");
  if (resultado && "erro" in resultado) return { erro: resultado.erro };
  return { erro: "" };
}, estadoInicial);
```

O `estado.erro` que hoje alimenta o `<p className="text-destructive">` inline **sai** do JSX de cada formulário — o toast já cobre o erro, manter os dois seria redundante. `estado` continua existindo só porque `useActionState` exige um valor de retorno; o campo `erro` nele deixa de ser lido no JSX.

**Botões de ação isolada com `useTransition`** (ex.: `venda-acoes.tsx`, `orcamento-acoes.tsx`, `excluir-apresentacao-button.tsx`, `toggle-ativo-button.tsx`): mesma ideia, dentro do callback de `startTransition`:

```ts
iniciarTransicao(async () => {
  const resultado = await aprovarVendaAction(vendaId);
  notificarResultado(resultado, "Venda aprovada.");
  router.refresh();
});
```

`router.refresh()`/`revalidatePath` continuam existindo exatamente como hoje — o toast é aditivo, não substitui a atualização de dado da tela.

## 4. A exceção do redirect

Fluxos de criação que já chamam `redirect()` no servidor quando dá certo (ex.: `criarVendaAction`, `criarOrcamentoAction`, `criarPessoaAction`) nunca devolvem uma Promise resolvida pro cliente no caminho de sucesso — a navegação já aconteceu antes de qualquer código no cliente rodar. Nesses casos específicos, **não há toast de sucesso** — chegar em "Venda #4" recém-criada já é confirmação inequívoca por si só, sem precisar de reforço.

Isso não é um caso especial a tratar em cada call site: o helper (Seção 2) já devolve cedo em `resultado === undefined`, que é exatamente o que a variável local recebe quando a Promise nunca resolve porque a navegação interrompeu a execução antes — nenhuma verificação extra é necessária no código de cada formulário.

Erro **sempre** dispara toast, inclusive nesses mesmos fluxos — o caminho de erro de uma action nunca chama `redirect()`, só o de sucesso.

## 5. Convenção de mensagem

Padrão: `"{Entidade} {particípio}."` — direto, sem exclamação, sem emoji, mesmo tom do único precedente que já existe no sistema (favoritar item da sidebar: `"${label} adicionado aos favoritos"`).

Exemplos: `"Despesa salva."`, `"Receita salva."`, `"Venda aprovada."`, `"Orçamento enviado."`, `"Apresentação excluída."`, `"Acesso revogado."`, `"Categoria criada."`.

Concordância de gênero segue o substantivo de cada entidade (`"Despesa salva."`, mas `"Centro de custo salvo."`, `"Orçamento salvo."`) — decidida no call site, junto da frase, não por um helper genérico que tentaria adivinhar gênero.

A frase mora junto do código que já chama a action — nenhum dicionário central de mensagens. Ação de **criar** e **editar** no mesmo formulário (ex.: `DocumentoComercialForm`, que atende tanto `modo="criar"` quanto `modo="editar"`) usa a mesma frase pros dois modos quando a entidade e o verbo genérico servem (`"Venda salva."` cobre os dois); quando os textos precisam diferir, o call site decide com uma expressão condicional simples (`modo === "criar" ? "Despesa salva." : "Despesa atualizada."`), sem infraestrutura nova pra isso.

## 6. Escopo do rollout

Todo o sistema, numa leva só. O plano de implementação (próximo passo) enumera arquivo por arquivo; os módulos que entram:

- **Lançamentos** (despesas/receitas): criar, editar, dar baixa, estornar baixa, cancelar parcela, renegociar.
- **Comercial** (vendas, orçamentos comerciais): criar (quando não redireciona), editar, aprovar, recusar, enviar, reenviar.
- **Pessoas** (clientes/fornecedores): criar, editar.
- **Contas a pagar/receber**: as mesmas ações de baixa/estorno/renegociação, vistas pelo lado dessas telas.
- **Apresentações**: criar, editar, excluir, ícone de transmitir do topbar.
- **Configurações**: categorias, centros de custo, formas de pagamento, plano de contas, campos personalizados, regras de categorização, equipe (convidar, cancelar convite, revogar/reativar acesso), estrutura de DRE.
- **Recorrências**: criar, editar, cancelar série.
- **Previsionamento**: definir valor, copiar pro resto do ano.
- **Produtos e serviços**: criar, editar.
- **Importação**: ações de commit/desfazer — avaliadas caso a caso no plano; a Central de Importações já tem barra de progresso e outros feedbacks visuais próprios, então nem todo ponto necessariamente precisa de toast extra (evitar redundância).

## 7. Casos de borda

- **Múltiplos toasts em sequência rápida** (ex.: usuário clica "Aprovar" em duas vendas seguidas antes do primeiro toast sumir): comportamento padrão do `sonner` já empilha toasts sem se sobrepor — nenhum tratamento especial necessário.
- **Erro de validação client-side antes de qualquer chamada de servidor** (ex.: campo obrigatório vazio bloqueado pelo próprio HTML/`required`): nunca chega a chamar a action, então não gera toast — o navegador já impede o submit e mostra sua própria mensagem nativa, comportamento inalterado.
- **Ações que já mostram o próprio resultado de forma óbvia na tela** (ex.: editar categoria inline numa linha de tabela, `categoria-linha.tsx`, onde a linha já volta pro modo exibição com o valor novo visível): ganham o toast do mesmo jeito, por consistência — mesmo redundante ali, é melhor um sistema previsível (toda ação sempre confirma) do que o usuário ter que lembrar quais exceções não confirmam.

## 8. Fora de escopo

Consolidar o padrão de "pendente" (`disabled` + texto no gerúndio/spinner, hoje copiado em ~40 lugares) num componente/prop compartilhado do `Button` — já funciona de forma visualmente consistente, mexer nisso aumentaria o risco desta mudança sem resolver o problema trazido pelo usuário. Fica registrado como ideia separada.
