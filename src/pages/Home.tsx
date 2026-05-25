import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import logoPortasEnrolar from "@/assets/logo-portas-enrolar.ico";
import { ShoppingCart, Factory, Shield, Truck, Building2, LogOut, LayoutDashboard, PanelLeft, Settings, Lock, BarChart3, Calendar, User, ClipboardList, Sun, Moon, Monitor, Clapperboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { DelayedParticles } from "@/components/DelayedParticles";
import { MinhasTarefasFullscreen } from "@/components/MinhasTarefasFullscreen";
import { useTheme } from "@/components/ThemeProvider";

// Mapeamento de path para prefixo de route_key no banco
const routePrefixMap: Record<string, string> = {
  '/marketing': 'marketing_',
  '/direcao': 'direcao_',
  '/vendas': 'vendas_',
  '/fabrica': 'fabrica_',
  '/logistica': 'logistica_',
  '/administrativo': 'administrativo_'
};

const menuItems = [
  { label: "Direção", icon: Shield, path: "/direcao", isGold: true },
  { label: "Vídeos de Marketing", icon: Clapperboard, path: "/marketing/videos-ideias" },
  { label: "Marketing", icon: BarChart3, path: "/marketing" },
  { label: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { label: "Fábrica", icon: Factory, path: "/fabrica" },
  { label: "Logística", icon: Truck, path: "/logistica" },
  { label: "Administrativo", icon: Building2, path: "/administrativo" }
];

export default function Home() {
  const navigate = useNavigate();
  const { user, userRole, signOut, hasBypassPermissions } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [minhasTarefasOpen, setMinhasTarefasOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Buscar todos os acessos do usuário
  const { data: userAccess } = useQuery({
    queryKey: ['user-home-access', user?.id, hasBypassPermissions],
    queryFn: async () => {
      if (!user?.id) return [] as string[];
      
      const { data, error } = await supabase
        .from('user_route_access')
        .select('route_key')
        .eq('user_id', user.id)
        .eq('can_access', true);
      
      if (error) throw error;
      return data?.map(r => r.route_key) || [];
    },
    enabled: !!user?.id && !hasBypassPermissions,
  });

  // Verificar se usuário tem acesso a um módulo (hub ou qualquer sub-rota)
  const hasAccess = (path: string): boolean => {
    if (hasBypassPermissions) return true;
    
    const prefix = routePrefixMap[path];
    if (!prefix) return true;
    
    return userAccess?.some(key => key.startsWith(prefix)) || false;
  };

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const getUserInitials = (nome: string) => {
    const parts = nome.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleMenuClick = (path: string, canAccess: boolean) => {
    if (canAccess) {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Animação de partículas - aparece após 5s com fade-in */}
      <DelayedParticles />
      {/* Breadcrumb animado */}
      <AnimatedBreadcrumb 
        items={[{ label: "Home" }]} 
        mounted={mounted} 
      />

      {/* Tag flutuante de perfil */}
      {userRole && (
        <div 
          ref={profileMenuRef}
          className="fixed top-4 right-4 z-50 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.8)'
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMinhasTarefasOpen(true)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/50 flex items-center justify-center text-white/70 hover:text-white hover:border-blue-500/50 transition-colors active:scale-95"
            >
              <ClipboardList className="w-5 h-5" />
            </button>

            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="focus:outline-none"
            >
              <Avatar className="w-12 h-12 border-2 border-white/20 shadow-lg shadow-black/50 cursor-pointer hover:border-blue-500/50 transition-colors">
                <AvatarImage src={userRole.foto_perfil_url || undefined} alt={userRole.nome} />
                <AvatarFallback className="bg-blue-500/30 text-white font-medium">
                  {getUserInitials(userRole.nome)}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>

          {/* Dropdown Menu */}
          <div 
            className="absolute top-14 right-0 w-48 overflow-hidden
                       bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg
                       shadow-xl shadow-black/50"
            style={{
              opacity: profileMenuOpen ? 1 : 0,
              transform: profileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
              pointerEvents: profileMenuOpen ? 'auto' : 'none',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-white/80 text-sm font-medium truncate">{userRole.nome}</p>
              <p className="text-white/40 text-xs truncate">{userRole.email}</p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  navigate('/perfil');
                  setProfileMenuOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">Meu Perfil</span>
              </button>

              <button
                onClick={() => {
                  navigate('/paineis');
                  setProfileMenuOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <PanelLeft className="w-4 h-4" />
                <span className="text-sm">Painéis</span>
              </button>

              <button
                onClick={() => {
                  navigate('/admin');
                  setProfileMenuOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Admin</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 flex items-center gap-3 text-red-400/80 hover:text-red-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>

            <div className="border-t border-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Tema</p>
              <div className="flex items-center gap-1">
                {[
                  { value: 'light', icon: Sun, label: 'Claro' },
                  { value: 'dark', icon: Moon, label: 'Escuro' },
                  { value: 'system', icon: Monitor, label: 'Sistema' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                    title={label}
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors ${
                      theme === value
                        ? 'bg-white/15 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <MinhasTarefasFullscreen open={minhasTarefasOpen} onOpenChange={setMinhasTarefasOpen} />

      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex flex-col items-center px-6 py-10 w-full max-w-md">
        {/* Logo */}
        <div 
          className="mb-8 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)'
          }}
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-blue-500/20 flex items-center justify-center">
              <img 
                src={logoPortasEnrolar} 
                alt="Logo" 
                className="w-20 h-20 object-contain drop-shadow-2xl" 
              />
            </div>
          </div>
        </div>

        {/* Lista de botões */}
        <div className="w-full flex flex-col gap-3">
        {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 100 + index * 80;
            const canAccess = hasAccess(item.path);
            
            return (
              <div
                key={item.label}
                className={`p-1.5 rounded-xl backdrop-blur-xl border transition-all
                           ${canAccess 
                             ? 'bg-white/5 border-white/10' 
                             : 'bg-white/[0.02] border-white/5'}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${mounted ? '0ms' : delay + 'ms'}`
                }}
              >
                <button
                  onClick={() => handleMenuClick(item.path, canAccess)}
                  disabled={!canAccess}
                  className={`w-full h-12 rounded-lg
                             flex items-center gap-4 px-5
                             font-medium border transition-all
                             ${canAccess 
                               ? item.isGold 
                                 ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-amber-300/50 shadow-lg shadow-amber-500/20 text-white cursor-pointer hover:shadow-xl' 
                                 : 'bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400/30 text-white cursor-pointer hover:from-blue-400 hover:to-blue-600'
                               : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-500 cursor-not-allowed'
                             }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${!canAccess ? 'opacity-50' : ''}`} strokeWidth={1.5} />
                    {!canAccess && (
                      <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-zinc-400" strokeWidth={2.5} />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${!canAccess ? 'opacity-60' : ''}`}>{item.label}</span>
                  {!canAccess && (
                    <Lock className="w-4 h-4 ml-auto text-zinc-500" strokeWidth={2} />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Acesso Rápido */}
        <div 
          className="w-full mt-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 800ms'
          }}
        >
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 text-center">Acesso Rápido</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/home/pedidos-producao')}
              className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl
                         flex flex-col items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <Factory className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-xs font-medium">Pedidos Produção</span>
            </button>
            <button
              onClick={() => navigate('/home/calendario-expedicao')}
              className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl
                         flex flex-col items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <Calendar className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-xs font-medium">Calendário Expedição</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
