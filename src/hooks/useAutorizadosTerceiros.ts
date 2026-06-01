import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AutorizadoTerceiro {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  quilometragem: number | null;
  valor_estipulado: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutorizadoTerceiroInput {
  nome: string;
  cidade: string;
  estado: string;
  quilometragem?: number | null;
  valor_estipulado: number;
}

export function useAutorizadosTerceiros() {
  const qc = useQueryClient();

  const { data: autorizados = [], isLoading } = useQuery({
    queryKey: ['autorizados_terceiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autorizados_terceiros')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AutorizadoTerceiro[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: AutorizadoTerceiroInput) => {
      const ordem = (autorizados[autorizados.length - 1]?.ordem ?? 0) + 1;
      const { data, error } = await supabase
        .from('autorizados_terceiros')
        .insert({ ...input, ordem })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autorizados_terceiros'] });
      toast.success('Autorizado cadastrado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao cadastrar'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<AutorizadoTerceiroInput> & { id: string }) => {
      const { error } = await supabase
        .from('autorizados_terceiros')
        .update(input)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autorizados_terceiros'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao atualizar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('autorizados_terceiros').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autorizados_terceiros'] });
      toast.success('Autorizado removido');
    },
    onError: () => toast.error('Erro ao remover'),
  });

  return { autorizados, isLoading, create, update, remove };
}

export interface PagamentoAutorizadoMes {
  id: string;
  autorizado_id: string;
  mes_referencia: string;
  valor_pago: number;
  pago_em: string | null;
}

export function usePagamentosAutorizadosMes(mesReferencia: string | null) {
  const qc = useQueryClient();
  const mesDate = mesReferencia ? `${mesReferencia.slice(0, 7)}-01` : null;

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ['pagamentos_autorizados_terceiros_mes', mesDate],
    enabled: !!mesDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos_autorizados_terceiros_mes')
        .select('*')
        .eq('mes_referencia', mesDate as string);
      if (error) throw error;
      return (data ?? []) as PagamentoAutorizadoMes[];
    },
  });

  const byAutorizado: Record<string, PagamentoAutorizadoMes> = {};
  pagamentos.forEach((p) => {
    byAutorizado[p.autorizado_id] = p;
  });

  const upsert = useMutation({
    mutationFn: async ({ autorizadoId, valorPago }: { autorizadoId: string; valorPago: number }) => {
      if (!mesDate) throw new Error('Mês inválido');
      const { error } = await supabase
        .from('pagamentos_autorizados_terceiros_mes')
        .upsert(
          {
            autorizado_id: autorizadoId,
            mes_referencia: mesDate,
            valor_pago: valorPago,
            pago_em: valorPago > 0 ? new Date().toISOString().slice(0, 10) : null,
          },
          { onConflict: 'autorizado_id,mes_referencia' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagamentos_autorizados_terceiros_mes', mesDate] });
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao salvar pagamento'),
  });

  return { pagamentos, byAutorizado, isLoading, upsert };
}