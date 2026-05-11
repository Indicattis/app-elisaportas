/**
 * Classifica a porta por largura conforme regra do sistema:
 * - P  < 2m
 * - G  >= 2m e < 3m
 * - GG >= 3m
 */
export type TamanhoPorta = 'P' | 'G' | 'GG';

export function classificarTamanhoPorta(largura?: number | null): TamanhoPorta | null {
  if (largura == null || Number.isNaN(largura) || largura <= 0) return null;
  if (largura >= 3) return 'GG';
  if (largura >= 2) return 'G';
  return 'P';
}