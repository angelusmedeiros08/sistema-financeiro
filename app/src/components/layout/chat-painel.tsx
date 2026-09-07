"use client";

import { useEffect, useRef, useState } from "react";
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
type Candidatos = { candidatos: { descricao?: string; valor?: number }[] };

// Painel do Chat IA — evolui o antigo placeholder "Em breve" do
// ChatDuvidasMenu (Fatia 7 do plano). Streaming consumido manualmente via
// fetch + leitura de ReadableStream (SSE), sem lib extra — é a primeira
// tela do projeto consumindo isso, mesma decisão de "sem precedente, essa
// é a convenção" já registrada na rota.
export function ChatPainel() {
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [streamParcial, setStreamParcial] = useState("");
  const [statusFerramenta, setStatusFerramenta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/chat");
        const dados = await resp.json();
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
    if (!mensagem || enviando) return;

    setTexto("");
    setErro(null);
    setEnviando(true);
    setStreamParcial("");
    setStatusFerramenta(null);
    // Otimista: mostra a mensagem do usuário na hora, sem esperar o servidor.
    setMensagens((atual) => [...atual, { id: `temp-${Date.now()}`, papel: "usuario", conteudo: mensagem, ferramentaNome: null, ferramentaOutput: null, propostaConfirmada: null }]);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId, mensagem }),
      });

      if (!resp.ok || !resp.body) {
        const dados = await resp.json().catch(() => ({}));
        setErro(dados.erro ?? "Falha ao conversar com a IA.");
        setEnviando(false);
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
          const evento = JSON.parse(parte.slice(6));
          if (evento.tipo === "inicio") conversaIdDoStream = evento.conversaId;
          else if (evento.tipo === "texto") setStreamParcial((atual) => atual + evento.delta);
          else if (evento.tipo === "ferramenta_chamada") setStatusFerramenta(`Consultando ${evento.nome}…`);
          else if (evento.tipo === "erro") setErro(evento.mensagem);
        }
      }

      if (conversaIdDoStream && conversaIdDoStream !== conversaId) setConversaId(conversaIdDoStream);
      if (conversaIdDoStream) await recarregarMensagens(conversaIdDoStream);
    } catch {
      setErro("Falha de conexão — tente de novo.");
    } finally {
      setStreamParcial("");
      setStatusFerramenta(null);
      setEnviando(false);
    }
  }

  async function responderProposta(mensagemId: string, acao: "confirmar" | "descartar") {
    setErro(null);
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
  }

  if (carregandoHistorico) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {mensagens.length === 0 && !streamParcial ? (
          <EstadoVazio texto="Pergunte sobre seus lançamentos, peça um resumo, ou diga o que você pagou/recebeu." icon={ChatCircleDots} />
        ) : (
          <div className="flex flex-col gap-3">
            {mensagens.map((m) => (
              <BolhaMensagem key={m.id} mensagem={m} aoResponderProposta={responderProposta} />
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
          placeholder="Pergunte algo ou descreva um lançamento…"
          className="min-h-10 flex-1 resize-none"
          rows={1}
          disabled={enviando}
        />
        <Button type="submit" size="icon" disabled={enviando || !texto.trim()} aria-label="Enviar">
          {enviando ? <Spinner size={16} className="animate-spin" /> : <PaperPlaneRight size={16} weight="bold" />}
        </Button>
      </form>
    </div>
  );
}

function Bolha({ papel, children }: { papel: "usuario" | "assistente"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", papel === "usuario" ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap", papel === "usuario" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{children}</div>
    </div>
  );
}

function BolhaMensagem({ mensagem, aoResponderProposta }: { mensagem: MensagemChat; aoResponderProposta: (id: string, acao: "confirmar" | "descartar") => void }) {
  if (mensagem.papel === "usuario") return <Bolha papel="usuario">{mensagem.conteudo}</Bolha>;
  if (mensagem.papel === "assistente") return mensagem.conteudo ? <Bolha papel="assistente">{mensagem.conteudo}</Bolha> : null;

  // papel === "ferramenta": só vira UI visível quando é uma proposta de
  // ação de verdade (acao definida no output) — consulta de leitura pura
  // fica invisível, o texto do assistente já resume o que importa.
  const saida = mensagem.ferramentaOutput as (PropostaCriar | PropostaEditar | PropostaCancelar | Candidatos | { erro: string }) | null;
  if (!saida || typeof saida !== "object" || !("acao" in saida)) return null;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[90%] rounded-xl border border-border bg-card p-3 text-sm">
        <DescricaoProposta proposta={saida} />
        {mensagem.propostaConfirmada === null && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => aoResponderProposta(mensagem.id, "confirmar")}>
              <CheckCircle size={14} weight="bold" /> Confirmar
            </Button>
            <Button size="sm" variant="outline" onClick={() => aoResponderProposta(mensagem.id, "descartar")}>
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
