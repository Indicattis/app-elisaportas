import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Search, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Input } from '@/components/ui/input';

interface PedidoVisita {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  venda_id: string | null;
  ficha_visita_url: string;
  ficha_visita_nome: string | null;
  created_at: string;
}

interface GrupoVenda {
  key: string;
  clienteNome: string;
  vendaId: string | null;
  pedidos: PedidoVisita[];
}

export default function VisitasTecnicas() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['visitas-tecnicas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('id, numero_pedido, cliente_nome, venda_id, ficha_visita_url, ficha_visita_nome, created_at')
        .not('ficha_visita_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PedidoVisita[];
    },
  });

  // Agrupar por venda_id (ou cliente_nome)
  const grupos: GrupoVenda[] = (() => {
    const map = new Map<string, GrupoVenda>();
    for (const p of pedidos) {
      const key = p.venda_id || `sem-venda-${p.cliente_nome}`;
      if (!map.has(key)) {
        map.set(key, { key, clienteNome: p.cliente_nome, vendaId: p.venda_id, pedidos: [] });
      }
      map.get(key)!.pedidos.push(p);
    }
    return Array.from(map.values());
  })();

  const gruposFiltrados = busca.trim()
    ? grupos.filter(g => g.clienteNome.toLowerCase().includes(busca.toLowerCase()))
    : grupos;

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Visitas Técnicas' },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/vendas')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                   hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms',
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div
        className="relative z-10 w-full max-w-3xl px-4 pt-20 pb-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms',
        }}
      >
        {/* Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <p className="text-center text-white/40 py-20">
            {busca ? 'Nenhum resultado encontrado.' : 'Nenhuma ficha de visita técnica encontrada.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {gruposFiltrados.map(grupo => {
              const isOpen = expandidos.has(grupo.key);
              return (
                <div
                  key={grupo.key}
                  className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpandido(grupo.key)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                        <FileText className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">{grupo.clienteNome}</span>
                        <span className="text-white/40 text-xs ml-2">
                          ({grupo.pedidos.length} {grupo.pedidos.length === 1 ? 'ficha' : 'fichas'})
                        </span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/10 px-4 py-2 flex flex-col gap-2">
                      {grupo.pedidos.map(pedido => (
                        <a
                          key={pedido.id}
                          href={pedido.ficha_visita_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          <div className="flex flex-col">
                            <span className="text-white/80 text-sm">
                              Pedido #{pedido.numero_pedido}
                            </span>
                            <span className="text-white/40 text-xs">
                              {pedido.ficha_visita_nome || 'Ficha de visita'}
                            </span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-blue-400 transition-colors" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
