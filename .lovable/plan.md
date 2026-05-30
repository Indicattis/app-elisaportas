Vou corrigir a causa real do 403 ao criar setor.

O que encontrei:
- A tabela `system_setores` já tem permissões de Data API, então não é problema de GRANT.
- O bloqueio vem da política RLS: hoje só `administrador` e `diretor` podem criar/editar/excluir setores.
- Pelos logs/usuários recentes, quem está tentando usar a tela está com papel como `gerentedevendas` ou outro papel operacional, então a inserção é barrada.

Plano de correção:
1. Atualizar as políticas RLS de `system_setores` para permitir gestão de setores também para os papéis de gestão usados nas telas de Direção/RH:
   - `administrador`
   - `diretor`
   - `gerentefabrica`
   - `gerentedevendas`
   - `gerente_comercial`
   - `gerente_marketing`
   - `gerente_instalacoes`
   - `analista_administrativo`
   - `analista_rh`
   - `pcp`

2. Aplicar a mesma regra para criar, renomear, excluir e reordenar setores, porque a tela usa a mesma tabela para todas essas ações.

3. Manter leitura pública/autenticada como está, sem abrir escrita para todos os usuários.

Detalhe técnico:
- Vou recriar as políticas `system_setores_manage_insert`, `system_setores_manage_update` e `system_setores_manage_delete` usando `public.admin_users.user_id = auth.uid()`, `ativo = true` e a lista de papéis acima.
- Não vou alterar frontend, porque o erro é exclusivamente de RLS no banco.