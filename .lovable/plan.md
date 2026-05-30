## Diagnóstico

Encontrei a inconsistência:

- A **validação na criação da venda** (`src/utils/descontoVendasRules.ts` chamada em `VendaNovaMinimalista.tsx` linha 281) já dá o adicional de 5% para vendas **Frio** (o caller passa `venda_presencial === false`).
- Mas o **display dos tiers** (Cartão / Gelo / Responsável) faz o oposto: usa `isPresencial = venda_presencial === true` e atribui o "Gelo" a vendas **Quentes**.

Resultado: a venda Quente da ZANELLA aparece com 5% de "Gelo" no painel, mas na verdade esse adicional só é permitido pela trava para vendas Frio. O display está invertido.

## Padronização adotada

- **Frio** = venda à distância → recebe o adicional "Gelo" de até 5%.
- **Quente** = venda presencial → NÃO recebe o adicional "Gelo".
- A trava existente (`descontoVendasRules.ts`) já segue essa regra; vamos apenas alinhar o display, rótulos e tooltips para a mesma semântica. Vendas existentes recalculam automaticamente ao reabrir (cálculo é em memória, não há valor persistido a corrigir).

## Mudanças

### 1. `src/components/pedidos/VendaPendenteDetalhesSheet.tsx` (linha ~124)
- Trocar `const isPresencial = vendaCompleta.venda_presencial === true;` por `const isFrio = vendaCompleta.venda_presencial === false;`
- Usar `if (isFrio && remaining > 0) { pctGelo = ... }` no lugar de `if (isPresencial ...)`.

### 2. `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` (linha ~1009)
- Mesma inversão: `const isFrio = venda?.venda_presencial === false;` → aplica `pctGelo` só quando `isFrio`.

### 3. `src/pages/administrativo/FaturamentoVendasMinimalista.tsx` (linha ~414)
- Mesma inversão: `const isFrio = venda.venda_presencial === false;` → aplica `pctGelo` só quando `isFrio`.
- Atualizar tooltip linha ~1314: trocar `"Desconto presencial (até X%) — venda presencial"` por `"Desconto frio (até X%) — venda não presencial (Frio)"`.

### 4. `src/utils/descontoVendasRules.ts`
- Atualizar comentário da linha 43-44: substituir "5% adicional para venda presencial" por "5% adicional para venda Frio (não presencial)" — para alinhar o JSDoc com o uso real. Sem mudança de comportamento (a função já aplica corretamente baseada no booleano recebido, e os callers já passam `venda_presencial === false`).

## Detalhes técnicos
- Não há migração ou recálculo persistido — descontos são derivados em runtime a partir de `produtos_vendas`.
- Trava em `validarDesconto` permanece a mesma; apenas o display estava invertido.
- Sem alteração de banco, hooks ou rotas.
