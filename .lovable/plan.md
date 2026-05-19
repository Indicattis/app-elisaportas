## Mudança

Na aba "Assinatura Contrato" de `/direcao/gestao-fabrica`, os cards (`VendaPendentePedidoCard` renderizado com `mode="contrato"`) mostram, além de "Anexar Contrato", dois botões herdados do layout de faturamento:

- **Concluir sem pedido** (ícone amarelo `AlertTriangle`, dispensa pedido)
- **Finalizar Direto (Arquivo Morto)** (ícone verde `CheckCircle2`)

Esses dois botões devem desaparecer apenas quando `mode === 'contrato'`. Em `mode === 'faturamento'` continuam aparecendo normalmente.

## Arquivo a editar

`src/components/pedidos/VendaPendentePedidoCard.tsx` (linhas ~590–655): envolver os blocos "Dispensar Pedido" e "Finalizar Direto" em uma condição `mode !== 'contrato'`, mantendo o botão "Anexar Contrato" como única ação na etapa de assinatura.

Sem mudanças em hooks, lógica de negócio ou banco.