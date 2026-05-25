import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import DespesasResumoTopo from '@/components/direcao/estrategia/DespesasResumoTopo';
import { formatCurrency } from '@/lib/utils';

export default function EstrategiaDespesasMes() {
  const { mes } = useParams<{ mes: string }>();
  const navigate = useNavigate();
  const [totalMes, setTotalMes] = useState(0);

  const mesValido = useMemo(() => {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return null;
    return mes;
  }, [mes]);

  if (!mesValido) {
    navigate('/direcao/estrategia/despesas', { replace: true });
    return null;
  }

  const mesDate = parse(`${mesValido}-01`, 'yyyy-MM-dd', new Date());
  const mesNome = format(mesDate, "MMMM 'de' yyyy", { locale: ptBR });
  const ano = mesDate.getFullYear();

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
      <DespesasResumoTopo
        mes={mesValido}
        ano={ano}
        onMediaMensalChange={setTotalMes}
      />
    </MinimalistLayout>
  );
}