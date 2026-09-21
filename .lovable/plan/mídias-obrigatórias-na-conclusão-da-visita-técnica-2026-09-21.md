# Mídias obrigatórias na conclusão da visita técnica

## Objetivo
Na etapa final de `/vendas/visitas-tecnicas/:id/concluir`, exigir uma mídia geral da visita, separada das fotos já obrigatórias de cada porta.

## Alterações
- Adicionar ao final do formulário uma seção **Mídias finais da visita**, com duas ações:
  - **Adicionar fotos ou vídeos** já existentes no aparelho.
  - **Gravar vídeo**, abrindo a câmera traseira do celular para uma nova gravação.
- Permitir até **10 mídias por visita**, com pré-visualização, nome/tipo do arquivo e opção de remover antes da conclusão.
- Aceitar somente imagens e vídeos, rejeitando formatos inválidos e arquivos acima do limite com uma mensagem clara.
- Bloquear **Concluir visita** enquanto não houver pelo menos uma mídia final válida; as fotos individuais das portas não contam para essa exigência.
- Manter as mídias disponíveis ao abrir uma visita já concluída e permitir visualizá-las junto aos demais dados da visita.

## Armazenamento e dados
- Criar um bucket próprio para as mídias finais das visitas, com acesso de envio para usuários autenticados e leitura compatível com a visualização atual das visitas.
- Criar uma tabela vinculada à conclusão da visita para registrar caminho do arquivo, tipo, nome, tamanho e ordem, com permissões equivalentes às demais tabelas da conclusão.
- Salvar os arquivos e seus registros antes de marcar a visita como concluída; se qualquer envio falhar, a conclusão não será confirmada.
- Preservar mídias já salvas durante uma edição e remover do armazenamento somente quando o usuário excluir uma mídia.

## Validação
- Conferir seleção de fotos e vídeos, gravação pela câmera, limite de 10 itens, remoção e pré-visualização.
- Confirmar que nenhuma visita pode ser concluída sem mídia final e que uma visita concluída reabre exibindo seus anexos.
- Validar o fluxo em computador e celular, além da compilação e dos erros do sistema.
