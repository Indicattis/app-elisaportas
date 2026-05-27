## Problema

Em `/direcao/estrategia/kits/:kitId/montagem`, o card "Lucro adicional" exibe **Preço da porta** a partir de `kit.valor_porta` (coluna persistida em `tabela_precos_portas`). Como esse valor não é recalculado quando os itens da montagem mudam, ele fica estático (R$ 2.704,50). Só o lucro/margem da montagem muda porque dependem de `totais.custo`/`totais.venda` calculados em memória a partir dos itens.

## Solução

Sempre que a montagem do kit for alterada (adicionar item, alterar quantidade, remover item, aplicar template), recalcular `valor_porta = Σ (preco_venda × quantidade)` dos itens da montagem e gravar em `tabela_precos_portas.valor_porta` do kit corrente.

### Onde aplicar

Tudo dentro de `src/hooks/useKitMontagem.ts`:

1. Criar helper interno `recalcKitValorPorta(kitId: string)`:
   - `SELECT quantidade, custos_itens(preco_venda) FROM tabela_precos_portas_montagem WHERE kit_id = :kitId`
   - Soma `Σ q × preco_venda` → `novoValor`
   - `UPDATE tabela_precos_portas SET valor_porta = novoValor WHERE id = :kitId`

2. Disparar `recalcKitValorPorta(kitId)` no `onSuccess` (após o insert/update/delete bem-sucedido, antes do `invalidate`) das mutations:
   - `addItem`
   - `updateQuantidade`
   - `removeItem`

3. Em `invalidate()`, adicionar invalidação de `["tabela-precos-kit", kitId]` (chave usada por `EstrategiaKitMontagem.tsx`) e de `["tabela-precos-portas"]` (lista de kits) para refletir o novo `valor_porta` em tela e na listagem.

4. Em `src/hooks/useMontagemTemplate.ts` → função `applyTemplateToKit`: ao final do apply, chamar a mesma rotina de recálculo para o `kitId`. A página `EstrategiaKitMontagem.tsx` já invalida `["kit-montagem", kitId]` e `["kits-montagem-resumo"]` depois do apply — adicionar invalidação de `["tabela-precos-kit", kitId]` ali também.

### Sem alterações de UI

Nenhuma mudança em `EstrategiaKitMontagem.tsx` além das chaves de invalidação já existirem. O card "Lucro adicional" continua lendo `kit.valor_porta`, que agora reflete o valor recalculado.

### Sem migration

A coluna `valor_porta` já existe em `tabela_precos_portas`. Não há mudança de schema.

### Observações

- O recálculo roda no cliente (Supabase JS), em série após cada mutation, para manter consistência sem trigger no banco.
- Itens sem `custo_item` associado (ou `preco_venda` nulo) contam como 0.
- A funcionalidade "Sincronizar preço dos kits" eventualmente existente (se houver) continua válida; este recálculo apenas garante atualização automática quando o usuário edita pela tela de montagem.
