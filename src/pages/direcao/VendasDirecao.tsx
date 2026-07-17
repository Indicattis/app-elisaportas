import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useVendas } from '@/hooks/useVendas';
import { useAuth } from '@/hooks/useAuth';
import { useSessionFilters } from '@/hooks/useSessionFilters';
import { ColumnConfig } from '@/hooks/useColumnConfig';
import { ProductIconsSummary } from '@/components/vendas/ProductIconsSummary';
import { FaturamentoMensalGrid } from '@/components/vendas/FaturamentoMensalGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, DollarSign, ShoppingCart, Package, CalendarIcon, Download, FileText, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, Check, X, Truck, Hammer, Users, BookOpen, Info, ExternalLink, Settings, MinusCircle, FileX, Loader2, FileDown } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import { getLabelTipoProduto } from '@/utils/tipoProdutoLabels';
import { format, startOfMonth, endOfMonth, setMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { generateVendasRelatorioPDF } from '@/utils/vendasPDFGenerator';
import { getFormaPagamentoLabel } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { calcularDescontoTotal as calcularDescontoTotalRegras, calcularTotalVenda } from '@/utils/descontoVendasRules';
import { calcDescontoTiersAplicados } from '@/utils/descontoTiers';
import { generateFormalizacaoVendaPDF } from '@/utils/formalizacaoVendaPDFGenerator';


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
  { id: 'temperatura', label: 'Temperatura', defaultVisible: true },
  { id: 'faturada', label: 'Faturada', defaultVisible: true },
  { id: 'valor_tabela', label: 'Valor Tabela', defaultVisible: true },
  { id: 'frete', label: 'Frete', defaultVisible: true },
  { id: 'desconto_acrescimo', label: 'Desconto/Acréscimo', defaultVisible: true },
  { id: 'valor', label: 'Valor Final', defaultVisible: true },
  { id: 'excedido_desconto', label: 'Excedido', defaultVisible: true },
  { id: 'lucro', label: 'Lucro', defaultVisible: true },
  { id: 'formalizacao', label: 'Formalização', defaultVisible: true },
];

// Função auxiliar para calcular desconto total dos produtos
const calcularDescontoTotal = (venda: any) => {
  if (!venda?.produtos) return 0;
  return venda.produtos.reduce((acc: number, p: any) => acc + (p.desconto_valor || 0), 0);
};

// Calcula o valor do desconto que excedeu o limite permitido (igual ao "Excedido" do balanço de descontos)
const calcularExcedidoDesconto = (
  venda: any,
  limAvista: number,
  limPresencial: number,
  limResponsavel: number
): { excedidoPct: number; excedidoValor: number } => {
  const produtos = venda?.produtos || [];
  const totalBase = calcularTotalVenda(produtos);
  if (totalBase <= 0) return { excedidoPct: 0, excedidoValor: 0 };

  const descontoTotal = calcularDescontoTotalRegras(produtos);
  const pctDado = (descontoTotal / totalBase) * 100;

  const formaPg = (venda?.forma_pagamento || '').trim();
  const aptoAvista = formaPg !== '' && formaPg !== 'cartao_credito';
  const aptoFrio = venda?.temperatura === false;
  const limiteBase = (aptoAvista ? limAvista : 0) + (aptoFrio ? limPresencial : 0);
  const aptoGerente =
    !!venda?.autorizacao_desconto?.[0] || pctDado > limiteBase;
  const limite = limiteBase + (aptoGerente ? limResponsavel : 0);

  const excedidoPct = Math.max(0, pctDado - limite);
  const excedidoValor = (excedidoPct / 100) * totalBase;

  return { excedidoPct, excedidoValor };
};

// Calcula o lucro real da venda (apenas faz sentido quando faturada)
const calcularLucroReal = (
  venda: any,
  limAvista: number,
  limPresencial: number,
  limResponsavel: number
): number => {
  const produtos = venda?.produtos || [];
  const lucroItens = produtos.reduce((acc: number, p: any) => acc + (Number(p.lucro_item) || 0), 0);
  const lucroInstalacao = Number(venda?.lucro_instalacao) || 0;
  const lucroBruto = lucroItens + lucroInstalacao;
  const { excedidoValor } = calcularExcedidoDesconto(venda, limAvista, limPresencial, limResponsavel);
  return lucroBruto - excedidoValor;
};

