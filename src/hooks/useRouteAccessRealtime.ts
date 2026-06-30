import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Escuta mudanças em user_route_access do usuário logado e invalida
 * imediatamente as queries de permissão. Evita que o usuário precise
 * deslogar/atualizar para ver novos acessos concedidos por um admin.
 */
export function useRouteAccessRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-route-access-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_route_access',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['route-access'] });
          queryClient.invalidateQueries({ queryKey: ['route-access-prefix'] });
          queryClient.invalidateQueries({ queryKey: ['bulk-route-access'] });
          queryClient.invalidateQueries({ queryKey: ['first-accessible-route'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
