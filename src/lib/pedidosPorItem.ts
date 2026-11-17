import { supabase } from "@/integrations/supabase/client";

/**
 * Etapas que ficam FORA da conta de pedidos por item.
 * Vazia: pedidos finalizados e em pós-vendas também entram na conta.
 * Só pedidos arquivados ficam de fora.
 */
export const ETAPAS_FORA_DE_COMPRA: string[] = [];

/** Diz se um pedido, pela etapa em que está, entra na conta de pedidos por item. */
export function contaNaDemanda(etapaAtual: string | null | undefined): boolean {
  return !ETAPAS_FORA_DE_COMPRA.includes(etapaAtual || "");
}

export interface DemandaItem { pedidos: number; pecas: number }

/** Pedidos não arquivados (incluindo finalizados e pós-vendas) que usam cada item, e a soma de peças. */
export async function fetchDemandaPorItem(): Promise<Record<string, DemandaItem>> {
  const ativos = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("pedidos_producao")
      .select("id, etapa_atual")
      .eq("arquivado", false)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const p of data || []) if (contaNaDemanda(p.etapa_atual)) ativos.add(p.id);
    if (!data || data.length < 1000) break;
  }
  const ids = [...ativos];
  const seen: Record<string, Set<string>> = {};
  const pecas: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("pedido_linhas")
        .select("id, estoque_id, pedido_id, quantidade")
        .in("pedido_id", chunk)
        .not("estoque_id", "is", null)
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const r of data || []) {
        if (!r.estoque_id) continue;
        (seen[r.estoque_id] ||= new Set()).add(r.pedido_id);
        pecas[r.estoque_id] = (pecas[r.estoque_id] || 0) + Number(r.quantidade || 0);
      }
      if (!data || data.length < 1000) break;
    }
  }
  const out: Record<string, DemandaItem> = {};
  for (const [k, s] of Object.entries(seen)) out[k] = { pedidos: s.size, pecas: pecas[k] || 0 };
  return out;
}
