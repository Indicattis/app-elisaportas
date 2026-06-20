import { useQuery } from '@tanstack/react-query';

export interface MacroRegiao {
  sigla: 'N' | 'NE' | 'CO' | 'SE' | 'S';
  nome: string;
  ufs: string[];
}

const FALLBACK: MacroRegiao[] = [
  { sigla: 'N',  nome: 'Norte',         ufs: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'] },
  { sigla: 'NE', nome: 'Nordeste',      ufs: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
  { sigla: 'CO', nome: 'Centro-Oeste',  ufs: ['DF', 'GO', 'MT', 'MS'] },
  { sigla: 'SE', nome: 'Sudeste',       ufs: ['ES', 'MG', 'RJ', 'SP'] },
  { sigla: 'S',  nome: 'Sul',           ufs: ['PR', 'RS', 'SC'] },
];

export function useMacroRegioesBrasil() {
  return useQuery({
    queryKey: ['ibge-macro-regioes'],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<MacroRegiao[]> => {
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
        if (!res.ok) throw new Error('IBGE off');
        const estados: Array<{ sigla: string; regiao: { sigla: string; nome: string } }> = await res.json();
        const map = new Map<string, MacroRegiao>();
        for (const e of estados) {
          const sig = e.regiao.sigla as MacroRegiao['sigla'];
          if (!map.has(sig)) map.set(sig, { sigla: sig, nome: e.regiao.nome, ufs: [] });
          map.get(sig)!.ufs.push(e.sigla);
        }
        const order: MacroRegiao['sigla'][] = ['N', 'NE', 'CO', 'SE', 'S'];
        return order.map(s => map.get(s)!).filter(Boolean);
      } catch {
        return FALLBACK;
      }
    },
  });
}