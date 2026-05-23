## Objetivo

Fazer a seção "Folha Salarial" em `/direcao/estrategia/despesas` (modo configuração, sem mês selecionado) listar exatamente os mesmos colaboradores e valores exibidos em `/direcao/gestao-colaboradores`.

## Diferença atual

`DespesasResumoTopo.tsx` hoje busca:
- `admin_users` filtrando `ativo = true` e `em_folha = true`
- usa o campo `salario` como valor

`GestaoColaboradoresDirecao` (via `useAllUsers`) busca:
- `admin_users` com `ativo = true`, `tipo_usuario in ('colaborador','metamorfo')`, `visivel_organograma = true`
- usa o campo `custo_colaborador` como valor

Por isso as duas telas mostram colaboradores e totais distintos.

## Mudança

Em `src/components/direcao/estrategia/DespesasResumoTopo.tsx`, no ramo "configuração padrão" (sem mês selecionado):

1. Substituir a query de `admin_users` pela mesma usada em `useAllUsers`:
   - `select id, nome, custo_colaborador`
   - `.eq('ativo', true)`
   - `.in('tipo_usuario', ['colaborador','metamorfo'])`
   - `.eq('visivel_organograma', true)`
   - `.order('nome')`
2. Mapear `valor = Number(custo_colaborador) || 0` (em vez de `salario`).
3. Manter o restante do componente intacto (despesas fixas, variáveis, layout em 3 linhas, colunas mensal/anual, comportamento ao selecionar mês via `custos_folha_mensais`).

Resultado: a seção "Folha Salarial" passa a refletir exatamente a mesma lista e os mesmos valores totais exibidos em `/direcao/gestao-colaboradores`.
