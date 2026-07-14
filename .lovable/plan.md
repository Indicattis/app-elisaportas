## Objetivo

Adicionar um tooltip na célula "Pagamento" de `/direcao/vendas/todas` que, ao passar o mouse, liste todos os pagamentos da venda com suas parcelas, valor, vencimento e status (pago/pendente).

## Alterações

Arquivo único: `src/pages/direcao/VendasDirecao.tsx`

1. **Expandir a busca de contas_receber** (useEffect ~linha 311). Hoje o `SELECT` traz só `venda_id, metodo_pagamento` para saber métodos extras. Passar a trazer também: `numero_parcela, valor_parcela, valor_pago, data_vencimento, data_pagamento, status`.

2. **Novo state paralelo** `parcelasPorVenda: Map<string, ParcelaInfo[]>` armazenando as linhas completas por venda (ordenadas por método → nº parcela). O `metodosExtraPorVenda` existente continua sendo derivado do mesmo fetch (para não duplicar consultas).

3. **Renderizar o tooltip** no `case 'pagamento'` (linhas 627-642). Envolver o conteúdo atual em `<Tooltip>/<TooltipTrigger asChild>` com a mesma classe atual + `cursor-help`. No `<TooltipContent>` (mesmo estilo do tooltip de desconto — `bg-zinc-900 border-zinc-700 p-3 max-w-sm`):
   - Título: "Pagamentos da venda"
   - Para cada método presente nas parcelas, agrupar e mostrar:
     - Cabeçalho do método (label via `getFormaPagamentoLabel`) + total das parcelas
     - Uma linha por parcela: `Nº X • R$ valor • venc. dd/MM • [badge status]`
     - Badge verde "Pago" quando `status === 'pago'`, amarelo "Pendente" caso contrário; se pago, mostrar também a data em pequeno.
   - Fallback: se não houver parcelas em `contas_receber` para a venda, exibir "Sem parcelas registradas" e apenas os métodos (principal + secundário) já mostrados na célula.

4. **Formatação** reutilizar `formatCurrency`, `format(..., 'dd/MM/yyyy', { locale: ptBR })` e `getFormaPagamentoLabel` já importados. Nenhum novo pacote.

Nenhuma outra célula, filtro, ordenação ou lógica de negócio é alterada.
