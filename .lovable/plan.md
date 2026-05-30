## Objetivo

Aplicar o mesmo ajuste das vendas em `/direcao/gestao-fabrica`: mover o badge **🔥 Quente / ❄️ Frio** dos cards de venda pendente para a sheet de detalhes que abre ao clicar.

## Mudanças

### 1. `src/components/pedidos/VendaPendentePedidoCard.tsx` (linhas 366-375)
Remover o bloco `{venda.venda_presencial != null && (...)}` que renderiza o badge Quente/Frio abaixo do nome do cliente. O último comentário permanece no mesmo lugar.

### 2. `src/components/pedidos/VendaPendenteDetalhesSheet.tsx` (Hero Section, ~linha 324)
Adicionar o badge Quente/Frio ao lado do `cliente_nome` no hero, usando `vendaCompleta?.venda_presencial` (já disponível no componente, ver linha 124). Mesmo estilo: laranja para Quente, ciano para Frio.

## Detalhes técnicos
- Sem alterações em queries/hooks/backend.
- Padrão visual idêntico ao já aplicado em `PedidoDetalhesSheet`.
