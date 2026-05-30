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
  empresa_id: string | null;
  categoria_id: string | null;
}

export const useTiposCustos = () => {
  const [tiposCustos, setTiposCustos] = useState<TipoCusto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTiposCustos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tipos_custos" as any)
      .select("id, nome, descricao, valor_maximo_mensal, tipo, ativo, aparece_no_dre, empresa_id, categoria_id")
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

  /**
   * Verifica quantos gastos estão vinculados a um tipo de custo.
   */
  const contarGastosVinculados = async (id: string): Promise<number> => {
    const { count, error } = await supabase
      .from("gastos" as any)
      .select("id", { count: "exact", head: true })
      .eq("tipo_custo_id", id);
    if (error) {
      console.error(error);
      return 0;
    }
    return count ?? 0;
  };

  /**
   * Realoca todos os gastos vinculados a `id` para `novoTipoId` e exclui o tipo original.
   */
  const realocarEExcluirTipoCusto = async (id: string, novoTipoId: string) => {
    try {
      const { error: updErr } = await supabase
        .from("gastos" as any)
        .update({ tipo_custo_id: novoTipoId } as any)
        .eq("tipo_custo_id", id);
      if (updErr) throw updErr;
      const { error: delErr } = await supabase
        .from("tipos_custos" as any)
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      toast.success("Gastos realocados e tipo de custo excluído!");
      await fetchTiposCustos();
      return true;
    } catch (error: any) {
      toast.error("Erro ao realocar e excluir tipo de custo");
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
    contarGastosVinculados,
    realocarEExcluirTipoCusto,
  };
};
