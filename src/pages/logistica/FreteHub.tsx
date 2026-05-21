import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Package, Truck, Building2, ArrowLeft } from "lucide-react";

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

const menuItems = [
  { label: "Valores Internos", icon: Package, path: "/logistica/frete/internos" },
  { label: "Valores Transportadoras", icon: Truck, path: "/logistica/frete/valores" },
  { label: "Transportadoras", icon: Building2, path: "/logistica/frete/transportadoras" },
];

export default function FreteHub() {
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
          { label: "Logística", path: "/logistica" },
          { label: "Frete" }
        ]} 
        mounted={mounted} 
      />
      <button
        onClick={() => navigate('/logistica')}
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
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => navigate(item.path)}
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] flex items-center gap-4 px-5 text-white font-medium shadow-lg shadow-blue-500/20 border border-blue-400/30 transition-all duration-300"
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex relative z-10 flex-col items-center justify-center">
        <div className="grid grid-cols-3 gap-4 max-w-2xl">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const delay = 200 + index * 100;
            return (
              <div
                key={item.label}
                className="p-2 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`
                }}
              >
                <button
                  onClick={() => navigate(item.path)}
                  className="w-40 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 flex flex-col items-center justify-center gap-2 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 border border-blue-400/30 transition-all duration-300"
                >
                  <Icon className="w-7 h-7" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-center px-2">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
