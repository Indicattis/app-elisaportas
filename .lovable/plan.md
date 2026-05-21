## Objetivo

Em `/administrativo/financeiro/custo-folha`, adicionar dois novos campos por colaborador/mês:
- **Pago no mês**: checkbox indicando se o pagamento já foi efetuado.
- **Data de pagamento**: data em que o pagamento foi realizado.

## Banco de dados

Migration em `custos_folha_mensais`:
- `pago boolean NOT NULL DEFAULT false`
- `data_pagamento date NULL`

## UI (`src/pages/administrativo/CustoFolhaMensal.tsx`)

- Estender `LinhaValores` com `pago: boolean` e `dataPagamento: string`.
- Adicionar duas colunas na tabela (entre "Adiantamento" e "Chave PIX"):
  - **Pago** — `<Checkbox>` no padrão da página.
  - **Data Pagamento** — `<Input type="date">`.
- `useQuery` passa a selecionar `pago, data_pagamento`.
- `useEffect` hidrata os novos campos.
- `handleSave` envia `pago` e `data_pagamento` no upsert (data vira `null` se vazia).
- Ajustar a condição de "linha vazia → delete" para preservar registros marcados como pagos.

Sem alterações de lógica de cálculo (campos são informativos, não somam).
