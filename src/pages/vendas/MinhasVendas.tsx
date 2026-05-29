import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ShoppingCart, DollarSign, FileCheck, Search, CalendarIcon, Truck, Hammer, ArrowUpDown, ArrowUp, ArrowDown, Download, FileText, FileSpreadsheet, Edit, Trash2, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateVendasRelatorioPDF } from '@/utils/vendasPDFGenerator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ColumnManager } from '@/components/ColumnManager';
import { useColumnConfig, ColumnConfig } from '@/hooks/useColumnConfig';
import { cn } from '@/lib/utils';
import { VendaBloqueadaDialog } from "@/components/vendas/VendaBloqueadaDialog";
import { BlockReason } from "@/hooks/useCanEditVenda";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ProdutoVenda {
  id: string;
  tipo_produto: string;
  desconto_valor: number | null;
}

import { getFormaPagamentoLabel } from '@/utils/formatters';

interface Venda {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  cidade: string | null;
  estado: string | null;
  valor_venda: number | null;
  valor_frete: number | null;
  valor_credito: number | null;
  valor_instalacao: number | null;
  data_venda: string;
  data_prevista_entrega: string | null;
  tipo_entrega: string | null;
  comprovante_url: string | null;
  metodo_pagamento: string | null;
  produtos_vendas: ProdutoVenda[];
  pedidos_producao: { id: string; status: string } | null;
  atendente_id: string | null;
  frete_aprovado: boolean | null;
}

