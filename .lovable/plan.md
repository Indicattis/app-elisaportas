## Status tricolor com toggle Alana/Luan

### Estados
- 🔴 **pendente** — linha ainda é só sugestão (não existe registro em `despesas_manuais_folha` / `despesas_manuais_lancamentos` no mês)
- 🟡 **Alana** — confirmado, padrão ao salvar pela primeira vez
- 🟢 **Luan** — alternado manualmente pela bolinha

### Schema
Adicionar coluna `confirmado_por text` (valores: `'alana' | 'luan'`, default `'alana'`) em:
- `despesas_manuais_folha`
- `despesas_manuais_lancamentos`

### UI nos 3 blocos (`DespesasResumoTopo.tsx`)

**Folha** — coluna Status já existe; trocar a lógica:
- sem `r` → bolinha vermelha (pendente)
- com `r` → bolinha amarela se `confirmado_por='alana'`, verde se `'luan'`. Clicar alterna entre os dois com `UPDATE` no Supabase + `reload()`.

**Fixas e Variáveis** — adicionar nova coluna `Status` (header novo, ajustar `colSpan` do "Carregando..."):
- linhas de `rows`: bolinha amarela/verde igual à folha, com toggle
- linhas de `sugestoes`: bolinha vermelha (pendente)
- linha de adicionar: vazio

### Persistência do toggle
Função helper `toggleConfirmadoPor(tabela, id, atual)` faz `UPDATE ... SET confirmado_por = (atual === 'luan' ? 'alana' : 'luan')` e dispara `reload()`. Inserts continuam usando o default `'alana'` do DB — sem mudança nos handlers de `onInsert`.

### Migration
```sql
ALTER TABLE public.despesas_manuais_folha
  ADD COLUMN confirmado_por text NOT NULL DEFAULT 'alana'
  CHECK (confirmado_por IN ('alana','luan'));

ALTER TABLE public.despesas_manuais_lancamentos
  ADD COLUMN confirmado_por text NOT NULL DEFAULT 'alana'
  CHECK (confirmado_por IN ('alana','luan'));
```

Registros existentes ficam com `'alana'` (amarelo). RLS/grants já existentes cobrem a nova coluna.
