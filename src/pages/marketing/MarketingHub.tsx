import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Database, DollarSign, ArrowLeft, Image, Users, Copy, Package } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { label: "Performance", icon: TrendingUp, path: "/marketing/performance" },
  { label: "Canais de Aquisição", icon: Database, path: "/marketing/canais-aquisicao" },
  { label: "Investimentos", icon: DollarSign, path: "/marketing/investimentos" },
  { label: "Mídias", icon: Image, path: "/marketing/midias" },
  { label: "LTV", icon: Users, path: "/marketing/ltv" },
  { label: "Gestão do Catálogo", icon: Package, path: "/marketing/catalogo" },
  { label: "Conversões Google", icon: Copy, path: "/marketing/conversoes" },
  { label: "Conversões Meta", icon: Copy, path: "/marketing/conversoes-meta" },
];

export default function MarketingHub() {
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
          { label: "Home", path: "/home" },
          { label: "Marketing" }
        ]} 
        mounted={mounted} 
      />
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

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md">
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
                             active:scale-[0.98]
                             flex items-center gap-4 px-5
                             text-white font-medium 
                             bg-gradient-to-r from-blue-500 to-blue-700
                             shadow-lg shadow-blue-500/20
                             border border-blue-400/30
                             hover:from-blue-400 hover:to-blue-600
                             transition-all duration-300"
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
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
