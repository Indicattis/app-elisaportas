import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutTemplate, Wrench, Paintbrush, Package } from 'lucide-react';
import TabelaPrecos from '@/pages/TabelaPrecos';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { ConfigLucroEstatico } from '@/components/direcao/ConfigLucroEstatico';
import { KitsShowcaseCard } from '@/components/direcao/KitsShowcaseCard';

type TabKey = 'portas' | 'instalacoes' | 'pinturas';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Package }> = [
  { key: 'portas', label: 'Portas', icon: Package },
  { key: 'instalacoes', label: 'Instalações', icon: Wrench },
  { key: 'pinturas', label: 'Pinturas', icon: Paintbrush },
];

// Persistido fora do componente para preservar a posição do indicador
// quando a TabsBar é desmontada ao trocar entre layouts (Portas usa TabelaPrecos,
// demais usam MinimalistLayout). Isso permite animar a partir da posição anterior.
let lastDisplayedIndex = 0;

function TabsBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === active));
  const cols = TABS.length;

  // Inicia na posição anterior (módulo persistido), depois transita para a atual
  const [displayedIndex, setDisplayedIndex] = useState(lastDisplayedIndex);

  useEffect(() => {
    if (displayedIndex === activeIndex) return;
    // Pequeno delay para garantir que o transform inicial seja aplicado antes da transição
    const id = requestAnimationFrame(() => {
      setDisplayedIndex(activeIndex);
      lastDisplayedIndex = activeIndex;
    });
    return () => cancelAnimationFrame(id);
  }, [activeIndex, displayedIndex]);

  return (
    <div className="mb-6 flex justify-center">
      <div
        className="relative inline-grid rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(160px, 1fr))` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${cols})`,
            transform: `translateX(${displayedIndex * 100}%)`,
          }}
        />
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={
                'relative z-10 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors duration-200 ' +
                (isActive ? 'text-white' : 'text-white/70 hover:text-white')
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>
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
  const showcase = <KitsShowcaseCard tab={active} />;
  const beforeContentPortas = (
    <>
      {tabsBar}
      <div key={active} className="mb-4 animate-fade-in">{showcase}</div>
    </>
  );

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
        beforeContent={beforeContentPortas}
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
      <div key={active} className="space-y-4 animate-fade-in">
        {showcase}
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