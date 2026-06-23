import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Entrada {
  id: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  responsavel_id: string | null;
  banco_id: string | null;
  status: string;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  responsavel_nome?: string;
  responsavel_foto?: string | null;
  banco_nome?: string;
}

export type EntradasOrdenarPor = 'cadastro' | 'recebimento';

export const useEntradas = (mesFiltro?: string, ordenarPor: EntradasOrdenarPor = 'cadastro') => {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntradas = async () => {
    setLoading(true);

    const orderColumn = ordenarPor === 'recebimento' ? 'data' : 'created_at';
    let query = supabase
      .from("entradas" as any)
      .select("*")
      .order(orderColumn, { ascending: false });

    if (mesFiltro) {
      const start = `${mesFiltro}-01`;
      const [y, m] = mesFiltro.split("-").map(Number);
      const end = new Date(y, m, 0).toISOString().split("T")[0];
      query = query.gte("data", start).lte("data", end);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar entradas");
      console.error(error);
      setLoading(false);
      return;
    }

    const rows = (data || []) as unknown as Entrada[];

    const responsavelIds = [...new Set(rows.map((r) => r.responsavel_id).filter(Boolean))] as string[];
    const bancoIds = [...new Set(rows.map((r) => r.banco_id).filter(Boolean))] as string[];

    let responsaveisMap: Record<string, { nome: string; foto: string | null }> = {};
    let bancosMap: Record<string, string> = {};

    if (responsavelIds.length > 0) {
      const { data: users } = await supabase
        .from("admin_users")
        .select("user_id, nome, foto_perfil_url")
        .in("user_id", responsavelIds);
      (users || []).forEach((u: any) => {
        responsaveisMap[u.user_id] = { nome: u.nome, foto: u.foto_perfil_url || null };
      });
    }

    if (bancoIds.length > 0) {
      const { data: bancos } = await supabase
        .from("bancos" as any)
        .select("id, nome")
        .in("id", bancoIds);
      (bancos || []).forEach((b: any) => {
        bancosMap[b.id] = b.nome;
      });
    }

    const enriched = rows.map((r) => ({
      ...r,
      responsavel_nome: r.responsavel_id ? (responsaveisMap[r.responsavel_id]?.nome || "—") : "—",
      responsavel_foto: r.responsavel_id ? (responsaveisMap[r.responsavel_id]?.foto || null) : null,
      banco_nome: r.banco_id ? (bancosMap[r.banco_id] || "—") : "—",
    }));

    setEntradas(enriched);
    setLoading(false);
  };

  const saveEntrada = async (data: Partial<Entrada>) => {
    try {
      const { error } = await supabase
        .from("entradas" as any)
        .insert([{
          ...data,
          created_by: (await supabase.auth.getUser()).data.user?.id || null,
        }] as any);
      if (error) throw error;
      toast.success("Entrada registrada com sucesso!");
      await fetchEntradas();
      return true;
    } catch (error: any) {
      toast.error("Erro ao salvar entrada");
      console.error(error);
      return false;
    }
  };

  const updateEntrada = async (id: string, data: Partial<Entrada>) => {
    try {
      const { error } = await supabase
        .from("entradas" as any)
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Entrada atualizada!");
      await fetchEntradas();
      return true;
    } catch (error: any) {
      toast.error("Erro ao atualizar entrada");
      console.error(error);
      return false;
    }
  };

  const deleteEntrada = async (id: string) => {
    try {
      const { error } = await supabase
        .from("entradas" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Entrada excluída!");
      await fetchEntradas();
      return true;
    } catch (error: any) {
      toast.error("Erro ao excluir entrada");
      console.error(error);
      return false;
    }
  };

  useEffect(() => {
    fetchEntradas();
  }, [mesFiltro, ordenarPor]);

  return { entradas, loading, refetch: fetchEntradas, saveEntrada, updateEntrada, deleteEntrada };
};