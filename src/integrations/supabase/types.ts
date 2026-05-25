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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      acessorios: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      acordo_portas: {
        Row: {
          acordo_id: string
          altura: number | null
          id: string
          largura: number | null
          tamanho: string
          valor_unitario: number
        }
        Insert: {
          acordo_id: string
          altura?: number | null
          id?: string
          largura?: number | null
          tamanho: string
          valor_unitario?: number
        }
        Update: {
          acordo_id?: string
          altura?: number | null
          id?: string
          largura?: number | null
          tamanho?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "acordo_portas_acordo_id_fkey"
            columns: ["acordo_id"]
            isOneToOne: false
            referencedRelation: "acordos_instalacao_autorizados"
            referencedColumns: ["id"]
          },
        ]
      }
      acordos_instalacao_autorizados: {
        Row: {
          aprovado_direcao: boolean
          aprovado_direcao_em: string | null
          aprovado_direcao_por: string | null
          autorizado_id: string
          cliente_cidade: string
          cliente_estado: string
          cliente_nome: string
          created_at: string
          created_by: string | null
          data_acordo: string
          id: string
          observacoes: string | null
          pago: boolean
          pago_em: string | null
          pago_por: string | null
          quantidade_portas: number
          reprovado_direcao: boolean | null
          status: string
          updated_at: string
          valor_acordado: number
        }
        Insert: {
          aprovado_direcao?: boolean
          aprovado_direcao_em?: string | null
          aprovado_direcao_por?: string | null
          autorizado_id: string
          cliente_cidade: string
          cliente_estado: string
          cliente_nome: string
          created_at?: string
          created_by?: string | null
          data_acordo?: string
          id?: string
          observacoes?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_por?: string | null
          quantidade_portas?: number
          reprovado_direcao?: boolean | null
          status?: string
          updated_at?: string
          valor_acordado?: number
        }
        Update: {
          aprovado_direcao?: boolean
          aprovado_direcao_em?: string | null
          aprovado_direcao_por?: string | null
          autorizado_id?: string
          cliente_cidade?: string
          cliente_estado?: string
          cliente_nome?: string
          created_at?: string
          created_by?: string | null
          data_acordo?: string
          id?: string
          observacoes?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_por?: string | null
          quantidade_portas?: number
          reprovado_direcao?: boolean | null
          status?: string
          updated_at?: string
          valor_acordado?: number
        }
        Relationships: [
          {
            foreignKeyName: "acordos_instalacao_autorizados_autorizado_id_fkey"
            columns: ["autorizado_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
        ]
      }
      adicionais: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          ativo: boolean
          aux_combustivel: number
          bypass_permissions: boolean | null
          cpf: string | null
          created_at: string
          custo_colaborador: number | null
          data_nascimento: string | null
          eh_colaborador: boolean | null
          em_folha: boolean | null
          em_teste: boolean
          email: string
          fgts_pct: number
          foto_perfil_url: string | null
          id: string
          insalubridade_pct: number
          modalidade_pagamento: string | null
          nome: string
          ordem: number | null
          previsao_13_valor: number
          role: string
          salario: number | null
          setor: Database["public"]["Enums"]["setor_type"] | null
          telefone: string | null
          tipo_usuario: string
          updated_at: string
          user_id: string
          visivel_organograma: boolean
        }
        Insert: {
          ativo?: boolean
          aux_combustivel?: number
          bypass_permissions?: boolean | null
          cpf?: string | null
          created_at?: string
          custo_colaborador?: number | null
          data_nascimento?: string | null
          eh_colaborador?: boolean | null
          em_folha?: boolean | null
          em_teste?: boolean
          email: string
          fgts_pct?: number
          foto_perfil_url?: string | null
          id?: string
          insalubridade_pct?: number
          modalidade_pagamento?: string | null
          nome: string
          ordem?: number | null
          previsao_13_valor?: number
          role: string
          salario?: number | null
          setor?: Database["public"]["Enums"]["setor_type"] | null
          telefone?: string | null
          tipo_usuario?: string
          updated_at?: string
          user_id: string
          visivel_organograma?: boolean
        }
        Update: {
          ativo?: boolean
          aux_combustivel?: number
          bypass_permissions?: boolean | null
          cpf?: string | null
          created_at?: string
          custo_colaborador?: number | null
          data_nascimento?: string | null
          eh_colaborador?: boolean | null
          em_folha?: boolean | null
          em_teste?: boolean
          email?: string
          fgts_pct?: number
          foto_perfil_url?: string | null
          id?: string
          insalubridade_pct?: number
          modalidade_pagamento?: string | null
          nome?: string
          ordem?: number | null
          previsao_13_valor?: number
          role?: string
          salario?: number | null
          setor?: Database["public"]["Enums"]["setor_type"] | null
          telefone?: string | null
          tipo_usuario?: string
          updated_at?: string
          user_id?: string
          visivel_organograma?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "system_roles"
            referencedColumns: ["key"]
          },
        ]
      }
      almoxarifado: {
        Row: {
          ativo: boolean
          conferir_estoque: boolean | null
          created_at: string
          created_by: string | null
          custo: number
          data_ultima_conferencia: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          quantidade_estoque: number
          quantidade_maxima: number
          quantidade_minima: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conferir_estoque?: boolean | null
          created_at?: string
          created_by?: string | null
          custo?: number
          data_ultima_conferencia?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          quantidade_estoque?: number
          quantidade_maxima?: number
          quantidade_minima?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conferir_estoque?: boolean | null
          created_at?: string
          created_by?: string | null
          custo?: number
          data_ultima_conferencia?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          quantidade_estoque?: number
          quantidade_maxima?: number
          quantidade_minima?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      app_routes: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          group: string | null
          icon: string | null
          interface: string | null
          key: string
          label: string
          parent_key: string | null
          path: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group?: string | null
          icon?: string | null
          interface?: string | null
          key: string
          label: string
          parent_key?: string | null
          path: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group?: string | null
          icon?: string | null
          interface?: string | null
          key?: string
          label?: string
          parent_key?: string | null
          path?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_routes_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "app_routes"
            referencedColumns: ["key"]
          },
        ]
      }
      atas_participantes: {
        Row: {
          ata_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          ata_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          ata_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atas_participantes_ata_id_fkey"
            columns: ["ata_id"]
            isOneToOne: false
            referencedRelation: "atas_reuniao"
            referencedColumns: ["id"]
          },
        ]
      }
      atas_reuniao: {
        Row: {
          assunto: string
          conteudo: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          duracao_segundos: number
          id: string
          updated_at: string
        }
        Insert: {
          assunto: string
          conteudo: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          duracao_segundos: number
          id?: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          conteudo?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          duracao_segundos?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      autorizado_cidades_secundarias: {
        Row: {
          autorizado_id: string
          cidade: string
          created_at: string
          estado: string
          id: string
        }
        Insert: {
          autorizado_id: string
          cidade: string
          created_at?: string
          estado: string
          id?: string
        }
        Update: {
          autorizado_id?: string
          cidade?: string
          created_at?: string
          estado?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizado_cidades_secundarias_autorizado_id_fkey"
            columns: ["autorizado_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizado_precos_portas: {
        Row: {
          autorizado_id: string
          created_at: string
          created_by: string | null
          id: string
          tamanho: string
          updated_at: string
          valor: number
        }
        Insert: {
          autorizado_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          tamanho: string
          updated_at?: string
          valor?: number
        }
        Update: {
          autorizado_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tamanho?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "autorizado_precos_portas_autorizado_id_fkey"
            columns: ["autorizado_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizados: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          contrato_nome_arquivo: string | null
          contrato_tamanho_arquivo: number | null
          contrato_uploaded_at: string | null
          contrato_url: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          etapa: Database["public"]["Enums"]["autorizado_etapa"] | null
          franqueado_etapa:
            | Database["public"]["Enums"]["franqueado_etapa"]
            | null
          geocode_precision: string | null
          id: string
          last_geocoded_at: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          nome: string
          observacoes_negociacao: string | null
          regiao: string | null
          representante_etapa:
            | Database["public"]["Enums"]["representante_etapa"]
            | null
          responsavel: string | null
          telefone: string | null
          tipo_parceiro: Database["public"]["Enums"]["tipo_parceiro"]
          updated_at: string
          vendedor_id: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          contrato_nome_arquivo?: string | null
          contrato_tamanho_arquivo?: number | null
          contrato_uploaded_at?: string | null
          contrato_url?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          etapa?: Database["public"]["Enums"]["autorizado_etapa"] | null
          franqueado_etapa?:
            | Database["public"]["Enums"]["franqueado_etapa"]
            | null
          geocode_precision?: string | null
          id?: string
          last_geocoded_at?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nome: string
          observacoes_negociacao?: string | null
          regiao?: string | null
          representante_etapa?:
            | Database["public"]["Enums"]["representante_etapa"]
            | null
          responsavel?: string | null
          telefone?: string | null
          tipo_parceiro?: Database["public"]["Enums"]["tipo_parceiro"]
          updated_at?: string
          vendedor_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          contrato_nome_arquivo?: string | null
          contrato_tamanho_arquivo?: number | null
          contrato_uploaded_at?: string | null
          contrato_url?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          etapa?: Database["public"]["Enums"]["autorizado_etapa"] | null
          franqueado_etapa?:
            | Database["public"]["Enums"]["franqueado_etapa"]
            | null
          geocode_precision?: string | null
          id?: string
          last_geocoded_at?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nome?: string
          observacoes_negociacao?: string | null
          regiao?: string | null
          representante_etapa?:
            | Database["public"]["Enums"]["representante_etapa"]
            | null
          responsavel?: string | null
          telefone?: string | null
          tipo_parceiro?: Database["public"]["Enums"]["tipo_parceiro"]
          updated_at?: string
          vendedor_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autorizados_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          aprovado: boolean | null
          cidade: string | null
          comentario: string
          created_at: string | null
          email: string
          estado: string | null
          id: string
          nome: string
          nota: number
          recomendaria: boolean | null
          telefone: string | null
          tipo_avaliacao: string
        }
        Insert: {
          aprovado?: boolean | null
          cidade?: string | null
          comentario: string
          created_at?: string | null
          email: string
          estado?: string | null
          id?: string
          nome: string
          nota: number
          recomendaria?: boolean | null
          telefone?: string | null
          tipo_avaliacao: string
        }
        Update: {
          aprovado?: boolean | null
          cidade?: string | null
          comentario?: string
          created_at?: string | null
          email?: string
          estado?: string | null
          id?: string
          nome?: string
          nota?: number
          recomendaria?: boolean | null
          telefone?: string | null
          tipo_avaliacao?: string
        }
        Relationships: []
      }
      bancos: {
        Row: {
          agencia: string | null
          ativo: boolean
          codigo: string | null
          conta: string | null
          created_at: string | null
          id: string
          nome: string
          observacoes: string | null
          tipo_conta: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          codigo?: string | null
          conta?: string | null
          created_at?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          codigo?: string | null
          conta?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      caixa_elisa_config: {
        Row: {
          capital_giro: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          capital_giro?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          capital_giro?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      caixa_elisa_obrigacoes: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          id: string
          nome: string
          pago: boolean
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          nome: string
          pago?: boolean
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          nome?: string
          pago?: boolean
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      caixa_elisa_planejamento_itens: {
        Row: {
          created_at: string
          created_by: string | null
          data: string | null
          id: string
          mes_id: string
          nome: string
          pago: boolean
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          mes_id: string
          nome: string
          pago?: boolean
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          mes_id?: string
          nome?: string
          pago?: boolean
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_elisa_planejamento_itens_mes_id_fkey"
            columns: ["mes_id"]
            isOneToOne: false
            referencedRelation: "caixa_elisa_planejamento_meses"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_elisa_planejamento_meses: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mes: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: string
        }
        Relationships: []
      }
      calendario_cores: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string
          created_by: string | null
          data_producao: string
          id: string
        }
        Insert: {
          ativa?: boolean
          cor: string
          created_at?: string
          created_by?: string | null
          data_producao: string
          id?: string
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string
          created_by?: string | null
          data_producao?: string
          id?: string
        }
        Relationships: []
      }
      canais_aquisicao: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          nome: string
          ordem: number
          pago: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          ordem?: number
          pago?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          ordem?: number
          pago?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      catalogo_cores: {
        Row: {
          ativa: boolean
          codigo_hex: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          codigo_hex: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          codigo_hex?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      chamados_suporte: {
        Row: {
          cpf: string
          created_at: string | null
          data_compra: string
          descricao_problema: string
          email: string
          foto_url: string | null
          id: string
          nome: string
          notas: string | null
          status: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          data_compra: string
          descricao_problema: string
          email: string
          foto_url?: string | null
          id?: string
          nome: string
          notas?: string | null
          status?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          data_compra?: string
          descricao_problema?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          notas?: string | null
          status?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cidades_autorizados: {
        Row: {
          created_at: string | null
          estado_id: string
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado_id: string
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cidades_autorizados_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados_autorizados"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          canal_aquisicao_id: string | null
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          fidelizado: boolean | null
          id: string
          nome: string
          observacoes: string | null
          parceiro: boolean | null
          telefone: string | null
          tipo_cliente: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          canal_aquisicao_id?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fidelizado?: boolean | null
          id?: string
          nome: string
          observacoes?: string | null
          parceiro?: boolean | null
          telefone?: string | null
          tipo_cliente?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          canal_aquisicao_id?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fidelizado?: boolean | null
          id?: string
          nome?: string
          observacoes?: string | null
          parceiro?: boolean | null
          telefone?: string | null
          tipo_cliente?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_canal_aquisicao_id_fkey"
            columns: ["canal_aquisicao_id"]
            isOneToOne: false
            referencedRelation: "canais_aquisicao"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_responsabilidades: {
        Row: {
          colaborador_id: string
          created_at: string
          descricao: string | null
          id: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_responsabilidades_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          cep: string
          cidade: string
          cnpj: string
          created_at: string | null
          email: string | null
          endereco: string
          id: string
          nome: string
          site: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string
          cidade?: string
          cnpj?: string
          created_at?: string | null
          email?: string | null
          endereco?: string
          id?: string
          nome?: string
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string
          cidade?: string
          cnpj?: string
          created_at?: string | null
          email?: string | null
          endereco?: string
          id?: string
          nome?: string
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes_fiscais: {
        Row: {
          aliquota_iss_padrao: number | null
          ambiente: string | null
          cnae: string | null
          codigo_municipio_ibge: string | null
          codigo_servico_padrao: string | null
          created_at: string | null
          descricao_servico_padrao: string | null
          email_copia: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          regime_tributario: string | null
          serie_nfe: number | null
          serie_nfse: number | null
          updated_at: string | null
        }
        Insert: {
          aliquota_iss_padrao?: number | null
          ambiente?: string | null
          cnae?: string | null
          codigo_municipio_ibge?: string | null
          codigo_servico_padrao?: string | null
          created_at?: string | null
          descricao_servico_padrao?: string | null
          email_copia?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          regime_tributario?: string | null
          serie_nfe?: number | null
          serie_nfse?: number | null
          updated_at?: string | null
        }
        Update: {
          aliquota_iss_padrao?: number | null
          ambiente?: string | null
          cnae?: string | null
          codigo_municipio_ibge?: string | null
          codigo_servico_padrao?: string | null
          created_at?: string | null
          descricao_servico_padrao?: string | null
          email_copia?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          regime_tributario?: string | null
          serie_nfe?: number | null
          serie_nfse?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes_vendas: {
        Row: {
          created_at: string
          id: string
          limite_adicional_responsavel: number
          limite_desconto_avista: number
          limite_desconto_presencial: number
          responsavel_senha_master_id: string | null
          responsavel_senha_responsavel_id: string | null
          senha_master: string
          senha_responsavel: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          limite_adicional_responsavel?: number
          limite_desconto_avista?: number
          limite_desconto_presencial?: number
          responsavel_senha_master_id?: string | null
          responsavel_senha_responsavel_id?: string | null
          senha_master?: string
          senha_responsavel?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          limite_adicional_responsavel?: number
          limite_desconto_avista?: number
          limite_desconto_presencial?: number
          responsavel_senha_master_id?: string | null
          responsavel_senha_responsavel_id?: string | null
          senha_master?: string
          senha_responsavel?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_vendas_responsavel_senha_master_id_fkey"
            columns: ["responsavel_senha_master_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "configuracoes_vendas_responsavel_senha_responsavel_id_fkey"
            columns: ["responsavel_senha_responsavel_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contador_vendas_dias: {
        Row: {
          atendente_id: string
          created_at: string
          created_by: string
          data: string
          id: string
          numero_vendas: number
          updated_at: string
          valor: number
        }
        Insert: {
          atendente_id: string
          created_at?: string
          created_by: string
          data: string
          id?: string
          numero_vendas?: number
          updated_at?: string
          valor?: number
        }
        Update: {
          atendente_id?: string
          created_at?: string
          created_by?: string
          data?: string
          id?: string
          numero_vendas?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contador_vendas_dias_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria: string
          comprovante_nome: string | null
          comprovante_url: string | null
          created_at: string | null
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empresa_pagadora_id: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          grupo_id: string | null
          id: string
          metodo_pagamento: string | null
          nota_fiscal_nome: string | null
          nota_fiscal_url: string | null
          numero_parcela: number
          observacoes: string | null
          status: string
          total_parcelas: number
          updated_at: string | null
          valor_pago: number | null
          valor_parcela: number
        }
        Insert: {
          categoria?: string
          comprovante_nome?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          empresa_pagadora_id?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          grupo_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          nota_fiscal_nome?: string | null
          nota_fiscal_url?: string | null
          numero_parcela?: number
          observacoes?: string | null
          status?: string
          total_parcelas?: number
          updated_at?: string | null
          valor_pago?: number | null
          valor_parcela: number
        }
        Update: {
          categoria?: string
          comprovante_nome?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_pagadora_id?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          grupo_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          nota_fiscal_nome?: string | null
          nota_fiscal_url?: string | null
          numero_parcela?: number
          observacoes?: string | null
          status?: string
          total_parcelas?: number
          updated_at?: string | null
          valor_pago?: number | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_empresa_pagadora_id_fkey"
            columns: ["empresa_pagadora_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          comprovante_nome: string | null
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          empresa_receptora_id: string | null
          id: string
          metodo_pagamento: string | null
          numero_parcela: number
          observacoes: string | null
          pago_na_instalacao: boolean | null
          status: string
          updated_at: string
          valor_pago: number | null
          valor_parcela: number
          venda_id: string
        }
        Insert: {
          comprovante_nome?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          empresa_receptora_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          numero_parcela: number
          observacoes?: string | null
          pago_na_instalacao?: boolean | null
          status?: string
          updated_at?: string
          valor_pago?: number | null
          valor_parcela: number
          venda_id: string
        }
        Update: {
          comprovante_nome?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          empresa_receptora_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          numero_parcela?: number
          observacoes?: string | null
          pago_na_instalacao?: boolean | null
          status?: string
          updated_at?: string
          valor_pago?: number | null
          valor_parcela?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_empresa_receptora_id_fkey"
            columns: ["empresa_receptora_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_templates: {
        Row: {
          ativo: boolean | null
          conteudo: string
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contratos_vendas: {
        Row: {
          arquivo_url: string
          created_at: string | null
          id: string
          nome_arquivo: string
          observacoes: string | null
          tamanho_arquivo: number
          template_id: string | null
          updated_at: string | null
          uploaded_by: string | null
          venda_id: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          id?: string
          nome_arquivo: string
          observacoes?: string | null
          tamanho_arquivo: number
          template_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          venda_id: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          observacoes?: string | null
          tamanho_arquivo?: number
          template_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_vendas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contratos_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_vendas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      correcao_linhas: {
        Row: {
          correcao_id: string
          created_at: string | null
          descricao: string
          id: string
          quantidade: number | null
        }
        Insert: {
          correcao_id: string
          created_at?: string | null
          descricao: string
          id?: string
          quantidade?: number | null
        }
        Update: {
          correcao_id?: string
          created_at?: string | null
          descricao?: string
          id?: string
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "correcao_linhas_correcao_id_fkey"
            columns: ["correcao_id"]
            isOneToOne: false
            referencedRelation: "correcoes"
            referencedColumns: ["id"]
          },
        ]
      }
      correcoes: {
        Row: {
          carregamento_concluido: boolean
          cep: string | null
          cidade: string
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          created_by: string | null
          custo_correcao: number | null
          data_carregamento: string | null
          data_correcao: string | null
          endereco: string | null
          estado: string
          etapa_causadora: string | null
          hora: string | null
          hora_carregamento: string | null
          id: string
          justificativa: string | null
          nome_cliente: string
          observacoes: string | null
          pedido_id: string | null
          responsavel_carregamento_id: string | null
          responsavel_carregamento_nome: string | null
          responsavel_correcao_id: string | null
          responsavel_correcao_nome: string | null
          setor_causador: string | null
          status: string
          telefone_cliente: string | null
          tipo_carregamento:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          updated_at: string
          venda_id: string | null
          vezes_agendado: number
        }
        Insert: {
          carregamento_concluido?: boolean
          cep?: string | null
          cidade?: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          custo_correcao?: number | null
          data_carregamento?: string | null
          data_correcao?: string | null
          endereco?: string | null
          estado?: string
          etapa_causadora?: string | null
          hora?: string | null
          hora_carregamento?: string | null
          id?: string
          justificativa?: string | null
          nome_cliente: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel_carregamento_id?: string | null
          responsavel_carregamento_nome?: string | null
          responsavel_correcao_id?: string | null
          responsavel_correcao_nome?: string | null
          setor_causador?: string | null
          status?: string
          telefone_cliente?: string | null
          tipo_carregamento?:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          updated_at?: string
          venda_id?: string | null
          vezes_agendado?: number
        }
        Update: {
          carregamento_concluido?: boolean
          cep?: string | null
          cidade?: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          custo_correcao?: number | null
          data_carregamento?: string | null
          data_correcao?: string | null
          endereco?: string | null
          estado?: string
          etapa_causadora?: string | null
          hora?: string | null
          hora_carregamento?: string | null
          id?: string
          justificativa?: string | null
          nome_cliente?: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel_carregamento_id?: string | null
          responsavel_carregamento_nome?: string | null
          responsavel_correcao_id?: string | null
          responsavel_correcao_nome?: string | null
          setor_causador?: string | null
          status?: string
          telefone_cliente?: string | null
          tipo_carregamento?:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          updated_at?: string
          venda_id?: string | null
          vezes_agendado?: number
        }
        Relationships: [
          {
            foreignKeyName: "correcoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "correcoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correcoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      criterios_negociacao_autorizados: {
        Row: {
          autorizado_id: string
          created_at: string | null
          criterio: string
          id: string
          ordem: number | null
          updated_at: string | null
          valor: string
        }
        Insert: {
          autorizado_id: string
          created_at?: string | null
          criterio: string
          id?: string
          ordem?: number | null
          updated_at?: string | null
          valor: string
        }
        Update: {
          autorizado_id?: string
          created_at?: string | null
          criterio?: string
          id?: string
          ordem?: number | null
          updated_at?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "criterios_negociacao_autorizados_autorizado_id_fkey"
            columns: ["autorizado_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custos_folha_mensais: {
        Row: {
          adiantamento: number
          ajuda_custo: number
          bonus: number
          chave_pix: string | null
          colaborador_id: string
          colaborador_nome: string
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          horas_extras: number
          id: string
          mes_referencia: string
          pago: boolean
          pensao_alimenticia: number
          previsao: number
          salario_base: number
          updated_at: string
          valor: number
        }
        Insert: {
          adiantamento?: number
          ajuda_custo?: number
          bonus?: number
          chave_pix?: string | null
          colaborador_id: string
          colaborador_nome: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          horas_extras?: number
          id?: string
          mes_referencia: string
          pago?: boolean
          pensao_alimenticia?: number
          previsao?: number
          salario_base?: number
          updated_at?: string
          valor?: number
        }
        Update: {
          adiantamento?: number
          ajuda_custo?: number
          bonus?: number
          chave_pix?: string | null
          colaborador_id?: string
          colaborador_nome?: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          horas_extras?: number
          id?: string
          mes_referencia?: string
          pago?: boolean
          pensao_alimenticia?: number
          previsao?: number
          salario_base?: number
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      custos_itens: {
        Row: {
          categoria: string | null
          created_at: string
          custo_ok: boolean
          custo_unitario: number
          descricao: string
          fornecedor: string | null
          id: string
          ordem: number
          preco_objetivo: number | null
          preco_venda: number
          quantidade: number
          quantidade_ideal: number
          quantidade_maxima: number
          subcategoria: string | null
          taxa_cartao: number
          taxa_descontos: number
          taxa_impostos: number
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          custo_ok?: boolean
          custo_unitario?: number
          descricao: string
          fornecedor?: string | null
          id?: string
          ordem?: number
          preco_objetivo?: number | null
          preco_venda?: number
          quantidade?: number
          quantidade_ideal?: number
          quantidade_maxima?: number
          subcategoria?: string | null
          taxa_cartao?: number
          taxa_descontos?: number
          taxa_impostos?: number
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          custo_ok?: boolean
          custo_unitario?: number
          descricao?: string
          fornecedor?: string | null
          id?: string
          ordem?: number
          preco_objetivo?: number | null
          preco_venda?: number
          quantidade?: number
          quantidade_ideal?: number
          quantidade_maxima?: number
          subcategoria?: string | null
          taxa_cartao?: number
          taxa_descontos?: number
          taxa_impostos?: number
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custos_itens_categorias_ordem: {
        Row: {
          categoria: string
          created_at: string
          id: string
          ordem: number
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      custos_itens_padroes: {
        Row: {
          created_at: string
          id: string
          singleton: boolean
          taxa_cartao: number
          taxa_descontos: number
          taxa_impostos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          singleton?: boolean
          taxa_cartao?: number
          taxa_descontos?: number
          taxa_impostos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          singleton?: boolean
          taxa_cartao?: number
          taxa_descontos?: number
          taxa_impostos?: number
          updated_at?: string
        }
        Relationships: []
      }
      custos_mensais: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          mes: string
          observacoes: string | null
          tipo_custo_id: string
          updated_at: string | null
          valor_real: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          mes: string
          observacoes?: string | null
          tipo_custo_id: string
          updated_at?: string | null
          valor_real?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          mes?: string
          observacoes?: string | null
          tipo_custo_id?: string
          updated_at?: string | null
          valor_real?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_mensais_tipo_custo_id_fkey"
            columns: ["tipo_custo_id"]
            isOneToOne: false
            referencedRelation: "tipos_custos"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_subcategorias: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "custos_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      depositos_caixa: {
        Row: {
          categoria: string
          created_at: string | null
          created_by: string | null
          data_deposito: string
          id: string
          observacoes: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          created_by?: string | null
          data_deposito: string
          id?: string
          observacoes?: string | null
          updated_at?: string | null
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          data_deposito?: string
          id?: string
          observacoes?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      despesas_mensais: {
        Row: {
          categoria: string
          created_at: string | null
          created_by: string | null
          id: string
          mes: string
          modalidade: string
          nome: string
          observacoes: string | null
          tipo_status: string
          updated_at: string | null
          valor_esperado: number
          valor_real: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mes: string
          modalidade: string
          nome: string
          observacoes?: string | null
          tipo_status?: string
          updated_at?: string | null
          valor_esperado?: number
          valor_real?: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mes?: string
          modalidade?: string
          nome?: string
          observacoes?: string | null
          tipo_status?: string
          updated_at?: string | null
          valor_esperado?: number
          valor_real?: number
        }
        Relationships: []
      }
      despesas_valor_pago_mensal: {
        Row: {
          created_at: string
          id: string
          mes_referencia: string
          tipo_custo_id: string
          updated_at: string
          valor_pago: number
        }
        Insert: {
          created_at?: string
          id?: string
          mes_referencia: string
          tipo_custo_id: string
          updated_at?: string
          valor_pago?: number
        }
        Update: {
          created_at?: string
          id?: string
          mes_referencia?: string
          tipo_custo_id?: string
          updated_at?: string
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_valor_pago_mensal_tipo_custo_id_fkey"
            columns: ["tipo_custo_id"]
            isOneToOne: false
            referencedRelation: "tipos_custos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_url: string
          ativo: boolean
          categoria: Database["public"]["Enums"]["documento_categoria"]
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome_arquivo: string
          tamanho_arquivo: number
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_url: string
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo: string
          tamanho_arquivo: number
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_arquivo?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      dre_custos_produtos: {
        Row: {
          created_at: string | null
          custo: number | null
          id: string
          lucro: number | null
          preco_sugerido: number | null
          produto: string
        }
        Insert: {
          created_at?: string | null
          custo?: number | null
          id?: string
          lucro?: number | null
          preco_sugerido?: number | null
          produto: string
        }
        Update: {
          created_at?: string | null
          custo?: number | null
          id?: string
          lucro?: number | null
          preco_sugerido?: number | null
          produto?: string
        }
        Relationships: []
      }
      dre_mensais: {
        Row: {
          created_at: string | null
          created_by: string | null
          custos_producao: number
          despesas_fixas: number
          despesas_variaveis: number
          faturamento_total: number
          id: string
          mes: string
          observacoes: string | null
          resultado_final: number
          total_vendas: number
          updated_at: string | null
          vendas_faturadas: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custos_producao?: number
          despesas_fixas?: number
          despesas_variaveis?: number
          faturamento_total?: number
          id?: string
          mes: string
          observacoes?: string | null
          resultado_final?: number
          total_vendas?: number
          updated_at?: string | null
          vendas_faturadas?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custos_producao?: number
          despesas_fixas?: number
          despesas_variaveis?: number
          faturamento_total?: number
          id?: string
          mes?: string
          observacoes?: string | null
          resultado_final?: number
          total_vendas?: number
          updated_at?: string | null
          vendas_faturadas?: number
        }
        Relationships: []
      }
      dre_realizados: {
        Row: {
          created_at: string
          faturamento_total: number
          id: string
          lucro_bruto: number
          lucro_liquido_final: number
          mes: string
          observacoes: string | null
          perc_bruto: number
          perc_liquido: number
          realizado_em: string
          realizado_por: string | null
          total_despesas_fixas: number
          total_despesas_folha: number
          total_despesas_variaveis: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          faturamento_total?: number
          id?: string
          lucro_bruto?: number
          lucro_liquido_final?: number
          mes: string
          observacoes?: string | null
          perc_bruto?: number
          perc_liquido?: number
          realizado_em?: string
          realizado_por?: string | null
          total_despesas_fixas?: number
          total_despesas_folha?: number
          total_despesas_variaveis?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          faturamento_total?: number
          id?: string
          lucro_bruto?: number
          lucro_liquido_final?: number
          mes?: string
          observacoes?: string | null
          perc_bruto?: number
          perc_liquido?: number
          realizado_em?: string
          realizado_por?: string | null
          total_despesas_fixas?: number
          total_despesas_folha?: number
          total_despesas_variaveis?: number
          updated_at?: string
        }
        Relationships: []
      }
      elisaportas_leads: {
        Row: {
          altura_porta: string | null
          atendente_id: string | null
          canal_aquisicao: string
          canal_aquisicao_id: string | null
          cidade: string | null
          cor_porta: string | null
          created_at: string
          data_conclusao_atendimento: string | null
          data_envio: string
          data_inicio_atendimento: string | null
          data_prevista_entrega: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade_completa: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          funcao_lead: string | null
          id: string
          largura_porta: string | null
          mensagem: string | null
          motivo_perda: Database["public"]["Enums"]["motivo_perda"] | null
          nome: string
          novo_status: Database["public"]["Enums"]["lead_status"] | null
          observacoes: string | null
          observacoes_perda: string | null
          tag_id: number | null
          telefone: string
          tipo_porta: string | null
          updated_at: string
          valor_orcamento: number | null
        }
        Insert: {
          altura_porta?: string | null
          atendente_id?: string | null
          canal_aquisicao?: string
          canal_aquisicao_id?: string | null
          cidade?: string | null
          cor_porta?: string | null
          created_at?: string
          data_conclusao_atendimento?: string | null
          data_envio?: string
          data_inicio_atendimento?: string | null
          data_prevista_entrega?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade_completa?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          funcao_lead?: string | null
          id?: string
          largura_porta?: string | null
          mensagem?: string | null
          motivo_perda?: Database["public"]["Enums"]["motivo_perda"] | null
          nome: string
          novo_status?: Database["public"]["Enums"]["lead_status"] | null
          observacoes?: string | null
          observacoes_perda?: string | null
          tag_id?: number | null
          telefone: string
          tipo_porta?: string | null
          updated_at?: string
          valor_orcamento?: number | null
        }
        Update: {
          altura_porta?: string | null
          atendente_id?: string | null
          canal_aquisicao?: string
          canal_aquisicao_id?: string | null
          cidade?: string | null
          cor_porta?: string | null
          created_at?: string
          data_conclusao_atendimento?: string | null
          data_envio?: string
          data_inicio_atendimento?: string | null
          data_prevista_entrega?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade_completa?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          funcao_lead?: string | null
          id?: string
          largura_porta?: string | null
          mensagem?: string | null
          motivo_perda?: Database["public"]["Enums"]["motivo_perda"] | null
          nome?: string
          novo_status?: Database["public"]["Enums"]["lead_status"] | null
          observacoes?: string | null
          observacoes_perda?: string | null
          tag_id?: number | null
          telefone?: string
          tipo_porta?: string | null
          updated_at?: string
          valor_orcamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elisaportas_leads_canal_aquisicao_id_fkey"
            columns: ["canal_aquisicao_id"]
            isOneToOne: false
            referencedRelation: "canais_aquisicao"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_emissoras: {
        Row: {
          aliquota_iss_padrao: number | null
          ambiente: string | null
          ativo: boolean | null
          bairro: string
          cep: string
          cidade: string
          cnae: string | null
          cnpj: string
          codigo_municipio_ibge: string | null
          codigo_servico_padrao: string | null
          complemento: string | null
          created_at: string | null
          created_by: string | null
          descricao_servico_padrao: string | null
          email: string | null
          email_copia: string | null
          endereco: string
          estado: string
          focusnfe_token: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome: string
          numero: string | null
          padrao: boolean | null
          razao_social: string
          regime_tributario: string | null
          serie_nfe: number | null
          serie_nfse: number | null
          telefone: string | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          aliquota_iss_padrao?: number | null
          ambiente?: string | null
          ativo?: boolean | null
          bairro: string
          cep: string
          cidade: string
          cnae?: string | null
          cnpj: string
          codigo_municipio_ibge?: string | null
          codigo_servico_padrao?: string | null
          complemento?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao_servico_padrao?: string | null
          email?: string | null
          email_copia?: string | null
          endereco: string
          estado: string
          focusnfe_token?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome: string
          numero?: string | null
          padrao?: boolean | null
          razao_social: string
          regime_tributario?: string | null
          serie_nfe?: number | null
          serie_nfse?: number | null
          telefone?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          aliquota_iss_padrao?: number | null
          ambiente?: string | null
          ativo?: boolean | null
          bairro?: string
          cep?: string
          cidade?: string
          cnae?: string | null
          cnpj?: string
          codigo_municipio_ibge?: string | null
          codigo_servico_padrao?: string | null
          complemento?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao_servico_padrao?: string | null
          email?: string | null
          email_copia?: string | null
          endereco?: string
          estado?: string
          focusnfe_token?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome?: string
          numero?: string | null
          padrao?: boolean | null
          razao_social?: string
          regime_tributario?: string | null
          serie_nfe?: number | null
          serie_nfse?: number | null
          telefone?: string | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipes_instalacao: {
        Row: {
          ativa: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_instalacao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes_instalacao_membros: {
        Row: {
          created_at: string
          created_by: string | null
          equipe_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipe_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipe_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_instalacao_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes_instalacao"
            referencedColumns: ["id"]
          },
        ]
      }
      estados_autorizados: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          ordem: number
          sigla: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number
          sigla: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          sigla?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      estoque: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          conferir_estoque: boolean
          created_at: string | null
          created_by: string | null
          custo_unitario: number
          descricao_produto: string | null
          eixo_calculo: string | null
          fornecedor_id: string | null
          id: string
          ipi_percent: number
          item_padrao_porta_enrolar: boolean | null
          materia_prima_conversao: number | null
          materia_prima_id: string | null
          modulo_calculo: string | null
          nome_produto: string
          ordem: number
          peso_porta: number | null
          pontuacao_producao: number | null
          preco_venda: number
          qtd_eixo_calculo: string | null
          qtd_modo_calculo: string
          qtd_operador: string | null
          qtd_porta_g: number | null
          qtd_porta_gg: number | null
          qtd_porta_p: number | null
          qtd_valor_calculo: number | null
          quantidade: number
          quantidade_ideal: number | null
          quantidade_maxima: number | null
          quantidade_padrao: number | null
          requer_pintura: boolean | null
          setor_responsavel_producao:
            | Database["public"]["Enums"]["setor_producao"]
            | null
          sku: string | null
          subcategoria_id: string | null
          taxa_cartao: number
          taxa_descontos: number
          taxa_impostos: number
          unidade: string | null
          updated_at: string | null
          valor_calculo: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          conferir_estoque?: boolean
          created_at?: string | null
          created_by?: string | null
          custo_unitario?: number
          descricao_produto?: string | null
          eixo_calculo?: string | null
          fornecedor_id?: string | null
          id?: string
          ipi_percent?: number
          item_padrao_porta_enrolar?: boolean | null
          materia_prima_conversao?: number | null
          materia_prima_id?: string | null
          modulo_calculo?: string | null
          nome_produto: string
          ordem?: number
          peso_porta?: number | null
          pontuacao_producao?: number | null
          preco_venda?: number
          qtd_eixo_calculo?: string | null
          qtd_modo_calculo?: string
          qtd_operador?: string | null
          qtd_porta_g?: number | null
          qtd_porta_gg?: number | null
          qtd_porta_p?: number | null
          qtd_valor_calculo?: number | null
          quantidade?: number
          quantidade_ideal?: number | null
          quantidade_maxima?: number | null
          quantidade_padrao?: number | null
          requer_pintura?: boolean | null
          setor_responsavel_producao?:
            | Database["public"]["Enums"]["setor_producao"]
            | null
          sku?: string | null
          subcategoria_id?: string | null
          taxa_cartao?: number
          taxa_descontos?: number
          taxa_impostos?: number
          unidade?: string | null
          updated_at?: string | null
          valor_calculo?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          conferir_estoque?: boolean
          created_at?: string | null
          created_by?: string | null
          custo_unitario?: number
          descricao_produto?: string | null
          eixo_calculo?: string | null
          fornecedor_id?: string | null
          id?: string
          ipi_percent?: number
          item_padrao_porta_enrolar?: boolean | null
          materia_prima_conversao?: number | null
          materia_prima_id?: string | null
          modulo_calculo?: string | null
          nome_produto?: string
          ordem?: number
          peso_porta?: number | null
          pontuacao_producao?: number | null
          preco_venda?: number
          qtd_eixo_calculo?: string | null
          qtd_modo_calculo?: string
          qtd_operador?: string | null
          qtd_porta_g?: number | null
          qtd_porta_gg?: number | null
          qtd_porta_p?: number | null
          qtd_valor_calculo?: number | null
          quantidade?: number
          quantidade_ideal?: number | null
          quantidade_maxima?: number | null
          quantidade_padrao?: number | null
          requer_pintura?: boolean | null
          setor_responsavel_producao?:
            | Database["public"]["Enums"]["setor_producao"]
            | null
          sku?: string | null
          subcategoria_id?: string | null
          taxa_cartao?: number
          taxa_descontos?: number
          taxa_impostos?: number
          unidade?: string | null
          updated_at?: string | null
          valor_calculo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_materia_prima_id_fkey"
            columns: ["materia_prima_id"]
            isOneToOne: false
            referencedRelation: "materias_primas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "estoque_subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_categorias: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      estoque_conferencia_itens: {
        Row: {
          conferencia_id: string
          created_at: string
          diferenca: number | null
          id: string
          produto_id: string
          quantidade_anterior: number
          quantidade_conferida: number | null
        }
        Insert: {
          conferencia_id: string
          created_at?: string
          diferenca?: number | null
          id?: string
          produto_id: string
          quantidade_anterior: number
          quantidade_conferida?: number | null
        }
        Update: {
          conferencia_id?: string
          created_at?: string
          diferenca?: number | null
          id?: string
          produto_id?: string
          quantidade_anterior?: number
          quantidade_conferida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_conferencia_itens_conferencia_id_fkey"
            columns: ["conferencia_id"]
            isOneToOne: false
            referencedRelation: "estoque_conferencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_conferencia_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_conferencias: {
        Row: {
          concluida_em: string | null
          conferido_por: string
          created_at: string
          id: string
          iniciada_em: string | null
          itens_conferidos: number | null
          observacoes: string | null
          pausada: boolean | null
          pausada_em: string | null
          setor: string | null
          status: string | null
          tempo_acumulado_segundos: number | null
          tempo_total_segundos: number | null
          total_itens: number | null
        }
        Insert: {
          concluida_em?: string | null
          conferido_por: string
          created_at?: string
          id?: string
          iniciada_em?: string | null
          itens_conferidos?: number | null
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          setor?: string | null
          status?: string | null
          tempo_acumulado_segundos?: number | null
          tempo_total_segundos?: number | null
          total_itens?: number | null
        }
        Update: {
          concluida_em?: string | null
          conferido_por?: string
          created_at?: string
          id?: string
          iniciada_em?: string | null
          itens_conferidos?: number | null
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          setor?: string | null
          status?: string | null
          tempo_acumulado_segundos?: number | null
          tempo_total_segundos?: number | null
          total_itens?: number | null
        }
        Relationships: []
      }
      estoque_movimentacoes: {
        Row: {
          categoria_anterior: string | null
          categoria_nova: string | null
          created_at: string
          created_by: string | null
          id: string
          observacoes: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Insert: {
          categoria_anterior?: string | null
          categoria_nova?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Update: {
          categoria_anterior?: string | null
          categoria_nova?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          quantidade_anterior?: number
          quantidade_nova?: number
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_subcategorias: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "estoque_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      estrategia_materias_primas: {
        Row: {
          ativo: boolean
          created_at: string
          custo_item_id: string
          custo_total: number
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          quantidade_item: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_item_id: string
          custo_total?: number
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number
          quantidade_item?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_item_id?: string
          custo_total?: number
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          quantidade_item?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrategia_materias_primas_custo_item_id_fkey"
            columns: ["custo_item_id"]
            isOneToOne: false
            referencedRelation: "custos_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_responsaveis: {
        Row: {
          created_at: string | null
          etapa: string
          id: string
          responsavel_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          etapa: string
          id?: string
          responsavel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          etapa?: string
          id?: string
          responsavel_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      eventos_calendario: {
        Row: {
          categoria: string
          created_at: string
          created_by: string
          data_evento: string
          descricao_evento: string | null
          horario_evento: string
          id: string
          nome_evento: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          created_by: string
          data_evento: string
          descricao_evento?: string | null
          horario_evento: string
          id?: string
          nome_evento: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string
          data_evento?: string
          descricao_evento?: string | null
          horario_evento?: string
          id?: string
          nome_evento?: string
          updated_at?: string
        }
        Relationships: []
      }
      eventos_membros: {
        Row: {
          created_at: string
          evento_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evento_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evento_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_membros_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_calendario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_eventos_membros_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      folha_pagamento_itens: {
        Row: {
          acrescimos: number | null
          colaborador_id: string
          colaborador_nome: string
          conta_pagar_id: string | null
          created_at: string
          descontos: number | null
          descricao_acrescimos: string | null
          descricao_descontos: string | null
          folha_id: string
          horas_adicionais: number | null
          id: string
          modalidade_pagamento: string | null
          salario_base: number
          total_bruto: number
          total_horas_adicionais: number | null
          total_liquido: number
          updated_at: string
          valor_hora_adicional: number | null
        }
        Insert: {
          acrescimos?: number | null
          colaborador_id: string
          colaborador_nome: string
          conta_pagar_id?: string | null
          created_at?: string
          descontos?: number | null
          descricao_acrescimos?: string | null
          descricao_descontos?: string | null
          folha_id: string
          horas_adicionais?: number | null
          id?: string
          modalidade_pagamento?: string | null
          salario_base?: number
          total_bruto?: number
          total_horas_adicionais?: number | null
          total_liquido?: number
          updated_at?: string
          valor_hora_adicional?: number | null
        }
        Update: {
          acrescimos?: number | null
          colaborador_id?: string
          colaborador_nome?: string
          conta_pagar_id?: string | null
          created_at?: string
          descontos?: number | null
          descricao_acrescimos?: string | null
          descricao_descontos?: string | null
          folha_id?: string
          horas_adicionais?: number | null
          id?: string
          modalidade_pagamento?: string | null
          salario_base?: number
          total_bruto?: number
          total_horas_adicionais?: number | null
          total_liquido?: number
          updated_at?: string
          valor_hora_adicional?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_itens_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_itens_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_itens_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      folhas_pagamento: {
        Row: {
          created_at: string
          created_by: string | null
          data_vencimento: string
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          total_bruto: number
          total_descontos: number
          total_liquido: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_vencimento: string
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          total_bruto?: number
          total_descontos?: number
          total_liquido?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          total_bruto?: number
          total_descontos?: number
          total_liquido?: number
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo: number
          created_at: string
          created_by: string | null
          estado: string | null
          id: string
          nome: string
          responsavel: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: number
          created_at?: string
          created_by?: string | null
          estado?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: number
          created_at?: string
          created_by?: string | null
          estado?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      frete_cidades: {
        Row: {
          ativo: boolean | null
          cidade: string
          created_at: string | null
          created_by: string | null
          estado: string
          id: string
          observacoes: string | null
          quilometragem: number | null
          updated_at: string | null
          valor_frete: number
        }
        Insert: {
          ativo?: boolean | null
          cidade: string
          created_at?: string | null
          created_by?: string | null
          estado: string
          id?: string
          observacoes?: string | null
          quilometragem?: number | null
          updated_at?: string | null
          valor_frete?: number
        }
        Update: {
          ativo?: boolean | null
          cidade?: string
          created_at?: string | null
          created_by?: string | null
          estado?: string
          id?: string
          observacoes?: string | null
          quilometragem?: number | null
          updated_at?: string | null
          valor_frete?: number
        }
        Relationships: []
      }
      frete_transportadoras: {
        Row: {
          ativo: boolean
          created_at: string
          estado: string
          id: string
          transportadora_id: string
          updated_at: string
          valor_porta_g: number
          valor_porta_gg: number
          valor_porta_p: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estado: string
          id?: string
          transportadora_id: string
          updated_at?: string
          valor_porta_g?: number
          valor_porta_gg?: number
          valor_porta_p?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estado?: string
          id?: string
          transportadora_id?: string
          updated_at?: string
          valor_porta_g?: number
          valor_porta_gg?: number
          valor_porta_p?: number
        }
        Relationships: [
          {
            foreignKeyName: "frete_transportadoras_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          banco_id: string
          created_at: string | null
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          observacoes: string | null
          responsavel_id: string
          status: string
          tipo_custo_id: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          banco_id: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id: string
          status?: string
          tipo_custo_id: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          banco_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string
          status?: string
          tipo_custo_id?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_tipo_custo_id_fkey"
            columns: ["tipo_custo_id"]
            isOneToOne: false
            referencedRelation: "tipos_custos"
            referencedColumns: ["id"]
          },
        ]
      }
      instalacoes: {
        Row: {
          carregamento_concluido: boolean | null
          carregamento_concluido_em: string | null
          carregamento_concluido_por: string | null
          cep: string | null
          cidade: string | null
          cor_id: string | null
          created_at: string
          created_by: string | null
          data_carregamento: string | null
          data_instalacao: string | null
          endereco: string | null
          estado: string | null
          foto_carregamento_url: string | null
          geocode_precision: string | null
          hora: string
          hora_carregamento: string | null
          id: string
          instalacao_concluida: boolean
          instalacao_concluida_em: string | null
          instalacao_concluida_por: string | null
          last_geocoded_at: string | null
          latitude: number | null
          longitude: number | null
          metodo_pagamento_entrega: string | null
          metragem_quadrada: number | null
          nome_cliente: string
          observacoes: string | null
          pedido_id: string | null
          responsavel_carregamento_id: string | null
          responsavel_carregamento_nome: string | null
          responsavel_instalacao_id: string | null
          responsavel_instalacao_nome: string | null
          status: string
          telefone_cliente: string | null
          tipo_carregamento:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          tipo_instalacao: string | null
          updated_at: string
          valor_pagamento_entrega: number | null
          venda_id: string | null
          vezes_agendado: number
        }
        Insert: {
          carregamento_concluido?: boolean | null
          carregamento_concluido_em?: string | null
          carregamento_concluido_por?: string | null
          cep?: string | null
          cidade?: string | null
          cor_id?: string | null
          created_at?: string
          created_by?: string | null
          data_carregamento?: string | null
          data_instalacao?: string | null
          endereco?: string | null
          estado?: string | null
          foto_carregamento_url?: string | null
          geocode_precision?: string | null
          hora?: string
          hora_carregamento?: string | null
          id?: string
          instalacao_concluida?: boolean
          instalacao_concluida_em?: string | null
          instalacao_concluida_por?: string | null
          last_geocoded_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metodo_pagamento_entrega?: string | null
          metragem_quadrada?: number | null
          nome_cliente: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel_carregamento_id?: string | null
          responsavel_carregamento_nome?: string | null
          responsavel_instalacao_id?: string | null
          responsavel_instalacao_nome?: string | null
          status?: string
          telefone_cliente?: string | null
          tipo_carregamento?:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          tipo_instalacao?: string | null
          updated_at?: string
          valor_pagamento_entrega?: number | null
          venda_id?: string | null
          vezes_agendado?: number
        }
        Update: {
          carregamento_concluido?: boolean | null
          carregamento_concluido_em?: string | null
          carregamento_concluido_por?: string | null
          cep?: string | null
          cidade?: string | null
          cor_id?: string | null
          created_at?: string
          created_by?: string | null
          data_carregamento?: string | null
          data_instalacao?: string | null
          endereco?: string | null
          estado?: string | null
          foto_carregamento_url?: string | null
          geocode_precision?: string | null
          hora?: string
          hora_carregamento?: string | null
          id?: string
          instalacao_concluida?: boolean
          instalacao_concluida_em?: string | null
          instalacao_concluida_por?: string | null
          last_geocoded_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metodo_pagamento_entrega?: string | null
          metragem_quadrada?: number | null
          nome_cliente?: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel_carregamento_id?: string | null
          responsavel_carregamento_nome?: string | null
          responsavel_instalacao_id?: string | null
          responsavel_instalacao_nome?: string | null
          status?: string
          telefone_cliente?: string | null
          tipo_carregamento?:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          tipo_instalacao?: string | null
          updated_at?: string
          valor_pagamento_entrega?: number | null
          venda_id?: string | null
          vezes_agendado?: number
        }
        Relationships: [
          {
            foreignKeyName: "instalacoes_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instalacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "instalacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instalacoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_anexos: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          nome_arquivo: string
          tamanho_arquivo: number | null
          tipo_arquivo: string | null
          uploaded_by: string | null
          url_arquivo: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          nome_arquivo: string
          tamanho_arquivo?: number | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
          url_arquivo: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          nome_arquivo?: string
          tamanho_arquivo?: number | null
          tipo_arquivo?: string | null
          uploaded_by?: string | null
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_anexos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "elisaportas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_atendimento_historico: {
        Row: {
          acao: string
          atendente_id: string
          created_at: string
          id: string
          lead_id: string
          observacoes: string | null
          status_anterior: number | null
          status_novo: number | null
        }
        Insert: {
          acao: string
          atendente_id: string
          created_at?: string
          id?: string
          lead_id: string
          observacoes?: string | null
          status_anterior?: number | null
          status_novo?: number | null
        }
        Update: {
          acao?: string
          atendente_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          observacoes?: string | null
          status_anterior?: number | null
          status_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_atendimento_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "elisaportas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_comentarios: {
        Row: {
          comentario: string
          created_at: string
          id: string
          lead_id: string
          usuario_id: string
        }
        Insert: {
          comentario: string
          created_at?: string
          id?: string
          lead_id: string
          usuario_id: string
        }
        Update: {
          comentario?: string
          created_at?: string
          id?: string
          lead_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comentarios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "elisaportas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_etiqueta_historico: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          observacoes: string | null
          tag_id_anterior: number | null
          tag_id_novo: number | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          observacoes?: string | null
          tag_id_anterior?: number | null
          tag_id_novo?: number | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          observacoes?: string | null
          tag_id_anterior?: number | null
          tag_id_novo?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_etiqueta_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "elisaportas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_ordens: {
        Row: {
          altura: number | null
          com_problema: boolean | null
          concluida: boolean | null
          concluida_em: string | null
          concluida_por: string | null
          cor_nome: string | null
          created_at: string
          estoque_id: string | null
          id: string
          indice_porta: number | null
          item: string
          largura: number | null
          ordem_id: string | null
          pedido_id: string
          pedido_linha_id: string | null
          problema_descricao: string | null
          problema_reportado_em: string | null
          problema_reportado_por: string | null
          produto_venda_id: string | null
          quantidade: number
          tamanho: string | null
          tipo_ordem: string
          tipo_pintura: string | null
          updated_at: string
        }
        Insert: {
          altura?: number | null
          com_problema?: boolean | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluida_por?: string | null
          cor_nome?: string | null
          created_at?: string
          estoque_id?: string | null
          id?: string
          indice_porta?: number | null
          item: string
          largura?: number | null
          ordem_id?: string | null
          pedido_id: string
          pedido_linha_id?: string | null
          problema_descricao?: string | null
          problema_reportado_em?: string | null
          problema_reportado_por?: string | null
          produto_venda_id?: string | null
          quantidade?: number
          tamanho?: string | null
          tipo_ordem: string
          tipo_pintura?: string | null
          updated_at?: string
        }
        Update: {
          altura?: number | null
          com_problema?: boolean | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluida_por?: string | null
          cor_nome?: string | null
          created_at?: string
          estoque_id?: string | null
          id?: string
          indice_porta?: number | null
          item?: string
          largura?: number | null
          ordem_id?: string | null
          pedido_id?: string
          pedido_linha_id?: string | null
          problema_descricao?: string | null
          problema_reportado_em?: string | null
          problema_reportado_por?: string | null
          produto_venda_id?: string | null
          quantidade?: number
          tamanho?: string | null
          tipo_ordem?: string
          tipo_pintura?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linhas_ordens_concluida_por_fkey"
            columns: ["concluida_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "linhas_ordens_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linhas_ordens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "linhas_ordens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linhas_ordens_pedido_linha_id_fkey"
            columns: ["pedido_linha_id"]
            isOneToOne: false
            referencedRelation: "pedido_linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_investimentos: {
        Row: {
          created_at: string
          created_by: string
          id: string
          investimento_google_ads: number | null
          investimento_linkedin_ads: number | null
          investimento_meta_ads: number | null
          mes: string
          observacoes: string | null
          outros_investimentos: number | null
          regiao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          investimento_google_ads?: number | null
          investimento_linkedin_ads?: number | null
          investimento_meta_ads?: number | null
          mes: string
          observacoes?: string | null
          outros_investimentos?: number | null
          regiao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          investimento_google_ads?: number | null
          investimento_linkedin_ads?: number | null
          investimento_meta_ads?: number | null
          mes?: string
          observacoes?: string | null
          outros_investimentos?: number | null
          regiao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_videos_ideias: {
        Row: {
          autores_ids: string[]
          autores_nomes: string[]
          created_at: string
          criado_por: string | null
          criado_por_nome: string | null
          descricao: string
          id: string
          posicao: number | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          autores_ids?: string[]
          autores_nomes?: string[]
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          descricao: string
          id?: string
          posicao?: number | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          autores_ids?: string[]
          autores_nomes?: string[]
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          descricao?: string
          id?: string
          posicao?: number | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      materias_primas: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          custo_unitario: number
          fornecedor_id: string | null
          id: string
          nome: string
          ordem: number
          quantidade: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          fornecedor_id?: string | null
          id?: string
          nome: string
          ordem?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          fornecedor_id?: string | null
          id?: string
          nome?: string
          ordem?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materias_primas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_colaboradores: {
        Row: {
          concluida: boolean | null
          concluida_em: string | null
          created_at: string | null
          created_by: string | null
          data_inicio: string
          data_termino: string
          desbloqueada: boolean | null
          id: string
          recompensa_valor: number
          tipo_meta: string
          updated_at: string | null
          user_id: string
          valor_meta: number
        }
        Insert: {
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_inicio?: string
          data_termino: string
          desbloqueada?: boolean | null
          id?: string
          recompensa_valor?: number
          tipo_meta: string
          updated_at?: string | null
          user_id: string
          valor_meta: number
        }
        Update: {
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_inicio?: string
          data_termino?: string
          desbloqueada?: boolean | null
          id?: string
          recompensa_valor?: number
          tipo_meta?: string
          updated_at?: string | null
          user_id?: string
          valor_meta?: number
        }
        Relationships: []
      }
      metas_instalacao: {
        Row: {
          concluida: boolean | null
          created_at: string | null
          created_by: string | null
          data_inicio: string
          data_termino: string
          id: string
          quantidade_portas: number
          referencia_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          concluida?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_inicio: string
          data_termino: string
          id?: string
          quantidade_portas: number
          referencia_id: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          concluida?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_inicio?: string
          data_termino?: string
          id?: string
          quantidade_portas?: number
          referencia_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      metas_vendas: {
        Row: {
          ativa: boolean
          created_at: string
          created_by: string | null
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          escopo: string
          id: string
          nome: string
          periodo: string
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          escopo: string
          id?: string
          nome: string
          periodo: string
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          escopo?: string
          id?: string
          nome?: string
          periodo?: string
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: []
      }
      metas_vendas_tiers: {
        Row: {
          bonificacao_tipo: string
          bonificacao_valor: number
          cor: string
          created_at: string
          id: string
          meta_id: string
          nome: string
          ordem: number
          updated_at: string
          valor_alvo: number
        }
        Insert: {
          bonificacao_tipo?: string
          bonificacao_valor?: number
          cor?: string
          created_at?: string
          id?: string
          meta_id: string
          nome: string
          ordem?: number
          updated_at?: string
          valor_alvo?: number
        }
        Update: {
          bonificacao_tipo?: string
          bonificacao_valor?: number
          cor?: string
          created_at?: string
          id?: string
          meta_id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          valor_alvo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendas_tiers_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      missao_checkboxes: {
        Row: {
          concluida: boolean | null
          concluida_em: string | null
          created_at: string | null
          descricao: string
          id: string
          missao_id: string
          ordem: number | null
          prazo: string | null
        }
        Insert: {
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          missao_id: string
          ordem?: number | null
          prazo?: string | null
        }
        Update: {
          concluida?: boolean | null
          concluida_em?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          missao_id?: string
          ordem?: number | null
          prazo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missao_checkboxes_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          ordem: number | null
          responsavel_id: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ordem?: number | null
          responsavel_id?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ordem?: number | null
          responsavel_id?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      multas: {
        Row: {
          created_at: string
          data_vencimento: string
          descricao: string | null
          id: string
          status: string
          updated_at: string
          usuario_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          descricao?: string | null
          id?: string
          status?: string
          updated_at?: string
          usuario_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          descricao?: string | null
          id?: string
          status?: string
          updated_at?: string
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "multas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      multas_etapa_responsaveis: {
        Row: {
          created_at: string
          id: string
          responsavel_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          responsavel_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          responsavel_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      naturezas_operacao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      neo_correcoes: {
        Row: {
          autorizado_id: string | null
          autorizado_nome: string | null
          cidade: string
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          created_by: string | null
          data_correcao: string | null
          descricao: string | null
          equipe_id: string | null
          equipe_nome: string | null
          estado: string
          etapa_causadora: string | null
          hora: string | null
          id: string
          nome_cliente: string
          prioridade_gestao: number
          status: string
          tipo_responsavel: string | null
          updated_at: string
          valor_a_receber: number | null
          valor_a_receber_texto: string | null
          valor_total: number | null
          vezes_agendado: number
        }
        Insert: {
          autorizado_id?: string | null
          autorizado_nome?: string | null
          cidade: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          data_correcao?: string | null
          descricao?: string | null
          equipe_id?: string | null
          equipe_nome?: string | null
          estado: string
          etapa_causadora?: string | null
          hora?: string | null
          id?: string
          nome_cliente: string
          prioridade_gestao?: number
          status?: string
          tipo_responsavel?: string | null
          updated_at?: string
          valor_a_receber?: number | null
          valor_a_receber_texto?: string | null
          valor_total?: number | null
          vezes_agendado?: number
        }
        Update: {
          autorizado_id?: string | null
          autorizado_nome?: string | null
          cidade?: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          data_correcao?: string | null
          descricao?: string | null
          equipe_id?: string | null
          equipe_nome?: string | null
          estado?: string
          etapa_causadora?: string | null
          hora?: string | null
          id?: string
          nome_cliente?: string
          prioridade_gestao?: number
          status?: string
          tipo_responsavel?: string | null
          updated_at?: string
          valor_a_receber?: number | null
          valor_a_receber_texto?: string | null
          valor_total?: number | null
          vezes_agendado?: number
        }
        Relationships: [
          {
            foreignKeyName: "neo_correcoes_autorizado_id_fkey"
            columns: ["autorizado_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neo_correcoes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes_instalacao"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_instalacoes: {
        Row: {
          autorizado_id: string | null
          autorizado_nome: string | null
          cidade: string
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          created_by: string | null
          data_instalacao: string | null
          descricao: string | null
          equipe_id: string | null
          equipe_nome: string | null
          estado: string
          etapa_causadora: string | null
          hora: string | null
          id: string
          nome_cliente: string
          prioridade_gestao: number
          status: string
          tipo_responsavel: string | null
          updated_at: string
          valor_a_receber: number | null
          valor_a_receber_texto: string | null
          valor_total: number | null
          vezes_agendado: number
        }
        Insert: {
          autorizado_id?: string | null
          autorizado_nome?: string | null
          cidade: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          descricao?: string | null
          equipe_id?: string | null
          equipe_nome?: string | null
          estado: string
          etapa_causadora?: string | null
          hora?: string | null
          id?: string
          nome_cliente: string
          prioridade_gestao?: number
          status?: string
          tipo_responsavel?: string | null
          updated_at?: string
          valor_a_receber?: number | null
          valor_a_receber_texto?: string | null
          valor_total?: number | null
          vezes_agendado?: number
        }
        Update: {
          autorizado_id?: string | null
          autorizado_nome?: string | null
          cidade?: string
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          descricao?: string | null
          equipe_id?: string | null
          equipe_nome?: string | null
          estado?: string
          etapa_causadora?: string | null
          hora?: string | null
          id?: string
          nome_cliente?: string
          prioridade_gestao?: number
          status?: string
          tipo_responsavel?: string | null
          updated_at?: string
          valor_a_receber?: number | null
          valor_a_receber_texto?: string | null
          valor_total?: number | null
          vezes_agendado?: number
        }
        Relationships: [
          {
            foreignKeyName: "neo_instalacoes_autorizado_id_fkey"
            columns: ["autorizado_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neo_instalacoes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes_instalacao"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          aliquota_iss: number | null
          ambiente: string | null
          api_id: string | null
          chave_acesso: string | null
          cnpj_cpf: string
          codigo_servico: string | null
          created_at: string
          created_by: string | null
          danfe_url: string | null
          data_autorizacao: string | null
          data_emissao: string
          data_vencimento: string | null
          descricao_servico: string | null
          email_enviado: boolean | null
          empresa_emissora_id: string | null
          id: string
          motivo_rejeicao: string | null
          numero: string
          observacoes: string | null
          pdf_nome_arquivo: string | null
          pdf_url: string | null
          protocolo_autorizacao: string | null
          razao_social: string
          ref_externa: string | null
          serie: string
          status: string
          status_sefaz: string | null
          tipo: string
          tomador_bairro: string | null
          tomador_cep: string | null
          tomador_cidade: string | null
          tomador_endereco: string | null
          tomador_numero: string | null
          tomador_uf: string | null
          updated_at: string
          valor_iss: number | null
          valor_total: number
          venda_id: string | null
          xml_autorizado_url: string | null
          xml_nome_arquivo: string | null
          xml_url: string | null
        }
        Insert: {
          aliquota_iss?: number | null
          ambiente?: string | null
          api_id?: string | null
          chave_acesso?: string | null
          cnpj_cpf: string
          codigo_servico?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_autorizacao?: string | null
          data_emissao: string
          data_vencimento?: string | null
          descricao_servico?: string | null
          email_enviado?: boolean | null
          empresa_emissora_id?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero: string
          observacoes?: string | null
          pdf_nome_arquivo?: string | null
          pdf_url?: string | null
          protocolo_autorizacao?: string | null
          razao_social: string
          ref_externa?: string | null
          serie: string
          status?: string
          status_sefaz?: string | null
          tipo: string
          tomador_bairro?: string | null
          tomador_cep?: string | null
          tomador_cidade?: string | null
          tomador_endereco?: string | null
          tomador_numero?: string | null
          tomador_uf?: string | null
          updated_at?: string
          valor_iss?: number | null
          valor_total?: number
          venda_id?: string | null
          xml_autorizado_url?: string | null
          xml_nome_arquivo?: string | null
          xml_url?: string | null
        }
        Update: {
          aliquota_iss?: number | null
          ambiente?: string | null
          api_id?: string | null
          chave_acesso?: string | null
          cnpj_cpf?: string
          codigo_servico?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_autorizacao?: string | null
          data_emissao?: string
          data_vencimento?: string | null
          descricao_servico?: string | null
          email_enviado?: boolean | null
          empresa_emissora_id?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero?: string
          observacoes?: string | null
          pdf_nome_arquivo?: string | null
          pdf_url?: string | null
          protocolo_autorizacao?: string | null
          razao_social?: string
          ref_externa?: string | null
          serie?: string
          status?: string
          status_sefaz?: string | null
          tipo?: string
          tomador_bairro?: string | null
          tomador_cep?: string | null
          tomador_cidade?: string | null
          tomador_endereco?: string | null
          tomador_numero?: string | null
          tomador_uf?: string | null
          updated_at?: string
          valor_iss?: number | null
          valor_total?: number
          venda_id?: string | null
          xml_autorizado_url?: string | null
          xml_nome_arquivo?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_empresa_emissora_id_fkey"
            columns: ["empresa_emissora_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      numeracao_controle: {
        Row: {
          created_at: string | null
          id: string
          proximo_numero: number
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          proximo_numero?: number
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          proximo_numero?: number
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orcamento_custos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          orcamento_id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          orcamento_id: string
          tipo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          orcamento_id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      orcamento_produtos: {
        Row: {
          acessorio_id: string | null
          adicional_id: string | null
          cor: string | null
          cor_id: string | null
          created_at: string
          desconto_percentual: number | null
          descricao: string
          descricao_manutencao: string | null
          id: string
          medidas: string | null
          orcamento_id: string
          preco_instalacao: number | null
          preco_producao: number | null
          quantidade: number
          tipo_produto: string
          updated_at: string
          valor: number
        }
        Insert: {
          acessorio_id?: string | null
          adicional_id?: string | null
          cor?: string | null
          cor_id?: string | null
          created_at?: string
          desconto_percentual?: number | null
          descricao: string
          descricao_manutencao?: string | null
          id?: string
          medidas?: string | null
          orcamento_id: string
          preco_instalacao?: number | null
          preco_producao?: number | null
          quantidade?: number
          tipo_produto: string
          updated_at?: string
          valor?: number
        }
        Update: {
          acessorio_id?: string | null
          adicional_id?: string | null
          cor?: string | null
          cor_id?: string | null
          created_at?: string
          desconto_percentual?: number | null
          descricao?: string
          descricao_manutencao?: string | null
          id?: string
          medidas?: string | null
          orcamento_id?: string
          preco_instalacao?: number | null
          preco_producao?: number | null
          quantidade?: number
          tipo_produto?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_orcamento_produtos_acessorio"
            columns: ["acessorio_id"]
            isOneToOne: false
            referencedRelation: "acessorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orcamento_produtos_adicional"
            columns: ["adicional_id"]
            isOneToOne: false
            referencedRelation: "adicionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orcamento_produtos_cor"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_produtos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          aprovado_por: string | null
          atendente_id: string | null
          campos_personalizados: Json | null
          canal_aquisicao_id: string | null
          classe: number | null
          cliente_bairro: string | null
          cliente_cep: string | null
          cliente_cidade: string | null
          cliente_cpf: string | null
          cliente_email: string | null
          cliente_estado: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          data_aprovacao: string | null
          desconto_adicional_percentual: number | null
          desconto_adicional_valor: number | null
          desconto_percentual: number | null
          forma_pagamento: string
          id: string
          justificativa_perda: string | null
          lead_id: string | null
          modalidade_instalacao: string | null
          motivo_analise: string | null
          motivo_perda: string | null
          numero_orcamento: number | null
          observacoes: string | null
          observacoes_aprovacao: string | null
          publico_alvo: string | null
          requer_analise: boolean
          status: string
          tipo_desconto_adicional: string | null
          updated_at: string
          valor_frete: number
          valor_instalacao: number
          valor_pintura: number
          valor_produto: number
          valor_total: number
        }
        Insert: {
          aprovado_por?: string | null
          atendente_id?: string | null
          campos_personalizados?: Json | null
          canal_aquisicao_id?: string | null
          classe?: number | null
          cliente_bairro?: string | null
          cliente_cep?: string | null
          cliente_cidade?: string | null
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_estado?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          data_aprovacao?: string | null
          desconto_adicional_percentual?: number | null
          desconto_adicional_valor?: number | null
          desconto_percentual?: number | null
          forma_pagamento: string
          id?: string
          justificativa_perda?: string | null
          lead_id?: string | null
          modalidade_instalacao?: string | null
          motivo_analise?: string | null
          motivo_perda?: string | null
          numero_orcamento?: number | null
          observacoes?: string | null
          observacoes_aprovacao?: string | null
          publico_alvo?: string | null
          requer_analise?: boolean
          status?: string
          tipo_desconto_adicional?: string | null
          updated_at?: string
          valor_frete?: number
          valor_instalacao?: number
          valor_pintura?: number
          valor_produto?: number
          valor_total?: number
        }
        Update: {
          aprovado_por?: string | null
          atendente_id?: string | null
          campos_personalizados?: Json | null
          canal_aquisicao_id?: string | null
          classe?: number | null
          cliente_bairro?: string | null
          cliente_cep?: string | null
          cliente_cidade?: string | null
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_estado?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          data_aprovacao?: string | null
          desconto_adicional_percentual?: number | null
          desconto_adicional_valor?: number | null
          desconto_percentual?: number | null
          forma_pagamento?: string
          id?: string
          justificativa_perda?: string | null
          lead_id?: string | null
          modalidade_instalacao?: string | null
          motivo_analise?: string | null
          motivo_perda?: string | null
          numero_orcamento?: number | null
          observacoes?: string | null
          observacoes_aprovacao?: string | null
          publico_alvo?: string | null
          requer_analise?: boolean
          status?: string
          tipo_desconto_adicional?: string | null
          updated_at?: string
          valor_frete?: number
          valor_instalacao?: number
          valor_pintura?: number
          valor_produto?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orcamentos_canal_aquisicao_id_fkey"
            columns: ["canal_aquisicao_id"]
            isOneToOne: false
            referencedRelation: "canais_aquisicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "elisaportas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_app: {
        Row: {
          cidade: string | null
          created_at: string
          estado: string | null
          id: string
          itens: Json
          numero: number
          origem: string
          representante_id: string | null
          user_id: string | null
          valor_frete: number
          valor_itens: number
          valor_total: number
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          itens?: Json
          numero: number
          origem: string
          representante_id?: string | null
          user_id?: string | null
          valor_frete?: number
          valor_itens?: number
          valor_total?: number
        }
        Update: {
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          itens?: Json
          numero?: number
          origem?: string
          representante_id?: string | null
          user_id?: string | null
          valor_frete?: number
          valor_itens?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_app_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_carregamento: {
        Row: {
          carregamento_concluido: boolean | null
          carregamento_concluido_em: string | null
          carregamento_concluido_por: string | null
          created_at: string
          created_by: string | null
          data_carregamento: string | null
          foto_carregamento_url: string | null
          geocode_precision: string | null
          hora: string
          hora_carregamento: string | null
          id: string
          last_geocoded_at: string | null
          latitude: number | null
          longitude: number | null
          nome_cliente: string
          observacoes: string | null
          pedido_id: string | null
          quantidade_pedidos: number | null
          responsavel_carregamento_id: string | null
          responsavel_carregamento_nome: string | null
          status: string | null
          tipo_carregamento:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          updated_at: string
          venda_id: string | null
          vezes_agendado: number
        }
        Insert: {
          carregamento_concluido?: boolean | null
          carregamento_concluido_em?: string | null
          carregamento_concluido_por?: string | null
          created_at?: string
          created_by?: string | null
          data_carregamento?: string | null
          foto_carregamento_url?: string | null
          geocode_precision?: string | null
          hora: string
          hora_carregamento?: string | null
          id?: string
          last_geocoded_at?: string | null
          latitude?: number | null
          longitude?: number | null
          nome_cliente: string
          observacoes?: string | null
          pedido_id?: string | null
          quantidade_pedidos?: number | null
          responsavel_carregamento_id?: string | null
          responsavel_carregamento_nome?: string | null
          status?: string | null
          tipo_carregamento?:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          updated_at?: string
          venda_id?: string | null
          vezes_agendado?: number
        }
        Update: {
          carregamento_concluido?: boolean | null
          carregamento_concluido_em?: string | null
          carregamento_concluido_por?: string | null
          created_at?: string
          created_by?: string | null
          data_carregamento?: string | null
          foto_carregamento_url?: string | null
          geocode_precision?: string | null
          hora?: string
          hora_carregamento?: string | null
          id?: string
          last_geocoded_at?: string | null
          latitude?: number | null
          longitude?: number | null
          nome_cliente?: string
          observacoes?: string | null
          pedido_id?: string | null
          quantidade_pedidos?: number | null
          responsavel_carregamento_id?: string | null
          responsavel_carregamento_nome?: string | null
          status?: string | null
          tipo_carregamento?:
            | Database["public"]["Enums"]["tipo_carregamento"]
            | null
          updated_at?: string
          venda_id?: string | null
          vezes_agendado?: number
        }
        Relationships: [
          {
            foreignKeyName: "instalacoes_id_venda_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instalacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "instalacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_carregamento_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_carregamento_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_embalagem: {
        Row: {
          capturada_em: string | null
          created_at: string
          data_conclusao: string | null
          em_backlog: boolean
          historico: boolean
          id: string
          justificativa_pausa: string | null
          numero_ordem: string
          pausada: boolean | null
          pausada_em: string | null
          pedido_id: string
          prioridade: number
          responsavel_id: string | null
          status: string
          tempo_acumulado_segundos: number | null
          tempo_conclusao_segundos: number | null
          updated_at: string
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string
          data_conclusao?: string | null
          em_backlog?: boolean
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          numero_ordem: string
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id: string
          prioridade?: number
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Update: {
          capturada_em?: string | null
          created_at?: string
          data_conclusao?: string | null
          em_backlog?: boolean
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          numero_ordem?: string
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id?: string
          prioridade?: number
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_embalagem_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_embalagem_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_perfiladeira: {
        Row: {
          capturada_em: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          em_backlog: boolean | null
          historico: boolean
          id: string
          justificativa_pausa: string | null
          linha_problema_id: string | null
          metragem_linear: number | null
          numero_ordem: string
          observacoes: string | null
          pausada: boolean | null
          pausada_em: string | null
          pedido_id: string
          perfis_produzidos: Json | null
          prioridade: number | null
          produtos: Json | null
          projeto_alterado: boolean | null
          projeto_alterado_descricao: string | null
          projeto_alterado_em: string | null
          responsavel_id: string | null
          status: string
          tempo_acumulado_segundos: number | null
          tempo_conclusao_segundos: number | null
          updated_at: string
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          linha_problema_id?: string | null
          metragem_linear?: number | null
          numero_ordem: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id: string
          perfis_produzidos?: Json | null
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Update: {
          capturada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          linha_problema_id?: string | null
          metragem_linear?: number | null
          numero_ordem?: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id?: string
          perfis_produzidos?: Json | null
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_perfiladeira_linha_problema_id_fkey"
            columns: ["linha_problema_id"]
            isOneToOne: false
            referencedRelation: "linhas_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_perfiladeira_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_perfiladeira_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_pintura: {
        Row: {
          capturada_em: string | null
          cor_principal: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          em_backlog: boolean | null
          historico: boolean
          id: string
          metragem_quadrada: number | null
          numero_ordem: string
          observacoes: string | null
          pedido_id: string
          prioridade: number | null
          produtos: Json | null
          projeto_alterado: boolean | null
          projeto_alterado_descricao: string | null
          projeto_alterado_em: string | null
          responsavel_id: string | null
          status: string
          tempo_conclusao_segundos: number | null
          tipo_tinta: string | null
          updated_at: string
        }
        Insert: {
          capturada_em?: string | null
          cor_principal?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          metragem_quadrada?: number | null
          numero_ordem: string
          observacoes?: string | null
          pedido_id: string
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          responsavel_id?: string | null
          status?: string
          tempo_conclusao_segundos?: number | null
          tipo_tinta?: string | null
          updated_at?: string
        }
        Update: {
          capturada_em?: string | null
          cor_principal?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          metragem_quadrada?: number | null
          numero_ordem?: string
          observacoes?: string | null
          pedido_id?: string
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          responsavel_id?: string | null
          status?: string
          tempo_conclusao_segundos?: number | null
          tipo_tinta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_pintura_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_pintura_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_porta_social: {
        Row: {
          capturada_em: string | null
          created_at: string | null
          data_conclusao: string | null
          delegado_em: string | null
          delegado_para_id: string | null
          delegado_por_id: string | null
          em_backlog: boolean | null
          historico: boolean
          id: string
          numero_ordem: string
          observacoes: string | null
          pedido_id: string
          prioridade: number | null
          status: string
          tempo_conclusao_segundos: number | null
          updated_at: string | null
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          delegado_em?: string | null
          delegado_para_id?: string | null
          delegado_por_id?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          numero_ordem: string
          observacoes?: string | null
          pedido_id: string
          prioridade?: number | null
          status?: string
          tempo_conclusao_segundos?: number | null
          updated_at?: string | null
        }
        Update: {
          capturada_em?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          delegado_em?: string | null
          delegado_para_id?: string | null
          delegado_por_id?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          numero_ordem?: string
          observacoes?: string | null
          pedido_id?: string
          prioridade?: number | null
          status?: string
          tempo_conclusao_segundos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_porta_social_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_porta_social_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_qualidade: {
        Row: {
          capturada_em: string | null
          created_at: string | null
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          em_backlog: boolean | null
          historico: boolean
          id: string
          justificativa_pausa: string | null
          numero_ordem: string
          observacoes: string | null
          pausada: boolean | null
          pausada_em: string | null
          pedido_id: string
          prioridade: number | null
          projeto_alterado: boolean | null
          projeto_alterado_descricao: string | null
          projeto_alterado_em: string | null
          quantidade_pedidos: number | null
          responsavel_id: string | null
          status: string
          tempo_acumulado_segundos: number | null
          tempo_conclusao_segundos: number | null
          updated_at: string | null
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          numero_ordem: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id: string
          prioridade?: number | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          quantidade_pedidos?: number | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string | null
        }
        Update: {
          capturada_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          numero_ordem?: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id?: string
          prioridade?: number | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          quantidade_pedidos?: number | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_qualidade_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ordens_qualidade_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_qualidade_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_qualidade_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ordens_separacao: {
        Row: {
          capturada_em: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          em_backlog: boolean | null
          historico: boolean
          id: string
          justificativa_pausa: string | null
          linha_problema_id: string | null
          materiais_separados: Json | null
          numero_ordem: string
          observacoes: string | null
          pausada: boolean | null
          pausada_em: string | null
          pedido_id: string
          prioridade: number | null
          produtos: Json | null
          projeto_alterado: boolean | null
          projeto_alterado_descricao: string | null
          projeto_alterado_em: string | null
          quantidade_itens: number | null
          responsavel_id: string | null
          status: string
          tempo_acumulado_segundos: number | null
          tempo_conclusao_segundos: number | null
          updated_at: string
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          linha_problema_id?: string | null
          materiais_separados?: Json | null
          numero_ordem: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id: string
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          quantidade_itens?: number | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Update: {
          capturada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          linha_problema_id?: string | null
          materiais_separados?: Json | null
          numero_ordem?: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id?: string
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          quantidade_itens?: number | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_separacao_linha_problema_id_fkey"
            columns: ["linha_problema_id"]
            isOneToOne: false
            referencedRelation: "linhas_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_separacao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_separacao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_soldagem: {
        Row: {
          capturada_em: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          em_backlog: boolean | null
          historico: boolean
          id: string
          justificativa_pausa: string | null
          linha_problema_id: string | null
          metragem_quadrada: number | null
          numero_ordem: string
          observacoes: string | null
          pausada: boolean | null
          pausada_em: string | null
          pedido_id: string
          prioridade: number | null
          produtos: Json | null
          projeto_alterado: boolean | null
          projeto_alterado_descricao: string | null
          projeto_alterado_em: string | null
          qtd_portas_g: number | null
          qtd_portas_p: number | null
          responsavel_id: string | null
          status: string
          tempo_acumulado_segundos: number | null
          tempo_conclusao_segundos: number | null
          updated_at: string
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          linha_problema_id?: string | null
          metragem_quadrada?: number | null
          numero_ordem: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id: string
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          qtd_portas_g?: number | null
          qtd_portas_p?: number | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Update: {
          capturada_em?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          em_backlog?: boolean | null
          historico?: boolean
          id?: string
          justificativa_pausa?: string | null
          linha_problema_id?: string | null
          metragem_quadrada?: number | null
          numero_ordem?: string
          observacoes?: string | null
          pausada?: boolean | null
          pausada_em?: string | null
          pedido_id?: string
          prioridade?: number | null
          produtos?: Json | null
          projeto_alterado?: boolean | null
          projeto_alterado_descricao?: string | null
          projeto_alterado_em?: string | null
          qtd_portas_g?: number | null
          qtd_portas_p?: number | null
          responsavel_id?: string | null
          status?: string
          tempo_acumulado_segundos?: number | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_soldagem_linha_problema_id_fkey"
            columns: ["linha_problema_id"]
            isOneToOne: false
            referencedRelation: "linhas_ordens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_soldagem_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_soldagem_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_terceirizacao: {
        Row: {
          capturada_em: string | null
          created_at: string | null
          created_by: string | null
          data_conclusao: string | null
          descricao_produto: string | null
          em_backlog: boolean | null
          historico: boolean | null
          id: string
          numero_ordem: string
          observacoes: string | null
          pedido_id: string | null
          prioridade: number | null
          produto_venda_id: string | null
          quantidade: number | null
          responsavel_id: string | null
          status: string | null
          tempo_conclusao_segundos: number | null
          updated_at: string | null
        }
        Insert: {
          capturada_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          descricao_produto?: string | null
          em_backlog?: boolean | null
          historico?: boolean | null
          id?: string
          numero_ordem: string
          observacoes?: string | null
          pedido_id?: string | null
          prioridade?: number | null
          produto_venda_id?: string | null
          quantidade?: number | null
          responsavel_id?: string | null
          status?: string | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string | null
        }
        Update: {
          capturada_em?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conclusao?: string | null
          descricao_produto?: string | null
          em_backlog?: boolean | null
          historico?: boolean | null
          id?: string
          numero_ordem?: string
          observacoes?: string | null
          pedido_id?: string | null
          prioridade?: number | null
          produto_venda_id?: string | null
          quantidade?: number | null
          responsavel_id?: string | null
          status?: string | null
          tempo_conclusao_segundos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_terceirizacao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_terceirizacao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_terceirizacao_produto_venda_id_fkey"
            columns: ["produto_venda_id"]
            isOneToOne: false
            referencedRelation: "produtos_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiro_tag_assignments: {
        Row: {
          created_at: string
          id: string
          parceiro_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parceiro_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parceiro_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parceiro_tag_assignments_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "autorizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parceiro_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "parceiro_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiro_tags: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedido_comentarios: {
        Row: {
          autor_id: string
          autor_nome: string
          comentario: string
          created_at: string | null
          id: string
          pedido_id: string
        }
        Insert: {
          autor_id: string
          autor_nome: string
          comentario: string
          created_at?: string | null
          id?: string
          pedido_id: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string
          comentario?: string
          created_at?: string | null
          id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_comentarios_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedido_comentarios_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_linhas: {
        Row: {
          altura: number | null
          categoria_linha: string
          check_coleta: boolean | null
          check_qualidade: boolean | null
          check_separacao: boolean | null
          created_at: string | null
          descricao_produto: string | null
          estoque_id: string | null
          id: string
          indice_porta: number | null
          largura: number | null
          nome_produto: string
          ordem: number
          pedido_id: string
          produto_venda_id: string | null
          quantidade: number
          tamanho: string | null
          tipo_ordem: string | null
          updated_at: string | null
        }
        Insert: {
          altura?: number | null
          categoria_linha?: string
          check_coleta?: boolean | null
          check_qualidade?: boolean | null
          check_separacao?: boolean | null
          created_at?: string | null
          descricao_produto?: string | null
          estoque_id?: string | null
          id?: string
          indice_porta?: number | null
          largura?: number | null
          nome_produto: string
          ordem?: number
          pedido_id: string
          produto_venda_id?: string | null
          quantidade?: number
          tamanho?: string | null
          tipo_ordem?: string | null
          updated_at?: string | null
        }
        Update: {
          altura?: number | null
          categoria_linha?: string
          check_coleta?: boolean | null
          check_qualidade?: boolean | null
          check_separacao?: boolean | null
          created_at?: string | null
          descricao_produto?: string | null
          estoque_id?: string | null
          id?: string
          indice_porta?: number | null
          largura?: number | null
          nome_produto?: string
          ordem?: number
          pedido_id?: string
          produto_venda_id?: string | null
          quantidade?: number
          tamanho?: string | null
          tipo_ordem?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_linhas_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_linhas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedido_linhas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_linhas_produto_venda_id_fkey"
            columns: ["produto_venda_id"]
            isOneToOne: false
            referencedRelation: "produtos_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_porta_observacoes: {
        Row: {
          aparencia_testeira: string | null
          cliente_medeu: boolean
          created_at: string
          id: string
          indice_porta: number | null
          interna_externa: string
          lado_motor: string | null
          opcao_guia: string
          opcao_rolo: string
          opcao_tubo: string
          pedido_id: string
          posicao_guia: string
          produto_venda_id: string
          responsavel_medidas_id: string | null
          retirada_porta: boolean
          tipo_responsavel: string | null
          tubo_tiras_frontais: string
          updated_at: string
        }
        Insert: {
          aparencia_testeira?: string | null
          cliente_medeu?: boolean
          created_at?: string
          id?: string
          indice_porta?: number | null
          interna_externa?: string
          lado_motor?: string | null
          opcao_guia?: string
          opcao_rolo?: string
          opcao_tubo?: string
          pedido_id: string
          posicao_guia?: string
          produto_venda_id: string
          responsavel_medidas_id?: string | null
          retirada_porta?: boolean
          tipo_responsavel?: string | null
          tubo_tiras_frontais?: string
          updated_at?: string
        }
        Update: {
          aparencia_testeira?: string | null
          cliente_medeu?: boolean
          created_at?: string
          id?: string
          indice_porta?: number | null
          interna_externa?: string
          lado_motor?: string | null
          opcao_guia?: string
          opcao_rolo?: string
          opcao_tubo?: string
          pedido_id?: string
          posicao_guia?: string
          produto_venda_id?: string
          responsavel_medidas_id?: string | null
          retirada_porta?: boolean
          tipo_responsavel?: string | null
          tubo_tiras_frontais?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_porta_observacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedido_porta_observacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_porta_social_observacoes: {
        Row: {
          acabamento: string | null
          altura_menor_porta: number | null
          altura_painel: number | null
          created_at: string | null
          espessura_parede: number | null
          id: string
          indice_porta: number
          lado_abertura: string | null
          lado_fechadura: string | null
          largura_1: number | null
          largura_2: number | null
          largura_3: number | null
          largura_menor_porta: number | null
          largura_painel: number | null
          pedido_id: string
          produto_venda_id: string
          tem_painel: boolean | null
          updated_at: string | null
        }
        Insert: {
          acabamento?: string | null
          altura_menor_porta?: number | null
          altura_painel?: number | null
          created_at?: string | null
          espessura_parede?: number | null
          id?: string
          indice_porta?: number
          lado_abertura?: string | null
          lado_fechadura?: string | null
          largura_1?: number | null
          largura_2?: number | null
          largura_3?: number | null
          largura_menor_porta?: number | null
          largura_painel?: number | null
          pedido_id: string
          produto_venda_id: string
          tem_painel?: boolean | null
          updated_at?: string | null
        }
        Update: {
          acabamento?: string | null
          altura_menor_porta?: number | null
          altura_painel?: number | null
          created_at?: string | null
          espessura_parede?: number | null
          id?: string
          indice_porta?: number
          lado_abertura?: string | null
          lado_fechadura?: string | null
          largura_1?: number | null
          largura_2?: number | null
          largura_3?: number | null
          largura_menor_porta?: number | null
          largura_painel?: number | null
          pedido_id?: string
          produto_venda_id?: string
          tem_painel?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_porta_social_observacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedido_porta_social_observacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_etapas: {
        Row: {
          checkboxes: Json | null
          created_at: string | null
          data_entrada: string | null
          data_saida: string | null
          etapa: string
          id: string
          pedido_id: string
          tempo_permanencia_segundos: number | null
          updated_at: string | null
        }
        Insert: {
          checkboxes?: Json | null
          created_at?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          etapa: string
          id?: string
          pedido_id: string
          tempo_permanencia_segundos?: number | null
          updated_at?: string | null
        }
        Update: {
          checkboxes?: Json | null
          created_at?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          etapa?: string
          id?: string
          pedido_id?: string
          tempo_permanencia_segundos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_etapas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedidos_etapas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_movimentacoes: {
        Row: {
          created_at: string
          data_hora: string
          descricao: string | null
          etapa_destino: string
          etapa_origem: string | null
          id: string
          pedido_id: string
          teor: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_hora?: string
          descricao?: string | null
          etapa_destino: string
          etapa_origem?: string | null
          id?: string
          pedido_id: string
          teor: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          descricao?: string | null
          etapa_destino?: string
          etapa_origem?: string | null
          id?: string
          pedido_id?: string
          teor?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_movimentacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedidos_movimentacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_pagos_sem_entrega: {
        Row: {
          cidade: string
          cliente: string
          created_at: string | null
          created_by: string | null
          descricao: string | null
          estado: string
          id: string
          portas_g: number
          portas_gg: number
          portas_p: number
          valor_pago: number
        }
        Insert: {
          cidade: string
          cliente: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          estado: string
          id?: string
          portas_g?: number
          portas_gg?: number
          portas_p?: number
          valor_pago?: number
        }
        Update: {
          cidade?: string
          cliente?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          estado?: string
          id?: string
          portas_g?: number
          portas_gg?: number
          portas_p?: number
          valor_pago?: number
        }
        Relationships: []
      }
      pedidos_producao: {
        Row: {
          arquivado: boolean
          arquivado_por: string | null
          aviso_espera: string | null
          aviso_espera_data: string | null
          cliente_bairro: string | null
          cliente_cpf: string | null
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          created_by: string | null
          data_arquivamento: string | null
          data_carregamento: string | null
          data_entrega: string | null
          data_producao: string | null
          em_backlog: boolean | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          etapa_atual: string | null
          etapa_origem_backlog: string | null
          ficha_visita_nome: string | null
          ficha_visita_url: string | null
          forma_pagamento: string | null
          id: string
          is_correcao: boolean | null
          mes_vigencia: string | null
          modalidade_instalacao: string | null
          motivo_backlog: string | null
          numero_mes: number | null
          numero_parcelas: number | null
          numero_pedido: string
          observacoes: string | null
          observacoes_venda: string | null
          orcamento_id: string | null
          ordens_perfiladeira: Json | null
          ordens_pintura: Json | null
          ordens_separacao: Json | null
          ordens_soldagem: Json | null
          pedido_origem_id: string | null
          prioridade_etapa: number | null
          produtos: Json | null
          reprovado_ceo: boolean
          status: string
          status_ordens: Json | null
          status_preenchimento: string | null
          updated_at: string
          valor_entrada: number | null
          valor_frete: number | null
          valor_instalacao: number | null
          valor_venda: number | null
          venda_id: string | null
        }
        Insert: {
          arquivado?: boolean
          arquivado_por?: string | null
          aviso_espera?: string | null
          aviso_espera_data?: string | null
          cliente_bairro?: string | null
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          created_by?: string | null
          data_arquivamento?: string | null
          data_carregamento?: string | null
          data_entrega?: string | null
          data_producao?: string | null
          em_backlog?: boolean | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          etapa_atual?: string | null
          etapa_origem_backlog?: string | null
          ficha_visita_nome?: string | null
          ficha_visita_url?: string | null
          forma_pagamento?: string | null
          id?: string
          is_correcao?: boolean | null
          mes_vigencia?: string | null
          modalidade_instalacao?: string | null
          motivo_backlog?: string | null
          numero_mes?: number | null
          numero_parcelas?: number | null
          numero_pedido: string
          observacoes?: string | null
          observacoes_venda?: string | null
          orcamento_id?: string | null
          ordens_perfiladeira?: Json | null
          ordens_pintura?: Json | null
          ordens_separacao?: Json | null
          ordens_soldagem?: Json | null
          pedido_origem_id?: string | null
          prioridade_etapa?: number | null
          produtos?: Json | null
          reprovado_ceo?: boolean
          status?: string
          status_ordens?: Json | null
          status_preenchimento?: string | null
          updated_at?: string
          valor_entrada?: number | null
          valor_frete?: number | null
          valor_instalacao?: number | null
          valor_venda?: number | null
          venda_id?: string | null
        }
        Update: {
          arquivado?: boolean
          arquivado_por?: string | null
          aviso_espera?: string | null
          aviso_espera_data?: string | null
          cliente_bairro?: string | null
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          created_by?: string | null
          data_arquivamento?: string | null
          data_carregamento?: string | null
          data_entrega?: string | null
          data_producao?: string | null
          em_backlog?: boolean | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          etapa_atual?: string | null
          etapa_origem_backlog?: string | null
          ficha_visita_nome?: string | null
          ficha_visita_url?: string | null
          forma_pagamento?: string | null
          id?: string
          is_correcao?: boolean | null
          mes_vigencia?: string | null
          modalidade_instalacao?: string | null
          motivo_backlog?: string | null
          numero_mes?: number | null
          numero_parcelas?: number | null
          numero_pedido?: string
          observacoes?: string | null
          observacoes_venda?: string | null
          orcamento_id?: string | null
          ordens_perfiladeira?: Json | null
          ordens_pintura?: Json | null
          ordens_separacao?: Json | null
          ordens_soldagem?: Json | null
          pedido_origem_id?: string | null
          prioridade_etapa?: number | null
          produtos?: Json | null
          reprovado_ceo?: boolean
          status?: string
          status_ordens?: Json | null
          status_preenchimento?: string | null
          updated_at?: string
          valor_entrada?: number | null
          valor_frete?: number | null
          valor_instalacao?: number | null
          valor_venda?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_producao_pedido_origem_id_fkey"
            columns: ["pedido_origem_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedidos_producao_pedido_origem_id_fkey"
            columns: ["pedido_origem_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_producao_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pintura_inicios: {
        Row: {
          created_at: string
          id: string
          iniciado_em: string
          iniciado_por: string
          observacoes: string | null
          recarga_realizada: boolean
          recarga_realizada_em: string | null
          recarga_realizada_por: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          iniciado_em?: string
          iniciado_por: string
          observacoes?: string | null
          recarga_realizada?: boolean
          recarga_realizada_em?: string | null
          recarga_realizada_por?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          iniciado_em?: string
          iniciado_por?: string
          observacoes?: string | null
          recarga_realizada?: boolean
          recarga_realizada_em?: string | null
          recarga_realizada_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pintura_inicios_recarga_realizada_por_fkey"
            columns: ["recarga_realizada_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pontuacao_colaboradores: {
        Row: {
          created_at: string | null
          estoque_id: string | null
          id: string
          item_nome: string
          linha_id: string
          metragem_linear: number | null
          metragem_quadrada_pintada: number | null
          ordem_id: string
          pedido_separado: number | null
          pontos_total: number
          porta_soldada: string | null
          quantidade: number
          tipo_ordem: string
          tipo_ranking: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estoque_id?: string | null
          id?: string
          item_nome: string
          linha_id: string
          metragem_linear?: number | null
          metragem_quadrada_pintada?: number | null
          ordem_id: string
          pedido_separado?: number | null
          pontos_total?: number
          porta_soldada?: string | null
          quantidade?: number
          tipo_ordem: string
          tipo_ranking?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estoque_id?: string | null
          id?: string
          item_nome?: string
          linha_id?: string
          metragem_linear?: number | null
          metragem_quadrada_pintada?: number | null
          ordem_id?: string
          pedido_separado?: number | null
          pontos_total?: number
          porta_soldada?: string | null
          quantidade?: number
          tipo_ordem?: string
          tipo_ranking?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontuacao_colaboradores_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontuacao_colaboradores_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: true
            referencedRelation: "linhas_ordens"
            referencedColumns: ["id"]
          },
        ]
      }
      postagens: {
        Row: {
          agendada: boolean | null
          comentarios: number | null
          created_at: string | null
          created_by: string | null
          curtidas: number | null
          data_postagem: string
          descricao: string | null
          hora_agendamento: string | null
          id: string
          link_post: string | null
          plataforma: string | null
          postada: boolean | null
          thumbnail_url: string | null
          titulo: string
          updated_at: string | null
          visualizacoes: number | null
        }
        Insert: {
          agendada?: boolean | null
          comentarios?: number | null
          created_at?: string | null
          created_by?: string | null
          curtidas?: number | null
          data_postagem: string
          descricao?: string | null
          hora_agendamento?: string | null
          id?: string
          link_post?: string | null
          plataforma?: string | null
          postada?: boolean | null
          thumbnail_url?: string | null
          titulo: string
          updated_at?: string | null
          visualizacoes?: number | null
        }
        Update: {
          agendada?: boolean | null
          comentarios?: number | null
          created_at?: string | null
          created_by?: string | null
          curtidas?: number | null
          data_postagem?: string
          descricao?: string | null
          hora_agendamento?: string | null
          id?: string
          link_post?: string | null
          plataforma?: string | null
          postada?: boolean | null
          thumbnail_url?: string | null
          titulo?: string
          updated_at?: string | null
          visualizacoes?: number | null
        }
        Relationships: []
      }
      produtos_vendas: {
        Row: {
          acessorio_id: string | null
          adicional_id: string | null
          altura: number | null
          cor_id: string | null
          created_at: string | null
          custo_pintura: number | null
          custo_producao: number | null
          custo_produto: number | null
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string | null
          faturamento: boolean | null
          id: string
          largura: number | null
          lucro_item: number | null
          lucro_pintura: number | null
          lucro_produto: number | null
          margem_pintura: number | null
          margem_produto: number | null
          observacao_item: string | null
          pedido_correcao_id: string | null
          percentual_credito: number | null
          quantidade: number | null
          tamanho: string
          tipo_desconto: string | null
          tipo_fabricacao: string | null
          tipo_pintura: string | null
          tipo_produto: string
          updated_at: string | null
          valor_credito: number | null
          valor_frete: number
          valor_instalacao: number
          valor_pintura: number
          valor_produto: number
          valor_total: number
          valor_total_sem_frete: number
          venda_id: string
          vendas_catalogo_id: string | null
        }
        Insert: {
          acessorio_id?: string | null
          adicional_id?: string | null
          altura?: number | null
          cor_id?: string | null
          created_at?: string | null
          custo_pintura?: number | null
          custo_producao?: number | null
          custo_produto?: number | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          faturamento?: boolean | null
          id?: string
          largura?: number | null
          lucro_item?: number | null
          lucro_pintura?: number | null
          lucro_produto?: number | null
          margem_pintura?: number | null
          margem_produto?: number | null
          observacao_item?: string | null
          pedido_correcao_id?: string | null
          percentual_credito?: number | null
          quantidade?: number | null
          tamanho: string
          tipo_desconto?: string | null
          tipo_fabricacao?: string | null
          tipo_pintura?: string | null
          tipo_produto?: string
          updated_at?: string | null
          valor_credito?: number | null
          valor_frete?: number
          valor_instalacao?: number
          valor_pintura?: number
          valor_produto?: number
          valor_total?: number
          valor_total_sem_frete?: number
          venda_id: string
          vendas_catalogo_id?: string | null
        }
        Update: {
          acessorio_id?: string | null
          adicional_id?: string | null
          altura?: number | null
          cor_id?: string | null
          created_at?: string | null
          custo_pintura?: number | null
          custo_producao?: number | null
          custo_produto?: number | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          faturamento?: boolean | null
          id?: string
          largura?: number | null
          lucro_item?: number | null
          lucro_pintura?: number | null
          lucro_produto?: number | null
          margem_pintura?: number | null
          margem_produto?: number | null
          observacao_item?: string | null
          pedido_correcao_id?: string | null
          percentual_credito?: number | null
          quantidade?: number | null
          tamanho?: string
          tipo_desconto?: string | null
          tipo_fabricacao?: string | null
          tipo_pintura?: string | null
          tipo_produto?: string
          updated_at?: string | null
          valor_credito?: number | null
          valor_frete?: number
          valor_instalacao?: number
          valor_pintura?: number
          valor_produto?: number
          valor_total?: number
          valor_total_sem_frete?: number
          venda_id?: string
          vendas_catalogo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portas_vendas_acessorio_id_fkey"
            columns: ["acessorio_id"]
            isOneToOne: false
            referencedRelation: "acessorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portas_vendas_adicional_id_fkey"
            columns: ["adicional_id"]
            isOneToOne: false
            referencedRelation: "adicionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portas_vendas_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "catalogo_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portas_vendas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_vendas_pedido_correcao_id_fkey"
            columns: ["pedido_correcao_id"]
            isOneToOne: false
            referencedRelation: "pedidos_backlog_ativo"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "produtos_vendas_pedido_correcao_id_fkey"
            columns: ["pedido_correcao_id"]
            isOneToOne: false
            referencedRelation: "pedidos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_vendas_vendas_catalogo_id_fkey"
            columns: ["vendas_catalogo_id"]
            isOneToOne: false
            referencedRelation: "vendas_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_vendas_backup_pre_split_instalacao: {
        Row: {
          acessorio_id: string | null
          adicional_id: string | null
          altura: number | null
          cor_id: string | null
          created_at: string | null
          custo_pintura: number | null
          custo_producao: number | null
          custo_produto: number | null
          desconto_percentual: number | null
          desconto_valor: number | null
          descricao: string | null
          faturamento: boolean | null
          id: string | null
          largura: number | null
          lucro_item: number | null
          lucro_pintura: number | null
          lucro_produto: number | null
          margem_pintura: number | null
          margem_produto: number | null
          pedido_correcao_id: string | null
          percentual_credito: number | null
          quantidade: number | null
          tamanho: string | null
          tipo_desconto: string | null
          tipo_fabricacao: string | null
          tipo_pintura: string | null
          tipo_produto: string | null
          updated_at: string | null
          valor_credito: number | null
          valor_frete: number | null
          valor_instalacao: number | null
          valor_pintura: number | null
          valor_produto: number | null
          valor_total: number | null
          valor_total_sem_frete: number | null
          venda_id: string | null
          vendas_catalogo_id: string | null
        }
        Insert: {
          acessorio_id?: string | null
          adicional_id?: string | null
          altura?: number | null
          cor_id?: string | null
          created_at?: string | null
          custo_pintura?: number | null
          custo_producao?: number | null
          custo_produto?: number | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          faturamento?: boolean | null
          id?: string | null
          largura?: number | null
          lucro_item?: number | null
          lucro_pintura?: number | null
          lucro_produto?: number | null
          margem_pintura?: number | null
          margem_produto?: number | null
          pedido_correcao_id?: string | null
          percentual_credito?: number | null
          quantidade?: number | null
          tamanho?: string | null
          tipo_desconto?: string | null
          tipo_fabricacao?: string | null
          tipo_pintura?: string | null
          tipo_produto?: string | null
          updated_at?: string | null
          valor_credito?: number | null
          valor_frete?: number | null
          valor_instalacao?: number | null
          valor_pintura?: number | null
          valor_produto?: number | null
          valor_total?: number | null
          valor_total_sem_frete?: number | null
          venda_id?: string | null
          vendas_catalogo_id?: string | null
        }
        Update: {
          acessorio_id?: string | null
          adicional_id?: string | null
          altura?: number | null
          cor_id?: string | null
          created_at?: string | null
          custo_pintura?: number | null
          custo_producao?: number | null
          custo_produto?: number | null
          desconto_percentual?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          faturamento?: boolean | null
          id?: string | null
          largura?: number | null
          lucro_item?: number | null
          lucro_pintura?: number | null
          lucro_produto?: number | null
          margem_pintura?: number | null
          margem_produto?: number | null
          pedido_correcao_id?: string | null
          percentual_credito?: number | null
          quantidade?: number | null
          tamanho?: string | null
          tipo_desconto?: string | null
          tipo_fabricacao?: string | null
          tipo_pintura?: string | null
          tipo_produto?: string | null
          updated_at?: string | null
          valor_credito?: number | null
          valor_frete?: number | null
          valor_instalacao?: number | null
          valor_pintura?: number | null
          valor_produto?: number | null
          valor_total?: number | null
          valor_total_sem_frete?: number | null
          venda_id?: string | null
          vendas_catalogo_id?: string | null
        }
        Relationships: []
      }
      regras_etiquetas: {
        Row: {
          ativo: boolean | null
          campo_condicao: string | null
          condicao_tipo: string | null
          condicao_valor: number | null
          created_at: string | null
          divisor: number
          estoque_id: string | null
          id: string
          nome_regra: string
          prioridade: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          campo_condicao?: string | null
          condicao_tipo?: string | null
          condicao_valor?: number | null
          created_at?: string | null
          divisor?: number
          estoque_id?: string | null
          id?: string
          nome_regra: string
          prioridade?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          campo_condicao?: string | null
          condicao_tipo?: string | null
          condicao_valor?: number | null
          created_at?: string | null
          divisor?: number
          estoque_id?: string | null
          id?: string
          nome_regra?: string
          prioridade?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_etiquetas_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      representantes: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          foto_perfil_url: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          foto_perfil_url?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          foto_perfil_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requisicoes_aprovacao_venda: {
        Row: {
          aprovado_por: string | null
          created_at: string
          dados_credito: Json | null
          dados_pagamento: Json | null
          dados_produtos: Json
          dados_venda: Json
          id: string
          observacoes: string | null
          percentual_desconto: number
          solicitante_id: string
          status: string
          tipo_autorizacao: string
          updated_at: string
          venda_id: string | null
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          dados_credito?: Json | null
          dados_pagamento?: Json | null
          dados_produtos: Json
          dados_venda: Json
          id?: string
          observacoes?: string | null
          percentual_desconto: number
          solicitante_id: string
          status?: string
          tipo_autorizacao: string
          updated_at?: string
          venda_id?: string | null
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          dados_credito?: Json | null
          dados_pagamento?: Json | null
          dados_produtos?: Json
          dados_venda?: Json
          id?: string
          observacoes?: string | null
          percentual_desconto?: number
          solicitante_id?: string
          status?: string
          tipo_autorizacao?: string
          updated_at?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_aprovacao_venda_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisicoes_aprovacao_venda_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requisicoes_aprovacao_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes_compra: {
        Row: {
          aprovado_por: string | null
          created_at: string
          created_by: string | null
          data_aprovacao: string | null
          data_necessidade: string | null
          fornecedor_id: string | null
          id: string
          motivo_rejeicao: string | null
          numero_requisicao: string
          observacoes: string | null
          solicitante_id: string | null
          status: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          data_necessidade?: string | null
          fornecedor_id?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero_requisicao: string
          observacoes?: string | null
          solicitante_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          data_necessidade?: string | null
          fornecedor_id?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero_requisicao?: string
          observacoes?: string | null
          solicitante_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes_compra_itens: {
        Row: {
          codigo_fornecedor: string | null
          created_at: string
          id: string
          ipi_percent: number
          localizacao: string | null
          observacoes: string | null
          preco_total: number | null
          preco_unitario: number | null
          produto_id: string
          quantidade: number
          requisicao_id: string
          valor_unitario: number
        }
        Insert: {
          codigo_fornecedor?: string | null
          created_at?: string
          id?: string
          ipi_percent?: number
          localizacao?: string | null
          observacoes?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          produto_id: string
          quantidade: number
          requisicao_id: string
          valor_unitario?: number
        }
        Update: {
          codigo_fornecedor?: string | null
          created_at?: string
          id?: string
          ipi_percent?: number
          localizacao?: string | null
          observacoes?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          produto_id?: string
          quantidade?: number
          requisicao_id?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_compra_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes_parceria: {
        Row: {
          cidade: string
          cpf_cnpj: string
          created_at: string
          descricao_motivo: string
          estado: string
          id: string
          nome_completo: string
          status: string
          telefone: string
          tipo_parceria: Database["public"]["Enums"]["tipo_parceria"]
          updated_at: string
        }
        Insert: {
          cidade: string
          cpf_cnpj: string
          created_at?: string
          descricao_motivo: string
          estado: string
          id?: string
          nome_completo: string
          status?: string
          telefone: string
          tipo_parceria: Database["public"]["Enums"]["tipo_parceria"]
          updated_at?: string
        }
        Update: {
          cidade?: string
          cpf_cnpj?: string
          created_at?: string
          descricao_motivo?: string
          estado?: string
          id?: string
          nome_completo?: string
          status?: string
          telefone?: string
          tipo_parceria?: Database["public"]["Enums"]["tipo_parceria"]
          updated_at?: string
        }
        Relationships: []
      }
      setores_lideres: {
        Row: {
          atribuido_por: string
          created_at: string
          id: string
          lider_id: string
          setor: string
          updated_at: string
        }
        Insert: {
          atribuido_por: string
          created_at?: string
          id?: string
          lider_id: string
          setor: string
          updated_at?: string
        }
        Update: {
          atribuido_por?: string
          created_at?: string
          id?: string
          lider_id?: string
          setor?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_mudanca_cadastro: {
        Row: {
          aprovador_id: string | null
          colaborador_id: string
          cpf_atual: string | null
          cpf_novo: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_nascimento_atual: string | null
          data_nascimento_novo: string | null
          email_atual: string | null
          email_novo: string | null
          id: string
          motivo: string | null
          nome_atual: string | null
          nome_novo: string | null
          observacoes_aprovacao: string | null
          role_atual: string | null
          role_novo: string | null
          salario_atual: number | null
          salario_novo: number | null
          setor_atual: string | null
          setor_novo: string | null
          solicitante_id: string
          status: string
          telefone_atual: string | null
          telefone_novo: string | null
          updated_at: string | null
        }
        Insert: {
          aprovador_id?: string | null
          colaborador_id: string
          cpf_atual?: string | null
          cpf_novo?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_nascimento_atual?: string | null
          data_nascimento_novo?: string | null
          email_atual?: string | null
          email_novo?: string | null
          id?: string
          motivo?: string | null
          nome_atual?: string | null
          nome_novo?: string | null
          observacoes_aprovacao?: string | null
          role_atual?: string | null
          role_novo?: string | null
          salario_atual?: number | null
          salario_novo?: number | null
          setor_atual?: string | null
          setor_novo?: string | null
          solicitante_id: string
          status?: string
          telefone_atual?: string | null
          telefone_novo?: string | null
          updated_at?: string | null
        }
        Update: {
          aprovador_id?: string | null
          colaborador_id?: string
          cpf_atual?: string | null
          cpf_novo?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_nascimento_atual?: string | null
          data_nascimento_novo?: string | null
          email_atual?: string | null
          email_novo?: string | null
          id?: string
          motivo?: string | null
          nome_atual?: string | null
          nome_novo?: string | null
          observacoes_aprovacao?: string | null
          role_atual?: string | null
          role_novo?: string | null
          salario_atual?: number | null
          salario_novo?: number | null
          setor_atual?: string | null
          setor_novo?: string | null
          solicitante_id?: string
          status?: string
          telefone_atual?: string | null
          telefone_novo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_mudanca_cadastro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      suporte_tickets: {
        Row: {
          assunto: string
          created_at: string
          email: string
          id: string
          mensagem: string
          nome: string
          status: Database["public"]["Enums"]["suporte_status"]
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assunto: string
          created_at?: string
          email: string
          id?: string
          mensagem: string
          nome: string
          status?: Database["public"]["Enums"]["suporte_status"]
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assunto?: string
          created_at?: string
          email?: string
          id?: string
          mensagem?: string
          nome?: string
          status?: Database["public"]["Enums"]["suporte_status"]
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_roles: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          key: string
          label: string
          ordem: number
          setor: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          key: string
          label: string
          ordem?: number
          setor?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          key?: string
          label?: string
          ordem?: number
          setor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tabela_precos_montagem_template: {
        Row: {
          created_at: string
          custo_item_id: string
          id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_item_id: string
          id?: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_item_id?: string
          id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabela_precos_montagem_template_custo_item_id_fkey"
            columns: ["custo_item_id"]
            isOneToOne: true
            referencedRelation: "custos_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_precos_portas: {
        Row: {
          altura: number
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          largura: number
          lucro: number | null
          ordem: number | null
          updated_at: string
          valor_instalacao: number
          valor_pintura: number
          valor_porta: number
        }
        Insert: {
          altura: number
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          largura: number
          lucro?: number | null
          ordem?: number | null
          updated_at?: string
          valor_instalacao?: number
          valor_pintura?: number
          valor_porta?: number
        }
        Update: {
          altura?: number
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          largura?: number
          lucro?: number | null
          ordem?: number | null
          updated_at?: string
          valor_instalacao?: number
          valor_pintura?: number
          valor_porta?: number
        }
        Relationships: []
      }
      tabela_precos_portas_montagem: {
        Row: {
          created_at: string
          custo_item_id: string
          id: string
          kit_id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_item_id: string
          id?: string
          kit_id: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_item_id?: string
          id?: string
          kit_id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabela_precos_portas_montagem_custo_item_id_fkey"
            columns: ["custo_item_id"]
            isOneToOne: false
            referencedRelation: "custos_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabela_precos_portas_montagem_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "tabela_precos_portas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          created_at: string
          created_by: string
          data_referencia: string | null
          descricao: string
          dia_recorrencia: number | null
          id: string
          recorrente: boolean
          responsavel_id: string
          setor: string | null
          status: Database["public"]["Enums"]["tarefa_status"]
          template_id: string | null
          tipo_recorrencia: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_referencia?: string | null
          descricao: string
          dia_recorrencia?: number | null
          id?: string
          recorrente?: boolean
          responsavel_id: string
          setor?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          template_id?: string | null
          tipo_recorrencia?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_referencia?: string | null
          descricao?: string
          dia_recorrencia?: number | null
          id?: string
          recorrente?: boolean
          responsavel_id?: string
          setor?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          template_id?: string | null
          tipo_recorrencia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarefas_historico: {
        Row: {
          concluida_por: string
          created_at: string
          data_conclusao: string
          id: string
          tarefa_id: string
          template_id: string
        }
        Insert: {
          concluida_por: string
          created_at?: string
          data_conclusao: string
          id?: string
          tarefa_id: string
          template_id: string
        }
        Update: {
          concluida_por?: string
          created_at?: string
          data_conclusao?: string
          id?: string
          tarefa_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_historico_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tarefas_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_templates: {
        Row: {
          ativa: boolean
          created_at: string
          created_by: string
          data_proxima_criacao: string
          descricao: string
          dias_semana: number[] | null
          hora_criacao: string | null
          id: string
          responsavel_id: string
          setor: string | null
          tipo_recorrencia: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          created_by: string
          data_proxima_criacao: string
          descricao: string
          dias_semana?: number[] | null
          hora_criacao?: string | null
          id?: string
          responsavel_id: string
          setor?: string | null
          tipo_recorrencia: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          created_by?: string
          data_proxima_criacao?: string
          descricao?: string
          dias_semana?: number[] | null
          hora_criacao?: string | null
          id?: string
          responsavel_id?: string
          setor?: string | null
          tipo_recorrencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_custos: {
        Row: {
          aparece_no_dre: boolean
          ativo: boolean
          categoria_id: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          subcategoria_id: string | null
          tipo: string | null
          updated_at: string | null
          valor_maximo_mensal: number
        }
        Insert: {
          aparece_no_dre?: boolean
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          subcategoria_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_maximo_mensal?: number
        }
        Update: {
          aparece_no_dre?: boolean
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          subcategoria_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_maximo_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "tipos_custos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "custos_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_custos_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "custos_subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      transportadoras: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_route_access: {
        Row: {
          can_access: boolean | null
          created_at: string | null
          id: string
          route_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          route_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          route_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_route_access_route_key_fkey"
            columns: ["route_key"]
            isOneToOne: false
            referencedRelation: "app_routes"
            referencedColumns: ["key"]
          },
        ]
      }
      vagas: {
        Row: {
          cargo: string
          created_at: string | null
          created_by: string | null
          id: string
          justificativa: string
          preenchida_por: string | null
          status: Database["public"]["Enums"]["status_vaga"]
          updated_at: string | null
        }
        Insert: {
          cargo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          justificativa: string
          preenchida_por?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          updated_at?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          justificativa?: string
          preenchida_por?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vagas_preenchida_por_fkey"
            columns: ["preenchida_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number
          ativo: boolean
          aviso_data: string | null
          aviso_justificativa: string | null
          created_at: string
          created_by: string | null
          data_proxima_troca_oleo: string | null
          data_troca_oleo: string | null
          documento_nome: string | null
          documento_url: string | null
          foto_url: string | null
          id: string
          km_atual: number
          km_proxima_troca_oleo: number | null
          mecanico: string | null
          modelo: string
          motorista: string | null
          nome: string
          ordem: number | null
          placa: string | null
          responsavel: string | null
          status: string
          tipo_frota: string
          updated_at: string
        }
        Insert: {
          ano: number
          ativo?: boolean
          aviso_data?: string | null
          aviso_justificativa?: string | null
          created_at?: string
          created_by?: string | null
          data_proxima_troca_oleo?: string | null
          data_troca_oleo?: string | null
          documento_nome?: string | null
          documento_url?: string | null
          foto_url?: string | null
          id?: string
          km_atual?: number
          km_proxima_troca_oleo?: number | null
          mecanico?: string | null
          modelo: string
          motorista?: string | null
          nome: string
          ordem?: number | null
          placa?: string | null
          responsavel?: string | null
          status?: string
          tipo_frota?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          ativo?: boolean
          aviso_data?: string | null
          aviso_justificativa?: string | null
          created_at?: string
          created_by?: string | null
          data_proxima_troca_oleo?: string | null
          data_troca_oleo?: string | null
          documento_nome?: string | null
          documento_url?: string | null
          foto_url?: string | null
          id?: string
          km_atual?: number
          km_proxima_troca_oleo?: number | null
          mecanico?: string | null
          modelo?: string
          motorista?: string | null
          nome?: string
          ordem?: number | null
          placa?: string | null
          responsavel?: string | null
          status?: string
          tipo_frota?: string
          updated_at?: string
        }
        Relationships: []
      }
      veiculos_arquivos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tamanho: number | null
          tipo: string | null
          uploaded_by: string | null
          url: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
          url: string
          veiculo_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
          url?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_arquivos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_conferencias: {
        Row: {
          agua_conferida: boolean
          conferido_por: string
          created_at: string
          data_troca_oleo: string | null
          foto_url: string
          id: string
          km_atual: number
          nivel_oleo_conferido: boolean
          observacoes: string | null
          status: string
          veiculo_id: string
        }
        Insert: {
          agua_conferida?: boolean
          conferido_por: string
          created_at?: string
          data_troca_oleo?: string | null
          foto_url: string
          id?: string
          km_atual: number
          nivel_oleo_conferido?: boolean
          observacoes?: string | null
          status: string
          veiculo_id: string
        }
        Update: {
          agua_conferida?: boolean
          conferido_por?: string
          created_at?: string
          data_troca_oleo?: string | null
          foto_url?: string
          id?: string
          km_atual?: number
          nivel_oleo_conferido?: boolean
          observacoes?: string | null
          status?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_conferencias_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_km_historico: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          km_anterior: number
          km_novo: number
          origem: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          km_anterior: number
          km_novo: number
          origem?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          km_anterior?: number
          km_novo?: number
          origem?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_km_historico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      venda_comentarios: {
        Row: {
          autor_id: string
          autor_nome: string
          comentario: string
          created_at: string | null
          id: string
          venda_id: string
        }
        Insert: {
          autor_id: string
          autor_nome: string
          comentario: string
          created_at?: string | null
          id?: string
          venda_id: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string
          comentario?: string
          created_at?: string | null
          id?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_comentarios_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          atendente_id: string
          bairro: string | null
          canal_aquisicao_id: string | null
          cep: string | null
          cidade: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          comprovante_nome: string | null
          comprovante_url: string | null
          contrato_anexado_por: string | null
          contrato_assinado_em: string | null
          contrato_dispensado: boolean
          contrato_dispensado_em: string | null
          contrato_dispensado_por: string | null
          contrato_url: string | null
          cpf_cliente: string | null
          created_at: string
          custo_instalacao: number | null
          custo_total: number | null
          data_prevista_entrega: string | null
          data_venda: string
          empresa_receptora_id: string | null
          estado: string | null
          forma_pagamento: string | null
          frete_aprovado: boolean
          id: string
          instalacao_faturada: boolean | null
          intervalo_boletos: number | null
          is_rascunho: boolean
          justificativa_nao_faturada: string | null
          lucro_instalacao: number | null
          lucro_total: number | null
          metodo_pagamento: string | null
          numero_parcelas: number | null
          observacoes_venda: string | null
          pagamento_na_entrega: boolean | null
          pago_na_instalacao: boolean | null
          parcelas_dinheiro: number | null
          parcelas_geradas: boolean | null
          pedido_dispensado: boolean
          percentual_credito: number | null
          publico_alvo: string | null
          quantidade_parcelas: number | null
          restante_na_instalacao: boolean | null
          status_aprovacao: string
          tipo_entrega: string | null
          updated_at: string
          valor_a_receber: number | null
          valor_a_receber_faturamento: boolean
          valor_a_receber_texto: string | null
          valor_credito: number | null
          valor_entrada: number | null
          valor_entrada_dinheiro: number | null
          valor_frete: number | null
          valor_instalacao: number | null
          valor_venda: number | null
          venda_presencial: boolean
        }
        Insert: {
          atendente_id: string
          bairro?: string | null
          canal_aquisicao_id?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          comprovante_nome?: string | null
          comprovante_url?: string | null
          contrato_anexado_por?: string | null
          contrato_assinado_em?: string | null
          contrato_dispensado?: boolean
          contrato_dispensado_em?: string | null
          contrato_dispensado_por?: string | null
          contrato_url?: string | null
          cpf_cliente?: string | null
          created_at?: string
          custo_instalacao?: number | null
          custo_total?: number | null
          data_prevista_entrega?: string | null
          data_venda?: string
          empresa_receptora_id?: string | null
          estado?: string | null
          forma_pagamento?: string | null
          frete_aprovado?: boolean
          id?: string
          instalacao_faturada?: boolean | null
          intervalo_boletos?: number | null
          is_rascunho?: boolean
          justificativa_nao_faturada?: string | null
          lucro_instalacao?: number | null
          lucro_total?: number | null
          metodo_pagamento?: string | null
          numero_parcelas?: number | null
          observacoes_venda?: string | null
          pagamento_na_entrega?: boolean | null
          pago_na_instalacao?: boolean | null
          parcelas_dinheiro?: number | null
          parcelas_geradas?: boolean | null
          pedido_dispensado?: boolean
          percentual_credito?: number | null
          publico_alvo?: string | null
          quantidade_parcelas?: number | null
          restante_na_instalacao?: boolean | null
          status_aprovacao?: string
          tipo_entrega?: string | null
          updated_at?: string
          valor_a_receber?: number | null
          valor_a_receber_faturamento?: boolean
          valor_a_receber_texto?: string | null
          valor_credito?: number | null
          valor_entrada?: number | null
          valor_entrada_dinheiro?: number | null
          valor_frete?: number | null
          valor_instalacao?: number | null
          valor_venda?: number | null
          venda_presencial?: boolean
        }
        Update: {
          atendente_id?: string
          bairro?: string | null
          canal_aquisicao_id?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          comprovante_nome?: string | null
          comprovante_url?: string | null
          contrato_anexado_por?: string | null
          contrato_assinado_em?: string | null
          contrato_dispensado?: boolean
          contrato_dispensado_em?: string | null
          contrato_dispensado_por?: string | null
          contrato_url?: string | null
          cpf_cliente?: string | null
          created_at?: string
          custo_instalacao?: number | null
          custo_total?: number | null
          data_prevista_entrega?: string | null
          data_venda?: string
          empresa_receptora_id?: string | null
          estado?: string | null
          forma_pagamento?: string | null
          frete_aprovado?: boolean
          id?: string
          instalacao_faturada?: boolean | null
          intervalo_boletos?: number | null
          is_rascunho?: boolean
          justificativa_nao_faturada?: string | null
          lucro_instalacao?: number | null
          lucro_total?: number | null
          metodo_pagamento?: string | null
          numero_parcelas?: number | null
          observacoes_venda?: string | null
          pagamento_na_entrega?: boolean | null
          pago_na_instalacao?: boolean | null
          parcelas_dinheiro?: number | null
          parcelas_geradas?: boolean | null
          pedido_dispensado?: boolean
          percentual_credito?: number | null
          publico_alvo?: string | null
          quantidade_parcelas?: number | null
          restante_na_instalacao?: boolean | null
          status_aprovacao?: string
          tipo_entrega?: string | null
          updated_at?: string
          valor_a_receber?: number | null
          valor_a_receber_faturamento?: boolean
          valor_a_receber_texto?: string | null
          valor_credito?: number | null
          valor_entrada?: number | null
          valor_entrada_dinheiro?: number | null
          valor_frete?: number | null
          valor_instalacao?: number | null
          valor_venda?: number | null
          venda_presencial?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendas_atendente"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_canal_aquisicao_id_fkey"
            columns: ["canal_aquisicao_id"]
            isOneToOne: false
            referencedRelation: "canais_aquisicao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_receptora_id_fkey"
            columns: ["empresa_receptora_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_autorizacoes_desconto: {
        Row: {
          autorizado_por: string
          created_at: string
          id: string
          observacoes: string | null
          percentual_desconto: number
          senha_usada: string
          solicitado_por: string
          tipo_autorizacao: Database["public"]["Enums"]["tipo_autorizacao_desconto"]
          venda_id: string
        }
        Insert: {
          autorizado_por: string
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual_desconto: number
          senha_usada: string
          solicitado_por: string
          tipo_autorizacao: Database["public"]["Enums"]["tipo_autorizacao_desconto"]
          venda_id: string
        }
        Update: {
          autorizado_por?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual_desconto?: number
          senha_usada?: string
          solicitado_por?: string
          tipo_autorizacao?: Database["public"]["Enums"]["tipo_autorizacao_desconto"]
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_autorizacoes_desconto_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_autorizacoes_desconto_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_autorizacoes_desconto_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_catalogo: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          created_by: string | null
          custo_ok: boolean
          custo_produto: number | null
          descricao_produto: string | null
          destaque: boolean | null
          estoque_minimo: number | null
          id: string
          imagem_url: string | null
          nome_produto: string
          ordem: number
          peso: number | null
          preco_objetivo: number | null
          preco_venda: number
          quantidade: number
          sku: string | null
          subcategoria_id: string | null
          tags: string[] | null
          tipo_fabricacao: string | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          custo_ok?: boolean
          custo_produto?: number | null
          descricao_produto?: string | null
          destaque?: boolean | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          nome_produto: string
          ordem?: number
          peso?: number | null
          preco_objetivo?: number | null
          preco_venda?: number
          quantidade?: number
          sku?: string | null
          subcategoria_id?: string | null
          tags?: string[] | null
          tipo_fabricacao?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          custo_ok?: boolean
          custo_produto?: number | null
          descricao_produto?: string | null
          destaque?: boolean | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          nome_produto?: string
          ordem?: number
          peso?: number | null
          preco_objetivo?: number | null
          preco_venda?: number
          quantidade?: number
          sku?: string | null
          subcategoria_id?: string | null
          tags?: string[] | null
          tipo_fabricacao?: string | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_catalogo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_catalogo_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "estoque_subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_catalogo_categorias_ordem: {
        Row: {
          categoria: string
          created_at: string
          id: string
          ordem: number
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      visitas_tecnicas: {
        Row: {
          created_at: string
          created_by: string
          data_visita: string
          id: string
          lead_id: string
          observacoes: string | null
          responsavel_id: string
          status: Database["public"]["Enums"]["status_visita"]
          turno: Database["public"]["Enums"]["turno_visita"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_visita: string
          id?: string
          lead_id: string
          observacoes?: string | null
          responsavel_id: string
          status?: Database["public"]["Enums"]["status_visita"]
          turno: Database["public"]["Enums"]["turno_visita"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_visita?: string
          id?: string
          lead_id?: string
          observacoes?: string | null
          responsavel_id?: string
          status?: Database["public"]["Enums"]["status_visita"]
          turno?: Database["public"]["Enums"]["turno_visita"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitas_tecnicas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "elisaportas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contador: {
        Row: {
          id: string
          ultimo_indice: number
          updated_at: string
        }
        Insert: {
          id?: string
          ultimo_indice?: number
          updated_at?: string
        }
        Update: {
          id?: string
          ultimo_indice?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_distribuicao: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          numero_telefone: string
          ordem: number
          total_cliques: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          numero_telefone: string
          ordem: number
          total_cliques?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          numero_telefone?: string
          ordem?: number
          total_cliques?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_distribuicao_controle: {
        Row: {
          created_at: string | null
          id: string
          ultima_atendente_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ultima_atendente_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ultima_atendente_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_roulette_clicks: {
        Row: {
          atendente_id: string | null
          atendente_nome: string
          atendente_telefone: string | null
          created_at: string
          fbclid: string | null
          gclid: string | null
          id: string
          ip: string | null
          page_url: string | null
          referrer: string | null
          source: string | null
          traffic_channel: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          atendente_id?: string | null
          atendente_nome: string
          atendente_telefone?: string | null
          created_at?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: string | null
          page_url?: string | null
          referrer?: string | null
          source?: string | null
          traffic_channel?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          atendente_id?: string | null
          atendente_nome?: string
          atendente_telefone?: string | null
          created_at?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: string | null
          page_url?: string | null
          referrer?: string | null
          source?: string | null
          traffic_channel?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_roulette_clicks_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pedidos_backlog_ativo: {
        Row: {
          data_backlog: string | null
          etapa_atual: string | null
          etapa_origem_backlog: string | null
          motivo_backlog: string | null
          numero_pedido: string | null
          pedido_id: string | null
          usuario_backlog: string | null
          usuario_nome: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_database_storage: {
        Args: never
        Returns: {
          size_bytes: number
          size_pretty: string
          table_name: string
        }[]
      }
      aprovar_orcamento:
        | {
            Args: {
              desconto_adicional?: number
              observacoes?: string
              orcamento_uuid: string
            }
            Returns: boolean
          }
        | {
            Args: {
              desconto_adicional?: number
              observacoes?: string
              orcamento_uuid: string
              tipo_desconto?: string
            }
            Returns: boolean
          }
      calcular_classe_orcamento: {
        Args: { valor_total: number }
        Returns: number
      }
      calcular_segundos_uteis: {
        Args: { p_fim: string; p_inicio: string }
        Returns: number
      }
      calcular_valor_produto_orcamento: {
        Args: { orcamento_uuid: string }
        Returns: number
      }
      can_manage_permissions: { Args: { _user_id: string }; Returns: boolean }
      can_view_all_admin_users: { Args: never; Returns: boolean }
      concluir_carregamento_e_avancar_pedido: {
        Args: { p_ordem_carregamento_id: string }
        Returns: undefined
      }
      concluir_carregamento_instalacao: {
        Args: { p_instalacao_id: string }
        Returns: undefined
      }
      concluir_instalacao_e_avancar_pedido: {
        Args: { p_instalacao_id: string }
        Returns: Json
      }
      concluir_ordem_administrativa: {
        Args: {
          p_ordem_id: string
          p_tempo_segundos?: number
          p_tipo_ordem: string
        }
        Returns: Json
      }
      concluir_ordem_carregamento: {
        Args: { p_ordem_id: string }
        Returns: undefined
      }
      count_base64_images: {
        Args: never
        Returns: {
          base64_count: number
          table_name: string
        }[]
      }
      create_storage_policies: {
        Args: { bucket_name: string }
        Returns: undefined
      }
      criar_ordem_embalagem: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      criar_ordem_pintura: { Args: { p_pedido_id: string }; Returns: undefined }
      criar_ordem_qualidade: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      criar_ordens_producao_automaticas:
        | { Args: { p_pedido_id: string }; Returns: undefined }
        | {
            Args: { p_pedido_id: string; p_pedido_numero: string }
            Returns: undefined
          }
      criar_requisicao_venda: {
        Args: { orcamento_uuid: string }
        Returns: string
      }
      deletar_pedido_completo: {
        Args: { p_pedido_id: string }
        Returns: boolean
      }
      delete_venda_completa: {
        Args: { p_venda_id: string }
        Returns: undefined
      }
      excluir_pedido_em_aberto: {
        Args: { pedido_uuid: string }
        Returns: boolean
      }
      gerar_numero_ordem:
        | { Args: { tipo_ordem: string }; Returns: string }
        | {
            Args: { pedido_numero: string; tipo_ordem: string }
            Returns: string
          }
      gerar_numero_requisicao: { Args: never; Returns: string }
      gerar_proximo_numero: {
        Args: { tipo_documento: string }
        Returns: number
      }
      gerar_proximo_numero_mes: {
        Args: never
        Returns: {
          mes: string
          numero: number
        }[]
      }
      get_configuracoes_vendas_publicas: {
        Args: never
        Returns: {
          id: string
          limite_adicional_responsavel: number
          limite_desconto_avista: number
          limite_desconto_presencial: number
          responsavel_senha_master_id: string
          responsavel_senha_responsavel_id: string
        }[]
      }
      get_cores_pintadas_hoje: {
        Args: never
        Returns: {
          cor_nome: string
          quantidade_pecas: number
        }[]
      }
      get_desempenho_diario_colaborador: {
        Args: { p_data_fim: string; p_data_inicio: string; p_user_id: string }
        Returns: {
          carregamento_qtd: number
          data: string
          dia_semana: string
          perfiladeira_metros: number
          pintura_m2: number
          qualidade_qtd: number
          separacao_qtd: number
          solda_qtd: number
        }[]
      }
      get_desempenho_etapas: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          carregamentos: number
          foto_perfil_url: string
          nome: string
          perfiladas_metros: number
          pintura_m2: number
          separadas: number
          soldadas: number
          soldadas_g: number
          soldadas_p: number
          user_id: string
        }[]
      }
      get_desempenho_producao_geral: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          data: string
          dia_semana: string
          portas_carregadas: number
          portas_perfiladas: number
          portas_pintadas: number
          portas_separadas: number
          portas_soldadas: number
        }[]
      }
      get_materiais_ranking_completo: {
        Args: never
        Returns: {
          item: string
          metragem_m2: number
          ocorrencias: number
          total_quantidade: number
        }[]
      }
      get_materiais_ranking_metragem: {
        Args: never
        Returns: {
          item: string
          metragem_m2: number
        }[]
      }
      get_materiais_ranking_quantidade: {
        Args: never
        Returns: {
          item: string
          ocorrencias: number
          total_quantidade: number
        }[]
      }
      get_meta_producao_mes: { Args: never; Returns: number }
      get_metas_colaboradores_mes: {
        Args: never
        Returns: {
          carregamento_qtd: number
          foto_perfil_url: string
          nome: string
          perfiladeira_metros: number
          pintura_m2: number
          qualidade_qtd: number
          separacao_qtd: number
          solda_qtd: number
          user_id: string
        }[]
      }
      get_ordens_paradas: { Args: never; Returns: number }
      get_pedidos_com_status_ordens: {
        Args: never
        Returns: {
          data_carregamento: string
          data_entrega: string
          etapa_atual: string
          nome_cliente: string
          numero_mes: number
          numero_pedido: string
          pedido_id: string
          perfiladeira_capturada: boolean
          perfiladeira_capturada_por_foto: string
          perfiladeira_existe: boolean
          perfiladeira_justificativa_pausa: string
          perfiladeira_numero_ordem: string
          perfiladeira_ordem_id: string
          perfiladeira_pausada: boolean
          perfiladeira_status: string
          pintura_capturada: boolean
          pintura_capturada_por_foto: string
          pintura_existe: boolean
          pintura_justificativa_pausa: string
          pintura_numero_ordem: string
          pintura_ordem_id: string
          pintura_pausada: boolean
          pintura_status: string
          prioridade: number
          produtos_lista: Json
          qualidade_capturada: boolean
          qualidade_capturada_por_foto: string
          qualidade_existe: boolean
          qualidade_justificativa_pausa: string
          qualidade_numero_ordem: string
          qualidade_ordem_id: string
          qualidade_pausada: boolean
          qualidade_status: string
          separacao_capturada: boolean
          separacao_capturada_por_foto: string
          separacao_existe: boolean
          separacao_justificativa_pausa: string
          separacao_numero_ordem: string
          separacao_ordem_id: string
          separacao_pausada: boolean
          separacao_status: string
          soldagem_capturada: boolean
          soldagem_capturada_por_foto: string
          soldagem_existe: boolean
          soldagem_justificativa_pausa: string
          soldagem_numero_ordem: string
          soldagem_ordem_id: string
          soldagem_pausada: boolean
          soldagem_status: string
        }[]
      }
      get_pedidos_na_fila: { Args: never; Returns: number }
      get_portas_enrolar_produzidas_hoje: { Args: never; Returns: number }
      get_portas_enrolar_produzidas_mes: { Args: never; Returns: number }
      get_portas_enrolar_produzidas_semana: { Args: never; Returns: number }
      get_portas_por_etapa: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          carregamentos: number
          metros_perfilados: number
          pedidos_separados: number
          pintura_m2: number
          portas_soldadas: number
        }[]
      }
      get_ranking_perfiladeira_mes: {
        Args: never
        Returns: {
          foto_perfil_url: string
          nome: string
          total_ordens: number
          total_pontos: number
          user_id: string
        }[]
      }
      get_ranking_pintura_mes: {
        Args: never
        Returns: {
          foto_perfil_url: string
          nome: string
          total_ordens: number
          total_pontos: number
          user_id: string
        }[]
      }
      get_ranking_pontuacao_mes: {
        Args: never
        Returns: {
          foto_perfil_url: string
          nome: string
          total_linhas: number
          total_pontos: number
          user_id: string
        }[]
      }
      get_ranking_solda_mes: {
        Args: never
        Returns: {
          foto_perfil_url: string
          nome: string
          total_ordens: number
          total_pontos: number
          user_id: string
        }[]
      }
      get_responsaveis_internos: {
        Args: never
        Returns: {
          id: string
          nome: string
        }[]
      }
      get_venda_itens_vinculados: {
        Args: { p_venda_id: string }
        Returns: Json
      }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["user_role"]
              _user_id: string
            }
            Returns: boolean
          }
      has_route_access: {
        Args: { _route_key: string; _user_id: string }
        Returns: boolean
      }
      increment_whatsapp_clique: { Args: { _id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_factory_operator: { Args: { _user_id: string }; Returns: boolean }
      is_lead_attendant: { Args: { lead_uuid: string }; Returns: boolean }
      list_atendentes_for_filter: {
        Args: never
        Returns: {
          ativo: boolean
          nome: string
          user_id: string
        }[]
      }
      map_etapa_to_instalacao_status: {
        Args: { etapa: string }
        Returns: string
      }
      obter_proximo_whatsapp: {
        Args: never
        Returns: {
          nome: string
          numero_telefone: string
        }[]
      }
      perform_database_vacuum: { Args: never; Returns: string }
      pode_marcar_linhas_ordem: {
        Args: { p_ordem_id: string; p_tipo_ordem: string }
        Returns: boolean
      }
      preencher_vaga_com_usuario: {
        Args: { p_admin_user_id: string; p_vaga_id: string }
        Returns: undefined
      }
      processar_postagens_agendadas: { Args: never; Returns: number }
      proximo_numero_orcamento_app: { Args: never; Returns: number }
      recalcular_pontuacao_linhas_concluidas: {
        Args: never
        Returns: {
          linhas_processadas: number
          pontuacoes_inseridas: number
        }[]
      }
      regenerar_linhas_ordem: {
        Args: { p_ordem_id: string; p_tipo_ordem: string }
        Returns: Json
      }
      remover_colaborador_organograma: {
        Args: { p_admin_user_id: string; p_justificativa?: string }
        Returns: string
      }
      remover_responsavel_ordem_producao: {
        Args: { p_ordem_id: string; p_tipo_ordem: string }
        Returns: Json
      }
      resetar_pedido_para_aberto: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      retornar_pedido_para_producao:
        | {
            Args: {
              p_motivo: string
              p_ordem_qualidade_id: string
              p_ordens_config: Json
              p_pedido_id: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_motivo: string
              p_ordem_qualidade_id: string
              p_ordens_reativar: string[]
              p_pedido_id: string
              p_user_id: string
            }
            Returns: undefined
          }
      retroceder_pedido_para_etapa: {
        Args: {
          p_etapa_destino: string
          p_motivo_backlog: string
          p_pedido_id: string
          p_user_id: string
        }
        Returns: Json
      }
      retroceder_pedido_unificado:
        | {
            Args: {
              p_etapa_destino: string
              p_motivo?: string
              p_pedido_id: string
              p_user_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_etapa_destino: string
              p_motivo: string
              p_ordens_config?: Json
              p_pedido_id: string
              p_user_id?: string
            }
            Returns: Json
          }
      update_user_avatar: {
        Args: { _new_url: string; _target_user_id: string }
        Returns: boolean
      }
      verificar_ordem_pintura_concluida: {
        Args: { p_pedido_id: string }
        Returns: boolean
      }
      verificar_ordem_qualidade_concluida: {
        Args: { p_pedido_id: string }
        Returns: boolean
      }
      verificar_ordens_pedido_concluidas: {
        Args: { p_pedido_id: string }
        Returns: boolean
      }
      verificar_senha_vendas: {
        Args: { p_senha: string; p_tipo: string }
        Returns: boolean
      }
    }
    Enums: {
      autorizado_etapa: "ativo" | "premium" | "perdido"
      autorizado_rating_categoria: "instalacao" | "suporte" | "atendimento"
      documento_categoria:
        | "manual"
        | "procedimento"
        | "formulario"
        | "contrato"
        | "politica"
        | "outros"
      franqueado_etapa: "inicial" | "avaliacao" | "aprovacao" | "ativo"
      lead_status:
        | "aguardando_atendimento"
        | "em_andamento"
        | "perdido"
        | "aguardando_aprovacao_venda"
        | "venda_reprovada"
        | "venda_aprovada"
      motivo_perda:
        | "desqualificado"
        | "perdido_por_preco"
        | "perdido_por_prazo"
        | "outro"
      motivo_perda_orcamento:
        | "preco"
        | "prazo"
        | "qualidade"
        | "logistica"
        | "atendimento"
        | "produto"
      representante_etapa:
        | "inicial"
        | "qualificacao"
        | "proposta"
        | "contratado"
      setor_producao: "perfiladeira" | "soldagem" | "separacao" | "pintura"
      setor_type:
        | "vendas"
        | "marketing"
        | "instalacoes"
        | "fabrica"
        | "administrativo"
      status_vaga: "em_analise" | "aberta" | "fechada" | "preenchida"
      status_visita: "agendada" | "concluida" | "cancelada"
      suporte_status: "aberto" | "em_andamento" | "resolvido"
      tarefa_status: "em_andamento" | "concluida"
      tipo_autorizacao_desconto: "responsavel_setor" | "master"
      tipo_carregamento: "elisa" | "autorizados" | "terceiro" | "instalacao"
      tipo_instalacao_enum: "elisa" | "autorizados"
      tipo_parceiro: "autorizado" | "representante" | "franqueado"
      tipo_parceria: "autorizado" | "representante" | "licenciado"
      turno_visita: "manha" | "tarde" | "noite"
      user_role:
        | "administrador"
        | "atendente"
        | "gerente_comercial"
        | "gerente_fabril"
        | "diretor"
        | "gerente_marketing"
        | "gerente_financeiro"
        | "gerente_producao"
        | "gerente_instalacoes"
        | "instalador"
        | "aux_instalador"
        | "analista_marketing"
        | "assistente_marketing"
        | "coordenador_vendas"
        | "vendedor"
        | "assistente_administrativo"
        | "soldador"
        | "aux_geral"
        | "pintor"
        | "aux_pintura"
        | "tecnico_qualidade"
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
      autorizado_etapa: ["ativo", "premium", "perdido"],
      autorizado_rating_categoria: ["instalacao", "suporte", "atendimento"],
      documento_categoria: [
        "manual",
        "procedimento",
        "formulario",
        "contrato",
        "politica",
        "outros",
      ],
      franqueado_etapa: ["inicial", "avaliacao", "aprovacao", "ativo"],
      lead_status: [
        "aguardando_atendimento",
        "em_andamento",
        "perdido",
        "aguardando_aprovacao_venda",
        "venda_reprovada",
        "venda_aprovada",
      ],
      motivo_perda: [
        "desqualificado",
        "perdido_por_preco",
        "perdido_por_prazo",
        "outro",
      ],
      motivo_perda_orcamento: [
        "preco",
        "prazo",
        "qualidade",
        "logistica",
        "atendimento",
        "produto",
      ],
      representante_etapa: [
        "inicial",
        "qualificacao",
        "proposta",
        "contratado",
      ],
      setor_producao: ["perfiladeira", "soldagem", "separacao", "pintura"],
      setor_type: [
        "vendas",
        "marketing",
        "instalacoes",
        "fabrica",
        "administrativo",
      ],
      status_vaga: ["em_analise", "aberta", "fechada", "preenchida"],
      status_visita: ["agendada", "concluida", "cancelada"],
      suporte_status: ["aberto", "em_andamento", "resolvido"],
      tarefa_status: ["em_andamento", "concluida"],
      tipo_autorizacao_desconto: ["responsavel_setor", "master"],
      tipo_carregamento: ["elisa", "autorizados", "terceiro", "instalacao"],
      tipo_instalacao_enum: ["elisa", "autorizados"],
      tipo_parceiro: ["autorizado", "representante", "franqueado"],
      tipo_parceria: ["autorizado", "representante", "licenciado"],
      turno_visita: ["manha", "tarde", "noite"],
      user_role: [
        "administrador",
        "atendente",
        "gerente_comercial",
        "gerente_fabril",
        "diretor",
        "gerente_marketing",
        "gerente_financeiro",
        "gerente_producao",
        "gerente_instalacoes",
        "instalador",
        "aux_instalador",
        "analista_marketing",
        "assistente_marketing",
        "coordenador_vendas",
        "vendedor",
        "assistente_administrativo",
        "soldador",
        "aux_geral",
        "pintor",
        "aux_pintura",
        "tecnico_qualidade",
      ],
    },
  },
} as const
