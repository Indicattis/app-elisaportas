## Objetivo

Adicionar ação "Dispensar contrato" no menu de cada venda em `/financeiro/faturamento/vendas`, separada de "Dispensar do sistema". A venda dispensada de contrato deve:
- Sair da aba **Assinatura de Contrato** em `/direcao/gestao-fabrica`
- Aparecer na aba **Pendente Faturamento** em `/direcao/gestao-fabrica`
- Ficar habilitada para faturamento (sem exigir upload de contrato)

## Mudanças

### 1. `src/hooks/useVendasAssinaturaContrato.ts`
- Adicionar `contrato_dispensado` ao select
- Adicionar filtro no servidor: `.eq("contrato_dispensado", false)` (assim vendas com contrato dispensado somem desta aba)

### 2. `src/hooks/useVendasPendenteFaturamento.ts`
- Nenhuma mudança de filtro necessária — a venda já passa a aparecer aqui automaticamente, pois esta aba só exclui `dispensada_sistema=true` e vendas já faturadas/com pedido. Com `contrato_dispensado=true` e sem pedido, ela entra naturalmente.

### 3. `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`
- No `DropdownMenu` de ações por venda, adicionar novo item **acima** do "Dispensar do sistema":
  - Label: "Dispensar contrato" / "Reverter dispensa de contrato" (toggle)
  - Ícone: `FileX` / `FileCheck` (lucide)
  - Ação: `UPDATE vendas SET contrato_dispensado=<bool>, contrato_dispensado_em=now()|null, contrato_dispensado_por=user|null` (reaproveitar o padrão já existente nas linhas 1596–1604)
  - Desabilitado se a venda já tiver `contrato_url` (contrato anexado)
- Manter a ação "Dispensar do sistema" e "Excluir venda" como estão.

## Comportamento resultante

| Estado da venda | Aparece em Assinatura | Aparece em Pend. Faturamento |
|---|---|---|
| Sem contrato + sem dispensa | Sim | Não (bloqueada pelo gate de contrato no faturamento) |
| Contrato anexado | Não | Sim |
| **Contrato dispensado** | **Não** | **Sim** |
| Dispensada do sistema | Não | Não |

## Arquivos alterados

- `src/hooks/useVendasAssinaturaContrato.ts`
- `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`
