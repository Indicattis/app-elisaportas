import { useState } from "react";
import { Flame, Fuel, RefreshCw, History } from "lucide-react";
import { useOrdemPintura } from "@/hooks/useOrdemPintura";
import { usePedidoAutoAvanco } from "@/hooks/usePedidoAutoAvanco";
import { usePinturaInicios } from "@/hooks/usePinturaInicios";
import { usePinturaTrocasGas } from "@/hooks/usePinturaTrocasGas";
import { ProducaoPinturaKanban } from "@/components/production/ProducaoPinturaKanban";
import { OrdemDetalhesSheet } from "@/components/production/OrdemDetalhesSheet";
import { ProcessoAvancoAutomaticoModal } from "@/components/pedidos/ProcessoAvancoAutomaticoModal";
import { NovoInicioPinturaModal } from "@/components/production/NovoInicioPinturaModal";
import { PinturaIniciosList } from "@/components/production/PinturaIniciosList";
import { NovaTrocaGasModal } from "@/components/production/NovaTrocaGasModal";
import { TrocasGasList } from "@/components/production/TrocasGasList";
import { MetaProgressoFlutuante } from "@/components/metas/MetaProgressoFlutuante";
import { useMetaProgresso } from "@/hooks/useMetaProgresso";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useProducaoAuth } from "@/hooks/useProducaoAuth";

export default function ProducaoPintura() {
  const [selectedOrdemId, setSelectedOrdemId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [novoInicioOpen, setNovoInicioOpen] = useState(false);
  const [verFornadasOpen, setVerFornadasOpen] = useState(false);
  const [novaTrocaGasOpen, setNovaTrocaGasOpen] = useState(false);
  const [verTrocasGasOpen, setVerTrocasGasOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useProducaoAuth();

  const { tentarAvancoAutomatico, processos, modalOpen } = usePedidoAutoAvanco();
  const { inicios, isLoading: isLoadingInicios, criarInicio, toggleRecarga } = usePinturaInicios();
  const { trocas, isLoading: isLoadingTrocas, criarTroca } = usePinturaTrocasGas();
  const { metaInfo, visible, mostrarProgresso, fechar } = useMetaProgresso();

  const {
    ordens,
    ordensParaPintar,
    isLoading,
    capturarOrdem,
    finalizarPintura,
    marcarLinhaConcluida,
  } = useOrdemPintura(tentarAvancoAutomatico);

  // Sincronizar ordem selecionada com cache atualizado
  const selectedOrdem = ordens.find(o => o.id === selectedOrdemId) || null;

  const handleOrdemClick = (ordem: any) => {
    setSelectedOrdemId(ordem.id);
    setDetailsOpen(true);
  };

  const handleFinalizarPintura = async () => {
    if (!selectedOrdem) return;
    await finalizarPintura.mutateAsync(selectedOrdem.id);
    setDetailsOpen(false);
    
    // Mostrar progresso da meta
    if (user?.user_id) {
      mostrarProgresso(user.user_id, 'pintura');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ordens-pintura'] });
    queryClient.invalidateQueries({ queryKey: ['pintura-inicios'] });
    queryClient.invalidateQueries({ queryKey: ['pintura-trocas-gas'] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Controles grandes de fornada e troca de gás */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-3">
          <Button
            onClick={() => setNovoInicioOpen(true)}
            className="flex-[3] h-24 text-lg gap-3 bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
          >
            <Flame className="h-7 w-7" />
            Registrar Fornada
          </Button>
          <Button
            onClick={() => setVerFornadasOpen(true)}
            variant="outline"
            className="flex-1 h-24 text-sm gap-2 border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
          >
            <History className="h-5 w-5" />
            Ver Fornadas
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setNovaTrocaGasOpen(true)}
            className="flex-[3] h-24 text-lg gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Fuel className="h-7 w-7" />
            Registrar Troca de Gás
          </Button>
          <Button
            onClick={() => setVerTrocasGasOpen(true)}
            variant="outline"
            className="flex-1 h-24 text-sm gap-2 border-blue-500/40 text-blue-600 hover:bg-blue-500/10"
          >
            <History className="h-5 w-5" />
            Ver Trocas
          </Button>
        </div>
      </div>

      <ProducaoPinturaKanban
        ordensParaPintar={ordensParaPintar}
        isLoading={isLoading}
        onOrdemClick={handleOrdemClick}
        onFinalizarPintura={finalizarPintura.mutate}
        onCapturarOrdem={capturarOrdem.mutate}
        isCapturing={capturarOrdem.isPending}
      />

      <OrdemDetalhesSheet
        ordem={selectedOrdem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        tipoOrdem="pintura"
        onMarcarLinha={(linhaId, concluida) => 
          marcarLinhaConcluida.mutate({ linhaId, concluida })
        }
        onConcluirOrdem={() => {}}
        onCapturarOrdem={(ordemId) => capturarOrdem.mutate(ordemId)}
        isUpdating={marcarLinhaConcluida.isPending}
        isCapturing={capturarOrdem.isPending}
        onFinalizarPintura={handleFinalizarPintura}
        isFinalizando={finalizarPintura.isPending}
      />

      <ProcessoAvancoAutomaticoModal
        open={modalOpen}
        processos={processos}
      />

      <NovoInicioPinturaModal
        open={novoInicioOpen}
        onOpenChange={setNovoInicioOpen}
        onConfirm={criarInicio.mutate}
        isLoading={criarInicio.isPending}
      />

      <NovaTrocaGasModal
        open={novaTrocaGasOpen}
        onOpenChange={setNovaTrocaGasOpen}
        onConfirm={(payload) => criarTroca.mutate(payload)}
        isLoading={criarTroca.isPending}
      />

      <Dialog open={verFornadasOpen} onOpenChange={setVerFornadasOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fornadas</DialogTitle>
          </DialogHeader>
          <PinturaIniciosList
            inicios={inicios}
            isLoading={isLoadingInicios}
            onToggleRecarga={toggleRecarga.mutate}
            isTogglingRecarga={toggleRecarga.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={verTrocasGasOpen} onOpenChange={setVerTrocasGasOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Trocas de Gás</DialogTitle>
          </DialogHeader>
          <TrocasGasList trocas={trocas} isLoading={isLoadingTrocas} />
        </DialogContent>
      </Dialog>

      <MetaProgressoFlutuante
        metaInfo={metaInfo}
        visible={visible}
        onClose={fechar}
      />
    </div>
  );
}
