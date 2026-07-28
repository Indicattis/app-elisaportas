import { useState } from "react";
import { ChevronDown, ChevronRight, Truck, Wrench, Ruler, PaintBucket, Pause, Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PedidoComOrdens, OrdemStatus, TipoOrdem } from "@/hooks/useOrdensPorPedido";
import { OrdemCronometro } from "./OrdemCronometro";
import type { EtapaPedido } from "@/types/pedidoEtapa";

interface PedidoOrdemCardProps {
  pedido: PedidoComOrdens;
  onOrdemClick: (ordem: OrdemStatus, pedido: PedidoComOrdens) => void;
  etapaAtual?: EtapaPedido;
  onAvancarEtapa?: (pedidoId: string) => Promise<void> | void;
  avancandoPedidoId?: string | null;
}

const ORDEM_LABELS: Record<TipoOrdem, string> = {
  soldagem: 'Soldagem',
  perfiladeira: 'Perfiladeira',
  separacao: 'Separação',
  qualidade: 'Qualidade',
  pintura: 'Pintura',
  embalagem: 'Embalagem',
  carregamento: 'Carregamento',
  instalacao: 'Instalação',
};

const getStatusStyle = (status: string | null, pausada: boolean = false) => {
  if (pausada) {
    return 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30';
  }
  switch (status) {
    case 'pendente':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30';
    case 'em_andamento':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30';
    case 'agendado':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30';
    case 'concluido':
      return 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30';
    default:
      return 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30';
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'em_andamento':
      return 'Em andamento';
    case 'agendado':
      return 'Agendado';
    case 'concluido':
      return 'Concluído';
    default:
      return 'N/A';
  }
};

const ETAPAS_AVANCAVEIS: EtapaPedido[] = ['em_producao', 'inspecao_qualidade', 'aguardando_pintura', 'embalagem'];

