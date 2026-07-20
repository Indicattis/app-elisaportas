## Objetivo
Remover o checkbox manual "Usar 2 formas de pagamento" em `PagamentoSection.tsx`. O segundo método só deve aparecer automaticamente quando houver **boleto** (aplicando a regra existente 70/30 + intervalo 21d).

## Mudanças em `src/components/vendas/PagamentoSection.tsx`
1. Remover o bloco JSX do checkbox `usar-dois-metodos` (linhas ~511–525) e a função `handleToggleDoisMetodos`.
2. Derivar `usar_dois_metodos` automaticamente: sempre que `pagamentoTemBoleto(paymentData)` for `true`, forçar `usar_dois_metodos = true`; caso contrário, forçar `false` e limpar o Método 2.
   - Fazer isso dentro do `useEffect` já existente que aplica `aplicarRegraBoleto` (linhas 226–253) e complementar com um efeito que, quando o boleto sair da seleção, reseta o método 2 e devolve o valor total ao método 1.
3. Ajustar `handleMetodo1Change` para continuar recalculando o valor restante do M2 apenas quando a flag derivada estiver ativa (mesma lógica atual, mas sem depender de escolha manual).
4. Manter o campo `usar_dois_metodos` na interface `PagamentoData` para não quebrar consumidores (`useVendas`, faturamento, etc.), apenas passando a ser controlado internamente.

## Impacto no modo "Na Entrega"
O botão "Na Entrega" hoje vive dentro do card do Método 2, que só aparece quando há boleto/split. Com a remoção do checkbox, a opção "Na Entrega" continuará acessível **apenas** quando o Método 1 for boleto (que é o único cenário que abre o M2). Para vendas sem boleto, "Na Entrega" deixa de ser oferecida — comportamento consistente com o pedido de limitar 2 métodos ao boleto.

## O que NÃO muda
- Estrutura da tabela `vendas` e coluna `pagamento_na_entrega`.
- Regra de boleto (70/30 + 21d) e autorização por senha do Diretor.
- Cálculo de parcelas, resumo e validações de violação.
- `useVendas.ts` — continua lendo `usar_dois_metodos` normalmente.

## Verificação
- Selecionar À Vista/Cartão no Método 1 → apenas 1 card visível, sem checkbox.
- Selecionar Boleto no Método 1 → split automático em M1 À Vista 70% + M2 Boleto 30% (comportamento atual preservado).
- Alternar de Boleto para À Vista no M1 → M2 é limpo e valor total volta para M1.