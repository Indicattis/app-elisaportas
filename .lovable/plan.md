## Problema

Na tela `/financeiro/faturamento/:id`, o componente `PagamentoResumo` exibe os valores das parcelas exatamente como estão em `contas_receber`. Quando o vendedor aplica desconto (ou acréscimo) na venda **após** as parcelas terem sido geradas, esses valores ficam desatualizados — somam o valor bruto, não o valor real da venda.

Exemplo desta venda:
- Soma das parcelas em `contas_receber`: R$ 18.059
- Valor real (produtos − descontos + frete): R$ 15.570 + frete

## Solução (apenas exibição)

Ajustar **somente** o `PagamentoResumo` para exibir as parcelas reescaladas proporcionalmente ao valor real da venda, sem alterar o banco.

### Mudanças

**1. `src/components/vendas/PagamentoResumo.tsx`**

- Adicionar prop opcional `valorTotalEsperado?: number`.
- Se informado e divergir da soma atual das parcelas em mais de R$ 0,01, calcular fator `escala = valorTotalEsperado / somaParcelas` e aplicar a cada `valor_parcela` exibido (subtotal por método e linha individual).
- Ajuste de centavos: última parcela absorve a diferença de arredondamento para que a soma exibida bata exatamente com `valorTotalEsperado`.
- Exibir um aviso discreto abaixo do título quando houver reescalonamento: "Valores ajustados para refletir descontos/acréscimos da venda."
- Não modifica `contas_receber` no banco.

**2. `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`**

- Calcular `valorTotalEsperado` a partir de `produtos_vendas` carregados na página:
  - `bruto = Σ ((valor_produto + valor_pintura + valor_instalacao) × quantidade)`
  - `descontos = Σ (tipo_desconto === 'valor' ? desconto_valor : tipo_desconto === 'percentual' ? base_item × desconto_percentual/100 : 0)`
  - `valorTotalEsperado = bruto − descontos + (valor_frete || 0) + (valor_credito || 0)`
- Passar para `<PagamentoResumo valorTotalEsperado={valorTotalEsperado} ... />`.

### Fora de escopo

- Não alterar `contas_receber` no banco.
- Não mudar o fluxo de cadastro/edição de venda.
- Não alterar outras telas que consomem `PagamentoResumo` (prop é opcional, comportamento padrão preservado).
