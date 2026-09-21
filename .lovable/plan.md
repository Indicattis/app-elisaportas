# Retroceder visitas em andamento

## Implementação
- Adicionar a ação **Voltar para pendente** somente nas visitas classificadas como **Em andamento**.
- Exigir confirmação antes da alteração e bloquear cliques repetidos durante o processamento.
- Alterar o status da visita de `realizada` para `agendada`, sem apagar a ficha ou os dados preenchidos.
- Registrar a mudança no histórico, atualizar imediatamente as contagens/listas e informar sucesso ou erro.

## Validação
- Confirmar que a visita sai de **Em andamento** e aparece em **Pendentes**.
- Confirmar que visitas pendentes, concluídas e canceladas não exibem essa ação.
- Verificar a compilação e o fluxo visual em computador e celular.

## Detalhes técnicos
- Mudança restrita à tela de visitas técnicas e às mutações já permitidas em `visitas_tecnicas_agendadas`; não requer alteração no banco.
