import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, FileText, Trash2, Loader2 } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface VisitaAgendada {
  id: string;
  titulo: string;
  data_visita: string;
  hora_inicio: string;
  responsavel_id: string | null;
  telefone_contato: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  status: string;
}

interface Responsavel { id: string; nome: string }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEM = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function toDateOnly(iso: string) {
  return iso.slice(0, 10);
}

function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // segunda=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').replace(/-$/, '');
}

const emptyForm = {
  titulo: '',
  data_visita: '',
  hora_inicio: '09:00',
  responsavel_id: '',
  telefone_contato: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  observacoes: '',
};

export default function VisitasTecnicasCalendario() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VisitaAgendada | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ['visitas-agendadas', year, month],
    queryFn: async () => {
      const inicio = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const last = new Date(year, month + 1, 0).getDate();
      const fim = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('visitas_tecnicas_agendadas')
        .select('*')
        .gte('data_visita', inicio)
        .lte('data_visita', fim)
        .order('data_visita').order('hora_inicio');
      if (error) throw error;
      return (data || []) as VisitaAgendada[];
    },
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['admin-users-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return (data || []) as Responsavel[];
    },
  });

  const visitasPorDia = useMemo(() => {
    const map = new Map<string, VisitaAgendada[]>();
    visitas.forEach(v => {
      const k = toDateOnly(v.data_visita);
      const arr = map.get(k) || [];
      arr.push(v);
      map.set(k, arr);
    });
    return map;
  }, [visitas]);

  const openCreate = (dateStr?: string) => {
    setEditing(null);
    setForm({ ...emptyForm, data_visita: dateStr || '' });
    setDialogOpen(true);
  };

  const openEdit = (v: VisitaAgendada) => {
    setEditing(v);
    setForm({
      titulo: v.titulo || '',
      data_visita: toDateOnly(v.data_visita),
      hora_inicio: (v.hora_inicio || '').slice(0, 5),
      responsavel_id: v.responsavel_id || '',
      telefone_contato: v.telefone_contato || '',
      cep: v.cep || '',
      endereco: v.endereco || '',
      numero: v.numero || '',
      complemento: v.complemento || '',
      bairro: v.bairro || '',
      cidade: v.cidade || '',
      estado: v.estado || '',
      observacoes: v.observacoes || '',
    });
    setDialogOpen(true);
  };

  const lookupCep = async (raw: string) => {
    const cep = raw.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await res.json();
      if (j.erro) { toast.error('CEP não encontrado'); return; }
      setForm(f => ({
        ...f,
        endereco: j.logradouro || f.endereco,
        bairro: j.bairro || f.bairro,
        cidade: j.localidade || f.cidade,
        estado: j.uf || f.estado,
      }));
    } catch {
      toast.error('Erro ao consultar CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) throw new Error('Informe o título');
      if (!form.data_visita) throw new Error('Informe a data');
      if (!form.hora_inicio) throw new Error('Informe o horário');
      const payload: any = {
        titulo: form.titulo.trim(),
        data_visita: `${form.data_visita}T12:00:00.000Z`,
        hora_inicio: form.hora_inicio,
        responsavel_id: form.responsavel_id || null,
        telefone_contato: form.telefone_contato || null,
        cep: form.cep || null,
        endereco: form.endereco || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from('visitas_tecnicas_agendadas').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from('visitas_tecnicas_agendadas').insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Visita atualizada' : 'Visita agendada');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('visitas_tecnicas_agendadas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Visita excluída');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!editing) return;
      const { error } = await supabase.from('visitas_tecnicas_agendadas').update({ status }).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Visitas Técnicas' },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/vendas')}
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

      <div
        className="relative z-10 w-full max-w-6xl px-4 pt-20 pb-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Visitas Técnicas</h1>
            <p className="text-white/40 text-sm">Agendamento de visitas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={() => navigate('/vendas/visitas-tecnicas/realizadas')}
            >
              <FileText className="w-4 h-4 mr-2" /> Visitas realizadas
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => openCreate()}>
              <Plus className="w-4 h-4 mr-2" /> Agendar visita
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white/70"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-white font-medium">{MESES[month]} {year}</div>
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white/70"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEM.map(d => (
              <div key={d} className="text-center text-xs text-white/40 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              if (!cell) return <div key={idx} className="min-h-[90px] rounded-md bg-white/[0.02]" />;
              const dateStr = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
              const list = visitasPorDia.get(dateStr) || [];
              return (
                <div
                  key={idx}
                  className={`min-h-[90px] rounded-md border p-1.5 flex flex-col gap-1 transition-colors cursor-pointer ${
                    isToday(cell)
                      ? 'bg-blue-500/10 border-blue-400/40'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                  }`}
                  onClick={() => openCreate(dateStr)}
                >
                  <div className={`text-xs ${isToday(cell) ? 'text-blue-300 font-semibold' : 'text-white/60'}`}>
                    {cell.getDate()}
                  </div>
                  {list.slice(0, 3).map(v => (
                    <button
                      key={v.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                      className={`text-left text-[11px] px-1.5 py-0.5 rounded truncate ${
                        v.status === 'cancelada'
                          ? 'bg-red-500/15 text-red-200 line-through'
                          : v.status === 'realizada'
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : 'bg-blue-500/20 text-blue-100'
                      }`}
                    >
                      <span className="opacity-70">{(v.hora_inicio || '').slice(0, 5)}</span> {v.titulo}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <span className="text-[10px] text-white/40">+{list.length - 3} mais</span>
                  )}
                </div>
              );
            })}
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black/80 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-blue-500/10 sm:rounded-2xl p-6">
          <DialogHeader className="pb-4 border-b border-white/10">
            <DialogTitle className="text-white text-lg font-semibold tracking-tight">
              {editing ? 'Editar visita' : 'Agendar nova visita'}
            </DialogTitle>
            <p className="text-white/40 text-xs mt-1">
              Preencha os dados da visita técnica
            </p>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Título *</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Data *</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white [color-scheme:dark] focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" type="date" value={form.data_visita} onChange={e => setForm({ ...form, data_visita: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Hora *</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white [color-scheme:dark] focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Responsável</label>
              <Select value={form.responsavel_id || 'none'} onValueChange={v => setForm({ ...form, responsavel_id: v === 'none' ? '' : v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white focus:ring-blue-500/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white">
                  <SelectItem value="none">— Sem responsável —</SelectItem>
                  {responsaveis.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Telefone de contato</label>
              <Input
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50"
                value={form.telefone_contato}
                onChange={e => setForm({ ...form, telefone_contato: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">CEP</label>
              <div className="relative mt-1">
                <Input
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50"
                  value={form.cep}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setForm(f => ({ ...f, cep: v }));
                    if (v.length === 8) lookupCep(v);
                  }}
                  placeholder="00000000"
                />
                {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-400" />}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Endereço</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Número</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Complemento</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Bairro</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Cidade</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Estado</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Observações</label>
              <Textarea className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2 pt-4 mt-2 border-t border-white/10">
            {editing && (
              <>
                <Button
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => setStatus.mutate(editing.status === 'realizada' ? 'agendada' : 'realizada')}
                >
                  {editing.status === 'realizada' ? 'Reabrir' : 'Marcar como realizada'}
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => setStatus.mutate(editing.status === 'cancelada' ? 'agendada' : 'cancelada')}
                >
                  {editing.status === 'cancelada' ? 'Reativar' : 'Cancelar visita'}
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-500/20 border border-red-400/30 text-red-200 hover:bg-red-500/30"
                  onClick={() => { if (confirm('Excluir esta visita?')) delMut.mutate(editing.id); }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              </>
            )}
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}