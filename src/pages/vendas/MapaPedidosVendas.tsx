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
  html: `<div class="custom-instalacao-marker" style="background-color:#22c55e;border-color:white;border-width:2px;width:12px;height:12px;"></div>`,
  className: "custom-instalacao-marker-container",
  iconSize: L.point(12, 12),
  iconAnchor: L.point(6, 6),
});

const createClusterIcon = (cluster: any) =>
  L.divIcon({
    html: `<span class="instalacao-cluster-icon">${cluster.getChildCount()}</span>`,
    className: "custom-instalacao-cluster",
    iconSize: L.point(32, 32, true),
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
      <MapContainer center={[-14.235, -51.9253]} zoom={4} style={{ height: "100%", width: "100%" }} className="leaflet-container z-0">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterIcon} spiderfyOnMaxZoom showCoverageOnHover={false} zoomToBoundsOnClick maxClusterRadius={50}>
          {noMapa.map((p) => (
            <Marker key={p.id} position={[p.lat! + jitter(p.id), p.lng! + jitter(p.id + "x")]} icon={icon}>
              <Popup className="custom-popup" minWidth={240}>
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
