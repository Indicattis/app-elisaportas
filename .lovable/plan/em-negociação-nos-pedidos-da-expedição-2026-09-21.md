# Em negociação nos pedidos da expedição

## Objetivo
Permitir que pedidos nas três etapas amarelas — **Expedição Coleta**, **Instalações** e **Correções** — sejam marcados como **Em negociação** diretamente pela célula da coluna **Carregamento**.

## Alterações
- Tornar a célula **Carregamento** clicável somente nessas três etapas e enquanto o carregamento ainda não estiver concluído.
- Ao clicar, iniciar a negociação e trocar o conteúdo da célula para **Em negociação**, com indicação visual amarela.
- Exibir na coluna **Tempo** um novo cronômetro amarelo contando há quanto tempo o pedido está em negociação.
- Encerrar automaticamente a negociação quando o pedido for agendado ou reagendado no calendário.
- Acumular o tempo entre diferentes períodos de negociação do mesmo pedido; uma nova negociação continua a contagem anterior.
- Manter os cronômetros atuais da etapa e do tempo total sem alteração.

## Persistência e segurança
- Adicionar ao pedido os dados necessários para registrar quando a negociação começou e quantos segundos já foram acumulados.
- Criar operações atômicas para iniciar e encerrar a negociação, respeitando as permissões atuais dos pedidos.
- No encerramento, somar o período aberto ao total acumulado e limpar somente o início ativo.

## Validação
- Confirmar que o clique funciona apenas em **Expedição Coleta**, **Instalações** e **Correções**.
- Confirmar que o rótulo e o cronômetro aparecem imediatamente e continuam após atualizar a página.
- Confirmar que o agendamento encerra o cronômetro e preserva o tempo acumulado.
- Confirmar que uma nova negociação retoma a soma acumulada e que carregamentos concluídos não podem iniciar negociação.
