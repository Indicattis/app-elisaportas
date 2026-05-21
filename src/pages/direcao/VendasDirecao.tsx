import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendas } from '@/hooks/useVendas';
import { useAuth } from '@/hooks/useAuth';
import { useSessionFilters } from '@/hooks/useSessionFilters';
import { useColumnConfig, ColumnConfig } from '@/hooks/useColumnConfig';
import { ProductIconsSummary } from '@/components/vendas/ProductIconsSummary';
import { ColumnManager } from '@/components/ColumnManager';
import { FaturamentoMensalGrid } from '@/components/vendas/FaturamentoMensalGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, DollarSign, ShoppingCart, Package, CalendarIcon, Download, FileText, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, Check, X, Truck, Hammer, Users, BookOpen, Info, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, setMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { generateVendasRelatorioPDF } from '@/utils/vendasPDFGenerator';
import { getFormaPagamentoLabel } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Definição das colunas disponíveis
const COLUNAS_DISPONIVEIS: ColumnConfig[] = [
  { id: 'vendedor', label: 'Vendedor', defaultVisible: true },
  { id: 'cliente', label: 'Cliente', defaultVisible: true },
  { id: 'data', label: 'Data', defaultVisible: true },
  { id: 'cidade', label: 'Cidade', defaultVisible: true },
  { id: 'previsao', label: 'Previsão Entrega', defaultVisible: true },
  { id: 'expedicao', label: 'Expedição', defaultVisible: true },
  { id: 'pagamento', label: 'Pagamento', defaultVisible: true },
  { id: 'desconto', label: 'Desconto', defaultVisible: true },
  { id: 'acrescimo', label: 'Acréscimo', defaultVisible: true },
  { id: 'instalacao', label: 'Instalação', defaultVisible: true },
  { id: 'frete', label: 'Frete', defaultVisible: true },
  { id: 'valor', label: 'Valor', defaultVisible: true },
  { id: 'tempo_sem_faturar', label: 'Tempo s/ Faturar', defaultVisible: true },
  { id: 'faturada', label: 'Faturada', defaultVisible: true },
];

// Função para formatar tempo decorrido
const formatarTempoSemFaturar = (dias: number): string => {
  if (dias === 0) return 'Hoje';
  if (dias === 1) return '1 dia';
  if (dias < 7) return `${dias} dias`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return semanas === 1 ? '1 sem.' : `${semanas} sem.`;
  }
  const meses = Math.floor(dias / 30);
  return meses === 1 ? '1 mês' : `${meses} meses`;
};

