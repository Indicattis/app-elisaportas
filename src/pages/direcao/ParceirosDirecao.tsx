import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, MapPin, Mail } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';

type TabKey = 'autorizados' | 'representantes' | 'franqueados';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'autorizados', label: 'Autorizados' },
  { key: 'representantes', label: 'Representantes' },
  { key: 'franqueados', label: 'Franqueados' },
];

function StatusBadge({ ativo, reprovado }: { ativo: boolean; reprovado?: boolean }) {
  if (reprovado) {
    return <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-400/20">Reprovado</span>;
  }
  return ativo ? (
    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">Ativo</span>
  ) : (
    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">Inativo</span>
  );
}

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (src) {
    return <img src={src} alt={name || ''} className="w-10 h-10 rounded-full object-cover border border-white/10" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-medium border border-white/10">
      {initial}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
      {children}
    </div>
  );
}

function AutorizadosList({ tipo }: { tipo: 'autorizado' | 'franqueado' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['parceiros-autorizados', tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autorizados')
        .select('id, nome, cidade, estado, telefone, whatsapp, logo_url, ativo, tipo_parceiro, responsavel, email')
        .eq('tipo_parceiro', tipo)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="text-center text-white/50 py-10">Carregando...</div>;
  if (!data?.length) return <div className="text-center text-white/40 py-10">Nenhum {tipo} cadastrado.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.map((p: any) => (
        <Card key={p.id}>
          <div className="flex items-start gap-3">
            <Avatar src={p.logo_url} name={p.nome} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-white text-sm font-medium truncate">{p.nome}</div>
                <StatusBadge ativo={!!p.ativo} />
              </div>
              {p.responsavel && <div className="text-white/50 text-xs truncate">{p.responsavel}</div>}
              <div className="mt-2 space-y-1 text-xs text-white/60">
                {(p.cidade || p.estado) && (
                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{[p.cidade, p.estado].filter(Boolean).join(' / ')}</div>
                )}
                {(p.telefone || p.whatsapp) && (
                  <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{p.whatsapp || p.telefone}</div>
                )}
                {p.email && (
                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{p.email}</span></div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RepresentantesList() {
  const { data, isLoading } = useQuery({
    queryKey: ['parceiros-representantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('representantes')
        .select('id, nome, email, telefone, foto_perfil_url, ativo, reprovado, comissao_pct')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="text-center text-white/50 py-10">Carregando...</div>;
  if (!data?.length) return <div className="text-center text-white/40 py-10">Nenhum representante cadastrado.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.map((r: any) => (
        <Card key={r.id}>
          <div className="flex items-start gap-3">
            <Avatar src={r.foto_perfil_url} name={r.nome} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-white text-sm font-medium truncate">{r.nome}</div>
                <StatusBadge ativo={!!r.ativo} reprovado={!!r.reprovado} />
              </div>
              {r.comissao_pct != null && (
                <div className="text-white/50 text-xs">Comissão: {Number(r.comissao_pct)}%</div>
              )}
              <div className="mt-2 space-y-1 text-xs text-white/60">
                {r.email && (
                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{r.email}</span></div>
                )}
                {r.telefone && (
                  <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{r.telefone}</div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ParceirosDirecao() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('autorizados');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const tabOrder: Record<TabKey, number> = { autorizados: 0, representantes: 1, franqueados: 2 };

  const handleTabChange = (newTab: TabKey) => {
    const currentIndex = tabOrder[tab];
    const newIndex = tabOrder[newTab];
    setDirection(newIndex > currentIndex ? 'right' : 'left');
    setTab(newTab);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <button
          onClick={() => navigate('/direcao/vendas')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <h1 className="text-lg font-semibold">Parceiros</h1>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 h-10 rounded-full text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="mx-auto max-w-6xl">
          {tab === 'autorizados' && <AutorizadosList tipo="autorizado" />}
          {tab === 'representantes' && <RepresentantesList />}
          {tab === 'franqueados' && <AutorizadosList tipo="franqueado" />}
        </div>
      </div>
    </div>
  );
}
