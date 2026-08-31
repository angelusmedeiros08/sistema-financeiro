"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CamposEndereco, ENDERECO_VAZIO, ROTULO_TIPO_ENDERECO, type ValoresEndereco } from "@/components/formularios/campos-endereco";
import { buscarEmpresaPorCnpj } from "@/lib/cnpj";
import type { Database } from "@/utils/supabase/database.types";
import type { DadosPessoa, CampoPersonalizadoDefinicao } from "@/lib/pessoas/buscar-pessoa";
import { notificarResultado } from "@/lib/feedback/notificar-resultado";

type PerfilPessoa = Database["public"]["Enums"]["perfil_pessoa"];
type NaturezaPessoa = Database["public"]["Enums"]["natureza_pessoa"];
type ResultadoAcao = { erro: string } | { sucesso: true };

const PERFIS: { valor: PerfilPessoa; rotulo: string }[] = [
  { valor: "CLIENTE", rotulo: "Cliente" },
  { valor: "FORNECEDOR", rotulo: "Fornecedor" },
  { valor: "TRANSPORTADORA", rotulo: "Transportadora" },
];

type EnderecoPendente = ValoresEndereco & { tempId: string; principal: boolean };

type ContatoPendente = {
  tempId: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  principal: boolean;
};

const CONTATO_VAZIO: Omit<ContatoPendente, "tempId"> = {
  nome: "",
  cargo: "",
  email: "",
  telefone: "",
  principal: false,
};

