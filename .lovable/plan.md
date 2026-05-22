# Montagem de kits em /direcao/estrategia/kits

## Objetivo
Permitir associar a cada kit (linha da Tabela de Preços de Portas) uma "montagem" — uma lista de itens cadastrados em `/direcao/estrategia/itens` com quantidade. Quando o kit tem montagem, o **Lucro** do kit passa a ser calculado como a soma de `quantidade × lucro_unitário` dos itens da montagem. Quando não tem montagem, o lucro continua editável manualmente como hoje, e o kit fica sinalizado como "Sem montagem".

## Comportamento

- Nova coluna **Montagem** na tabela de kits, antes de "Ações":
  - Kit sem montagem → badge âmbar "Sem montagem" + botão "Configurar".
  - Kit com montagem → badge "N itens" + botão "Editar".
- Coluna **Lucro** existente:
  - Kit sem montagem: edição manual inline (comportamento atual preservado).
  - Kit com montagem: valor calculado (`Σ qtd × lucro_unit`), exibido como somente leitura com tooltip "Calculado pela montagem". Clique para editar é desabilitado.
- Card de Pesquisa Rápida: o valor "Lucro" mostrado também usa o lucro calculado quando houver montagem.

## Modal "Montagem do kit"
Aberto pelo botão da coluna Montagem. Conteúdo:
- Cabeçalho com a descrição/medidas do kit.
- Campo de busca para localizar itens em `custos_itens` por descrição/categoria.
- Lista da montagem atual: descrição do item, categoria, lucro unitário (calculado), input de quantidade (decimal), subtotal de lucro da linha, botão remover.
- Botão "Adicionar item" via combobox de busca (insere com quantidade 1).
- Rodapé com totais: Custo total, Preço de venda total, **Lucro total** (este é o que vai para a coluna Lucro do kit).
- Alterações são persistidas imediatamente (sem botão Salvar global), com toasts de sucesso/erro.

## Cálculo do lucro unitário do item
Replicar a fórmula já usada em `EstrategiaItens.tsx` (linhas 467-477):

```text
lucro_unit = preco_venda − preco_venda × ((taxa_impostos + taxa_descontos + taxa_cartao) / 100) − custo_unitario
```

Usando as taxas-padrão de `custos_itens_padroes` (hook `useCustosItensPadroes`). Resultado pode ser negativo (exibido normalmente).

## Modelo de dados (migration)

Nova tabela `public.tabela_precos_portas_montagem`:
- `id uuid pk default gen_random_uuid()`
- `kit_id uuid not null references tabela_precos_portas(id) on delete cascade`
- `custo_item_id uuid not null references custos_itens(id) on delete cascade`
- `quantidade numeric(12,3) not null default 1`
- `created_at`, `updated_at` (timestamps padrão + trigger `update_updated_at_column`)
- `unique (kit_id, custo_item_id)` para evitar duplicidade
- Índices em `kit_id` e `custo_item_id`
- RLS habilitada; políticas seguindo o padrão das tabelas vizinhas (`tabela_precos_portas`, `custos_itens`) — leitura/escrita para usuários autenticados (ajustar conforme as policies já existentes nessas tabelas).

Nenhuma coluna nova em `tabela_precos_portas`: a presença de montagem é derivada de `count(*) > 0` em `tabela_precos_portas_montagem`.

## Implementação técnica
- **Hook novo** `src/hooks/useKitMontagem.ts`:
  - `useKitsMontagemResumo()` → mapa `{ kit_id → { count, lucroTotal } }` para alimentar a coluna Lucro/Montagem da listagem em uma única query (`select kit_id, quantidade, custos_itens(custo_unitario, preco_venda, taxa_impostos, taxa_descontos, taxa_cartao)` joinada).
  - `useKitMontagem(kitId)` → CRUD da montagem de um kit específico (`list`, `add`, `updateQuantidade`, `remove`), reaproveitando padrões de `useCustosItens` (React Query + toasts).
- **`TabelaPrecos.tsx`**:
  - Adiciona a coluna Montagem (renderizada apenas quando `!hideAcoesColumn`, mesma condição de "edição").
  - Consome `useKitsMontagemResumo` para decidir, por linha, se `lucro` é calculado ou manual.
  - Bloqueia `handleStartEditLucro` quando o kit tem montagem; exibe o valor calculado com `cursor-not-allowed` e tooltip.
  - Importa novo componente `KitMontagemDialog`.
- **Componente novo** `src/components/tabela-precos/KitMontagemDialog.tsx`:
  - Recebe `kit: ItemTabelaPreco` e `open/onOpenChange`.
  - Usa `useCustosItens` (lista para o combobox de busca) + `useCustosItensPadroes` (taxas) + `useKitMontagem(kit.id)`.
  - Renderiza tabela editável da montagem, combobox `Command`/`Popover` para adicionar itens, e rodapé com totais.
  - Estilo glassmorphism: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`, paleta azul/branco (memory: glassmorphism unification).

## Fora de escopo
- Aplicar o lucro calculado em relatórios/PDFs existentes de tabela de preços (não solicitado).
- Compartilhar a mesma montagem entre kits (cada kit tem a sua própria lista).
- Reordenar itens dentro da montagem.
- Edição/criação de itens de `custos_itens` a partir do modal (apenas leitura para seleção).
