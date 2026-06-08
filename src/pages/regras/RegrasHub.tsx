import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { supabase } from '@/integrations/supabase/client';

interface Setor {
  id: string;
  nome: string;
  ordem: number;
}
interface Regra {
  id: string;
  setor_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
}

export default function RegrasHub() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [editSetor, setEditSetor] = useState<{ id: string; nome: string } | null>(null);
  const [novoSetor, setNovoSetor] = useState<string | null>(null);
  const [novaRegra, setNovaRegra] = useState<{ setor_id: string; titulo: string; descricao: string } | null>(null);
  const [editRegra, setEditRegra] = useState<{ id: string; titulo: string; descricao: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: setores = [] } = useQuery({
    queryKey: ['regras_setores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_setores')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Setor[];
    },
  });

  const { data: regras = [] } = useQuery({
    queryKey: ['regras_setor_itens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_setor_itens')
        .select('*')
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Regra[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['regras_setores'] });
    qc.invalidateQueries({ queryKey: ['regras_setor_itens'] });
  };

  const addSetor = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from('regras_setores').insert({ nome, ordem: setores.length });
      if (error) throw error;
    },
    onSuccess: () => { setNovoSetor(null); invalidate(); toast.success('Setor adicionado'); },
    onError: (e: any) => toast.error(e.message),
  });
  const updSetor = useMutation({
    mutationFn: async (s: { id: string; nome: string }) => {
      const { error } = await supabase.from('regras_setores').update({ nome: s.nome }).eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => { setEditSetor(null); invalidate(); toast.success('Setor atualizado'); },
    onError: (e: any) => toast.error(e.message),
  });
  const delSetor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('regras_setores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Setor removido'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addRegra = useMutation({
    mutationFn: async (r: { setor_id: string; titulo: string; descricao: string }) => {
      const ordem = regras.filter((x) => x.setor_id === r.setor_id).length;
      const { error } = await supabase.from('regras_setor_itens').insert({
        setor_id: r.setor_id, titulo: r.titulo, descricao: r.descricao || null, ordem,
      });
      if (error) throw error;
    },
    onSuccess: () => { setNovaRegra(null); invalidate(); toast.success('Regra adicionada'); },
    onError: (e: any) => toast.error(e.message),
  });
  const updRegra = useMutation({
    mutationFn: async (r: { id: string; titulo: string; descricao: string }) => {
      const { error } = await supabase.from('regras_setor_itens')
        .update({ titulo: r.titulo, descricao: r.descricao || null }).eq('id', r.id);
      if (error) throw error;
    },
    onSuccess: () => { setEditRegra(null); invalidate(); toast.success('Regra atualizada'); },
    onError: (e: any) => toast.error(e.message),
  });
  const delRegra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('regras_setor_itens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Regra removida'); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[{ label: 'Home', path: '/home' }, { label: 'Regras' }]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/home')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms',
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-light text-white tracking-tight">Regras por Setor</h1>
          <button
            onClick={() => setNovoSetor('')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 text-white/90 text-sm transition-all"
          >
            <FolderPlus className="w-4 h-4" strokeWidth={1.5} />
            Novo setor
          </button>
        </div>

        {novoSetor !== null && (
          <div className="mb-4 p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center gap-2">
            <input
              autoFocus
              value={novoSetor}
              onChange={(e) => setNovoSetor(e.target.value)}
              placeholder="Nome do setor"
              className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && novoSetor.trim()) addSetor.mutate(novoSetor.trim());
                if (e.key === 'Escape') setNovoSetor(null);
              }}
            />
            <button
              disabled={!novoSetor.trim() || addSetor.isPending}
              onClick={() => addSetor.mutate(novoSetor.trim())}
              className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setNovoSetor(null)} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {setores.length === 0 && novoSetor === null && (
            <p className="text-white/40 text-sm text-center py-12">Nenhum setor cadastrado ainda.</p>
          )}

          {setores.map((s) => {
            const isOpen = openIds.has(s.id);
            const isEditing = editSetor?.id === s.id;
            const setorRegras = regras.filter((r) => r.setor_id === s.id);
            return (
              <div key={s.id} className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button onClick={() => toggleOpen(s.id)} className="text-white/60 hover:text-white">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editSetor.nome}
                        onChange={(e) => setEditSetor({ ...editSetor, nome: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editSetor.nome.trim()) updSetor.mutate(editSetor);
                          if (e.key === 'Escape') setEditSetor(null);
                        }}
                        className="flex-1 bg-transparent text-white outline-none text-sm font-medium"
                      />
                      <button onClick={() => updSetor.mutate(editSetor)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditSetor(null)} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => toggleOpen(s.id)} className="flex-1 text-left text-white text-sm font-medium">
                        {s.nome}
                      </button>
                      <span className="text-white/40 text-xs">{setorRegras.length} regra(s)</span>
                      <button onClick={() => setEditSetor({ id: s.id, nome: s.nome })} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remover setor "${s.nome}" e todas as suas regras?`)) delSetor.mutate(s.id);
                        }}
                        className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/5">
                    {setorRegras.map((r) => {
                      const isEdR = editRegra?.id === r.id;
                      return (
                        <div key={r.id} className="p-3 rounded-lg bg-black/30 border border-white/5">
                          {isEdR ? (
                            <div className="space-y-2">
                              <input
                                autoFocus
                                value={editRegra.titulo}
                                onChange={(e) => setEditRegra({ ...editRegra, titulo: e.target.value })}
                                placeholder="Título"
                                className="w-full bg-white/5 px-3 py-2 rounded-lg text-white text-sm outline-none border border-white/10 focus:border-blue-400/40"
                              />
                              <textarea
                                value={editRegra.descricao}
                                onChange={(e) => setEditRegra({ ...editRegra, descricao: e.target.value })}
                                placeholder="Descrição"
                                rows={3}
                                className="w-full bg-white/5 px-3 py-2 rounded-lg text-white text-sm outline-none border border-white/10 focus:border-blue-400/40 resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditRegra(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10">Cancelar</button>
                                <button
                                  disabled={!editRegra.titulo.trim()}
                                  onClick={() => updRegra.mutate(editRegra)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs hover:bg-blue-500/30 disabled:opacity-40"
                                >Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium">{r.titulo}</div>
                                {r.descricao && <div className="text-white/60 text-xs mt-1 whitespace-pre-wrap">{r.descricao}</div>}
                              </div>
                              <button onClick={() => setEditRegra({ id: r.id, titulo: r.titulo, descricao: r.descricao ?? '' })} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { if (confirm('Remover regra?')) delRegra.mutate(r.id); }}
                                className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {novaRegra?.setor_id === s.id ? (
                      <div className="p-3 rounded-lg bg-black/30 border border-blue-400/20 space-y-2">
                        <input
                          autoFocus
                          value={novaRegra.titulo}
                          onChange={(e) => setNovaRegra({ ...novaRegra, titulo: e.target.value })}
                          placeholder="Título"
                          className="w-full bg-white/5 px-3 py-2 rounded-lg text-white text-sm outline-none border border-white/10 focus:border-blue-400/40"
                        />
                        <textarea
                          value={novaRegra.descricao}
                          onChange={(e) => setNovaRegra({ ...novaRegra, descricao: e.target.value })}
                          placeholder="Descrição"
                          rows={3}
                          className="w-full bg-white/5 px-3 py-2 rounded-lg text-white text-sm outline-none border border-white/10 focus:border-blue-400/40 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setNovaRegra(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10">Cancelar</button>
                          <button
                            disabled={!novaRegra.titulo.trim() || addRegra.isPending}
                            onClick={() => addRegra.mutate(novaRegra)}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs hover:bg-blue-500/30 disabled:opacity-40"
                          >Adicionar</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setNovaRegra({ setor_id: s.id, titulo: '', descricao: '' })}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/10 text-white/40 text-xs hover:text-white/80 hover:border-white/20 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nova regra
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}