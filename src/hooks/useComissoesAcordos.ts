import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ComissoesAcordos {
  id: string;
  chave: string;
  conteudo: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useComissoesAcordos() {
  const [nota, setNota] = useState<ComissoesAcordos | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchNota = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comissoes_acordos')
      .select('*')
      .eq('chave', 'acordos')
      .maybeSingle();
    if (!error) setNota((data as ComissoesAcordos | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNota();
  }, [fetchNota]);

  const save = useCallback(async (conteudo: string): Promise<boolean> => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    let error;
    if (nota?.id) {
      ({ error } = await supabase
        .from('comissoes_acordos')
        .update({ conteudo, updated_by: userId })
        .eq('id', nota.id));
    } else {
      ({ error } = await supabase
        .from('comissoes_acordos')
        .upsert({ chave: 'acordos', conteudo, updated_by: userId }, { onConflict: 'chave' }));
    }
    setSaving(false);
    if (error) return false;
    await fetchNota();
    return true;
  }, [nota?.id, fetchNota]);

  return { nota, loading, saving, save, refetch: fetchNota };
}
