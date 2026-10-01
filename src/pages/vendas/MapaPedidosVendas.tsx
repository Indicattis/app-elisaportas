import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { useMapaPedidosFinalizados } from "@/hooks/useMapaPedidosFinalizados";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const icon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#1d76cf;border:3px solid #fff;box-shadow:0 0 8px rgba(29,118,207,.8)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Espalha levemente pedidos da mesma cidade para não sobrepor
const jitter = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((h % 1000) / 1000 - 0.5) * 0.02;
};

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MapaPedidosVendas() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useMapaPedidosFinalizados();
  const [estado, setEstado] = useState("todos");
  const [vendedor, setVendedor] = useState("todos");

  const estados = useMemo(() => Array.from(new Set(data.map((p) => p.estado).filter(Boolean))).sort() as string[], [data]);
  const vendedores = useMemo(() => Array.from(new Set(data.map((p) => p.vendedor).filter(Boolean))).sort() as string[], [data]);

  const filtrados = data.filter(
    (p) => (estado === "todos" || p.estado === estado) && (vendedor === "todos" || p.vendedor === vendedor)
  );
  const noMapa = filtrados.filter((p) => p.lat != null && p.lng != null);
  const semLocal = filtrados.length - noMapa.length;

  return (
    <div className="relative h-screen w-full bg-black">
      <MapContainer center={[-15.8, -50]} zoom={4} className="h-full w-full z-0">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={45}>
          {noMapa.map((p) => (
            <Marker key={p.id} position={[p.lat! + jitter(p.id), p.lng! + jitter(p.id + "x")]} icon={icon}>
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-sm">Pedido #{p.numero_pedido ?? "—"}</div>
                  <div>{p.cliente_nome ?? "—"}</div>
                  <div>{p.cidade}/{p.estado}</div>
                  <div>Vendedor: {p.vendedor ?? "—"}</div>
                  <div>Valor: {brl(p.valor_venda)}</div>
                  {p.finalizado_em && <div>Finalizado: {new Date(p.finalizado_em).toLocaleDateString("pt-BR")}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] w-72 space-y-3 rounded-lg border border-white/10 bg-black/70 p-4 text-white backdrop-blur-xl">
        <button onClick={() => navigate("/vendas")} className="flex items-center gap-2 text-xs text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-400" />
          <h1 className="font-semibold">Mapa de pedidos finalizados</h1>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Localizando cidades…
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-blue-400">{noMapa.length}</div>
            <div className="text-xs text-white/60">pedidos no mapa</div>
            {semLocal > 0 && (
              <div className="text-xs text-amber-300">{semLocal} sem localização (cidade não informada ou não encontrada)</div>
            )}
          </>
        )}
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="todos">Todos os estados</SelectItem>
            {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={vendedor} onValueChange={setVendedor}>
          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="todos">Todos os vendedores</SelectItem>
            {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
