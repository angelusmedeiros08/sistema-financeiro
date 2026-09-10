"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaperPlaneRight, CheckCircle, XCircle, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ChatCircleDots, Spinner } from "@phosphor-icons/react";
import { formatarMoeda } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

type MensagemChat = {
  id: string;
  papel: "usuario" | "assistente" | "ferramenta";
  conteudo: string | null;
  ferramentaNome: string | null;
  ferramentaOutput: unknown;
  propostaConfirmada: boolean | null;
};

type PropostaCriar = { acao: "criar_lancamento"; tipo: "RECEITA" | "DESPESA"; descricao: string; valor: number; data: string; categoria: { nome: string; categoriaNova: boolean }; pessoa: { nome: string; pessoaNova: boolean } | null };
type PropostaEditar = { acao: "editar_lancamento"; descricaoAtual: string; valorAtual: number; novaDescricao: string; novoValor: number };
type PropostaCancelar = { acao: "cancelar_parcela"; descricao: string; valor: number; motivo: string };
type UsoIA = { usadoUsd: number; limiteUsd: number; usadoBrl: number; limiteBrl: number };

// Painel do Chat IA — evolui o antigo placeholder "Em breve" do
// ChatDuvidasMenu (Fatia 7 do plano). Streaming consumido manualmente via
// fetch + leitura de ReadableStream (SSE), sem lib extra — é a primeira
// tela do projeto consumindo isso, mesma decisão de "sem precedente, essa
// é a convenção" já registrada na rota.
export function ChatPainel() {
  const router = useRouter();
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [streamParcial, setStreamParcial] = useState("");
  const [statusFerramenta, setStatusFerramenta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [uso, setUso] = useState<UsoIA | null>(null);
  const [propostasEmAndamento, setPropostasEmAndamento] = useState<Set<string>>(new Set());
  const fimDaListaRef = useRef<HTMLDivElement>(null);
  // Guarda síncrona contra clique duplo/Enter duplo: `enviando` é estado
  // React, que não muda de valor sincronamente (dois Enters rápidos podem
  // ler enviando === false os dois antes do primeiro setEnviando(true)
  // surtir efeito). Ref muda na hora, sem esperar re-render.
  const enviandoRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/chat");
        const dados = await resp.json();
        if (dados.uso) setUso(dados.uso);
        if (dados.conversaId) {
          setConversaId(dados.conversaId);
          await recarregarMensagens(dados.conversaId);
        }
      } finally {
        setCarregandoHistorico(false);
      }
    })();
  }, []);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, streamParcial]);

  async function recarregarMensagens(id: string) {
    const resp = await fetch(`/api/chat?conversaId=${id}`);
    const dados = await resp.json();
    setMensagens(dados.mensagens ?? []);
  }

  async function enviarMensagem() {
    const mensagem = texto.trim();
    if (!mensagem || enviandoRef.current) return;
    enviandoRef.current = true;

    setTexto("");
    setErro(null);
    setEnviando(true);
    setStreamParcial("");
    setStatusFerramenta(null);
    // Otimista: mostra a mensagem do usuário na hora, sem esperar o servidor.
    const idTemporario = `temp-${Date.now()}`;
    setMensagens((atual) => [...atual, { id: idTemporario, papel: "usuario", conteudo: mensagem, ferramentaNome: null, ferramentaOutput: null, propostaConfirmada: null }]);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId, mensagem }),
      });

      if (!resp.ok || !resp.body) {
        const dados = await resp.json().catch(() => ({}));
        if (dados.uso) setUso(dados.uso);
        setErro(dados.erro ?? "Falha ao conversar com a IA.");
        // A mensagem otimista nunca chegou a ser persistida — tira da tela
        // em vez de deixá-la parecendo enviada até o próximo refresh
        // silenciosamente apagar ela (achado real, 09/09/2026).
        setMensagens((atual) => atual.filter((m) => m.id !== idTemporario));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let bufer = "";
      let conversaIdDoStream = conversaId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufer += decoder.decode(value, { stream: true });

        const partes = bufer.split("\n\n");
        bufer = partes.pop() ?? "";
        for (const parte of partes) {
          if (!parte.startsWith("data: ")) continue;
          // Um chunk SSE malformado (proxy reescrevendo, frame cortado) não
          // pode derrubar o loop inteiro — sem o try/catch local, um
          // JSON.parse ruim pulava direto pro catch de fora, que mostra
          // "Falha de conexão" e nunca chega no recarregarMensagens final,
          // deixando a tela sem as mensagens que o servidor já salvou
          // (achado real, 09/09/2026).
          try {
            const evento = JSON.parse(parte.slice(6));
            if (evento.tipo === "inicio") conversaIdDoStream = evento.conversaId;
            else if (evento.tipo === "uso")
              setUso({ usadoUsd: evento.usadoUsd, limiteUsd: evento.limiteUsd, usadoBrl: evento.usadoBrl, limiteBrl: evento.limiteBrl });
            else if (evento.tipo === "texto") setStreamParcial((atual) => atual + evento.delta);
            else if (evento.tipo === "ferramenta_chamada") setStatusFerramenta(`Consultando ${evento.nome}…`);
            else if (evento.tipo === "erro") setErro(evento.mensagem);
          } catch {
            continue;
          }
        }
      }

      if (conversaIdDoStream && conversaIdDoStream !== conversaId) setConversaId(conversaIdDoStream);
      if (conversaIdDoStream) await recarregarMensagens(conversaIdDoStream);
    } catch {
      setErro("Falha de conexão — tente de novo.");
      setMensagens((atual) => atual.filter((m) => m.id !== idTemporario));
    } finally {
      setStreamParcial("");
      setStatusFerramenta(null);
      setEnviando(false);
      enviandoRef.current = false;
    }
  }

  async function responderProposta(mensagemId: string, acao: "confirmar" | "descartar") {
    // Trava local contra clique duplo (o backend também reivindica a
    // proposta de forma atômica — ver /api/chat/confirmar — mas travar aqui
    // já evita o segundo request na maioria dos casos, sem depender só do
    // 409 de volta).
    if (propostasEmAndamento.has(mensagemId)) return;
    setPropostasEmAndamento((atual) => new Set(atual).add(mensagemId));
    setErro(null);
    try {
      const resp = await fetch("/api/chat/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagemId, acao }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.erro ?? "Falha ao processar a proposta.");
        return;
      }
      if (conversaId) await recarregarMensagens(conversaId);
      // A action real (criarReceita/criarDespesa/cancelarParcelaAction etc.)
      // roda dentro de um Route Handler (/api/chat/confirmar), não como
      // invocação nativa de Server Action — o `revalidatePath` interno dela
      // não atualiza o cache de router desta aba sozinho (achado em auditoria
      // de revalidação). Sem isso, confirmar uma proposta de lançamento não
      // atualizava a tela atrás do painel de chat.
      router.refresh();
    } finally {
      setPropostasEmAndamento((atual) => {
        const novo = new Set(atual);
        novo.delete(mensagemId);
        return novo;
      });
    }
  }

  if (carregandoHistorico) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const limiteAtingido = uso !== null && uso.usadoUsd >= uso.limiteUsd;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {mensagens.length === 0 && !streamParcial ? (
          <EstadoVazio texto="Pergunte sobre seus lançamentos, peça um resumo, ou diga o que você pagou/recebeu." icon={ChatCircleDots} />
        ) : (
          <div className="flex flex-col gap-3">
            {mensagens.map((m) => (
              <BolhaMensagem key={m.id} mensagem={m} aoResponderProposta={responderProposta} emAndamento={propostasEmAndamento.has(m.id)} />
            ))}
            {streamParcial && <Bolha papel="assistente">{streamParcial}</Bolha>}
            {statusFerramenta && <p className="px-1 text-xs text-muted-foreground italic">{statusFerramenta}</p>}
            <div ref={fimDaListaRef} />
          </div>
        )}
      </div>

      {erro && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <WarningCircle size={14} weight="bold" className="shrink-0" />
          {erro}
        </div>
      )}

      {uso && <IndicadorUsoChatIA uso={uso} />}

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviarMensagem();
        }}
      >
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviarMensagem();
            }
          }}
          placeholder={limiteAtingido ? "Limite de uso de IA do mês atingido. Tente de novo mais tarde." : "Pergunte algo ou descreva um lançamento…"}
          className="min-h-10 flex-1 resize-none"
          rows={1}
          disabled={enviando || limiteAtingido}
        />
        <Button type="submit" size="icon" disabled={enviando || limiteAtingido || !texto.trim()} aria-label="Enviar">
          {enviando ? <Spinner size={16} className="animate-spin" /> : <PaperPlaneRight size={16} weight="bold" />}
        </Button>
      </form>
    </div>
  );
}

