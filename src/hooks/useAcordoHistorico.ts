import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AcordoHistoricoEvento {
  id: string;
  acordo_id: string;
  evento: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  valor_anterior: any;
  valor_novo: any;
  descricao: string;
  created_at: string;
}

export function useAcordoHistorico(acordoId: string | null) {
  const [historico, setHistorico] = useState<AcordoHistoricoEvento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!acordoId) {
      setHistorico([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('acordos_autorizados_historico' as any)
      .select('*')
      .eq('acordo_id', acordoId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setHistorico(data as unknown as AcordoHistoricoEvento[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [acordoId]);

  return { historico, loading };
}