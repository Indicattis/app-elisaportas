import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useRouteAccessByPrefix(prefix: string) {
  const { user, hasBypassPermissions } = useAuth();

  return useQuery({
    queryKey: ['route-access-prefix', user?.id, prefix, hasBypassPermissions],
    queryFn: async () => {
      if (!user?.id) return false;
      
      if (hasBypassPermissions) return true;

      const { data, error } = await supabase
        .from('user_route_access' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('can_access', true)
        .like('route_key', `${prefix}%`)
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id && !!prefix,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