// Mesma lógica do Claude.ai/Claude Code: mostra o consumo antes de bloquear,
// não só um erro seco quando bate o teto. Orçamento COMPARTILHADO com a
// Importação com IA (spec 2026-09-10, orçamento por custo real em vez de
// contagem de mensagem) — usar a Importação também move este indicador.
// Porcentagem, nunca o valor em reais: mostrar "R$X de R$30" expõe um teto
// que parece baixo e assusta o cliente sem necessidade (achado do usuário,
// 10/09/2026) — a % comunica o mesmo progresso sem revelar o número.
// Legenda sempre visível (não só num title de hover, que some no toque em
// celular e ninguém descobre por acaso). Janela mensal (30 dias
// deslizantes, não reseta no dia 1), escolhida de propósito pra não
// bloquear uma importação grande no meio do mês só por causa de um teto
// diário artificial.
function IndicadorUsoChatIA({ uso }: { uso: UsoIA }) {
  const pct = Math.min(100, Math.round((uso.usadoUsd / uso.limiteUsd) * 100));
  const atingiu = uso.usadoUsd >= uso.limiteUsd;
  const alerta = !atingiu && pct >= 80;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">Cota mensal de IA</span>
        <span
          className={cn(
            "shrink-0 text-xs font-semibold tabular-nums",
            atingiu ? "text-destructive" : alerta ? "text-[#96690F] dark:text-[#F0BB4E]" : "text-foreground",
          )}
        >
          {pct}% usado
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            atingiu ? "bg-destructive" : alerta ? "bg-[#C98A1F] dark:bg-[#F0BB4E]" : "bg-primary/60",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">Cota compartilhada entre o Chat IA e a Importação com IA.</p>
    </div>
  );
}

