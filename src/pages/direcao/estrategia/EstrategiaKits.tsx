import { Link } from 'react-router-dom';
import { LayoutTemplate } from 'lucide-react';
import TabelaPrecos from '@/pages/TabelaPrecos';

export default function EstrategiaKits() {
  return (
    <>
      <div className="fixed top-20 right-6 z-40">
        <Link
          to="/direcao/estrategia/kits/template"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white transition"
        >
          <LayoutTemplate className="h-4 w-4 text-blue-400" />
          Template padrão
        </Link>
      </div>
      <TabelaPrecos
      titleOverride="Tabela de Kits"
      subtitleOverride="Kits e preços"
      backPathOverride="/direcao/estrategia"
      enableReorder
      hideCatalogoTab
      breadcrumbItemsOverride={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Kits' },
      ]}
      />
    </>
  );
}