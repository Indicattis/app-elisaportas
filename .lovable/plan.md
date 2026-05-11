## Objetivo

Em `/fabrica/produtos/materias-primas`, ampliar a lista de unidades de medida e garantir que a quantidade (estoque e conversão de vínculos) seja sempre exibida junto da unidade, com formatação consistente em pt-BR.

## Catálogo de unidades

Lista padrão centralizada (com código curto + rótulo amigável + plural):

| Código | Singular     | Plural        |
|--------|--------------|---------------|
| un     | Unidade      | Unidades      |
| rolo   | Rolo         | Rolos         |
| bobina | Bobina       | Bobinas       |
| cx     | Caixa        | Caixas        |
| pc     | Peça         | Peças         |
| kg     | Quilo        | Quilos (kg)   |
| g      | Grama        | Gramas (g)    |
| m      | Metro        | Metros (m)    |
| cm     | Centímetro   | Centímetros (cm) |
| m2     | Metro²       | Metros² (m²)  |
| l      | Litro        | Litros (l)    |
| ml     | Mililitro    | Mililitros (ml) |

Compatibilidade: códigos legados existentes no banco (`m²`, `pç`) são mapeados para `m2` e `pc` apenas na exibição; nenhum registro é migrado.

## Passos

1. **Criar `src/utils/unidadesMedida.ts`**
   - Exporta `UNIDADES_MATERIA_PRIMA` (array com `{ value, label, labelPlural, abreviacao }`).
   - Helpers:
     - `formatarQuantidadeUnidade(qtd, unidade)` → "10 rolos", "5,50 kg", "200 cm" (usa `toLocaleString('pt-BR')`, sem casas para discretas, até 2 casas para contínuas).
     - `getUnidadeLabel(unidade)` → rótulo amigável.
     - `normalizarUnidade(unidade)` → mapeia legados (`m²` → `m2`, `pç` → `pc`).

2. **Atualizar `src/pages/fabrica/MateriasPrimas.tsx`**
   - Substituir a constante local `UNIDADES` pelo import do novo catálogo.
   - Select de unidade mostra rótulo amigável (ex.: "Rolo") mantendo `value` técnico.
   - Coluna "Estoque" da tabela passa a usar `formatarQuantidadeUnidade(m.quantidade, m.unidade)`.
   - Label do campo "Quantidade em estoque" no dialog mostra a unidade selecionada entre parênteses (ex.: "Quantidade em estoque (rolos)").

3. **Atualizar `src/components/estoque/VincularMaterialDialog.tsx`**
   - Substituir `materiaPrima.unidade` cru por `getUnidadeLabel(materiaPrima.unidade)` nos textos ("1 Rolo", "Qtd por 1 Rolo").
   - Idem para a unidade do material vinculado.

## Fora de escopo

- Sem mudanças de schema, hooks ou regras de conversão.
- Sem migração de dados existentes (apenas normalização de exibição).
- Sem alteração na precisão aceita pelos inputs (continua `step="0.01"` para todos).
