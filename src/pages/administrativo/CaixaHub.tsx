import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Wallet, HandCoins, Lock, ArrowLeft } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
const menuItems: { label: string; icon: any; path: string; ativo: boolean; description: string }[] = [];

export default function CaixaHub() {
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
          { label: "Caixa" }
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
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      {/* ========== VERSÃO MOBILE ========== */}
      <div className="md:hidden relative z-10 flex flex-col items-center px-6 py-10 w-full max-w-md">
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
                               ? 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 active:scale-[0.98] text-white shadow-lg shadow-purple-500/20 border-purple-400/30' 
                               : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
                             }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-[10px] text-white/60">{item.description}</span>
                  </div>
                  {!item.ativo && <Lock className="w-4 h-4 ml-auto" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== VERSÃO DESKTOP ========== */}
      <div className="hidden md:flex relative z-10 flex-col items-center gap-8">
        <div className="grid grid-cols-2 gap-4">
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
                  className={`w-44 h-32 rounded-xl
                             flex flex-col items-center justify-center gap-2
                             font-medium border transition-all duration-300
                             ${item.ativo 
                               ? 'bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 hover:shadow-xl hover:shadow-purple-500/50 text-white shadow-lg shadow-purple-500/30 border-purple-400/30 cursor-pointer' 
                               : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
                             }`}
                >
                  <div className="relative">
                    <Icon className="w-7 h-7" strokeWidth={1.5} />
                    {!item.ativo && (
                      <Lock className="w-3 h-3 absolute -top-1 -right-1" />
                    )}
                  </div>
                  <span className="text-xs font-medium tracking-wide">{item.label}</span>
                  <span className="text-[10px] text-white/60 text-center px-2">{item.description}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
