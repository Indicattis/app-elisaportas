---
name: Pintura e instalação - valor único
description: Itens pintura_epoxi e instalacao não podem ter valor_produto duplicando valor_pintura/valor_instalacao
type: constraint
---
Itens `produtos_vendas` com `tipo_produto='pintura_epoxi'` devem usar APENAS `valor_pintura` (valor_produto=0). Itens `tipo_produto='instalacao'` legados armazenam o valor em `valor_produto` (valor_instalacao=0). Trigger DB `validar_produto_venda_servicos` bloqueia INSERT/UPDATE com ambos preenchidos simultaneamente. **Why:** duplicação inflava a base de cálculo do desconto, mascarando descontos abusivos (caso real: venda 33af14d6 mostrava 49% quando era 70%).
