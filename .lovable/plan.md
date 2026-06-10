## Objetivo
Unificar os controles "Dispensar pendência de faturamento", "Forçar exibição (10 semanas)" e "Dispensar contrato" em **um único toggle por venda**: **"Dispensar do Sistema"**. Quando ativo, a venda some das abas Assinatura de Contrato e Pend. Faturamento. Além disso, **remover o corte global de 10 semanas** — todas as vendas aparecem até que sejam dispensadas manualmente.

## Banco de dados
- Nova coluna `vendas.dispensada_sistema boolean NOT NULL DEFAULT false` (única flag de verdade).
- Migração de dados: `UPDATE vendas SET dispensada_sistema = true WHERE pedido_dispensado = true OR contrato_dispensado = true;`
- Colunas antigas (`pedido_dispensado`, `contrato_dispensado`, `forcar_exibicao_pedidos`) ficam no banco por compatibilidade mas deixam de ser usadas pelos filtros — sem drop, para não quebrar histórico/relatórios.

## Hooks
`useVendasAssinaturaContrato.ts` e `useVendasPendenteFaturamento.ts`:
- Remover `.gte("data_venda", cutoff)` / `.or(... forcar_exibicao ...)`.
- Remover `.eq("contrato_dispensado", false)` / `.eq("pedido_dispensado", false)`.
- Adicionar `.eq("dispensada_sistema", false)`.
- Em `useVendasPendenteFaturamento`, remover o `.or("contrato_url.not.is.null,contrato_dispensado.eq.true")` (passa a ser somente `dispensada_sistema=false`) — a venda aparece em Pend. Faturamento mesmo sem contrato anexado, pois a dispensa agora é única.
- Incluir `dispensada_sistema` no select.

## UI — `FaturamentoVendasMinimalista.tsx`
No `DropdownMenu` de cada linha, substituir os três itens atuais (dispensar contrato, dispensar pendência, forçar exibição) por **um único item**:
- "Dispensar do Sistema" / "Reativar no Sistema" — toggle de `dispensada_sistema`.
- Mantém o item "Excluir venda completamente".

Atualizar:
- `Venda` interface: trocar as três flags por `dispensada_sistema?: boolean`.
- Select da página inclui `dispensada_sistema`.
- Remover o `AlertDialog` antigo de "Dispensar contrato" (`dispensarContratoOpen`) e estados relacionados — a dispensa agora é direta pelo menu, sem dialog (igual aos toggles que já fizemos).
- O badge/borda amber "aguardando contrato" pode ser mantido com base em `!contrato_url && !dispensada_sistema` apenas como indicador visual; sem ação dedicada.

## Arquivos
- nova migration (coluna + UPDATE).
- `src/hooks/useVendasAssinaturaContrato.ts`
- `src/hooks/useVendasPendenteFaturamento.ts`
- `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`
- atualizar memória (substituir entry sobre filtro de 10 semanas).
