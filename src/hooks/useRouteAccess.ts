import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useRouteAccess(routeKey: string) {
  const { user, hasBypassPermissions } = useAuth();

  return useQuery({
    queryKey: ['route-access', user?.id, routeKey, hasBypassPermissions],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Apenas usuários com bypass_permissions explícito têm acesso irrestrito
      if (hasBypassPermissions) {
        return true;
      }

      const { data, error } = await supabase.rpc('has_route_access' as any, {
        _user_id: user.id,
        _route_key: routeKey
      });

      if (error) throw error;
      return data || false;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
