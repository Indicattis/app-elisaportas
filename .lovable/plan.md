Add a **Frete** column to the `/financeiro/faturamento/vendas` listing, positioned immediately to the right of the **Preço Tabela** column.

Changes in `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`:

1. **Column definition** — Insert `{ id: 'frete', label: 'Frete', defaultVisible: true }` into `COLUNAS_DISPONIVEIS` right after the `'tabela'` entry.
2. **Responsive hiding** — Add `'frete'` to the `hiddenOnMobile` array in `getColumnResponsiveClass` so it hides on mobile like the other numeric columns.
3. **Alignment** — Add `'frete'` to the `rightAligned` array in `getColumnAlignment`.
4. **Sorting** — Add `case 'frete': return venda.valor_frete || 0;` in the `sortedVendas` `getValue` switch.
5. **Cell rendering** — Add `case 'frete':` in `renderCell` to display `formatCurrency(venda.valor_frete || 0)` with an amber color (`text-amber-400`) and the Truck icon, consistent with the freight indicator styling used elsewhere in the page.

No database or other screens are affected.