import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EstadoDetalheView } from '@/components/autorizados/EstadoDetalheView';
import { NovoEstadoDialog } from '@/components/autorizados/NovoEstadoDialog';
import { NovaCidadeDialog } from '@/components/autorizados/NovaCidadeDialog';
import type { Estado, Cidade } from '@/hooks/useEstadosCidades';
import { useEstadosCidades } from '@/hooks/useEstadosCidades';

export default function EstadoAutorizadosDirecao() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contexto = pathname.startsWith('/logistica') ? 'logistica' : pathname.startsWith('/autorizados') ? 'home' : 'direcao';
  const basePath = contexto === 'home' ? '/autorizados' : `/${contexto}/autorizados`;
  const backPath = contexto === 'logistica' ? '/logistica' : contexto === 'home' ? '/home' : '/direcao';
  const breadcrumbLabel = contexto === 'logistica' ? 'Logística' : contexto === 'home' ? 'Home' : 'Direção';
  const { estadoId } = useParams<{ estadoId: string }>();

  const {
    estados,
    cidades,
    autorizadosOrfaos,
    loadingCidades,
    criarEstado,
    editarEstado,
    excluirEstado,
    criarCidade,
    editarCidade,
    excluirCidade,
    definirPremium,
    removerPremium,
    excluirAutorizado,
    selecionarEstado,
    estadoSelecionado,
    reordenarCidades,
  } = useEstadosCidades();

  const [novoEstadoOpen, setNovoEstadoOpen] = useState(false);
  const [novaCidadeOpen, setNovaCidadeOpen] = useState(false);
  const [estadoParaEditar, setEstadoParaEditar] = useState<Estado | null>(null);
  const [cidadeParaEditar, setCidadeParaEditar] = useState<Cidade | null>(null);

  // When estados load, select the one matching the URL param
  useEffect(() => {
    if (estadoId && estados.length > 0 && estadoSelecionado?.id !== estadoId) {
      const estado = estados.find(e => e.id === estadoId);
      if (estado) {
        selecionarEstado(estado);
      } else {
        toast.error('Estado não encontrado');
        navigate(basePath);
      }
    }
  }, [estadoId, estados, estadoSelecionado, selecionarEstado, navigate, basePath]);

  const handleTogglePremium = async (autorizadoId: string, isPremium: boolean) => {
    if (isPremium) {
      await removerPremium(autorizadoId);
    } else {
      await definirPremium(autorizadoId);
    }
  };

  const handleEditEstado = () => {
    if (estadoSelecionado) {
      setEstadoParaEditar(estadoSelecionado);
      setNovoEstadoOpen(true);
    }
  };

  const handleDeleteEstado = async () => {
    if (estadoSelecionado) {
      await excluirEstado(estadoSelecionado.id);
      navigate(basePath);
    }
  };

  const handleEditCidade = (cidade: Cidade) => {
    setCidadeParaEditar(cidade);
    setNovaCidadeOpen(true);
  };

  const handleEditAutorizado = (id: string) => {
    navigate(`${basePath}/${id}/editar`);
  };

  const handleCloseEstadoDialog = (open: boolean) => {
    setNovoEstadoOpen(open);
    if (!open) setEstadoParaEditar(null);
  };

  const handleCloseCidadeDialog = (open: boolean) => {
    setNovaCidadeOpen(open);
    if (!open) setCidadeParaEditar(null);
  };

  if (!estadoSelecionado) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const headerActions = (
    <>
      <Button
        size="sm"
        onClick={() => setNovaCidadeOpen(true)}
        className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/20 text-white shadow-lg shadow-blue-500/10 hover:from-blue-500/30 hover:to-blue-600/30 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nova Cidade</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEditEstado}
        className="hover:bg-primary/10"
      >
        <Pencil className="h-4 w-4 text-white/60" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estado?</AlertDialogTitle>
            <AlertDialogDescription>
              O estado "{estadoSelecionado.nome}" e todas as suas cidades cadastradas serão excluídos. Os autorizados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEstado}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <MinimalistLayout
      title={estadoSelecionado.nome}
      subtitle={`${estadoSelecionado.sigla} · ${cidades.length} cidades cadastradas`}
      backPath={basePath}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        ...(contexto !== 'home' ? [{ label: breadcrumbLabel, path: backPath }] : []),
        { label: "Autorizados", path: basePath },
        { label: estadoSelecionado.nome }
      ]}
      headerActions={headerActions}
    >
      <EstadoDetalheView
            estado={estadoSelecionado}
            cidades={cidades}
            autorizadosOrfaos={autorizadosOrfaos}
            loading={loadingCidades}
            onVoltar={() => navigate(basePath)}
            onNovaCidade={() => setNovaCidadeOpen(true)}
            onEditEstado={handleEditEstado}
            onDeleteEstado={handleDeleteEstado}
            onEditCidade={handleEditCidade}
            onDeleteCidade={excluirCidade}
            onEditAutorizado={handleEditAutorizado}
            onDeleteAutorizado={excluirAutorizado}
            onTogglePremium={handleTogglePremium}
            onReordenarCidades={reordenarCidades}
      />

      <NovoEstadoDialog
        open={novoEstadoOpen}
        onOpenChange={handleCloseEstadoDialog}
        onSave={criarEstado}
        estadoParaEditar={estadoParaEditar}
        onUpdate={editarEstado}
        estadosCadastrados={estados.map(e => e.sigla)}
      />

      <NovaCidadeDialog
        open={novaCidadeOpen}
        onOpenChange={handleCloseCidadeDialog}
        estadoId={estadoSelecionado.id}
        estadoNome={estadoSelecionado.nome}
        estadoSigla={estadoSelecionado.sigla}
        onSave={criarCidade}
        cidadeParaEditar={cidadeParaEditar}
        onUpdate={editarCidade}
        cidadesCadastradas={cidades.map(c => c.nome)}
      />
    </MinimalistLayout>
  );
}
