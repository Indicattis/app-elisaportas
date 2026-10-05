import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, Clock, Search, ArrowRight, Eye, ArrowUpNarrowWide, ArrowDownWideNarrow, Calendar, FileText, Archive } from 'lucide-react';
import { ArquivarPedidoModal } from '@/components/pedidos/ArquivarPedidoModal';
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
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [filtro, setFiltro] = useSessionFilters<FiltroStatus>({ key: 'pos-vendas-pedidos-filtro', defaultValue: 'pendentes' });
  const [busca, setBusca] = useSessionFilters<string>({ key: 'pos-vendas-pedidos-busca', defaultValue: '' });
  const [ordenacao, setOrdenacao] = useSessionFilters<Ordenacao>({ key: 'pos-vendas-pedidos-ordenacao', defaultValue: 'desc' });
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [pedidoDetalhes, setPedidoDetalhes] = useState<any | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState<string | null>(null);
  const [followupLoading, setFollowupLoading] = useState<string | null>(null);
  const [pedidoArquivar, setPedidoArquivar] = useState<any | null>(null);

  // Inicializa bucket de anexos (idempotente)
  useEffect(() => {
    supabase.functions.invoke('init-pesquisas-satisfacao-bucket').catch(() => {});
  }, []);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pos-vendas-pedidos', 'v2'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('id, numero_pedido, cliente_nome, cliente_telefone, arquivado, created_at, updated_at, vendas!inner(data_venda, atendente:admin_users!fk_vendas_atendente(nome, foto_perfil_url))')
        .eq('etapa_atual', 'pos_vendas')
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

  const { data: etapasFinalizado = [] } = useQuery({
    queryKey: ['pos-vendas-finalizado', pedidos.map((p) => p.id)],
    enabled: pedidos.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_etapas')
        .select('pedido_id, data_entrada')
        .eq('etapa', 'finalizado')
        .in('pedido_id', pedidos.map((p: any) => p.id));
      if (error) throw error;
      return data || [];
    },
  });

  const { data: followups = [] } = useQuery({
    queryKey: ['pos-vendas-followups', pedidos.map((p) => p.id)],
    enabled: pedidos.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_vendas_followups' as any)
        .select('pedido_id, tentativa, realizado_por, realizado_em')
        .in('pedido_id', pedidos.map((p: any) => p.id));
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: nomesFollowup = [] } = useQuery({
    queryKey: ['pos-vendas-followups-nomes', [...new Set(followups.map((f: any) => f.realizado_por).filter(Boolean))].sort().join(',')],
    enabled: followups.length > 0,
    queryFn: async () => {
      const ids = [...new Set(followups.map((f: any) => f.realizado_por).filter(Boolean))] as string[];
      if (!ids.length) return [];
      const { data } = await supabase.from('admin_users').select('user_id, nome').in('user_id', ids);
      return data || [];
    },
  });

  const nomesMap = useMemo(() => new Map<string, string>((nomesFollowup as any[]).map((u) => [u.user_id, u.nome])), [nomesFollowup]);

  const followupMap = useMemo(() => {
    const m = new Map<string, any[]>();
    followups.forEach((f: any) => {
      const arr = m.get(f.pedido_id) || [];
      arr.push(f);
      m.set(f.pedido_id, arr);
    });
    return m;
  }, [followups]);

  const respondidosSet = useMemo(() => new Set(respondidos), [respondidos]);

  const finalizadoMap = useMemo(() => {
    const map = new Map<string, string>();
    etapasFinalizado.forEach((e: any) => {
      if (e.pedido_id && e.data_entrada) {
        map.set(e.pedido_id, e.data_entrada);
      }
    });
    return map;
  }, [etapasFinalizado]);
  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrada = pedidos.filter((p: any) => {
      const respondeu = respondidosSet.has(p.id);
      if (filtro === 'pendentes' && (respondeu || p.arquivado)) return false;
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

  const pendentesCount = useMemo(() => {
    return pedidos.filter((p: any) => !p.arquivado && !respondidosSet.has(p.id)).length;
  }, [pedidos, respondidosSet]);


  const handleFinalizado = () => {
    setPedidoSelecionado(null);
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-pedidos', 'v2'] });
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-pesquisas'] });
    queryClient.invalidateQueries({ queryKey: ['pos-vendas-finalizado'] });
  };

  const toggleFollowup = async (pedidoId: string, tentativa: number, atual: number) => {
    try {
      setFollowupLoading(pedidoId);
      if (tentativa === atual) {
        const { error } = await supabase.from('pos_vendas_followups' as any).delete().eq('pedido_id', pedidoId).eq('tentativa', tentativa);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pos_vendas_followups' as any).insert({ pedido_id: pedidoId, tentativa } as any);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['pos-vendas-followups'] });
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao atualizar follow-up');
    } finally {
      setFollowupLoading(null);
    }
  };

  const handleArquivar = async () => {
    const p = pedidoArquivar;
    if (!p) return;
    setPedidoArquivar(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const agora = new Date().toISOString();
      const { error } = await supabase.from('pedidos_producao')
        .update({ arquivado: true, data_arquivamento: agora, arquivado_por: user?.id } as any)
        .eq('id', p.id);
      if (error) throw error;
      await supabase.from('pedidos_etapas').update({ data_saida: agora } as any)
        .eq('pedido_id', p.id).eq('etapa', 'pos_vendas').is('data_saida', null);
      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: p.id,
        etapa_origem: 'pos_vendas',
        etapa_destino: 'pos_vendas',
        user_id: user?.id,
        descricao: 'Arquivado após 3 tentativas de follow-up sem sucesso',
      } as any);
      toast.success('Pedido arquivado');
      handleFinalizado();
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao arquivar pedido');
    }
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
    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-start md:items-center">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium shrink-0">
        <Clock className="w-3.5 h-3.5" />
        <span>{pendentesCount} pendente{pendentesCount === 1 ? '' : 's'}</span>
      </div>
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

                  {/* Nome + telefone + datas */}
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
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {p.cliente_telefone && (
                        <p className="text-xs text-white/40 truncate">{p.cliente_telefone}</p>
                      )}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px]">
                        <Calendar className="w-3 h-3" />
                        <span>Pedido: {formatarData(p.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Finalizado: {formatarData(finalizadoMap.get(p.id))}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px]">
                        <ClipboardList className="w-3 h-3" />
                        <span>Venda: {formatarData(p.vendas?.data_venda)}</span>
                      </div>
                    </div>

                  </div>


                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!p.arquivado && (() => {
                      const fus = followupMap.get(p.id) || [];
                      const n = fus.length;
                      return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                          <span className="text-[10px] text-white/50 mr-0.5">Follow-up</span>
                          {[1, 2, 3].map((t) => {
                            const f = fus.find((x: any) => x.tentativa === t);
                            const clicavel = t === n + 1 || t === n;
                            return (
                              <button
                                key={t}
                                type="button"
                                disabled={!clicavel || followupLoading === p.id}
                                onClick={() => toggleFollowup(p.id, t, n)}
                                title={f ? `Tentativa ${t} — ${nomesMap.get(f.realizado_por) || 'Usuário'} em ${format(parseISO(f.realizado_em), 'dd/MM/yyyy HH:mm')}` : `Marcar tentativa ${t}`}
                                className={`w-3.5 h-3.5 rounded-full border transition-all ${f ? 'bg-blue-500 border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.7)]' : 'bg-transparent border-white/30'} ${clicavel ? 'cursor-pointer hover:scale-125' : 'cursor-not-allowed opacity-60'}`}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                    {!p.arquivado && (followupMap.get(p.id)?.length || 0) >= 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPedidoArquivar(p)}
                        className="rounded-full bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/25 gap-1.5"
                      >
                        <Archive className="w-4 h-4" />
                        Arquivar
                      </Button>
                    )}
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
                    {respondeu ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/pos-vendas/pedidos/${p.id}/resposta`)}
                        className="rounded-full gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        Ver resposta
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setPedidoSelecionado(p)}
                        className="rounded-full"
                      >
                        Responder pesquisa
                      </Button>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ArquivarPedidoModal
        open={!!pedidoArquivar}
        onOpenChange={(o) => !o && setPedidoArquivar(null)}
        onConfirmar={handleArquivar}
        pedido={pedidoArquivar}
        descricao={`Foram feitas 3 tentativas de contato sem sucesso. Arquivar o pedido #${pedidoArquivar?.numero_pedido || ''} sem resposta da pesquisa?`}
      />

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