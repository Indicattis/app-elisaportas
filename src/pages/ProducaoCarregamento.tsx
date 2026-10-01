import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageCheck, Truck, Wrench } from "lucide-react";
import { useOrdensCarregamentoUnificadas, OrdemCarregamentoUnificada } from "@/hooks/useOrdensCarregamentoUnificadas";
import { CarregamentoDownbar } from "@/components/carregamento/CarregamentoDownbar";
import { CarregamentoKanban } from "@/components/carregamento/CarregamentoKanban";
import { MetaProgressoFlutuante } from "@/components/metas/MetaProgressoFlutuante";
import { useMetaProgresso } from "@/hooks/useMetaProgresso";
import { useQueryClient } from "@tanstack/react-query";
import { useProducaoAuth } from "@/hooks/useProducaoAuth";

type FiltroTipo = "todos" | "entrega" | "instalacao" | "correcoes";

export default function ProducaoCarregamento() {
  const { ordens, isLoading, concluirCarregamento } = useOrdensCarregamentoUnificadas();
  const queryClient = useQueryClient();
  const { user } = useProducaoAuth();

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [itemSelecionado, setItemSelecionado] = useState<OrdemCarregamentoUnificada | null>(null);
  const [downbarOpen, setDownbarOpen] = useState(false);
  const { metaInfo, visible, mostrarProgresso, fechar } = useMetaProgresso();

  // Ordens já vêm filtradas do hook
  const ordensDisponiveis = ordens;

  // Aplicar filtro por tipo de serviço (entrega ou instalação)
  const ordensFiltradas = ordensDisponiveis.filter(ordem => {
    if (filtroTipo === "todos") return true;
    if (filtroTipo === "correcoes") return ordem.fonte === 'correcoes';
    if (filtroTipo === "instalacao") {
      return ordem.tipo_entrega === 'instalacao' || ordem.tipo_entrega === 'manutencao';
    }
    return ordem.tipo_entrega === filtroTipo && ordem.fonte !== 'correcoes';
  });

  // Ordenar por data de carregamento
  const ordensOrdenadas = ordensFiltradas.sort((a, b) => {
    const dateA = a.data_carregamento ? new Date(a.data_carregamento + 'T12:00:00').getTime() : 0;
    const dateB = b.data_carregamento ? new Date(b.data_carregamento + 'T12:00:00').getTime() : 0;
    return dateA - dateB;
  });

  const handleIniciarColeta = (ordem: OrdemCarregamentoUnificada) => {
    setItemSelecionado(ordem);
    setDownbarOpen(true);
  };

  const handleConcluirCarregamento = async ({ observacoes, fotoFile }: { observacoes?: string; fotoFile?: File }) => {
    if (!itemSelecionado) return;
    await concluirCarregamento({ ordem: itemSelecionado, observacoes, fotoFile });
    
    // Mostrar progresso da meta
    if (user?.user_id) {
      mostrarProgresso(user.user_id, 'carregamento');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_unificadas"] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Filtro por tipo de serviço */}
      <Tabs value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="todos">
            Todos ({ordensDisponiveis.length})
          </TabsTrigger>
          <TabsTrigger value="entrega">
            <Truck className="h-4 w-4 mr-2" />
            Entrega ({ordensDisponiveis.filter(o => o.tipo_entrega === 'entrega' && o.fonte !== 'correcoes').length})
          </TabsTrigger>
          <TabsTrigger value="instalacao">
            <PackageCheck className="h-4 w-4 mr-2" />
            Instalação ({ordensDisponiveis.filter(o => o.tipo_entrega === 'instalacao' || o.tipo_entrega === 'manutencao').length})
          </TabsTrigger>
          <TabsTrigger value="correcoes">
            <Wrench className="h-4 w-4 mr-2" />
            Correções ({ordensDisponiveis.filter(o => o.fonte === 'correcoes').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Kanban de Ordens */}
      <CarregamentoKanban
        ordens={ordensOrdenadas}
        isLoading={isLoading}
        onIniciarColeta={handleIniciarColeta}
        onRefresh={handleRefresh}
      />

      {/* Downbar para confirmar carregamento */}
      {itemSelecionado && (
        <CarregamentoDownbar
          ordem={itemSelecionado}
          open={downbarOpen}
          onOpenChange={setDownbarOpen}
          onConcluir={handleConcluirCarregamento}
          onSuccess={() => {
            setDownbarOpen(false);
            setItemSelecionado(null);
          }}
        />
      )}

      <MetaProgressoFlutuante
        metaInfo={metaInfo}
        visible={visible}
        onClose={fechar}
      />
    </div>
  );
}
