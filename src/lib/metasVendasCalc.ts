import type { MetaVendasTier } from '@/hooks/useMetasVendas';

export function calcularTier(total: number, tiers: MetaVendasTier[]): MetaVendasTier | null {
  const ordenados = [...tiers].sort((a, b) => Number(b.valor_alvo) - Number(a.valor_alvo));
  return ordenados.find((t) => total >= Number(t.valor_alvo)) || null;
}

export function calcularBonificacao(
  total: number,
  tier: MetaVendasTier | null,
  atingido: boolean = true,
): number {
  if (!tier) return 0;
  if (tier.bonificacao_tipo === 'fixo') return atingido ? Number(tier.bonificacao_valor) : 0;
  // bonificacao_valor é a porcentagem direta (ex.: 0.3 ⇒ 0,3% ⇒ multiplicador 0.003)
  return total * (Number(tier.bonificacao_valor) / 100);
}