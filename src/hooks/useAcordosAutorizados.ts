import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface PortaAcordo {
  id?: string;
  tamanho: 'P' | 'G' | 'GG';
  valor_unitario: number;
  largura?: number;
  altura?: number;
}

export interface AcordoAutorizado {
  id: string;
  autorizado_id: string;
  autorizado_nome: string;
  cliente_nome: string;
  cliente_cidade: string;
  cliente_estado: string;
  quantidade_portas: number;
  valor_acordado: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  data_acordo: string;
  observacoes?: string;
  created_at: string;
  portas: PortaAcordo[];
  aprovado_direcao: boolean;
  reprovado_direcao: boolean;
  pago: boolean;
  pago_em?: string;
  pago_por?: string;
  valor_pago: number;
  criador?: {
    nome: string;
    foto_perfil_url?: string;
  };
}

export interface NovoAcordo {
  autorizado_id: string;
  cliente_nome: string;
  cliente_cidade: string;
  cliente_estado: string;
  valor_acordado: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  data_acordo: string;
  observacoes?: string;
  portas: Omit<PortaAcordo, 'id'>[];
  venda_id?: string | null;
}

export function useAcordosAutorizados() {
  const [acordos, setAcordos] = useState<AcordoAutorizado[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAcordos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar acordos com dados do autorizado
      const { data: acordosData, error: acordosError } = await supabase
        .from('acordos_instalacao_autorizados')
        .select(`
          *,
          autorizados:autorizado_id (
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (acordosError) throw acordosError;

      // Buscar portas de todos os acordos
      const acordoIds = acordosData?.map(a => a.id) || [];
      
      let portasData: any[] = [];
      if (acordoIds.length > 0) {
        const { data: portas, error: portasError } = await supabase
          .from('acordo_portas')
          .select('*')
          .in('acordo_id', acordoIds);

        if (portasError) throw portasError;
        portasData = portas || [];
      }

      // Buscar dados dos criadores (admin_users via user_id)
      const creatorIds = [...new Set(acordosData?.filter(a => a.created_by).map(a => a.created_by) || [])];
      let criadoresMap: Record<string, { nome: string; foto_perfil_url?: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: criadoresData } = await supabase
          .from('admin_users')
          .select('user_id, nome, foto_perfil_url')
          .in('user_id', creatorIds);
        
        if (criadoresData) {
          criadoresData.forEach(c => {
            criadoresMap[c.user_id] = {
              nome: c.nome,
              foto_perfil_url: c.foto_perfil_url || undefined
            };
          });
        }
      }

      // Mapear acordos com suas portas
      const acordosMapeados: AcordoAutorizado[] = (acordosData || []).map(acordo => ({
        id: acordo.id,
        autorizado_id: acordo.autorizado_id,
        autorizado_nome: acordo.autorizados?.nome || 'Desconhecido',
        cliente_nome: acordo.cliente_nome,
        cliente_cidade: acordo.cliente_cidade,
        cliente_estado: acordo.cliente_estado,
        quantidade_portas: acordo.quantidade_portas,
        valor_acordado: Number(acordo.valor_acordado),
        status: acordo.status as 'pendente' | 'em_andamento' | 'concluido',
        data_acordo: acordo.data_acordo,
        observacoes: acordo.observacoes || undefined,
        created_at: acordo.created_at,
        portas: portasData
          .filter(p => p.acordo_id === acordo.id)
          .map(p => ({
            id: p.id,
            tamanho: p.tamanho as 'P' | 'G' | 'GG',
            valor_unitario: Number(p.valor_unitario),
            largura: p.largura ? Number(p.largura) : undefined,
            altura: p.altura ? Number(p.altura) : undefined
          })),
        aprovado_direcao: acordo.aprovado_direcao ?? false,
        reprovado_direcao: (acordo as any).reprovado_direcao ?? false,
        pago: (acordo as any).pago ?? false,
        pago_em: (acordo as any).pago_em || undefined,
        pago_por: (acordo as any).pago_por || undefined,
        valor_pago: Number((acordo as any).valor_pago ?? 0),
        criador: acordo.created_by ? criadoresMap[acordo.created_by] : undefined
      }));

      setAcordos(acordosMapeados);
    } catch (error: any) {
      console.error('Erro ao buscar acordos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os acordos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createAcordo = useCallback(async (novoAcordo: NovoAcordo) => {
    try {
      // Criar acordo
      const { data: acordoCriado, error: acordoError } = await supabase
        .from('acordos_instalacao_autorizados')
        .insert({
          autorizado_id: novoAcordo.autorizado_id,
          cliente_nome: novoAcordo.cliente_nome,
          cliente_cidade: novoAcordo.cliente_cidade,
          cliente_estado: novoAcordo.cliente_estado,
          quantidade_portas: novoAcordo.portas.length,
          valor_acordado: novoAcordo.valor_acordado,
          status: novoAcordo.status,
          data_acordo: novoAcordo.data_acordo,
          observacoes: novoAcordo.observacoes || null,
          pedido_id: novoAcordo.pedido_id || null,
          created_by: user?.id
        } as any)
        .select()
        .single();

      if (acordoError) throw acordoError;

      // Criar portas
      if (novoAcordo.portas.length > 0) {
        const portasParaInserir = novoAcordo.portas.map(p => ({
          acordo_id: acordoCriado.id,
          tamanho: p.tamanho,
          valor_unitario: p.valor_unitario,
          largura: p.largura || null,
          altura: p.altura || null
        }));

        const { error: portasError } = await supabase
          .from('acordo_portas')
          .insert(portasParaInserir);

        if (portasError) throw portasError;
      }

      toast({
        title: 'Sucesso',
        description: 'Acordo criado com sucesso'
      });

      await fetchAcordos();
      return acordoCriado;
    } catch (error: any) {
      console.error('Erro ao criar acordo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o acordo',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, fetchAcordos, user?.id]);

  const updateAcordo = useCallback(async (id: string, dadosAtualizados: Partial<NovoAcordo>) => {
    try {
      // Atualizar acordo
      const { error: acordoError } = await supabase
        .from('acordos_instalacao_autorizados')
        .update({
          autorizado_id: dadosAtualizados.autorizado_id,
          cliente_nome: dadosAtualizados.cliente_nome,
          cliente_cidade: dadosAtualizados.cliente_cidade,
          cliente_estado: dadosAtualizados.cliente_estado,
          quantidade_portas: dadosAtualizados.portas?.length,
          valor_acordado: dadosAtualizados.valor_acordado,
          status: dadosAtualizados.status,
          data_acordo: dadosAtualizados.data_acordo,
          observacoes: dadosAtualizados.observacoes || null
        })
        .eq('id', id);

      if (acordoError) throw acordoError;

      // Deletar portas antigas e inserir novas
      if (dadosAtualizados.portas) {
        await supabase
          .from('acordo_portas')
          .delete()
          .eq('acordo_id', id);

        if (dadosAtualizados.portas.length > 0) {
          const portasParaInserir = dadosAtualizados.portas.map(p => ({
            acordo_id: id,
            tamanho: p.tamanho,
            valor_unitario: p.valor_unitario,
            largura: p.largura || null,
            altura: p.altura || null
          }));

          const { error: portasError } = await supabase
            .from('acordo_portas')
            .insert(portasParaInserir);

          if (portasError) throw portasError;
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Acordo atualizado com sucesso'
      });

      await fetchAcordos();
    } catch (error: any) {
      console.error('Erro ao atualizar acordo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o acordo',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, fetchAcordos]);

  const deleteAcordo = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('acordos_instalacao_autorizados')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Acordo removido com sucesso'
      });

      await fetchAcordos();
    } catch (error: any) {
      console.error('Erro ao deletar acordo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o acordo',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, fetchAcordos]);

  useEffect(() => {
    fetchAcordos();
  }, [fetchAcordos]);

  return {
    acordos,
    loading,
    createAcordo,
    updateAcordo,
    deleteAcordo,
    refetch: fetchAcordos
  };
}
