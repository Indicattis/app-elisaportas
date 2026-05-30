
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  setor: 'vendas' | 'marketing' | 'instalacoes' | 'fabrica' | 'administrativo' | 'lideranca' | null;
  created_at: string;
  ativo: boolean;
  nome: string;
  foto_perfil_url: string | null;
  user_id: string;
  bypass_permissions: boolean | null;
}

interface AuthContextType {
  user: User | null;
  userRole: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAtendente: boolean;
  isGerenteComercial: boolean;
  isGerenteFabril: boolean;
  isFabrica: boolean;
  hasBypassPermissions: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUserRole = async (userId: string) => {
      // Skip if we already loaded this user's role
      if (currentUserIdRef.current === userId && userRole) return;
      
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }

        if (mounted) {
          currentUserIdRef.current = userId;
          setUserRole(data);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
      }
    };

    // Register listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          currentUserIdRef.current = null;
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN') {
          // Ignore repeated SIGNED_IN for the same user
          if (currentUserIdRef.current === session.user.id && userRole) {
            setLoading(false);
            return;
          }
          setUser(session.user);
          setTimeout(() => fetchUserRole(session.user.id), 0);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // Just update the user object, don't refetch role
          setUser(session.user);
          setLoading(false);
          return;
        }

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            setUser(session.user);
            setTimeout(() => fetchUserRole(session.user.id), 0);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error.message,
        });
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: error.message,
        });
        throw error;
      }

      toast({
        title: "Cadastro realizado",
        description: "Verifique seu email para confirmar a conta.",
      });
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      currentUserIdRef.current = null;
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole?.role === 'administrador';
  const isAtendente = userRole?.role === 'atendente';
  const isGerenteComercial = userRole?.role === 'gerente_comercial';
  const isGerenteFabril = userRole?.role === 'gerente_fabril';
  const isFabrica = userRole?.setor === 'fabrica';
  const hasBypassPermissions = userRole?.bypass_permissions === true;

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      loading, 
      isAdmin, 
      isAtendente,
      isGerenteComercial,
      isGerenteFabril,
      isFabrica,
      hasBypassPermissions,
      signOut,
      signIn,
      signUp
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
