## Objetivo

Em `/autorizados/acordos/:ano/:mes` (`src/pages/direcao/AcordosMesAutorizados.tsx`), adicionar uma nova coluna **Km** exibindo a quilometragem (ida) cadastrada em `/logistica/frete/internos` para a cidade/estado de cada autorizado.

## Como funciona

1. Após carregar `acordosDoMes`, extrair os `autorizado_id` únicos.
2. Buscar em `autorizados` os campos `id, cidade, estado` desses IDs.
3. Buscar em `frete_cidades` as linhas cuja combinação `(cidade, estado)` corresponda às dos autorizados, selecionando `cidade, estado, quilometragem`.
4. Montar um `Map<autorizadoId, number | null>` com a km encontrada (null se não houver match).
5. Guardar em `useState` (`kmPorAutorizado`) e popular dentro do mesmo `useEffect` que já busca preços dos autorizados (ou um novo `useEffect` paralelo).

## UI

- Adicionar `<TableHead>Km</TableHead>` logo após "Cidade", alinhado ao centro.
- Adicionar `<TableCell>` correspondente em cada linha de acordo, mostrando `123 km` quando houver valor ou `-` quando não houver.
- Atualizar o cálculo de `colSpan` da linha-cabeçalho do grupo (incrementar +1) para manter o agrupamento por autorizado intacto.
- Opcional: também exibir a km ao lado do nome do autorizado no cabeçalho do grupo (ex.: "Nome · 47 km"), para reforçar a informação por grupo.

## Observações

- A correspondência usa a cidade do autorizado (tabela `autorizados`), não a cidade do cliente do acordo.
- Sem mudanças de schema; somente leitura adicional de `autorizados` e `frete_cidades`.
- Nenhuma alteração em `useAcordosAutorizados` — a busca extra fica isolada na própria página.
