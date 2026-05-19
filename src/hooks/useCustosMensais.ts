import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustoMensal {
  id: string;
  mes: string;
  tipo_custo_id: string;
  valor_real: number;
  observacoes: string | null;
  tipo_custo?: {
    id: string;
    nome: string;
    descricao: string | null;
    categoria_id: string | null;
    subcategoria_id: string | null;
    valor_maximo_mensal: number;
    tipo: string;
    ativo: boolean;
    categoria?: { id: string; nome: string; cor: string | null } | null;
    subcategoria?: { id: string; nome: string } | null;
  };
}

export interface TotalMes {
  mes: string;
  total_real: number;
  total_limite: number;
}

export const useCustosMensais = (mes?: string) => {
  const [custosMes, setCustosMes] = useState<CustoMensal[]>([]);
  const [totaisPorMes, setTotaisPorMes] = useState<TotalMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch custos do mês lendo de despesas_mensais e mapeando por nome aos tipos_custos
  const fetchCustosMes = useCallback(async (mesDate: string) => {
    setLoading(true);

    // Intervalo do mês
    const [y, m] = mesDate.split("-").map(Number);
    const start = `${mesDate.slice(0, 7)}-01`;
    const end = new Date(y, m, 0).toISOString().split("T")[0];

    // Busca gastos no intervalo do mês
    const { data: gastos, error: errGastos } = await supabase
      .from("gastos" as any)
      .select("tipo_custo_id, valor")
      .gte("data", start)
      .lte("data", end);

    if (errGastos) {
      console.error(errGastos);
      toast.error("Erro ao carregar custos do mês");
      setLoading(false);
      return;
    }

    // Agrega por tipo_custo_id
    const somaPorTipo = new Map<string, number>();
    ((gastos || []) as any[]).forEach((g: any) => {
      if (!g.tipo_custo_id) return;
      somaPorTipo.set(g.tipo_custo_id, (somaPorTipo.get(g.tipo_custo_id) || 0) + Number(g.valor || 0));
    });

    // Busca tipos_custos ativos
    const { data: tipos } = await supabase
      .from("tipos_custos" as any)
      .select("id, nome, descricao, valor_maximo_mensal, tipo, ativo")
      .eq("ativo", true);

    const result: CustoMensal[] = ((tipos || []) as any[]).map((t: any) => ({
      id: t.id,
      mes: start,
      tipo_custo_id: t.id,
      valor_real: somaPorTipo.get(t.id) || 0,
      observacoes: null,
      tipo_custo: {
        id: t.id,
        nome: t.nome,
        descricao: t.descricao,
        categoria_id: null,
        subcategoria_id: null,
        valor_maximo_mensal: t.valor_maximo_mensal,
        tipo: t.tipo,
        ativo: t.ativo,
      },
    }));

    setCustosMes(result);
    setLoading(false);
  }, []);

  const fetchTotaisPorMes = useCallback(async (ano: number) => {
    setLoading(true);
    const startDate = `${ano}-01-01`;
    const endDate = `${ano}-12-31`;

    // Busca gastos do ano inteiro
    const { data, error } = await supabase
      .from("gastos" as any)
      .select("data, valor")
      .gte("data", startDate)
      .lte("data", endDate);

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar totais");
      setLoading(false);
      return;
    }

    // Agrupa por mês (chave YYYY-MM-01)
    const totais: Record<string, number> = {};
    ((data || []) as any[]).forEach((row: any) => {
      const mKey = `${String(row.data).slice(0, 7)}-01`;
      totais[mKey] = (totais[mKey] || 0) + Number(row.valor || 0);
    });

    // Busca limites dos tipos ativos
    const { data: tipos } = await supabase
      .from("tipos_custos" as any)
      .select("valor_maximo_mensal")
      .eq("ativo", true);

    const totalLimite = ((tipos || []) as any[]).reduce((acc: number, t: any) => acc + Number(t.valor_maximo_mensal || 0), 0);

    const result: TotalMes[] = [];
    for (let i = 1; i <= 12; i++) {
      const mesKey = `${ano}-${String(i).padStart(2, "0")}-01`;
      result.push({
        mes: mesKey,
        total_real: totais[mesKey] || 0,
        total_limite: totalLimite,
      });
    }

    setTotaisPorMes(result);
    setLoading(false);
  }, []);

  // Salva em despesas_mensais fazendo upsert por mes+nome
  const saveCustosMensaisBatch = async (
    mesDate: string,
    custos: { tipo_custo_id: string; valor_real: number; observacoes?: string }[],
    tiposCustosRef?: { id: string; nome: string; tipo: string }[]
  ) => {
    // Deprecated: custos agora são agregados de `gastos`. Mantido como no-op.
    void mesDate; void custos; void tiposCustosRef;
    return true;
  };

  // Keep legacy single save (redirects to batch)
  const saveCustoMensal = async (
    tipo_custo_id: string,
    mesDate: string,
    valor_real: number,
    observacoes?: string
  ) => {
    return saveCustosMensaisBatch(mesDate, [{ tipo_custo_id, valor_real, observacoes }]);
  };

  useEffect(() => {
    if (mes) {
      fetchCustosMes(mes);
    }
  }, [mes, fetchCustosMes]);

  return {
    custosMes,
    totaisPorMes,
    loading,
    saving,
    fetchCustosMes,
    fetchTotaisPorMes,
    saveCustoMensal,
    saveCustosMensaisBatch,
  };
};
