import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type HistRow = {
  id: string;
  mes_referencia: string;
  escopo: 'mes' | 'folha' | 'lanc';
  ref_id: string | null;
  ref_nome: string;
  status_anterior: 'pendente' | 'alana' | 'luan';
  status_novo: 'pendente' | 'alana' | 'luan';
  changed_by: string | null;
  changed_by_nome: string | null;
  created_at: string;
};

const statusColor = (s: 'pendente' | 'alana' | 'luan') =>
  s === 'luan'
    ? 'bg-emerald-400/15 text-emerald-300'
    : s === 'alana'
    ? 'bg-yellow-400/15 text-yellow-300'
    : 'bg-red-400/15 text-red-300';

const statusLabel = (s: 'pendente' | 'alana' | 'luan') =>
  s === 'luan' ? 'Luan' : s === 'alana' ? 'Alana' : 'Pendente';

const escopoLabel = (e: HistRow['escopo']) =>
  e === 'mes' ? 'Mês' : e === 'folha' ? 'Folha' : 'Despesa';

function StatusBadge({ s }: { s: 'pendente' | 'alana' | 'luan' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] ${statusColor(s)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabel(s)}
    </span>
  );
}

interface Props {
  mesStart: string | null;
  reloadKey?: number;
}

export default function HistoricoStatusBloco({ mesStart, reloadKey }: Props) {
  const [rows, setRows] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mesStart) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('despesas_status_historico' as any)
        .select('*')
        .eq('mes_referencia', mesStart)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!cancelled) {
        setRows(((data || []) as unknown) as HistRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mesStart, reloadKey]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3 text-white/80">
        <History className="w-4 h-4" />
        <h3 className="text-sm font-semibold">Histórico de Status</h3>
      </div>

      {loading ? (
        <div className="text-white/50 text-sm py-4 text-center">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="text-white/50 text-sm py-4 text-center">
          Nenhuma alteração de status ainda neste mês.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2 px-2 font-medium">Data/Hora</th>
                <th className="py-2 px-2 font-medium">Escopo</th>
                <th className="py-2 px-2 font-medium">Item</th>
                <th className="py-2 px-2 font-medium">De → Para</th>
                <th className="py-2 px-2 font-medium">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 text-white/80">
                  <td className="py-2 px-2 whitespace-nowrap text-white/60">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-2 text-white/60">{escopoLabel(r.escopo)}</td>
                  <td className="py-2 px-2">{r.ref_nome}</td>
                  <td className="py-2 px-2">
                    <div className="inline-flex items-center gap-2">
                      <StatusBadge s={r.status_anterior} />
                      <span className="text-white/40">→</span>
                      <StatusBadge s={r.status_novo} />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-white/60">{r.changed_by_nome || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}