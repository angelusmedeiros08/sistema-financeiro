# Revisão completa da Importação — padrão comercial

## Contexto

Esta é a última rodada de um ciclo de revisão do módulo de Importação iniciado com um documento do sócio do usuário (Erick) e aprofundado com 3 vídeos dele usando o sistema. As 4 fatias anteriores (bugs de data/acento, sinônimos de coluna, ações em lote, lote/histórico/desfazer financeiro) e uma rodada de combobox pesquisável já foram implementadas, testadas ao vivo e commitadas. Uma revisão de código à parte também já corrigiu 5 bugs reais (2 de reentrância no estorno, 1 crítico de confiança no fluxo de desfazer, 2 de sobrescrita silenciosa).

O usuário pediu explicitamente que esta rodada final não trate só do caso específico do Erick — o sistema vai ser comercializado pra outros clientes, então o padrão é "completo e robusto", não "resolve a reclamação que apareceu". A auditoria completa de todos os pedidos feitos nesta conversa foi apresentada e aprovada; restam 3 pontos sem desenho, cobertos aqui.

## 1. Editar lançamento

**Problema**: não existe hoje nenhuma forma de corrigir descrição, valor, categoria, pessoa ou centro de custo de um lançamento já criado — só o ciclo de vida da parcela (baixa, estorno, renegociação de vencimento) tem tela própria. Um erro de digitação exige estornar o evento inteiro e lançar de novo do zero.

**Ponto de entrada**: `TabelaEventos` (`components/lancamentos/tabela-eventos.tsx`, usado por `/receitas` e `/despesas`) ganha a prop `linkPara` que `TabelaLista` já suporta — mesmo padrão de Pessoas, Vendas, Contas a receber/pagar e Histórico de importação, onde a linha inteira é clicável (nunca duplo clique, que seria o único lugar do app com esse gesto).

```tsx
<TabelaEventos eventos={eventos} linkPara={(e) => `/receitas/${e.id}`} ... />
```

**Páginas novas**: `app/(app)/receitas/[id]/page.tsx` e `app/(app)/despesas/[id]/page.tsx` — wrappers finos (buscam o evento + parcelas + rateio, redirect se não achar ou tipo não bater com a rota), renderizando um componente client compartilhado `EditarEventoFinanceiro` (`components/lancamentos/editar-evento-financeiro.tsx`).

**Campos e comportamento**:
- **Descrição, pessoa, centro de custo**: sempre editáveis, UPDATE direto em `eventos_financeiros`/`rateio_centro_custo` — não tocam o razão contábil, não têm restrição.
- **Categoria(s)/rateio, valor**: só editáveis quando o evento tem **1 parcela e nenhuma baixa viva nela** (mesma checagem que `estornarEventoFinanceiro` já faz). Se parcelado ou com baixa, os campos ficam desabilitados com uma mensagem explicando por quê ("lançamento parcelado — pra corrigir valor ou categoria, estorne e lance de novo" / "já tem baixa registrada — estorne a baixa primeiro"). Mudar qualquer um dos dois dispara, na mesma submissão: `estornarEventoFinanceiro` no evento atual (motivo: "Correção de lançamento") seguido de `criarEventoFinanceiro` com os valores corrigidos, preservando data de competência/pessoa/centro de custo/vencimento do original a menos que também tenham mudado. O evento antigo continua existindo, marcado `estornado_em` — é auditoria, não desaparece (diferente do "puro" do desfazer de importação, que apaga; aqui é uma correção manual do usuário, meses depois, não faz sentido apagar o rastro).
- **Vencimento, número de parcelas**: fora de escopo — vencimento já tem a tela de renegociação dedicada (`/contas-a-receber/[parcelaId]/renegociar`), não duplicar; reparcelar é mudança estrutural grande demais pra um formulário de correção rápida.

**Ação**: `editarEventoFinanceiroAction(eventoId, formData)` — um `useActionState` só, decide internamente se precisa do caminho estorno+recriação (valor/categoria mudaram) ou só UPDATE (resto), redireciona pro novo id quando houver recriação, fica na mesma página quando não houver.

