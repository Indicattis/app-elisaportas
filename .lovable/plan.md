Adicionar ações na Ficha de visita técnica (tela readOnly) para que o usuário possa editar a conclusão ou concluir a visita, conforme o status.

### Contexto
A rota `/vendas/visitas-tecnicas/:visitaId/concluir` renderiza `VisitaTecnicaConclusao`. Hoje o componente alterna automaticamente entre modo de preenchimento (`!readOnly`) e modo Ficha (`readOnly`) baseado na existência de um registro em `visitas_tecnicas_conclusoes`. Quando a Ficha é exibida, não há botão de ação, o que gera a pergunta do usuário.

### O que será feito

1. **Botão "Editar conclusão" na Ficha**
   - Sempre visível quando `readOnly === true` e a visita possui conclusão salva.
   - Ao clicar, altera o estado local para `readOnly = false` e expande as portas para edição.
   - O usuário reutiliza o formulário existente; ao salvar, o `upsert` em `visitas_tecnicas_conclusoes` e o delete/reinsert em `visitas_tecnicas_portas` mantêm os dados atualizados.

2. **Botão "Concluir visita" na Ficha (status pendente)**
   - Visível apenas quando `readOnly === true` e `visita.status !== 'concluida'`.
   - Executa uma mutação leve que:
     - Atualiza `visitas_tecnicas_agendadas.status` para `'concluida'`.
     - Registra histórico em `visitas_tecnicas_historico` com ação `concluida`.
     - Invalida queries de visitas e redireciona para `/vendas/visitas-tecnicas`.

3. **Indicador de status**
   - Exibir um badge na Ficha informando o status atual da visita (`concluida`, `realizada`, `agendada`, `cancelada`), alinhado ao estilo glassmorphism do projeto.

4. **Cancelar edição**
   - Quando o usuário clicar em "Editar conclusão", o botão "Cancelar" volta para `readOnly = true` sem salvar.

### Arquivos alterados
- `src/pages/vendas/VisitaTecnicaConclusao.tsx`

### Não será alterado
- Não há necessidade de migração de banco; a lógica de atualização de status e histórico já usa tabelas existentes.

### Validação
- Build do projeto sem erros.
- Verificação manual no preview: acessar Ficha de uma visita concluída e verificar botão "Editar conclusão"; acessar Ficha de uma visita com conclusão salva mas status pendente e verificar ambos os botões.