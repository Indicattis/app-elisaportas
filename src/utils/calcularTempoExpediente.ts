import { toZonedTime } from 'date-fns-tz';
import { isFeriadoBR } from './feriadosBR';

const TIMEZONE = 'America/Sao_Paulo';

interface ConfigExpediente {
  horaInicio?: number;  // Default: 7
  horaFim?: number;     // Default: 17
  incluirSabado?: boolean;
  incluirDomingo?: boolean;
}

/**
 * Calcula o tempo decorrido apenas durante o horário de expediente
 * @param inicio Data/hora de início
 * @param fim Data/hora de fim (default: agora)
 * @param config Configurações do expediente
 * @returns Segundos trabalhados dentro do expediente
 */
export function calcularTempoExpediente(
  inicio: Date,
  fim: Date = new Date(),
  config: ConfigExpediente = {}
): number {
  const {
    horaInicio = 7,
    horaFim = 17,
    incluirSabado = false,
    incluirDomingo = false,
  } = config;

  // Se início for depois do fim, retornar 0
  if (inicio.getTime() >= fim.getTime()) {
    return 0;
  }

  // Converter para timezone de Brasília
  const inicioBrasil = toZonedTime(inicio, TIMEZONE);
  const fimBrasil = toZonedTime(fim, TIMEZONE);

  let segundosTotais = 0;

  // Clonar data inicial para iteração
  const diaAtual = new Date(inicioBrasil);
  diaAtual.setHours(0, 0, 0, 0);

  const diaFinal = new Date(fimBrasil);
  diaFinal.setHours(23, 59, 59, 999);

  while (diaAtual <= diaFinal) {
    const diaSemana = diaAtual.getDay();
    
    // Verificar se é dia útil
    const ehDomingo = diaSemana === 0;
    const ehSabado = diaSemana === 6;
    
    if ((ehDomingo && !incluirDomingo) || (ehSabado && !incluirSabado) || isFeriadoBR(diaAtual)) {
      diaAtual.setDate(diaAtual.getDate() + 1);
      continue;
    }

    // Definir início e fim do expediente para este dia
    const inicioExpediente = new Date(diaAtual);
    inicioExpediente.setHours(horaInicio, 0, 0, 0);
    
    const fimExpediente = new Date(diaAtual);
    fimExpediente.setHours(horaFim, 0, 0, 0);

    // Calcular intervalo efetivo de trabalho neste dia
    const inicioEfetivo = new Date(Math.max(
      inicioExpediente.getTime(),
      inicioBrasil.getTime()
    ));
    
    const fimEfetivo = new Date(Math.min(
      fimExpediente.getTime(),
      fimBrasil.getTime()
    ));

    // Se há trabalho válido neste dia
    if (inicioEfetivo < fimEfetivo) {
      const segundosDia = Math.floor(
        (fimEfetivo.getTime() - inicioEfetivo.getTime()) / 1000
      );
      segundosTotais += segundosDia;
    }

    diaAtual.setDate(diaAtual.getDate() + 1);
  }

  return segundosTotais;
}

/**
 * Verifica se está dentro do horário de expediente
 */
export function estaNoExpediente(
  data: Date = new Date(),
  config: ConfigExpediente = {}
): boolean {
  const { horaInicio = 7, horaFim = 17, incluirSabado = false, incluirDomingo = false } = config;
  
  const dataBrasil = toZonedTime(data, TIMEZONE);
  const hora = dataBrasil.getHours();
  const diaSemana = dataBrasil.getDay();
  
  const ehDomingo = diaSemana === 0;
  const ehSabado = diaSemana === 6;
  
  if ((ehDomingo && !incluirDomingo) || (ehSabado && !incluirSabado) || isFeriadoBR(dataBrasil)) {
    return false;
  }
  
  return hora >= horaInicio && hora < horaFim;
}
