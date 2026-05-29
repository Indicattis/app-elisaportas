## Causa

Em `src/hooks/useHistoricoMetasVendas.ts` (linhas 121-128), o `userMap` é populado apenas com usuários cujo `role IN ('atendente', 'vendedor')`. Magno Andrigo Siqueira está em `admin_users` com `role = 'gerentedevendas'`, então fica fora do mapa e o nome cai no fallback `u?.nome || 'Vendedor'`.

## Mudança

Arquivo único: `src/hooks/useHistoricoMetasVendas.ts`.

- Remover o filtro `.in('role', ['atendente', 'vendedor'])` da consulta a `admin_users`, buscando todos os usuários (`user_id, nome, foto_perfil_url`).
- Mantém o shape do `userMap` e o fallback `'Vendedor'` (que agora só deve aparecer se o `atendente_id` realmente não existir em `admin_users`).
- Resultado: qualquer usuário com vendas no período (gerente de vendas, diretor, atendente, vendedor) é exibido com nome e foto reais.

Sem alterações no banco, RLS, página ou hook live (`useProgressoMetasVendas`).

## Verificação

- Em `/vendas/metas`, períodos passados com vendas do Magno passam a mostrar "Magno Andrigo Siqueira" com foto.
- Vendedores/atendentes regulares continuam aparecendo normalmente.