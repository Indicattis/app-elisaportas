import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, MapPin, Mail, Power } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Percent } from 'lucide-react';

function ComissaoEditor({ id, current }: { id: string; current: number | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(current != null ? String(current) : '');

  const mutation = useMutation({
    mutationFn: async (pct: number) => {
      const { error } = await supabase
        .from('representantes')
        .update({ comissao_pct: pct })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Comissão atualizada');
      queryClient.invalidateQueries({ queryKey: ['parceiros-representantes'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar comissão'),
  });

  const handleSave = () => {
    const pct = Number(String(value).replace(',', '.'));
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Informe um valor entre 0 e 100');
      return;
    }
    mutation.mutate(pct);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(current != null ? String(current) : ''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Percent className="w-3 h-3" />
          {current != null ? `Comissão: ${Number(current)}%` : 'Definir comissão'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-black/90 backdrop-blur-xl border-white/10 text-white p-3" align="start">
        <div className="text-xs text-white/60 mb-2">Porcentagem de comissão</div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="h-8 bg-white/5 border-white/10 text-white pr-7"
              autoFocus
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/40">%</span>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="h-8 bg-blue-600 hover:bg-blue-500 text-white"
          >
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 hover:bg-white/[0.07] transition-colors">
      {children}
    </div>
  );
}

function ToggleAtivoButton({
  ativo,
  onToggle,
  loading,
}: {
  ativo: boolean;
  onToggle: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      title={ativo ? 'Desativar' : 'Ativar'}
      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all disabled:opacity-50 ${
        ativo
          ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/25'
          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
      }`}
    >
      <Power className="w-3.5 h-3.5" strokeWidth={1.8} />
    </button>
  );
}

function AutorizadosList({ tipo }: { tipo: 'autorizado' | 'franqueado' }) {
  const queryClient = useQueryClient();
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('autorizados').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.ativo ? 'Parceiro ativado' : 'Parceiro desativado');
      queryClient.invalidateQueries({ queryKey: ['parceiros-autorizados', tipo] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar'),
  });

  if (isLoading) return <div className="text-center text-white/50 py-10">Carregando...</div>;
  if (!data?.length) return <div className="text-center text-white/40 py-10">Nenhum {tipo} cadastrado.</div>;

  return (
    <div className="flex flex-col gap-2">
      {data.map((p: any) => (
        <Row key={p.id}>
          <div className="flex items-center gap-4">
            <Avatar src={p.logo_url} name={p.nome} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{p.nome}</div>
              {p.responsavel && <div className="text-white/50 text-xs truncate">{p.responsavel}</div>}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-white/60 min-w-0 flex-1">
              {(p.cidade || p.estado) && (<><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{[p.cidade, p.estado].filter(Boolean).join(' / ')}</span></>)}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-white/60 min-w-0 flex-1">
              {(p.telefone || p.whatsapp) && (<><Phone className="w-3 h-3 shrink-0" /><span className="truncate">{p.whatsapp || p.telefone}</span></>)}
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/60 min-w-0 flex-1">
              {p.email && (<><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{p.email}</span></>)}
            </div>
            <StatusBadge ativo={!!p.ativo} />
            <ToggleAtivoButton
              ativo={!!p.ativo}
              loading={toggleMutation.isPending}
              onToggle={() => toggleMutation.mutate({ id: p.id, ativo: !p.ativo })}
            />
          </div>
        </Row>
      ))}
    </div>
  );
}

function RepresentantesList() {
  const queryClient = useQueryClient();
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('representantes').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.ativo ? 'Representante ativado' : 'Representante desativado');
      queryClient.invalidateQueries({ queryKey: ['parceiros-representantes'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar'),
  });

  if (isLoading) return <div className="text-center text-white/50 py-10">Carregando...</div>;
  if (!data?.length) return <div className="text-center text-white/40 py-10">Nenhum representante cadastrado.</div>;

  return (
    <div className="flex flex-col gap-2">
      {data.map((r: any) => (
        <Row key={r.id}>
          <div className="flex items-center gap-4">
            <Avatar src={r.foto_perfil_url} name={r.nome} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{r.nome}</div>
              <div className="mt-1">
                <ComissaoEditor id={r.id} current={r.comissao_pct ?? null} />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-white/60 min-w-0 flex-1">
              {r.email && (<><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{r.email}</span></>)}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-white/60 min-w-0 flex-1">
              {r.telefone && (<><Phone className="w-3 h-3 shrink-0" /><span className="truncate">{r.telefone}</span></>)}
            </div>
            <StatusBadge ativo={!!r.ativo} reprovado={!!r.reprovado} />
            <ToggleAtivoButton
              ativo={!!r.ativo}
              loading={toggleMutation.isPending}
              onToggle={() => toggleMutation.mutate({ id: r.id, ativo: !r.ativo })}
            />
          </div>
        </Row>
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
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate('/direcao/vendas')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <AnimatedBreadcrumb
          items={[
            { label: 'Home', path: '/home' },
            { label: 'Direção', path: '/direcao' },
            { label: 'Vendas', path: '/direcao/vendas' },
            { label: 'Parceiros' },
          ]}
          mounted={true}
        />
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
                  onClick={() => handleTabChange(t.key)}
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
          <div
            key={tab}
            className={direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
          >
            {tab === 'autorizados' && <AutorizadosList tipo="autorizado" />}
            {tab === 'representantes' && <RepresentantesList />}
            {tab === 'franqueados' && <AutorizadosList tipo="franqueado" />}
          </div>
        </div>
      </div>
    </div>
  );
}
