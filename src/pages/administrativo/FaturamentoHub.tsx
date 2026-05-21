import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Receipt, Package, Wrench, Lock, ArrowLeft } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
const menuItems = [
  { 
    label: "Por Venda", 
    icon: Receipt, 
    path: "/administrativo/financeiro/faturamento/vendas", 
    ativo: true,
    description: "Controle individual por venda"
  },
  { 
    label: "Por Produto", 
    icon: Package, 
    path: "/administrativo/financeiro/faturamento/produtos", 
    ativo: true,
    description: "Análise por tipo de produto"
  },
  { 
    label: "Por Instalação", 
    icon: Wrench, 
    path: "/administrativo/financeiro/faturamento/instalacoes", 
    ativo: false,
    description: "Controle por instalação"
  },
];

export default function FaturamentoHub() {
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
        description: `A página ${item.label} estará disponível em breve.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden relative">
      {/* Breadcrumb */}
      <AnimatedBreadcrumb 
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Faturamento" }
        ]} 
        mounted={mounted} 
      />

      {/* Menu de Perfil Flutuante */}
      {/* Botão Voltar */}
      <button
        onClick={() => navigate('/administrativo/financeiro')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                   hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms'
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg shadow-green-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      {/* ========== VERSÃO MOBILE ========== */}
      <div className="md:hidden relative z-10 flex flex-col items-center px-6 py-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Faturamento</h1>
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 100 + index * 80;
            
            return (
              <div
                key={item.label}
                className={`p-1.5 rounded-xl backdrop-blur-xl border transition-all duration-300
                           ${item.ativo 
                             ? 'bg-white/5 border-white/10' 
                             : 'bg-white/[0.02] border-white/5'
                           }`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => handleClick(item)}
                  className={`w-full h-14 rounded-lg
                             flex items-center gap-4 px-5
                             font-medium 
                             border transition-all duration-300
                             ${item.ativo 
                               ? 'bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 active:scale-[0.98] text-white shadow-lg shadow-green-500/20 border-green-400/30' 
                               : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
                             }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-xs opacity-70">{item.description}</p>
                  </div>
                  {!item.ativo && <Lock className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== VERSÃO DESKTOP ========== */}
      <div className="hidden md:flex relative z-10 flex-col items-center gap-8">
        <h1 className="text-3xl font-bold text-white mb-4">Faturamento</h1>
        <div className="grid grid-cols-3 gap-4">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 200 + index * 100;
            
            return (
              <div
                key={item.label}
                className={`p-2 rounded-2xl backdrop-blur-xl border transition-all duration-300
                           ${item.ativo 
                             ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                             : 'bg-white/[0.02] border-white/5'
                           }`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => handleClick(item)}
                  className={`w-40 h-32 rounded-xl
                             flex flex-col items-center justify-center gap-2
                             font-medium border transition-all duration-300
                             ${item.ativo 
                               ? 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 hover:shadow-xl hover:shadow-green-500/50 text-white shadow-lg shadow-green-500/30 border-green-400/30 cursor-pointer' 
                               : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
                             }`}
                >
                  <div className="relative">
                    <Icon className="w-8 h-8" strokeWidth={1.5} />
                    {!item.ativo && (
                      <Lock className="w-3.5 h-3.5 absolute -top-1 -right-1" />
                    )}
                  </div>
                  <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  <span className="text-[10px] opacity-70 text-center px-2">{item.description}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
