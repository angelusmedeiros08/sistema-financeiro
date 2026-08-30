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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas_enviados: {
        Row: {
          destinatario_id: string
          enviado_em: string
          id: string
          referencia_data: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Insert: {
          destinatario_id: string
          enviado_em?: string
          id?: string
          referencia_data: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Update: {
          destinatario_id?: string
          enviado_em?: string
          id?: string
          referencia_data?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_alerta"]
        }
        Relationships: [
          {
            foreignKeyName: "alertas_enviados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "anexos_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["evento_financeiro_id"]
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
      apresentacao_slides: {
        Row: {
          apresentacao_id: string
          id: string
          ordem: number
          rota: string
          rotulo: string
        }
        Insert: {
          apresentacao_id: string
          id?: string
          ordem: number
          rota: string
          rotulo: string
        }
        Update: {
          apresentacao_id?: string
          id?: string
          ordem?: number
          rota?: string
          rotulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_slides_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          id: string
          intervalo_segundos: number
          nome: string
          permite_modo_tv: boolean
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          intervalo_segundos?: number
          nome: string
          permite_modo_tv?: boolean
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          intervalo_segundos?: number
          nome?: string
          permite_modo_tv?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacoes_tenant_id_fkey"
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
          forma_pagamento_id: string | null
          id: string
          idempotency_key: string | null
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
          forma_pagamento_id?: string | null
          id?: string
          idempotency_key?: string | null
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
          forma_pagamento_id?: string | null
          id?: string
          idempotency_key?: string | null
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
            foreignKeyName: "baixas_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
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
            foreignKeyName: "baixas_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["parcela_id"]
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
      campos_personalizados_definicao: {
        Row: {
          aplica_a: Database["public"]["Enums"]["escopo_campo_personalizado"]
          criado_em: string
          disponivel: boolean
          id: string
          rotulo: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_campo_personalizado"]
        }
        Insert: {
          aplica_a?: Database["public"]["Enums"]["escopo_campo_personalizado"]
          criado_em?: string
          disponivel?: boolean
          id?: string
          rotulo: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_campo_personalizado"]
        }
        Update: {
          aplica_a?: Database["public"]["Enums"]["escopo_campo_personalizado"]
          criado_em?: string
          disponivel?: boolean
          id?: string
          rotulo?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_campo_personalizado"]
        }
        Relationships: [
          {
            foreignKeyName: "campos_personalizados_definicao_tenant_id_fkey"
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
          eh_custo_fixo: boolean
          id: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Insert: {
          categoria_pai_id?: string | null
          conta_contabil_id?: string | null
          criado_em?: string
          eh_custo_fixo?: boolean
          id?: string
          nome: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Update: {
          categoria_pai_id?: string | null
          conta_contabil_id?: string | null
          criado_em?: string
          eh_custo_fixo?: boolean
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
          codigo_referencial_sped: string | null
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
          codigo_referencial_sped?: string | null
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
          codigo_referencial_sped?: string | null
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
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          data_competencia: string
          descricao: string | null
          documento_fiscal_id: string | null
          estornado_em: string | null
          id: string
          import_key: string | null
          pessoa_id: string | null
          regra_recorrencia_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_competencia: string
          descricao?: string | null
          documento_fiscal_id?: string | null
          estornado_em?: string | null
          id?: string
          import_key?: string | null
          pessoa_id?: string | null
          regra_recorrencia_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          valor_total: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_competencia?: string
          descricao?: string | null
          documento_fiscal_id?: string | null
          estornado_em?: string | null
          id?: string
          import_key?: string | null
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
      eventos_pagamento_processados: {
        Row: {
          id: string
          processado_em: string
          tipo: string
        }
        Insert: {
          id: string
          processado_em?: string
          tipo: string
        }
        Update: {
          id?: string
          processado_em?: string
          tipo?: string
        }
        Relationships: []
      }
      extrato_linha_baixas: {
        Row: {
          baixa_id: string
          criado_em: string
          extrato_linha_id: string
          tenant_id: string
        }
        Insert: {
          baixa_id: string
          criado_em?: string
          extrato_linha_id: string
          tenant_id: string
        }
        Update: {
          baixa_id?: string
          criado_em?: string
          extrato_linha_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extrato_linha_baixas_baixa_id_fkey"
            columns: ["baixa_id"]
            isOneToOne: false
            referencedRelation: "baixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_linha_baixas_extrato_linha_id_fkey"
            columns: ["extrato_linha_id"]
            isOneToOne: false
            referencedRelation: "extrato_linhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_linha_baixas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      extrato_linhas: {
        Row: {
          chave_dedup: string
          conta_financeira_id: string
          criado_em: string
          data: string
          descricao: string
          fitid: string | null
          id: string
          status: Database["public"]["Enums"]["status_extrato_linha"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_extrato_linha"]
          valor: number
        }
        Insert: {
          chave_dedup: string
          conta_financeira_id: string
          criado_em?: string
          data: string
          descricao?: string
          fitid?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_extrato_linha"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_extrato_linha"]
          valor: number
        }
        Update: {
          chave_dedup?: string
          conta_financeira_id?: string
          criado_em?: string
          data?: string
          descricao?: string
          fitid?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_extrato_linha"]
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_extrato_linha"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_linhas_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_linhas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          id: string
          nome_arquivo: string
          processando_desde: string | null
          status: Database["public"]["Enums"]["status_importacao"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_importacao"]
          total_linhas: number
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome_arquivo: string
          processando_desde?: string | null
          status?: Database["public"]["Enums"]["status_importacao"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_importacao"]
          total_linhas: number
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome_arquivo?: string
          processando_desde?: string | null
          status?: Database["public"]["Enums"]["status_importacao"]
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_importacao"]
          total_linhas?: number
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_entidades_criadas: {
        Row: {
          criado_em: string
          entidade_id: string
          id: string
          importacao_id: string
          tenant_id: string
          tipo_entidade: string
        }
        Insert: {
          criado_em?: string
          entidade_id: string
          id?: string
          importacao_id: string
          tenant_id: string
          tipo_entidade: string
        }
        Update: {
          criado_em?: string
          entidade_id?: string
          id?: string
          importacao_id?: string
          tenant_id?: string
          tipo_entidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_entidades_criadas_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_entidades_criadas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_itens: {
        Row: {
          acao: Database["public"]["Enums"]["acao_item_importacao"]
          criado_em: string
          dados_normalizados: Json
          desfeito_em: string | null
          erro: string | null
          evento_financeiro_id: string | null
          id: string
          importacao_id: string
          linha_numero: number
          pessoa_id: string | null
          status: Database["public"]["Enums"]["status_item_importacao"]
          tenant_id: string
        }
        Insert: {
          acao: Database["public"]["Enums"]["acao_item_importacao"]
          criado_em?: string
          dados_normalizados: Json
          desfeito_em?: string | null
          erro?: string | null
          evento_financeiro_id?: string | null
          id?: string
          importacao_id: string
          linha_numero: number
          pessoa_id?: string | null
          status?: Database["public"]["Enums"]["status_item_importacao"]
          tenant_id: string
        }
        Update: {
          acao?: Database["public"]["Enums"]["acao_item_importacao"]
          criado_em?: string
          dados_normalizados?: Json
          desfeito_em?: string | null
          erro?: string | null
          evento_financeiro_id?: string | null
          id?: string
          importacao_id?: string
          linha_numero?: number
          pessoa_id?: string | null
          status?: Database["public"]["Enums"]["status_item_importacao"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_itens_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "eventos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_itens_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["evento_financeiro_id"]
          },
          {
            foreignKeyName: "importacoes_itens_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_itens_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_itens_tenant_id_fkey"
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
      linha_dre_categorias: {
        Row: {
          categoria_id: string
          linha_dre_id: string
        }
        Insert: {
          categoria_id: string
          linha_dre_id: string
        }
        Update: {
          categoria_id?: string
          linha_dre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linha_dre_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linha_dre_categorias_linha_dre_id_fkey"
            columns: ["linha_dre_id"]
            isOneToOne: false
            referencedRelation: "linhas_dre"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_dre: {
        Row: {
          conceito_fixo:
            | Database["public"]["Enums"]["conceito_fixo_linha_dre"]
            | null
          criado_em: string
          id: string
          id_dfc: Database["public"]["Enums"]["id_dfc_linha_dre"] | null
          ordem: number
          rotulo: string
          tenant_id: string
          tipo_calc: Database["public"]["Enums"]["tipo_linha_dre"]
          waterfall_papel: number | null
        }
        Insert: {
          conceito_fixo?:
            | Database["public"]["Enums"]["conceito_fixo_linha_dre"]
            | null
          criado_em?: string
          id?: string
          id_dfc?: Database["public"]["Enums"]["id_dfc_linha_dre"] | null
          ordem: number
          rotulo: string
          tenant_id: string
          tipo_calc: Database["public"]["Enums"]["tipo_linha_dre"]
          waterfall_papel?: number | null
        }
        Update: {
          conceito_fixo?:
            | Database["public"]["Enums"]["conceito_fixo_linha_dre"]
            | null
          criado_em?: string
          id?: string
          id_dfc?: Database["public"]["Enums"]["id_dfc_linha_dre"] | null
          ordem?: number
          rotulo?: string
          tenant_id?: string
          tipo_calc?: Database["public"]["Enums"]["tipo_linha_dre"]
          waterfall_papel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "linhas_dre_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_comercial_itens: {
        Row: {
          descricao: string
          id: string
          orcamento_id: string
          preco_unitario: number
          produto_servico_id: string
          quantidade: number
          tenant_id: string
          valor_total: number | null
        }
        Insert: {
          descricao: string
          id?: string
          orcamento_id: string
          preco_unitario: number
          produto_servico_id: string
          quantidade: number
          tenant_id: string
          valor_total?: number | null
        }
        Update: {
          descricao?: string
          id?: string
          orcamento_id?: string
          preco_unitario?: number
          produto_servico_id?: string
          quantidade?: number
          tenant_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_comercial_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_comercial_itens_produto_servico_id_fkey"
            columns: ["produto_servico_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_comercial_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          categoria_id: string
          competencia: string
          criado_em: string
          criado_por: string | null
          id: string
          tenant_id: string
          valor_previsto: number
        }
        Insert: {
          categoria_id: string
          competencia: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          tenant_id: string
          valor_previsto: number
        }
        Update: {
          categoria_id?: string
          competencia?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          tenant_id?: string
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_comerciais: {
        Row: {
          criado_em: string
          criado_por: string | null
          data_emissao: string
          forma_pagamento_id: string | null
          id: string
          motivo_recusa: string | null
          numero: number
          numero_parcelas: number
          observacoes: string | null
          pessoa_id: string
          primeiro_vencimento: string | null
          status: Database["public"]["Enums"]["status_orcamento_comercial"]
          tenant_id: string
          token_publico: string | null
          validade: string | null
          venda_gerada_id: string | null
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          data_emissao: string
          forma_pagamento_id?: string | null
          id?: string
          motivo_recusa?: string | null
          numero?: number
          numero_parcelas?: number
          observacoes?: string | null
          pessoa_id: string
          primeiro_vencimento?: string | null
          status?: Database["public"]["Enums"]["status_orcamento_comercial"]
          tenant_id: string
          token_publico?: string | null
          validade?: string | null
          venda_gerada_id?: string | null
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          data_emissao?: string
          forma_pagamento_id?: string | null
          id?: string
          motivo_recusa?: string | null
          numero?: number
          numero_parcelas?: number
          observacoes?: string | null
          pessoa_id?: string
          primeiro_vencimento?: string | null
          status?: Database["public"]["Enums"]["status_orcamento_comercial"]
          tenant_id?: string
          token_publico?: string | null
          validade?: string | null
          venda_gerada_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_comerciais_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_comerciais_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_comerciais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_comerciais_venda_gerada_id_fkey"
            columns: ["venda_gerada_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          atualizado_em: string
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
          atualizado_em?: string
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
          atualizado_em?: string
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
            foreignKeyName: "parcelas_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["evento_financeiro_id"]
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
      pessoa_contatos: {
        Row: {
          cargo: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          pessoa_id: string
          principal: boolean
          substituido_em: string | null
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          cargo?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome: string
          pessoa_id: string
          principal?: boolean
          substituido_em?: string | null
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          cargo?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          pessoa_id?: string
          principal?: boolean
          substituido_em?: string | null
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_contatos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_contatos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          criado_em: string
          id: string
          logradouro: string | null
          numero: string | null
          pessoa_id: string
          principal: boolean
          substituido_em: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_endereco"]
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          criado_em?: string
          id?: string
          logradouro?: string | null
          numero?: string | null
          pessoa_id: string
          principal?: boolean
          substituido_em?: string | null
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_endereco"]
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          criado_em?: string
          id?: string
          logradouro?: string | null
          numero?: string | null
          pessoa_id?: string
          principal?: boolean
          substituido_em?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_endereco"]
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_enderecos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_enderecos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          campos_personalizados: Json
          criado_em: string
          documento: string | null
          email: string | null
          id: string
          natureza: Database["public"]["Enums"]["natureza_pessoa"] | null
          nome: string
          perfis: Database["public"]["Enums"]["perfil_pessoa"][]
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          campos_personalizados?: Json
          criado_em?: string
          documento?: string | null
          email?: string | null
          id?: string
          natureza?: Database["public"]["Enums"]["natureza_pessoa"] | null
          nome: string
          perfis?: Database["public"]["Enums"]["perfil_pessoa"][]
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          campos_personalizados?: Json
          criado_em?: string
          documento?: string | null
          email?: string | null
          id?: string
          natureza?: Database["public"]["Enums"]["natureza_pessoa"] | null
          nome?: string
          perfis?: Database["public"]["Enums"]["perfil_pessoa"][]
          telefone?: string | null
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
      produtos_servicos: {
        Row: {
          ativo: boolean
          categoria_financeira_id: string
          codigo_referencia: string | null
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          preco_venda: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_produto_servico"]
          unidade_medida: string | null
        }
        Insert: {
          ativo?: boolean
          categoria_financeira_id: string
          codigo_referencia?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          preco_venda: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_produto_servico"]
          unidade_medida?: string | null
        }
        Update: {
          ativo?: boolean
          categoria_financeira_id?: string
          codigo_referencia?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco_venda?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_produto_servico"]
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_servicos_categoria_financeira_id_fkey"
            columns: ["categoria_financeira_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_servicos_tenant_id_fkey"
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
            foreignKeyName: "rateio_categoria_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["evento_financeiro_id"]
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
      regras_categorizacao: {
        Row: {
          categoria_id: string
          criado_em: string
          descricao_normalizada: string
          id: string
          origem: Database["public"]["Enums"]["origem_regra_categorizacao"]
          pessoa_id: string | null
          tenant_id: string
        }
        Insert: {
          categoria_id: string
          criado_em?: string
          descricao_normalizada: string
          id?: string
          origem?: Database["public"]["Enums"]["origem_regra_categorizacao"]
          pessoa_id?: string | null
          tenant_id: string
        }
        Update: {
          categoria_id?: string
          criado_em?: string
          descricao_normalizada?: string
          id?: string
          origem?: Database["public"]["Enums"]["origem_regra_categorizacao"]
          pessoa_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_categorizacao_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_categorizacao_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_categorizacao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_mapeamento_coluna: {
        Row: {
          cabecalho_normalizado: string
          chave_coluna: string
          criado_em: string
          id: string
          tenant_id: string
          tipo_wizard: string
        }
        Insert: {
          cabecalho_normalizado: string
          chave_coluna: string
          criado_em?: string
          id?: string
          tenant_id: string
          tipo_wizard: string
        }
        Update: {
          cabecalho_normalizado?: string
          chave_coluna?: string
          criado_em?: string
          id?: string
          tenant_id?: string
          tipo_wizard?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_mapeamento_coluna_tenant_id_fkey"
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
            foreignKeyName: "renegociacoes_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["parcela_id"]
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
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          cnpj: string | null
          criado_em: string
          id: string
          limiar_saldo_minimo_alerta: number
          nome: string
          plano: string
          status_assinatura: string
          trial_termina_em: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cnpj?: string | null
          criado_em?: string
          id?: string
          limiar_saldo_minimo_alerta?: number
          nome: string
          plano?: string
          status_assinatura?: string
          trial_termina_em?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cnpj?: string | null
          criado_em?: string
          id?: string
          limiar_saldo_minimo_alerta?: number
          nome?: string
          plano?: string
          status_assinatura?: string
          trial_termina_em?: string | null
        }
        Relationships: []
      }
      tentativas_assinatura: {
        Row: {
          criado_em: string
          email: string
          id: number
          ip: string
        }
        Insert: {
          criado_em?: string
          email: string
          id?: never
          ip: string
        }
        Update: {
          criado_em?: string
          email?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      tentativas_auth: {
        Row: {
          criado_em: string
          email: string
          finalidade: string
          id: number
          ip: string
        }
        Insert: {
          criado_em?: string
          email: string
          finalidade: string
          id?: never
          ip: string
        }
        Update: {
          criado_em?: string
          email?: string
          finalidade?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      usuario_tenant: {
        Row: {
          ativo: boolean
          convidado_em: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          pessoa_id: string | null
          senha_definida: boolean
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          convidado_em?: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          pessoa_id?: string | null
          senha_definida?: boolean
          tenant_id: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          convidado_em?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          pessoa_id?: string | null
          senha_definida?: boolean
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_tenant_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
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
      venda_itens: {
        Row: {
          descricao: string
          id: string
          preco_unitario: number
          produto_servico_id: string
          quantidade: number
          tenant_id: string
          valor_total: number | null
          venda_id: string
        }
        Insert: {
          descricao: string
          id?: string
          preco_unitario: number
          produto_servico_id: string
          quantidade: number
          tenant_id: string
          valor_total?: number | null
          venda_id: string
        }
        Update: {
          descricao?: string
          id?: string
          preco_unitario?: number
          produto_servico_id?: string
          quantidade?: number
          tenant_id?: string
          valor_total?: number | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_servico_id_fkey"
            columns: ["produto_servico_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          criado_em: string
          criado_por: string | null
          data_emissao: string
          evento_financeiro_id: string | null
          forma_pagamento_id: string | null
          id: string
          numero: number
          numero_parcelas: number
          observacoes: string | null
          pessoa_id: string
          primeiro_vencimento: string | null
          status: Database["public"]["Enums"]["status_venda"]
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          data_emissao?: string
          evento_financeiro_id?: string | null
          forma_pagamento_id?: string | null
          id?: string
          numero?: number
          numero_parcelas?: number
          observacoes?: string | null
          pessoa_id: string
          primeiro_vencimento?: string | null
          status?: Database["public"]["Enums"]["status_venda"]
          tenant_id: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          data_emissao?: string
          evento_financeiro_id?: string | null
          forma_pagamento_id?: string | null
          id?: string
          numero?: number
          numero_parcelas?: number
          observacoes?: string | null
          pessoa_id?: string
          primeiro_vencimento?: string | null
          status?: Database["public"]["Enums"]["status_venda"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "eventos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_evento_financeiro_id_fkey"
            columns: ["evento_financeiro_id"]
            isOneToOne: false
            referencedRelation: "vw_movimento_competencia_previsto"
            referencedColumns: ["evento_financeiro_id"]
          },
          {
            foreignKeyName: "vendas_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_movimento_competencia_previsto: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string | null
          conta_financeira_id: string | null
          data_competencia: string | null
          data_vencimento: string | null
          evento_financeiro_id: string | null
          parcela_id: string | null
          pessoa_id: string | null
          status: Database["public"]["Enums"]["status_parcela"] | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["tipo_categoria"] | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_financeiros_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_categoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_categoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateio_centro_custo_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_movimento_realizado: {
        Row: {
          baixa_id: string | null
          categoria_id: string | null
          centro_custo_id: string | null
          conta_financeira_id: string | null
          data_pagamento: string | null
          evento_financeiro_id: string | null
          parcela_id: string | null
          pessoa_id: string | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["tipo_categoria"] | null
          valor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aprovar_venda: {
        Args: { p_criado_por?: string; p_tenant_id: string; p_venda_id: string }
        Returns: string
      }
      contar_itens_importacao: {
        Args: { p_tenant_id: string }
        Returns: {
          importacao_id: string
          quantidade: number
          status: Database["public"]["Enums"]["status_item_importacao"]
        }[]
      }
      criar_evento_financeiro: {
        Args: {
          p_categorias: Json
          p_criado_por?: string
          p_data_competencia: string
          p_descricao: string
          p_import_key?: string
          p_numero_parcelas: number
          p_pessoa_id?: string
          p_primeiro_vencimento: string
          p_regra_recorrencia_id?: string
          p_tenant_id: string
          p_tipo: Database["public"]["Enums"]["tipo_categoria"]
          p_valor_total: number
        }
        Returns: string
      }
      gerar_venda_de_orcamento: {
        Args: {
          p_criado_por?: string
          p_orcamento_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      movimento_liquido_realizado: {
        Args: { p_data_fim: string; p_tenant_id: string }
        Returns: number
      }
      registrar_baixa: {
        Args: {
          p_conta_financeira_id: string
          p_criado_por?: string
          p_data_pagamento: string
          p_descricao: string
          p_forma_pagamento_id?: string
          p_idempotency_key?: string
          p_parcela_id: string
          p_partidas: Json
          p_tenant_id: string
          p_valor_desconto: number
          p_valor_juros: number
          p_valor_multa: number
          p_valor_pago: number
          p_valor_taxa: number
        }
        Returns: string
      }
      registrar_lancamento: {
        Args: {
          p_criado_por?: string
          p_data_competencia: string
          p_descricao: string
          p_estornado_de_id?: string
          p_origem: Database["public"]["Enums"]["origem_lancamento"]
          p_partidas: Json
          p_referencia_id?: string
          p_tenant_id: string
        }
        Returns: string
      }
      saldo_conta_contabil: {
        Args: { p_conta_contabil_id: string; p_tenant_id: string }
        Returns: number
      }
      salvar_apresentacao:
        | {
            Args: {
              p_apresentacao_id: string
              p_criado_por: string
              p_intervalo_segundos: number
              p_nome: string
              p_slides: Json
              p_tenant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_apresentacao_id: string
              p_criado_por: string
              p_intervalo_segundos: number
              p_nome: string
              p_permite_modo_tv?: boolean
              p_slides: Json
              p_tenant_id: string
            }
            Returns: string
          }
      substituir_itens_orcamento_comercial: {
        Args: { p_itens: Json; p_orcamento_id: string; p_tenant_id: string }
        Returns: undefined
      }
      substituir_itens_venda: {
        Args: { p_itens: Json; p_tenant_id: string; p_venda_id: string }
        Returns: undefined
      }
    }
    Enums: {
      acao_item_importacao: "criar" | "atualizar"
      conceito_fixo_linha_dre:
        | "RECEITA_OPERACIONAL"
        | "RECEITA_LIQUIDA"
        | "MARGEM_CONTRIBUICAO"
        | "LUCRO_BRUTO"
        | "EBITDA"
        | "LUCRO_LIQUIDO"
      escopo_campo_personalizado: "CLIENTE" | "FORNECEDOR" | "AMBOS"
      forma_anexo: "ARQUIVO" | "LINK"
      id_dfc_linha_dre:
        | "OPERACIONAL_ENTRADA"
        | "OPERACIONAL_SAIDA"
        | "NAO_OPERACIONAL_ENTRADA"
        | "NAO_OPERACIONAL_SAIDA"
        | "INVESTIMENTO"
        | "FINANCIAMENTO"
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
      origem_regra_categorizacao: "MANUAL" | "HISTORICO"
      papel_usuario:
        | "admin"
        | "financeiro_senior"
        | "financeiro_junior"
        | "contador"
        | "cliente_portal"
      perfil_pessoa: "CLIENTE" | "FORNECEDOR" | "TRANSPORTADORA"
      status_extrato_linha: "PENDENTE" | "CONCILIADA" | "IGNORADA"
      status_importacao: "em_andamento" | "concluida" | "cancelada"
      status_item_importacao: "sucesso" | "erro" | "pendente"
      status_orcamento_comercial:
        | "RASCUNHO"
        | "ENVIADO"
        | "APROVADO"
        | "RECUSADO"
        | "EXPIRADO"
      status_parcela:
        | "PENDENTE"
        | "QUITADO"
        | "CANCELADO"
        | "RENEGOCIADO"
        | "RECEBIDO_PARCIAL"
        | "ATRASADO"
        | "PERDIDO"
      status_venda: "RASCUNHO" | "APROVADO" | "RECUSADO"
      tipo_alerta: "resumo_equipe" | "vencimento_cliente"
      tipo_anexo:
        | "CONTRATO"
        | "DOCUMENTO_FISCAL"
        | "DOCUMENTO_COBRANCA"
        | "OUTROS"
      tipo_campo_personalizado: "TEXTO" | "NUMERO" | "DATA" | "BOOLEANO"
      tipo_categoria: "RECEITA" | "DESPESA"
      tipo_conta_contabil:
        | "ATIVO"
        | "PASSIVO"
        | "PATRIMONIO_LIQUIDO"
        | "RECEITA"
        | "DESPESA"
      tipo_endereco: "COMERCIAL" | "COBRANCA" | "ENTREGA" | "OUTRO"
      tipo_extrato_linha: "CREDITO" | "DEBITO"
      tipo_importacao: "pessoas" | "financeiro" | "produtos"
      tipo_linha_dre:
        | "FOLHA"
        | "SUBTOTAL"
        | "SUBTOTAL_ALTERNATIVO"
        | "RESULTADO_NAO_OPERACIONAL"
      tipo_partida: "DEBITO" | "CREDITO"
      tipo_produto_servico: "PRODUTO" | "SERVICO"
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
      acao_item_importacao: ["criar", "atualizar"],
      conceito_fixo_linha_dre: [
        "RECEITA_OPERACIONAL",
        "RECEITA_LIQUIDA",
        "MARGEM_CONTRIBUICAO",
        "LUCRO_BRUTO",
        "EBITDA",
        "LUCRO_LIQUIDO",
      ],
      escopo_campo_personalizado: ["CLIENTE", "FORNECEDOR", "AMBOS"],
      forma_anexo: ["ARQUIVO", "LINK"],
      id_dfc_linha_dre: [
        "OPERACIONAL_ENTRADA",
        "OPERACIONAL_SAIDA",
        "NAO_OPERACIONAL_ENTRADA",
        "NAO_OPERACIONAL_SAIDA",
        "INVESTIMENTO",
        "FINANCIAMENTO",
      ],
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
      origem_regra_categorizacao: ["MANUAL", "HISTORICO"],
      papel_usuario: [
        "admin",
        "financeiro_senior",
        "financeiro_junior",
        "contador",
        "cliente_portal",
      ],
      perfil_pessoa: ["CLIENTE", "FORNECEDOR", "TRANSPORTADORA"],
      status_extrato_linha: ["PENDENTE", "CONCILIADA", "IGNORADA"],
      status_importacao: ["em_andamento", "concluida", "cancelada"],
      status_item_importacao: ["sucesso", "erro", "pendente"],
      status_orcamento_comercial: [
        "RASCUNHO",
        "ENVIADO",
        "APROVADO",
        "RECUSADO",
        "EXPIRADO",
      ],
      status_parcela: [
        "PENDENTE",
        "QUITADO",
        "CANCELADO",
        "RENEGOCIADO",
        "RECEBIDO_PARCIAL",
        "ATRASADO",
        "PERDIDO",
      ],
      status_venda: ["RASCUNHO", "APROVADO", "RECUSADO"],
      tipo_alerta: ["resumo_equipe", "vencimento_cliente"],
      tipo_anexo: [
        "CONTRATO",
        "DOCUMENTO_FISCAL",
        "DOCUMENTO_COBRANCA",
        "OUTROS",
      ],
      tipo_campo_personalizado: ["TEXTO", "NUMERO", "DATA", "BOOLEANO"],
      tipo_categoria: ["RECEITA", "DESPESA"],
      tipo_conta_contabil: [
        "ATIVO",
        "PASSIVO",
        "PATRIMONIO_LIQUIDO",
        "RECEITA",
        "DESPESA",
      ],
      tipo_endereco: ["COMERCIAL", "COBRANCA", "ENTREGA", "OUTRO"],
      tipo_extrato_linha: ["CREDITO", "DEBITO"],
      tipo_importacao: ["pessoas", "financeiro", "produtos"],
      tipo_linha_dre: [
        "FOLHA",
        "SUBTOTAL",
        "SUBTOTAL_ALTERNATIVO",
        "RESULTADO_NAO_OPERACIONAL",
      ],
      tipo_partida: ["DEBITO", "CREDITO"],
      tipo_produto_servico: ["PRODUTO", "SERVICO"],
      unidade_intervalo: ["DIA", "SEMANA", "MES"],
    },
  },
} as const
