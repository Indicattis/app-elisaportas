## Adicionar botão "Resetar Carregamento" em Gestão Fábrica

Quando um pedido nas etapas **Aguardando Coleta**, **Instalações** ou **Correções** já tem ordem agendada (data marcada no calendário), permitir que a Direção limpe esse agendamento. O pedido volta a aparecer como "sem data" e precisa ser agendado novamente.

### Onde aparece

- Página `/direcao/gestao-fabrica` (e equivalente mobile).
- Botão (ícone) no card do pedido, ao lado dos botões "Agendar/Reagendar" e "Carregar Ordem".
- Visível apenas quando:
  - etapa do pedido ∈ `aguardando_coleta`, `instalacoes`, `correcoes`
  - existe `data_carregamento` agendada
  - carregamento ainda não foi concluído
- Ao clicar, abre um diálogo de confirmação ("Resetar agendamento? O pedido voltará a precisar ser agendado.") e, ao confirmar, limpa o agendamento.

### Comportamento

A ordem do pedido vem de uma de três fontes (`ordens_carregamento`, `instalacoes`, `correcoes`). Em todas elas o reset zera:

- `data_carregamento = null`
- `hora = null` (e `hora_carregamento = null` quando existir)
- `responsavel_carregamento_id = null`
- `responsavel_carregamento_nome = null`
- `tipo_carregamento = null` (em `ordens_carregamento`)
- `status = 'pendente'` (volta para o estado de não agendada)
- `carregamento_concluido = false` (defensivo)

A etapa atual do pedido **não muda** — ele continua em Aguardando Coleta / Instalações / Correções, mas sem agenda. Após salvar, invalidar as queries de `ordens_carregamento_unificadas`, `pedidos-etapas`, `pedidos-contadores` e `ordens_carregamento_calendario` para refletir nas listas e no calendário de expedição.

### Detalhes técnicos

Arquivos a editar:

- `src/pages/direcao/GestaoFabricaDirecao.tsx`
  - Novo `handleResetarCarregamento(pedidoId)` que localiza a ordem em `ordensUnificadas` pelo `pedido_id` (não concluída) e faz o `update` na tabela correspondente conforme `ordem.fonte`.
  - Passa `onResetarCarregamento` no `PedidosDraggableList` somente quando `etapa ∈ ['aguardando_coleta','instalacoes','correcoes']`.
- `src/components/direcao/GestaoFabricaMobile.tsx`
  - Mesma propagação para a versão mobile (se renderizar `PedidosDraggableList`/`PedidoCard`).
- `src/components/pedidos/PedidosDraggableList.tsx`
  - Adicionar prop `onResetarCarregamento?: (pedidoId: string) => Promise<void>` e repassar a todas as instâncias de `PedidoCard`.
- `src/components/pedidos/PedidoCard.tsx`
  - Nova prop `onResetarCarregamento`.
  - Novo `middleButton` (ícone `RotateCcw`/`CalendarX`, tom âmbar) com tooltip "Resetar Carregamento", visível apenas quando `isEtapaCarregamento && temDataCarregamento && !carregamentoConcluido && onResetarCarregamento`.
  - Diálogo de confirmação (mesmo padrão do "Carregar Ordem") com botões Cancelar / Sim, Resetar.

Sem migração de banco — apenas `update` nas tabelas existentes via cliente Supabase, respeitando as RLS atuais (já permitem update para Direção/Admin nessas três tabelas).
