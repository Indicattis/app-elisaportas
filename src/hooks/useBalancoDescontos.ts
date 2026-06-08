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
  vendas?: {
    cliente_nome: string | null;
    forma_pagamento: string | null;
    venda_presencial: boolean | null;
  } | null;
  tem_autorizacao_gerente?: boolean;
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
        .select("*")
        .gte("data_venda", inicio)
        .lt("data_venda", fim)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as unknown as BalancoDescontoRow[];
      const ids = rows.map((r) => r.venda_id);
      if (ids.length) {
        const [{ data: autos }, { data: vendasData }] = await Promise.all([
          supabase
            .from("vendas_autorizacoes_desconto")
            .select("venda_id")
            .in("venda_id", ids),
          supabase
            .from("vendas")
            .select("id, cliente_nome, forma_pagamento, venda_presencial")
            .in("id", ids),
        ]);
        const autoSet = new Set((autos || []).map((a: any) => a.venda_id));
        const vendasMap = new Map(
          (vendasData || []).map((v: any) => [v.id, v]),
        );
        rows.forEach((r) => {
          r.tem_autorizacao_gerente = autoSet.has(r.venda_id);
          const v = vendasMap.get(r.venda_id);
          r.vendas = v
            ? {
                cliente_nome: v.cliente_nome,
                forma_pagamento: v.forma_pagamento,
                venda_presencial: v.venda_presencial,
              }
            : null;
        });
      }
      return rows;
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