import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Lock, ClipboardList, Calendar, Package, PackageCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { label: 'Montagem de Pedidos', icon: PackageCheck, path: '/fabrica/montagem-pedidos' },
  { label: 'Ordens por Pedido', icon: ClipboardList, path: '/fabrica/ordens-pedidos' },
  { label: 'Cronograma Produção', icon: Calendar, path: '/fabrica/cronograma-producao' },
  { label: 'Configurar Itens', icon: Package, path: '/fabrica/produtos' },
];

const routeKeyMap: Record<string, string> = {
  '/fabrica/montagem-pedidos': 'administrativo_hub',
  '/fabrica/ordens-pedidos': 'fabrica_ordens_pedidos',
  '/fabrica/cronograma-producao': 'fabrica_cronograma_producao',
  '/fabrica/produtos': 'fabrica_produtos',
};

export default function FabricaHub() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const { user, hasBypassPermissions } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { data: userAccess = [], isLoading: isLoadingAccess } = useQuery({
    queryKey: ['user-fabrica-access', user?.id, hasBypassPermissions],
    queryFn: async () => {
      if (!user?.id || hasBypassPermissions) return [];
      const routeKeys = Object.values(routeKeyMap);
      const { data, error } = await supabase
        .from('user_route_access')
        .select('route_key')
        .eq('user_id', user.id)
        .eq('can_access', true)
        .in('route_key', routeKeys);
      
      if (error) {
        console.error('Erro ao buscar permissões:', error);
        return [];
      }
      return data?.map(r => r.route_key) || [];
    },
    enabled: !!user?.id && !hasBypassPermissions,
  });

  const hasAccess = (path: string): boolean => {
    if (hasBypassPermissions) return true;
    if (isLoadingAccess) return true; // Mostra como habilitado enquanto carrega
    const routeKey = routeKeyMap[path];
    if (!routeKey) return true;
    return userAccess.includes(routeKey);
  };

  const handleMenuClick = (path: string, canAccess: boolean) => {
    if (canAccess) {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Animação de partículas com fade-in */}
      <DelayedParticles />
      
      {/* Breadcrumb */}
      <AnimatedBreadcrumb 
        items={[
          { label: "Home", path: "/home" },
          { label: "Fábrica" }
        ]} 
        mounted={mounted} 
      />

      {/* Menu de Perfil Flutuante */}
      {/* Botão Voltar */}
      <button
        onClick={() => navigate('/home')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                   hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms'
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>


      {/* ========== VERSÃO MOBILE ========== */}
      <div className="md:hidden relative z-10 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md">
        {/* Lista de botões */}
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 100 + index * 80;
            const canAccess = hasAccess(item.path);
            
            return (
              <div
                key={item.label}
                className={`p-1.5 rounded-xl backdrop-blur-xl border transition-all duration-300
                           ${canAccess 
                             ? 'bg-white/5 border-white/10' 
                             : 'bg-zinc-900/50 border-zinc-800/50'}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => handleMenuClick(item.path, canAccess)}
                  disabled={!canAccess}
                  className={`w-full h-12 rounded-lg flex items-center gap-4 px-5 font-medium 
                             border transition-all duration-300 relative
                             ${canAccess 
                               ? 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] text-white shadow-lg shadow-blue-500/20 border-blue-400/30' 
                               : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30 cursor-not-allowed'}`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${canAccess ? '' : 'opacity-50'}`} strokeWidth={1.5} />
                    {!canAccess && (
                      <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-zinc-400" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                  {!canAccess && (
                    <Lock className="w-4 h-4 ml-auto text-zinc-500" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== VERSÃO DESKTOP ========== */}
      <div className="hidden md:flex relative z-10 flex-col items-center justify-center px-6 w-full max-w-md">
        {/* Lista de botões */}
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 100 + index * 80;
            const canAccess = hasAccess(item.path);
            
            return (
              <div
                key={item.label}
                className={`p-1.5 rounded-xl backdrop-blur-xl border transition-all duration-300
                           ${canAccess 
                             ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                             : 'bg-zinc-900/50 border-zinc-800/50'}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => handleMenuClick(item.path, canAccess)}
                  disabled={!canAccess}
                  className={`w-full h-14 rounded-lg flex items-center gap-4 px-5 font-medium 
                             border transition-all duration-300 relative
                             ${canAccess 
                               ? 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] text-white shadow-lg shadow-blue-500/20 border-blue-400/30' 
                               : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30 cursor-not-allowed'}`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${canAccess ? '' : 'opacity-50'}`} strokeWidth={1.5} />
                    {!canAccess && (
                      <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-zinc-400" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                  {!canAccess && (
                    <Lock className="w-4 h-4 ml-auto text-zinc-500" />
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
