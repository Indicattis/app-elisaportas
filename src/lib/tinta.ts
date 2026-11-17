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
