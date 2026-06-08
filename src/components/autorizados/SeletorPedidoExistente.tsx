import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export interface PedidoSelecionado {
  id: string;
  numero_pedido: string | number;
  cliente_nome: string;
  etapa_atual: string | null;
}

const ETAPAS: Array<{ value: string; label: string }> = [
  { value: 'todas', label: 'Todas as etapas' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'embalagem', label: 'Embalagem' },
  { value: 'inspecao_qualidade', label: 'Inspeção qualidade' },
  { value: 'aguardando_cliente', label: 'Aguardando cliente' },
  { value: 'instalacoes', label: 'Instalações' },
  { value: 'correcoes', label: 'Correções' },
  { value: 'finalizado', label: 'Finalizado' },
];

const ETAPA_LABEL: Record<string, string> = Object.fromEntries(
  ETAPAS.filter(e => e.value !== 'todas').map(e => [e.value, e.label])
);

interface Props {
  onSelect: (pedido: PedidoSelecionado) => void;
  pedidoSelecionado?: PedidoSelecionado | null;
}

export function SeletorPedidoExistente({ onSelect, pedidoSelecionado }: Props) {
  const [pedidos, setPedidos] = useState<PedidoSelecionado[]>([]);
  const [pedidosComAcordo, setPedidosComAcordo] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState('todas');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase
        .from('pedidos_producao')
        .select('id, numero_pedido, cliente_nome, etapa_atual')
        .order('numero_pedido', { ascending: false })
        .limit(500),
      supabase
        .from('acordos_instalacao_autorizados')
        .select('pedido_id' as any)
        .not('pedido_id' as any, 'is', null),
    ]).then(([pedidosRes, acordosRes]) => {
      if (cancelled) return;
      if (!pedidosRes.error && pedidosRes.data) setPedidos(pedidosRes.data as any);
      const ids = new Set<string>(
        ((acordosRes.data as any[]) || [])
          .map((a) => a.pedido_id)
          .filter(Boolean)
      );
      setPedidosComAcordo(ids);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter(p => {
      if (pedidosComAcordo.has(p.id)) return false;
      if (etapa !== 'todas' && p.etapa_atual !== etapa) return false;
      if (!termo) return true;
      return (
        String(p.numero_pedido).toLowerCase().includes(termo) ||
        (p.cliente_nome || '').toLowerCase().includes(termo)
      );
    }).slice(0, 100);
  }, [pedidos, etapa, busca, pedidosComAcordo]);

  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
      <Label className="text-sm font-medium text-white/70">VINCULAR A PEDIDO <span className="text-red-400">*</span></Label>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-7 h-9 bg-zinc-800 border-zinc-700 text-white text-sm"
          />
        </div>
        <Select value={etapa} onValueChange={setEtapa}>
          <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {ETAPAS.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pedidoSelecionado && (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30">
          <span className="text-xs text-white/90">
            Pedido <strong>#{pedidoSelecionado.numero_pedido}</strong> · {pedidoSelecionado.cliente_nome}
          </span>
          <button
            type="button"
            onClick={() => onSelect({ id: '', numero_pedido: '', cliente_nome: '', etapa_atual: null })}
            className="text-xs text-red-300 hover:text-red-200"
          >
            Remover vínculo
          </button>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto rounded-md border border-white/10 divide-y divide-white/5">
        {loading ? (
          <div className="py-6 text-center text-xs text-white/40">Carregando pedidos...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-6 text-center text-xs text-white/40">Nenhum pedido encontrado</div>
        ) : (
          filtrados.map(p => {
            const selecionado = pedidoSelecionado?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center justify-between gap-2 ${
                  selecionado ? 'bg-blue-500/10' : ''
                }`}
              >
                <span className="text-white/90 truncate">
                  <span className="text-white/50">#{p.numero_pedido}</span> · {p.cliente_nome || '—'}
                </span>
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/60">
                  {p.etapa_atual ? (ETAPA_LABEL[p.etapa_atual] ?? p.etapa_atual) : '—'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}