export function PedidoOrdemCard({ pedido, onOrdemClick, etapaAtual, onAvancarEtapa, avancandoPedidoId }: PedidoOrdemCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const ordensBase: OrdemStatus[] = [
    pedido.ordens.soldagem,
    pedido.ordens.perfiladeira,
    pedido.ordens.separacao,
    pedido.ordens.qualidade,
    pedido.ordens.pintura,
    pedido.ordens.embalagem,
  ];

  // Filtrar baseado no tipo_entrega
  // - Instalação: mostrar apenas ordem de instalação
  // - Entrega: mostrar apenas ordem de carregamento
  const ordens: OrdemStatus[] = [
    ...ordensBase,
    ...(pedido.tipo_entrega === 'instalacao' 
      ? [pedido.ordens.instalacao] 
      : pedido.tipo_entrega === 'entrega' 
        ? [pedido.ordens.carregamento]
        : []
    ),
  ];

  const ordensExistentes = ordens.filter(o => o.existe);
  const ordensConcluidas = ordensExistentes.filter(o => o.status === 'concluido');

  // Determinar ordens relevantes para a etapa atual (subset das existentes)
  const ordensRelevantesEtapa = (() => {
    if (!etapaAtual) return [] as OrdemStatus[];
    if (etapaAtual === 'em_producao') {
      return [pedido.ordens.soldagem, pedido.ordens.perfiladeira, pedido.ordens.separacao].filter(o => o.existe);
    }
    if (etapaAtual === 'inspecao_qualidade') return [pedido.ordens.qualidade].filter(o => o.existe);
    if (etapaAtual === 'aguardando_pintura') return [pedido.ordens.pintura].filter(o => o.existe);
    if (etapaAtual === 'embalagem') return [pedido.ordens.embalagem].filter(o => o.existe);
    return [];
  })();

  const podeAvancar =
    !!onAvancarEtapa &&
    !!etapaAtual &&
    ETAPAS_AVANCAVEIS.includes(etapaAtual) &&
    ordensRelevantesEtapa.length > 0 &&
    ordensRelevantesEtapa.every(o => o.status === 'concluido');

  const estaAvancando = avancandoPedidoId === pedido.id;

  const corPrincipal = pedido.cores[0];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 overflow-hidden">
        <div className="relative">
        <CollapsibleTrigger asChild>
          <button
            className="w-full h-[30px] px-2 grid items-center gap-2 
                       hover:bg-zinc-800/50 transition-all duration-200 text-left"
            style={{
              gridTemplateColumns: '16px 55px 1fr 80px 70px 65px 90px 40px 24px 24px'
            }}
          >
            {/* Col 1: Chevron */}
            <div className="flex items-center justify-center">
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              )}
            </div>

            {/* Col 2: Número pedido */}
            <span className="text-xs font-medium text-white truncate">
              #{pedido.numero_pedido}
            </span>

            {/* Col 3: Nome do cliente */}
            <span className="text-[10px] text-zinc-300 truncate">
              {pedido.cliente_nome}
            </span>

            {/* Col 4: Cor */}
            <div className="flex items-center gap-1 truncate">
              {corPrincipal ? (
                <>
                  <div 
                    className="w-2.5 h-2.5 rounded-sm border border-zinc-600/50 flex-shrink-0" 
                    style={{ backgroundColor: corPrincipal.codigo_hex }} 
                  />
                  <span className="text-[10px] text-zinc-400 truncate">
                    {corPrincipal.nome}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>

            {/* Col 5: Localização */}
            <span className="text-[10px] text-zinc-500 truncate">
              {pedido.localizacao || '—'}
            </span>

            {/* Col 6: Portas P/G */}
            <div className="flex gap-1">
              {pedido.portas_p > 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  P:{pedido.portas_p}
                </span>
              )}
              {pedido.portas_g > 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  G:{pedido.portas_g}
                </span>
              )}
              {pedido.portas_p === 0 && pedido.portas_g === 0 && (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>

            {/* Col 7: Metragem (linear + quadrada) */}
            <div className="flex items-center gap-2">
              {pedido.metragem_linear > 0 && (
                <div className="flex items-center gap-0.5">
                  <Ruler className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-400">
                    {pedido.metragem_linear.toFixed(1)}m
                  </span>
                </div>
              )}
              {pedido.metragem_quadrada > 0 && (
                <div className="flex items-center gap-0.5">
                  <PaintBucket className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-400">
                    {pedido.metragem_quadrada.toFixed(1)}m²
                  </span>
                </div>
              )}
              {pedido.metragem_linear === 0 && pedido.metragem_quadrada === 0 && (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>

            {/* Col 8: Contador ordens */}
            <div className="flex justify-center">
              {ordensExistentes.length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400">
                  {ordensConcluidas.length}/{ordensExistentes.length}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>

            {/* Col 9: Ícone entrega/instalação */}
            <div className="flex items-center justify-center">
              {pedido.tipo_entrega === 'instalacao' ? (
                <Wrench className="w-3 h-3 text-cyan-400" />
              ) : pedido.tipo_entrega === 'entrega' ? (
                <Truck className="w-3 h-3 text-indigo-400" />
              ) : (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>

            {/* Col 10: Avatar vendedor */}
            <div className="flex items-center justify-center">
              {pedido.vendedor ? (
                <Avatar className="h-5 w-5 border border-zinc-700">
                  <AvatarImage src={pedido.vendedor.foto_url || undefined} />
                  <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">
                    {pedido.vendedor.iniciais}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        {podeAvancar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!estaAvancando) onAvancarEtapa!(pedido.id);
            }}
            disabled={estaAvancando}
            title="Avançar etapa (todas as ordens concluídas)"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-[22px] px-2 rounded-md text-[10px] font-medium",
              "flex items-center gap-1 border transition-all",
              "bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30",
              estaAvancando && "opacity-60 cursor-not-allowed"
            )}
          >
            {estaAvancando ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
            Avançar
          </button>
        )}
        </div>

        <CollapsibleContent>
          <div className="p-3 pt-2 border-t border-zinc-800/50">
            {/* Cliente nome */}
            <p className="text-xs text-zinc-400 mb-2 truncate">
              {pedido.cliente_nome}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ordens.map((ordem) => (
                <button
                  key={ordem.tipo}
                  onClick={() => ordem.existe && onOrdemClick(ordem, pedido)}
                  disabled={!ordem.existe}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                    "flex items-center justify-between gap-2",
                    ordem.existe ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                    getStatusStyle(ordem.status, ordem.pausada)
                  )}
                >
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <span className="font-medium text-xs">{ORDEM_LABELS[ordem.tipo]}</span>
                    <span className="text-[10px] opacity-80">
                      {ordem.pausada ? 'Pausada' : (ordem.existe ? getStatusLabel(ordem.status) : 'Sem ordem')}
                    </span>
                    
                    {/* Informações de agendamento para carregamento/instalação */}
                    {(ordem.tipo === 'carregamento' || ordem.tipo === 'instalacao') && ordem.data_agendamento && (
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 opacity-70" />
                          <span className="text-[9px] opacity-70">
                            {format(parseISO(ordem.data_agendamento), 'dd/MM')}
                          </span>
                          {ordem.hora_agendamento && (
                            <>
                              <Clock className="w-2.5 h-2.5 opacity-70 ml-1" />
                              <span className="text-[9px] opacity-70">
                                {ordem.hora_agendamento.slice(0, 5)}
                              </span>
                            </>
                          )}
                        </div>
                        {ordem.responsavel_nome && (
                          <span className="text-[9px] opacity-70 truncate max-w-[120px]">
                            {ordem.responsavel_nome}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Cronômetro da ordem */}
                    <OrdemCronometro ordem={ordem} />
                    
                    {ordem.pausada && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-1 rounded-full bg-red-500/30">
                              <Pause className="w-3 h-3 text-red-400 fill-red-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs font-medium">Motivo da pausa:</p>
                            <p className="text-xs text-zinc-400">{ordem.justificativa_pausa || 'Não informado'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {ordem.responsavel && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5 border border-current/30">
                          <AvatarImage src={ordem.responsavel.foto_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-current/20">
                            {ordem.responsavel.iniciais}
                          </AvatarFallback>
                        </Avatar>
                        {ordem.total_linhas > 0 && (
                          <span className="text-[10px] font-medium opacity-90">
                            {ordem.linhas_concluidas}/{ordem.total_linhas}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Mostrar contador mesmo sem responsável */}
                    {!ordem.responsavel && ordem.total_linhas > 0 && (
                      <span className="text-[10px] font-medium opacity-90">
                        {ordem.linhas_concluidas}/{ordem.total_linhas}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
