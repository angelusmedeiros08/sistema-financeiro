# Onboarding ampliado (Fatia 8 do dossiê UX)

## Contexto

Dossiê UX: "checklist mais abrangente que os 3 itens atuais, com progresso salvo — sem virar tour bloqueante." `PrimeirosPassosCard` (Painel) já existe com 3 marcos (conta financeira, cliente, lançamento), cada um derivado de dado real do tenant (não um checklist local em `localStorage`/state) — **"progresso salvo" já estava resolvido**: o estado nunca se perde entre sessões/dispositivos porque não é armazenado separado, é a própria existência do dado. O gap real era só a cobertura: 3 marcos é pouco pra um ERP financeiro completo.

## Design

Amplia `PrimeirosPassos` de 3 pra 5 marcos, mesma filosofia (cada um, uma query `count` contra uma tabela real):

1. **Conta financeira** (já existia).
2. **Pessoa cadastrada** — generaliza o antigo "cliente" (contava só `perfis @> {CLIENTE}`); agora conta qualquer pessoa (cliente ou fornecedor) — o marco é "você começou a povoar o cadastro", não uma dimensão específica.
3. **Lançamento registrado** (já existia).
4. **Baixa registrada** — novo. Marca o momento em que a pessoa não só lançou, mas efetivamente deu baixa (pagamento/recebimento) em algo — fecha o ciclo completo do fluxo financeiro básico.
5. **Equipe** — novo. `usuario_tenant` com mais de 1 vínculo ativo (o dono sempre conta como 1) — incentiva convidar quem mais vai usar o sistema, sem o que o produto vira ilha de uma pessoa só.

Continua não-bloqueante: card só aparece enquanto houver item pendente (`if (concluidos === PASSOS.length) return null`, inalterado), nunca modal, nunca impede navegação.

## Fora de escopo

- Persistência de "dispensar este passo" — YAGNI, os 5 marcos são universalmente relevantes pra qualquer tenant (nenhum é opcional o bastante pra precisar de botão de pular).
- Onboarding fora do Painel (tour guiado, tooltips contextuais) — o card já é o mecanismo estabelecido, ampliar formato é escopo maior que "mais abrangente".
