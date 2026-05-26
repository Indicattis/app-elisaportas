import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, Search, User as UserIcon, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Representante = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  foto_perfil_url: string | null;
  created_at: string;
};

export default function AprovacoesRepresentantes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: representantes = [], isLoading } = useQuery({
    queryKey: ['representantes-aprovacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('representantes')
        .select('id, nome, email, telefone, ativo, foto_perfil_url, created_at')
        .eq('ativo', false)
        .eq('reprovado', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Representante[];
    },
  });

  const aprovar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('representantes')
        .update({ ativo: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<Representante[]>(['representantes-aprovacoes'], (old) =>
        old ? old.filter((r) => r.id !== id) : old
      );
      queryClient.invalidateQueries({ queryKey: ['representantes-aprovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-representantes-count'] });
      toast({ title: 'Representante aprovado' });
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    },
  });

  const reprovar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('representantes')
        .update({ reprovado: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representantes-aprovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-representantes-count'] });
      toast({ title: 'Representante reprovado' });
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return representantes.filter((r) => {
      if (!term) return true;
      return (
        r.nome?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.telefone?.toLowerCase().includes(term)
      );
    });
  }, [representantes, search]);

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
            Aprove ou reprove o acesso de novos representantes
          </p>
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
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
                Nenhum representante pendente de aprovação.
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
                {r.telefone && (
                  <p className="text-xs text-white/40 truncate">Tel: {r.telefone}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => aprovar.mutate(r.id)}
                  disabled={aprovar.isPending || reprovar.isPending}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Aprovar
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={aprovar.isPending || reprovar.isPending}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reprovar
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reprovar acesso?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {r.nome} ficará inativo e não aparecerá mais nesta tela. Esta ação é definitiva.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => reprovar.mutate(r.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Reprovar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}