import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, Filter, MapPin, Truck, Package, Hammer, Wrench, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { InstalacoesHeaderActions } from "@/components/instalacoes/InstalacoesHeaderActions";

import { useOrdensInstalacao, OrdemInstalacao } from "@/hooks/useOrdensInstalacao";
import { useNeoInstalacoesListagem } from "@/hooks/useNeoInstalacoes";
import { useNeoCorrecoesListagem } from "@/hooks/useNeoCorrecoes";
import { OrdemInstalacaoRow } from "@/components/instalacoes/OrdemInstalacaoRow";
import { NeoInstalacaoRow } from "@/components/instalacoes/NeoInstalacaoRow";
import { NeoCorrecaoRow } from "@/components/instalacoes/NeoCorrecaoRow";
import { NeoFinalizadoRow } from "@/components/instalacoes/NeoFinalizadoRow";
import { useNeoFinalizados } from "@/hooks/useNeoFinalizados";
import { PedidoDetalhesSheet } from "@/components/pedidos/PedidoDetalhesSheet";
import { NeoInstalacao } from "@/types/neoInstalacao";
import { NeoCorrecao } from "@/types/neoCorrecao";
import { cn } from "@/lib/utils";

export default function OrdensInstalacoesLogistica() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEquipe, setFilterEquipe] = useState<string>("todas");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; ordem: OrdemInstalacao | null }>({
    open: false,
    ordem: null
  });
  const [confirmNeoInstalacaoDialog, setConfirmNeoInstalacaoDialog] = useState<{ 
    open: boolean; 
    neoInstalacao: NeoInstalacao | null 
  }>({ open: false, neoInstalacao: null });
  const [confirmNeoCorrecaoDialog, setConfirmNeoCorrecaoDialog] = useState<{ 
    open: boolean; 
    neoCorrecao: NeoCorrecao | null 
  }>({ open: false, neoCorrecao: null });
  
  // Estado para a downbar de detalhes do pedido
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  const { ordens, isLoading, concluirOrdem, isConcluindo } = useOrdensInstalacao();
  
  const { 
    neoInstalacoes, 
    isLoading: isLoadingNeoInstalacoes, 
    concluirNeoInstalacao, 
    isConcluindo: isConcluindoNeoInstalacao 
  } = useNeoInstalacoesListagem();

  const { 
    neoCorrecoes, 
    isLoading: isLoadingNeoCorrecoes, 
    concluirNeoCorrecao 
  } = useNeoCorrecoesListagem();
  
  const isConcluindoNeoCorrecao = concluirNeoCorrecao.isPending;

  const { finalizados, isLoading: isLoadingFinalizados } = useNeoFinalizados();




  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Extrair equipes e estados únicos
  const { equipes, estados } = useMemo(() => {
    const equipesSet = new Set<string>();
    const estadosSet = new Set<string>();

    ordens.forEach(ordem => {
      if (ordem.equipe?.nome) equipesSet.add(ordem.equipe.nome);
      const estado = ordem.venda?.estado || ordem.estado;
      if (estado) estadosSet.add(estado);
    });

    return {
      equipes: Array.from(equipesSet).sort(),
      estados: Array.from(estadosSet).sort()
    };
  }, [ordens]);

  // Filtrar ordens
  const ordensFiltradas = useMemo(() => {
    return ordens.filter(ordem => {
      const nomeCliente = ordem.venda?.cliente_nome || ordem.nome_cliente || "";
      const numeroPedido = ordem.pedido?.numero_pedido || "";
      const matchSearch = searchTerm === "" || 
        nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        numeroPedido.toLowerCase().includes(searchTerm.toLowerCase());

      const matchEquipe = filterEquipe === "todas" || ordem.equipe?.nome === filterEquipe;

      const estado = ordem.venda?.estado || ordem.estado;
      const matchEstado = filterEstado === "todos" || estado === filterEstado;

      return matchSearch && matchEquipe && matchEstado;
    });
  }, [ordens, searchTerm, filterEquipe, filterEstado]);

  // Separar ordens por status de carregamento e por tipo
  const { ordensNaoCarregadas, ordensCarregadas, totalInstalacoes, totalCorrecoes } = useMemo(() => {
    return {
      ordensNaoCarregadas: ordensFiltradas.filter(o => !o.carregamento_concluido),
      ordensCarregadas: ordensFiltradas.filter(o => o.carregamento_concluido),
      totalInstalacoes: ordensFiltradas.filter(o => o.tipo_ordem !== 'correcao').length,
      totalCorrecoes: ordensFiltradas.filter(o => o.tipo_ordem === 'correcao').length,
    };
  }, [ordensFiltradas]);

  const handleConcluir = async () => {
    if (!confirmDialog.ordem) return;
    try {
      await concluirOrdem(confirmDialog.ordem.id);
      setConfirmDialog({ open: false, ordem: null });
    } catch (error) {
      console.error("Erro ao concluir:", error);
    }
  };

  const handleConcluirNeoInstalacao = async () => {
    if (!confirmNeoInstalacaoDialog.neoInstalacao) return;
    try {
      await concluirNeoInstalacao(confirmNeoInstalacaoDialog.neoInstalacao.id);
      setConfirmNeoInstalacaoDialog({ open: false, neoInstalacao: null });
    } catch (error) {
      console.error("Erro ao concluir neo instalação:", error);
    }
  };

  const handleConcluirNeoCorrecao = async () => {
    if (!confirmNeoCorrecaoDialog.neoCorrecao) return;
    try {
      await concluirNeoCorrecao.mutateAsync(confirmNeoCorrecaoDialog.neoCorrecao.id);
      setConfirmNeoCorrecaoDialog({ open: false, neoCorrecao: null });
    } catch (error) {
      console.error("Erro ao concluir neo correção:", error);
    }
  };

  // Handler para abrir detalhes do pedido
  const handleOpenDetalhes = (ordem: OrdemInstalacao) => {
    if (ordem.pedido) {
      const vendaComProdutosVendas = ordem.venda ? {
        ...ordem.venda,
        produtos_vendas: ordem.venda.produtos
      } : null;

      const pedidoForSheet = {
        id: ordem.pedido.id,
        numero_pedido: ordem.pedido.numero_pedido,
        numero_mes: (ordem.pedido as any).numero_mes,
        mes_vigencia: (ordem.pedido as any).mes_vigencia,
        etapa_atual: ordem.pedido.etapa_atual,
        vendas: vendaComProdutosVendas
      };
      setSelectedPedido(pedidoForSheet);
      setShowDetalhes(true);
    }
  };

  return (
    <MinimalistLayout 
      title="Ordens de Instalação" 
      backPath="/logistica"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Logística', path: '/logistica' },
        { label: 'Instalações' }
      ]}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <InstalacoesHeaderActions />
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      }
    >
      <div className="min-h-screen p-4 md:p-4 lg:p-6">
        <div className="max-w-[1800px] mx-auto space-y-4">
          {/* Header */}
          <div className={cn(
            "flex flex-col gap-4 transition-all duration-500",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Instalações</h1>
                <p className="text-muted-foreground text-sm">
                  <span className="text-blue-500 font-medium">{totalInstalacoes} instalações</span>
                  {' • '}
                  <span className="text-purple-500 font-medium">{totalCorrecoes} correções</span>
                  {` • ${ordensNaoCarregadas.length} aguardando • ${ordensCarregadas.length} carregadas`}
                  {neoInstalacoes.length > 0 && ` • ${neoInstalacoes.length} avulsas`}
                  {neoCorrecoes.length > 0 && ` • ${neoCorrecoes.length} correções avulsas`}
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterEquipe} onValueChange={setFilterEquipe}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as equipes</SelectItem>
                {equipes.map(equipe => (
                  <SelectItem key={equipe} value={equipe}>{equipe}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                {estados.map(estado => (
                  <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid 3 colunas: Aguardando, Carregadas, Concluídas */}
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-3 gap-4 transition-all duration-500 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            {/* Coluna 1: Aguardando Carregamento */}
            <Card className="border-amber-500/30">
              <div className="flex items-center gap-2 p-3 border-b border-amber-500/20 bg-amber-500/5 rounded-t-lg">
                <Truck className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold">Aguardando Carregamento</span>
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 ml-auto">
                  {ordensNaoCarregadas.length}
                </Badge>
              </div>
              <CardContent className="p-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
                ) : ordensNaoCarregadas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma instalação aguardando.</div>
                ) : (
                  <div className="space-y-1">
                    {ordensNaoCarregadas.map((ordem) => (
                      <OrdemInstalacaoRow
                        key={ordem.id}
                        ordem={ordem}
                        isConcluindo={isConcluindo}
                        showCarregador={false}
                        onClick={handleOpenDetalhes}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 2: Carregadas */}
            <Card className="border-green-500/30">
              <div className="flex items-center gap-2 p-3 border-b border-green-500/20 bg-green-500/5 rounded-t-lg">
                <Package className="h-5 w-5 text-green-500" />
                <span className="text-sm font-semibold">Carregadas</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-600 ml-auto">
                  {ordensCarregadas.length}
                </Badge>
              </div>
              <CardContent className="p-2 max-h-[600px] overflow-y-auto">
                {ordensCarregadas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma instalação carregada.</div>
                ) : (
                  <div className="space-y-1">
                    {ordensCarregadas.map((ordem) => (
                      <OrdemInstalacaoRow
                        key={ordem.id}
                        ordem={ordem}
                        onConcluir={(o) => setConfirmDialog({ open: true, ordem: o })}
                        isConcluindo={isConcluindo}
                        showCarregador={true}
                        onClick={handleOpenDetalhes}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 3: Concluídas */}
            <Card className="border-emerald-500/30">
              <div className="flex items-center gap-2 p-3 border-b border-emerald-500/20 bg-emerald-500/5 rounded-t-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-semibold">Concluídas</span>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 ml-auto">
                  {finalizados.length}
                </Badge>
              </div>
              <CardContent className="p-2 max-h-[600px] overflow-y-auto">
                {isLoadingFinalizados ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
                ) : finalizados.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma concluída nos últimos 30 dias.</div>
                ) : (
                  <div className="space-y-1">
                    {finalizados.map((item) => (
                      <NeoFinalizadoRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grid 2 colunas: Avulsas */}
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-500 delay-300",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            {/* Instalações Avulsas */}
            <Card className="border-orange-500/30">
              <div className="flex items-center gap-2 p-3 border-b border-orange-500/20 bg-orange-500/5 rounded-t-lg">
                <Hammer className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-semibold">Instalações Avulsas</span>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 ml-auto">
                  {neoInstalacoes.length}
                </Badge>
              </div>
              <CardContent className="p-2 max-h-[600px] overflow-y-auto">
                {isLoadingNeoInstalacoes ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
                ) : neoInstalacoes.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma instalação avulsa pendente.</div>
                ) : (
                  <div className="space-y-1">
                    {neoInstalacoes.map((neo) => (
                      <NeoInstalacaoRow
                        key={neo.id}
                        neoInstalacao={neo}
                        onConcluir={(n) => setConfirmNeoInstalacaoDialog({ open: true, neoInstalacao: n })}
                        isConcluindo={isConcluindoNeoInstalacao}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Correções Avulsas */}
            <Card className="border-purple-500/30">
              <div className="flex items-center gap-2 p-3 border-b border-purple-500/20 bg-purple-500/5 rounded-t-lg">
                <Wrench className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-semibold">Correções Avulsas</span>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 ml-auto">
                  {neoCorrecoes.length}
                </Badge>
              </div>
              <CardContent className="p-2 max-h-[600px] overflow-y-auto">
                {isLoadingNeoCorrecoes ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
                ) : neoCorrecoes.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma correção avulsa pendente.</div>
                ) : (
                  <div className="space-y-1">
                    {neoCorrecoes.map((neo) => (
                      <NeoCorrecaoRow
                        key={neo.id}
                        neoCorrecao={neo}
                        onConcluir={(n) => setConfirmNeoCorrecaoDialog({ open: true, neoCorrecao: n })}
                        isConcluindo={isConcluindoNeoCorrecao}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, ordem: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Instalação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta instalação como concluída?
              <br /><br />
              <strong>Pedido:</strong> #{confirmDialog.ordem?.pedido?.numero_pedido}
              <br />
              <strong>Cliente:</strong> {confirmDialog.ordem?.venda?.cliente_nome || confirmDialog.ordem?.nome_cliente}
              <br /><br />
              O pedido será automaticamente movido para a etapa <strong>"Finalizado"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConcluir}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Neo Instalação */}
      <AlertDialog 
        open={confirmNeoInstalacaoDialog.open} 
        onOpenChange={(open) => setConfirmNeoInstalacaoDialog({ open, neoInstalacao: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Instalação Avulsa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta instalação avulsa como concluída?
              <br /><br />
              <strong>Cliente:</strong> {confirmNeoInstalacaoDialog.neoInstalacao?.nome_cliente}
              <br /><br />
              A instalação será movida para <strong>"Finalizado"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConcluirNeoInstalacao}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Neo Correção */}
      <AlertDialog 
        open={confirmNeoCorrecaoDialog.open} 
        onOpenChange={(open) => setConfirmNeoCorrecaoDialog({ open, neoCorrecao: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Correção Avulsa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta correção avulsa como concluída?
              <br /><br />
              <strong>Cliente:</strong> {confirmNeoCorrecaoDialog.neoCorrecao?.nome_cliente}
              <br /><br />
              A correção será movida para <strong>"Finalizado"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConcluirNeoCorrecao}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downbar de Detalhes do Pedido */}
      {selectedPedido && (
        <PedidoDetalhesSheet 
          pedido={selectedPedido} 
          open={showDetalhes} 
          onOpenChange={setShowDetalhes} 
        />
      )}
    </MinimalistLayout>
  );
}