function Bolha({ papel, children }: { papel: "usuario" | "assistente"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", papel === "usuario" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] min-w-0 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
          papel === "usuario" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Checagem de forma de verdade, não um cast cego — protege a UI de um
// ferramenta_output malformado (ou de um formato futuro que a IA passe a
// gerar sem o card correspondente ter sido atualizado ainda).
function pareceProposta(valor: unknown): PropostaCriar | PropostaEditar | PropostaCancelar | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Record<string, unknown>;

  if (v.acao === "criar_lancamento" && typeof v.descricao === "string" && typeof v.valor === "number" && (v.tipo === "RECEITA" || v.tipo === "DESPESA")) {
    return valor as PropostaCriar;
  }
  if (v.acao === "editar_lancamento" && typeof v.novaDescricao === "string" && typeof v.novoValor === "number") {
    return valor as PropostaEditar;
  }
  if (v.acao === "cancelar_parcela" && typeof v.descricao === "string" && typeof v.valor === "number") {
    return valor as PropostaCancelar;
  }
  return null;
}

function BolhaMensagem({
  mensagem,
  aoResponderProposta,
  emAndamento,
}: {
  mensagem: MensagemChat;
  aoResponderProposta: (id: string, acao: "confirmar" | "descartar") => void;
  emAndamento: boolean;
}) {
  if (mensagem.papel === "usuario") return <Bolha papel="usuario">{mensagem.conteudo}</Bolha>;
  if (mensagem.papel === "assistente") return mensagem.conteudo ? <Bolha papel="assistente">{mensagem.conteudo}</Bolha> : null;

  // papel === "ferramenta": só vira UI visível quando é uma proposta de
  // ação de verdade e com o formato que DescricaoProposta espera — nunca
  // um cast cego. Sem essa checagem de verdade (em vez de só "'acao' in
  // saida"), um ferramenta_output com forma inesperada caía sempre no
  // último ramo de DescricaoProposta (else = cancelar_parcela) e tentava
  // ler campos que não existiam ali (achado real, 09/09/2026).
  const saida = pareceProposta(mensagem.ferramentaOutput);
  if (!saida) return null;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[90%] rounded-xl border border-border bg-card p-3 text-sm">
        <DescricaoProposta proposta={saida} />
        {mensagem.propostaConfirmada === null && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={emAndamento} onClick={() => aoResponderProposta(mensagem.id, "confirmar")}>
              {emAndamento ? <Spinner size={14} className="animate-spin" /> : <CheckCircle size={14} weight="bold" />} Confirmar
            </Button>
            <Button size="sm" variant="outline" disabled={emAndamento} onClick={() => aoResponderProposta(mensagem.id, "descartar")}>
              <XCircle size={14} weight="bold" /> Descartar
            </Button>
          </div>
        )}
        {mensagem.propostaConfirmada === true && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
            <CheckCircle size={14} weight="fill" /> Confirmada
          </p>
        )}
        {mensagem.propostaConfirmada === false && <p className="mt-2 text-xs text-muted-foreground">Descartada.</p>}
      </div>
    </div>
  );
}

function DescricaoProposta({ proposta }: { proposta: PropostaCriar | PropostaEditar | PropostaCancelar }) {
  if (proposta.acao === "criar_lancamento") {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{proposta.tipo === "RECEITA" ? "Criar receita" : "Criar despesa"}</p>
        <p>
          {proposta.descricao} — <span className="font-medium">{formatarMoeda(proposta.valor)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Categoria: {proposta.categoria.nome}
          {proposta.categoria.categoriaNova && " (nova)"}
          {proposta.pessoa && ` · Pessoa: ${proposta.pessoa.nome}${proposta.pessoa.pessoaNova ? " (nova)" : ""}`}
        </p>
      </div>
    );
  }
  if (proposta.acao === "editar_lancamento") {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Editar lançamento</p>
        <p className="text-xs text-muted-foreground">
          {proposta.descricaoAtual} ({formatarMoeda(proposta.valorAtual)})
        </p>
        <p>
          → {proposta.novaDescricao} — <span className="font-medium">{formatarMoeda(proposta.novoValor)}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">Cancelar parcela</p>
      <p>
        {proposta.descricao} — <span className="font-medium">{formatarMoeda(proposta.valor)}</span>
      </p>
      <p className="text-xs text-muted-foreground">Motivo: {proposta.motivo}</p>
    </div>
  );
}
