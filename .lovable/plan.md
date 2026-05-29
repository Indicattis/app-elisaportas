## Objetivo
1. Em `/direcao/estrategia/itens`, adicionar toggle "Vendável avulso" na coluna **Ações** (padrão: desativado).
2. Em `/direcao/estrategia/precos`, ao lado da tabela principal, mostrar uma seção lateral com todos os itens marcados como vendáveis avulso.

## Passos

### 1. Banco — `custos_itens`
Migration adicionando a flag:
```sql
ALTER TABLE public.custos_itens
  ADD COLUMN vendavel_avulso boolean NOT NULL DEFAULT false;
```

### 2. Hook `src/hooks/useCustosItens.ts`
- Adicionar `vendavel_avulso: boolean` ao tipo `CustoItem`.
- Adicionar `vendavel_avulso?: boolean` em `NewCustoItem` e mapear no `createItem` (default `false`).
- `updateItem` já aceita `Partial<CustoItem>`, então o toggle funciona sem mudança.

### 3. Página `src/pages/direcao/estrategia/EstrategiaItens.tsx`
Dentro de `SortableItemRow` (na célula "Ações", próximo ao botão Trash em ~linha 742):
- Renderizar um `Switch` (shadcn/ui) compacto, com tooltip "Vendável avulso".
- `checked={item.vendavel_avulso}` e `onCheckedChange={(v) => onUpdate({ vendavel_avulso: v })}`.
- Estilo discreto, alinhado aos demais botões da célula.

### 4. Página `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`
Transformar o conteúdo em layout 2 colunas (`grid lg:grid-cols-[1fr_360px] gap-4`):
- **Coluna principal**: `<TabelaPrecos embedded />` (inalterado).
- **Coluna lateral (nova)**: card glassmorphism (`bg-white/5 backdrop-blur-xl border-white/10`) com:
  - Título "Itens Avulso" + contador.
  - Lista (scroll vertical) dos itens de `custos_itens` onde `vendavel_avulso = true`, ordenados por categoria e descrição.
  - Cada linha: descrição, unidade (badge pequeno) e `preco_venda` formatado em BRL alinhado à direita.
  - Estado vazio: "Nenhum item marcado como avulso. Ative em Estratégia → Itens".
- Reutilizar o hook existente `useCustosItens` (filtrar no client).

## Notas técnicas
- Sem mudança nas APIs de venda — esta fase é apenas marcação + visualização.
- Layout lateral colapsa para coluna única em telas pequenas (`lg` breakpoint).
- Sem novas dependências.

## Fora de escopo
- Inclusão desses itens em fluxos de venda/orçamento.
- Edição inline do preço_venda na seção lateral (continua em `/direcao/estrategia/itens`).
