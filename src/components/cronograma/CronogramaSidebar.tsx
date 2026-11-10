import { useState } from "react";
import { PanelLeftClose, PanelLeft, Filter, X, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { usePedidosEtapas } from "@/hooks/usePedidosEtapas";
import { PedidoSidebarItem } from "./PedidoSidebarItem";
import { cn } from "@/lib/utils";

interface CronogramaSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoFiltrado: string | null;
  clienteFiltrado: string | null;
  onPedidoClick: (pedidoId: string | null, clienteNome: string | null) => void;
}

const ABAS_ETAPAS = [
  { value: 'em_producao', label: 'Produção' },
  { value: 'aguardando_pintura', label: 'Pintura' },
] as const;

export function CronogramaSidebar({ 
  open, 
  onOpenChange, 
  pedidoFiltrado, 
  clienteFiltrado,
  onPedidoClick 
}: CronogramaSidebarProps) {
  const [abaAtiva, setAbaAtiva] = useState<string>('em_producao');

  // Hooks para cada etapa
  const { pedidos: pedidosProducao, isLoading: loadingProducao } = usePedidosEtapas('em_producao');
  const { pedidos: pedidosQualidade, isLoading: loadingQualidade } = usePedidosEtapas('inspecao_qualidade');
  const { pedidos: pedidosPintura, isLoading: loadingPintura } = usePedidosEtapas('aguardando_pintura');

  const pedidosPorEtapa: Record<string, any[]> = {
    em_producao: pedidosProducao,
    inspecao_qualidade: pedidosQualidade,
    aguardando_pintura: pedidosPintura,
  };

  const loadingPorEtapa: Record<string, boolean> = {
    em_producao: loadingProducao,
    inspecao_qualidade: loadingQualidade,
    aguardando_pintura: loadingPintura,
  };

  const handleLimparFiltro = () => {
    onPedidoClick(null, null);
  };

  // Versão recolhida - apenas botão na mesma posição
  if (!open) {
    return (
      <div className="p-4 pr-0">
        <button
          onClick={() => onOpenChange(true)}
          className={cn(
            "flex items-center justify-center gap-2 h-10 px-3 rounded-xl border backdrop-blur-sm transition-all",
            "bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20",
            "text-cyan-400 hover:text-cyan-300"
          )}
          title="Expandir pedidos"
        >
          <PanelLeft className="h-4 w-4" />
          <span className="text-xs font-medium">Pedidos</span>
          {pedidoFiltrado && (
            <Filter className="h-3.5 w-3.5 text-cyan-300" />
          )}
        </button>
      </div>
    );
  }

  const pedidosAtuais = pedidosPorEtapa[abaAtiva] || [];
  const loadingAtual = loadingPorEtapa[abaAtiva];

  return (
    <div className="p-4 pr-0">
      <div
        className={cn(
          "flex flex-col h-full min-w-[280px] max-w-[320px] rounded-xl border backdrop-blur-sm",
          "bg-cyan-500/10 border-cyan-500/30"
        )}
        style={{ height: 'calc(100vh - 140px)' }}
      >
        {/* Header - igual às colunas */}
        <div className="px-4 py-3 border-b border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-cyan-400">
              Pedidos
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                {pedidosAtuais.length}
              </span>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Recolher sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtro ativo */}
        {pedidoFiltrado && clienteFiltrado && (
          <div className="px-3 py-2 bg-cyan-500/20 border-b border-cyan-500/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-xs text-cyan-200 truncate">
                  {clienteFiltrado}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltro}
                className="h-6 w-6 p-0 hover:bg-cyan-500/20 text-cyan-300 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-2 pt-2">
          <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
            <TabsList className="grid grid-cols-3 bg-zinc-800/50 h-8 w-full">
              {ABAS_ETAPAS.map((aba) => (
                <TabsTrigger 
                  key={aba.value} 
                  value={aba.value}
                  className="text-[10px] px-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
                >
                  {aba.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-2">
          {loadingAtual ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : pedidosAtuais.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-zinc-500">Nenhum pedido</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pedidosAtuais.map((pedido, index) => {
                const vendaData = Array.isArray(pedido.vendas) 
                  ? pedido.vendas[0] 
                  : pedido.vendas;
                
                return (
                  <PedidoSidebarItem
                    key={pedido.id}
                    pedido={{
                      id: pedido.id,
                      numero_pedido: pedido.numero_pedido,
                      cliente_nome: vendaData?.cliente_nome || 'N/A',
                      prioridade_etapa: pedido.prioridade_etapa || 0,
                      tipo_entrega: vendaData?.tipo_entrega,
                    }}
                    posicao={index + 1}
                    isSelected={pedidoFiltrado === pedido.id}
                    onClick={() => {
                      const clienteNome = vendaData?.cliente_nome || 'N/A';
                      onPedidoClick(
                        pedidoFiltrado === pedido.id ? null : pedido.id,
                        pedidoFiltrado === pedido.id ? null : clienteNome
                      );
                    }}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
