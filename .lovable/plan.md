## Interpretação

A coluna `vendas.venda_presencial` (boolean) já é o "termômetro" da venda: o faturamento atual exibe 🔥 "Venda Quente" quando `true` e ❄️ "Venda Gelo" quando `false`. Vou reusar essa coluna em vez de criar outra:
- **Quente** = `venda_presencial = true`
- **Frio** = `venda_presencial = false`

Mantém o bônus de +5% no limite de desconto para "Quente" (comportamento existente, sem citar essa lógica no rótulo).

## Mudanças

### 1. `/vendas/minhas-vendas/nova` — `src/pages/vendas/VendaNovaMinimalista.tsx`
Substituir o `SophisticatedCheckbox` "Venda Presencial +5% limite de desconto" por um `RadioGroup` obrigatório:
- Label: "Temperatura da venda *"
- Opções: **Frio** ❄️ e **Quente** 🔥
- `formData.venda_presencial` agora inicia como `null` (não selecionado).
- Validação no submit: bloquear envio com toast "Selecione se a venda é Frio ou Quente" se `venda_presencial == null`.
- Atualizar as chamadas a `validarDesconto(..., formData.venda_presencial)` para tratar `null` como `false` no cálculo enquanto não selecionado (sem +5%).

### 2. `/financeiro/faturamento/:id` — `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`
Renomear "Venda Gelo" → "Venda Frio" no badge existente (linha ~1485). Manter cores e ícones.

### 3. `/direcao/gestao-fabrica` downbar de vendas e pedidos
Adicionar um badge compacto "🔥 Quente" / "❄️ Frio" no rodapé dos cards:
- **Vendas pendentes:** `src/components/pedidos/VendaPendentePedidoCard.tsx` e `VendaPendenteFaturamentoCard.tsx` — incluir badge próximo ao valor/cliente.
- **Pedidos:** `src/components/pedidos/PedidoCard.tsx` — incluir badge dentro do `CardFooter`/área inferior do card.
- Verificar se `venda_presencial` está disponível na query do pedido (`useVendasPendentePedido`, `useVendasPendenteFaturamento`, e hook que carrega pedidos). Adicionar `venda_presencial` ao `select` se faltar.

## Fora de escopo

- Não cria nova coluna no banco.
- Não altera a regra de +5% (continua atrelada a Quente).
- Vendas existentes com `venda_presencial = null` aparecerão como "Frio" por padrão.
