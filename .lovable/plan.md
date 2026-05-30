Vou corrigir a regra de acesso da tabela `empresas_emissoras`, porque hoje ela só permite cadastro para usuários com papel literal de administrador (`is_admin()` sem parâmetro). Isso bloqueia usuários que têm permissão de rota para gerenciar empresas, como o acesso usado em `/administrativo/empresas`.

Plano de implementação:

1. Ajustar a política RLS de `empresas_emissoras`
   - Remover a política atual `Admins can manage empresas_emissoras`.
   - Criar uma nova política de gerenciamento para usuários autenticados que tenham acesso à rota/permissão `admin_companies`.
   - A nova regra permitirá criar, editar, excluir e definir empresa padrão somente para quem já tem essa permissão administrativa.

2. Manter a leitura existente de empresas ativas
   - A política atual que permite usuários autenticados visualizarem empresas ativas será preservada.
   - Isso evita quebrar telas financeiras e de vendas que apenas precisam listar empresas.

3. SQL previsto para a migração

```sql
DROP POLICY IF EXISTS "Admins can manage empresas_emissoras"
ON public.empresas_emissoras;

CREATE POLICY "Users with company admin access can manage empresas_emissoras"
ON public.empresas_emissoras
FOR ALL
TO authenticated
USING (public.has_route_access(auth.uid(), 'admin_companies'))
WITH CHECK (public.has_route_access(auth.uid(), 'admin_companies'));
```

Resultado esperado:
- O cadastro em `/administrativo/empresas/nova` deixará de retornar `403 Forbidden` para usuários com permissão de gestão de empresas.
- A segurança continuará no banco, não apenas no frontend.