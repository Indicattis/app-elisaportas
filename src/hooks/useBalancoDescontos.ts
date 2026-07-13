import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isVendaFaturada } from "@/lib/faturamentoStatus";

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
    metodos_pagamento: string[] | null;
    temperatura: boolean | null;
    atendente_id: string | null;
    lucro_total: number | null;
  } | null;
  tem_autorizacao_gerente?: boolean;
  vendedor?: {
    nome: string | null;
    foto_perfil_url: string | null;
  } | null;
  etapa_atual?: string | null;
  status_venda?: string | null;
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
        const [{ data: autos }, { data: vendasData }, { data: pedidosData }, { data: contasData }] = await Promise.all([
          supabase
            .from("vendas_autorizacoes_desconto")
            .select("venda_id")
            .in("venda_id", ids),
          supabase
            .from("vendas")
            .select("id, cliente_nome, forma_pagamento, metodo_pagamento, temperatura, atendente_id, lucro_total, status_aprovacao, contrato_url, contrato_dispensado, frete_aprovado, produtos_vendas(faturamento)")
            .in("id", ids),
          supabase
            .from("pedidos_producao")
            .select("venda_id, etapa_atual")
            .in("venda_id", ids),
          supabase
            .from("contas_receber")
            .select("venda_id, metodo_pagamento")
            .in("venda_id", ids),
        ]);
        const autoSet = new Set((autos || []).map((a: any) => a.venda_id));
        const vendasMap = new Map(
          (vendasData || []).map((v: any) => [v.id, v]),
        );
        const pedidosMap = new Map(
          (pedidosData || []).map((p: any) => [p.venda_id, p.etapa_atual]),
        );
        const metodosMap = new Map<string, string[]>();
        (vendasData || []).forEach((v: any) => {
          const metodo = v.metodo_pagamento || v.forma_pagamento;
          if (!v?.id || !metodo) return;
          const atuais = metodosMap.get(v.id) || [];
          if (!atuais.includes(metodo)) {
            atuais.push(metodo);
            metodosMap.set(v.id, atuais);
          }
        });
        (contasData || []).forEach((c: any) => {
          if (!c?.venda_id || !c?.metodo_pagamento) return;
          const atuais = metodosMap.get(c.venda_id) || [];
          if (!atuais.includes(c.metodo_pagamento)) {
            atuais.push(c.metodo_pagamento);
            metodosMap.set(c.venda_id, atuais);
          }
        });
        const atendenteIds = Array.from(
          new Set(
            (vendasData || [])
              .map((v: any) => v.atendente_id)
              .filter((x: any): x is string => !!x),
          ),
        );
        const vendedoresMap = new Map<string, { nome: string | null; foto_perfil_url: string | null }>();
        if (atendenteIds.length) {
          const { data: vendedores } = await supabase
            .from("admin_users")
            .select("id, user_id, nome, foto_perfil_url")
            .or(
              `id.in.(${atendenteIds.join(",")}),user_id.in.(${atendenteIds.join(",")})`,
            );
          (vendedores || []).forEach((u: any) =>
            {
              const entry = { nome: u.nome, foto_perfil_url: u.foto_perfil_url };
              if (u.id) vendedoresMap.set(u.id, entry);
              if (u.user_id) vendedoresMap.set(u.user_id, entry);
            },
          );
        }
        rows.forEach((r) => {
          r.tem_autorizacao_gerente = autoSet.has(r.venda_id);
          const v = vendasMap.get(r.venda_id);
          r.vendas = v
            ? {
                cliente_nome: v.cliente_nome,
                forma_pagamento: v.forma_pagamento,
                metodos_pagamento: metodosMap.get(r.venda_id) || [],
                temperatura: v.temperatura,
                atendente_id: v.atendente_id,
                lucro_total: v.lucro_total,
              }
            : null;
          r.vendedor = v?.atendente_id ? vendedoresMap.get(v.atendente_id) || null : null;
          r.etapa_atual = pedidosMap.get(r.venda_id) || null;
          // Derivar status da venda
          let statusVenda: string | null = null;
          if (v) {
            if (v.status_aprovacao === "reprovado") {
              statusVenda = "reprovado";
            } else if (r.etapa_atual) {
              statusVenda = r.etapa_atual;
            } else if (!v.contrato_url && !v.contrato_dispensado) {
              statusVenda = "aguardando_contrato";
            } else if (!isVendaFaturada(v)) {
              statusVenda = "pendente_faturamento";
            } else {
              statusVenda = "pendente_pedido";
            }
          }
          r.status_venda = statusVenda;
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