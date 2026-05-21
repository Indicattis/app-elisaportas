import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

interface Mes { id: string; mes: string }
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import { Checkbox } from '@/components/ui/checkbox';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

interface Item { id: string; mes_id: string; nome: string; valor: number; data: string | null; pago: boolean }

export default function PlanejamentoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const [mesDialogOpen, setMesDialogOpen] = useState(false);
  const [mesInput, setMesInput] = useState(''); // yyyy-MM
  const [editingMes, setEditingMes] = useState<Mes | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<{ mes_id: string; nome: string; valor: string; data: string }>({ mes_id: '', nome: '', valor: '', data: '' });
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [confirmDeleteMes, setConfirmDeleteMes] = useState<Mes | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: meses = [] } = useQuery({
    queryKey: ['caixa-elisa-planejamento-meses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_elisa_planejamento_meses')
        .select('*')
        .order('mes', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Mes[];
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ['caixa-elisa-planejamento-itens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_elisa_planejamento_itens')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const grupos = useMemo(() => {
    return meses.map((m) => {
      const d = new Date(m.mes + 'T12:00:00');
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
      const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
      const items = itens.filter((i) => i.mes_id === m.id);
      const subtotal = items.reduce((s, i) => s + Number(i.valor || 0), 0);
      return { mes: m, label: labelCap, items, subtotal };
    });
  }, [meses, itens]);

  const totalAcumulado = useMemo(
    () => itens.reduce((s, i) => s + Number(i.valor || 0), 0),
    [itens],
  );
  const totalPago = useMemo(
    () => itens.filter((i) => i.pago).reduce((s, i) => s + Number(i.valor || 0), 0),
    [itens],
  );

  const addMes = useMutation({
    mutationFn: async () => {
      if (!mesInput) throw new Error('Selecione o mês.');
      const dia = `${mesInput}-01`;
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from('caixa_elisa_planejamento_meses')
        .insert({ mes: dia, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-meses'] });
      setMesDialogOpen(false);
      setMesInput('');
      toast.success('Mês adicionado.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao adicionar mês.'),
  });

  const updateMes = useMutation({
    mutationFn: async () => {
      if (!editingMes || !mesInput) throw new Error('Selecione o mês.');
      const dia = `${mesInput}-01`;
      const { error } = await supabase
        .from('caixa_elisa_planejamento_meses')
        .update({ mes: dia })
        .eq('id', editingMes.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-meses'] });
      setMesDialogOpen(false);
      setEditingMes(null);
      setMesInput('');
      toast.success('Mês atualizado.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar mês.'),
  });

  const deleteMes = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('caixa_elisa_planejamento_meses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-meses'] });
      qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-itens'] });
      setConfirmDeleteMes(null);
      toast.success('Mês removido.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir.'),
  });

  const saveItem = useMutation({
    mutationFn: async () => {
      const payload = {
        mes_id: itemForm.mes_id,
        nome: itemForm.nome.trim(),
        valor: Number(itemForm.valor.replace(',', '.')) || 0,
        data: itemForm.data ? itemForm.data : null,
      };
      if (!payload.nome) throw new Error('Informe o nome.');
      if (editingItem) {
        const { error } = await supabase
          .from('caixa_elisa_planejamento_itens')
          .update({ nome: payload.nome, valor: payload.valor, data: payload.data })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const { error } = await supabase
          .from('caixa_elisa_planejamento_itens')
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-itens'] });
      setItemDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? 'Item atualizado.' : 'Item adicionado.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar.'),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('caixa_elisa_planejamento_itens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-itens'] });
      setConfirmDeleteItem(null);
      toast.success('Item removido.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir.'),
  });

  const togglePago = useMutation({
    mutationFn: async ({ id, pago }: { id: string; pago: boolean }) => {
      const { error } = await supabase
        .from('caixa_elisa_planejamento_itens')
        .update({ pago })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caixa-elisa-planejamento-itens'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
  });

  const openAddItem = (mes_id: string) => {
    setEditingItem(null);
    setItemForm({ mes_id, nome: '', valor: '', data: '' });
    setItemDialogOpen(true);
  };

  const openEditItem = (it: Item) => {
    setEditingItem(it);
    setItemForm({ mes_id: it.mes_id, nome: it.nome, valor: String(it.valor ?? ''), data: it.data ?? '' });
    setItemDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Caixa Elisa', path: '/direcao/caixa-elisa' },
          { label: 'Planejamento 2 Milhões de Giro' },
        ]}
        mounted={mounted}
      />
      <FloatingProfileMenu mounted={mounted} />

      <button
        onClick={() => navigate('/direcao/caixa-elisa')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 pt-24 pb-16">
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CalendarRange className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Planejamento 2 Milhões de Giro</h1>
              <p className="text-sm text-white/50">Adicione meses e seus respectivos itens</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setMesInput(format(new Date(), 'yyyy-MM'));
              setMesDialogOpen(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border border-emerald-400/30 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar mês
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:flex-1 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            {grupos.length === 0 ? (
              <div className="py-10 text-center text-sm text-white/40">Nenhum mês adicionado.</div>
            ) : (
              <div className="flex flex-col gap-6">
                {grupos.map((g) => (
                  <div key={g.mes.id}>
                    <div className="flex items-center justify-between mb-2 px-2 gap-2">
                      <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{g.label}</h2>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">
                          Subtotal: <span className="text-white font-semibold">{formatBRL(g.subtotal)}</span>
                        </span>
                        <button
                          onClick={() => openAddItem(g.mes.id)}
                          className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Item
                        </button>
                        <button
                          onClick={() => setConfirmDeleteMes(g.mes)}
                          className="p-1 rounded-md text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 transition"
                          aria-label="Excluir mês"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {g.items.length === 0 ? (
                      <div className="py-4 px-2 text-xs text-white/30">Nenhum item neste mês.</div>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {g.items.map((it) => (
                          <li
                            key={it.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                          >
                            <Checkbox
                              checked={it.pago}
                              onCheckedChange={(v) => togglePago.mutate({ id: it.id, pago: !!v })}
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className={`font-semibold truncate ${it.pago ? 'text-white/40 line-through' : 'text-white'}`}>
                                {it.nome}
                              </span>
                              {it.data && (
                                <span className="text-xs text-white/40">
                                  {format(new Date(it.data + 'T12:00:00'), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                            <div className={`font-semibold whitespace-nowrap ${it.pago ? 'text-white/40' : 'text-white'}`}>
                              {formatBRL(Number(it.valor))}
                            </div>
                            <button
                              onClick={() => openEditItem(it)}
                              className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition"
                              aria-label="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteItem(it)}
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
                ))}
              </div>
            )}
          </div>

          <div className="lg:w-64 flex flex-col gap-4">
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center">
              <div className="text-xs tracking-widest text-white/40 uppercase">Total Acumulado</div>
              <div className="mt-3 text-3xl font-bold text-white tracking-tight">{formatBRL(totalAcumulado)}</div>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center">
              <div className="text-xs tracking-widest text-white/40 uppercase">Total Pago</div>
              <div className="mt-3 text-3xl font-bold text-emerald-300 tracking-tight">{formatBRL(totalPago)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Adicionar mês */}
      <Dialog open={mesDialogOpen} onOpenChange={setMesDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar mês</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-white/70">Mês</Label>
            <Input
              type="month"
              value={mesInput}
              onChange={(e) => setMesInput(e.target.value)}
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMesDialogOpen(false)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => addMes.mutate()}
              disabled={addMes.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adicionar/Editar item */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar item' : 'Novo item'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-white/70">Nome</Label>
              <Input
                value={itemForm.nome}
                onChange={(e) => setItemForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Aluguel"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Valor (R$)</Label>
              <Input
                inputMode="decimal"
                value={itemForm.valor}
                onChange={(e) => setItemForm((f) => ({ ...f, valor: e.target.value.replace(/[^0-9.,]/g, '') }))}
                placeholder="0,00"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Data</Label>
              <Input
                type="date"
                value={itemForm.data}
                onChange={(e) => setItemForm((f) => ({ ...f, data: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setItemDialogOpen(false)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => saveItem.mutate()}
              disabled={saveItem.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete mês */}
      <Dialog open={!!confirmDeleteMes} onOpenChange={(o) => !o && setConfirmDeleteMes(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Excluir mês?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Isso removerá o mês e todos os seus itens.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteMes(null)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDeleteMes && deleteMes.mutate(confirmDeleteMes.id)}
              disabled={deleteMes.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete item */}
      <Dialog open={!!confirmDeleteItem} onOpenChange={(o) => !o && setConfirmDeleteItem(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Excluir item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Tem certeza que deseja excluir <span className="font-semibold text-white">{confirmDeleteItem?.nome}</span>?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteItem(null)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDeleteItem && deleteItem.mutate(confirmDeleteItem.id)}
              disabled={deleteItem.isPending}
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