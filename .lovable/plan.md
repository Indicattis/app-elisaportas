## Problema

Em `/direcao/vendas/todas` (`src/pages/direcao/VendasDirecao.tsx`) a coluna Temperatura está com a lógica invertida em relação ao restante do sistema:

- **VendasDirecao (linhas 771-789 e 148-165):** `venda_presencial === true` é exibido como **"Frio"** e ao clicar mostra toast "Marcada como Fria".
- **Restante do sistema** (`PedidoDetalhesSheet.tsx` linha 842 e 1273, `descontoTiers.ts`, `useVendas.ts`): `venda_presencial === true` = **"Quente"** (venda presencial → cliente quente). Esta é a convenção correta, pois `venda_presencial` também habilita o tier de desconto presencial.

## Correção

Em `src/pages/direcao/VendasDirecao.tsx`, apenas na coluna Temperatura:

1. **Case `'temperatura'` (linhas 771-790):** trocar
   - `isFrio = venda_presencial === true` → `isFrio = venda_presencial === false`
   - `isQuente = venda_presencial === false` → `isQuente = venda_presencial === true`

2. **`toggleTemperatura` (linhas 148-165):** ajustar o toast para refletir o novo valor corretamente
   - `novo ? 'Marcada como Fria' : 'Marcada como Quente'` → `novo ? 'Marcada como Quente' : 'Marcada como Fria'`
   - (a lógica de gravação `venda_presencial: novo` permanece — só o rótulo mudava)

Nenhum outro arquivo é afetado; a coluna passa a exibir a mesma convenção do drawer de pedido em `/direcao/gestao-fabrica`.