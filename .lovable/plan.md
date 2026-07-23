## Mudanças

### 1. Renomear rótulo do frete
Em `src/pages/vendas/VendaNovaMinimalista.tsx` (linha ~1300), trocar o texto do radio `transportadora`:
- De: **"Frete por Transportadora"**
- Para: **"Frete por conta do cliente"**

O valor interno (`'transportadora'`) permanece igual para não quebrar dados existentes — apenas o label muda.

### 2. Garantir persistência do `tipo_frete` na venda
As colunas `tipo_frete` e `valor_frete` já existem em `public.vendas`. O `valor_frete` já é salvo, mas o `tipo_frete` está declarado na interface de `useVendas.ts` e nunca incluído no payload de insert/update.

Ajustes em `src/hooks/useVendas.ts`:
- No `createVenda` (payload principal de `vendas`, ~linha 451) adicionar `tipo_frete: vendaData.tipo_frete || 'interno'`.
- No `updateVenda` equivalente (~linha 843) adicionar o mesmo campo.
- Aplicar também nos fluxos de rascunho, se compartilharem o mesmo payload.

Garantir que `VendaNovaMinimalista.tsx` está passando `tipo_frete` no objeto enviado ao hook (já está no `formData`), sem outras alterações de UI/lógica.

### Fora do escopo
- Nenhuma mudança em relatórios, DRE, PDFs ou telas de visualização (o campo já pode ser lido do banco quando necessário).
- Sem migração de dados legados (vendas antigas mantêm `tipo_frete` nulo/atual).