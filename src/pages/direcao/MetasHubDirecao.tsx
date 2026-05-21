import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ShoppingCart, Megaphone, Truck, Factory, Building2, Lock, ArrowLeft, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { label: "Vendas", icon: ShoppingCart, path: "/direcao/metas/vendas", ativo: true },
  { label: "Marketing", icon: Megaphone, path: "/direcao/metas/marketing", ativo: false },
  { label: "Instalações", icon: Truck, path: "/direcao/metas/instalacoes", ativo: true },
  { label: "Fábrica", icon: Factory, path: "/direcao/metas/fabrica", ativo: true },
  { label: "Administrativo", icon: Building2, path: "/direcao/metas/administrativo", ativo: false },
];

export default function MetasHubDirecao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = (item: typeof menuItems[0]) => {
    if (item.ativo) {
      navigate(item.path);
    } else {
      toast({
        title: "Em desenvolvimento",
        description: `Metas de ${item.label} estará disponível em breve.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-white relative overflow-hidden">
      <DelayedParticles />

      <AnimatedBreadcrumb 
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Metas' }
        ]}
        mounted={mounted}
      />
      {/* Back button */}
      <button
        onClick={() => navigate('/direcao')}
        className="fixed left-4 top-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 100ms'
        }}
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>

      {/* Header */}
      <div className="pt-20 pb-8 px-4 text-center">
        <div
          className="inline-flex items-center gap-3 mb-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 200ms'
          }}
        >
          <Target className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
        </div>
        <p
          className="text-white/60 text-sm"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 300ms'
          }}
        >
          Selecione o setor para gerenciar metas
        </p>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 pb-8">
        <div className="flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                disabled={!item.ativo}
                className={`
                  relative flex items-center gap-4 p-4 rounded-xl text-left transition-all
                  ${item.ativo 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40' 
                    : 'bg-white/5 cursor-not-allowed'
                  }
                `}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${400 + index * 80}ms`
                }}
              >
                <div className={`
                  p-3 rounded-lg
                  ${item.ativo ? 'bg-white/20' : 'bg-white/5'}
                `}>
                  <Icon className={`h-6 w-6 ${item.ativo ? 'text-white' : 'text-white/40'}`} />
                </div>
                <span className={`font-medium text-lg ${item.ativo ? 'text-white' : 'text-white/40'}`}>
                  {item.label}
                </span>
                {!item.ativo && (
                  <Lock className="h-4 w-4 text-white/30 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex justify-center px-4 pb-8">
        <div className="grid grid-cols-3 gap-4 max-w-4xl w-full">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                disabled={!item.ativo}
                className={`
                  relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl transition-all
                  ${item.ativo 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]' 
                    : 'bg-white/5 cursor-not-allowed'
                  }
                `}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${400 + index * 80}ms`
                }}
              >
                {!item.ativo && (
                  <div className="absolute top-3 right-3">
                    <Lock className="h-4 w-4 text-white/30" />
                  </div>
                )}
                <div className={`
                  p-4 rounded-xl
                  ${item.ativo ? 'bg-white/20' : 'bg-white/5'}
                `}>
                  <Icon className={`h-8 w-8 ${item.ativo ? 'text-white' : 'text-white/40'}`} />
                </div>
                <span className={`font-semibold text-lg ${item.ativo ? 'text-white' : 'text-white/40'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
