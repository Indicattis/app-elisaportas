import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Receipt, Coins, Wallet, BadgeDollarSign, DollarSign, Lock, Landmark, ArrowLeft, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
const menuItems = [
  { label: "Faturamento", icon: Receipt, path: "/administrativo/financeiro/faturamento", ativo: true },
  { label: "Custos", icon: Coins, path: "/administrativo/financeiro/custos", ativo: true },
  { label: "Gestão de Caixa", icon: Wallet, path: "/administrativo/financeiro/caixa/gestao", ativo: true },
  { label: "Contas a Pagar", icon: BadgeDollarSign, path: "/administrativo/financeiro/caixa/contas-a-pagar", ativo: false },
  { label: "Contas a Receber", icon: Receipt, path: "/administrativo/financeiro/caixa/contas-a-receber", ativo: true },
  { label: "Gastos", icon: DollarSign, path: "/administrativo/financeiro/gastos", ativo: true },
  { label: "Custo em Folha", icon: Users, path: "/administrativo/financeiro/custo-folha", ativo: true },
  { label: "Bancos", icon: Landmark, path: "/administrativo/financeiro/bancos", ativo: true },
];

export default function FinanceiroHub() {
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
          { label: "Financeiro" },
        ]} 
        mounted={mounted} 
      />

      {/* Menu de Perfil Flutuante */}
      {/* Botão Voltar */}
      <button
        onClick={() => navigate('/administrativo')}
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
                  className={`w-full h-12 rounded-lg
                             flex items-center gap-4 px-5
                             font-medium 
                             border transition-all duration-300
                             ${item.ativo 
                               ? 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] text-white shadow-lg shadow-blue-500/20 border-blue-400/30' 
                               : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
                             }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  {!item.ativo && <Lock className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== VERSÃO DESKTOP ========== */}
      <div className="hidden md:flex relative z-10 flex-col items-center px-6 py-10 w-full max-w-md">
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 200 + index * 80;
            
            return (
              <div
                key={item.label}
                className={`p-1.5 rounded-xl backdrop-blur-xl border transition-all duration-300
                           ${item.ativo 
                             ? 'bg-white/5 border-white/10 hover:bg-white/10' 
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
                  className={`w-full h-12 rounded-lg
                             flex items-center gap-4 px-5
                             font-medium border transition-all duration-300
                             ${item.ativo 
                               ? 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] text-white shadow-lg shadow-blue-500/20 border-blue-400/30 cursor-pointer' 
                               : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
                             }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  {!item.ativo && <Lock className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
