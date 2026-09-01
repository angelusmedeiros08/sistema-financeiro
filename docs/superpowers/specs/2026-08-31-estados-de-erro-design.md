# Estados de erro & formulário resiliente — design

Fatia 2 do ciclo de UX/estrutura ([Dossiê UX](https://claude.ai/code/artifact/ecc645b3-9d4c-46d6-89f1-89514b18e769), 31/08/2026). Escopo fora de decisão de cor/tipografia — comportamento e estrutura.

## Estado atual (achado ao explorar, não presumido)

Dois dos itens que a fatia original sugeria já estão resolvidos por trabalho anterior desta sessão:
- **Formulário nunca reseta em erro**: já é o padrão em toda action de criar (`if ("erro" in resultado) return { erro: ... }` sempre antes de `formRef.current?.reset()`).
- **Retry não duplica lançamento/baixa**: `evento-financeiro-form.tsx` já gera uma `chaveIdempotencia` (via `crypto.randomUUID()`, só muda quando o form remonta após sucesso) passada como `import_key` pra RPC `criar_evento_financeiro` — reenvio de rede ou duplo clique com a mesma chave retorna o evento já criado, não duplica. `baixa-actions.ts` tem o mesmo mecanismo.

Três lacunas genuínas, confirmadas nesta exploração:
1. **Nenhum `error.tsx` em lugar nenhum do app** — falha inesperada de Server Component cai no boundary genérico do Next.js.
2. **Nenhuma detecção de offline/reconexão** — e nenhum tratamento diferenciado pra erro de rede (hoje um erro de rede que cai num `catch` vira o mesmo toast genérico de qualquer outro erro).
3. **`criarVenda`/`criarOrcamento` não têm proteção de idempotência** — diferente de lançamento/baixa. Achado relacionado, mas **fora de escopo desta fatia**: as duas funções fazem `insert()` do cabeçalho e depois uma RPC separada pros itens, sem transação entre as duas — risco de registro órfão em falha no meio, sinalizado como task própria (não é sobre duplicação, é sobre atomicidade — problema correlato, não o mesmo).

## 1. Página de erro genérica

Dois arquivos:
- `src/app/(app)/error.tsx` — cobre qualquer erro dentro do shell autenticado (sidebar/topbar continuam visíveis, porque o `error.tsx` de um segmento substitui só o `{children}` daquele nível, não o layout ao redor).
- `src/app/error.tsx` (raiz) — cobre o que estiver fora do grupo `(app)` (páginas de auth, portal se não tiver o próprio).

Conteúdo (Client Component, recebe `error` e `reset` do Next.js):
- Nunca mostra `error.message`/stack/código HTTP como título — só num `<details>` recolhido, se sobrar espaço, pra quem quiser reportar.
- Texto: título curto tipo "Algo deu errado", corpo explicando que a equipe já foi notificada (copy fixo por ora, sem telemetria real por trás — registrado como simplificação consciente, não fingindo monitoramento que não existe) e sugerindo tentar de novo.
- Botão "Tentar novamente" chama `reset()` (tenta re-renderizar o segmento sem recarregar a página inteira). Link "Voltar ao Painel" como rota de escape sempre disponível.
- `useEffect(() => console.error(error), [error])` — loga no console pra não perder o erro real durante debug, sem expor isso na UI.

## 2. Banner de conexão

- `src/lib/hooks/use-online-status.ts` — hook `useOnlineStatus(): boolean`, inicializa com `navigator.onLine` (guardado por `typeof window !== "undefined"`, já que roda em componente client mas o valor inicial de SSR precisa ser determinístico — usar `true` como padrão de SSR e corrigir no primeiro efeito, igual ao padrão já usado em `theme-toggle.tsx` pra evitar mismatch de hidratação), escuta `window.addEventListener("online"/"offline", ...)`.
- `src/components/layout/offline-banner.tsx` — `<OfflineBanner />`, renderiza uma faixa fixa (não é toast — persiste enquanto offline, não some sozinha) com texto "Sem conexão com a internet. Algumas ações podem falhar até a conexão voltar." Quando `useOnlineStatus()` volta a `true` depois de ter estado `false`, dispara `toast.success("Conexão restabelecida.")` uma vez (via `useEffect` com o valor anterior guardado em ref) e o banner some.
- Montado uma vez em `src/app/(app)/layout.tsx` (acima do `{children}`, abaixo da Topbar) — cobre toda a área autenticada. Não precisa duplicar no portal nem no auth nesta fatia (escopo: uso interno primeiro, onde a sessão é mais longa).
- **Não** reescreve os `catch` de cada action — a proteção é proativa (avisa antes/durante, não depende de interceptar cada chamada individual). Erro de rede que ainda assim cair num `catch` de action continua indo pro toast existente; o banner é a camada adicional, não substitui.

## 3. Idempotência em Vendas e Orçamentos

Mesma receita já usada em `evento-financeiro-form.tsx`, aplicada ao componente compartilhado:
- `documento-comercial-form.tsx`: adiciona `chaveIdempotencia` via `useMemo(() => crypto.randomUUID(), [chaveFormulario])` — reaproveita o `chaveFormulario` que o componente já tem pra outro fim (remonte dos comboboxes não-controláveis); inclui a chave num campo hidden do form.
- `criarVendaAction`/`criarOrcamentoAction`: leem o campo e passam pra `criarVenda`/`criarOrcamento`.
- `criarVenda`/`criarOrcamento` (lib): novo parâmetro opcional `importKey`. Antes do insert, se `importKey` vier preenchido, `SELECT` por `tenant_id + import_key`; se já existir, retorna esse registro (sem inserir de novo, sem tentar os itens de novo — evita duplicar tanto o cabeçalho quanto reprocessar itens). Migration nova: coluna `import_key uuid` nullable em `vendas` e `orcamentos_comerciais`, com índice único parcial `UNIQUE (tenant_id, import_key) WHERE import_key IS NOT NULL` (mesmo padrão de permitir `NULL` pra registros que não vieram de um formulário com chave, ex. se algum outro caminho de criação existir).

Modo `editar` não muda — idempotência é só pro caminho de criação, onde duplo clique/reenvio de rede pode criar um registro novo por engano.

## Testes

- `error.tsx`: forçar um erro real (ex. lançar exceção temporária num componente de teste, ou navegar pra uma URL que quebre uma query) e confirmar que a tela mostra o texto amigável, sidebar continua visível (se dentro do grupo autenticado), "Tentar novamente" funciona.
- Banner: `navigator.onLine` não dá pra simular fácil ao vivo sem DevTools reais — verificar via `read_network_requests`/toggle manual no navegador se possível, ou aceitar verificação de código (hook, listener, unmount) sem forçar o evento real.
- Idempotência: criar uma venda de teste, confirmar que enviar a MESMA `chaveIdempotencia` duas vezes (simulado via chamada direta da action, não precisa duplo-clique real no UI) não cria duas vendas — só uma, com o mesmo id nas duas respostas.
