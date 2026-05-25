## Objetivo

Permitir que cada matéria-prima cadastrada em `/direcao/estrategia/materias-primas` tenha sua **própria unidade de medida** (ex.: rolo, bobina, kg, litro), independente da unidade do item que ela compõe. Isso viabiliza cálculos corretos de compra (ex.: comprar em "rolos" mesmo que o item final seja medido em "metros").

## Mudanças no banco

Adicionar coluna `unidade TEXT NOT NULL DEFAULT 'un'` em `estrategia_materias_primas`.

## Mudanças no código

### `src/hooks/useEstrategiaMateriasPrimas.ts`
- Adicionar `unidade: string` no tipo `EstrategiaMateriaPrima` e `NewEstrategiaMateriaPrima`.
- Passar `unidade` no insert do `criar` (default `"un"`).

### `src/pages/direcao/estrategia/EstrategiaMateriasPrimas.tsx`
- Nova coluna **"Unidade MP"** na tabela (entre "Nome" e "Qtd"), renderizada como `Select` populado por `UNIDADES_MATERIA_PRIMA` de `@/utils/unidadesMedida`.
- Ao alterar, chamar `editar({ id, patch: { unidade } })`.
- Atualizar `colSpan` do estado vazio (de 9 para 10).
- Substituir o literal `"un mp"` da coluna **Proporção** pela abreviação real da unidade da matéria-prima (`getUnidadeAbreviacao(m.unidade)`), mantendo o destino como a unidade do item (ex.: `1 rolo = 50 m`).
- Coluna **"Custo/un"** passa a mostrar `Custo/{abreviação da unidade MP}` (ex.: `Custo/rolo`).

### Observações
- Nenhuma mudança em `EstrategiaItens.tsx` — o cálculo de bobina já soma `quantidade_item` (rendimento em unidade do item) e divide o custo total, então continua correto independente da unidade da MP.
- Registros existentes ficam com `'un'` por padrão; o usuário pode ajustar via o novo Select.
