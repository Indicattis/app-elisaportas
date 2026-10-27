import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Settings2, Building2, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { TiposDreDialog } from '@/components/direcao/estrategia/TiposDreDialog';
import { supabase } from '@/integrations/supabase/client';

export default function EstrategiaDespesas() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [statusMes, setStatusMes] = useState<Record<string, 'pendente' | 'alana' | 'luan'>>({});
  const [tiposDreOpen, setTiposDreOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const start = `${ano}-01-01`;
      const end = `${ano}-12-31`;
      const { data: statusRows } = await supabase
        .from('despesas_mes_status' as any)
        .select('mes_referencia, status')
        .gte('mes_referencia', start)
        .lte('mes_referencia', end);
      if (cancelled) return;
      const st: Record<string, 'pendente' | 'alana' | 'luan'> = {};
      ((statusRows || []) as any[]).forEach((s) => {
        const key = String(s.mes_referencia).slice(0, 7);
        const raw = s.status as string;
        st[key] = raw === 'alana' ? 'alana' : raw === 'luan' || raw === 'pronto' ? 'luan' : 'pendente';
      });
      setStatusMes(st);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [ano]);

  return (
    <MinimalistLayout
      title="Despesas"
      subtitle={`Ano ${ano}`}
      backPath="/direcao/estrategia"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Despesas' },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTiposDreOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors backdrop-blur-xl"
            title="Gerenciar quais tipos de despesa debitam do lucro no DRE"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Tipos de Despesas
          </button>
          <button
            onClick={() => navigate('/direcao/estrategia/despesas/configuracoes')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors backdrop-blur-xl"
          >
            <Settings2 className="w-4 h-4" />
            Configurações padrão
          </button>
          <button
            onClick={() => navigate('/administrativo/empresas')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors backdrop-blur-xl"
          >
            <Building2 className="w-4 h-4" />
            Empresas
          </button>
        </div>
      }
    >
      <TiposDreDialog open={tiposDreOpen} onOpenChange={setTiposDreOpen} />

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={() => setAno((a) => a - 1)}
          className="flex items-center justify-center w-12 h-12 shrink-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          aria-label="Ano anterior"
        >
          <ChevronLeft className="w-6 h-6 text-white/70" />
        </button>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 12 }, (_, i) => i).map((mIdx) => {
            const mesDate = new Date(ano, mIdx, 1);
            const mesKey = format(mesDate, 'yyyy-MM');
            const mesNome = format(mesDate, 'MMMM', { locale: ptBR });
            const st = statusMes[mesKey] || 'pendente';
            const dotColor = st === 'luan' ? 'bg-emerald-400' : st === 'alana' ? 'bg-yellow-400' : 'bg-red-400';
            const dotTitle = st === 'luan' ? 'Luan' : st === 'alana' ? 'Alana' : 'Pendente';
            return (
              <button
                key={mesKey}
                onClick={() => navigate(`/direcao/estrategia/despesas/${mesKey}`)}
                className="relative flex items-center justify-center min-h-[140px] px-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-400/40 transition-all duration-200"
              >
                <span className="text-xl md:text-2xl font-semibold capitalize text-white/80">
                  {mesNome}
                </span>
                <span
                  className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${dotColor}`}
                  title={dotTitle}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setAno((a) => a + 1)}
          className="flex items-center justify-center w-12 h-12 shrink-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          aria-label="Próximo ano"
        >
          <ChevronRight className="w-6 h-6 text-white/70" />
        </button>
      </div>
    </MinimalistLayout>
  );
}
