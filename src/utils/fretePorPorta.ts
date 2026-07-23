import { getRegiao, type RegiaoBrasil } from './regioesBrasil';

export const FRETE_POR_PORTA_REGIAO: Record<RegiaoBrasil, number> = {
  Sul: 750,
  Sudeste: 1200,
  'Centro-Oeste': 950,
  Nordeste: 1500,
  Norte: 1800,
};

export interface FretePorPortaCalculo {
  regiao: RegiaoBrasil;
  valorUnitario: number;
  quantidade: number;
  total: number;
}

export function calcularFretePorPorta(
  uf: string | null | undefined,
  qtdPortas: number,
): FretePorPortaCalculo | null {
  const regiao = getRegiao(uf);
  if (regiao === 'Outros') return null;
  const valorUnitario = FRETE_POR_PORTA_REGIAO[regiao];
  const quantidade = Math.max(0, Math.floor(qtdPortas || 0));
  return {
    regiao,
    valorUnitario,
    quantidade,
    total: valorUnitario * quantidade,
  };
}