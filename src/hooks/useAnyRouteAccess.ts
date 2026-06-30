import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAnyRouteAccess(routeKeys: string[]) {
  const { user, hasBypassPermissions } = useAuth();
  const normalizedRouteKeys = Array.from(new Set(routeKeys.filter(Boolean))).sort();

  return useQuery({
    queryKey: ['route-access-any', user?.id, normalizedRouteKeys, hasBypassPermissions],
    queryFn: async () => {
      if (!user?.id) return false;
      if (hasBypassPermissions) return true;
      if (normalizedRouteKeys.length === 0) return false;

      const { data, error } = await supabase
        .from('user_route_access' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('can_access', true)
        .in('route_key', normalizedRouteKeys)
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id && normalizedRouteKeys.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}