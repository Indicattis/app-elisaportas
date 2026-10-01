# Página "Mapa" em Vendas

## O que muda
- Novo botão **Mapa** no menu de /vendas, abrindo /vendas/mapa (mesma permissão do hub de Vendas).
- Mapa do Brasil (mesmo estilo de mapa já usado em Autorizados) com um marcador para cada pedido finalizado, agrupando marcadores próximos.
- Ao clicar no marcador: número do pedido, cliente, cidade/estado, vendedor, valor da venda e data de finalização.
- Painel lateral com total de pedidos no mapa, filtro por estado e por vendedor, e aviso de quantos pedidos não puderam ser localizados.

## Como a localização é obtida
Os pedidos não guardam coordenadas, só cidade e estado da venda. A posição será pela **cidade** do cliente (não o endereço exato). Cada cidade é localizada uma única vez e guardada para reaproveitar, então o mapa abre rápido nas próximas vezes.

## Detalhes técnicos
- Migração: tabela `geocode_cidades` (cidade_normalizada, estado, latitude, longitude, updated_at; único por cidade+estado), GRANT select/insert/update a authenticated + service_role, RLS para authenticated.
- Hook `useMapaPedidosFinalizados`: pedidos_producao com etapa_atual='finalizado' + venda (cliente, cidade, estado, valor, atendente, data). Junta com `geocode_cidades`; cidades sem cache são geocodificadas em sequência pela função `geocode-nominatim` existente (1 req/s) e salvas.
- Página `src/pages/vendas/MapaPedidosVendas.tsx` com react-leaflet + react-leaflet-cluster (já instalados), estilo glass escuro do projeto.
- Rota em App.tsx dentro do ProtectedRoute `vendas_hub`; item no `VendasHub.tsx` (ícone Map).
