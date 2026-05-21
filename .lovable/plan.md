## Objetivo

Mudar o fluxo: ao faturar uma venda, ela **não cria pedido** automaticamente. Ela avança para a etapa **"Aprovação Diretor"** (etapa virtual na venda, mesmo padrão de `assinatura_contrato` e `pendente_pedido`). O `pedidos_producao` só nasce quando o diretor aprova.

Hoje a "Aprovação Diretor" só existe DEPOIS de um `pedidos_producao` ter sido criado — por isso a venda dispensada some sem passar por lá.

---

## Mudanças

### 1. Etapa virtual "Aprovação Diretor" em vendas

Nenhuma mudança de schema. Definida por predicado em `vendas`:

```
is_rascunho=false
AND pedido_dispensado=false
AND status_aprovacao <> 'reprovado'
AND isVendaFaturada(venda) = true   (frete_aprovado + todos itens faturamento=true)
AND NÃO existe pedidos_producao vinculado
```

Atualizar `useVendasPendentePedido` → renomear conceitualmente para "Aprovação Diretor" (manter hook, só mudar o label e o destino no UI). O predicado já é exatamente esse.

### 2. Unificar `usePedidosAprovacaoDiretor`

Hoje só lê `pedidos_producao` em `etapa_atual='aprovacao_diretor'`. Passa a retornar **duas origens**:

- **Vendas virtuais** (sem pedido ainda) — fonte primária do novo fluxo
- **Pedidos legados** já em `aprovacao_diretor` (compatibilidade com pedidos antigos)

Cada item carrega um discriminador `origem: 'venda' | 'pedido'`.

### 3. Ação "Aprovar" (no card de venda virtual)

Quando o diretor aprova uma venda virtual:
1. Cria `pedidos_producao` (reaproveita `createPedidoFromVenda`)
2. Já entra direto em `etapa_atual='aberto'` (pula `aprovacao_diretor` porque acabou de ser aprovada)
3. Cria `pedidos_etapas` para `aberto` + fecha virtualmente registrando movimentação `aprovacao_diretor → aberto`

Para pedidos legados em `aprovacao_diretor`: comportamento atual permanece (`aprovarPedido` em `usePedidosAprovacaoDiretor`).

### 4. Ação "Reprovar" (no card de venda virtual)

`UPDATE vendas SET status_aprovacao='reprovado' WHERE id=?` + registra log. Nenhum pedido é criado.

### 5. Remover atalhos manuais que pulam o diretor

Em `VendaPendentePedidoCard.tsx`:
- **Remover** botão "Dispensar pedido" (`handleDispensarPedido`)
- **Remover** botão "Finalizar direto / Arquivo Morto" (`handleFinalizarDireto`)
- **Remover** botão "Criar Pedido" manual — o pedido só nasce via aprovação do diretor

O card vira read-only com botões **"Aprovar"** e **"Reprovar"** (visível apenas para perfis com permissão).

### 6. UI – aba em `/direcao/gestao-fabrica`

- Renomear a aba "Pend. Pedido" para **"Aprovação Diretor"** (ou unificar as duas abas em uma única).
- Contador une vendas virtuais + pedidos legados na etapa.

### 7. Backfill das 12 vendas

Migration de dados:
```sql
UPDATE vendas
SET pedido_dispensado = false
WHERE pedido_dispensado = true
  AND frete_aprovado = true
  AND id NOT IN (SELECT venda_id FROM pedidos_producao WHERE venda_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM produtos_vendas pv
    WHERE pv.venda_id = vendas.id
    GROUP BY pv.venda_id
    HAVING bool_and(pv.faturamento = true)
  );
```

Essas vendas voltam a aparecer naturalmente na nova aba "Aprovação Diretor".

---

## Arquivos afetados

```text
src/hooks/useVendasPendentePedido.ts        # já tem o predicado correto, manter
src/hooks/usePedidosAprovacaoDiretor.ts     # unir vendas virtuais + pedidos legados
src/hooks/usePedidoCreation.ts              # nova opção: criar já em 'aberto' (pós-aprovação)
src/components/pedidos/VendaPendentePedidoCard.tsx  # remover Criar/Dispensar/Finalizar; adicionar Aprovar/Reprovar
src/pages/direcao/GestaoFabricaDirecao.tsx  # renomear/unificar aba
src/components/direcao/GestaoFabricaMobile.tsx
src/pages/direcao/aprovacoes/AprovacoesPedidos.tsx  # listar vendas virtuais também
mem/features/direcao/aprovacao-diretor-workflow-v3-virtual-stage.md  # atualizar memória
```

Migration de dados (backfill) das 12 vendas.

---

## Riscos / verificação

- Vendas com pedido já criado **não** são afetadas (filtro `NOT IN pedidos_producao`).
- `useCanEditVenda` continua bloqueando edição de vendas faturadas — não muda.
- Pedidos legados em `aprovacao_diretor` continuam funcionando via mesma aba.
- Os 5 registros com `pedido_dispensado=true` mas `frete_aprovado=false` permanecem dispensados (não foram faturados, dispensa foi consciente).
