## Problema identificado

Na tela `/producao/pintura`, a ordem **PINT-00213** está capturada pelo usuário Marcos Leite e as linhas existem normalmente no banco. O bloqueio mais provável está no hook específico de pintura (`useOrdemPintura.ts`): ele ainda usa `supabase.auth.getUser()` dentro das ações de **capturar** e **marcar linha**, enquanto o restante da produção já usa o contexto correto `useProducaoAuth()`.

Isso pode fazer a mutação falhar ou não atualizar corretamente quando o usuário está autenticado pelo fluxo de produção/CPF, mesmo que visualmente o `OrdemDetalhesSheet` reconheça Marcos como responsável.

## Plano de correção

1. **Padronizar o usuário nas mutações de pintura**
   - Alterar `useOrdemPintura.ts` para usar `user?.user_id` vindo de `useProducaoAuth()` ao marcar linhas.
   - Remover a dependência de `supabase.auth.getUser()` na mutação `marcarLinhaConcluida`.
   - Manter `concluida_por` preenchido com o `user_id` correto do colaborador de produção.

2. **Corrigir invalidação/cache da query de pintura**
   - A query principal usa a chave `['ordens-pintura', user?.user_id]`, mas algumas invalidações/cancelamentos usam apenas `['ordens-pintura']`.
   - Vou ajustar para invalidar/cancelar também a chave específica do usuário, evitando que o checkbox volte ao estado anterior ou pareça “não responder”.

3. **Melhorar erro visível ao usuário**
   - Se a marcação falhar, exibir a mensagem real retornada pelo Supabase/RLS em vez de apenas “Não foi possível atualizar a linha”.
   - Isso ajuda a diferenciar problema de sessão, permissão ou RLS caso ocorra novamente.

4. **Preservar as regras atuais**
   - Não vou liberar outro usuário para marcar a ordem.
   - Não vou remover a sequência de marcação linha por linha.
   - Marcos continuará sendo o único autorizado a marcar linhas enquanto a ordem estiver capturada por ele.

## Arquivos previstos

- `src/hooks/useOrdemPintura.ts`

## Resultado esperado

Ao entrar como Marcos Leite em `/producao/pintura`, abrir a ordem **PINT-00213** e marcar a primeira linha, o checkbox deve atualizar e persistir no banco. Em seguida, a próxima linha deve ficar liberada conforme a regra sequencial existente.