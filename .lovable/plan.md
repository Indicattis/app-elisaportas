## Diagnóstico

O pedido **#0437** (`5f6f48df-0012-4226-b664-25791ced73d0`) está na etapa **embalagem** desde 24/07 12:14:34, mas suas ordens já foram concluídas:

- Duas linhas em `ordens_embalagem` para o mesmo pedido, ambas com `status = concluido` e `historico = true`:
  - `084e918b…` — criada 17/07, concluída antes de a etapa embalagem começar
  - `e44d2c79…` — criada 24/07 12:14:35, concluída 24/07 12:15:10
- `pedidos_etapas.embalagem` está aberta (sem `data_saida`)
- Próxima etapa esperada segundo `ORDEM_ETAPAS`: **`aguardando_coleta`**

### Causa raiz

Em `src/hooks/usePedidoAutoAvanco.ts`, `verificarOrdemEmbalagemConcluida` faz:

```ts
.from('ordens_embalagem')
.select('id, status')
.eq('pedido_id', pedidoId)
.eq('historico', false)
.maybeSingle();
```

Ao concluir a ordem, o fluxo de `finalizarEmbalagem` marca a ordem como `historico = true` **antes** (ou junto) do callback de auto-avanço. Quando `verificarOrdemEmbalagemConcluida` roda, o filtro `historico = false` **não encontra nenhuma linha** e a função retorna `true` (linha 170). Isso deveria disparar `executarAvanco`, mas se qualquer erro silencioso ocorrer em `moverParaProximaEtapa` (ou se o usuário sair da tela antes do callback completar) o pedido fica preso — não há reprocessamento automático posterior. Foi o que aconteceu aqui: nenhum registro de `data_saida` foi gravado na etapa embalagem.

Além disso, o filtro por `historico = false` é frágil por natureza: se houver múltiplas ordens ativas de embalagem, o `maybeSingle()` estoura e a função cai no `catch` retornando `false`, bloqueando o avanço.

## Correções propostas

### 1. Destravar o pedido #0437 (dado)
Migration única que:
- Insere/atualiza `pedidos_etapas` fechando `embalagem` (`data_saida = now()`) e abrindo `aguardando_coleta` via UPSERT (padrão já usado no projeto).
- Atualiza `pedidos_producao.etapa_atual = 'aguardando_coleta'` para o pedido.

### 2. Corrigir a lógica de verificação em `usePedidoAutoAvanco.ts`
Substituir `verificarOrdemEmbalagemConcluida` (e alinhar `verificarOrdemPinturaConcluida` / `verificarOrdemQualidadeConcluida`, que têm o mesmo padrão) para não depender de `historico = false`:

- Buscar **todas** as `ordens_embalagem` do pedido sem filtro de histórico.
- Considerar a etapa concluída quando **existe pelo menos uma ordem** e **todas** estão com `status = 'concluido'` (ou não há linhas pendentes).
- Se não houver nenhuma ordem, manter o comportamento atual (retornar `true`, para não bloquear pedidos sem ordem de embalagem).

Isso torna o auto-avanço idempotente e imune ao momento em que o flag `historico` é gravado.

### 3. Rede de segurança: verificação manual já existente
A função `verificarEAvancarManual` já cobre `etapa_atual = 'embalagem'`. Confirmar que o botão "Avançar Pedido" na tela de gestão de pedidos chama esse hook para permitir destravar casos futuros sem migration. Nenhuma UI nova — só validação.

## Detalhes técnicos

- Arquivos:
  - `src/hooks/usePedidoAutoAvanco.ts` — ajustar as três funções de verificação.
  - Nova migration em `supabase/migrations/` para destravar o pedido #0437.
- Sem mudanças de schema, sem mudanças de UI.
- Preservar a assinatura pública do hook.
