import { useEffect, useState } from 'react';
import { ChevronDown, Edit, Trash2, MapPin, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapaEstadosBrasil } from './MapaEstadosBrasil';
import { useFreteRegiaoLarguras } from '@/hooks/useFreteRegiaoLarguras';
import type { FreteRegiao } from '@/hooks/useFreteRegioes';
import { cn } from '@/lib/utils';

interface Props {
  regiao: FreteRegiao;
  larguras: number[];
  onEdit: () => void;
  onDelete: () => void;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function LarguraRow({ regiaoId, largura, valorAtual, onSave }: {
  regiaoId: string; largura: number; valorAtual: number; onSave: (v: number) => Promise<unknown>;
}) {
  const [val, setVal] = useState(valorAtual ? String(valorAtual) : '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(valorAtual ? String(valorAtual) : ''); }, [valorAtual, regiaoId]);

  const commit = async () => {
    const n = Number((val || '').replace(',', '.')) || 0;
    if (n === valorAtual) return;
    setSaving(true);
    try { await onSave(n); } finally { setSaving(false); }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition">
      <div className="flex items-center gap-2 text-sm text-white/80">
        <Ruler className="h-3.5 w-3.5 text-white/40" />
        <span>{largura.toFixed(2).replace('.', ',')} m</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/40">R$</span>
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          inputMode="decimal"
          placeholder="0,00"
          className={cn('h-8 w-28 text-right bg-white/5 border-white/10 text-white', saving && 'opacity-60')}
        />
      </div>
    </div>
  );
}

export function RegiaoCard({ regiao, larguras, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const { precos, upsertPreco } = useFreteRegiaoLarguras(open ? regiao.id : undefined);
  const precoMap = new Map(precos.map(p => [Number(p.largura), Number(p.valor)]));
  const totalCadastrados = precos.filter(p => Number(p.valor) > 0).length;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
      >
        <div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-4 w-4 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{regiao.nome}</div>
          <div className="text-[11px] text-white/50 mt-0.5">
            {regiao.estados.length} estado{regiao.estados.length !== 1 ? 's' : ''}
            {open && ` · ${totalCadastrados}/${larguras.length} larguras com preço`}
          </div>
        </div>
        <div className="hidden md:flex flex-wrap gap-1 max-w-[40%] justify-end">
          {regiao.estados.slice(0, 8).map(e => (
            <span key={e} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/15 border border-blue-400/30 text-blue-200">{e}</span>
          ))}
          {regiao.estados.length > 8 && <span className="text-[10px] text-white/40">+{regiao.estados.length - 8}</span>}
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <span><Edit className="h-3.5 w-3.5" /></span>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <span><Trash2 className="h-3.5 w-3.5" /></span>
        </Button>
        <ChevronDown className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-white/10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 p-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
            <MapaEstadosBrasil value={regiao.estados} readOnly height={300} />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-2 px-1">Preços por largura</div>
            {larguras.length === 0 ? (
              <div className="text-sm text-white/50 px-3 py-6 text-center">
                Nenhuma largura cadastrada na Tabela de Kits.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {larguras.map(l => (
                  <LarguraRow
                    key={l}
                    regiaoId={regiao.id}
                    largura={l}
                    valorAtual={precoMap.get(l) ?? 0}
                    onSave={(v) => upsertPreco.mutateAsync({ largura: l, valor: v })}
                  />
                ))}
              </div>
            )}
            {larguras.length > 0 && precos.some(p => Number(p.valor) > 0) && (
              <div className="pt-2 mt-2 border-t border-white/5 flex justify-between text-[11px] text-white/50 px-1">
                <span>Média</span>
                <span>{fmt(
                  precos.filter(p => Number(p.valor) > 0).reduce((s, p) => s + Number(p.valor), 0) /
                  Math.max(1, precos.filter(p => Number(p.valor) > 0).length)
                )}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}