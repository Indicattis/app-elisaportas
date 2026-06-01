## Nova regra: pagamento em boleto

Sempre que QUALQUER método de pagamento for **boleto**, o sistema passa a exigir:

1. **Método 1 obrigatoriamente "À Vista"** com valor = **70% do total**
2. **Método 2 obrigatoriamente "Boleto"** com valor = **30% restante** e **intervalo de 21 dias**

Valores fixos no código (não configuráveis em Regras de Vendas).

## Mudanças

### `src/components/vendas/PagamentoSection.tsx`
- Detectar quando algum método é `boleto`.
- Se método único for boleto → forçar ativação de 2 métodos automaticamente:
  - Método 1 = `a_vista`, valor = `valorTotal * 0.7`, travado
  - Método 2 = `boleto`, valor = `valorTotal * 0.3`, `intervalo_boletos = 21`
- Se 2 métodos ativos e método 2 = boleto → travar método 1 como `a_vista` 70% e método 2 com intervalo 21 dias.
- Recalcular automaticamente valores quando `valorTotal` mudar.
- Adicionar aviso visual (badge azul informativo): "Regra do boleto: 70% à vista + 30% em boleto (intervalo 21 dias)".

### `src/components/vendas/MetodoPagamentoCard.tsx`
- Adicionar props opcionais `tipoTravado?: MetodoPagamento['tipo']` e `intervaloBoletoTravado?: number` que, quando passados:
  - Desabilitam os botões de seleção de tipo (mantém visível mas sem clique)
  - Desabilitam o select de "Intervalo entre Boletos"
- Mantém demais campos (data, empresa, comprovante) editáveis.

### `src/pages/vendas/RegrasVendasVisualizacao.tsx`
- Adicionar nova seção "Regra do Boleto" explicando o comportamento 70/30 + 21 dias.

### Validação no submit (`VendaNovaMinimalista.tsx`)
- Bloquear envio se houver boleto sem respeitar 70/30 (defesa em profundidade caso UI seja contornada).

## Fora de escopo
- Sem alteração de banco (valores fixos no código).
- Sem alteração no fluxo de faturamento, contas a receber ou aprovações.
- Edição de vendas já criadas (legado) não é alterada retroativamente — a regra vale na criação/edição.

## Memória
Salvar `mem://business-rules/sales/boleto-70-30-21d` com a regra.
