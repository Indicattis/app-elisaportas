import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Package, Table2, DollarSign, Wallet, BarChart3 } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { FloatingProfileMenu } from '@/components/FloatingProfileMenu';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { label: 'Tabela de Custos Elisa', icon: Package, path: '/direcao/estrategia/itens' },
  { label: 'Tabela de Lucro Líquido Kits', icon: Table2, path: '/direcao/estrategia/kits' },
  { label: 'Tabela de Preços Vendedores', icon: DollarSign, path: '/direcao/estrategia/precos' },
  { label: 'Despesa fixa, salarial e variável', icon: Wallet, path: '/direcao/estrategia/despesas' },
  { label: 'DRE', icon: BarChart3, path: '/direcao/dre' },
];

export default function EstrategiaHub() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Estratégia' },
        ]}
        mounted={mounted}
      />
      <FloatingProfileMenu mounted={mounted} />

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
        <div
          className="mb-8 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 50ms',
          }}
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Estratégia</h1>
        </div>

        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 100 + index * 80;
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
                  onClick={() => navigate(item.path)}
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] flex items-center gap-4 px-5 text-white font-medium shadow-lg shadow-blue-500/20 border border-blue-400/30 transition-all duration-300"
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm font-semibold tabular-nums opacity-80">{index + 1}.</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}