function formatarLinhaEnderecoPendente(e: EnderecoPendente) {
  const partes = [
    e.logradouro && e.numero ? `${e.logradouro}, ${e.numero}` : e.logradouro,
    e.bairro,
    e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : "Endereço incompleto";
}

// Endereços/contatos ainda não têm pessoa_id na criação — ficam só em
// estado local até o submit, e só viram INSERT de verdade depois que
// criarPessoaAction cria a pessoa e resolve o id real.
function EnderecoPendenteEditor({
  enderecos,
  onChange,
}: {
  enderecos: EnderecoPendente[];
  onChange: (proximos: EnderecoPendente[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<EnderecoPendente>({ ...ENDERECO_VAZIO, tempId: "", principal: false });

  function adicionar() {
    const novo: EnderecoPendente = { ...rascunho, tempId: crypto.randomUUID() };
    onChange(rascunho.principal ? [...enderecos.map((e) => ({ ...e, principal: false })), novo] : [...enderecos, novo]);
    setRascunho({ ...ENDERECO_VAZIO, tempId: "", principal: false });
    setAberto(false);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>Endereços</Label>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {aberto ? "Fechar" : "Adicionar endereço"}
        </button>
      </div>

      {enderecos.length === 0 && !aberto && <p className="text-sm text-muted-foreground">Nenhum endereço adicionado ainda.</p>}

      {enderecos.length > 0 && (
        <ul className="mb-2 flex flex-col gap-2">
          {enderecos.map((e) => (
            <li key={e.tempId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{ROTULO_TIPO_ENDERECO[e.tipo]}</span>
                  {e.principal && <Badge className="border-none bg-positivo/12 font-semibold text-positivo-foreground">Principal</Badge>}
                </div>
                <p className="truncate text-sm text-muted-foreground">{formatarLinhaEnderecoPendente(e)}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(enderecos.filter((x) => x.tempId !== e.tempId))}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
          <CamposEndereco
            valores={rascunho}
            onChange={(proximo) => setRascunho((r) => ({ ...r, ...proximo }))}
            names={null}
          />
          <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
            <Checkbox checked={rascunho.principal} onCheckedChange={(v) => setRascunho((r) => ({ ...r, principal: v === true }))} />
            Definir como endereço principal
          </label>
          <div className="sm:col-span-2">
            <Button type="button" size="sm" onClick={adicionar}>
              Adicionar à lista
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContatoPendenteEditor({
  contatos,
  onChange,
}: {
  contatos: ContatoPendente[];
  onChange: (proximos: ContatoPendente[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(CONTATO_VAZIO);
  const [erro, setErro] = useState("");

  function adicionar() {
    if (!rascunho.nome.trim()) {
      setErro("Informe o nome do contato.");
      return;
    }
    const novo: ContatoPendente = { ...rascunho, tempId: crypto.randomUUID() };
    onChange(rascunho.principal ? [...contatos.map((c) => ({ ...c, principal: false })), novo] : [...contatos, novo]);
    setRascunho(CONTATO_VAZIO);
    setErro("");
    setAberto(false);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>Contatos</Label>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {aberto ? "Fechar" : "Adicionar contato"}
        </button>
      </div>

      {contatos.length === 0 && !aberto && <p className="text-sm text-muted-foreground">Nenhum contato adicionado ainda.</p>}

      {contatos.length > 0 && (
        <ul className="mb-2 flex flex-col gap-2">
          {contatos.map((c) => (
            <li key={c.tempId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.nome}</span>
                  {c.cargo && <span className="text-xs text-muted-foreground">{c.cargo}</span>}
                  {c.principal && <Badge className="border-none bg-positivo/12 font-semibold text-positivo-foreground">Principal</Badge>}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {[c.email, c.telefone].filter(Boolean).join(" · ") || "Sem e-mail/telefone"}
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(contatos.filter((x) => x.tempId !== c.tempId))}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={rascunho.nome} onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Input value={rascunho.cargo} onChange={(e) => setRascunho((r) => ({ ...r, cargo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={rascunho.email} onChange={(e) => setRascunho((r) => ({ ...r, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={rascunho.telefone} onChange={(e) => setRascunho((r) => ({ ...r, telefone: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
            <Checkbox checked={rascunho.principal} onCheckedChange={(v) => setRascunho((r) => ({ ...r, principal: v === true }))} />
            Definir como contato principal
          </label>
          {erro && <p className="text-sm text-destructive sm:col-span-2">{erro}</p>}
          <div className="sm:col-span-2">
            <Button type="button" size="sm" onClick={adicionar}>
              Adicionar à lista
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const estadoInicial = { erro: "" };

export function PessoaForm({
  modo,
  perfilPadrao,
  pessoa,
  camposPersonalizados,
  acao,
}: {
  modo: "criar" | "editar";
  perfilPadrao?: PerfilPessoa;
  pessoa?: DadosPessoa;
  camposPersonalizados: CampoPersonalizadoDefinicao[];
  acao: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const [perfisSelecionados, setPerfisSelecionados] = useState<PerfilPessoa[]>(
    pessoa?.perfis ?? (perfilPadrao ? [perfilPadrao] : []),
  );
  const [valoresCampos, setValoresCampos] = useState<Record<string, unknown>>(
    pessoa?.campos_personalizados ?? {},
  );
  const [enderecosPendentes, setEnderecosPendentes] = useState<EnderecoPendente[]>([]);
  const [contatosPendentes, setContatosPendentes] = useState<ContatoPendente[]>([]);
  const [dadosBasicos, setDadosBasicos] = useState({
    nome: pessoa?.nome ?? "",
    documento: pessoa?.documento ?? "",
    natureza: pessoa?.natureza ?? ("" as NaturezaPessoa | ""),
    email: pessoa?.email ?? "",
    telefone: pessoa?.telefone ?? "",
  });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState("");

  const [, formAction, pendente] = useActionState(async (_: typeof estadoInicial, formData: FormData) => {
    const resultado = await acao(formData);
    // Mensagem genérica ("Cadastro", não "Cliente"/"Fornecedor") porque uma
    // pessoa pode ter múltiplos perfis ao mesmo tempo (checkbox, não
    // exclusivo) — nomear um só seria impreciso quando há mais de um
    // marcado, e a concordância de gênero varia entre os três rótulos
    // (Cliente/Fornecedor masc., Transportadora fem.).
    notificarResultado(resultado, modo === "criar" ? "Cadastro criado." : "Cadastro salvo.");
    if ("erro" in resultado) return { erro: resultado.erro };
    return { erro: "" };
  }, estadoInicial);

  function alternarPerfil(perfil: PerfilPessoa, marcado: boolean) {
    setPerfisSelecionados((atual) => (marcado ? [...atual, perfil] : atual.filter((p) => p !== perfil)));
  }

  // Autopreenchimento só na criação — sobrescrever nome/endereço de um
  // cadastro já existente (possivelmente já customizado à mão) por causa
  // de uma edição em outro campo é mais risco que ajuda.
  async function aoSairDoDocumento() {
    if (modo !== "criar") return;
    const digitos = dadosBasicos.documento.replace(/\D/g, "");
    if (digitos.length !== 14) {
      setAvisoCnpj("");
      return;
    }
    setBuscandoCnpj(true);
    setAvisoCnpj("");
    const empresa = await buscarEmpresaPorCnpj(dadosBasicos.documento);
    setBuscandoCnpj(false);
    if (!empresa) {
      setAvisoCnpj("CNPJ não encontrado.");
      return;
    }

    setDadosBasicos((d) => ({
      ...d,
      nome: empresa.nome || d.nome,
      email: empresa.email || d.email,
      telefone: empresa.telefone || d.telefone,
      natureza: "JURIDICA",
    }));

    setEnderecosPendentes((atual) =>
      atual.length === 0 ? [{ ...empresa.endereco, tempId: crypto.randomUUID(), principal: true }] : atual,
    );

    if (empresa.situacaoCadastral && empresa.situacaoCadastral !== "ATIVA") {
      setAvisoCnpj(`Atenção: situação cadastral "${empresa.situacaoCadastral}" na Receita.`);
    }
  }

  const camposVisiveis = camposPersonalizados.filter(
    (c) => c.aplica_a === "AMBOS" || perfisSelecionados.includes(c.aplica_a as PerfilPessoa),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {pessoa && <input type="hidden" name="pessoa_id" value={pessoa.id} />}
      <input type="hidden" name="campos_personalizados" value={JSON.stringify(valoresCampos)} />
      {modo === "criar" && (
        <>
          <input type="hidden" name="enderecos_json" value={JSON.stringify(enderecosPendentes)} />
          <input type="hidden" name="contatos_json" value={JSON.stringify(contatosPendentes)} />
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nome">Nome / Razão social</Label>
          <Input
            id="nome"
            name="nome"
            type="text"
            required
            value={dadosBasicos.nome}
            onChange={(e) => setDadosBasicos((d) => ({ ...d, nome: e.target.value }))}
            placeholder="Nome completo ou razão social"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="natureza">Tipo de pessoa</Label>
          <Select
            name="natureza"
            value={dadosBasicos.natureza}
            onValueChange={(v) => setDadosBasicos((d) => ({ ...d, natureza: v as NaturezaPessoa }))}
          >
            <SelectTrigger id="natureza" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FISICA">Física</SelectItem>
              <SelectItem value="JURIDICA">Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="documento">CPF/CNPJ</Label>
          <Input
            id="documento"
            name="documento"
            type="text"
            value={dadosBasicos.documento}
            onChange={(e) => setDadosBasicos((d) => ({ ...d, documento: e.target.value }))}
            onBlur={aoSairDoDocumento}
            placeholder={modo === "criar" ? "CNPJ busca os dados automaticamente" : "Opcional"}
          />
          {buscandoCnpj && <p className="text-xs text-muted-foreground">Buscando dados na Receita...</p>}
          {avisoCnpj && <p className="text-xs text-destructive">{avisoCnpj}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={dadosBasicos.email}
            onChange={(e) => setDadosBasicos((d) => ({ ...d, email: e.target.value }))}
            placeholder="Opcional"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            name="telefone"
            type="text"
            value={dadosBasicos.telefone}
            onChange={(e) => setDadosBasicos((d) => ({ ...d, telefone: e.target.value }))}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Perfis</Label>
        <div className="flex flex-wrap gap-4">
          {PERFIS.map((p) => (
            <label key={p.valor} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                name="perfis"
                value={p.valor}
                checked={perfisSelecionados.includes(p.valor)}
                onCheckedChange={(marcado) => alternarPerfil(p.valor, marcado === true)}
              />
              {p.rotulo}
            </label>
          ))}
        </div>
      </div>

      {modo === "criar" && (
        <>
          <div className="border-t border-border pt-4">
            <EnderecoPendenteEditor enderecos={enderecosPendentes} onChange={setEnderecosPendentes} />
          </div>
          <div className="border-t border-border pt-4">
            <ContatoPendenteEditor contatos={contatosPendentes} onChange={setContatosPendentes} />
          </div>
        </>
      )}

      {camposVisiveis.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Campos personalizados</Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {camposVisiveis.map((campo) => (
              <div key={campo.id} className="space-y-1.5">
                <Label htmlFor={`campo-${campo.id}`}>{campo.rotulo}</Label>
                {campo.tipo === "BOOLEANO" ? (
                  <label className="flex h-8 items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      id={`campo-${campo.id}`}
                      checked={valoresCampos[campo.id] === true}
                      onCheckedChange={(marcado) =>
                        setValoresCampos((atual) => ({ ...atual, [campo.id]: marcado === true }))
                      }
                    />
                    Sim
                  </label>
                ) : (
                  <Input
                    id={`campo-${campo.id}`}
                    type={campo.tipo === "NUMERO" ? "number" : campo.tipo === "DATA" ? "date" : "text"}
                    value={(valoresCampos[campo.id] as string) ?? ""}
                    onChange={(e) => setValoresCampos((atual) => ({ ...atual, [campo.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : modo === "criar" ? "Criar cadastro" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
