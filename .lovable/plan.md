## Objetivo

Adicionar botão **"Gerar parcelas"** na seção *Parcelas / Recebimentos* do `PedidoDetalhesSheet`, replicando exatamente a mesma lógica de geração já existente na tela de Faturamento da venda (`FaturamentoVendaMinimalista.handleGerarParcelas`), usando os dados cadastrados na venda vinculada ao pedido.

## Comportamento

1. **Botão "Gerar parcelas"** (com ícone `Sparkles`/`Wand2`) ao lado do botão "+ Nova parcela" no cabeçalho da seção.
2. Quando **não existem parcelas** → clique gera direto a partir dos dados da venda.
3. Quando **já existem parcelas** → abrir `AlertDialog` de confirmação ("Isto removerá as parcelas atuais e gerará novas a partir da venda. Continuar?"). Se confirmado, apaga todas as parcelas atuais (`delete().eq('venda_id', vendaId)`) e gera as novas — igual ao `handleRegenerarParcelas`.
4. Após gerar, chamar `fetchContasReceber()` para atualizar a lista e exibir toast de sucesso/erro.
5. Se o pedido não tiver `venda_id` resolvível, desabilitar o botão.

## Lógica de geração (idêntica à da venda)

Buscar a venda completa (`vendas` table) pelos campos: `metodo_pagamento`, `numero_parcelas`/`quantidade_parcelas`, `intervalo_boletos`, `valor_venda`, `valor_credito`, `valor_frete`, `data_venda`, `valor_entrada`, `valor_a_receber`, `empresa_receptora_id`.

- `valorTotal = valor_venda + valor_credito + valor_frete`
- Se `valor_entrada > 0` **e** `valor_a_receber > 0` → gera 2 blocos:
  - Entrada: 1 parcela `a_vista` no `data_venda`.
  - Saldo: `numero_parcelas` no método principal, intervalo `intervalo_boletos` (cartão_credito força 30 dias).
- Caso contrário → gera `numero_parcelas` parcelas no método principal sobre o `valorTotal`.
- Para métodos não-parceláveis (`dinheiro`, `a_vista`, `pix`) → 1 parcela única.
- Insere com `status: 'pendente'`, `pago_na_instalacao: false`, `empresa_receptora_id` da venda.

## Arquivos afetados

- `src/components/pedidos/PedidoDetalhesSheet.tsx` — adicionar `handleGerarParcelas`, estado `confirmRegenerarOpen`, botão no cabeçalho da seção, e `AlertDialog` de confirmação. Importar `addDays` de `date-fns` e o ícone `Wand2`/`Sparkles`.

Sem alterações no schema/DB, edge functions ou outros componentes.