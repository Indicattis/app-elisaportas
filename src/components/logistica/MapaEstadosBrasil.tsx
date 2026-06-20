import { useState } from 'react';
import mapData from '@/data/brazilStatesMap.json';
import { cn } from '@/lib/utils';

const ESTADOS_NOMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

interface Props {
  value: string[];
  onChange?: (next: string[]) => void;
  disabledStates?: Record<string, string>; // estado -> nome da região dona
  readOnly?: boolean;
  height?: number;
}

export function MapaEstadosBrasil({ value, onChange, disabledStates = {}, readOnly, height = 480 }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const { width: W, height: H, paths } = mapData as { width: number; height: number; paths: Record<string, string> };
  const selected = new Set(value);

  const toggle = (uf: string) => {
    if (readOnly || !onChange) return;
    if (disabledStates[uf]) return;
    const next = new Set(selected);
    if (next.has(uf)) next.delete(uf); else next.add(uf);
    onChange(Array.from(next));
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {Object.entries(paths).map(([uf, d]) => {
          const isSel = selected.has(uf);
          const isDis = !!disabledStates[uf] && !isSel;
          const isHover = hover === uf;
          return (
            <path
              key={uf}
              d={d}
              onClick={() => toggle(uf)}
              onMouseEnter={() => setHover(uf)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                'transition-colors',
                readOnly ? 'cursor-default' : isDis ? 'cursor-not-allowed' : 'cursor-pointer',
              )}
              style={{
                fill: isSel
                  ? 'rgba(59,130,246,0.55)'
                  : isDis
                    ? 'rgba(255,255,255,0.03)'
                    : isHover
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.05)',
                stroke: isSel ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.18)',
                strokeWidth: isSel || isHover ? 1.2 : 0.6,
              }}
            >
              <title>
                {uf} — {ESTADOS_NOMES[uf] || uf}
                {disabledStates[uf] ? `  (já em "${disabledStates[uf]}")` : ''}
              </title>
            </path>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/70 border border-white/10 backdrop-blur px-2.5 py-1.5 text-xs text-white">
          <div className="font-medium">{hover} — {ESTADOS_NOMES[hover]}</div>
          {disabledStates[hover] && <div className="text-white/60 text-[10px] mt-0.5">já em "{disabledStates[hover]}"</div>}
        </div>
      )}
    </div>
  );
}