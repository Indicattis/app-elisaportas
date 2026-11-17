export const KG_TINTA_POR_M2 = 1.25;

/** Arredonda para cima quando a parte decimal é >= 0,4; para baixo caso contrário. */
export function arredondarKgTinta(kg: number): number {
  const base = Math.floor(kg);
  const frac = Math.round((kg - base) * 1000) / 1000;
  return frac >= 0.4 ? base + 1 : base;
}

export function kgTintaPorM2(m2: number): number {
  return m2 * KG_TINTA_POR_M2;
}

export const KG_POR_LATA_TINTA = 25;

/** Latas inteiras de 25 kg necessárias para cobrir a quantidade informada. */
export function latasTinta(kg: number): number {
  if (kg <= 0) return 0;
  return Math.ceil(kg / KG_POR_LATA_TINTA);
}
