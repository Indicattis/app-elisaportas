import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRouteAccess } from "@/hooks/useRouteAccess";
import { useRouteAccessByPrefix } from "@/hooks/useRouteAccessByPrefix";
import { useAnyRouteAccess } from "@/hooks/useAnyRouteAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
  routeKey?: string;
  alternativeRouteKeys?: string[];
  routeKeyPrefix?: string;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, routeKey, alternativeRouteKeys = [], routeKeyPrefix, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, hasBypassPermissions } = useAuth();
  const location = useLocation();
  const { data: hasAccess, isLoading: accessLoading } = useRouteAccess(routeKey || '');
  const { data: hasAlternativeAccess, isLoading: alternativeAccessLoading } = useAnyRouteAccess(alternativeRouteKeys);
  const { data: hasPrefixAccess, isLoading: prefixLoading } = useRouteAccessByPrefix(routeKeyPrefix || '');

  const isCheckingAccess = (routeKey && accessLoading) || (alternativeRouteKeys.length > 0 && alternativeAccessLoading) || (routeKeyPrefix && prefixLoading);

  if (loading || isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  // Verificação de acesso: routeKey exato OU routeKeyPrefix
  if (!hasBypassPermissions) {
    if (routeKey && !hasAccess && !hasAlternativeAccess) {
      return <Navigate to="/forbidden" replace />;
    }
    if (routeKeyPrefix && !hasPrefixAccess) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
}
