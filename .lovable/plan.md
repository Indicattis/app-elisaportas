# Lucro R$ 0,00 na porta de enrolar (venda FMS Informatica)

## Diagnóstico (confirmado)

O item "Porta de Enrolar 1,95 x 3,70m" está com `lucro_item = 0` e `custo_producao = 3.540,74` (igual ao valor da linha).

O motivo não é o cálculo da venda, e sim o cadastro do kit de preços:

- O item está vinculado ao kit `(0,70) - (M) - (4') - (300Kg)` (2,00 x 4,00m), valor R$ 4.039,00.
- Esse kit está com o campo **lucro = 0** na tabela de preços de portas.
- A função de cálculo (`recalcular_lucro_venda`) usa exatamente `lucro do kit x quantidade` para portas de enrolar. Com lucro 0 no kit, o item fica com lucro R$ 0,00 e custo = valor total.

Não é um caso isolado: **12 kits ativos** estão com lucro zerado, entre eles vários de portas grandes (ex.: 9,50x3,00 R$ 12.652; 7,00x7,50 R$ 21.029). Toda venda que cair nesses kits nasce com lucro zero.

## Correção proposta

1. **Preencher o lucro dos kits zerados** em `/direcao/vendas/tabela-precos`. Isso precisa dos valores reais de lucro por kit — informados pela direção (é dado comercial, não dá para inferir).
2. **Recalcular** as vendas ainda não faturadas após o preenchimento (a função de recálculo já existe e roda em vendas em aberto).
3. **Alerta preventivo na tela de faturamento**: quando um item de porta tiver lucro R$ 0,00 por causa de kit sem lucro cadastrado, exibir um aviso indicando o kit e um link para corrigir o cadastro — em vez de aparecer silenciosamente como R$ 0,00.
4. **Marca visual na tabela de preços**: destacar com badge os kits com lucro zerado, para que fiquem visíveis na manutenção do cadastro.

Para esta venda específica: como ela ainda não está faturada, ao definir o lucro do kit 2,00x4,00 o valor é recalculado automaticamente; alternativamente o lucro pode ser informado manualmente no modal de faturamento do item.

## Detalhes técnicos

- Origem do cálculo: função `recalcular_lucro_venda` (ramo `porta_enrolar`), que lê `tabela_precos_portas.lucro` pelo `tabela_precos_porta_id` do item, com fallback por dimensão (tolerância 15cm).
- Alerta: `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` já carrega o mapa dos kits da venda — dá para comparar `lucro_item = 0` com `kit.lucro = 0` e renderizar o aviso.
- Badge: página da tabela de preços / `src/hooks/useTabelaPrecos.ts`.
- Nenhuma mudança na fórmula de lucro é necessária.