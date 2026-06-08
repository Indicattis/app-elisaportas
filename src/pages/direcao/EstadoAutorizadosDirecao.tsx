import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
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
  const { estadoId } = useParams<{ estadoId: string }>();
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: contexto === 'logistica' ? "Logística" : "Direção", path: contexto === 'logistica' ? '/logistica' : '/direcao' },
          { label: "Autorizados", path: basePath },
          { label: estadoSelecionado.nome }
        ]}
        mounted={mounted}
      />

      <div className="pt-12">
        <header className="sticky top-0 z-20 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-primary/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(basePath)}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/80" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">{estadoSelecionado.nome}</h1>
                <p className="text-xs text-white/60">
                  {estadoSelecionado.sigla} · {cidades.length} cidades cadastradas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNovaCidadeOpen(true)}
                className="bg-primary/10 border-primary/20 hover:bg-primary/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova Cidade
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
            </div>
          </div>
        </header>

        <div className="px-4 py-4 max-w-7xl mx-auto">
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
        </div>
      </div>

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
    </div>
  );
}
