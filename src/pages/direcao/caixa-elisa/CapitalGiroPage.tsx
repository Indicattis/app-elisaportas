import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

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

interface Obrigacao {
  id: string;
  nome: string;
  data: string;
  valor: number;
  pago: boolean;
}

export default function CapitalGiroPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Obrigacao | null>(null);
  const [form, setForm] = useState({ nome: '', data: '', valor: '' });
  const [confirmDelete, setConfirmDelete] = useState<Obrigacao | null>(null);

  const [capitalDialogOpen, setCapitalDialogOpen] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: config } = useQuery({
    queryKey: ['caixa-elisa-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_elisa_config')
        .select('*')
        .eq('id', 'singleton')
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; capital_giro: number } | null;
    },
  });

  const { data: obrigacoes = [] } = useQuery({
    queryKey: ['caixa-elisa-obrigacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_elisa_obrigacoes')
        .select('*')
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Obrigacao[];
    },
  });

  const capitalGiro = Number(config?.capital_giro ?? 0);
  const totalPendente = useMemo(
    () => obrigacoes.filter(o => !o.pago).reduce((s, o) => s + Number(o.valor || 0), 0),
    [obrigacoes],
  );
  const saldoDisponivel = capitalGiro - totalPendente;

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: '', data: format(new Date(), 'yyyy-MM-dd'), valor: '' });
    setDialogOpen(true);
  };

  const openEdit = (o: Obrigacao) => {
    setEditing(o);
    setForm({ nome: o.nome, data: o.data, valor: String(o.valor ?? '') });
    setDialogOpen(true);
  };

  const saveCapital = useMutation({
    mutationFn: async () => {
      const valor = Number(capitalInput.replace(',', '.')) || 0;
      const { error } = await supabase
        .from('caixa_elisa_config')
        .upsert({ id: 'singleton', capital_giro: valor });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-config'] });
      setCapitalDialogOpen(false);
      toast.success('Capital de Giro atualizado.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar.'),
  });

  const saveObrigacao = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome.trim(),
        data: form.data,
        valor: Number(form.valor.replace(',', '.')) || 0,
      };
      if (!payload.nome) throw new Error('Informe o nome.');
      if (!payload.data) throw new Error('Informe a data.');
      if (editing) {
        const { error } = await supabase
          .from('caixa_elisa_obrigacoes')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const { error } = await supabase
          .from('caixa_elisa_obrigacoes')
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-obrigacoes'] });
      setDialogOpen(false);
      toast.success(editing ? 'Obrigação atualizada.' : 'Obrigação criada.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar.'),
  });

  const togglePago = useMutation({
    mutationFn: async ({ id, pago }: { id: string; pago: boolean }) => {
      const { error } = await supabase
        .from('caixa_elisa_obrigacoes')
        .update({ pago })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caixa-elisa-obrigacoes'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
  });

  const deleteObrigacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('caixa_elisa_obrigacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-elisa-obrigacoes'] });
      setConfirmDelete(null);
      toast.success('Obrigação removida.');
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
          { label: 'Caixa Elisa', path: '/direcao/caixa-elisa' },
          { label: '2M - Capital de Giro' },
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Wallet className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">2M - Capital de Giro</h1>
              <p className="text-sm text-white/50">Acompanhe o saldo disponível conforme as obrigações</p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border border-emerald-400/30 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova obrigação
          </Button>
        </div>

        {/* Indicadores */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-center relative">
            <div className="text-xs tracking-widest text-white/40 uppercase">Capital de Giro</div>
            <div className="mt-3 text-4xl md:text-5xl font-bold text-white tracking-tight">
              {formatBRL(capitalGiro)}
            </div>
            <button
              onClick={() => {
                setCapitalInput(String(capitalGiro));
                setCapitalDialogOpen(true);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
              aria-label="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-center">
            <div className="text-xs tracking-widest text-white/40 uppercase">Saldo Disponível</div>
            <div className={`mt-3 text-4xl md:text-5xl font-bold tracking-tight ${saldoDisponivel < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
              {formatBRL(saldoDisponivel)}
            </div>
            <div className="mt-2 text-xs text-white/40">
              {formatBRL(totalPendente)} pendentes
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-3">
          {obrigacoes.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/40">Nenhuma obrigação cadastrada.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {obrigacoes.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition"
                >
                  <Checkbox
                    checked={o.pago}
                    onCheckedChange={(v) => togglePago.mutate({ id: o.id, pago: !!v })}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`font-semibold truncate ${o.pago ? 'text-white/40 line-through' : 'text-white'}`}>
                      {o.nome}
                    </span>
                    <span className="text-xs text-white/40">
                      {format(new Date(o.data + 'T12:00:00'), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className={`font-semibold whitespace-nowrap ${o.pago ? 'text-white/40' : 'text-white'}`}>
                    {formatBRL(Number(o.valor))}
                  </div>
                  <button
                    onClick={() => openEdit(o)}
                    className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition"
                    aria-label="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(o)}
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

      {/* Capital edit dialog */}
      <Dialog open={capitalDialogOpen} onOpenChange={setCapitalDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Editar Capital de Giro</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-white/70">Valor (R$)</Label>
            <Input
              inputMode="decimal"
              value={capitalInput}
              onChange={(e) => setCapitalInput(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCapitalDialogOpen(false)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => saveCapital.mutate()}
              disabled={saveCapital.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Obrigacao dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar obrigação' : 'Nova obrigação'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-white/70">Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Aluguel galpão"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Data</Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Valor (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value.replace(/[^0-9.,]/g, '') }))}
                placeholder="0,00"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => saveObrigacao.mutate()}
              disabled={saveObrigacao.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Excluir obrigação?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Tem certeza que deseja excluir <span className="font-semibold text-white">{confirmDelete?.nome}</span>?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDelete && deleteObrigacao.mutate(confirmDelete.id)}
              disabled={deleteObrigacao.isPending}
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