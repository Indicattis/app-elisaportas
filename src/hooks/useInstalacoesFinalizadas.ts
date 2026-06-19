import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InstalacaoFinalizada {
  id: string;
  pedido_id: string;
  venda_id: string | null;
  numero_pedido: string | null;
  numero_mes: number | null;
  mes_vigencia: string | null;
  cliente_nome: string | null;
  valor_instalacao: number;
  equipe_instalacao_id: string | null;
  equipe_instalacao_nome: string | null;
  autorizado_correcao_id: string | null;
  autorizado_correcao_nome: string | null;
  responsavel_carregamento_id: string | null;
  responsavel_carregamento_nome: string | null;
  estado: string | null;
  cidade: string | null;
  finalizado_em: string;
  tipo_entrega?: string | null;
  valor_frete?: number | null;
  data_cadastro?: string | null;
  vendedor_nome?: string | null;
  vendedor_foto_url?: string | null;
}

/**
 * @param mes formato "YYYY-MM" ou "todos"
 */
export function useInstalacoesFinalizadas(mes: string) {
  return useQuery({
    queryKey: ["instalacoes-finalizadas", mes],
    queryFn: async (): Promise<InstalacaoFinalizada[]> => {
      let query = supabase
        .from("instalacoes_finalizadas")
        .select("*, vendas:venda_id(tipo_entrega, valor_frete, atendente_id)")
        .order("finalizado_em", { ascending: false });

      if (mes !== "todos") {
        const [y, m] = mes.split("-").map(Number);
        const inicio = new Date(Date.UTC(y, m - 1, 1)).toISOString();
        const fim = new Date(Date.UTC(y, m, 1)).toISOString();
        query = query.gte("finalizado_em", inicio).lt("finalizado_em", fim);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const pedidoIds = Array.from(new Set(rows.map((r) => r.pedido_id).filter(Boolean)));
      let pedidosMap: Record<string, string> = {};
      if (pedidoIds.length > 0) {
        const chunkSize = 80;
        for (let i = 0; i < pedidoIds.length; i += chunkSize) {
          const slice = pedidoIds.slice(i, i + chunkSize);
          const { data: pedidos, error: pErr } = await supabase
            .from("pedidos_producao")
            .select("id, created_at")
            .in("id", slice);
          if (pErr) {
            console.error("[useInstalacoesFinalizadas] pedidos_producao error:", pErr);
            continue;
          }
          for (const p of (pedidos ?? []) as any[]) {
            pedidosMap[p.id] = p.created_at;
          }
        }
      }
      const atendenteIds = Array.from(
        new Set(rows.map((r) => r.vendas?.atendente_id).filter(Boolean))
      );
      const atendentesMap: Record<string, { nome: string | null; foto_perfil_url: string | null }> = {};
      if (atendenteIds.length > 0) {
        const { data: usuarios, error: uErr } = await supabase
          .from("admin_users")
          .select("user_id, nome, foto_perfil_url")
          .in("user_id", atendenteIds as string[]);
        if (uErr) {
          console.error("[useInstalacoesFinalizadas] admin_users error:", uErr);
        }
        for (const u of (usuarios ?? []) as any[]) {
          atendentesMap[u.user_id] = { nome: u.nome, foto_perfil_url: u.foto_perfil_url };
        }
      }
      return rows.map((r) => ({
        ...r,
        tipo_entrega: r.vendas?.tipo_entrega ?? null,
        valor_frete: r.vendas?.valor_frete ?? null,
        data_cadastro: pedidosMap[r.pedido_id] ?? null,
        vendedor_nome: r.vendas?.atendente_id ? atendentesMap[r.vendas.atendente_id]?.nome ?? null : null,
        vendedor_foto_url: r.vendas?.atendente_id ? atendentesMap[r.vendas.atendente_id]?.foto_perfil_url ?? null : null,
      })) as InstalacaoFinalizada[];
    },
  });
}