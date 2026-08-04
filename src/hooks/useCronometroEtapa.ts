import { useState, useEffect, useMemo } from 'react';
import { formatCronometroExtended } from '@/utils/timeFormat';

interface UseCronometroEtapaParams {
  dataEntrada?: string | null;
  limiteSegundos?: number;
}

interface CronometroEtapaResult {
  tempoDecorrido: string;
  segundos: number;
  deveAnimar: boolean;
  cor: 'green' | 'yellow' | 'red';
}

// Default: 5 dias corridos (24h/dia)
const LIMITE_DEFAULT = 5 * 24 * 60 * 60;

export function useCronometroEtapa(params: UseCronometroEtapaParams | string | null | undefined): CronometroEtapaResult {
  const [segundos, setSegundos] = useState<number>(0);

  // Suporte para ambos os formatos: objeto ou string direta
  const dataEntrada = typeof params === 'string' || params === null || params === undefined 
    ? params 
    : params.dataEntrada;

  const limite = (typeof params === 'object' && params !== null && 'limiteSegundos' in params && params.limiteSegundos)
    ? params.limiteSegundos
    : LIMITE_DEFAULT;

  useEffect(() => {
    if (!dataEntrada) {
      setSegundos(0);
      return;
    }

    const calcularTempo = () => {
      const agora = new Date();
      const inicio = new Date(dataEntrada as string);
      const diffMs = agora.getTime() - inicio.getTime();
      setSegundos(Math.max(0, Math.floor(diffMs / 1000)));
    };

    calcularTempo();
    const interval = setInterval(calcularTempo, 1000);
    return () => clearInterval(interval);
  }, [dataEntrada]);

  const cor = useMemo((): 'green' | 'yellow' | 'red' => {
    if (segundos < limite) return 'green';
    return 'red';
  }, [segundos, limite]);

  const tempoDecorrido = useMemo(() => {
    if (!dataEntrada) return '--:--:--';
    return formatCronometroExtended(segundos);
  }, [dataEntrada, segundos]);

  const deveAnimar = useMemo(() => {
    return !!dataEntrada;
  }, [dataEntrada]);

  return { tempoDecorrido, segundos, deveAnimar, cor };
}