const vendaFaturada = (venda: any): boolean => {
  if (!venda?.produtos || venda.produtos.length === 0) return false;
  return venda.produtos.some((p: any) => p.faturamento === true);
};

export default function VendasDirecao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [togglingTempId, setTogglingTempId] = useState<string | null>(null);
  const [updatingExpedicaoId, setUpdatingExpedicaoId] = useState<string | null>(null);
  const [dispensarVenda, setDispensarVenda] = useState<any | null>(null);
  const [dispensandoId, setDispensandoId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const handleDownloadFormalizacao = useCallback(async (venda: any) => {
    if (downloadingPdfId) return;
    setDownloadingPdfId(venda.id);
    try {
      const { data: produtos, error } = await supabase
        .from('produtos_vendas')
        .select('*, cor:catalogo_cores(nome, codigo_hex)')
        .eq('venda_id', venda.id);
      if (error) throw error;
      generateFormalizacaoVendaPDF({
        id: venda.id,
        dataVenda: venda.data_venda,
        dataPrevistaEntrega: venda.data_prevista_entrega,
        cliente: {
          nome: venda.cliente_nome,
          cpf: venda.cpf_cliente,
          telefone: venda.cliente_telefone,
          email: venda.cliente_email,
          estado: venda.estado,
          cidade: venda.cidade,
          cep: venda.cep,
          bairro: venda.bairro,
        },
        produtos: (produtos as any) || [],
        valores: {
          valorVenda: venda.valor_venda || 0,
          valorFrete: venda.valor_frete,
          valorInstalacao: venda.valor_instalacao,
          valorEntrada: venda.valor_entrada,
          valorAReceber: venda.valor_a_receber,
        },
        formaPagamento: venda.forma_pagamento || venda.metodo_pagamento,
        observacoes: venda.observacoes_venda,
        atendente: venda.atendente
          ? { nome: venda.atendente.nome, foto_perfil_url: venda.atendente.foto_perfil_url }
          : undefined,
      });
      toast({ title: 'PDF gerado', description: 'Formalização da venda baixada.' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e?.message, variant: 'destructive' });
    } finally {
      setDownloadingPdfId(null);
    }
  }, [downloadingPdfId, toast]);

  const updateExpedicao = useCallback(async (vendaId: string, novoTipo: string | null) => {
    if (updatingExpedicaoId) return;
    setUpdatingExpedicaoId(vendaId);
    try {
      const { error } = await supabase
        .from('vendas')
        .update({ tipo_entrega: novoTipo })
        .eq('id', vendaId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast({ title: 'Expedição atualizada' });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar expedição', description: e?.message, variant: 'destructive' });
    } finally {
      setUpdatingExpedicaoId(null);
    }
  }, [queryClient, toast, updatingExpedicaoId]);

  const toggleTemperatura = useCallback(async (vendaId: string, atual: boolean | null | undefined) => {
    if (togglingTempId) return;
    const novo = !(atual === true);
    setTogglingTempId(vendaId);
    try {
      const { error } = await supabase
        .from('vendas')
        .update({ temperatura: novo })
        .eq('id', vendaId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast({ title: novo ? 'Marcada como Quente' : 'Marcada como Fria' });
    } catch (e: any) {
      toast({ title: 'Erro ao alterar temperatura', description: e?.message, variant: 'destructive' });
    } finally {
      setTogglingTempId(null);
    }
  }, [queryClient, toast, togglingTempId]);
  const { isAdmin, user } = useAuth();
  const { vendas, isLoading } = useVendas();
  const { limites: limitesVendas } = useConfiguracoesVendas();
  const limAvista = limitesVendas?.avista ?? 3;
  const limPresencial = limitesVendas?.presencial ?? 5;
  const limResponsavel = limitesVendas?.adicionalResponsavel ?? 7;
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
  const [metodosExtraPorVenda, setMetodosExtraPorVenda] = useState<Map<string, string[]>>(new Map());
  const [parcelasPorVenda, setParcelasPorVenda] = useState<Map<string, any[]>>(new Map());
  const [metodosCarregados, setMetodosCarregados] = useState(false);
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

  // Colunas fixas (funcionalidade de personalização removida)
  const visibleColumns = COLUNAS_DISPONIVEIS.filter(c => c.defaultVisible);

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

  // Buscar métodos de pagamento adicionais via contas_receber
  useEffect(() => {
    const fetchMetodos = async () => {
      if (!vendas || vendas.length === 0) return;
      const vendaIds = vendas.map((v: any) => v.id).filter(Boolean);
      if (vendaIds.length === 0) return;
      const map = new Map<string, string[]>();
      const parcelasMap = new Map<string, any[]>();
      // Chunks de venda_id (evita URL grande) + paginação por range (evita
      // teto default de 1000 linhas do PostgREST à medida que a base cresce).
      const chunkSize = 500;
      const pageSize = 1000;
      for (let i = 0; i < vendaIds.length; i += chunkSize) {
        const slice = vendaIds.slice(i, i + chunkSize);
        let from = 0;
        // paginar até acabar
        while (true) {
          const { data, error } = await supabase
            .from('contas_receber')
            .select('id, venda_id, metodo_pagamento, numero_parcela, valor_parcela, valor_pago, data_vencimento, data_pagamento, status')
            .in('venda_id', slice)
            .range(from, from + pageSize - 1);
          if (error) {
            console.error('[VendasDirecao] contas_receber erro:', error, { chunkStart: i, from });
            break;
          }
          const rows = data || [];
          rows.forEach((conta: any) => {
            if (!conta?.venda_id || !conta?.metodo_pagamento) return;
            const atuais = map.get(conta.venda_id) || [];
            if (!atuais.includes(conta.metodo_pagamento)) {
              atuais.push(conta.metodo_pagamento);
              map.set(conta.venda_id, atuais);
            }
            const arr = parcelasMap.get(conta.venda_id) || [];
            arr.push(conta);
            parcelasMap.set(conta.venda_id, arr);
          });
          if (rows.length < pageSize) break;
          from += pageSize;
        }
      }
      // Ordenar parcelas por método e número
      parcelasMap.forEach((arr) => {
        arr.sort((a, b) => {
          const m = (a.metodo_pagamento || '').localeCompare(b.metodo_pagamento || '');
          if (m !== 0) return m;
          return (a.numero_parcela || 0) - (b.numero_parcela || 0);
        });
      });
      setMetodosExtraPorVenda(map);
      setParcelasPorVenda(parcelasMap);
      setMetodosCarregados(true);
    };
    fetchMetodos();
  }, [vendas]);

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
          case 'valor_tabela': {
            const desconto = calcularDescontoTotal(venda);
            return (venda.valor_venda || 0) - (venda.valor_frete || 0) + desconto;
          }
          case 'desconto_acrescimo': {
            const desconto = calcularDescontoTotal(venda);
            return (venda.valor_credito || 0) - desconto;
          }
          case 'faturada': 
            const produtos = venda.produtos || [];
            return produtos.some((p: any) => p.faturamento === true) ? 1 : 0;
          case 'temperatura':
            return venda.temperatura === true ? 1 : venda.temperatura === false ? 0 : -1;
          case 'excedido_desconto': {
            const { excedidoValor } = calcularExcedidoDesconto(venda, limAvista, limPresencial, limResponsavel);
            return excedidoValor;
          }
          case 'lucro': {
            if (!vendaFaturada(venda)) return -Infinity;
            return calcularLucroReal(venda, limAvista, limPresencial, limResponsavel);
          }
          default: return '';
        }
      };
      
      const aVal = getValue(a);
      const bVal = getValue(b);
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredVendas, sortConfig, limAvista, limPresencial, limResponsavel]);

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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${textClass} text-white font-medium truncate block max-w-[100px] md:max-w-none cursor-help`}>
                {venda.cliente_nome}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              {venda.produtos && venda.produtos.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-semibold text-xs mb-1">Produtos da venda</div>
                  <ul className="text-xs space-y-0.5">
                    {venda.produtos.map((p: any, i: number) => {
                      const label = getLabelTipoProduto(p.tipo_produto);
                      const qtd = p.quantidade && p.quantidade > 1 ? `${p.quantidade}x ` : '';
                      let dim = '';
                      if (p.largura && p.altura) {
                        dim = ` — ${Number(p.largura).toFixed(2)}m × ${Number(p.altura).toFixed(2)}m`;
                      } else if (typeof p.tamanho === 'string' && /^\s*\d+([.,]\d+)?\s*x\s*\d+([.,]\d+)?\s*$/i.test(p.tamanho)) {
                        const [l, a] = p.tamanho.toLowerCase().replace(/,/g, '.').split('x').map((s: string) => Number(s.trim()));
                        if (l && a) dim = ` — ${l.toFixed(2)}m × ${a.toFixed(2)}m`;
                      }
                      const cor = p.cor ? ` (${p.cor})` : '';
                      const desc = p.descricao && !['Porta de Enrolar','Instalação'].includes(p.descricao) ? ` — ${p.descricao}` : '';
                      return (
                        <li key={p.id || i}>
                          {qtd}{label}{dim}{cor}{desc}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <span className="text-xs">Sem produtos</span>
              )}
            </TooltipContent>
          </Tooltip>
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
        {
          const tipoEntrega = venda.tipo_entrega;
          const isUpdating = updatingExpedicaoId === venda.id;
          const renderIcon = (tipo: string | null | undefined) => {
            if (tipo === 'instalacao') return <Hammer className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-400" />;
            if (tipo === 'entrega') return <Truck className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />;
            if (tipo === 'manutencao') return <Settings className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-400" />;
            return <span className="text-white/30 text-[10px]">-</span>;
          };
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  disabled={isUpdating}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="mx-auto flex items-center justify-center h-6 w-6 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Alterar expedição"
                >
                  {renderIcon(tipoEntrega)}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-44 p-1 bg-slate-900 border-white/10"
                align="center"
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  { value: 'instalacao', label: 'Instalação', icon: <Hammer className="h-4 w-4 text-orange-400" /> },
                  { value: 'entrega', label: 'Entrega', icon: <Truck className="h-4 w-4 text-blue-400" /> },
                  { value: 'manutencao', label: 'Manutenção', icon: <Settings className="h-4 w-4 text-purple-400" /> },
                  { value: null, label: 'Nenhum', icon: <MinusCircle className="h-4 w-4 text-white/40" /> },
                ].map((opt) => {
                  const selected = (tipoEntrega ?? null) === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'nenhum'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!selected) updateExpedicao(venda.id, opt.value);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/80 hover:bg-white/10 transition-colors ${selected ? 'bg-white/5' : ''}`}
                    >
                      {opt.icon}
                      <span className="flex-1 text-left">{opt.label}</span>
                      {selected && <Check className="h-3 w-3 text-green-400" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          );
        }
      case 'pagamento':
        {
          const todos = metodosExtraPorVenda.get(venda.id) || [];
          const principal = venda.metodo_pagamento;
          let secundario: string | null = todos.find((m) => m !== principal) || null;
          // Fallback: se ainda não carregou ou não veio segundo método, tenta inferir
          // dos campos da venda (venda com pagamento na entrega tem 2º método garantido).
          if (!secundario && venda.pagamento_na_entrega) {
            if (Number(venda.parcelas_dinheiro) > 0) {
              secundario = 'dinheiro';
            } else if (!metodosCarregados) {
              secundario = '__loading__';
            } else {
              secundario = 'na_entrega';
            }
          }
          const parcelas = parcelasPorVenda.get(venda.id) || [];
          const grupos = new Map<string, any[]>();
          parcelas.forEach((p) => {
            const key = p.metodo_pagamento || 'outros';
            const arr = grupos.get(key) || [];
            arr.push(p);
            grupos.set(key, arr);
          });
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${textClass} flex flex-col leading-tight cursor-help`}>
                  <span>{getFormaPagamentoLabel(principal)}</span>
                  {secundario && (
                    <span className="text-white/50 text-[9px] md:text-xs">
                      {secundario === '__loading__'
                        ? '+ …'
                        : secundario === 'na_entrega'
                          ? '+ Na entrega'
                          : `+ ${getFormaPagamentoLabel(secundario)}`}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-700 p-3 max-w-sm">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-white">Pagamentos da venda</div>
                  {grupos.size === 0 ? (
                    <div className="text-xs text-white/60 space-y-1">
                      <p>Sem parcelas registradas.</p>
                      <p className="text-white/50">
                        Método: <span className="text-white/80">{getFormaPagamentoLabel(principal)}</span>
                        {secundario && secundario !== '__loading__' && (
                          <> + <span className="text-white/80">
                            {secundario === 'na_entrega' ? 'Na entrega' : getFormaPagamentoLabel(secundario)}
                          </span></>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {Array.from(grupos.entries()).map(([metodo, arr]) => {
                        const total = arr.reduce((s, p) => s + Number(p.valor_parcela || 0), 0);
                        return (
                          <div key={metodo} className="space-y-1">
                            <div className="flex items-center justify-between text-white/90 font-medium">
                              <span>{getFormaPagamentoLabel(metodo)}</span>
                              <span className="text-white/60">{formatCurrency(total)}</span>
                            </div>
                            <div className="space-y-0.5 pl-2 border-l border-white/10">
                              {arr.map((p) => {
                                const pago = p.status === 'pago';
                                return (
                                  <div key={p.id} className="flex items-center justify-between gap-2">
                                    <span className="text-white/70">
                                      Nº {p.numero_parcela ?? '-'} • {formatCurrency(Number(p.valor_parcela || 0))}
                                      {p.data_vencimento && (
                                        <span className="text-white/40"> • venc. {format(new Date(p.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                      )}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pago ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                      {pago
                                        ? (p.data_pagamento ? `Pago ${format(new Date(p.data_pagamento), 'dd/MM', { locale: ptBR })}` : 'Pago')
                                        : 'Pendente'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }
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
      case 'desconto_acrescimo': {
        const desconto = calcularDescontoTotal(venda);
        const credito = venda.valor_credito || 0;
        const net = credito - desconto;
        const autorizacao = venda.autorizacao_desconto?.[0];
        const _totalBaseTiers = calcularTotalVenda(venda.produtos || []);
        const tiers = desconto > 0
          ? calcDescontoTiersAplicados({
              totalVenda: _totalBaseTiers,
              descontoTotal: desconto,
              formaPagamento: venda.forma_pagamento,
              vendaPresencial: venda.temperatura === false,
              limAvista,
              limPresencial,
            })
          : null;
        const tiersBlock = tiers ? (
          <div className="pt-1 mt-1 border-t border-white/10 space-y-0.5">
            <p className="text-white/50 text-[10px] uppercase tracking-wider">Distribuição</p>
            <p className="text-white/70">
              <span className="text-white/50">À Vista ({limAvista}%):</span>{' '}
              <span className={tiers.valorAvista > 0 ? 'text-emerald-400' : 'text-white/40'}>
                {formatCurrency(tiers.valorAvista)} ({tiers.pctAvista.toFixed(2)}%)
              </span>
            </p>
            <p className="text-white/70">
              <span className="text-white/50">Frio ({limPresencial}%):</span>{' '}
              <span className={tiers.valorFrio > 0 ? 'text-cyan-400' : 'text-white/40'}>
                {formatCurrency(tiers.valorFrio)} ({tiers.pctFrio.toFixed(2)}%)
              </span>
            </p>
            {(() => {
              const pctGerenteOnly = Math.min(tiers.pctGerente, limResponsavel);
              const pctDiretor = Math.max(0, tiers.pctGerente - limResponsavel);
              const valorGerenteOnly = _totalBaseTiers * (pctGerenteOnly / 100);
              const valorDiretor = _totalBaseTiers * (pctDiretor / 100);
              return (
                <>
                  <p className="text-white/70">
                    <span className="text-white/50">Gerente ({limResponsavel}%):</span>{' '}
                    <span className={valorGerenteOnly > 0 ? 'text-amber-400' : 'text-white/40'}>
                      {formatCurrency(valorGerenteOnly)} ({pctGerenteOnly.toFixed(2)}%)
                    </span>
                  </p>
                  <p className="text-white/70">
                    <span className="text-white/50">Diretor (excesso):</span>{' '}
                    <span className={valorDiretor > 0 ? 'text-red-400' : 'text-white/40'}>
                      {formatCurrency(valorDiretor)} ({pctDiretor.toFixed(2)}%)
                    </span>
                  </p>
                </>
              );
            })()}
          </div>
        ) : null;

        if (desconto <= 0 && credito <= 0) {
          return <span className="text-[10px] md:text-sm text-white/60">-</span>;
        }
        
        if (desconto > 0 && credito > 0) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-end text-[10px] md:text-sm leading-tight cursor-help">
                  <span className="text-red-400">-{formatCurrency(desconto)}</span>
                  <span className="text-green-400">+{formatCurrency(credito)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-700 p-3 max-w-xs">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-white flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-red-400" />
                    Detalhes do Desconto/Acréscimo
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-white/70">
                      <span className="text-white/50">Desconto:</span>{' '}
                      <span className="text-red-400">{formatCurrency(desconto)}</span>
                    </p>
                    <p className="text-white/70">
                      <span className="text-white/50">Acréscimo:</span>{' '}
                      <span className="text-green-400">{formatCurrency(credito)}</span>
                    </p>
                    <p className="text-white/70">
                      <span className="text-white/50">Líquido:</span>{' '}
                      <span className={net >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net))}
                      </span>
                    </p>
                    {tiersBlock}
                    {autorizacao && (
                      <>
                        <p className="text-white/70">
                          <span className="text-white/50">Percentual:</span>{' '}
                          {autorizacao.percentual_desconto?.toFixed(2)}%
                        </p>
                        <p className="text-white/70">
                          <span className="text-white/50">Tipo:</span>{' '}
                          {autorizacao.tipo_autorizacao === 'master' 
                            ? 'Senha Master (Diretor)' 
                            : 'Senha do Gerente'}
                        </p>
                        <p className="text-white/70">
                          <span className="text-white/50">Autorizado por:</span>{' '}
                          {autorizacao.autorizador?.nome || 'Não informado'}
                        </p>
                      </>
                    )}
                    {!autorizacao && desconto > 0 && (
                      <p className="text-white/50 italic">
                        Desconto dentro do limite automático
                      </p>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }
        
        if (desconto > 0) {
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
                    {tiersBlock}
                    {autorizacao && (
                      <>
                        <p className="text-white/70">
                          <span className="text-white/50">Percentual:</span>{' '}
                          {autorizacao.percentual_desconto?.toFixed(2)}%
                        </p>
                        <p className="text-white/70">
                          <span className="text-white/50">Tipo:</span>{' '}
                          {autorizacao.tipo_autorizacao === 'master' 
                            ? 'Senha Master (Diretor)' 
                            : 'Senha do Gerente'}
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
        }
        
        return (
          <span className="text-[10px] md:text-sm text-green-400">
            +{formatCurrency(credito)}
          </span>
        );
      }
      case 'faturada':
        const faturada = isFaturada();
        const temContrato = !!venda.contrato_url;
        const dispensado = !!venda.contrato_dispensado || !!venda.dispensada_sistema;
        return (
          <div className="flex flex-col items-center gap-1">
            {faturada ? (
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-400" />
              </div>
            ) : (
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white/5 flex items-center justify-center">
                <X className="w-2.5 h-2.5 md:w-3 md:h-3 text-white/30" />
              </div>
            )}
            {!temContrato && dispensado && (
              <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                <FileX className="w-2.5 h-2.5" />
                Contrato dispensado
              </span>
            )}
            {!temContrato && !dispensado && (
              <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[9px] text-orange-400 flex items-center gap-0.5 cursor-help">
                    <FileText className="w-2.5 h-2.5" />
                    Sem contrato
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 border-zinc-700 text-white text-xs">
                  Venda sem contrato assinado
                </TooltipContent>
              </Tooltip>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDispensarVenda(venda); }}
                disabled={dispensandoId === venda.id}
                className="text-[9px] text-white/60 hover:text-white flex items-center gap-0.5 underline decoration-dotted underline-offset-2 disabled:opacity-50"
              >
                <MinusCircle className="w-2.5 h-2.5" />
                Dispensar
              </button>
              </>
            )}
          </div>
        );
      case 'valor_tabela': {
        const desconto = calcularDescontoTotal(venda);
        const valorTabela = (venda.valor_venda || 0) - (venda.valor_frete || 0) + desconto;
        return (
          <span className={`${textClass} text-white/80`}>
            {valorTabela > 0 ? formatCurrency(valorTabela) : '-'}
          </span>
        );
      }
      case 'temperatura': {
        const isQuente = venda.temperatura === true;
        const isFrio = venda.temperatura === false;
        const label = isQuente ? 'Quente' : isFrio ? 'Frio' : '-';
        const color = isQuente ? 'text-orange-400' : isFrio ? 'text-blue-400' : 'text-white/30';
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTemperatura(venda.id, venda.temperatura);
            }}
            disabled={togglingTempId === venda.id}
            title="Clique para alternar entre Quente e Fria"
            className={`text-[10px] md:text-sm ${color} hover:underline underline-offset-2 disabled:opacity-50 cursor-pointer`}
          >
            {label}
          </button>
        );
      }
      case 'valor':
        return (
          <span className={`${textClass} text-white font-medium`}>
            {formatCurrency((venda.valor_venda || 0) + (venda.valor_credito || 0))}
          </span>
        );
      case 'excedido_desconto': {
        const { excedidoPct, excedidoValor } = calcularExcedidoDesconto(venda, limAvista, limPresencial, limResponsavel);
        if (excedidoValor <= 0) {
          return <span className="text-[10px] md:text-sm text-white/40">-</span>;
        }
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] md:text-sm text-red-400 cursor-help underline decoration-dotted underline-offset-2">
                {formatCurrency(excedidoValor)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-700 p-3 max-w-xs">
              <div className="space-y-2">
                <div className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-red-400" />
                  Desconto Excedido
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-white/70">
                    <span className="text-white/50">% Excedido:</span>{' '}
                    <span className="text-red-400">{excedidoPct.toFixed(2)}%</span>
                  </p>
                  <p className="text-white/70">
                    <span className="text-white/50">Valor:</span>{' '}
                    <span className="text-red-400">{formatCurrency(excedidoValor)}</span>
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
      case 'lucro': {
        if (!isFaturada()) {
          return <span className="text-[10px] md:text-sm text-white/40">-</span>;
        }
        const lucroReal = calcularLucroReal(venda, limAvista, limPresencial, limResponsavel);
        const cls = lucroReal >= 0 ? 'text-emerald-400' : 'text-red-400';
        return (
          <span className={`text-[10px] md:text-sm font-medium ${cls}`}>
            {formatCurrency(lucroReal)}
          </span>
        );
      }
      case 'formalizacao': {
        const isLoading = downloadingPdfId === venda.id;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDownloadFormalizacao(venda); }}
                disabled={isLoading}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white/80"
                aria-label="Baixar formalização"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-700 text-white text-xs">
              Baixar PDF de formalização
            </TooltipContent>
          </Tooltip>
        );
      }
      default:
        return null;
    }
  }, [metodosExtraPorVenda, parcelasPorVenda, toggleTemperatura, togglingTempId, limAvista, limPresencial, limResponsavel, downloadingPdfId, handleDownloadFormalizacao]);

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
      case 'valor_tabela':
      case 'desconto_acrescimo':
      case 'excedido_desconto':
      case 'faturada':
      case 'temperatura':
        return 'hidden lg:table-cell';
      default:
        return '';
    }
  };

  // Estilo de alinhamento por coluna
  const getColumnAlignment = (columnId: string) => {
    switch (columnId) {
      case 'valor':
      case 'valor_tabela':
      case 'frete':
      case 'desconto_acrescimo':
      case 'excedido_desconto':
      case 'lucro':
        return 'text-right';
      case 'faturada':
      case 'temperatura':
      case 'formalizacao':
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
        onClick={() => navigate('/direcao/vendas/relatorio-itens-avulsos')}
        className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <Package className="h-4 w-4 mr-2" />
        Itens avulsos
      </Button>
      <DropdownMenu>
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
        backPath="/direcao/vendas"
        fullWidth
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Direção", path: "/direcao" },
          { label: "Vendas", path: "/direcao/vendas" },
          { label: "Todas as Vendas" }
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
      title="Todas as Vendas" 
      subtitle="Todas as vendas do período"
      backPath="/direcao/vendas"
      fullWidth
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Vendas", path: "/direcao/vendas" },
        { label: "Todas as Vendas" }
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
        <button
          type="button"
          onClick={() => setPortasModalOpen(true)}
          className="h-[50px] md:h-auto p-1 md:p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-left transition hover:border-blue-400/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          title="Ver detalhamento das portas"
        >
          <div className="h-full px-3 py-1 md:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-700/10 flex items-center justify-between">
            <div className="flex items-center gap-3 md:block">
              <p className="text-xs text-white/60">Portas</p>
              <p className="text-lg md:text-2xl font-bold text-white">{stats.totalPortasEnrolar}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            </div>
          </div>
        </button>
      </div>

      <PortasDetalhesModal
        open={portasModalOpen}
        onOpenChange={setPortasModalOpen}
        vendas={filteredVendas || []}
        limAvista={limAvista}
        limPresencial={limPresencial}
        limResponsavel={limResponsavel}
        calcularExcedidoDesconto={calcularExcedidoDesconto}
      />

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

      </div>

      {/* Tabela */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        <div className="rounded-lg overflow-hidden [&_table]:table-fixed [&_table]:w-full">
          <TooltipProvider delayDuration={200}>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  {visibleColumns.map(column => (
                    <TableHead 
                      key={column.id}
                      className={`text-[10px] md:text-xs text-white/60 cursor-pointer hover:bg-white/5 transition-colors select-none py-2 px-1.5 md:px-2 ${getColumnAlignment(column.id)} ${getColumnResponsiveClass(column.id)}`}
                      onClick={() => handleSort(column.id)}
                    >
                      <div className={`flex items-center gap-0.5 md:gap-1 ${column.id === 'valor' || column.id === 'valor_tabela' || column.id === 'frete' || column.id === 'desconto_acrescimo' || column.id === 'excedido_desconto' || column.id === 'lucro' ? 'justify-end' : column.id === 'faturada' || column.id === 'temperatura' ? 'justify-center' : ''}`}>
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
                          className={`py-2.5 px-1.5 md:px-2 text-xs truncate ${getColumnAlignment(column.id)} ${getColumnResponsiveClass(column.id)}`}
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

      <AlertDialog
        open={!!dispensarVenda}
        onOpenChange={(o) => { if (!o && !dispensandoId) setDispensarVenda(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispensar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda de <strong>{dispensarVenda?.cliente_nome || 'cliente'}</strong> será marcada como sem necessidade de contrato assinado. Esta ação fica registrada e pode ser revertida pela equipe administrativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!dispensandoId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!dispensandoId}
              onClick={async (e) => {
                e.preventDefault();
                if (!dispensarVenda) return;
                setDispensandoId(dispensarVenda.id);
                try {
                  const { error } = await supabase
                    .from('vendas')
                    .update({
                      contrato_dispensado: true,
                      contrato_dispensado_em: new Date().toISOString(),
                      contrato_dispensado_por: user?.id ?? null,
                    })
                    .eq('id', dispensarVenda.id);
                  if (error) throw error;
                  await queryClient.invalidateQueries({ queryKey: ['vendas'] });
                  toast({ title: 'Contrato dispensado' });
                  setDispensarVenda(null);
                } catch (err: any) {
                  toast({ title: 'Erro ao dispensar contrato', description: err?.message, variant: 'destructive' });
                } finally {
                  setDispensandoId(null);
                }
              }}
            >
              {dispensandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Dispensar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
