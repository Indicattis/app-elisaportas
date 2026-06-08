import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BalancoDescontoRow {
  id: string;
  venda_id: string;
  total_venda: number;
  desconto_dado: number;
  pct_desconto_dado: number;
  pct_limite_permitido: number;
  valor_balanco: number;
  tipo: "positivo" | "negativo" | "neutro";
  data_venda: string | null;
  vendas?: { cliente_nome: string | null } | null;
}

function periodoMes(mesISO: string) {
  // mesISO = "YYYY-MM"
  const [y, m] = mesISO.split("-").map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const fim = new Date(Date.UTC(y, m, 1)).toISOString();
  return { inicio, fim };
}

export function useBalancoDescontos(mesISO: string) {
  const qc = useQueryClient();
  const { inicio, fim } = periodoMes(mesISO);

  const query = useQuery({
    queryKey: ["balanco-descontos", mesISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_balanco_desconto")
        .select("*, vendas:venda_id(cliente_nome)")
        .gte("data_venda", inicio)
        .lt("data_venda", fim)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BalancoDescontoRow[];
    },
  });

  const recalcular = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        "recalcular_balanco_desconto_vendas" as any,
        { p_inicio: inicio, p_fim: fim }
      );
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${n} venda(s) recalculada(s)`);
      qc.invalidateQueries({ queryKey: ["balanco-descontos", mesISO] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao recalcular"),
  });

  const rows = query.data || [];
  const totalPositivo = rows
    .filter((r) => r.valor_balanco > 0)
    .reduce((s, r) => s + Number(r.valor_balanco), 0);
  const totalNegativo = rows
    .filter((r) => r.valor_balanco < 0)
    .reduce((s, r) => s + Number(r.valor_balanco), 0);
  const saldo = totalPositivo + totalNegativo;

  return {
    rows,
    isLoading: query.isLoading,
    totalPositivo,
    totalNegativo,
    saldo,
    recalcular: recalcular.mutate,
    isRecalculando: recalcular.isPending,
  };
}