## Dinâmica da coluna "Preço Objetivo"

Cada linha terá um estado: **OK** (check verde) ou **precisa ajuste** (input manual de valor).

### Banco
Migration adiciona coluna `custo_ok boolean not null default false` em `custos_itens`.

### Hook `useCustosItens.ts`
- Adicionar `custo_ok: boolean` em `CustoItem` e em `UpsertCustoItemPayload`.
- Incluir no upsert.

### UI `EstrategiaItens.tsx` — célula "Preço Objetivo"
Comportamento:
- Se `custo_ok === true`: mostrar **check verde** centralizado (ícone `Check` em verde) + botão pequeno "desfazer" no hover para voltar ao modo input.
- Se `custo_ok === false`: mostrar o `CurrencyInput` atual com `preco_objetivo` + botão pequeno de check (cinza) ao lado para marcar como OK.
- Marcar como OK: seta `custo_ok = true` e limpa `preco_objetivo = null`.
- Desmarcar OK: seta `custo_ok = false`, mantém input vazio para o usuário digitar.

Header da coluna permanece "Preço Objetivo".

### Arquivos
- `supabase/migrations/<novo>.sql` — add column
- `src/hooks/useCustosItens.ts` — tipo + upsert
- `src/integrations/supabase/types.ts` — regenerado pela migration
- `src/pages/direcao/estrategia/EstrategiaItens.tsx` — célula com toggle check/input
