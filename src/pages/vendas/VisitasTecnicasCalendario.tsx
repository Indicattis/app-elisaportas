import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, FileText, Trash2, Loader2, CalendarIcon, Check, ChevronsUpDown, ClipboardList, AlertCircle, Pencil, CheckCircle2, MapPin, Phone, User, Clock, Search, XCircle, PlayCircle, ArrowRight } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { VisitasHistoricoPanel } from '@/components/vendas/VisitasHistoricoPanel';
import { logVisitaHistorico, diffVisita } from '@/lib/visitasHistorico';
import { useAuth } from '@/hooks/useAuth';
import { addDays, startOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VisitaAgendada {
  id: string;
  titulo: string;
  tipo: 'visita_tecnica' | 'manutencao';
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

function dateToYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ymdToDate(ymd: string): Date | undefined {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatYmdBR(ymd: string) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function ResponsavelCombobox({
  value,
  onChange,
  responsaveis,
}: {
  value: string;
  onChange: (id: string) => void;
  responsaveis: Responsavel[];
}) {
  const [open, setOpen] = useState(false);
  const selected = responsaveis.find(r => r.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "mt-1 w-full justify-between font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
            !selected && "text-white/40"
          )}
        >
          {selected ? selected.nome : 'Selecione'}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-white/10" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Buscar responsável..." className="text-white" />
          <CommandList>
            <CommandEmpty className="text-white/50 text-sm p-2">Nenhum encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(''); setOpen(false); }}
                className="text-white/70 aria-selected:bg-white/10"
              >
                <Check className={cn("mr-2 h-3 w-3", !value ? "opacity-100" : "opacity-0")} />
                — Sem responsável —
              </CommandItem>
              {responsaveis.map(r => (
                <CommandItem
                  key={r.id}
                  value={r.nome}
                  onSelect={() => { onChange(r.id); setOpen(false); }}
                  className="text-white aria-selected:bg-white/10"
                >
                  <Check className={cn("mr-2 h-3 w-3", value === r.id ? "opacity-100" : "opacity-0")} />
                  {r.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DroppableDayCell({
  dateStr,
  isCurrentDay,
  onAddClick,
  children,
}: {
  dateStr: string;
  isCurrentDay: boolean;
  onAddClick: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  return (
    <div
      ref={setNodeRef}
      onClick={onAddClick}
      className={`min-h-[64px] sm:min-h-[100px] lg:min-h-[140px] rounded-md border p-1 sm:p-2 lg:p-2.5 flex flex-col gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
        isCurrentDay
          ? 'bg-blue-500/10 border-blue-400/40'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
      } ${isOver ? 'ring-2 ring-blue-400/60 bg-blue-500/15' : ''}`}
    >
      {children}
    </div>
  );
}

function DraggableVisitaChip({ visita, onOpen, onDelete }: { visita: VisitaAgendada; onOpen: () => void; onDelete?: () => void }) {
  const disabled = visita.status === 'concluida' || visita.status === 'cancelada';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: visita.id, disabled });
  const cls =
    visita.status === 'cancelada'
      ? 'bg-red-500/15 text-red-200 line-through'
      : (visita.status === 'realizada' || visita.status === 'concluida')
      ? 'bg-emerald-500/15 text-emerald-200'
      : 'bg-blue-500/20 text-blue-100';
  return (
    <div className="relative group">
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className={`w-full text-left text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1.5 rounded truncate ${cls} ${isDragging ? 'opacity-30' : ''} ${disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <span className="opacity-70">{(visita.hora_inicio || '').slice(0, 5)}</span>
        {visita.tipo === 'manutencao' && (
          <span className="ml-1 px-1 py-px rounded bg-amber-500/30 text-amber-100 text-[9px] uppercase tracking-wide">Man</span>
        )}
        <span className="hidden sm:inline"> {visita.titulo}</span>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-red-300 hover:text-red-100 hover:bg-red-500/40"
          title="Excluir visita"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

const emptyForm = {
  titulo: '',
  tipo: 'visita_tecnica' as 'visita_tecnica' | 'manutencao',
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
  const { userRole } = useAuth();
  const usuario_id = userRole?.user_id || null;
  const usuario_nome = userRole?.nome || null;
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VisitaAgendada | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [cepLoading, setCepLoading] = useState(false);
  const [activeDrag, setActiveDrag] = useState<VisitaAgendada | null>(null);
  const [tab, setTab] = useState<'calendario' | 'concluir'>('calendario');
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<VisitaAgendada | null>(null);
  const [listaFiltro, setListaFiltro] = useState<'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'todos'>('pendente');
  const [listaBusca, setListaBusca] = useState('');
  const handleTabChange = (next: 'calendario' | 'concluir') => {
    if (next === tab) return;
    setTabDirection(next === 'concluir' ? 'right' : 'left');
    setTab(next);
  };

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  // Mobile: visualização semanal (estilo logística)
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { data: visitasSemana = [] } = useQuery({
    queryKey: ['visitas-semana', dateToYmd(weekStart)],
    queryFn: async () => {
      const inicio = dateToYmd(weekDays[0]);
      const fim = dateToYmd(weekDays[6]);
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

  const visitasSemanaPorDia = useMemo(() => {
    const map = new Map<string, VisitaAgendada[]>();
    visitasSemana.forEach(v => {
      const k = toDateOnly(v.data_visita);
      const arr = map.get(k) || [];
      arr.push(v);
      map.set(k, arr);
    });
    return map;
  }, [visitasSemana]);

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

  const { data: visitasAConcluir = [] } = useQuery({
    queryKey: ['visitas-a-concluir'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitas_tecnicas_agendadas')
        .select('*')
        .in('status', ['agendada', 'realizada'])
        .order('data_visita', { ascending: true })
        .order('hora_inicio', { ascending: true });
      if (error) throw error;
      return (data || []) as VisitaAgendada[];
    },
  });

  const { data: visitasLista = [] } = useQuery({
    queryKey: ['visitas-lista-todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitas_tecnicas_agendadas')
        .select('*')
        .order('data_visita', { ascending: false })
        .order('hora_inicio', { ascending: false });
      if (error) throw error;
      return (data || []) as VisitaAgendada[];
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
    setForm({ ...emptyForm, data_visita: dateStr || '', responsavel_id: usuario_id || '' });
    setDialogOpen(true);
  };

  const openDetail = (v: VisitaAgendada) => {
    setSelectedVisita(v);
    setDetailOpen(true);
  };

  const openEdit = (v: VisitaAgendada) => {
    setEditing(v);
    setForm({
      titulo: v.titulo || '',
      tipo: (v.tipo as 'visita_tecnica' | 'manutencao') || 'visita_tecnica',
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
      // Trava: intervalo mínimo de 30min entre visitas no mesmo dia
      {
        const [h, m] = form.hora_inicio.split(':').map(Number);
        const novaMin = h * 60 + m;
        const { data: doDia, error: errConf } = await supabase
          .from('visitas_tecnicas_agendadas')
          .select('id, hora_inicio, titulo, status')
          .gte('data_visita', `${form.data_visita}T00:00:00.000Z`)
          .lte('data_visita', `${form.data_visita}T23:59:59.999Z`)
          .in('status', ['agendada', 'realizada']);
        if (errConf) throw errConf;
        const conflito = (doDia || []).find((v: any) => {
          if (editing && v.id === editing.id) return false;
          const [vh, vm] = String(v.hora_inicio || '00:00').split(':').map(Number);
          return Math.abs((vh * 60 + vm) - novaMin) < 30;
        });
        if (conflito) {
          throw new Error(`Conflito de horário com "${conflito.titulo}" às ${String(conflito.hora_inicio).slice(0,5)}. Mantenha ao menos 30 min de intervalo.`);
        }
      }
      const payload: any = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
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
      const respNome = responsaveis.find(r => r.id === form.responsavel_id)?.nome || null;
      if (editing) {
        const { error } = await supabase.from('visitas_tecnicas_agendadas').update(payload).eq('id', editing.id);
        if (error) throw error;
        const antes = { ...editing };
        const depois = { ...editing, ...payload };
        const diff = diffVisita(antes, depois);
        const dataMudou = !!diff['data_visita'];
        await logVisitaHistorico({
          visita_id: editing.id,
          acao: dataMudou ? 'reagendada' : 'alterada',
          titulo: payload.titulo,
          data_visita: payload.data_visita,
          data_anterior: dataMudou ? editing.data_visita : null,
          responsavel_nome: respNome,
          cidade: payload.cidade,
          estado: payload.estado,
          detalhes: diff,
          usuario_id, usuario_nome,
        });
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data: created, error } = await supabase
          .from('visitas_tecnicas_agendadas')
          .insert({ ...payload, created_by: u.user?.id })
          .select('id')
          .single();
        if (error) throw error;
        await logVisitaHistorico({
          visita_id: created?.id || null,
          acao: 'criada',
          titulo: payload.titulo,
          data_visita: payload.data_visita,
          responsavel_nome: respNome,
          cidade: payload.cidade,
          estado: payload.estado,
          usuario_id, usuario_nome,
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Visita atualizada' : 'Visita agendada');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
      qc.invalidateQueries({ queryKey: ['visitas-semana'] });
      qc.invalidateQueries({ queryKey: ['visitas-a-concluir'] });
      qc.invalidateQueries({ queryKey: ['visitas-historico'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const snap = editing;
      const { error } = await supabase.from('visitas_tecnicas_agendadas').delete().eq('id', id);
      if (error) throw error;
      await logVisitaHistorico({
        visita_id: id,
        acao: 'excluida',
        titulo: snap?.titulo,
        data_visita: snap?.data_visita,
        cidade: snap?.cidade,
        estado: snap?.estado,
        usuario_id, usuario_nome,
      });
    },
    onSuccess: () => {
      toast.success('Visita excluída');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
      qc.invalidateQueries({ queryKey: ['visitas-semana'] });
      qc.invalidateQueries({ queryKey: ['visitas-a-concluir'] });
      qc.invalidateQueries({ queryKey: ['visitas-historico'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!editing) return;
      const { error } = await supabase.from('visitas_tecnicas_agendadas').update({ status }).eq('id', editing.id);
      if (error) throw error;
      await logVisitaHistorico({
        visita_id: editing.id,
        acao: 'alterada',
        titulo: editing.titulo,
        data_visita: editing.data_visita,
        cidade: editing.cidade,
        estado: editing.estado,
        detalhes: { status: { de: editing.status, para: status } },
        usuario_id, usuario_nome,
      });
    },
    onSuccess: () => {
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
      qc.invalidateQueries({ queryKey: ['visitas-semana'] });
      qc.invalidateQueries({ queryKey: ['visitas-a-concluir'] });
      qc.invalidateQueries({ queryKey: ['visitas-historico'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reagendarMut = useMutation({
    mutationFn: async ({ visita, novaData }: { visita: VisitaAgendada; novaData: string }) => {
      const dataAnterior = toDateOnly(visita.data_visita);
      if (dataAnterior === novaData) return;
      // Trava: intervalo mínimo de 30min ao arrastar para outro dia
      {
        const [vh, vm] = String(visita.hora_inicio || '00:00').split(':').map(Number);
        const novaMin = vh * 60 + vm;
        const { data: doDia, error: errConf } = await supabase
          .from('visitas_tecnicas_agendadas')
          .select('id, hora_inicio, titulo, status')
          .gte('data_visita', `${novaData}T00:00:00.000Z`)
          .lte('data_visita', `${novaData}T23:59:59.999Z`)
          .in('status', ['agendada', 'realizada']);
        if (errConf) throw errConf;
        const conflito = (doDia || []).find((v: any) => {
          if (v.id === visita.id) return false;
          const [h, m] = String(v.hora_inicio || '00:00').split(':').map(Number);
          return Math.abs((h * 60 + m) - novaMin) < 30;
        });
        if (conflito) {
          throw new Error(`Conflito com "${conflito.titulo}" às ${String(conflito.hora_inicio).slice(0,5)}. Mantenha ao menos 30 min de intervalo.`);
        }
      }
      const { error } = await supabase
        .from('visitas_tecnicas_agendadas')
        .update({ data_visita: `${novaData}T12:00:00.000Z` })
        .eq('id', visita.id);
      if (error) throw error;
      const respNome = responsaveis.find(r => r.id === visita.responsavel_id)?.nome || null;
      await logVisitaHistorico({
        visita_id: visita.id,
        acao: 'reagendada',
        titulo: visita.titulo,
        data_visita: novaData,
        data_anterior: dataAnterior,
        responsavel_nome: respNome,
        cidade: visita.cidade,
        estado: visita.estado,
        detalhes: { origem: 'drag-and-drop' },
        usuario_id, usuario_nome,
      });
    },
    onSuccess: () => {
      toast.success('Visita reagendada');
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
      qc.invalidateQueries({ queryKey: ['visitas-semana'] });
      qc.invalidateQueries({ queryKey: ['visitas-a-concluir'] });
      qc.invalidateQueries({ queryKey: ['visitas-historico'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao reagendar'),
  });

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const v = visitas.find(x => x.id === id);
    setActiveDrag(v || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const dragged = activeDrag;
    setActiveDrag(null);
    if (!e.over || !dragged) return;
    const novaData = String(e.over.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return;
    if (toDateOnly(dragged.data_visita) === novaData) return;
    if (dragged.status === 'concluida' || dragged.status === 'cancelada') {
      toast.error('Visitas concluídas ou canceladas não podem ser reagendadas');
      return;
    }
    reagendarMut.mutate({ visita: dragged, novaData });
  };

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
        className="relative z-10 w-full px-4 sm:px-6 lg:px-[100px] pt-20 pb-10"
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 flex-1 sm:flex-none"
              onClick={() => navigate('/vendas/visitas-tecnicas/realizadas')}
            >
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Visitas realizadas</span>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white flex-1 sm:flex-none" onClick={() => openCreate()}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Agendar visita</span>
              <span className="sm:hidden">Agendar</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 mx-auto max-w-md">
          <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1">
            {([
              { key: 'calendario' as const, label: 'Calendário' },
              { key: 'concluir' as const, label: 'Lista' },
            ]).map(t => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`flex-1 h-10 px-4 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    active
                      ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {t.label}
                  {t.key === 'concluir' && visitasAConcluir.length > 0 && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-200 border border-blue-400/20'}`}>
                      {visitasAConcluir.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={tab}
          className={tabDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
        >
        {tab === 'calendario' && (
        <>
        {/* Mobile: visualização semanal estilo logística */}
        <div className="lg:hidden rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 mb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {format(weekStart, "dd 'de' MMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
              </p>
              <button
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
                className="text-[11px] text-blue-300 hover:text-blue-200"
              >
                Ir para hoje
              </button>
            </div>
            <button
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {weekDays.map(day => {
              const dateStr = dateToYmd(day);
              const list = visitasSemanaPorDia.get(dateStr) || [];
              const today = isToday(day);
              return (
                <div
                  key={dateStr}
                  className={`rounded-lg border p-3 ${today ? 'bg-blue-500/10 border-blue-400/40' : 'bg-white/[0.03] border-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-semibold ${today ? 'text-blue-300' : 'text-white'}`}>
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs text-white/70 capitalize">{format(day, 'EEEE', { locale: ptBR })}</span>
                        <span className="text-[10px] text-white/40 capitalize">{format(day, "MMM 'de' yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openCreate(dateStr)}
                      className="p-1.5 rounded-md bg-blue-500/15 border border-blue-400/20 text-blue-200 hover:bg-blue-500/25"
                      aria-label="Agendar visita"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {list.length === 0 ? (
                    <div className="text-xs text-white/30 py-1">Sem visitas</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {list.map(v => {
                        const cls =
                          v.status === 'cancelada'
                            ? 'bg-red-500/15 text-red-200 line-through'
                            : (v.status === 'realizada' || v.status === 'concluida')
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'bg-blue-500/20 text-blue-100';
                        const local = [v.cidade, v.estado].filter(Boolean).join('/');
                        return (
                          <li key={v.id}>
                            <button
                              onClick={() => openDetail(v)}
                              className={`w-full text-left px-2.5 py-2 rounded-md ${cls} flex items-center gap-2`}
                            >
                              <span className="text-[11px] font-mono opacity-80 shrink-0">
                                {(v.hora_inicio || '').slice(0, 5)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{v.titulo}</div>
                                {local && <div className="text-[10px] opacity-70 truncate">{local}</div>}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop / tablet: grid mensal */}
        <div className="hidden lg:block rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-2 sm:p-4">
          <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
            {DIAS_SEM.map(d => (
              <div key={d} className="text-center text-[10px] sm:text-xs text-white/40 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {grid.map((cell, idx) => {
              if (!cell) return <div key={idx} className="min-h-[64px] sm:min-h-[100px] lg:min-h-[140px] rounded-md bg-white/[0.02]" />;
              const dateStr = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
              const list = visitasPorDia.get(dateStr) || [];
              return (
                <DroppableDayCell
                  key={idx}
                  dateStr={dateStr}
                  isCurrentDay={isToday(cell)}
                  onAddClick={() => openCreate(dateStr)}
                >
                  <div className={`text-[10px] sm:text-xs ${isToday(cell) ? 'text-blue-300 font-semibold' : 'text-white/60'}`}>
                    {cell.getDate()}
                  </div>
                  {list.slice(0, 2).map(v => (
                    <DraggableVisitaChip
                      key={v.id}
                      visita={v}
                      onOpen={() => openDetail(v)}
                      onDelete={() => { if (confirm('Excluir esta visita?')) delMut.mutate(v.id); }}
                    />
                  ))}
                  {list.length > 2 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] sm:text-[10px] text-blue-300 hover:text-blue-200 hover:bg-white/10 rounded px-1 py-0.5 transition-colors self-start"
                        >
                          +{list.length - 2} mais
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-64 p-2 bg-zinc-900/95 backdrop-blur-xl border-white/10 space-y-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] uppercase tracking-wider text-white/40 px-1 pb-1">
                          {formatYmdBR(dateStr)} · {list.length} visitas
                        </div>
                        {list.slice(2).map(v => (
                          <DraggableVisitaChip
                            key={v.id}
                            visita={v}
                            onOpen={() => openDetail(v)}
                            onDelete={() => { if (confirm('Excluir esta visita?')) delMut.mutate(v.id); }}
                          />
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                </DroppableDayCell>
              );
            })}
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          )}
          {createPortal(
            <DragOverlay>
              {activeDrag ? (
                <div className="text-xs px-2 py-1.5 rounded bg-blue-500/40 text-blue-50 shadow-lg max-w-[200px] truncate">
                  <span className="opacity-70">{(activeDrag.hora_inicio || '').slice(0, 5)}</span> {activeDrag.titulo}
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
          </DndContext>
        </div>

        <VisitasHistoricoPanel />
        </>
        )}

        {tab === 'concluir' && (
        <VisitasListaPanel
          visitas={visitasLista}
          responsaveis={responsaveis}
          filtro={listaFiltro}
          setFiltro={setListaFiltro}
          busca={listaBusca}
          setBusca={setListaBusca}
          onOpen={openDetail}
          onDelete={(id) => { if (confirm('Excluir esta visita?')) delMut.mutate(id); }}
          today={today}
        />
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
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Tipo *</label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as 'visita_tecnica' | 'manutencao' })}
              >
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="visita_tecnica">Visita técnica</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Título *</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Data *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-1 w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
                      !form.data_visita && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.data_visita ? formatYmdBR(form.data_visita) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={ymdToDate(form.data_visita)}
                    onSelect={(d) => d && setForm({ ...form, data_visita: dateToYmd(d) })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Hora *</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white [color-scheme:dark] focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Responsável</label>
              <div className="mt-1 flex h-10 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white/70 cursor-not-allowed select-none">
                {responsaveis.find(r => r.id === form.responsavel_id)?.nome || usuario_nome || 'Usuário logado'}
              </div>
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
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Número</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </div>
            {(form.endereco || form.bairro || form.cidade || form.estado) && (
              <div className="md:col-span-2 -mt-1">
                <div className="text-[11px] text-white/40 px-1">
                  {[form.endereco, form.bairro].filter(Boolean).join(', ')}
                  {(form.cidade || form.estado) && ' — '}
                  {form.cidade}{form.cidade && form.estado && '/'}{form.estado}
                </div>
              </div>
            )}
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
                  className="bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30"
                  onClick={() => navigate(`/vendas/visitas-tecnicas/${editing.id}/concluir`)}
                >
                  {editing.status === 'concluida' ? 'Ver ficha' : 'Concluir visita'}
                </Button>
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

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md bg-black/80 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-blue-500/10 sm:rounded-2xl p-6">
          <DialogHeader className="pb-4 border-b border-white/10">
            <DialogTitle className="text-white text-lg font-semibold tracking-tight">
              {selectedVisita?.titulo}
            </DialogTitle>
            <p className="text-white/40 text-xs mt-1">
              Detalhes da visita técnica
            </p>
          </DialogHeader>
          <div className="pt-4 space-y-3">
            {selectedVisita && (
              <>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Clock className="w-4 h-4 text-blue-300 shrink-0" />
                  <span>
                    {formatYmdBR(toDateOnly(selectedVisita.data_visita))} às {(selectedVisita.hora_inicio || '').slice(0, 5)}
                  </span>
                </div>
                {selectedVisita.responsavel_id && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <User className="w-4 h-4 text-blue-300 shrink-0" />
                    <span>
                      {responsaveis.find(r => r.id === selectedVisita.responsavel_id)?.nome || 'Responsável'}
                    </span>
                  </div>
                )}
                {selectedVisita.telefone_contato && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Phone className="w-4 h-4 text-blue-300 shrink-0" />
                    <span>{selectedVisita.telefone_contato}</span>
                  </div>
                )}
                {(selectedVisita.endereco || selectedVisita.cidade) && (
                  <div className="flex items-start gap-2 text-sm text-white/80">
                    <MapPin className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                    <span>
                      {[
                        selectedVisita.endereco,
                        selectedVisita.numero,
                        selectedVisita.bairro,
                        selectedVisita.complemento,
                      ].filter(Boolean).join(', ')}
                      {selectedVisita.cidade && (
                        <>
                          <br />
                          {selectedVisita.cidade}
                          {selectedVisita.estado && ` / ${selectedVisita.estado}`}
                        </>
                      )}
                    </span>
                  </div>
                )}
                {selectedVisita.observacoes && (
                  <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-white/70">
                    {selectedVisita.observacoes}
                  </div>
                )}
                {selectedVisita.status === 'cancelada' && (
                  <div className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                    Visita cancelada
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2 pt-4 mt-2 border-t border-white/10">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={() => {
                if (selectedVisita) {
                  setDetailOpen(false);
                  openEdit(selectedVisita);
                }
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button
              className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30"
              onClick={() => {
                if (selectedVisita) {
                  navigate(`/vendas/visitas-tecnicas/${selectedVisita.id}/concluir`);
                }
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}