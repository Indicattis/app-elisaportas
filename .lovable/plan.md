## Situação atual

O cálculo da comissão **já exclui o frete** no banco. O trigger `requisicoes_venda_calc` (BEFORE INSERT/UPDATE) faz:

```
comissao_valor = round((valor_total - valor_frete) * comissao_pct / 100, 2)
```

A requisição que existe hoje confirma isso: valor_total R$ 18.220, frete R$ 2.820, comissão 5% → R$ 770 (e não R$ 911 que seria sobre o total cheio).

## O que vou ajustar

Apenas reforços para deixar isso explícito e à prova de regressão:

1. **Tela `/direcao/vendas/requisicoes-representantes`**
   - Mudar o cabeçalho da coluna para `Comissão (sem frete)`.
   - Abaixo do valor da comissão, em vez de só `5.00%`, mostrar `5,00% sobre R$ 15.400` (valor_total − valor_frete), deixando claro qual é a base.

2. **Garantia no banco**
   - Recriar `requisicoes_venda_calc` com `COALESCE` em `valor_total`, `valor_frete` e `comissao_pct` para nunca quebrar quando algum campo vier nulo do app do representante.
   - Não muda regra; só blinda a fórmula.

3. **Nada na tabela `vendas`**
   - O frete em vendas já está separado em outro fluxo e não entra em comissão de representantes (essa comissão só existe em `requisicoes_venda`).