export default function VendasDirecao() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { vendas, isLoading } = useVendas();
  const { toast } = useToast();
  // Filtros persistentes na sessão
  const [searchTerm, setSearchTerm] = useSessionFilters<string>({
    key: 'direcao_vendas_search',
    defaultValue: ''
  });
  
  const [dateRange, setDateRange] = useSessionFilters<DateRange | undefined>({
    key: 'direcao_vendas_daterange',
    defaultValue: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    }
  });
  
  const [selectedAtendente, setSelectedAtendente] = useSessionFilters<string>({
    key: 'direcao_vendas_atendente',
    defaultValue: 'todos'
  });
  
  const [selectedMonth, setSelectedMonth] = useSessionFilters<number | null>({
    key: 'direcao_vendas_month',
    defaultValue: null
  });

  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>({ column: null, direction: null });

  // Handler para clique no mês do grid
  const handleMonthClick = useCallback((monthIndex: number) => {
    const year = new Date().getFullYear();
    const monthDate = setMonth(new Date(year, 0, 1), monthIndex);
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);
    
    if (selectedMonth === monthIndex) {
      // Se clicar no mesmo mês, reseta para o mês atual
      setSelectedMonth(null);
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      });
    } else {
      setSelectedMonth(monthIndex);
      setDateRange({ from, to });
    }
  }, [selectedMonth]);

  // Hook de configuração de colunas
  const {
    columns,
    visibleColumns,
    visibleIds,
    toggleColumn,
    setColumnOrder,
    resetColumns
  } = useColumnConfig('direcao_vendas_columns', COLUNAS_DISPONIVEIS);

  useEffect(() => {
    const fetchAtendentes = async () => {
      // Buscar usuários com role "atendente" diretamente da tabela admin_users
      const { data } = await supabase
        .from('admin_users')
        .select('id, user_id, nome, foto_perfil_url')
        .eq('role', 'atendente')
        .eq('ativo', true)
        .order('nome');
      
      if (data) {
        setAtendentes(data);
      }
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
        'Telefone': venda.cliente_telefone || '-',
        'Cidade': venda.cidade,
        'Estado': venda.estado,
        'Qtd Produtos': venda.produtos?.length || 0,
        'Valor Total': (venda.valor_venda || 0) + (venda.valor_credito || 0),
        'Vendedor': venda.atendente?.nome || 'Não informado',
      })) || [];

      const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');
      
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

  const filteredVendas = useMemo(() => {
    let result = vendas?.filter(venda => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        venda.cliente_nome?.toLowerCase().includes(search) ||
        venda.cliente_telefone?.toLowerCase().includes(search) ||
        venda.cidade?.toLowerCase().includes(search)
      );

      if (dateRange?.from && dateRange?.to) {
        const dataVenda = new Date(venda.data_venda);
        if (dataVenda < dateRange.from || dataVenda > dateRange.to) return false;
      }

      if (selectedAtendente !== "todos" && venda.atendente_id !== selectedAtendente) {
        return false;
      }

      return matchesSearch;
    }) || [];

    return result;
  }, [vendas, searchTerm, dateRange, selectedAtendente]);

  // Ordenação das vendas
  const sortedVendas = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return filteredVendas;
    }
    
    return [...filteredVendas].sort((a, b) => {
      const getValue = (venda: any) => {
        switch (sortConfig.column) {
          case 'data': return new Date(venda.data_venda).getTime();
          case 'cliente': return venda.cliente_nome?.toLowerCase() || '';
          case 'cidade': return venda.cidade?.toLowerCase() || '';
          case 'estado': return venda.estado?.toLowerCase() || '';
          case 'vendedor': return venda.atendente?.nome?.toLowerCase() || '';
          case 'valor': return (venda.valor_venda || 0) + (venda.valor_credito || 0);
          case 'previsao': return venda.data_prevista_entrega 
            ? new Date(venda.data_prevista_entrega).getTime() 
            : 0;
          case 'telefone': return venda.cliente_telefone || '';
          case 'expedicao': return venda.tipo_entrega || '';
          case 'frete': return venda.valor_frete || 0;
          case 'instalacao': return venda.valor_instalacao || 0;
          case 'desconto': return venda.produtos?.reduce((acc: number, p: any) => acc + (p.desconto_valor || 0), 0) || 0;
          case 'acrescimo': return venda.valor_credito || 0;
          case 'faturada': 
            const produtos = venda.produtos || [];
            return produtos.some((p: any) => p.faturamento === true) ? 1 : 0;
          case 'tempo_sem_faturar':
            const produtosTempo = venda.produtos || [];
            const estaFaturada = produtosTempo.some((p: any) => p.faturamento === true);
            if (estaFaturada) return 0;
            return differenceInDays(new Date(), new Date(venda.data_venda));
          default: return '';
        }
      };
      
      const aVal = getValue(a);
      const bVal = getValue(b);
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredVendas, sortConfig]);

  // Função para alternar ordenação
  const handleSort = useCallback((columnId: string) => {
    setSortConfig(current => {
      if (current.column !== columnId) {
        return { column: columnId, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { column: columnId, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, []);

  const stats = useMemo(() => {
    if (!filteredVendas) return { totalVendas: 0, totalValor: 0, totalPortasEnrolar: 0 };
    
    return {
      totalVendas: filteredVendas.length,
      totalValor: filteredVendas.reduce((sum, v) => {
        const valorSemFrete = (v.valor_venda || 0) - (v.valor_frete || 0) + (v.valor_credito || 0);
        return sum + valorSemFrete;
      }, 0),
      totalPortasEnrolar: filteredVendas.reduce((sum, v) => {
        const portasEnrolar = v.produtos?.filter((p: any) => p.tipo_produto === 'porta_enrolar') || [];
        return sum + portasEnrolar.reduce((acc: number, p: any) => acc + (p.quantidade || 1), 0);
      }, 0),
    };
  }, [filteredVendas]);

  // Função para renderizar célula baseado no ID da coluna
  const renderCell = useCallback((venda: any, columnId: string) => {
    // Calcular desconto total dos produtos
    const calcularDescontoTotal = () => {
      if (!venda.produtos) return 0;
      return venda.produtos.reduce((acc: number, p: any) => acc + (p.desconto_valor || 0), 0);
    };

    // Verificar se foi faturada (produtos com faturamento = true)
    const isFaturada = () => {
      if (!venda.produtos || venda.produtos.length === 0) return false;
      return venda.produtos.some((p: any) => p.faturamento === true);
    };

    // Classes responsivas para texto - menor no mobile
    const textClass = "text-[10px] md:text-sm";
    const textMutedClass = "text-[10px] md:text-sm text-white/60";

    switch (columnId) {
      case 'data':
        return (
          <span className={`${textClass} text-white/80`}>
            {format(new Date(venda.data_venda), 'dd/MM', { locale: ptBR })}
          </span>
        );
      case 'cliente':
        return (
          <span className={`${textClass} text-white font-medium truncate block max-w-[100px] md:max-w-none`}>
            {venda.cliente_nome}
          </span>
        );
      case 'telefone':
        return <span className={textMutedClass}>{venda.cliente_telefone || '-'}</span>;
      case 'cidade':
        return (
          <span className={`${textMutedClass} truncate block max-w-[80px] md:max-w-none`}>
            {venda.cidade}/{venda.estado}
          </span>
        );
      case 'estado':
        return <span className={textMutedClass}>{venda.estado}</span>;
      case 'vendedor':
        return (
          <Avatar className="h-6 w-6 md:h-7 md:w-7">
            <AvatarImage src={venda.atendente?.foto_perfil_url} />
            <AvatarFallback className="text-[8px] md:text-[10px] bg-blue-500/20 text-blue-400">
              {venda.atendente?.nome?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      case 'expedicao':
        const tipoEntrega = venda.tipo_entrega;
        if (tipoEntrega === 'instalacao') {
          return <Hammer className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-400 mx-auto" />;
        } else if (tipoEntrega === 'entrega') {
          return <Truck className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400 mx-auto" />;
        }
        return <span className="text-white/30 text-[10px]">-</span>;
      case 'pagamento':
        return <span className={textClass}>{getFormaPagamentoLabel(venda.metodo_pagamento)}</span>;
      case 'previsao':
        return (
          <span className={textMutedClass}>
            {venda.data_prevista_entrega 
              ? format(new Date(venda.data_prevista_entrega), 'dd/MM', { locale: ptBR })
              : '-'
            }
          </span>
        );
      case 'frete':
        return (
          <span className={textMutedClass}>
            {venda.valor_frete ? formatCurrency(venda.valor_frete) : '-'}
          </span>
        );
      case 'instalacao':
        return (
          <span className={textMutedClass}>
            {venda.valor_instalacao ? formatCurrency(venda.valor_instalacao) : '-'}
          </span>
        );
      case 'desconto':
        const desconto = calcularDescontoTotal();
        const autorizacao = venda.autorizacao_desconto?.[0];
        
        if (desconto <= 0) {
          return <span className="text-[10px] md:text-sm text-white/60">-</span>;
        }
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] md:text-sm text-red-400 cursor-help underline decoration-dotted underline-offset-2">
                -{formatCurrency(desconto)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-700 p-3 max-w-xs">
              <div className="space-y-2">
                <div className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-red-400" />
                  Detalhes do Desconto
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-white/70">
                    <span className="text-white/50">Valor:</span> {formatCurrency(desconto)}
                  </p>
                  {autorizacao && (
                    <>
                      <p className="text-white/70">
                        <span className="text-white/50">Percentual:</span>{' '}
                        {autorizacao.percentual_desconto?.toFixed(2)}%
                      </p>
                      <p className="text-white/70">
                        <span className="text-white/50">Tipo:</span>{' '}
                        {autorizacao.tipo_autorizacao === 'master' 
                          ? 'Senha Master' 
                          : 'Responsável do Setor'}
                      </p>
                      <p className="text-white/70">
                        <span className="text-white/50">Autorizado por:</span>{' '}
                        {autorizacao.autorizador?.nome || 'Não informado'}
                      </p>
                    </>
                  )}
                  {!autorizacao && (
                    <p className="text-white/50 italic">
                      Desconto dentro do limite automático
                    </p>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      case 'acrescimo':
        return (
          <span className={`text-[10px] md:text-sm ${venda.valor_credito > 0 ? "text-green-400" : "text-white/60"}`}>
            {venda.valor_credito > 0 ? `+${formatCurrency(venda.valor_credito)}` : '-'}
          </span>
        );
      case 'faturada':
        const faturada = isFaturada();
        return (
          <div className="flex justify-center">
            {faturada ? (
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-400" />
              </div>
            ) : (
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white/5 flex items-center justify-center">
                <X className="w-2.5 h-2.5 md:w-3 md:h-3 text-white/30" />
              </div>
            )}
          </div>
        );
      case 'tempo_sem_faturar':
        if (isFaturada()) {
          return <span className="text-white/30 text-[10px] md:text-sm">-</span>;
        }
        const diasSemFaturar = differenceInDays(new Date(), new Date(venda.data_venda));
        const tempoFormatado = formatarTempoSemFaturar(diasSemFaturar);
        // Cor baseada na urgência
        const corTempo = diasSemFaturar >= 30 
          ? 'text-red-400' 
          : diasSemFaturar >= 14 
            ? 'text-amber-400' 
            : 'text-white/60';
        return <span className={`text-[10px] md:text-sm ${corTempo}`}>{tempoFormatado}</span>;
      case 'valor':
        return (
          <span className={`${textClass} text-white font-medium`}>
            {formatCurrency((venda.valor_venda || 0) + (venda.valor_credito || 0))}
          </span>
        );
      default:
        return null;
    }
  }, []);

  // Classes responsivas por coluna
  const getColumnResponsiveClass = (columnId: string) => {
    switch (columnId) {
      case 'cidade':
      case 'estado':
      case 'telefone':
        return 'hidden md:table-cell';
      case 'vendedor':
      case 'previsao':
      case 'frete':
      case 'instalacao':
      case 'desconto':
      case 'acrescimo':
      case 'faturada':
      case 'tempo_sem_faturar':
        return 'hidden lg:table-cell';
      default:
        return '';
    }
  };

  // Estilo de alinhamento por coluna
  const getColumnAlignment = (columnId: string) => {
    switch (columnId) {
      case 'valor':
      case 'frete':
      case 'instalacao':
      case 'desconto':
      case 'acrescimo':
        return 'text-right';
      case 'faturada':
      case 'tempo_sem_faturar':
        return 'text-center';
      default:
        return 'text-left';
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => navigate('/direcao/vendas/tabela-precos')}
        title="Tabela de Preços"
      >
        <DollarSign className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => navigate('/direcao/vendas/regras-vendas')}
        title="Regras de Vendas"
      >
        <BookOpen className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => navigate('/direcao/vendas/clientes')}
      >
        <Users className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => window.open('https://crm.elisaportas.com', '_blank')}
        title="CRM"
      >
        <ExternalLink className="h-4 w-4" />
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
            <Download className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
          <DropdownMenuItem onClick={handleExportarPDF} className="text-white hover:bg-white/10">
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportarExcel} className="text-white hover:bg-white/10">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (isLoading) {
    return (
      <MinimalistLayout 
        title="Vendas" 
        backPath="/direcao"
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Direção", path: "/direcao" },
          { label: "Vendas" }
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout 
      title="Vendas" 
      subtitle="Todas as vendas do período"
      backPath="/direcao"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Vendas" }
      ]}
      headerActions={headerActions}
    >
      {/* Grid Faturamento Mensal */}
      <FaturamentoMensalGrid 
        onMonthClick={handleMonthClick}
        selectedMonth={selectedMonth}
      />

      {/* Cards de Estatísticas */}
      <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3 mb-6">
        <div className="h-[50px] md:h-auto p-1 md:p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="h-full px-3 py-1 md:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-700/10 flex items-center justify-between">
            <div className="flex items-center gap-3 md:block">
              <p className="text-xs text-white/60">Vendas</p>
              <p className="text-lg md:text-2xl font-bold text-white">{stats.totalVendas}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="h-[50px] md:h-auto p-1 md:p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="h-full px-3 py-1 md:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-700/10 flex items-center justify-between">
            <div className="flex items-center gap-3 md:block">
              <p className="text-xs text-white/60">Valor</p>
              <p className="text-sm md:text-xl font-bold text-white">{formatCurrency(stats.totalValor)}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="h-[50px] md:h-auto p-1 md:p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="h-full px-3 py-1 md:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-700/10 flex items-center justify-between">
            <div className="flex items-center gap-3 md:block">
              <p className="text-xs text-white/60">Portas</p>
              <p className="text-lg md:text-2xl font-bold text-white">{stats.totalPortasEnrolar}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Filtro de Vendedores Destacada */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-800/10 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-300">Filtrar por Vendedor</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
          {/* Botão "Todos" */}
          <button
            onClick={() => setSelectedAtendente("todos")}
            className={`
              flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-all
              ${selectedAtendente === "todos"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }
            `}
          >
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Todos</span>
          </button>
          
          {/* Cards de atendentes */}
          {atendentes.map(atendente => (
            <button
              key={atendente.user_id}
              onClick={() => setSelectedAtendente(atendente.user_id)}
              className={`
                flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                ${selectedAtendente === atendente.user_id
                  ? "bg-blue-500 text-white ring-2 ring-blue-400 shadow-lg shadow-blue-500/25"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={atendente.foto_perfil_url} />
                <AvatarFallback className="text-[10px] bg-blue-500/20 text-blue-400">
                  {atendente.nome?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium whitespace-nowrap">
                {atendente.nome?.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Buscar cliente, telefone, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                <span>Período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
              className="text-white"
            />
          </PopoverContent>
        </Popover>

        {/* Botão de configuração de colunas */}
        <ColumnManager
          columns={columns}
          visibleIds={visibleIds}
          onToggle={toggleColumn}
          onReorder={setColumnOrder}
          onReset={resetColumns}
        />
      </div>

      {/* Tabela */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        <div className="rounded-lg overflow-hidden">
          <TooltipProvider delayDuration={200}>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  {visibleColumns.map(column => (
                    <TableHead 
                      key={column.id}
                      className={`text-[10px] md:text-xs text-white/60 cursor-pointer hover:bg-white/5 transition-colors select-none py-2 px-3 md:px-5 ${getColumnAlignment(column.id)} ${getColumnResponsiveClass(column.id)}`}
                      onClick={() => handleSort(column.id)}
                    >
                      <div className={`flex items-center gap-0.5 md:gap-1 ${column.id === 'valor' || column.id === 'frete' || column.id === 'instalacao' || column.id === 'desconto' || column.id === 'acrescimo' ? 'justify-end' : column.id === 'faturada' ? 'justify-center' : ''}`}>
                        <span className="truncate">{column.label}</span>
                        {sortConfig.column === column.id ? (
                          sortConfig.direction === 'asc' 
                            ? <ArrowUp className="h-2.5 w-2.5 md:h-3 md:w-3 text-blue-400 flex-shrink-0" />
                            : <ArrowDown className="h-2.5 w-2.5 md:h-3 md:w-3 text-blue-400 flex-shrink-0" />
                        ) : (
                          <ArrowUpDown className="h-2.5 w-2.5 md:h-3 md:w-3 opacity-30 flex-shrink-0" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-white/40">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedVendas.map((venda) => (
                    <TableRow 
                      key={venda.id} 
                      className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/direcao/vendas/${venda.id}`)}
                    >
                      {visibleColumns.map(column => (
                        <TableCell 
                          key={column.id}
                          className={`py-2.5 px-3 md:px-5 ${getColumnAlignment(column.id)} ${getColumnResponsiveClass(column.id)}`}
                        >
                          {renderCell(venda, column.id)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </div>
    </MinimalistLayout>
  );
}
