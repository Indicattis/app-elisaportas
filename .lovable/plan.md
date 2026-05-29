## Objetivo

Linkar `produtos_vendas` (e `orcamentos_produtos`, se aplicável) a `custos_itens` por meio de uma nova coluna `custos_itens_id`, mantendo `vendas_catalogo_id` intacto para compatibilidade. Sem alterações de código nesta etapa.

## Migração (single migration)

1. **Adicionar coluna nullable** `custos_itens_id uuid` em:
   - `produtos_vendas`
   - `orcamentos_produtos` (se existir — verificar; tem `vendas_catalogo_id`)
   - FK `REFERENCES custos_itens(id) ON DELETE SET NULL`
   - Índice em ambas

2. **Backfill por match exato de nome** (case + trim insensitive):
   ```sql
   UPDATE produtos_vendas pv
   SET custos_itens_id = ci.id
   FROM vendas_catalogo vc
   JOIN custos_itens ci
     ON lower(trim(vc.nome_produto)) = lower(trim(ci.descricao))
   WHERE pv.vendas_catalogo_id = vc.id;
   ```
   Mesma lógica para `orcamentos_produtos`.

3. **Não tocar** em `vendas_catalogo_id` nem na tabela `vendas_catalogo`. ~56 produtos_vendas ficarão com `custos_itens_id` NULL (esperado).

## Resultado esperado

- ~176 de 232 `produtos_vendas` ganharão `custos_itens_id` preenchido.
- 56 ficam órfãos com `custos_itens_id` NULL, mas continuam funcionando via `vendas_catalogo_id`.
- Nenhuma quebra de UI/código.

## Fora de escopo (próximas etapas, quando você quiser)

- Reescrever hooks/componentes (`useVendasCatalogo`, `ProdutoVendaForm`, `SelecionarAcessoriosModal`, `useProdutosVendidosMes`, `usePedidosAprovacaoDiretor`, etc.) para usar `custos_itens` em vez de `vendas_catalogo`.
- Resolver os 56 órfãos (ajustar nomes em `custos_itens` ou mapeamento manual).
- Dropar `vendas_catalogo_id` e a tabela `vendas_catalogo`.