import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import DespesasResumoTopo from '@/components/direcao/estrategia/DespesasResumoTopo';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EstrategiaDespesasMes() {
  const { mes } = useParams<{ mes: string }>();
  const navigate = useNavigate();
  const [totalMes, setTotalMes] = useState(0);
  const [status, setStatus] = useState<'pendente' | 'pronto'>('pendente');
  const [savingStatus, setSavingStatus] = useState(false);

  const mesValido = useMemo(() => {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return null;
    return mes;
  }, [mes]);

  useEffect(() => {
    if (!mesValido) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('despesas_mes_status' as any)
        .select('status')
        .eq('mes_referencia', `${mesValido}-01`)
        .maybeSingle();
      if (!cancelled && data) setStatus(((data as any).status as 'pendente' | 'pronto') || 'pendente');
    })();
    return () => {
      cancelled = true;
    };
  }, [mesValido]);

  const toggleStatus = async () => {
    if (!mesValido || savingStatus) return;
    const next: 'pendente' | 'pronto' = status === 'pronto' ? 'pendente' : 'pronto';
    setSavingStatus(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('despesas_mes_status' as any)
      .upsert(
        {
          mes_referencia: `${mesValido}-01`,
          status: next,
          updated_by: userData.user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'mes_referencia' },
      );
    setSavingStatus(false);
    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }
    setStatus(next);
    toast.success(next === 'pronto' ? 'Mês marcado como Pronto' : 'Mês marcado como Pendente');
  };

  if (!mesValido) {
    navigate('/direcao/estrategia/despesas', { replace: true });
    return null;
  }

  const mesDate = parse(`${mesValido}-01`, 'yyyy-MM-dd', new Date());
  const mesNome = format(mesDate, "MMMM 'de' yyyy", { locale: ptBR });
  const ano = mesDate.getFullYear();
  const isPronto = status === 'pronto';

  return (
    <MinimalistLayout
      title={mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}
      subtitle={`Total do mês: ${formatCurrency(totalMes)}`}
      backPath="/direcao/estrategia/despesas"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Despesas', path: '/direcao/estrategia/despesas' },
        { label: mesNome },
      ]}
    >
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={toggleStatus}
          disabled={savingStatus}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border backdrop-blur-xl text-sm font-medium transition-all disabled:opacity-60 ${
            isPronto
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-400/30 hover:bg-amber-500/20'
          }`}
          title="Clique para alternar status"
        >
          {isPronto ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {isPronto ? 'Pronto' : 'Pendente'}
        </button>
      </div>

      <DespesasResumoTopo
        mes={mesValido}
        ano={ano}
        onMediaMensalChange={setTotalMes}
      />
    </MinimalistLayout>
  );
}