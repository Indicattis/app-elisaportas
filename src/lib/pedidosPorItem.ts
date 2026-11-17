import { supabase } from "@/integrations/supabase/client";

/**
 * Etapas que ficam FORA da conta de pedidos por item.
 * Vazia: pedidos finalizados e em pós-vendas também entram na conta.
 */
export const ETAPAS_FORA_DE_COMPRA: string[] = [];

/** Arquivados também entram na conta. Mude para true para deixá-los de fora. */
export const EXCLUIR_ARQUIVADOS = false;

export interface PedidoResumo {
  etapa_atual?: string | null;
  arquivado?: boolean | null;
}

/** Diz se um pedido entra na conta de pedidos por item. */
export function contaNaDemanda(pedido: PedidoResumo): boolean {
  if (EXCLUIR_ARQUIVADOS && pedido.arquivado) return false;
  return !ETAPAS_FORA_DE_COMPRA.includes(pedido.etapa_atual || "");
}

export interface DemandaItem { pedidos: number; pecas: number }

/** Todos os pedidos do sistema (inclusive finalizados, pós-vendas e arquivados) que usam cada item, e a soma de peças. */
export async function fetchDemandaPorItem(): Promise<Record<string, DemandaItem>> {
  const relevantes = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("pedidos_producao")
      .select("id, etapa_atual, arquivado")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const p of data || []) if (contaNaDemanda(p)) relevantes.add(p.id);
    if (!data || data.length < 1000) break;
  }
  const ids = [...relevantes];
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
