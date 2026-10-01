import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PedidoMapa {
  id: string;
  numero_pedido: string | null;
  cliente_nome: string | null;
  cidade: string | null;
  estado: string | null;
  valor_venda: number | null;
  vendedor: string | null;
  finalizado_em: string | null;
  lat: number | null;
  lng: number | null;
}

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocodificar(cidade: string, estado: string) {
  const q = encodeURIComponent(`${cidade}, ${estado}, Brasil`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=br`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return { lat: null, lng: null };
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export function useMapaPedidosFinalizados() {
  return useQuery({
    queryKey: ["mapa-pedidos-finalizados"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PedidoMapa[]> => {
      const { data, error } = await supabase
        .from("pedidos_producao")
        .select(
          "id, numero_pedido, cliente_nome, updated_at, vendas:venda_id(cliente_nome, cidade, estado, valor_venda, atendente:admin_users!fk_vendas_atendente(nome))"
        )
        .eq("etapa_atual", "finalizado")
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as any[];

      const { data: cache } = await (supabase as any)
        .from("geocode_cidades")
        .select("cidade_normalizada, estado, latitude, longitude");
      const map = new Map<string, { lat: number | null; lng: number | null }>();
      (cache ?? []).forEach((c: any) =>
        map.set(`${c.cidade_normalizada}|${c.estado}`, { lat: c.latitude, lng: c.longitude })
      );

      const faltando = new Map<string, { cidade: string; estado: string }>();
      rows.forEach((r) => {
        const c = r.vendas?.cidade, e = r.vendas?.estado;
        if (!c || !e) return;
        const k = `${norm(c)}|${norm(e)}`;
        if (!map.has(k)) faltando.set(k, { cidade: c, estado: norm(e) });
      });

      for (const [k, v] of faltando) {
        try {
          const geo = await geocodificar(v.cidade, v.estado);
          if (geo) {
            map.set(k, geo);
            await (supabase as any).from("geocode_cidades").upsert(
              { cidade_normalizada: norm(v.cidade), estado: v.estado, latitude: geo.lat, longitude: geo.lng },
              { onConflict: "cidade_normalizada,estado" }
            );
          }
        } catch (e) {
          console.error("[mapa] geocode", e);
        }
        await sleep(1100);
      }

      return rows.map((r) => {
        const c = r.vendas?.cidade, e = r.vendas?.estado;
        const geo = c && e ? map.get(`${norm(c)}|${norm(e)}`) : undefined;
        return {
          id: r.id,
          numero_pedido: r.numero_pedido,
          cliente_nome: r.cliente_nome ?? r.vendas?.cliente_nome ?? null,
          cidade: c ?? null,
          estado: e ? norm(e) : null,
          valor_venda: r.vendas?.valor_venda ?? null,
          vendedor: r.vendas?.atendente?.nome ?? null,
          finalizado_em: r.updated_at ?? null,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
        };
      });
    },
  });
}
