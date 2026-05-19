import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Plus, Pencil, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { FloatingProfileMenu } from '@/components/FloatingProfileMenu';
import { DelayedParticles } from '@/components/DelayedParticles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const COR_PRESETS: { value: string; label: string; classes: string }[] = [
  { value: 'amber',   label: 'Âmbar',    classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'emerald', label: 'Verde',    classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'rose',    label: 'Vermelho', classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  { value: 'sky',     label: 'Azul',     classes: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { value: 'violet',  label: 'Roxo',     classes: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { value: 'slate',   label: 'Cinza',    classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
];

const corClasses = (cor?: string | null) =>
  COR_PRESETS.find((c) => c.value === cor)?.classes ?? COR_PRESETS[3].classes;

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

interface Etiqueta { id: string; nome: string; cor: string }
interface Entrada {
  id: string;
  nome: string;
  valor: number;
  etiqueta_id: string | null;
  ordem: number;
  etiqueta?: Etiqueta | null;
}

export default function CaixaRoboostDirecao() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entrada | null>(null);
  const [form, setForm] = useState({ nome: '', valor: '', etiqueta_id: '' as string });
  const [novaEtiqueta, setNovaEtiqueta] = useState({ nome: '', cor: 'sky' });
  const [criandoEtiqueta, setCriandoEtiqueta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Entrada | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: etiquetas = [] } = useQuery({
    queryKey: ['caixa-roboost-etiquetas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_roboost_etiquetas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as Etiqueta[];
    },
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ['caixa-roboost-entradas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_roboost_entradas')
        .select('*, etiqueta:caixa_roboost_etiquetas(*)')
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Entrada[];
    },
  });

  const total = useMemo(
    () => entradas.reduce((acc, e) => acc + Number(e.valor || 0), 0),
    [entradas],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: '', valor: '', etiqueta_id: '' });
    setCriandoEtiqueta(false);
    setNovaEtiqueta({ nome: '', cor: 'sky' });
    setDialogOpen(true);
  };

  const openEdit = (e: Entrada) => {
    setEditing(e);
    setForm({
      nome: e.nome,
      valor: String(e.valor ?? ''),
      etiqueta_id: e.etiqueta_id ?? '',
    });
    setCriandoEtiqueta(false);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let etiquetaId: string | null = form.etiqueta_id || null;
      if (criandoEtiqueta && novaEtiqueta.nome.trim()) {
        const { data, error } = await supabase
          .from('caixa_roboost_etiquetas')
          .insert({ nome: novaEtiqueta.nome.trim(), cor: novaEtiqueta.cor })
          .select('*')
          .single();
        if (error) throw error;
        etiquetaId = data.id;
      }
      const payload = {
        nome: form.nome.trim(),
        valor: Number(form.valor.replace(',', '.')) || 0,
        etiqueta_id: etiquetaId,
      };
      if (!payload.nome) throw new Error('Informe o nome.');
      if (editing) {
        const { error } = await supabase
          .from('caixa_roboost_entradas')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const ordem = (entradas[entradas.length - 1]?.ordem ?? -1) + 1;
        const { error } = await supabase
          .from('caixa_roboost_entradas')
          .insert({ ...payload, ordem });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-roboost-entradas'] });
      qc.invalidateQueries({ queryKey: ['caixa-roboost-etiquetas'] });
      setDialogOpen(false);
      toast.success(editing ? 'Entrada atualizada.' : 'Entrada criada.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('caixa_roboost_entradas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-roboost-entradas'] });
      setConfirmDelete(null);
      toast.success('Entrada removida.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir.'),
  });

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Caixa Roboost' },
        ]}
        mounted={mounted}
      />
      <FloatingProfileMenu mounted={mounted} />

      <button
        onClick={() => navigate('/direcao')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-16">
        {/* Header card */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <Wallet className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Caixa Roboost</h1>
              <p className="text-sm text-white/50">Cadastre valores e organize-os com etiquetas</p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border border-blue-400/30 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova entrada
          </Button>
        </div>

        {/* Total */}
        <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-center">
          <div className="text-xs tracking-widest text-white/40 uppercase">Montante Total</div>
          <div className="mt-3 text-4xl md:text-5xl font-bold text-white tracking-tight">
            {formatBRL(total)}
          </div>
          <div className="mt-2 text-sm text-white/40">
            {entradas.length} {entradas.length === 1 ? 'entrada' : 'entradas'}
          </div>
        </div>

        {/* Lista */}
        <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-3">
          {entradas.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/40">
              Nenhuma entrada cadastrada.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {entradas.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition"
                >
                  <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-semibold text-white truncate">{e.nome}</span>
                    {e.etiqueta && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${corClasses(e.etiqueta.cor)}`}>
                        {e.etiqueta.nome}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-white whitespace-nowrap">{formatBRL(Number(e.valor))}</div>
                  <button
                    onClick={() => openEdit(e)}
                    className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition"
                    aria-label="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(e)}
                    className="p-1.5 rounded-md text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 transition"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dialog Nova/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar entrada' : 'Nova entrada'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-white/70">Nome</Label>
              <Input
                value={form.nome}
                onChange={(ev) => setForm((f) => ({ ...f, nome: ev.target.value }))}
                placeholder="Ex.: Banco Sicredi"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Valor (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.valor}
                onChange={(ev) => setForm((f) => ({ ...f, valor: ev.target.value.replace(/[^0-9.,]/g, '') }))}
                placeholder="0,00"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-white/70">Etiqueta</Label>
                <button
                  type="button"
                  onClick={() => setCriandoEtiqueta((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {criandoEtiqueta ? 'Selecionar existente' : '+ Nova etiqueta'}
                </button>
              </div>
              {criandoEtiqueta ? (
                <div className="flex gap-2">
                  <Input
                    value={novaEtiqueta.nome}
                    onChange={(ev) => setNovaEtiqueta((n) => ({ ...n, nome: ev.target.value }))}
                    placeholder="Nome da etiqueta"
                    className="bg-white/5 border-white/10 text-white flex-1"
                  />
                  <Select
                    value={novaEtiqueta.cor}
                    onValueChange={(v) => setNovaEtiqueta((n) => ({ ...n, cor: v }))}
                  >
                    <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white">
                      {COR_PRESETS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${c.classes}`} />
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Select
                  value={form.etiqueta_id || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, etiqueta_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Sem etiqueta" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white">
                    <SelectItem value="none">Sem etiqueta</SelectItem>
                    {etiquetas.map((et) => (
                      <SelectItem key={et.id} value={et.id}>
                        <span className={`inline-flex items-center gap-2`}>
                          <span className={`w-2.5 h-2.5 rounded-full border ${corClasses(et.cor)}`} />
                          {et.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Excluir entrada?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Tem certeza que deseja excluir <span className="font-semibold text-white">{confirmDelete?.nome}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}