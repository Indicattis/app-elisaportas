# Despesas do mês — expandir tipo para ver gastos individuais

Em `/direcao/estrategia/despesas/:mes`, os blocos **Despesas Fixas** e **Despesas Variáveis** mostram hoje uma linha por tipo de custo, com quantidade e total. Vou tornar cada linha clicável para expandir e mostrar, logo abaixo, todos os gastos individuais agregados naquele tipo (do mês atual).

## Comportamento

- Clique na linha do tipo → expande/colapsa uma sub-área dentro da própria tabela mostrando os gastos individuais daquele tipo no mês.
- Indicador visual: chevron (▶ / ▼) à esquerda do nome do tipo + hover já existente.
- Apenas um tipo expandido por vez por bloco (estado local `expandedId`). Reclique fecha.
- Funciona em Despesas Fixas e Despesas Variáveis. Os outros blocos (Folha, Impostos) não mudam.

## Conteúdo expandido (por gasto)

Para cada gasto: **data**, **descrição** (ou "—"), **responsável**, **banco**, **valor**. Estilo discreto, fundo `bg-white/[0.02]`, fontes menores (`text-xs`/`text-[11px]`), alinhado com o restante da página.

## Mudanças técnicas

Arquivo único: `src/components/direcao/estrategia/DespesasResumoTopo.tsx`.

1. **Tipo `GastoAgrupado`**: adicionar campo `itens: GastoItem[]` onde
   ```ts
   type GastoItem = {
     id: string;
     data: string;
     valor: number;
     descricao: string | null;
     responsavel_nome: string;
     banco_nome: string;
   };
   ```

2. **Fetch (useEffect ~linha 162)**:
   - Ampliar o `select` de `gastos` para incluir `id, tipo_custo_id, valor, data, descricao, responsavel_id, banco_id`.
   - Depois de carregar `tiposMap`, fazer dois fetches paralelos em `admin_users` (`user_id, nome`) e `bancos` (`id, nome`) para os IDs presentes nos gastos retornados (mesmo padrão de `useGastos.ts`).
   - Em `agruparPor`, preencher também `itens` (ordenado por `data` desc) com nome resolvido de responsável e banco.

3. **`BlocoGastosReadonly`**:
   - Estado local: `const [expandedId, setExpandedId] = useState<string | null>(null);`.
   - A linha do tipo vira um `<tr>` clicável (`onClick={() => setExpandedId(prev => prev === r.tipo_custo_id ? null : r.tipo_custo_id)}`, `cursor-pointer`), com `<ChevronRight />` / `<ChevronDown />` antes do nome.
   - Quando expandido, renderizar `<tr><td colSpan={3}>` com uma sub-tabela listando `r.itens` (data formatada `dd/MM`, descrição, responsável, banco, valor à direita). Linhas com `border-b border-white/5`, sem zebra forte.

## Fora do escopo

- Sem mudanças em outras páginas, hooks ou banco. Apenas leitura — nenhum write novo.
- Sem alteração nos blocos de Folha e Impostos.
