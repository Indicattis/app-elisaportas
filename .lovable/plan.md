## Objetivo

Em `/vendas/minhas-vendas/nova`, quando o método for **Boleto**:
1. Não exigir/exibir o campo "Data de pagamento" — o intervalo já define automaticamente.
2. A **primeira parcela** deve vencer em `hoje + intervalo` (ex.: 21 dias), e não hoje. As parcelas seguintes seguem o mesmo intervalo entre si.

Comportamento de outros métodos (À Vista, Cartão de Crédito) permanece inalterado.

## Alterações

### 1. `src/components/vendas/MetodoPagamentoCard.tsx`
- Quando `metodo.tipo === "boleto"`, ocultar o seletor de "Data de pagamento" (Popover/Calendar).
- Manter o campo visível para `a_vista` e `cartao_credito`.

### 2. `src/components/vendas/PagamentoSection.tsx`
- Em `calcularPreviewParcelas`, para boleto:
  - Ignorar `metodo.data_pagamento` como base; usar `hoje` (ou a data da venda, se disponível) como base.
  - Vencimento da parcela `i` (0-indexed) = `base + intervalo * (i + 1)`.
- Remover a exigência de `data_pagamento` para o preview aparecer no bloco de boleto (permitir preview mesmo sem data).
- Ajustar validações que hoje reprovam boleto sem `data_pagamento` (janela de datas) para pular a checagem quando o tipo for boleto.

### 3. `src/hooks/useVendas.ts` (função `gerarContasReceberPorMetodo`, case `'boleto'`)
- `dataBase` para boleto = `hoje` (ou `vendaData.data_venda`), ignorando `metodo.data_pagamento`.
- Vencimento de cada parcela = `addDays(dataBase, intervalo_boletos * (i + 1))` — deslocar em +1 intervalo para que a primeira já caia após o período.
- Não gravar `data_pagamento` do método no banco para boleto (permanece `pendente`, exceto se `ja_pago`).

### 4. Regra de boleto (`src/utils/boletoRegra.ts`)
- Em `aplicarRegraBoleto`, ao construir o `novoM2` (boleto), não copiar `data_pagamento` do source — deixar `undefined`.
- Sem outras mudanças de regra (entrada 70%, máx. 3 parcelas, intervalos permitidos permanecem).

## Fora de escopo
- Rascunhos já persistidos continuam com o valor gravado; a nova regra vale para novas vendas/rascunhos e para o recálculo ao editar.
- Nenhuma migração de banco — apenas front-end e geração de `contas_receber` no fluxo de criação.