## 2. Indicadores clicáveis

**Componente**: `StatCard` (`components/painel/stat-card.tsx`) ganha `href?: string` — quando presente, o card inteiro vira `<Link>` (mesmo visual, com estado de hover indicando que é clicável); quando ausente, comportamento idêntico ao atual.

**Destinos**:
- "A receber vencido" / "A pagar vencido" (`/relatorios/visao-geral`) e "A receber (30 dias)" / "A pagar (30 dias)" (`/painel`) → `/contas-a-receber` / `/contas-a-pagar` com filtro novo.
- "Resultado do período" e "Ponto de equilíbrio" (`/relatorios/visao-geral`) → `/relatorios/dre` e `/relatorios/ponto-equilibrio`, que já existem e já mostram a composição — sem view nova.

**Filtros novos em Contas a Receber/Pagar**: a lista `FILTROS` de `contas-a-receber/page.tsx`/`contas-a-pagar/page.tsx` (hoje: aberto/quitados/cancelados/todos, todos por `status`) ganha duas entradas por critério de data, não só status:
- `vencido`: `status in (PENDENTE, RECEBIDO_PARCIAL, ATRASADO)` e `data_vencimento < hoje` — mesmo critério de `buscarResumoVencimentos` (`lib/relatorios/aging.ts`), reaproveitado como fonte única (extrair a checagem pra uma função compartilhada em vez de duplicar a condição na query da página).
- `vence30`: mesmo status, `data_vencimento` entre hoje e +30 dias — mesmo critério de `obterPendentesPorTipo` (`painel/dados.ts`).

## 3. Pular etapa Colunas quando 100% confiante

**Regra**: depois do parse do arquivo, se **todo campo obrigatório** (data de competência, valor, categoria, descrição) tiver correspondência automática por rótulo exato, sinônimo, ou regra aprendida (nunca por "sem sugestão", que deixaria o select vazio) — o wizard avança direto de "Arquivo" pra "Cadastros", sem parar em "Colunas". A etapa continua existindo e acessível: um link discreto "Revisar mapeamento de colunas" aparece no topo do passo Cadastros, voltando pra "Colunas" com o estado já preenchido — nunca esconde a decisão, só não bloqueia quando não há nada a decidir.

Detecção de encoding/formato numérico (BR/US) não entra nessa regra — já é pré-selecionada com um dropdown sempre visível pra corrigir se necessário, sem exigir clique no caminho comum; mantém como está.

**Onde muda**: `passo-mapeamento.tsx` (wizard financeiro) — a lógica de avanço automático roda depois de `sugerirMapeamentoColunas` resolver as colunas, antes de renderizar a etapa; se confiante, chama `onAvancar` imediatamente com o mapeamento sugerido em vez de esperar o clique em "Continuar".

## Escopo

Não migration. Arquivos tocados: `components/lancamentos/tabela-eventos.tsx`, novo `components/lancamentos/editar-evento-financeiro.tsx`, novas rotas `receitas/[id]` e `despesas/[id]` + `actions.ts`, `components/painel/stat-card.tsx`, `relatorios/visao-geral/page.tsx`, `painel/page.tsx`, `contas-a-receber/page.tsx`, `contas-a-pagar/page.tsx`, `lib/relatorios/aging.ts` (extrair critério de "vencido" compartilhável), `importacao/planilha/passo-mapeamento.tsx`.

## Testes

Editar: descrição/pessoa/centro de custo mudam sem tocar o razão (confirmar via SQL que não criou lançamento novo); mudar valor/categoria de um evento de parcela única sem baixa cria o par estorno+novo evento no razão, preserva o resto dos campos; tentar mudar valor de um evento parcelado ou com baixa fica bloqueado com a mensagem certa. Indicadores: clicar em "A receber vencido" chega em `/contas-a-receber?situacao=vencido` com exatamente os registros que compunham o total do card (mesma soma). Pular Colunas: planilha com todas as colunas reconhecidas por sinônimo pula direto pra Cadastros; planilha com uma coluna obrigatória sem sugestão continua parando em Colunas.
