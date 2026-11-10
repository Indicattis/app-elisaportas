# Reagendar ordens já carregadas na Expedição

Hoje, ao arrastar uma ordem já carregada para outro dia no calendário de /logistica/expedicao, aparece o aviso "Este pedido já foi carregado e não pode ser reagendado". Vamos liberar isso.

## O que muda para o usuário
- Ordens carregadas podem ser arrastadas para outro dia nos calendários semanal e mensal.
- Só a **data** muda: a ordem continua marcada como carregada, o pedido não volta de etapa e o registro de "Concluído em" é mantido.
- Mensagem de confirmação: "Data de carregamento atualizada".

## Detalhes técnicos
- `CalendarioSemanalExpedicaoDesktop.tsx` e `CalendarioMensalExpedicaoDesktop.tsx`: remover o bloqueio `if (ordem.carregamento_concluido)`.
- Para ordens carregadas, enviar só `data_carregamento` no update (sem redefinir `status` para `agendada`/`pronta_fabrica`), preservando `carregamento_concluido` e status atual.
- Conferir o calendário mobile e `DraggableOrdemCarregamento` para garantir que o arraste não está desativado para ordens carregadas.
- Atualizar a memória "Rescheduling restrictions" para refletir a nova regra.
