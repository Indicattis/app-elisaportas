export type RegiaoBrasil = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

export const REGIOES_ORDEM: RegiaoBrasil[] = ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte'];

export const UF_TO_REGIAO: Record<string, RegiaoBrasil> = {
  // Norte
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  // Nordeste
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste',
  PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  // Centro-Oeste
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  // Sudeste
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  // Sul
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

export function getRegiao(sigla: string | null | undefined): RegiaoBrasil | 'Outros' {
  if (!sigla) return 'Outros';
  return UF_TO_REGIAO[sigla.toUpperCase()] ?? 'Outros';
}