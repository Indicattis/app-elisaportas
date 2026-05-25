import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, ArrowLeft, ShieldCheck, Users, ClipboardCheck, ShoppingBag, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { label: 'Aprovações Pedidos', icon: ClipboardCheck, path: '/direcao/aprovacoes/pedidos' },
  { label: 'Aprovações Fábrica', icon: Factory, path: '/direcao/aprovacoes/fabrica' },
  { label: 'Aprovações Compras', icon: ShoppingBag, path: '/direcao/aprovacoes/compras' },
  { label: 'Aprovações Autorizados', icon: Users, path: '/direcao/aprovacoes/autorizados' },
  { label: 'Aprovações Representantes', icon: UserCheck, path: '/direcao/aprovacoes/representantes' },
  { label: 'Autorizados', icon: Users, path: '/direcao/autorizados' },
];

export default function DirecaoAprovacoesHub() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  const { data: countPedidos } = useQuery({
    queryKey: ['aprovacoes-pedidos-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('pedidos_producao')
        .select('*', { count: 'exact', head: true })
        .eq('etapa_atual', 'aprovacao_diretor')
        .eq('arquivado', false);
      return count || 0;
    },
  });

  const { data: countFabrica } = useQuery({
    queryKey: ['aprovacoes-fabrica-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('pedidos_producao')
        .select('*', { count: 'exact', head: true })
        .eq('etapa_atual', 'aprovacao_ceo')
        .eq('arquivado', false);
      return count || 0;
    },
  });

  const { data: countAutorizados } = useQuery({
    queryKey: ['aprovacoes-autorizados-count'],
    queryFn: async () => {
      const { count } = await (supabase
        .from('acordos_instalacao_autorizados')
        .select('*', { count: 'exact', head: true }) as any)
        .eq('aprovado_direcao', false);
      return count || 0;
    },
  });

  const { data: countCompras } = useQuery({
    queryKey: ['aprovacoes-compras-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('requisicoes_compra')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente_aprovacao');
      return count || 0;
    },
  });

  const { data: countRepresentantes } = useQuery({
    queryKey: ['aprovacoes-representantes-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_usuario', 'representante')
        .eq('ativo', false);
      return count || 0;
    },
  });

  const countsMap: Record<string, number> = {
    '/direcao/aprovacoes/pedidos': countPedidos || 0,
    '/direcao/aprovacoes/fabrica': countFabrica || 0,
    '/direcao/aprovacoes/compras': countCompras || 0,
    '/direcao/aprovacoes/autorizados': (countAutorizados as number) || 0,
    '/direcao/aprovacoes/representantes': countRepresentantes || 0,
  };
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <DelayedParticles />
      
      <AnimatedBreadcrumb 
        items={[
          { label: "Home", path: "/home" },
          { label: "Direção", path: "/direcao" },
          { label: "Aprovações" }
        ]} 
        mounted={mounted} 
      />
      <button
        onClick={() => navigate('/direcao')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                   hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms'
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md">
        {/* Header */}
        <div 
          className="mb-8 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 50ms'
          }}
        >
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Aprovações</h1>
          <p className="text-sm text-white/50 mt-1">Aprove pedidos e solicitações</p>
        </div>

        {/* Lista de botões */}
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 100 + index * 80;
            
            return (
              <div
                key={item.label}
                className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                           transition-all duration-300"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => navigate(item.path)}
                  className="w-full h-12 rounded-lg
                             bg-gradient-to-r from-orange-500 to-orange-700
                             hover:from-orange-400 hover:to-orange-600
                             active:scale-[0.98]
                             flex items-center gap-4 px-5
                             text-white font-medium 
                             shadow-lg shadow-orange-500/20
                             border border-orange-400/30
                             transition-all duration-300"
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {(countsMap[item.path] || 0) > 0 && (
                    <span className="ml-auto bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[24px] text-center">
                      {countsMap[item.path]}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
