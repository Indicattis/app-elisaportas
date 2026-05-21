import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { AnimatedBreadcrumb, BreadcrumbItem } from './AnimatedBreadcrumb';

interface MinimalistLayoutProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  fullWidth?: boolean;
  showBackButton?: boolean;
}

export function MinimalistLayout({ 
  title, 
  subtitle, 
  backPath = '/home', 
  children,
  headerActions,
  breadcrumbItems,
  fullWidth = false,
  showBackButton = true
}: MinimalistLayoutProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Gerar breadcrumb automático se não for fornecido
  const generateBreadcrumb = (): BreadcrumbItem[] => {
    if (breadcrumbItems && breadcrumbItems.length > 0) {
      return breadcrumbItems;
    }
    
    // Auto-generate based on backPath
    if (backPath === '/admin') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Admin', path: '/admin' },
        { label: title }
      ];
    }
    
    if (backPath === '/vendas') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Vendas', path: '/vendas' },
        { label: title }
      ];
    }

    if (backPath === '/fabrica') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Fábrica', path: '/fabrica' },
        { label: title }
      ];
    }

    if (backPath === '/direcao') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: title }
      ];
    }

    if (backPath === '/logistica') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Logística', path: '/logistica' },
        { label: title }
      ];
    }

    if (backPath === '/administrativo') {
      return [
        { label: 'Home', path: '/home' },
        { label: 'Administrativo', path: '/administrativo' },
        { label: title }
      ];
    }

    // Default: just show Home > title
    return [
      { label: 'Home', path: '/home' },
      { label: title }
    ];
  };

  const finalBreadcrumbItems = generateBreadcrumb();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Breadcrumb animado */}
      <AnimatedBreadcrumb items={finalBreadcrumbItems} mounted={mounted} />

      {/* Botão Voltar */}
      {showBackButton && backPath && (
        <button
          onClick={() => navigate(backPath)}
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
      )}
      
      {/* Container principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header minimalista */}
        <header className="sticky top-0 z-20 px-4 py-4 mt-14">
          <div className={fullWidth ? "w-full" : "max-w-7xl mx-auto"}>
            <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="px-4 py-2 rounded-lg flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-white/60">{subtitle}</p>
                  )}
                </div>
                
                {headerActions && (
                  <div className="flex items-center gap-2">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Conteúdo */}
        <main className="flex-1 px-4 py-6 overflow-auto">
          <div className={fullWidth ? "w-full" : "max-w-7xl mx-auto"}>
            {children}
          </div>
        </main>
      </div>

      <FloatingProfileMenu mounted={mounted} />
    </div>
  );
}
