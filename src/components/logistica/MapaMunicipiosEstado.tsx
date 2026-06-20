import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const UF_IBGE: Record<string, number> = {
  AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52,
  MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22,
  RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17,
};

export const normalizeCity = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

type Feature = {
  properties: { name?: string; nome?: string; id?: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
};

interface Bounds { minX: number; minY: number; maxX: number; maxY: number; }

const cache = new Map<string, Feature[]>();

async function loadEstado(uf: string): Promise<Feature[]> {
  const cached = cache.get(uf);
  if (cached) return cached;
  const code = UF_IBGE[uf];
  if (!code) throw new Error(`UF ${uf} desconhecida`);
  const url = `https://cdn.jsdelivr.net/gh/tbrugz/geodata-br@master/geojson/geojs-${code}-mun.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar mapa de ${uf}`);
  const json = await res.json();
  cache.set(uf, json.features || []);
  return json.features || [];
}

function computeBounds(features: Feature[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) for (const [x, y] of ring) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function project(geometry: Feature['geometry'], b: Bounds, W: number, H: number): string {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const sx = W / (b.maxX - b.minX);
  const sy = H / (b.maxY - b.minY);
  const s = Math.min(sx, sy);
  const ox = (W - (b.maxX - b.minX) * s) / 2;
  const oy = (H - (b.maxY - b.minY) * s) / 2;
  return polys.map((poly: any[]) =>
    poly.map((ring: any[]) =>
      'M' + ring.map(([x, y]: [number, number]) =>
        `${(ox + (x - b.minX) * s).toFixed(2)},${(oy + (b.maxY - y) * s).toFixed(2)}`
      ).join('L') + 'Z'
    ).join('')
  ).join('');
}

export interface CidadeRef { id: string; nome: string; }

interface Props {
  estado: string;
  cidadesValidas: CidadeRef[];                 // existentes em frete_cidades
  selectedIds: Set<string>;
  onToggle: (cidade: CidadeRef) => void;
  disabledIds?: Map<string, string>;           // cidadeId -> nome de outra região
  readOnly?: boolean;
  height?: number;
}

export function MapaMunicipiosEstado({
  estado, cidadesValidas, selectedIds, onToggle, disabledIds, readOnly, height = 460,
}: Props) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; status: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setFeatures(null);
    loadEstado(estado)
      .then(f => { if (alive) { setFeatures(f); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [estado]);

  const validMap = useMemo(() => {
    const m = new Map<string, CidadeRef>();
    cidadesValidas.forEach(c => m.set(normalizeCity(c.nome), c));
    return m;
  }, [cidadesValidas]);

  const W = 800, H = height;

  const paths = useMemo(() => {
    if (!features) return [];
    const b = computeBounds(features);
    return features.map(f => {
      const name = f.properties.name || f.properties.nome || '';
      const ref = validMap.get(normalizeCity(name));
      return { name, ref, d: project(f.geometry, b, W, H) };
    });
  }, [features, validMap, H]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-2 text-white/60 text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          Carregando municípios de {estado}…
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="text-sm text-red-300/80 p-4 text-center">{error}</div>;
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {paths.map((p, i) => {
          const isValid = !!p.ref;
          const isSel = isValid && selectedIds.has(p.ref!.id);
          const conflict = isValid ? disabledIds?.get(p.ref!.id) : undefined;
          const isDis = !!conflict && !isSel;
          const clickable = !readOnly && isValid && !isDis;
          return (
            <path
              key={i}
              d={p.d}
              onMouseEnter={() => setHover({
                name: p.name,
                status: !isValid
                  ? 'não cadastrada em frete'
                  : conflict ? `já em "${conflict}"`
                  : isSel ? 'selecionada'
                  : 'disponível',
              })}
              onMouseLeave={() => setHover(null)}
              onClick={() => clickable && onToggle(p.ref!)}
              className={cn(
                'transition-colors',
                !clickable ? 'cursor-not-allowed' : 'cursor-pointer',
              )}
              style={{
                fill: isSel
                  ? 'rgba(59,130,246,0.6)'
                  : !isValid
                    ? 'rgba(255,255,255,0.025)'
                    : isDis
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(255,255,255,0.07)',
                stroke: isSel ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.18)',
                strokeWidth: isSel ? 0.9 : 0.4,
              }}
            >
              <title>{p.name}</title>
            </path>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/75 border border-white/10 backdrop-blur px-2.5 py-1.5 text-xs text-white">
          <div className="font-medium">{hover.name}</div>
          <div className="text-white/60 text-[10px] mt-0.5">{hover.status}</div>
        </div>
      )}
    </div>
  );
}
