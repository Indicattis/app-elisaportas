import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, DollarSign, Factory, Truck, ArrowLeft, Warehouse, ShieldCheck, Calculator, Network, ClipboardCheck, Lock, Wallet, Lightbulb, Banknote } from 'lucide-react';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { FloatingProfileMenu } from '@/components/FloatingProfileMenu';
import { DelayedParticles } from '@/components/DelayedParticles';
import { useBulkRouteAccess } from '@/hooks/useBulkRouteAccess';

const menuItems = [
  { label: 'Estratégia', icon: Lightbulb, path: '/direcao/estrategia', routePrefix: 'direcao_estrategia', variant: 'gold' as const },
  { label: 'Capital de Giro Elisa', icon: Wallet, path: '/direcao/caixa-elisa', routePrefix: 'direcao_caixa_elisa', variant: 'gold' as const },
  { label: 'Vendas', icon: ShoppingCart, path: '/direcao/vendas', routePrefix: 'direcao_vendas' },
  { label: 'DRE', icon: Calculator, path: '/direcao/dre', routePrefix: 'direcao_dre' },
  { label: 'Financeiro', icon: Banknote, path: '/direcao/financeiro', routePrefix: 'direcao_financeiro' },
  { label: 'Checklist Liderança', icon: ClipboardCheck, path: '/direcao/checklist-lideranca', routePrefix: 'direcao_checklist', variant: 'slate' as const },
  { label: 'Gestão de Fábrica', icon: Factory, path: '/direcao/gestao-fabrica', routePrefix: 'direcao_gestao_fabrica' },
  { label: 'Gestão de Instalações', icon: Truck, path: '/direcao/gestao-instalacao', routePrefix: 'direcao_gestao_instalacao' },
  { label: 'Gestão de Frotas', icon: Truck, path: '/direcao/frota', routePrefix: 'direcao_frota' },
  { label: 'Estoque', icon: Warehouse, path: '/direcao/estoque', routePrefix: 'direcao_estoque' },
  { label: 'Aprovações', icon: ShieldCheck, path: '/direcao/aprovacoes', routePrefix: 'direcao_aprovaco' },
  { label: 'Organograma RH', icon: Network, path: '/direcao/gestao-colaboradores', routePrefix: 'direcao_gestao_colaboradores' },
];

export default function DirecaoHub() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  const prefixes = menuItems.filter(i => !(i as any).external && i.routePrefix).map(i => i.routePrefix);
  const { data: accessMap } = useBulkRouteAccess(prefixes);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const renderButton = (item: typeof menuItems[0], index: number) => {
    const Icon = item.icon;
    const delay = 100 + index * 80;
    const external = (item as any).external as boolean | undefined;
    const hasAccess = external || !item.routePrefix || accessMap?.[item.routePrefix] !== false;
    const isDisabled = !external && !hasAccess;
    const variant = (item as any).variant as 'gold' | 'slate' | undefined;

    return (
      <div
        key={item.label}
        className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
          transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
        }}
      >
        <button
          onClick={() => {
            if (isDisabled) return;
            (item as any).external ? window.open(item.path, '_blank') : navigate(item.path);
          }}
          disabled={isDisabled}
          className={`w-full h-12 rounded-lg
                     flex items-center gap-4 px-5
                     font-medium transition-all duration-300
                     ${isDisabled
                       ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white/30 cursor-not-allowed border border-gray-600/30'
                       : variant === 'gold'
                         ? 'bg-gradient-to-r from-amber-700/70 to-yellow-800/70 shadow-lg shadow-amber-600/20 border border-amber-500/30 hover:from-amber-600/70 hover:to-yellow-700/70 text-white active:scale-[0.98]'
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
          { label: "Home", path: "/home" },
          { label: "Direção" }
        ]} 
        mounted={mounted} 
      />

      <FloatingProfileMenu mounted={mounted} />

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

      {/* Mobile */}
      <div className="md:hidden relative z-10 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md">
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => renderButton(item, index))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex relative z-10 flex-col items-center justify-center px-6 py-10 w-full max-w-md">
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => renderButton(item, index))}
        </div>
      </div>
    </div>
  );
}
