# Central de notificações ampliada (Fatia 10 do dossiê UX)

## Contexto

Dossiê UX: "sair de 1 tipo de evento pra cobrir vencimento, erro de importação, conciliação pendente — com ação embutida por item." `NotificacoesMenu` hoje só mostra `alertas_enviados` (resumo diário de vencimentos por e-mail), itens sem link nenhum (só texto).

## Design

Nova função `buscarNotificacoes` (`lib/notificacoes/notificacoes.ts`) une 3 fontes numa lista só, cada item já com `href` (a ação embutida que o dossiê pediu — clicar no item já leva pra resolver, não só avisa):

1. **Resumo de equipe** (existente, `alertas_enviados`) — inalterado.
2. **Vencimento** — contagem de parcelas `PENDENTE`/`RENEGOCIADO` com `data_vencimento` no passado, uma entrada agregada por direção (a pagar / a receber) quando há pelo menos 1 — link direto pro filtro "Vencido" da tela correspondente.
3. **Erro de importação** — últimas importações com pelo menos 1 item em status `erro` — link pro detalhe da importação em `/importacao/historico/[id]`.

Sem tabela nova — as 3 fontes já existem (`parcelas`, `importacoes`/`importacoes_itens`, `alertas_enviados`), calculadas ao vivo a cada carregamento do layout autenticado (mesmo lugar de antes).

`NotificacoesMenu` ganha ícone por tipo (cor semântica: vermelho pra pendência/erro, verde pra a receber) e cada item vira `<Link>` de verdade (antes era texto sem ação). Fix de fuso horário do erro #418 (fixação de `America/Sao_Paulo`) preservado sem alteração.

## Fora de escopo

- **Conciliação pendente** — não existe hoje nenhum estado persistido de "conciliação pendente" pra consultar (a tela de conciliar é um wizard sem rastro gravado entre sessões, diferente de vencimento/erro de importação que já são estado real no banco). Inventar esse rastreamento é escopo de fatia própria, não uma extensão barata desta.
- Notificação em tempo real (websocket/push) — a central continua carregando no request da página, mesmo modelo de antes.
- Marcar notificação como lida/dispensada — YAGNI, lista já é pequena (limite de 8) e recalculada a cada carregamento.
