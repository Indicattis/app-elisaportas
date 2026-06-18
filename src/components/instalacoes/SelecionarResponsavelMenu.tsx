import { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { useResponsaveisInstalacao } from '@/hooks/useResponsaveisInstalacao';
import { Users, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SelecionarResponsavelMenuProps {
  instalacaoId: string;
  children: React.ReactNode;
  onResponsavelSelecionado?: () => void;
  filtro?: 'equipes' | 'autorizados' | 'todos';
}

export function SelecionarResponsavelMenu({ 
  instalacaoId, 
  children,
  onResponsavelSelecionado,
  filtro = 'todos',
}: SelecionarResponsavelMenuProps) {
  const { responsaveis, loading } = useResponsaveisInstalacao();
  const [atualizando, setAtualizando] = useState(false);

  const equipesInternas = filtro === 'autorizados' ? [] : responsaveis.filter(r => r.tipo === 'equipe_interna');
  const autorizados = filtro === 'equipes' ? [] : responsaveis.filter(r => r.tipo === 'autorizado');

  const handleSelecionarResponsavel = async (responsavel: typeof responsaveis[0]) => {
    try {
      setAtualizando(true);

      const tipoInstalacao = responsavel.tipo === 'equipe_interna' ? 'elisa' : 'autorizados';
      
      const updateData = {
        tipo_instalacao: tipoInstalacao as 'elisa' | 'autorizados',
        responsavel_instalacao_id: responsavel.id,
        responsavel_instalacao_nome: responsavel.nome
      };

      const { error } = await supabase
        .from('instalacoes')
        .update(updateData)
        .eq('id', instalacaoId);

      if (error) throw error;

      toast.success(`Responsável definido: ${responsavel.nome}`);
      onResponsavelSelecionado?.();
    } catch (error) {
      console.error('Erro ao definir responsável:', error);
      toast.error('Erro ao definir responsável');
    } finally {
      setAtualizando(false);
    }
  };

  if (loading) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={atualizando}>
            <Users className="mr-2 h-4 w-4" />
            <span>Definir Responsável</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {equipesInternas.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Equipes Internas
                  </DropdownMenuLabel>
                  {equipesInternas.map((equipe) => (
                    <DropdownMenuItem
                      key={equipe.id}
                      onClick={() => handleSelecionarResponsavel(equipe)}
                      disabled={atualizando}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: equipe.cor }}
                      />
                      {equipe.nome}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {equipesInternas.length > 0 && autorizados.length > 0 && (
                <DropdownMenuSeparator />
              )}

              {autorizados.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Autorizados
                  </DropdownMenuLabel>
                  {autorizados.map((autorizado) => (
                    <DropdownMenuItem
                      key={autorizado.id}
                      onClick={() => handleSelecionarResponsavel(autorizado)}
                      disabled={atualizando}
                    >
                      <Building2 className="mr-2 h-3 w-3" />
                      <div className="flex flex-col">
                        <span>{autorizado.nome}</span>
                        {(autorizado.cidade || autorizado.estado) && (
                          <span className="text-xs text-muted-foreground">
                            {autorizado.cidade}{autorizado.cidade && autorizado.estado && ' - '}{autorizado.estado}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {equipesInternas.length === 0 && autorizados.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhum responsável disponível
                </div>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
