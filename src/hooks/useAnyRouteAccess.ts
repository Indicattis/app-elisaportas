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

      const checks = await Promise.all(
        normalizedRouteKeys.map((routeKey) =>
          supabase.rpc('has_route_access' as any, {
            _user_id: user.id,
            _route_key: routeKey,
          })
        )
      );

      const error = checks.find((check) => check.error)?.error;
      if (error) throw error;

      return checks.some((check) => Boolean(check.data));
    },
    enabled: !!user?.id && normalizedRouteKeys.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}