const COLUNAS_DISPONIVEIS: ColumnConfig[] = [
  { id: 'data', label: 'Data', defaultVisible: true },
  { id: 'cliente', label: 'Cliente', defaultVisible: true },
  { id: 'cidade', label: 'Cidade', defaultVisible: true },
  { id: 'previsao', label: 'Prev. Entrega', defaultVisible: true },
  { id: 'expedicao', label: 'Expedição', defaultVisible: true },
  { id: 'pagamento', label: 'Pagamento', defaultVisible: true },
  { id: 'desconto', label: 'Desconto', defaultVisible: false },
  { id: 'acrescimo', label: 'Acréscimo', defaultVisible: false },
  { id: 'instalacao', label: 'Instalação', defaultVisible: false },
  { id: 'frete', label: 'Frete', defaultVisible: false },
  { id: 'valor', label: 'Valor', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
];

type SortField = 'data' | 'cliente' | 'cidade' | 'valor' | 'previsao';
type SortDirection = 'asc' | 'desc';

export default function MinhasVendas() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [mesAtual] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | undefined>(endOfMonth(new Date()));
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados para o dialog de bloqueio
  const [bloqueioDialogOpen, setBloqueioDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState<BlockReason>(null);
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);

  const {
    columns,
    visibleColumns,
    visibleIds,
    toggleColumn,
    setColumnOrder,
    resetColumns
  } = useColumnConfig('minhas_vendas_columns', COLUNAS_DISPONIVEIS);

  const { data: vendas, isLoading } = useQuery({
    queryKey: ['minhas-vendas', user?.id, dataInicio?.toISOString(), dataFim?.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('vendas')
        .select(`
          id,
          cliente_nome,
          cliente_telefone,
          cidade,
          estado,
          valor_venda,
          valor_frete,
          valor_credito,
          valor_instalacao,
          data_venda,
          data_prevista_entrega,
          tipo_entrega,
          comprovante_url,
          atendente_id,
          frete_aprovado,
          metodo_pagamento,
          produtos_vendas(id, tipo_produto, desconto_valor, faturamento),
          pedidos_producao!left(id, status)
        `)
        .eq('atendente_id', user.id)
        .eq('is_rascunho', false);

      if (dataInicio) {
        query = query.gte('data_venda', dataInicio.toISOString());
      }
      if (dataFim) {
        query = query.lte('data_venda', dataFim.toISOString());
      }
      
      const { data, error } = await query.order('data_venda', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as Venda[];
    },
    enabled: !!user?.id
  });

  // Query para rascunhos
  const { data: rascunhos, isLoading: isLoadingRascunhos } = useQuery({
    queryKey: ['rascunhos-vendas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('vendas')
        .select('id, cliente_nome, cidade, estado, valor_venda, data_venda, created_at')
        .eq('atendente_id', user.id)
        .eq('is_rascunho', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Mutation para excluir rascunho
  const deleteRascunhoMutation = useMutation({
    mutationFn: async (vendaId: string) => {
      const { error } = await supabase.rpc('delete_venda_completa', { p_venda_id: vendaId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rascunhos-vendas'] });
      toast.success('Rascunho excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir rascunho');
    }
  });

  // Filtrar e ordenar vendas
  const vendasFiltradas = useMemo(() => {
    if (!vendas) return [];

    let filtered = vendas.filter(venda => {
      if (!searchTerm) return true;
      const termo = searchTerm.toLowerCase();
      return (
        venda.cliente_nome?.toLowerCase().includes(termo) ||
        venda.cliente_telefone?.toLowerCase().includes(termo) ||
        venda.cidade?.toLowerCase().includes(termo)
      );
    });

    // Ordenar
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'data':
          comparison = new Date(a.data_venda).getTime() - new Date(b.data_venda).getTime();
          break;
        case 'cliente':
          comparison = (a.cliente_nome || '').localeCompare(b.cliente_nome || '');
          break;
        case 'cidade':
          comparison = (a.cidade || '').localeCompare(b.cidade || '');
          break;
        case 'valor':
          comparison = (a.valor_venda || 0) - (b.valor_venda || 0);
          break;
        case 'previsao':
          const dateA = a.data_prevista_entrega ? new Date(a.data_prevista_entrega).getTime() : 0;
          const dateB = b.data_prevista_entrega ? new Date(b.data_prevista_entrega).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [vendas, searchTerm, sortField, sortDirection]);

  const totalVendas = vendasFiltradas.length;
  const valorTotal = vendasFiltradas.reduce((acc, v) => {
    return acc + (v.valor_venda || 0) - (v.valor_frete || 0) + (v.valor_credito || 0);
  }, 0);
  const vendasFaturadas = vendasFiltradas.filter(v => v.comprovante_url).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'concluido': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'em_producao': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelado': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pendente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/10 text-blue-300/70 border-blue-500/20';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'em_producao': return 'Em Produção';
      case 'cancelado': return 'Cancelado';
      case 'pendente': return 'Pendente';
      default: return status || 'Aguardando';
    }
  };

  // Função de verificação antes de editar
  const handleEditVenda = async (venda: Venda) => {
    try {
      // Verificar se é o proprietário
      const isOwner = venda.atendente_id === user?.id;
      if (!isOwner && !isAdmin) {
        setBlockReason('nao_proprietario');
        setBloqueioDialogOpen(true);
        return;
      }

      // Verificar faturamento - todos os produtos faturados E frete aprovado
      const produtos = venda.produtos_vendas || [];
      const todosFaturados = produtos.length > 0 && 
        produtos.every((p: any) => p.faturamento === true);
      const freteAprovado = venda.frete_aprovado === true;
      const isFaturada = todosFaturados && freteAprovado;

      // Verificar pedido vinculado
      const hasPedido = !!venda.pedidos_producao?.id;
      setSelectedPedidoId(venda.pedidos_producao?.id || null);

      // Determinar bloqueio
      if (isFaturada && hasPedido) {
        setBlockReason('ambos');
        setBloqueioDialogOpen(true);
      } else if (isFaturada) {
        setBlockReason('faturada');
        setBloqueioDialogOpen(true);
      } else if (hasPedido) {
        setBlockReason('com_pedido');
        setBloqueioDialogOpen(true);
      } else {
        // Pode editar - navegar para página de edição
        navigate(`/vendas/minhas-vendas/editar/${venda.id}`);
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleExportarPDF = () => {
    try {
      const vendasParaRelatorio = vendasFiltradas.map(venda => ({
        data_venda: venda.data_venda,
        cliente_nome: venda.cliente_nome || '',
        cliente_telefone: venda.cliente_telefone || '',
        cidade: venda.cidade || '',
        estado: venda.estado || '',
        previsao_entrega: venda.data_prevista_entrega || '',
        quantidade_produtos: venda.produtos_vendas?.length || 0,
        valor_venda: venda.valor_venda || 0,
        atendente_nome: 'Eu'
      }));

      const totalPortasEnrolar = vendasFiltradas.reduce((acc, v) => {
        return acc + (v.produtos_vendas?.filter(p => p.tipo_produto === 'porta_enrolar').length || 0);
      }, 0);

      generateVendasRelatorioPDF({
        vendas: vendasParaRelatorio,
        stats: {
          totalVendas,
          totalValor: valorTotal,
          totalPortasEnrolar
        },
        filtros: {
          minhasVendas: true,
          vendasMesAtual: false,
          busca: searchTerm
        }
      });

      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  const handleExportarExcel = () => {
    try {
      const dadosExcel = vendasFiltradas.map(venda => ({
        'Data Venda': format(new Date(venda.data_venda), 'dd/MM/yyyy', { locale: ptBR }),
        'Cliente': venda.cliente_nome || '-',
        'Telefone': venda.cliente_telefone || '-',
        'Cidade': venda.cidade || '-',
        'Estado': venda.estado || '-',
        'Previsão Entrega': venda.data_prevista_entrega 
          ? format(new Date(venda.data_prevista_entrega), 'dd/MM/yyyy', { locale: ptBR })
          : '-',
        'Qtd Produtos': venda.produtos_vendas?.length || 0,
        'Valor (sem frete)': (venda.valor_venda || 0) - (venda.valor_frete || 0) + (venda.valor_credito || 0),
        'Valor Total': (venda.valor_venda || 0) + (venda.valor_credito || 0),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Minhas Vendas');
      
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
        { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
      ];
      
      const fileName = `minhas-vendas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Arquivo ${fileName} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast.error('Erro ao gerar arquivo Excel.');
    }
  };

  const renderCell = (venda: Venda, columnId: string) => {
    switch (columnId) {
      case 'data':
        return format(new Date(venda.data_venda), 'dd/MM/yy');
      case 'cliente':
        return (
          <div className="max-w-[180px]">
            <p className="truncate font-medium">{venda.cliente_nome || 'N/I'}</p>
            {venda.cliente_telefone && (
              <p className="text-xs text-muted-foreground truncate">{venda.cliente_telefone}</p>
            )}
          </div>
        );
      case 'cidade':
        return venda.cidade && venda.estado 
          ? `${venda.cidade}/${venda.estado}` 
          : venda.cidade || '-';
      case 'previsao':
        return venda.data_prevista_entrega 
          ? format(new Date(venda.data_prevista_entrega), 'dd/MM/yy') 
          : '-';
      case 'expedicao':
        return venda.tipo_entrega === 'instalacao' 
          ? <span title="Instalação"><Hammer className="h-4 w-4 text-orange-400" /></span>
          : <span title="Entrega"><Truck className="h-4 w-4 text-blue-400" /></span>;
      case 'pagamento':
        return getFormaPagamentoLabel(venda.metodo_pagamento);
      case 'desconto':
        const totalDesconto = venda.produtos_vendas?.reduce((acc, p) => acc + (p.desconto_valor || 0), 0) || 0;
        return totalDesconto > 0 ? formatCurrency(totalDesconto) : '-';
      case 'acrescimo':
        return (venda.valor_credito || 0) > 0 ? formatCurrency(venda.valor_credito!) : '-';
      case 'instalacao':
        return (venda.valor_instalacao || 0) > 0 ? formatCurrency(venda.valor_instalacao!) : '-';
      case 'frete':
        return (venda.valor_frete || 0) > 0 ? formatCurrency(venda.valor_frete!) : '-';
      case 'valor':
        const valorSemFrete = (venda.valor_venda || 0) - (venda.valor_frete || 0) + (venda.valor_credito || 0);
        return <span className="font-semibold">{formatCurrency(valorSemFrete)}</span>;
      case 'status':
        const status = venda.pedidos_producao?.status || null;
        return (
          <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", getStatusColor(status))}>
            {getStatusLabel(status)}
          </span>
        );
      default:
        return null;
    }
  };

  const cardClass = "p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10";
  const statCardInner = "p-4 flex items-center gap-4";

  return (
    <MinimalistLayout 
      title="Minhas Vendas" 
      subtitle={format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Minhas Vendas" }
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/vendas/minhas-vendas/correcao')}
            className="h-10 px-5 rounded-lg font-medium text-white border
                       bg-gradient-to-r from-purple-500 to-purple-700 border-purple-400/30 
                       shadow-lg shadow-purple-500/30
                       hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40
                       transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Pedido de Correção</span>
            <span className="sm:hidden">Correção</span>
          </button>
          <button 
            onClick={() => navigate('/vendas/minhas-vendas/nova')}
            className="h-10 px-5 rounded-lg font-medium text-white border
                       bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400/30 
                       shadow-lg shadow-blue-500/30
                       hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40
                       transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        </div>
      }
    >
      {/* Seção de Rascunhos */}
      {rascunhos && rascunhos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            Rascunhos ({rascunhos.length})
          </h2>
          <div className="px-10">
            <Carousel opts={{ align: 'start' }} className="w-full">
              <CarouselContent className="-ml-3">
                {rascunhos.map((rascunho) => (
                  <CarouselItem key={rascunho.id} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className={cn(cardClass, "p-4 space-y-3")}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Rascunho
                        </span>
                        <span className="text-xs text-white/40">
                          {format(new Date(rascunho.created_at), 'dd/MM/yy HH:mm')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white truncate">
                          {rascunho.cliente_nome || 'Cliente não informado'}
                        </p>
                        {(rascunho.cidade || rascunho.estado) && (
                          <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {[rascunho.cidade, rascunho.estado].filter(Boolean).join('/')}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rascunho.valor_venda || 0)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/vendas/minhas-vendas/editar/${rascunho.id}`)}
                          className="flex-1 h-8 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Edit className="w-3 h-3" />
                          Continuar
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="h-8 w-8 rounded-lg text-xs border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400/50 transition-all flex items-center justify-center">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O rascunho será excluído permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRascunhoMutation.mutate(rascunho.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      )}

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={cardClass}>
          <div className={statCardInner}>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10">
              <ShoppingCart className="w-6 h-6 text-white/80" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Total de Vendas</p>
              <p className="text-2xl font-bold text-white">{totalVendas}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className={statCardInner}>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10">
              <DollarSign className="w-6 h-6 text-white/80" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Valor Total</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(valorTotal)}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className={statCardInner}>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10">
              <FileCheck className="w-6 h-6 text-white/80" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Com Comprovante</p>
              <p className="text-2xl font-bold text-white">{vendasFaturadas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar cliente, telefone, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm">
                {dataInicio && dataFim 
                  ? `${format(dataInicio, 'dd/MM')} - ${format(dataFim, 'dd/MM')}`
                  : 'Período'
                }
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="end">
            <Calendar
              mode="range"
              selected={{ from: dataInicio, to: dataFim }}
              onSelect={(range) => {
                setDataInicio(range?.from);
                setDataFim(range?.to);
              }}
              locale={ptBR}
              className="bg-slate-900"
            />
          </PopoverContent>
        </Popover>

        <ColumnManager
          columns={columns}
          visibleIds={visibleIds}
          onToggle={toggleColumn}
          onReorder={setColumnOrder}
          onReset={resetColumns}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="text-sm">Exportar</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={handleExportarPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportarExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela */}
      <div className={cn(cardClass, "overflow-hidden")}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 bg-white/5" />
            ))}
          </div>
        ) : vendasFiltradas.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  {visibleColumns.map((col) => {
                    const isSortable = ['data', 'cliente', 'cidade', 'valor', 'previsao'].includes(col.id);
                    return (
                      <TableHead 
                        key={col.id}
                        className={cn(
                          "text-white/60 font-semibold text-xs uppercase tracking-wider",
                          isSortable && "cursor-pointer hover:text-white select-none"
                        )}
                        onClick={() => isSortable && handleSort(col.id as SortField)}
                      >
                        <div className="flex items-center">
                          {col.label}
                          {isSortable && getSortIcon(col.id as SortField)}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.map((venda) => (
                  <TableRow 
                    key={venda.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => handleEditVenda(venda)}
                  >
                    {visibleColumns.map((col) => (
                      <TableCell key={col.id} className="text-white/80">
                        {renderCell(venda, col.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-white/40" />
            </div>
            <p className="text-white/60 mb-4">Nenhuma venda encontrada</p>
            <button 
              onClick={() => navigate('/vendas/minhas-vendas/nova')}
              className="h-10 px-5 rounded-lg font-medium border border-white/10 bg-white/5 text-white/80
                         hover:bg-white/10 hover:text-white hover:border-white/20
                         transition-all duration-200 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar primeira venda
            </button>
          </div>
        )}
      </div>

      {/* Dialog de bloqueio */}
      <VendaBloqueadaDialog
        open={bloqueioDialogOpen}
        onOpenChange={setBloqueioDialogOpen}
        blockReason={blockReason}
        pedidoId={selectedPedidoId}
      />
    </MinimalistLayout>
  );
}
