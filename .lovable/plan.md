## Problema confirmado

A venda `OJO ANTONIO PRADO LTDA` (e outras 3 vendas) sumiram porque:

- Tem `pedido_dispensado = true` (alguém dispensou o pedido de produção — venda só de instalação/serviço/acessório)
- Mas **não tem contrato anexado**, **não foi dispensado o contrato**, e **não está faturada**
- Os hooks `useVendasAssinaturaContrato` e `useVendasPendenteFaturamento` filtram `pedido_dispensado = false`, então excluem essas vendas
- Resultado: a venda fica invisível em qualquer aba do fluxo

Além disso identifiquei outros 2 problemas no fluxo de contrato:

1. **Cache não invalida** após anexar/dispensar contrato — a página só atualiza no refetch automático de 30s
2. **Filtro de ano** (`data_venda >= 2026-01-01`) esconde vendas antigas que ainda estão pendentes

## Correções propostas

### 1. Remover o filtro `pedido_dispensado = false` dos hooks de contrato/faturamento

Em `useVendasAssinaturaContrato.ts` e `useVendasPendenteFaturamento.ts`, remover `.eq("pedido_dispensado", false)`. Vendas com pedido dispensado ainda precisam passar por contrato e faturamento — dispensar o pedido só significa "não vai pra fábrica", não "pula contrato/faturamento".

### 2. Invalidar caches após anexar/dispensar contrato

No `AnexarContratoModal` e no botão "Dispensar Contrato" em `/administrativo/financeiro/faturamento/vendas`, adicionar:

```ts
queryClient.invalidateQueries({ queryKey: ['vendas-assinatura-contrato'] });
queryClient.invalidateQueries({ queryKey: ['vendas-pendente-faturamento'] });
```

### 3. Remover filtro de ano dos hooks de etapa pendente

Tirar `.gte("data_venda", startOfYear)` de `useVendasAssinaturaContrato` e `useVendasPendenteFaturamento`. Vendas pendentes precisam aparecer independente do ano — o filtro só faz sentido em listagens históricas, não em filas de trabalho.

## Arquivos a editar

- `src/hooks/useVendasAssinaturaContrato.ts` — remover 2 filtros
- `src/hooks/useVendasPendenteFaturamento.ts` — remover 2 filtros
- `src/components/.../AnexarContratoModal.tsx` (vou localizar) — invalidar queries
- Botão "Dispensar Contrato" em `/administrativo/financeiro/faturamento/vendas` — invalidar queries

Sem mudanças no banco.