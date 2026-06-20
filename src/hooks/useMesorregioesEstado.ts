import { useQuery } from '@tanstack/react-query';

export interface Mesorregiao {
  id: number;
  nome: string;
  /** Nomes dos municípios normalizados (uppercase, sem acentos) */
  municipiosNorm: string[];
}

const normalize = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export function useMesorregioesEstado(uf?: string) {
  return useQuery({
    queryKey: ['ibge-mesorregioes', uf],
    enabled: !!uf,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<Mesorregiao[]> => {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/estados/${uf}/mesorregioes`,
      );
      if (!res.ok) throw new Error('IBGE off');
      const mesos: Array<{ id: number; nome: string }> = await res.json();

      // Buscar municípios de cada mesorregião em paralelo
      const munRes = await Promise.all(
        mesos.map(m =>
          fetch(
            `https://servicodados.ibge.gov.br/api/v1/mesorregioes/${m.id}/municipios`,
          ).then(r => (r.ok ? r.json() : [])),
        ),
      );

      return mesos
        .map((m, i) => ({
          id: m.id,
          nome: m.nome,
          municipiosNorm: (munRes[i] as Array<{ nome: string }>).map(x =>
            normalize(x.nome),
          ),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}