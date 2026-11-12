import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Loader2, Search, Unlink } from 'lucide-react';
import { toast } from 'sonner';

const fmtBRL = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

export function VinculoVendaVisita({ visitaId }: { visitaId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const { data: vinculo, isLoading } = useQuery({
    queryKey: ['visita-venda-vinculo', visitaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('visitas_tecnicas_agendadas')
        .select('venda_id, vendas:venda_id(id, cliente_nome, data_venda, valor_venda, pedidos_producao(numero_pedido))')
        .eq('id', visitaId)
        .maybeSingle();
      return (data as any)?.vendas || null;
    },
  });

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['visita-venda-busca', busca],
    enabled: open && busca.trim().length >= 2,
    queryFn: async () => {
      const termo = busca.trim();
      const sel = 'id, cliente_nome, cliente_telefone, data_venda, valor_venda, pedidos_producao(numero_pedido)';
      const tel = termo.replace(/\D/g, '');
      let filtro = `cliente_nome.ilike.%${termo.replace(/[,()]/g, ' ')}%`;
      if (tel.length >= 4) filtro += `,cliente_telefone.ilike.%${tel}%`;
      const [porNome, porPedido] = await Promise.all([
        supabase.from('vendas').select(sel).or(filtro).order('created_at', { ascending: false }).limit(30),
        supabase.from('pedidos_producao').select('venda_id').ilike('numero_pedido', `%${termo}%`).limit(10),
      ]);
      const lista = [...((porNome.data as any[]) || [])];
      const ids = ((porPedido.data as any[]) || []).map((p) => p.venda_id).filter((id) => id && !lista.some((v) => v.id === id));
      if (ids.length) {
        const { data } = await supabase.from('vendas').select(sel).in('id', ids);
        lista.unshift(...((data as any[]) || []));
      }
      return lista;
    },
  });

  const salvar = useMutation({
    mutationFn: async (vendaId: string | null) => {
      const { error } = await supabase.from('visitas_tecnicas_agendadas').update({ venda_id: vendaId } as any).eq('id', visitaId);
      if (error) throw error;
    },
    onSuccess: (_, vendaId) => {
      toast.success(vendaId ? 'Visita vinculada à venda' : 'Vínculo removido');
      qc.invalidateQueries({ queryKey: ['visita-venda-vinculo', visitaId] });
      qc.invalidateQueries({ queryKey: ['venda-tem-medicao'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar vínculo'),
  });

  const numPedido = (v: any) => (Array.isArray(v?.pedidos_producao) ? v.pedidos_producao[0]?.numero_pedido : v?.pedidos_producao?.numero_pedido);

  return (
    <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-sm text-white/80 min-w-0">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : vinculo ? (
          <>Vinculada à venda de <b className="text-white">{vinculo.cliente_nome}</b>
            {numPedido(vinculo) && <> · Pedido #{numPedido(vinculo)}</>}
            <span className="text-white/40"> · {fmtData(vinculo.data_venda)}</span></>
        ) : <span className="text-white/50">Sem venda vinculada</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setOpen(true)}>
          <Link2 className="w-4 h-4 mr-1" /> {vinculo ? 'Trocar' : 'Vincular a venda'}
        </Button>
        {vinculo && (
          <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-red-300 hover:bg-red-500/10" disabled={salvar.isPending} onClick={() => salvar.mutate(null)}>
            <Unlink className="w-4 h-4 mr-1" /> Desvincular
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 text-white max-w-lg">
          <DialogHeader><DialogTitle>Vincular a uma venda</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input autoFocus className="pl-9 bg-white/5 border-white/10 text-white" placeholder="Nome do cliente, telefone ou nº do pedido"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {isFetching && <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin inline" /></div>}
            {!isFetching && busca.trim().length >= 2 && resultados.length === 0 && (
              <div className="text-sm text-white/50 text-center py-4">Nenhuma venda encontrada</div>
            )}
            {resultados.map((v: any) => (
              <button key={v.id} disabled={salvar.isPending} onClick={() => salvar.mutate(v.id)}
                className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-blue-500/15 hover:border-blue-400/30 transition">
                <div className="text-sm font-medium">{v.cliente_nome}</div>
                <div className="text-xs text-white/50">
                  {fmtData(v.data_venda)} · {fmtBRL(Number(v.valor_venda))}{numPedido(v) && ` · Pedido #${numPedido(v)}`}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
