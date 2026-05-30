import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TipoCusto {
  id: string;
  nome: string;
  descricao: string | null;
  valor_maximo_mensal: number;
  tipo: 'fixa' | 'variavel' | 'imposto';
  ativo: boolean;
  aparece_no_dre: boolean;
}

export const useTiposCustos = () => {
  const [tiposCustos, setTiposCustos] = useState<TipoCusto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTiposCustos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tipos_custos" as any)
      .select("id, nome, descricao, valor_maximo_mensal, tipo, ativo, aparece_no_dre")
      .order("nome", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar tipos de custos");
      console.error(error);
      setLoading(false);
      return;
    }
    setTiposCustos((data || []) as unknown as TipoCusto[]);
    setLoading(false);
  };

  const saveTipoCusto = async (data: Partial<TipoCusto>) => {
    try {
      const { error } = await supabase
        .from("tipos_custos" as any)
        .insert([{
          ...data,
          created_by: (await supabase.auth.getUser()).data.user?.id || "",
        }] as any);
      if (error) throw error;
      toast.success("Tipo de custo criado com sucesso!");
      await fetchTiposCustos();
      return true;
    } catch (error: any) {
      toast.error("Erro ao salvar tipo de custo");
      console.error(error);
      return false;
    }
  };

  const updateTipoCusto = async (id: string, data: Partial<TipoCusto>) => {
    try {
      const { error } = await supabase
        .from("tipos_custos" as any)
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Tipo de custo atualizado!");
      await fetchTiposCustos();
      return true;
    } catch (error: any) {
      toast.error("Erro ao atualizar tipo de custo");
      console.error(error);
      return false;
    }
  };

  const deleteTipoCusto = async (id: string) => {
    try {
      const { error } = await supabase
        .from("tipos_custos" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Tipo de custo excluído!");
      await fetchTiposCustos();
      return true;
    } catch (error: any) {
      toast.error("Erro ao excluir tipo de custo");
      console.error(error);
      return false;
    }
  };

  useEffect(() => {
    fetchTiposCustos();
  }, []);

  return {
    tiposCustos,
    loading,
    refetch: fetchTiposCustos,
    saveTipoCusto,
    updateTipoCusto,
    deleteTipoCusto,
  };
};
