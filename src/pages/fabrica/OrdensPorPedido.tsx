import { useState, useMemo } from "react";
import { Loader2, ClipboardList, Search, ListTodo, AlertTriangle, Pause } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useOrdensPorPedido, OrdemStatus, PedidoComOrdens } from "@/hooks/useOrdensPorPedido";
import { PedidoOrdemCard } from "@/components/fabrica/PedidoOrdemCard";
import { OrdemLinhasSheet } from "@/components/fabrica/OrdemLinhasSheet";
import { ORDEM_ETAPAS, ETAPAS_CONFIG, type EtapaPedido } from "@/types/pedidoEtapa";
import { usePedidoAutoAvanco } from "@/hooks/usePedidoAutoAvanco";
import { ProcessoAvancoAutomaticoModal } from "@/components/pedidos/ProcessoAvancoAutomaticoModal";
import { toast } from "sonner";

// Todas as etapas exceto 'finalizado'
const ETAPAS_VISIVEIS = ORDEM_ETAPAS.filter(e => e !== 'finalizado');

export default function OrdensPorPedido() {
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaPedido>('em_producao');
  const [searchTerm, setSearchTerm] = useState('');
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemStatus | null>(null);
  const [pedidoInfo, setPedidoInfo] = useState<{ numeroPedido: string; clienteNome: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [avancandoPedidoId, setAvancandoPedidoId] = useState<string | null>(null);
  const { verificarEAvancarManual, processos, modalOpen } = usePedidoAutoAvanco();

  const { data: pedidos = [], isLoading } = useOrdensPorPedido(etapaAtiva);

  const pedidosFiltrados = pedidos.filter(pedido => {
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      pedido.numero_pedido.toLowerCase().includes(termo) ||
      pedido.cliente_nome.toLowerCase().includes(termo) ||
      (pedido.localizacao?.toLowerCase().includes(termo) ?? false)
    );
  });

  // Calcular métricas das ordens
  const metricas = useMemo(() => {
    let ordensPendentes = 0;
    let ordensSemLinhas = 0;
    let ordensPausadas = 0;

    pedidos.forEach(pedido => {
      const ordens = [
        pedido.ordens.soldagem,
        pedido.ordens.perfiladeira,
        pedido.ordens.separacao,
        pedido.ordens.qualidade,
        pedido.ordens.pintura,
        pedido.ordens.embalagem,
      ];

      ordens.forEach(ordem => {
        if (ordem.existe) {
          // Ordens para concluir (não concluídas)
          if (ordem.status !== 'concluido') {
            ordensPendentes++;
          }
          // Ordens sem linhas
          if (ordem.total_linhas === 0) {
            ordensSemLinhas++;
          }
          // Ordens pausadas
          if (ordem.pausada) {
            ordensPausadas++;
          }
        }
      });
    });

    return { ordensPendentes, ordensSemLinhas, ordensPausadas };
  }, [pedidos]);

  const handleOrdemClick = (ordem: OrdemStatus, pedido: PedidoComOrdens) => {
    setOrdemSelecionada(ordem);
    setPedidoInfo({ numeroPedido: pedido.numero_pedido, clienteNome: pedido.cliente_nome });
    setSheetOpen(true);
  };

  const handleAvancarEtapa = async (pedidoId: string) => {
    setAvancandoPedidoId(pedidoId);
    try {
      const resultado = await verificarEAvancarManual(pedidoId);
      if (resultado.avancou) {
        toast.success("Pedido avançado para a próxima etapa");
      } else {
        toast.error(resultado.motivo || "Não foi possível avançar o pedido");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao avançar pedido");
    } finally {
      setAvancandoPedidoId(null);
    }
  };

  return (
    <MinimalistLayout
      title="Ordens por Pedido"
      subtitle="Visualize as ordens de cada pedido"
      backPath="/fabrica"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Fábrica', path: '/fabrica' },
        { label: 'Ordens por Pedido' }
      ]}
    >
      <div className="space-y-4">
        {/* Indicadores de resumo */}
        {!isLoading && pedidos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-yellow-300">A concluir</span>
              </div>
              <p className="text-xl font-bold text-yellow-400 mt-1">{metricas.ordensPendentes}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-300">Sem linhas</span>
              </div>
              <p className="text-xl font-bold text-orange-400 mt-1">{metricas.ordensSemLinhas}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-300">Pausadas</span>
              </div>
              <p className="text-xl font-bold text-red-400 mt-1">{metricas.ordensPausadas}</p>
            </div>
          </div>
        )}

        {/* Barra de busca */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por pedido, cliente ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Tabs de etapas */}
        <Tabs value={etapaAtiva} onValueChange={(v) => setEtapaAtiva(v as EtapaPedido)}>
          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-x-auto">
            <TabsList className="bg-zinc-900/50 border border-zinc-800/50 w-full justify-start flex-nowrap">
              {ETAPAS_VISIVEIS.map((etapa) => {
                const config = ETAPAS_CONFIG[etapa];
                return (
                  <TabsTrigger
                    key={etapa}
                    value={etapa}
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-zinc-400 whitespace-nowrap text-xs px-3"
                  >
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {ETAPAS_VISIVEIS.map((etapa) => (
            <TabsContent key={etapa} value={etapa} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
              ) : pedidosFiltrados.length === 0 ? (
                <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                    <ClipboardList className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Nenhum pedido encontrado nesta etapa.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {pedidosFiltrados.map((pedido) => (
                    <PedidoOrdemCard
                      key={pedido.id}
                      pedido={pedido}
                      onOrdemClick={handleOrdemClick}
                      etapaAtual={etapa}
                      onAvancarEtapa={handleAvancarEtapa}
                      avancandoPedidoId={avancandoPedidoId}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Sheet de linhas da ordem */}
      <OrdemLinhasSheet
        ordem={ordemSelecionada}
        numeroPedido={pedidoInfo?.numeroPedido}
        clienteNome={pedidoInfo?.clienteNome}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <ProcessoAvancoAutomaticoModal open={modalOpen} processos={processos} />
    </MinimalistLayout>
  );
}
