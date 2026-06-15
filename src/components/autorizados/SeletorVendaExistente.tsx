import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface VendaSelecionada {
  id: string;
  cliente_nome: string;
  cliente_cidade: string | null;
  cliente_estado: string | null;
  data_venda: string | null;
}

interface Props {
  onSelect: (venda: VendaSelecionada) => void;
  vendaSelecionada?: VendaSelecionada | null;
}

const formatData = (d: string | null) => {
  if (!d) return '—';
  try {
    const date = new Date(d.includes('T') ? d : `${d}T12:00:00`);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};

export function SeletorVendaExistente({ onSelect, vendaSelecionada }: Props) {
  const [vendas, setVendas] = useState<VendaSelecionada[]>([]);
  const [vendasComAcordo, setVendasComAcordo] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase
        .from('vendas')
        .select('id, cliente_nome, cidade, estado, data_venda, is_rascunho')
        .order('data_venda', { ascending: false })
        .limit(500),
      supabase
        .from('acordos_instalacao_autorizados')
        .select('venda_id' as any)
        .not('venda_id' as any, 'is', null),
    ]).then(([vendasRes, acordosRes]) => {
      if (cancelled) return;
      const lista: VendaSelecionada[] = ((vendasRes.data as any[]) || [])
        .filter((v) => !v.is_rascunho)
        .map((v) => ({
          id: v.id,
          cliente_nome: v.cliente_nome || '—',
          cliente_cidade: v.cidade ?? null,
          cliente_estado: v.estado ?? null,
          data_venda: v.data_venda ?? null,
        }));
      setVendas(lista);
      const ids = new Set<string>(
        ((acordosRes.data as any[]) || [])
          .map((a) => a.venda_id)
          .filter(Boolean)
      );
      setVendasComAcordo(ids);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return vendas.filter((v) => {
      if (vendasComAcordo.has(v.id)) return false;
      if (!termo) return true;
      return (
        (v.cliente_nome || '').toLowerCase().includes(termo) ||
        (v.cliente_cidade || '').toLowerCase().includes(termo)
      );
    }).slice(0, 100);
  }, [vendas, busca, vendasComAcordo]);

  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
      <Label className="text-sm font-medium text-white/70">VINCULAR A VENDA <span className="text-red-400">*</span></Label>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
        <Input
          placeholder="Buscar por cliente ou cidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-7 h-9 bg-zinc-800 border-zinc-700 text-white text-sm"
        />
      </div>

      {vendaSelecionada && (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30">
          <span className="text-xs text-white/90 truncate">
            <strong>{vendaSelecionada.cliente_nome}</strong>
            {vendaSelecionada.cliente_cidade && ` · ${vendaSelecionada.cliente_cidade}/${vendaSelecionada.cliente_estado ?? ''}`}
            {` · ${formatData(vendaSelecionada.data_venda)}`}
          </span>
          <button
            type="button"
            onClick={() => onSelect({ id: '', cliente_nome: '', cliente_cidade: null, cliente_estado: null, data_venda: null })}
            className="text-xs text-red-300 hover:text-red-200 shrink-0"
          >
            Remover vínculo
          </button>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto rounded-md border border-white/10 divide-y divide-white/5">
        {loading ? (
          <div className="py-6 text-center text-xs text-white/40">Carregando vendas...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-6 text-center text-xs text-white/40">Nenhuma venda encontrada</div>
        ) : (
          filtrados.map((v) => {
            const selecionado = vendaSelecionada?.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center justify-between gap-2 ${
                  selecionado ? 'bg-blue-500/10' : ''
                }`}
              >
                <span className="text-white/90 truncate">
                  {v.cliente_nome}
                  {v.cliente_cidade && (
                    <span className="text-white/50"> · {v.cliente_cidade}/{v.cliente_estado ?? ''}</span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/60">
                  {formatData(v.data_venda)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}