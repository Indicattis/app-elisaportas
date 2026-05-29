import { Link } from 'react-router-dom';
import { LayoutTemplate, Wrench, Paintbrush } from 'lucide-react';
import TabelaPrecos from '@/pages/TabelaPrecos';

export default function EstrategiaKits() {
  const extraHeaderActions = (
    <div className="flex items-center gap-3">
      {/* Ações principais — lucro (maior destaque) */}
      <div className="flex items-center gap-2">
        <Link
          to="/direcao/estrategia/kits/lucro-instalacoes"
          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-blue-500/10 hover:from-blue-600/30 hover:to-blue-500/20 backdrop-blur-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/10 transition-all duration-200"
        >
          <Wrench className="h-4 w-4 text-blue-300" />
          Lucro de Instalações
        </Link>
        <Link
          to="/direcao/estrategia/kits/lucro-pinturas"
          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-blue-500/10 hover:from-blue-600/30 hover:to-blue-500/20 backdrop-blur-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/10 transition-all duration-200"
        >
          <Paintbrush className="h-4 w-4 text-blue-300" />
          Lucro de Pinturas
        </Link>
      </div>

      {/* Separador visual */}
      <div className="h-6 w-px bg-white/10" />

      {/* Ação secundária — template (menor destaque) */}
      <Link
        to="/direcao/estrategia/kits/template"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-2 text-xs text-white/70 hover:text-white transition"
      >
        <LayoutTemplate className="h-3.5 w-3.5 text-white/50" />
        Template padrão
      </Link>
    </div>
  );

  return (
    <TabelaPrecos
      titleOverride="Tabela de Kits"
      subtitleOverride="Kits e preços"
      backPathOverride="/direcao/estrategia"
      enableReorder
      hideCatalogoTab
      extraHeaderActions={extraHeaderActions}
      breadcrumbItemsOverride={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Kits' },
      ]}
    />
  );
}