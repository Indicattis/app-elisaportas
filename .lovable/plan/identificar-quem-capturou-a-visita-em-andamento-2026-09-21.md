# Identificar quem capturou a visita em andamento

## O que será feito
- Registrar o usuário que clicar em **Iniciar Medição** como responsável pela captura da visita.
- Exibir no cartão de visitas **Em andamento** a foto e o nome em um indicador “Capturada por”.
- Permitir pesquisar a visita também pelo nome de quem a capturou.
- Ao usar **Voltar para pendente**, limpar a captura para que uma nova pessoa possa assumi-la depois.

## Dados e segurança
- Adicionar à visita um campo opcional ligado ao usuário autenticado que iniciou a medição.
- Manter as regras de acesso atuais da agenda; nenhuma nova permissão será aberta.
- Visitas antigas em andamento sem esse registro continuarão funcionando e apenas não mostrarão o indicador.

## Validação
- Iniciar uma visita e confirmar que o nome aparece em **Em andamento**.
- Retroceder a visita e confirmar que a identificação é removida.
- Conferir o resultado no computador e no celular.
