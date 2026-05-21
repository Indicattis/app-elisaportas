import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Package, ArrowLeft } from 'lucide-react';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { 
    label: 'Fábrica', 
    icon: Factory, 
    path: '/direcao/estoque/configuracoes/produtos/fabrica', 
    description: 'Insumos de produção' 
  },
  { 
    label: 'Almoxarifado', 
    icon: Package, 
    path: '/direcao/estoque/configuracoes/produtos/almoxarifado', 
    description: 'Insumos de apoio' 
  },
];

export default function ProdutosHub() {
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
          { label: "Direção", path: "/direcao" },
          { label: "Estoque", path: "/direcao/estoque" },
          { label: "Configurações", path: "/direcao/estoque/configuracoes" },
          { label: "Produtos" }
        ]} 
        mounted={mounted} 
      />
      <button
        onClick={() => navigate('/direcao/estoque/configuracoes')}
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
        {/* Header */}
        <div 
          className="mb-8 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 50ms'
          }}
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Produtos</h1>
          <p className="text-sm text-white/50 mt-1">Escolha o tipo de produto</p>
        </div>

        {/* Grid de cards */}
        <div className="w-full grid grid-cols-2 gap-4">
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
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => navigate(item.path)}
                  className="w-full aspect-square rounded-lg
                             bg-gradient-to-br from-blue-500/20 to-blue-700/20
                             hover:from-blue-500/30 hover:to-blue-700/30
                             active:scale-[0.98]
                             flex flex-col items-center justify-center gap-3 p-4
                             text-white
                             border border-blue-400/20
                             transition-all duration-300"
                >
                  <Icon className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
                  <div className="text-center">
                    <span className="text-sm font-medium block">{item.label}</span>
                    <span className="text-xs text-white/50 mt-1 block">{item.description}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
