import { Link } from 'react-router-dom';
import { LayoutTemplate, Wrench, Paintbrush } from 'lucide-react';
import TabelaPrecos from '@/pages/TabelaPrecos';

export default function EstrategiaKits() {
  const extraHeaderActions = (
    <>
      <Link
        to="/direcao/estrategia/kits/template"
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white transition"
      >
        <LayoutTemplate className="h-4 w-4 text-blue-400" />
        Template padrão
      </Link>
      <Link
        to="/direcao/estrategia/kits/lucro-instalacoes"
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white transition"
      >
        <Wrench className="h-4 w-4 text-blue-400" />
        Lucro de Instalações
      </Link>
      <Link
        to="/direcao/estrategia/kits/lucro-pinturas"
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white transition"
      >
        <Paintbrush className="h-4 w-4 text-blue-400" />
        Lucro de Pinturas
      </Link>
    </>
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