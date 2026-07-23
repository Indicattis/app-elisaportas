import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

// Cálculo da Páscoa (algoritmo de Meeus/Jones/Butcher)
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

const cache = new Map<number, Set<string>>();

function feriadosDoAno(ano: number): Set<string> {
  const cached = cache.get(ano);
  if (cached) return cached;

  const set = new Set<string>();
  // Fixos nacionais
  const fixos = [
    [1, 1],   // Confraternização Universal
    [4, 21],  // Tiradentes
    [5, 1],   // Dia do Trabalho
    [9, 7],   // Independência
    [10, 12], // N. Sra. Aparecida
    [11, 2],  // Finados
    [11, 15], // Proclamação da República
    [11, 20], // Consciência Negra (nacional desde 2024)
    [12, 25], // Natal
  ];
  for (const [mes, dia] of fixos) {
    set.add(ymd(new Date(ano, mes - 1, dia)));
  }

  // Móveis (baseados na Páscoa)
  const pascoa = calcularPascoa(ano);
  set.add(ymd(addDays(pascoa, -2)));  // Sexta-feira Santa
  set.add(ymd(addDays(pascoa, -48))); // Carnaval segunda
  set.add(ymd(addDays(pascoa, -47))); // Carnaval terça
  set.add(ymd(addDays(pascoa, 60)));  // Corpus Christi

  cache.set(ano, set);
  return set;
}

/**
 * Retorna true se a data (no fuso America/Sao_Paulo) for feriado nacional brasileiro.
 */
export function isFeriadoBR(date: Date): boolean {
  const zoned = toZonedTime(date, TIMEZONE);
  const key = ymd(zoned);
  return feriadosDoAno(zoned.getFullYear()).has(key);
}