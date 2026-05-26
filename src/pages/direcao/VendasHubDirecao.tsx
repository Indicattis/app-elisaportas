import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, BookOpen, Users, ExternalLink, ArrowLeft, Lock } from 'lucide-react';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { useBulkRouteAccess } from '@/hooks/useBulkRouteAccess';

const menuItems = [
  { label: 'Todas as Vendas', icon: ShoppingCart, path: '/direcao/vendas/todas', routePrefix: 'direcao_vendas' },
  { label: 'Tabela de Preços', icon: DollarSign, path: '/direcao/vendas/tabela-precos', routePrefix: 'direcao_tabela_precos' },
  { label: 'Regras de Vendas', icon: BookOpen, path: '/direcao/vendas/regras-vendas', routePrefix: 'direcao_regras_vendas' },
  { label: 'Clientes', icon: Users, path: '/direcao/vendas/clientes', routePrefix: 'direcao_vendas' },
  { label: 'CRM', icon: ExternalLink, path: 'https://crm.elisaportas.com', external: true as const, variant: 'slate' as const },
];

export default function VendasHubDirecao() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  const prefixes = menuItems.filter(i => !(i as any).external && i.routePrefix).map(i => i.routePrefix!);
  const { data: accessMap } = useBulkRouteAccess(prefixes);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const renderButton = (item: typeof menuItems[number], index: number) => {
    const Icon = item.icon;
    const delay = 100 + index * 80;
    const external = (item as any).external as boolean | undefined;
    const hasAccess = external || !item.routePrefix || accessMap?.[item.routePrefix] !== false;
    const isDisabled = !external && !hasAccess;
    const variant = (item as any).variant as 'slate' | undefined;

    return (
      <div
        key={item.label}
        className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
          transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        }}
      >
        <button
          onClick={() => {
            if (isDisabled) return;
            external ? window.open(item.path, '_blank') : navigate(item.path);
          }}
          disabled={isDisabled}
          className={`w-full h-12 rounded-lg flex items-center gap-4 px-5 font-medium transition-all duration-300 ${
            isDisabled
              ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white/30 cursor-not-allowed border border-gray-600/30'
              : variant === 'slate'
                ? 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg shadow-slate-700/20 border border-slate-500/30 hover:from-slate-600 hover:to-slate-800 text-white active:scale-[0.98]'
                : 'bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 border border-blue-400/30 hover:from-blue-400 hover:to-blue-600 text-white active:scale-[0.98]'
          }`}
        >
          {isDisabled ? <Lock className="w-4 h-4" strokeWidth={1.5} /> : <Icon className="w-5 h-5" strokeWidth={1.5} />}
          <span className="text-sm font-medium">{item.label}</span>
          {isDisabled && <span className="ml-auto text-xs text-white/20">Sem acesso</span>}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Vendas' },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/direcao')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
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

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md">
        <div className="w-full flex flex-col gap-3">
          {menuItems.map(renderButton)}
        </div>
      </div>
    </div>
  );
}
