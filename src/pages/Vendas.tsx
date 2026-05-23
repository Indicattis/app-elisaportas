import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendas } from '@/hooks/useVendas';
import { useAuth } from '@/hooks/useAuth';
import { ProductIconsSummary } from '@/components/vendas/ProductIconsSummary';
import { FaturamentoAnualChart } from '@/components/vendas/FaturamentoAnualChart';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, DollarSign, ShoppingCart, Package, CalendarIcon, TrendingUp, FileText, X, DoorClosed, Home, FileSignature, Download, Paperclip, Receipt, FileSpreadsheet, Pencil, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
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
} from "@/components/ui/alert-dialog";
import { generateVendasRelatorioPDF } from '@/utils/vendasPDFGenerator';
import { generateVendaPDF } from '@/utils/vendaIndividualPDFGenerator';
import { useToast } from '@/hooks/use-toast';
import { ContratosVendaModal } from '@/components/vendas/ContratosVendaModal';
import { ComprovanteUploadModal } from '@/components/vendas/ComprovanteUploadModal';
import { ConfirmarExclusaoVendaModal } from '@/components/vendas/ConfirmarExclusaoVendaModal';
import { VendaBloqueadaDialog } from '@/components/vendas/VendaBloqueadaDialog';
import { BlockReason } from '@/hooks/useCanEditVenda';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export default function Vendas() {
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const { vendas, isLoading, deleteVenda, isDeleting } = useVendas();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [contratosModalOpen, setContratosModalOpen] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState<string>('');
  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<{ id: string; clienteNome: string } | null>(null);
  const [selectedVendaForComprovante, setSelectedVendaForComprovante] = useState<any>(null);
  
  // Estados para bloqueio de edição
  const [bloqueioDialogOpen, setBloqueioDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState<BlockReason>(null);
  const [blockedPedidoId, setBlockedPedidoId] = useState<string | null>(null);
  
  // Estados para filtros avançados
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedAtendente, setSelectedAtendente] = useState<string>("todos");
  const [sortByValue, setSortByValue] = useState<'desc' | 'asc' | 'none'>('none');
  const [filterPrevisaoEntrega, setFilterPrevisaoEntrega] = useState<DateRange | undefined>();
  const [atendentes, setAtendentes] = useState<any[]>([]);

  // Buscar lista de atendentes
  useEffect(() => {
    const fetchAtendentes = async () => {
      const { data } = await supabase
        .from('admin_users')
        .select('id, nome, user_id')
        .order('nome');
      if (data) setAtendentes(data);
    };
    fetchAtendentes();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleExportarPDF = () => {
    try {
      const vendasParaRelatorio = filteredVendas?.map(venda => ({
        data_venda: venda.data_venda,
        cliente_nome: venda.cliente_nome,
        cliente_telefone: venda.cliente_telefone || '',
        cidade: venda.cidade,
        estado: venda.estado,
        previsao_entrega: venda.data_prevista_entrega || '',
        quantidade_produtos: venda.produtos?.length || 0,
        valor_venda: venda.valor_venda || 0,
        atendente_nome: venda.atendente?.nome || 'Não informado'
      })) || [];

      generateVendasRelatorioPDF({
        vendas: vendasParaRelatorio,
        stats,
        filtros: {
          minhasVendas: selectedAtendente !== 'todos',
          vendasMesAtual: false,
          busca: searchTerm
        }
      });

      toast({
        title: "Relatório gerado",
        description: "O relatório foi exportado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao exportar o relatório.",
        variant: "destructive",
      });
    }
  };

  const handleExportarExcel = () => {
    try {
      const dadosExcel = filteredVendas?.map(venda => ({
        'Data Venda': format(new Date(venda.data_venda), 'dd/MM/yyyy', { locale: ptBR }),
        'Cliente': venda.cliente_nome,
        'CPF': venda.cpf_cliente || '-',
        'Telefone': venda.cliente_telefone || '-',
        'Cidade': venda.cidade,
        'Estado': venda.estado,
        'Previsão Entrega': venda.data_prevista_entrega 
          ? format(new Date(venda.data_prevista_entrega), 'dd/MM/yyyy', { locale: ptBR })
          : '-',
        'Qtd Produtos': venda.produtos?.length || 0,
        'Valor (sem frete)': (venda.valor_venda || 0) - (venda.valor_frete || 0) + (venda.valor_credito || 0),
        'Valor Total': (venda.valor_venda || 0) + (venda.valor_credito || 0),
        'Vendedor': venda.atendente?.nome || 'Não informado',
      })) || [];

      const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');
      
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 20 }
      ];
      
      const fileName = `vendas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Excel gerado",
        description: `Arquivo ${fileName} exportado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: "Erro ao gerar Excel",
        description: "Ocorreu um erro ao exportar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadVendaPDF = async (venda: any) => {
    try {
      // Buscar produtos da venda com informações da cor
      const { data: produtos } = await supabase
        .from('produtos_vendas')
        .select(`
          *,
          cor:catalogo_cores(nome, codigo_hex)
        `)
        .eq('venda_id', venda.id);

      generateVendaPDF({
        id: venda.id,
        dataVenda: venda.data_venda,
        dataPrevistaEntrega: venda.data_prevista_entrega,
        cliente: {
          nome: venda.cliente_nome,
          cpf: venda.cpf_cliente,
          telefone: venda.cliente_telefone,
          email: venda.cliente_email,
          cidade: venda.cidade,
          estado: venda.estado,
          cep: venda.cep,
          bairro: venda.bairro,
        },
        produtos: produtos || [],
        valores: {
          valorVenda: venda.valor_venda,
          valorFrete: venda.valor_frete,
          valorInstalacao: venda.valor_instalacao,
          valorEntrada: venda.valor_entrada,
          valorAReceber: venda.valor_a_receber,
        },
        formaPagamento: venda.forma_pagamento || venda.metodo_pagamento,
        observacoes: venda.observacoes_venda,
        atendente: venda.atendente,
      });

      toast({
        title: "PDF gerado",
        description: "O comprovante de venda foi baixado.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o comprovante.",
        variant: "destructive",
      });
    }
  };

  // Função para verificar se pode editar e navegar
  const handleEditVenda = async (venda: any) => {
    try {
      // Verificar se é o proprietário ou admin
      const isOwner = venda.atendente_id === user?.id;
      if (!isOwner && !isAdmin) {
        setBlockReason('nao_proprietario');
        setBloqueioDialogOpen(true);
        return;
      }

      // Verificar se está faturada
      const { data: vendaData, error: vendaError } = await supabaseClient
        .from('vendas')
        .select('*, produtos_vendas(faturamento), frete_aprovado')
        .eq('id', venda.id)
        .single();

      if (vendaError) throw vendaError;

      const produtos = vendaData.produtos_vendas || [];
      const todosProdutosFaturados = Array.isArray(produtos) && 
        produtos.length > 0 && 
        produtos.every((p: any) => p.faturamento === true);
      const freteAprovado = vendaData.frete_aprovado === true;
      const isFaturada = todosProdutosFaturados && freteAprovado;

      // Verificar se existe pedido vinculado
      const { data: pedido } = await supabaseClient
        .from('pedidos_producao')
        .select('id')
        .eq('venda_id', venda.id)
        .maybeSingle();

      const hasPedido = !!pedido;

      // Determinar razão do bloqueio
      if (isFaturada && hasPedido) {
        setBlockReason('ambos');
        setBlockedPedidoId(pedido?.id || null);
        setBloqueioDialogOpen(true);
        return;
      } else if (isFaturada) {
        setBlockReason('faturada');
        setBloqueioDialogOpen(true);
        return;
      } else if (hasPedido) {
        setBlockReason('com_pedido');
        setBlockedPedidoId(pedido?.id || null);
        setBloqueioDialogOpen(true);
        return;
      }

      // Se passou todas as verificações, navegar para edição
      navigate(`/dashboard/vendas/${venda.id}/editar`);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar as permissões de edição.",
        variant: "destructive",
      });
    }
  };

  const filteredVendas = useMemo(() => {
    let result = vendas?.filter(venda => {
      // Filtro de busca textual
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        venda.cliente_nome?.toLowerCase().includes(search) ||
        venda.cliente_telefone?.toLowerCase().includes(search) ||
        venda.cidade?.toLowerCase().includes(search) ||
        venda.estado?.toLowerCase().includes(search)
      );

      // Filtro de período de data
      if (dateRange?.from && dateRange?.to) {
        const dataVenda = new Date(venda.data_venda);
        if (dataVenda < dateRange.from || dataVenda > dateRange.to) return false;
      }

      // Filtro por atendente
      if (selectedAtendente !== "todos" && venda.atendente_id !== selectedAtendente) {
        return false;
      }

      // Filtro de previsão de entrega
      if (filterPrevisaoEntrega?.from && filterPrevisaoEntrega?.to && venda.data_prevista_entrega) {
        const previsao = new Date(venda.data_prevista_entrega);
        if (previsao < filterPrevisaoEntrega.from || previsao > filterPrevisaoEntrega.to) {
          return false;
        }
      }

      return matchesSearch;
    }) || [];

    // Ordenação por valor (incluindo crédito)
    if (sortByValue !== 'none') {
      result = [...result].sort((a, b) => {
        const valorA = (a.valor_venda || 0) + (a.valor_credito || 0);
        const valorB = (b.valor_venda || 0) + (b.valor_credito || 0);
        return sortByValue === 'desc' ? valorB - valorA : valorA - valorB;
      });
    }

    return result;
  }, [vendas, searchTerm, dateRange, selectedAtendente, sortByValue, filterPrevisaoEntrega]);

  // Estatísticas baseadas nos filtros (excluindo frete)
  const stats = useMemo(() => {
    if (!filteredVendas) return { totalVendas: 0, totalValor: 0, totalPortasEnrolar: 0 };
    
    return {
      totalVendas: filteredVendas.length,
      totalValor: filteredVendas.reduce((sum, v) => {
        // Calcula o valor sem frete + crédito: valor_venda - valor_frete + valor_credito
        const valorSemFrete = (v.valor_venda || 0) - (v.valor_frete || 0) + (v.valor_credito || 0);
        return sum + valorSemFrete;
      }, 0),
      totalPortasEnrolar: filteredVendas.reduce((sum, v) => {
        const portasEnrolar = v.produtos?.filter((p: any) => p.tipo_produto === 'porta_enrolar') || [];
        return sum + portasEnrolar.reduce((acc: number, p: any) => acc + (p.quantidade || 1), 0);
      }, 0),
    };
  }, [filteredVendas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-3 px-3 sm:p-6 space-y-3 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Vendas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Gerencie suas vendas e faturamentos</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => window.open('https://crm.elisaportas.com', '_blank')} className="h-8 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial">
            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-2">CRM</span>
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/vendas/contratos')} className="h-8 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial">
            <FileSignature className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-2">Contratos</span>
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/vendas/tabela-precos')} className="h-8 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-2">Preços</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial">
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-2">Exportar</span>
              </Button>
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
          <Button onClick={() => navigate('/dashboard/vendas/nova')} className="h-8 sm:h-10 text-xs sm:text-sm flex-1 sm:flex-initial">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-2">Nova</span>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Card className="flex-1">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Vendas</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.totalVendas}</p>
            </div>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Valor</p>
              <p className="text-base sm:text-xl font-bold">{formatCurrency(stats.totalValor)}</p>
            </div>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Portas de Enrolar</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.totalPortasEnrolar}</p>
            </div>
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Faturamento Anual */}
      <FaturamentoAnualChart />

      <Card className="max-w-full overflow-hidden">
        <CardContent className="p-2 sm:p-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Busca - ocupa 2 colunas no mobile */}
            <div className="col-span-2 sm:col-span-1">
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs w-full"
                />
              </div>
            </div>

            {/* Período */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium truncate">Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-8 justify-start text-left font-normal text-[10px]"
                  >
                    <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM", { locale: ptBR })}-{format(dateRange.to, "dd/MM", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM", { locale: ptBR })
                        )
                      ) : (
                        "Período"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Vendedor */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium truncate">Vendedor</label>
              <Select value={selectedAtendente} onValueChange={setSelectedAtendente}>
                <SelectTrigger className="h-8 text-[10px] z-50 bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="todos">Todos</SelectItem>
                  {atendentes.map((atendente) => (
                    <SelectItem key={atendente.user_id} value={atendente.user_id}>
                      {atendente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ordenar */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium truncate">Ordenar</label>
              <Select value={sortByValue} onValueChange={(v) => setSortByValue(v as any)}>
                <SelectTrigger className="h-8 text-[10px] z-50 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="none">Data</SelectItem>
                  <SelectItem value="desc">Maior</SelectItem>
                  <SelectItem value="asc">Menor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Previsão */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium truncate">Previsão</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-8 justify-start text-left font-normal text-[10px]"
                  >
                    <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {filterPrevisaoEntrega?.from ? (
                        filterPrevisaoEntrega.to ? (
                          <>
                            {format(filterPrevisaoEntrega.from, "dd/MM", { locale: ptBR })}-{format(filterPrevisaoEntrega.to, "dd/MM", { locale: ptBR })}
                          </>
                        ) : (
                          format(filterPrevisaoEntrega.from, "dd/MM", { locale: ptBR })
                        )
                      ) : (
                        "Previsão"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={filterPrevisaoEntrega}
                    onSelect={setFilterPrevisaoEntrega}
                    numberOfMonths={1}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Botão Limpar - aparece somente quando há filtros ativos */}
            {(dateRange?.from || selectedAtendente !== "todos" || sortByValue !== "none" || filterPrevisaoEntrega?.from) && (
              <div className="col-span-2 sm:col-span-1 flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDateRange(undefined);
                    setSelectedAtendente("todos");
                    setSortByValue("none");
                    setFilterPrevisaoEntrega(undefined);
                  }}
                  className="h-8 text-[10px] w-full"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-full overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">

            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  {/* Mobile: 2 colunas */}
                  <TableHead className="text-[10px] md:hidden">Cliente</TableHead>
                  <TableHead className="text-[10px] text-right md:hidden">Valor/Ações</TableHead>
                  {/* Desktop: todas as colunas - foto do atendente primeiro */}
                  <TableHead className="hidden md:table-cell text-[10px] w-8"></TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">Data</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">Cliente</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">CPF</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">Telefone</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">Cidade/Estado</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">Previsão</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px]">Produtos</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] text-center">VP</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] text-right">Valor Total</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] text-right">Com Frete</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendas?.map((venda) => (
                      <TableRow 
                        key={venda.id} 
                        className="h-[30px] max-h-[30px] cursor-pointer hover:bg-muted/50"
                        onDoubleClick={() => navigate(`/dashboard/vendas/${venda.id}/view`)}
                      >
                        {/* Mobile: Coluna 1 - Cliente + Info */}
                        <TableCell className="py-1 px-2 md:hidden">
                          <div className="space-y-1">
                            <div className="font-medium text-xs truncate max-w-[150px]">{venda.cliente_nome}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {format(new Date(venda.data_venda), "dd/MM/yy", { locale: ptBR })}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {venda.cidade}/{venda.estado}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <ProductIconsSummary venda={venda} />
                              {venda.atendente && (
                                <Avatar className="h-4 w-4 ml-1">
                                  <AvatarImage src={venda.atendente?.foto_perfil_url || ''} />
                                  <AvatarFallback className="text-[8px]">
                                    {venda.atendente?.nome?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        </TableCell>

                         {/* Mobile: Coluna 2 - Valor + Ações */}
                        <TableCell className="py-1 px-2 md:hidden text-right">
                          <div className="space-y-1">
                            <div className="font-bold text-xs">{formatCurrency((venda.valor_venda || 0) + (venda.valor_credito || 0))}</div>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleEditVenda(venda); }}
                                className="h-7 w-7"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDownloadVendaPDF(venda); }}
                                className="h-7 w-7"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVendaId(venda.id);
                                  setContratosModalOpen(true);
                                }}
                                className="h-7 w-7"
                              >
                                <FileSignature className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVendaForComprovante(venda);
                                  setComprovanteModalOpen(true);
                                }}
                                className="h-7 w-7"
                              >
                                <Paperclip className={cn("h-3 w-3", venda.comprovante_url && "text-green-500")} />
                              </Button>
                            </div>
                          </div>
                        </TableCell>

                        {/* Desktop: Todas as colunas - foto do atendente primeiro */}
                        <TableCell className="hidden md:table-cell py-1 w-8">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={venda.atendente?.foto_perfil_url || ''} alt={venda.atendente?.nome || 'Atendente'} />
                            <AvatarFallback className="text-[10px]">
                              {venda.atendente?.nome?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs py-1">
                          {format(new Date(venda.data_venda), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-medium py-1">{venda.cliente_nome}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs py-1">{venda.cpf_cliente || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs py-1">{venda.cliente_telefone}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs py-1">{venda.cidade}/{venda.estado}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs py-1">
                          {venda.data_prevista_entrega 
                            ? format(new Date(venda.data_prevista_entrega), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-1">
                          <ProductIconsSummary venda={venda} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center py-1">
                          {venda.venda_presencial ? (
                            <Badge variant="default" className="text-xs">Sim</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-semibold text-right py-1">
                          {formatCurrency((venda.valor_venda || 0) - (venda.valor_frete || 0) + (venda.valor_credito || 0))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-bold text-right py-1">
                          {formatCurrency((venda.valor_venda || 0) + (venda.valor_credito || 0))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right py-1">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleEditVenda(venda); }}
                              title="Editar Venda"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleDownloadVendaPDF(venda); }}
                              title="Baixar PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVendaId(venda.id);
                                setContratosModalOpen(true);
                              }}
                              title="Ver Contratos"
                            >
                              <FileSignature className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVendaForComprovante(venda);
                                setComprovanteModalOpen(true);
                              }}
                              title={venda.comprovante_url ? "Ver/Alterar Comprovante" : "Anexar Comprovante"}
                            >
                              <Paperclip className={cn("w-4 h-4", venda.comprovante_url && "text-green-500")} />
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVendaParaExcluir({ id: venda.id, clienteNome: venda.cliente_nome || 'Cliente' });
                                  setExcluirModalOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ContratosVendaModal 
        open={contratosModalOpen} 
        onOpenChange={setContratosModalOpen}
        vendaId={selectedVendaId}
      />

      <ComprovanteUploadModal
        open={comprovanteModalOpen}
        onOpenChange={setComprovanteModalOpen}
        venda={selectedVendaForComprovante}
      />

      {vendaParaExcluir && (
        <ConfirmarExclusaoVendaModal
          open={excluirModalOpen}
          onOpenChange={(open) => {
            setExcluirModalOpen(open);
            if (!open) setVendaParaExcluir(null);
          }}
          vendaId={vendaParaExcluir.id}
          clienteNome={vendaParaExcluir.clienteNome}
          onConfirm={async () => {
            await deleteVenda(vendaParaExcluir.id);
            setExcluirModalOpen(false);
            setVendaParaExcluir(null);
          }}
          isDeleting={isDeleting}
        />
      )}

      <VendaBloqueadaDialog
        open={bloqueioDialogOpen}
        onOpenChange={setBloqueioDialogOpen}
        blockReason={blockReason}
        pedidoId={blockedPedidoId}
      />
    </div>
  );
}
