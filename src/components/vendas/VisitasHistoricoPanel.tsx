import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { History, Plus, Pencil, Trash2, CheckCircle2, CalendarClock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Acao = 'criada' | 'alterada' | 'excluida' | 'concluida' | 'reagendada';

interface Row {
  id: string;
  visita_id: string | null;
  acao: Acao;
  titulo: string | null;
  data_visita: string | null;
  data_anterior: string | null;
  responsavel_nome: string | null;
  cidade: string | null;
  estado: string | null;
  detalhes: any;
  usuario_nome: string | null;
  created_at: string;
}

const FILTROS: { id: Acao | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'criada', label: 'Criadas' },
  { id: 'alterada', label: 'Alteradas' },
  { id: 'reagendada', label: 'Reagendadas' },
  { id: 'concluida', label: 'Concluídas' },
  { id: 'excluida', label: 'Excluídas' },
];

function iconFor(a: Acao) {
  switch (a) {
    case 'criada': return <Plus className="w-3.5 h-3.5 text-emerald-300" />;
    case 'alterada': return <Pencil className="w-3.5 h-3.5 text-blue-300" />;
    case 'reagendada': return <CalendarClock className="w-3.5 h-3.5 text-amber-300" />;
    case 'concluida': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />;
    case 'excluida': return <Trash2 className="w-3.5 h-3.5 text-red-300" />;
  }
}

function fmtBR(ymd?: string | null) {
  if (!ymd) return '';
  const s = ymd.slice(0, 10).split('-');
  if (s.length !== 3) return ymd;
  return `${s[2]}/${s[1]}/${s[0]}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${h}:${mi}`;
}

function describe(r: Row): string {
  const quem = r.usuario_nome || 'Alguém';
  const titulo = r.titulo ? `"${r.titulo}"` : 'a visita';
  switch (r.acao) {
    case 'criada':
      return `${quem} criou ${titulo}${r.data_visita ? ` para ${fmtBR(r.data_visita)}` : ''}`;
    case 'reagendada':
      return `${quem} reagendou ${titulo} de ${fmtBR(r.data_anterior)} para ${fmtBR(r.data_visita)}`;
    case 'alterada': {
      const campos = r.detalhes && typeof r.detalhes === 'object' ? Object.keys(r.detalhes) : [];
      return `${quem} alterou ${titulo}${campos.length ? ` (${campos.join(', ')})` : ''}`;
    }
    case 'concluida':
      return `${quem} concluiu ${titulo}`;
    case 'excluida':
      return `${quem} excluiu ${titulo}`;
  }
}

export function VisitasHistoricoPanel() {
  const [filtro, setFiltro] = useState<Acao | 'todas'>('todas');
  const [limite, setLimite] = useState(50);

  const { data = [], isLoading } = useQuery({
    queryKey: ['visitas-historico', filtro, limite],
    queryFn: async () => {
      let q = supabase
        .from('visitas_tecnicas_historico' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);
      if (filtro !== 'todas') q = q.eq('acao', filtro);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  return (
    <div className="mt-6 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-300" />
          <h2 className="text-sm font-semibold text-white">Histórico de visitas</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-full border transition",
                filtro === f.id
                  ? "bg-blue-500/20 border-blue-400/40 text-blue-100"
                  : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-blue-400 animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-white/40 text-xs">Nenhum evento registrado</div>
      ) : (
        <ul className="divide-y divide-white/5">
          {data.map(r => (
            <li key={r.id} className="py-2 flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-white/[0.04] border border-white/10">{iconFor(r.acao)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white/90 truncate">{describe(r)}</div>
                <div className="text-[11px] text-white/40">
                  {fmtDateTime(r.created_at)}
                  {r.cidade ? ` · ${r.cidade}${r.estado ? '/' + r.estado : ''}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data.length >= limite && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setLimite(l => l + 50)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
          >
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}