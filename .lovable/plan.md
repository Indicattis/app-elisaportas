## Problema

Identifiquei duas causas:

1. **490 vendas têm `contrato_url = 'legado'`** (placeholder string, não URL real). A UI vê como "não-nulo" e mostra "Contrato anexado".
2. **521 vendas têm `contrato_url = NULL`** mas nenhuma foi marcada como `contrato_dispensado = true` — o backfill anterior não foi efetivamente aplicado.

Total: 1011 vendas anteriores à nova funcionalidade sem contrato real, todas exibindo status incorreto.

## Plano

Criar uma migration única que faz o backfill correto:

1. Limpar o placeholder `'legado'` → `contrato_url = NULL` para essas 490 vendas.
2. Marcar `contrato_dispensado = true` (com `contrato_dispensado_em = now()`) para todas as vendas onde `contrato_url IS NULL` e `contrato_dispensado` ainda é `false`.

Resultado esperado:
- 1011 vendas passarão a exibir o badge "Dispensado" em vez de "Contrato anexado" / "Aguardando".
- Vendas novas (criadas após a feature) continuam com fluxo normal: `Aguardando` → `Anexado` ou `Dispensado` manualmente.

Nenhuma alteração de código frontend é necessária — a lógica atual já trata `contrato_dispensado = true` como "Dispensado".

### SQL

```sql
UPDATE vendas SET contrato_url = NULL WHERE contrato_url = 'legado';

UPDATE vendas
SET contrato_dispensado = true,
    contrato_dispensado_em = now()
WHERE contrato_url IS NULL
  AND contrato_dispensado IS DISTINCT FROM true;
```
