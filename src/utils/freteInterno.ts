/** Valor mínimo cobrado para frete interno (R$). */
export const FRETE_INTERNO_MINIMO = 750;

/** Valor do frete interno: km × 6, respeitando o mínimo de R$ 750. */
export function calcularValorFreteInterno(km: number | null | undefined): number {
  const base = Number.isFinite(Number(km)) ? Number(km) * 6 : 0;
  return Math.max(base, FRETE_INTERNO_MINIMO);
}
