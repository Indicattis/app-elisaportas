import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, Clock, Search, ArrowRight, Eye, ArrowUpNarrowWide, ArrowDownWideNarrow, Calendar } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PesquisaSatisfacaoForm } from '@/components/pos-vendas/PesquisaSatisfacaoForm';
import { PedidoDetalhesSheet } from '@/components/pedidos/PedidoDetalhesSheet';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSessionFilters } from '@/hooks/useSessionFilters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FiltroStatus = 'todos' | 'pendentes' | 'respondidos';
type Ordenacao = 'desc' | 'asc';

function formatarData(data: string | null | undefined): string {
  if (!data) return '-';
  try {
    return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

function getInicial(nome: string) {
  return (nome?.trim()?.charAt(0) || '?').toUpperCase();
}


export default function PosVendasPedidos() {
  const queryClient = useQueryClient();

  const [filtro, setFiltro] = useSessionFilters<FiltroStatus>({ key: 'pos-vendas-pedidos-filtro', defaultValue: 'pendentes' });
  const [busca, setBusca] = useSessionFilters<string>({ key: 'pos-vendas-pedidos-busca', defaultValue: '' });
  const [ordenacao, setOrdenacao] = useSessionFilters<Ordenacao>({ key: 'pos-vendas-pedidos-ordenacao', defaultValue: 'desc' });
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [pedidoDetalhes, setPedidoDetalhes] = useState<any | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState<string | null>(null);

  // Inicializa bucket de anexos (idempotente)
  useEffect(() => {
    supabase.functions.invoke('init-pesquisas-satisfacao-bucket').catch(() => {});
  }, []);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pos-vendas-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('id, numero_pedido, cliente_nome, cliente_telefone, data_entrega, created_at, updated_at, vendas!inner(atendente:admin_users!fk_vendas_atendente(nome, foto_perfil_url))')
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
    const filtrada = pedidos.filter((p: any) => {
      const respondeu = respondidosSet.has(p.id);
      if (filtro === 'pendentes' && respondeu) return false;
      if (filtro === 'respondidos' && !respondeu) return false;
      if (!termo) return true;
      return (
        (p.cliente_nome || '').toLowerCase().includes(termo) ||
        (p.numero_pedido || '').toLowerCase().includes(termo)
      );
    });
    const ordenada = [...filtrada].sort((a: any, b: any) => {
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
      return ordenacao === 'asc' ? ta - tb : tb - ta;
    });
    return ordenada;
  }, [pedidos, respondidosSet, filtro, busca, ordenacao]);

  const handleFinalizado = () => {
    setPedidoSelecionado(null);
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-pedidos'] });
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-pesquisas'] });
  };

  const handleVerPedido = async (pedidoId: string) => {
    try {
      setLoadingDetalhes(pedidoId);
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('*, vendas(*)')
        .eq('id', pedidoId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error('Pedido não encontrado');
        return;
      }
      setPedidoDetalhes(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar pedido');
    } finally {
      setLoadingDetalhes(null);
    }
  };

  const filtrosHeader = (
    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
      <div className="relative flex-1 md:w-[260px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente ou número do pedido"
          className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOrdenacao(ordenacao === 'desc' ? 'asc' : 'desc')}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10 gap-1.5"
          title={ordenacao === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
        >
          {ordenacao === 'desc' ? (
            <>
              <ArrowDownWideNarrow className="w-4 h-4" />
              Mais recentes
            </>
          ) : (
            <>
              <ArrowUpNarrowWide className="w-4 h-4" />
              Mais antigos
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <MinimalistLayout
      title="Pedidos em Pós-Vendas"
      subtitle="Preencha a pesquisa de satisfação. Ao enviar, o pedido é arquivado automaticamente."
      backPath="/pos-vendas"
      headerActions={filtrosHeader}
      fullWidth={false}
    >
      <div className="relative z-10">
        {isLoading ? (

          <p className="text-white/50">Carregando...</p>
        ) : listaFiltrada.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 text-center">
            <ClipboardList className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/60">Nenhum pedido nesta categoria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listaFiltrada.map((p: any, index: number) => {
              const respondeu = respondidosSet.has(p.id);
              const carregando = loadingDetalhes === p.id;
              const vendedor = p.vendas?.atendente;
              const vendedorFoto = vendedor?.foto_perfil_url;
              const vendedorNome = vendedor?.nome || p.cliente_nome;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  className="group relative flex items-center gap-4 pl-3 pr-3 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {vendedorFoto ? (
                      <img
                        src={vendedorFoto}
                        alt={vendedorNome}
                        title={vendedorNome}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-lg"
                      />
                    ) : (
                      <div
                        title={vendedorNome}
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm border-2 border-white/20 shadow-lg bg-gradient-to-br from-blue-500 to-blue-700"
                      >
                        {getInicial(vendedorNome)}
                      </div>
                    )}
                  </div>

                  {/* Nome + telefone */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-semibold truncate text-sm">{p.cliente_nome}</h4>
                      <Badge variant="outline" className="border-white/10 text-white/60 text-[10px]">
                        #{p.numero_pedido}
                      </Badge>
                      {respondeu ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Respondido
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )}
                    </div>
                    {p.cliente_telefone && (
                      <p className="text-xs text-white/40 mt-0.5 truncate">{p.cliente_telefone}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={carregando}
                      onClick={() => handleVerPedido(p.id)}
                      className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      Ver pedido
                    </Button>
                    <Button
                      size="sm"
                      disabled={respondeu}
                      onClick={() => setPedidoSelecionado(p)}
                      className="rounded-full"
                    >
                      {respondeu ? 'Já respondido' : 'Responder pesquisa'}
                    </Button>
                  </div>

                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
                </motion.div>
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

      {pedidoDetalhes && (
        <PedidoDetalhesSheet
          pedido={pedidoDetalhes}
          open={!!pedidoDetalhes}
          onOpenChange={(open) => !open && setPedidoDetalhes(null)}
        />
      )}
    </MinimalistLayout>
  );
}