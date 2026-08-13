export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      anexos: {
        Row: {
          baixa_id: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          evento_financeiro_id: string | null
          forma: Database["public"]["Enums"]["forma_anexo"]
          id: string
          mime_type: string | null
          nome_arquivo: string | null
          regra_recorrencia_id: string | null
          storage_path: string | null
          tamanho_bytes: number | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_anexo"]
          url: string | null
        }
        Insert: {
          baixa_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          evento_financeiro_id?: string | null
          forma: Database["public"]["Enums"]["forma_anexo"]
          id?: string
          mime_type?: string | null
          nome_arquivo?: string | null
          regra_recorrencia_id?: string | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_anexo"]
          url?: string | null
        }
        Update: {
          baixa_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          evento_financeiro_id?: string | null
          forma?: Database["public"]["Enums"]["forma_anexo"]
          id?: string
          mime_type?: string | null
          nome_arquivo?: string | null
          regra_recorrencia_id?: string | null
          storage_path?: string | null
          tamanho_bytes?: number | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_anexo"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anexos_baixa_id_fkey"
            columns: ["baixa_id"]
            isOneToOne: false
            referencedRelation: "baixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "eventos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_regra_recorrencia_id_fkey"
            columns: ["regra_recorrencia_id"]
            isOneToOne: false
            referencedRelation: "regras_recorrencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      baixas: {
        Row: {
          conta_financeira_id: string | null
          criado_em: string
          data_pagamento: string
          estornado_em: string | null
          id: string
          lancamento_id: string | null
          parcela_id: string
          tenant_id: string
          valor_desconto: number
          valor_juros: number
          valor_multa: number
          valor_pago: number
          valor_taxa: number
        }
        Insert: {
          conta_financeira_id?: string | null
          criado_em?: string
          data_pagamento: string
          estornado_em?: string | null
          id?: string
          lancamento_id?: string | null
          parcela_id: string
          tenant_id: string
          valor_desconto?: number
          valor_juros?: number
          valor_multa?: number
          valor_pago: number
          valor_taxa?: number
        }
        Update: {
          conta_financeira_id?: string | null
          criado_em?: string
          data_pagamento?: string
          estornado_em?: string | null
          id?: string
          lancamento_id?: string | null
          parcela_id?: string
          tenant_id?: string
          valor_desconto?: number
          valor_juros?: number
          valor_multa?: number
          valor_pago?: number
          valor_taxa?: number
        }
        Relationships: [
          {
            foreignKeyName: "baixas_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baixas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          categoria_pai_id: string | null
          conta_contabil_id: string | null
          criado_em: string
          id: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Insert: {
          categoria_pai_id?: string | null
          conta_contabil_id?: string | null
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Update: {
          categoria_pai_id?: string | null
          conta_contabil_id?: string | null
          criado_em?: string
          id?: string
          nome?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_financeiras_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_financeiras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean
          codigo: string | null
          criado_em: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          criado_em?: string
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_contabeis: {
        Row: {
          codigo: string
          conta_pai_id: string | null
          criado_em: string
          id: string
          natureza: Database["public"]["Enums"]["natureza_conta"]
          nome: string
          sistema: boolean
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_conta_contabil"]
        }
        Insert: {
          codigo: string
          conta_pai_id?: string | null
          criado_em?: string
          id?: string
          natureza: Database["public"]["Enums"]["natureza_conta"]
          nome: string
          sistema?: boolean
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_conta_contabil"]
        }
        Update: {
          codigo?: string
          conta_pai_id?: string | null
          criado_em?: string
          id?: string
          natureza?: Database["public"]["Enums"]["natureza_conta"]
          nome?: string
          sistema?: boolean
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_conta_contabil"]
        }
        Relationships: [
          {
            foreignKeyName: "contas_contabeis_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_contabeis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_financeiras: {
        Row: {
          ativo: boolean
          banco: string | null
          conta_contabil_id: string | null
          criado_em: string
          id: string
          nome: string
          saldo_inicial: number
          saldo_inicial_data: string | null
          tenant_id: string
          tipo: string | null
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          conta_contabil_id?: string | null
          criado_em?: string
          id?: string
          nome: string
          saldo_inicial?: number
          saldo_inicial_data?: string | null
          tenant_id: string
          tipo?: string | null
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          conta_contabil_id?: string | null
          criado_em?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          saldo_inicial_data?: string | null
          tenant_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_financeiros: {
        Row: {
          criado_em: string
          criado_por: string | null
          data_competencia: string
          descricao: string | null
          documento_fiscal_id: string | null
          id: string
          pessoa_id: string | null
          regra_recorrencia_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          valor_total: number
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          data_competencia: string
          descricao?: string | null
          documento_fiscal_id?: string | null
          id?: string
          pessoa_id?: string | null
          regra_recorrencia_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          valor_total: number
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          data_competencia?: string
          descricao?: string | null
          documento_fiscal_id?: string | null
          id?: string
          pessoa_id?: string | null
          regra_recorrencia_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "eventos_financeiros_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_financeiros_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_financeiros_regra_recorrencia_id_fkey"
            columns: ["regra_recorrencia_id"]
            isOneToOne: false
            referencedRelation: "regras_recorrencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_financeiros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          criado_em: string
          criado_por: string | null
          data_competencia: string
          descricao: string
          estornado_de_id: string | null
          id: string
          origem: Database["public"]["Enums"]["origem_lancamento"]
          referencia_id: string | null
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          data_competencia: string
          descricao: string
          estornado_de_id?: string | null
          id?: string
          origem: Database["public"]["Enums"]["origem_lancamento"]
          referencia_id?: string | null
          tenant_id: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          data_competencia?: string
          descricao?: string
          estornado_de_id?: string | null
          id?: string
          origem?: Database["public"]["Enums"]["origem_lancamento"]
          referencia_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_estornado_de_id_fkey"
            columns: ["estornado_de_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          conta_financeira_id: string | null
          criado_em: string
          data_vencimento: string
          evento_financeiro_id: string
          id: string
          metodo_pagamento: string | null
          motivo_cancelamento: string | null
          numero: number
          status: Database["public"]["Enums"]["status_parcela"]
          tenant_id: string
          valor: number
        }
        Insert: {
          conta_financeira_id?: string | null
          criado_em?: string
          data_vencimento: string
          evento_financeiro_id: string
          id?: string
          metodo_pagamento?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          status?: Database["public"]["Enums"]["status_parcela"]
          tenant_id: string
          valor: number
        }
        Update: {
          conta_financeira_id?: string | null
          criado_em?: string
          data_vencimento?: string
          evento_financeiro_id?: string
          id?: string
          metodo_pagamento?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          status?: Database["public"]["Enums"]["status_parcela"]
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "eventos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas: {
        Row: {
          conta_contabil_id: string
          criado_em: string
          id: string
          lancamento_id: string
          moeda: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_partida"]
          valor: number
        }
        Insert: {
          conta_contabil_id: string
          criado_em?: string
          id?: string
          lancamento_id: string
          moeda?: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_partida"]
          valor: number
        }
        Update: {
          conta_contabil_id?: string
          criado_em?: string
          id?: string
          lancamento_id?: string
          moeda?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_partida"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "partidas_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "contas_contabeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          criado_em: string
          documento: string | null
          id: string
          natureza: Database["public"]["Enums"]["natureza_pessoa"] | null
          nome: string
          perfis: Database["public"]["Enums"]["perfil_pessoa"][]
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          documento?: string | null
          id?: string
          natureza?: Database["public"]["Enums"]["natureza_pessoa"] | null
          nome: string
          perfis?: Database["public"]["Enums"]["perfil_pessoa"][]
          tenant_id: string
        }
        Update: {
          criado_em?: string
          documento?: string | null
          id?: string
          natureza?: Database["public"]["Enums"]["natureza_pessoa"] | null
          nome?: string
          perfis?: Database["public"]["Enums"]["perfil_pessoa"][]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rateio_categoria: {
        Row: {
          categoria_id: string
          evento_financeiro_id: string
          id: string
          tenant_id: string
          valor: number
        }
        Insert: {
          categoria_id: string
          evento_financeiro_id: string
          id?: string
          tenant_id: string
          valor: number
        }
        Update: {
          categoria_id?: string
          evento_financeiro_id?: string
          id?: string
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rateio_categoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_categoria_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "eventos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_categoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rateio_centro_custo: {
        Row: {
          centro_custo_id: string
          id: string
          rateio_categoria_id: string
          tenant_id: string
          valor: number
        }
        Insert: {
          centro_custo_id: string
          id?: string
          rateio_categoria_id: string
          tenant_id: string
          valor: number
        }
        Update: {
          centro_custo_id?: string
          id?: string
          rateio_categoria_id?: string
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rateio_centro_custo_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_centro_custo_rateio_categoria_id_fkey"
            columns: ["rateio_categoria_id"]
            isOneToOne: false
            referencedRelation: "rateio_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_centro_custo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_recorrencia: {
        Row: {
          ativa: boolean
          categorias_json: Json
          criado_em: string
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string
          id: string
          intervalo: number
          numero_ocorrencias: number | null
          numero_parcelas: number
          ocorrencias_geradas: number
          pessoa_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          ultima_geracao_em: string | null
          unidade_intervalo: Database["public"]["Enums"]["unidade_intervalo"]
          valor_total: number
        }
        Insert: {
          ativa?: boolean
          categorias_json: Json
          criado_em?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao: string
          id?: string
          intervalo: number
          numero_ocorrencias?: number | null
          numero_parcelas?: number
          ocorrencias_geradas?: number
          pessoa_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          ultima_geracao_em?: string | null
          unidade_intervalo: Database["public"]["Enums"]["unidade_intervalo"]
          valor_total: number
        }
        Update: {
          ativa?: boolean
          categorias_json?: Json
          criado_em?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          id?: string
          intervalo?: number
          numero_ocorrencias?: number | null
          numero_parcelas?: number
          ocorrencias_geradas?: number
          pessoa_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          ultima_geracao_em?: string | null
          unidade_intervalo?: Database["public"]["Enums"]["unidade_intervalo"]
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "regras_recorrencia_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_recorrencia_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_recorrencia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      renegociacoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          data_vencimento_anterior: string
          data_vencimento_nova: string
          id: string
          motivo: string
          parcela_id: string
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          data_vencimento_anterior: string
          data_vencimento_nova: string
          id?: string
          motivo: string
          parcela_id: string
          tenant_id: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          data_vencimento_anterior?: string
          data_vencimento_nova?: string
          id?: string
          motivo?: string
          parcela_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renegociacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renegociacoes_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renegociacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          criado_em: string
          id: string
          nome: string
          plano: string
        }
        Insert: {
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome: string
          plano?: string
        }
        Update: {
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome?: string
          plano?: string
        }
        Relationships: []
      }
      usuario_tenant: {
        Row: {
          ativo: boolean
          convidado_em: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          convidado_em?: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          tenant_id: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          convidado_em?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_tenant_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          criado_em: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          email: string
          id: string
          nome: string
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      forma_anexo: "ARQUIVO" | "LINK"
      natureza_conta: "DEVEDORA" | "CREDORA"
      natureza_pessoa: "FISICA" | "JURIDICA"
      origem_lancamento:
        | "MANUAL"
        | "VENDA"
        | "COMPRA"
        | "TRANSFERENCIA"
        | "OPEN_FINANCE"
        | "CAPTURA_IA"
        | "RENEGOCIACAO"
        | "ESTORNO"
      papel_usuario:
        | "admin"
        | "financeiro_senior"
        | "financeiro_junior"
        | "contador"
        | "cliente_portal"
      perfil_pessoa: "CLIENTE" | "FORNECEDOR" | "TRANSPORTADORA"
      status_parcela:
        | "PENDENTE"
        | "QUITADO"
        | "CANCELADO"
        | "RENEGOCIADO"
        | "RECEBIDO_PARCIAL"
        | "ATRASADO"
        | "PERDIDO"
      tipo_anexo:
        | "CONTRATO"
        | "DOCUMENTO_FISCAL"
        | "DOCUMENTO_COBRANCA"
        | "OUTROS"
      tipo_categoria: "RECEITA" | "DESPESA"
      tipo_conta_contabil:
        | "ATIVO"
        | "PASSIVO"
        | "PATRIMONIO_LIQUIDO"
        | "RECEITA"
        | "DESPESA"
      tipo_partida: "DEBITO" | "CREDITO"
      unidade_intervalo: "DIA" | "SEMANA" | "MES"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      forma_anexo: ["ARQUIVO", "LINK"],
      natureza_conta: ["DEVEDORA", "CREDORA"],
      natureza_pessoa: ["FISICA", "JURIDICA"],
      origem_lancamento: [
        "MANUAL",
        "VENDA",
        "COMPRA",
        "TRANSFERENCIA",
        "OPEN_FINANCE",
        "CAPTURA_IA",
        "RENEGOCIACAO",
        "ESTORNO",
      ],
      papel_usuario: [
        "admin",
        "financeiro_senior",
        "financeiro_junior",
        "contador",
        "cliente_portal",
      ],
      perfil_pessoa: ["CLIENTE", "FORNECEDOR", "TRANSPORTADORA"],
      status_parcela: [
        "PENDENTE",
        "QUITADO",
        "CANCELADO",
        "RENEGOCIADO",
        "RECEBIDO_PARCIAL",
        "ATRASADO",
        "PERDIDO",
      ],
      tipo_anexo: [
        "CONTRATO",
        "DOCUMENTO_FISCAL",
        "DOCUMENTO_COBRANCA",
        "OUTROS",
      ],
      tipo_categoria: ["RECEITA", "DESPESA"],
      tipo_conta_contabil: [
        "ATIVO",
        "PASSIVO",
        "PATRIMONIO_LIQUIDO",
        "RECEITA",
        "DESPESA",
      ],
      tipo_partida: ["DEBITO", "CREDITO"],
      unidade_intervalo: ["DIA", "SEMANA", "MES"],
    },
  },
} as const
