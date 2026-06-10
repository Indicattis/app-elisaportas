## Objetivo
Adicionar um menu "três pontinhos" em cada linha da tela `/financeiro/faturamento/vendas` (`FaturamentoVendasMinimalista.tsx`) que permita controlar como cada venda aparece nas abas da Gestão de Pedidos (`/direcao/gestao-fabrica`): Assinatura de Contrato e Pendente Faturamento. Também permitir excluir a venda inteira via RPC de exclusão em cascata já existente.

## Mudanças no banco
Nova coluna em `vendas`:
- `forcar_exibicao_pedidos boolean NOT NULL DEFAULT false` — quando true, a venda ignora o corte das 10 semanas (filtro `data_venda >= cutoff`) nas duas abas.

As colunas `contrato_dispensado` e `pedido_dispensado` já existem; serão reutilizadas.

## Hooks (filtros)
Em `useVendasAssinaturaContrato.ts` e `useVendasPendenteFaturamento.ts`:
- Substituir `.gte("data_venda", cutoff)` por `.or(\`data_venda.gte.${cutoff},forcar_exibicao_pedidos.eq.true\`)` para que vendas marcadas com "forçar exibição" continuem aparecendo mesmo passadas 10 semanas.
- Incluir `forcar_exibicao_pedidos` no select.

## UI — `FaturamentoVendasMinimalista.tsx`
Em cada linha da tabela (e card mobile), adicionar `DropdownMenu` com ícone `MoreVertical`:
1. **Dispensar assinatura de contrato** / **Reativar assinatura** — toggle de `contrato_dispensado`.
2. **Dispensar pendência de faturamento** / **Reativar pendência** — toggle de `pedido_dispensado`.
3. **Forçar exibição (ignorar corte 10 semanas)** / **Desativar forçar exibição** — toggle de `forcar_exibicao_pedidos`. Só relevante quando a venda for mais antiga que 10 semanas; mostrar sempre para deixar reversível.
4. Separador.
5. **Excluir venda completamente** — `AlertDialog` de confirmação. Chama a RPC já existente de exclusão em cascata (mesma usada em "Cascade deletion" da memória). Após sucesso, invalida queries `vendas`, `vendas-assinatura-contrato`, `vendas-pendente-faturamento`.

Cada ação:
- Atualiza via `supabase.from('vendas').update({...}).eq('id', venda.id)`.
- Toast de sucesso/erro.
- Invalida queries: `['vendas']`, `['vendas-assinatura-contrato']`, `['vendas-pendente-faturamento']`, `['vendas-pendente-pedido']`.
- Atualiza estado local `vendas` para feedback imediato.

Indicador visual nas linhas: badges discretos (ex.: "Contrato dispensado", "Pedido dispensado", "Forçada") quando flags ativas, para o operador enxergar o estado atual.

## Caso da venda `3e4a357d-0c2f-4435-a4a8-8e0b0df9787e`
Não criar tela de diagnóstico — apenas os controles. O operador usará o menu para dispensar/forçar conforme necessário.

## Arquivos afetados
- nova migration: adicionar coluna `forcar_exibicao_pedidos`.
- `src/hooks/useVendasAssinaturaContrato.ts`
- `src/hooks/useVendasPendenteFaturamento.ts`
- `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`
- Memória: atualizar entry sobre filtro de 10 semanas para mencionar o override.
