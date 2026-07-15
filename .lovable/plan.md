## Objetivo
Quando um pedido entra em `finalizado` ou `pos_vendas`, marcar automaticamente todas as parcelas pendentes da venda como pagas.

## Implementação (migration única)

1. **Função `public.marcar_parcelas_pagas_pedido_finalizado()`** (trigger function, SECURITY DEFINER, `search_path=public`):
   - Dispara em `AFTER UPDATE OF etapa_atual ON pedidos_producao`.
   - Condição: `NEW.etapa_atual IN ('finalizado','pos_vendas')` e `NEW.etapa_atual IS DISTINCT FROM OLD.etapa_atual` e `NEW.venda_id IS NOT NULL`.
   - Executa:
     ```sql
     UPDATE public.contas_receber
        SET status = 'pago',
            valor_pago = valor_parcela,
            data_pagamento = CURRENT_DATE,
            updated_at = now()
      WHERE venda_id = NEW.venda_id
        AND status = 'pendente';
     ```

2. **Trigger** `trg_marcar_parcelas_pagas_pedido_finalizado` em `pedidos_producao`.

3. **Backfill** (uma vez, dentro da mesma migration): rodar o mesmo UPDATE para todas as vendas cujo pedido já está em `finalizado`/`pos_vendas` e ainda tem parcelas pendentes, para regularizar o histórico.

## Fora de escopo
- Nenhuma mudança de UI.
- Não altera parcelas já `pago`.
- Não cria nova conta a receber; apenas atualiza pendentes existentes.