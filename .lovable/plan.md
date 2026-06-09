# Auto-faturamento de itens avulsos

## Problema
Na tela `/financeiro/faturamento/:id`, itens avulsos (`tipo_produto` `acessorio`, `adicional`, `manutencao`) ficam com `lucro_item = 0` e exigem preenchimento manual. Hoje só portas, pintura e instalação são auto-faturadas.

A definição de custo/preço desses itens existe em `/direcao/estrategia/itens` (tabela `custos_itens` com `custo_unitario` e `preco_venda`).

## Solução
Adicionar um quarto `useEffect` de auto-faturamento em `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`, paralelo aos três existentes (pintura, porta, instalação), específico para avulsos.

### Regra de cálculo
Para cada produto avulso ainda não faturado e com `lucro_item` zerado:

1. **Localizar o item no catálogo** `custos_itens`:
   - Preferencial: `custos_itens_id` (se a venda já gravar esse vínculo — atualmente está `null` no caso reportado, então fica como fallback futuro).
   - Fallback principal: match por `descricao` exata (case-insensitive) na tabela `custos_itens` com `vendavel_avulso = true`. Se houver mais de um, usar o primeiro ordenado por `descricao`.
   - Se não encontrar nenhum: pular (não preencher lucro automaticamente, deixar manual).

2. **Calcular**:
   - `custoTotal = custo_unitario × quantidade`
   - `lucroItem = valor_total − custoTotal` (respeita o preço efetivamente cobrado na venda, mesmo se diferente do `preco_venda` do catálogo)
   - Se `lucroItem < 0`, gravar `0` (evita lucro negativo automático; usuário pode ajustar manualmente).

3. **Persistir** via `updateLucroItem({ produtoId, lucroItem, custoProducao: custoTotal })` — mesmo padrão dos outros três efeitos. Não marcar `faturamento: true` automaticamente (diferente de instalação) — mantém o comportamento atual de portas/pintura, onde o lucro é preenchido mas o usuário ainda confirma.

4. **Anti-loop**: usar o mesmo `autoFaturadosRef.current` já existente para não reprocessar.

### Onde mudar
- `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`: adicionar o novo `useEffect` logo após o bloco de instalação (~linha 748).

### Fora do escopo
- Não altera schema, RLS ou a página `/direcao/estrategia/itens`.
- Não preenche `custos_itens_id` retroativamente em vendas antigas (apenas usa para lookup quando existir).
- Não toca em `acessorio_id` / `adicional_id` (são tabelas legadas separadas — `acessorios` e `adicionais` — distintas de `custos_itens`).

## Detalhes técnicos
```text
useEffect avulsos:
  filtrar produtos com tipo_produto ∈ {acessorio, adicional, manutencao}
                     ∧ lucro_item ∈ {null, 0}
                     ∧ !faturamento
                     ∧ ∉ autoFaturadosRef
  para cada:
    autoFaturadosRef.add(id)
    item = custos_itens.findByDescricao(produto.descricao, vendavel_avulso=true)
    se !item → return
    custoTotal = item.custo_unitario × produto.quantidade
    lucroItem  = max(0, produto.valor_total − custoTotal)
    updateLucroItem({ produtoId, lucroItem, custoProducao: custoTotal })
```
