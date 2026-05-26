import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, Search, User as UserIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

type Representante = {
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  ativo: boolean;
  foto_perfil_url: string | null;
  created_at: string;
};

type FilterStatus = 'todos' | 'ativos' | 'inativos';

export default function AprovacoesRepresentantes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('todos');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: representantes = [], isLoading } = useQuery({
    queryKey: ['representantes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, nome, email, cpf, ativo, foto_perfil_url, created_at')
        .eq('tipo_usuario', 'representante')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Representante[];
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('admin_users')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['representantes-list'] });
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-representantes-count'] });
      toast({
        title: vars.ativo ? 'Representante ativado' : 'Representante desativado',
      });
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return representantes.filter((r) => {
      if (filter === 'ativos' && !r.ativo) return false;
      if (filter === 'inativos' && r.ativo) return false;
      if (!term) return true;
      return (
        r.nome?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.cpf?.toLowerCase().includes(term)
      );
    });
  }, [representantes, search, filter]);

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Aprovações', path: '/direcao/aprovacoes' },
          { label: 'Representantes' },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/direcao/aprovacoes')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms',
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 flex flex-col items-center px-6 pt-24 pb-10 w-full max-w-3xl mx-auto">
        <div
          className="mb-8 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 50ms',
          }}
        >
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Aprovações Representantes</h1>
          <p className="text-sm text-white/50 mt-1">
            Ative ou desative usuários representantes
          </p>
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou CPF..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            {(['todos', 'ativos', 'inativos'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-8 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-orange-500 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          {isLoading && (
            <div className="text-center text-white/40 py-12 text-sm">Carregando...</div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
              <UserIcon className="w-12 h-12 text-white/20 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-white/60 text-sm">
                {representantes.length === 0
                  ? 'Nenhum representante cadastrado ainda.'
                  : 'Nenhum representante encontrado com esses filtros.'}
              </p>
            </div>
          )}

          {filtered.map((r, idx) => (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center gap-4 transition-all"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${100 + idx * 40}ms`,
              }}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {r.foto_perfil_url ? (
                  <img src={r.foto_perfil_url} alt={r.nome} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-white/40" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{r.nome}</p>
                <p className="text-xs text-white/50 truncate">{r.email || '—'}</p>
                {r.cpf && (
                  <p className="text-xs text-white/40 truncate">CPF: {r.cpf}</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    r.ativo ? 'text-emerald-400' : 'text-white/40'
                  }`}
                >
                  {r.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <Switch
                  checked={r.ativo}
                  disabled={toggleAtivo.isPending}
                  onCheckedChange={(checked) =>
                    toggleAtivo.mutate({ id: r.id, ativo: checked })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}