# Relatório de Pesquisas de Pós-Vendas

## O que muda
- No hub /pos-vendas, novo botão **"Relatório"** (abaixo de "Pedidos em Pós-Vendas").
- Nova página /pos-vendas/relatorio com breadcrumb Home > Pós-Vendas > Relatório e botão voltar para o hub.

## Conteúdo da página
1. **Filtros**: período (data da resposta), busca por cliente/nº do pedido.
2. **Cartões de resumo**: total de pesquisas, média de nota Atendimento, Produto e Instalação, % que recomendaria, % que avaliou no Google, % que quis comprar itens avulsos.
3. **Gráficos**:
   - Distribuição das notas (1 a 5) por categoria (barras).
   - Evolução mensal da média geral (linha).
4. **Lista de pesquisas**: data, pedido, cliente, 3 notas (estrelas/cores), recomendaria, Google, comentário resumido; clique abre a resposta completa existente (/pos-vendas/pedidos/:id/resposta).
5. Seção **Comentários recentes** com os textos deixados pelos clientes.

Visual no padrão glass escuro azul/branco do sistema.

## Detalhes técnicos
- Dados de `pesquisas_satisfacao` com join em `pedidos_producao` (número, cliente). Sem alterações no banco.
- Gráficos com recharts (já usado no projeto).
- Rota protegida com `routeKey="pos_vendas_relatorio"`; cadastrar a rota em `app_routes` para aparecer nas permissões (inserção de dado).
