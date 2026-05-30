## Problema

Em `/direcao/estrategia/despesas/:mes`, o bloco "Folha Salarial" hoje monta a lista unindo três fontes:
1. `colaboradores` (via RPC `get_colaboradores_folha`)
2. `despesas_padrao` tipo `'folha'` (configurações)
3. `despesas_manuais_folha` (lançamentos salvos do mês)

Isso faz aparecer colaboradores que não estão configurados em `/direcao/estrategia/despesas/configuracoes`.

## Objetivo

A lista de colaboradores da Folha deve vir **exclusivamente** de `despesas_padrao` (tipo `'folha'`). Os valores do mês continuam vindo de `despesas_manuais_folha` (sobrepondo os padrões quando existir lançamento daquele colaborador). A flag "Em folha" passa a vir de `despesas_padrao.em_folha`.

## Mudanças

Arquivo único: `src/components/direcao/estrategia/DespesasResumoTopo.tsx`

1. **Remover dependência de colaboradores**
   - Remover o `useEffect` que chama `supabase.rpc('get_colaboradores_folha')` e o estado `colabs` / `setColabs`.
   - Remover o tipo `Colab` (ou manter apenas como tipo local equivalente a um padrão simplificado, se necessário pelas assinaturas das funções).
   - Remover `colabs` de toda a árvore de props (`BlocoFolha`, etc.).

2. **`BlocoFolha` (linhas ~498–620)**
   - Substituir a união `colabs + padroesFolha + rows` pela lista derivada apenas de `padroesFolha` + `rows` (lançamentos do mês). Lançamentos cujo nome não esteja em padroes ficam como linha extra readonly só para não perder dados históricos, mas sem qualquer enriquecimento via colaboradores.
   - Para cada item da lista, montar um `Colab` virtual a partir do `padrao` correspondente, com `em_folha = padrao.em_folha`.
   - Ajustar `sortedColabs`, `total` e callbacks para refletir essa origem única.

3. **`totalExibido` (linhas ~136–146)**
   - Atualizar para somar: lançamentos do mês + padrões da folha que não têm lançamento (em vez de `colabs`).
   - A lógica já existe parcialmente; só remover qualquer referência a `colabs`.

4. **Limpeza**
   - Remover imports/usos não referenciados (`Colab`, RPC, etc.).
   - Garantir que nenhum outro consumidor do componente quebre.

## Fora de escopo

- Não alterar `colaboradores` nem a RPC `get_colaboradores_folha` — outras telas continuam usando.
- Não alterar tabelas (`despesas_padrao` já tem `em_folha`).
- Outras páginas (`/colaboradores`, etc.) não são afetadas.
