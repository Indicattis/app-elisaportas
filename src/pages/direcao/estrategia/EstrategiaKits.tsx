import { Link, useSearchParams } from 'react-router-dom';
import { LayoutTemplate, Wrench, Paintbrush, Package } from 'lucide-react';
import TabelaPrecos from '@/pages/TabelaPrecos';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { ConfigLucroEstatico } from '@/components/direcao/ConfigLucroEstatico';

type TabKey = 'portas' | 'instalacoes' | 'pinturas';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Package }> = [
  { key: 'portas', label: 'Portas', icon: Package },
  { key: 'instalacoes', label: 'Instalações', icon: Wrench },
  { key: 'pinturas', label: 'Pinturas', icon: Paintbrush },
];

function TabsBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="mb-6 inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-1">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={
              isActive
                ? 'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition'
                : 'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition'
            }
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function EstrategiaKits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as TabKey | null;
  const active: TabKey = rawTab === 'instalacoes' || rawTab === 'pinturas' ? rawTab : 'portas';

  const setTab = (k: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (k === 'portas') next.delete('tab');
    else next.set('tab', k);
    setSearchParams(next, { replace: true });
  };

  const tabsBar = <TabsBar active={active} onChange={setTab} />;

  const headerActions = (
    <Link
      to="/direcao/estrategia/kits/template"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-2 text-xs text-white/70 hover:text-white transition"
    >
      <LayoutTemplate className="h-3.5 w-3.5 text-white/50" />
      Template padrão
    </Link>
  );

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Direção', path: '/direcao' },
    { label: 'Estratégia', path: '/direcao/estrategia' },
    { label: 'Tabela de Kits' },
  ];

  if (active === 'portas') {
    return (
      <TabelaPrecos
        titleOverride="Tabela de Kits"
        subtitleOverride="Kits e preços"
        backPathOverride="/direcao/estrategia"
        enableReorder
        hideCatalogoTab
        extraHeaderActions={headerActions}
        beforeContent={tabsBar}
        breadcrumbItemsOverride={breadcrumbItems}
      />
    );
  }

  const isInstal = active === 'instalacoes';
  const Icon = isInstal ? Wrench : Paintbrush;
  const headerTitle = isInstal ? 'Lucro de Instalações' : 'Lucro de Pinturas';
  const headerSubtitle = isInstal
    ? 'Configuração aplicada no faturamento das vendas com produto do tipo instalação'
    : 'Configuração aplicada no faturamento das vendas com pintura';

  return (
    <MinimalistLayout
      title="Tabela de Kits"
      subtitle="Kits e preços"
      backPath="/direcao/estrategia"
      breadcrumbItems={breadcrumbItems}
      headerActions={headerActions}
      fullWidth
    >
      {tabsBar}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Icon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">{headerTitle}</div>
            <div className="text-xs text-white/60">{headerSubtitle}</div>
          </div>
        </div>

        {isInstal ? (
          <ConfigLucroEstatico tipo="instalacao" contextoLabel="instalação" />
        ) : (
          <ConfigLucroEstatico
            tipo="pintura_epoxi"
            contextoLabel="pintura epóxi"
            modosDisponiveis={['estatico', 'formula_dimensao']}
          />
        )}
      </div>
    </MinimalistLayout>
  );
}