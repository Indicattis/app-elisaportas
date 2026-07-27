# Alerta visual: vendas sem folha de medição

## Objetivo
Sinalizar, na interface, toda venda que contenha `porta_enrolar` mas **não tenha folha de medição** (visita técnica concluída) registrada no sistema.

## Como identificar "sem folha de medição"
Como não existe FK direta entre `vendas` e visitas, usar heurística de correspondência por dados do cliente:

Uma venda é considerada **com folha de medição** se existir pelo menos um dos dois:
1. `visitas_tecnicas_agendadas` com `status = 'concluida'` **E** (`titulo` ILIKE cliente_nome OU `telefone_contato` = cliente_telefone) — e opcionalmente `duracao_medicao_segundos IS NOT NULL`.
2. `visitas_tecnicas` → `visitas_tecnicas_conclusoes` cujo `lead` (via `elisaportas_leads`) bata em `nome` ILIKE cliente_nome OU `telefone` = cliente_telefone.

Caso contrário → **sem folha de medição**.

Regra é aplicada só quando a venda tem ao menos um item `tipo_produto = 'porta_enrolar'` (acessórios/pintura/instalação sozinhos não exigem medição).

## Implementação

### 1. Hook `useVendaTemMedicao(vendaId)` (novo)
`src/hooks/useVendaTemMedicao.ts`
- Recebe `vendaId`.
- Busca `cliente_nome`, `cliente_telefone` e checa se há produtos `porta_enrolar`.
- Se não há portas → retorna `{ exigeMedicao: false, temMedicao: true }` (não alerta).
- Se há portas → roda as 2 queries acima em paralelo e retorna `{ exigeMedicao: true, temMedicao: boolean, visitaId?: string }`.
- `useQuery` com `staleTime` de 60s.

### 2. Componente `SemMedicaoBadge` (novo)
`src/components/vendas/SemMedicaoBadge.tsx`
- Badge âmbar/vermelho glassmorphism: ícone `Ruler` + texto **"Sem folha de medição"**.
- `Tooltip` explicando: "Nenhuma visita técnica concluída foi encontrada para este cliente. As medidas foram digitadas manualmente no cadastro da venda."
- Variante compacta (só ícone) para tabelas densas.

### 3. Locais onde exibir o badge
- **`/direcao/vendas/todas`** (`VendasDirecao.tsx`) — coluna cliente, ao lado do nome (variante compacta).
- **`/direcao/gestao-fabrica`** (aba Pend. Faturamento) — no card da venda.
- **Sheet de detalhes da venda** (`VendaPendenteDetalhesSheet.tsx` e `PedidoDetalhesSheet.tsx`) — no cabeçalho, versão completa com tooltip.
- **`/vendas/minhas-vendas`** — na lista de vendas do vendedor.

Nenhuma alteração em fluxo de negócio: apenas visual. Vendas continuam salvando/faturando normalmente.

## Fora do escopo
- Bloqueio de cadastro sem medição.
- FK direta entre venda e visita técnica (pode virar melhoria futura, mas exige repensar cadastro).
- Backfill/vinculação retroativa das 4 vendas relatadas.

## Detalhes técnicos
- Normalizar telefone (só dígitos) antes de comparar.
- `cliente_nome` comparado via ILIKE com trim, tolerando variações de acento/case.
- Query única com `Promise.all` para evitar cascata.
- Badge não deve piscar durante loading: retornar `null` enquanto `isLoading`.
