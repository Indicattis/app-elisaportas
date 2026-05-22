## Problema

A página `/logistica/frete/internos` filtra a lista de fretes no client-side. O hook `useFretesCidades` (src/hooks/useFretesCidades.ts) busca `frete_cidades` com `.select('*')` sem paginação, então o Supabase aplica o limite padrão de **1000 linhas**. A tabela já tem **1.159 registros** ordenados por `estado` ascendente, e "São Bento do Sul / SC" cai após o corte — por isso a busca não encontra.

## Correção

Em `src/hooks/useFretesCidades.ts`, no `queryFn` do `useQuery`:

- Adicionar `.range(0, 9999)` no select para subir o teto bem acima do volume atual da tabela.

Mudança pontual, sem alterar UI nem regras. Após o ajuste, a busca por "São Bento do Sul" passa a retornar normalmente.

## Arquivo alterado

- `src/hooks/useFretesCidades.ts`
