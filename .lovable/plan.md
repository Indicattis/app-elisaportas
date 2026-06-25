## Problema

O botão "Regenerar linhas da ordem" falha com erro de constraint:
```
update or delete on table "linhas_ordens" violates foreign key constraint
"pontuacao_colaboradores_linha_id_fkey" on table "pontuacao_colaboradores"
```

A função `regenerar_linhas_ordem` tenta apagar todas as linhas da ordem, mas algumas já têm pontuação registrada em `pontuacao_colaboradores` (FK `linha_id` NOT NULL).

## Solução

Atualizar a função RPC `regenerar_linhas_ordem` para, antes do `DELETE FROM linhas_ordens`, executar:

```sql
DELETE FROM pontuacao_colaboradores
WHERE ordem_id = p_ordem_id AND tipo_ordem = p_tipo_ordem;
```

Isso remove os registros de pontuação atrelados às linhas que serão regeneradas. Quando as linhas forem concluídas novamente, a pontuação será recalculada normalmente pelo fluxo existente.

### Implementação (migration)

Recriar `public.regenerar_linhas_ordem(p_ordem_id uuid, p_tipo_ordem text)` mantendo toda a lógica atual e apenas inserindo a limpeza de `pontuacao_colaboradores` imediatamente antes do `DELETE FROM linhas_ordens`.

Nenhuma alteração no frontend é necessária — o botão já chama essa RPC.

### Aviso ao usuário

Pontos já contabilizados de linhas regeneradas serão removidos e re-creditados quando as linhas forem concluídas de novo. Isso pode causar variação temporária no ranking/metas se a regeneração for feita em ordens já parcialmente concluídas.