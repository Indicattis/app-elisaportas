## Problema

A venda `3e4a357d-0c2f-4435-a4a8-8e0b0df9787e` está com `pedido_dispensado=true` (foi marcada como "concluir sem pedido" no passado) e foi reativada (`dispensada_sistema=false`). A aba **Aprovação Diretor** lê de `pedidos_producao` com `etapa_atual='aprovacao_diretor'`, mas nenhum pedido foi gerado para essa venda — por isso ela não aparece.

Hoje, "reativar do sistema" só faz `update vendas set dispensada_sistema=false`. Não considera o estado anterior da venda.

## Solução

Em `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`, alterar o handler de reativação (`toggleVendaFlag` quando `campo='dispensada_sistema'` e `novoValor=false`) para decidir o destino com base no estado anterior:

```text
Reativar venda
│
├── Existe pedido_producao para esta venda?
│   ├── SIM (foi arquivado pela dispensa) → desarquivar (arquivado=false)
│   │   └── Fica na aba correspondente à etapa_atual atual do pedido
│   │       (geralmente Aprovação Diretor, ou onde estava antes)
│   │
│   └── NÃO
│       ├── pedido_dispensado=true (foi "concluída sem pedido")
│       │   → Gerar pedido via createPedidoFromVenda(vendaId),
│       │     forçar etapa_atual='aprovacao_diretor',
│       │     setar pedido_dispensado=false
│       │   → Aparece em Aprovação Diretor
│       │
│       └── pedido_dispensado=false
│           → Comportamento atual: apenas dispensada_sistema=false
│           → Aparece em Assinatura ou Pend. Faturamento conforme contrato
```

## Detalhes técnicos

**Arquivo:** `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

1. Refatorar o caso de reativação para uma função dedicada `reativarVendaNoSistema(venda)`:
   - Buscar `pedidos_producao` (incluindo `arquivado=true`) por `venda_id`.
   - **Caso A (pedido existe):** `update pedidos_producao set arquivado=false, data_arquivamento=null, arquivado_por=null` + `update vendas set dispensada_sistema=false`. Logar movimentação em `pedidos_movimentacoes` (`teor='reativacao'`).
   - **Caso B (sem pedido + pedido_dispensado=true):** chamar `createPedidoFromVenda(venda.id)`, depois `update pedidos_producao set etapa_atual='aprovacao_diretor'` no pedido recém-criado, garantir `pedidos_etapas` upsert para `aprovacao_diretor` com `data_entrada=now()`, e `update vendas set dispensada_sistema=false, pedido_dispensado=false`.
   - **Caso C (sem pedido + pedido_dispensado=false):** apenas `update vendas set dispensada_sistema=false` (comportamento atual).

2. Importar `usePedidoCreation` para usar `createPedidoFromVenda`.

3. Invalidar queries: `vendas`, `vendas-assinatura-contrato`, `vendas-pendente-faturamento`, `vendas-pendente-pedido`, `pedidos-aprovacao-diretor`, `pedidos-contadores`.

4. Para a venda atual (correção pontual via migration de dados): aplicar o Caso B — criar o pedido e mandar para `aprovacao_diretor` — para que ela apareça imediatamente sem precisar clicar reativar novamente.

## Memória

Salvar em `mem://features/vendas/reativacao-venda-sistema` a regra de roteamento por estado anterior (existe pedido → desarquiva; pedido_dispensado=true → cria pedido em aprovação_diretor; senão → volta para assinatura/faturamento).
