import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, CheckCircle2, Clock, Search } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PesquisaSatisfacaoForm } from '@/components/pos-vendas/PesquisaSatisfacaoForm';

type FiltroStatus = 'todos' | 'pendentes' | 'respondidos';

export default function PosVendasPedidos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [filtro, setFiltro] = useState<FiltroStatus>('pendentes');
  const [busca, setBusca] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Inicializa bucket de anexos (idempotente)
  useEffect(() => {
    supabase.functions.invoke('init-pesquisas-satisfacao-bucket').catch(() => {});
  }, []);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pos-vendas-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('id, numero_pedido, cliente_nome, cliente_telefone, data_entrega, updated_at')
        .eq('etapa_atual', 'pos_vendas')
        .eq('arquivado', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: respondidos = [] } = useQuery({
    queryKey: ['pos-vendas-pesquisas', pedidos.map((p) => p.id)],
    enabled: pedidos.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisas_satisfacao')
        .select('pedido_id')
        .in('pedido_id', pedidos.map((p: any) => p.id));
      if (error) throw error;
      return (data || []).map((r) => r.pedido_id);
    },
  });

  const respondidosSet = useMemo(() => new Set(respondidos), [respondidos]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((p: any) => {
      const respondeu = respondidosSet.has(p.id);
      if (filtro === 'pendentes' && respondeu) return false;
      if (filtro === 'respondidos' && !respondeu) return false;
      if (!termo) return true;
      return (
        (p.cliente_nome || '').toLowerCase().includes(termo) ||
        (p.numero_pedido || '').toLowerCase().includes(termo)
      );
    });
  }, [pedidos, respondidosSet, filtro, busca]);

  const handleFinalizado = () => {
    setPedidoSelecionado(null);
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-pedidos'] });
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-pesquisas'] });
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Pós-Vendas', path: '/pos-vendas' },
          { label: 'Pedidos' },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/pos-vendas')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Pedidos em Pós-Vendas</h1>
          <p className="text-white/50 mt-2">
            Preencha a pesquisa de satisfação. Ao enviar, o pedido é arquivado automaticamente.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por cliente ou número do pedido"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-2">
            {(['pendentes', 'respondidos', 'todos'] as FiltroStatus[]).map((f) => (
              <Button
                key={f}
                variant={filtro === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro(f)}
                className={filtro === f ? '' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}
              >
                {f === 'pendentes' ? 'Pendentes' : f === 'respondidos' ? 'Respondidos' : 'Todos'}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-white/50">Carregando...</p>
        ) : listaFiltrada.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 text-center">
            <ClipboardList className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/60">Nenhum pedido nesta categoria.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {listaFiltrada.map((p: any) => {
              const respondeu = respondidosSet.has(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex items-center gap-4 hover:bg-white/10 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium truncate">{p.cliente_nome}</span>
                      <Badge variant="outline" className="border-white/10 text-white/60">
                        #{p.numero_pedido}
                      </Badge>
                      {respondeu ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Respondido
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )}
                    </div>
                    {p.cliente_telefone && (
                      <p className="text-xs text-white/40 mt-1">{p.cliente_telefone}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={respondeu}
                    onClick={() => setPedidoSelecionado(p)}
                  >
                    {respondeu ? 'Já respondido' : 'Responder pesquisa'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pedidoSelecionado && (
        <PesquisaSatisfacaoForm
          pedido={pedidoSelecionado}
          open={!!pedidoSelecionado}
          onClose={() => setPedidoSelecionado(null)}
          onFinalizado={handleFinalizado}
        />
      )}
    </div>
  );
}