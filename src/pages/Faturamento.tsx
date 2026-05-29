import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, DollarSign, TrendingUp, Users, Plus, Filter, Trash2, Edit, Download, CalendarIcon, Receipt, DoorOpen, Wrench, Hammer, Palette, Percent, FileText, CheckCircle2, Clock, Package, ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BulkUploadVendas from "@/components/BulkUploadVendas";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { isVendaFaturada } from "@/lib/faturamentoStatus";
import { StatusBadge } from "@/components/vendas/StatusBadge";

import { ProductIconsSummary } from "@/components/vendas/ProductIconsSummary";
import { VendaDetailsModal } from "@/components/vendas/VendaDetailsModal";
import { generateFaturamentoPDF } from "@/utils/faturamentoPDFGenerator";
import { usePedidoCreation } from "@/hooks/usePedidoCreation";
import { RelatorioProdutos } from "@/components/vendas/RelatorioProdutos";
import { ConfirmarExclusaoVendaModal } from "@/components/vendas/ConfirmarExclusaoVendaModal";

interface Venda {
  id: string;
  data_venda: string;
  atendente_id: string;
  atendente_nome: string;
  atendente_foto?: string | null;
  publico_alvo: string | null;
  canal_aquisicao_id: string | null;
  canais_aquisicao?: {
    id: string;
    nome: string;
  };
  estado: string | null;
  cidade: string | null;
  cep: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
  valor_produto: number;
  custo_produto: number;
  valor_pintura: number;
  custo_pintura: number;
  valor_instalacao: number;
  valor_frete: number;
  valor_venda: number;
  valor_credito?: number;
  lucro_total: number;
  frete_aprovado?: boolean;
  portas?: any[];
  comprovante_url?: string | null;
  comprovante_nome?: string | null;
  contratos_vendas?: { id: string; arquivo_url: string; nome_arquivo: string }[];
}

interface VendaStats {
  // Dados por estado
  rs: {
    lucroProdutos: number;
    lucroPintura: number;
    totalInstalacoes: number;
    totalFretes: number;
    lucroTotal: number;
    faturamentoTotal: number;
  };
  sc: {
    lucroProdutos: number;
    lucroPintura: number;
    totalInstalacoes: number;
    totalFretes: number;
    lucroTotal: number;
    faturamentoTotal: number;
  };
  total: {
    lucroProdutos: number;
    lucroPintura: number;
    totalInstalacoes: number;
    totalFretes: number;
    lucroTotal: number;
    faturamentoTotal: number;
  };
}

export default function Faturamento() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [stats, setStats] = useState<VendaStats>({
    rs: {
      lucroProdutos: 0,
      lucroPintura: 0,
      totalInstalacoes: 0,
      totalFretes: 0,
      lucroTotal: 0,
      faturamentoTotal: 0,
    },
    sc: {
      lucroProdutos: 0,
      lucroPintura: 0,
      totalInstalacoes: 0,
      totalFretes: 0,
      lucroTotal: 0,
      faturamentoTotal: 0,
    },
    total: {
      lucroProdutos: 0,
      lucroPintura: 0,
      totalInstalacoes: 0,
      totalFretes: 0,
      lucroTotal: 0,
      faturamentoTotal: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublico, setFilterPublico] = useState("todos");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'todas' | 'faturadas' | 'nao_faturadas'>('todas');
  const [selectedAtendente, setSelectedAtendente] = useState<string>("todos");
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [selectedVenda, setSelectedVenda] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<{ id: string; clienteNome: string } | null>(null);
  const [isDeletingVenda, setIsDeletingVenda] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createPedidoFromVenda } = usePedidoCreation();

  // Função para verificar se uma venda está faturada
  const isFaturada = (venda: Venda) => isVendaFaturada(venda);


  // Função para calcular total de descontos
  const calculateTotalDiscount = (venda: Venda) => {
    const portas = venda.portas || [];
    
    let totalDescontoValor = 0;
    
    portas.forEach((produto: any) => {
      if (produto.tipo_desconto === 'valor') {
        totalDescontoValor += produto.desconto_valor || 0;
      } else if (produto.tipo_desconto === 'percentual') {
        const valorProduto = produto.valor_produto || 0;
        const desconto = (valorProduto * (produto.desconto_percentual || 0)) / 100;
        totalDescontoValor += desconto;
      }
    });
    
    return totalDescontoValor;
  };

  // Handler de double click
  const handleRowDoubleClick = (venda: Venda) => {
    setSelectedVenda(venda);
    setIsDetailsModalOpen(true);
  };

  useEffect(() => {
    fetchVendas();
    fetchStats();
    fetchAtendentes();
  }, [dateRange]);

  const fetchAtendentes = async () => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id, nome')
      .order('nome');
    if (data) setAtendentes(data);
  };

  const fetchVendas = async () => {
    try {
      let query = supabase
        .from("vendas")
        .select(`
          id,
          data_venda,
          atendente_id,
          publico_alvo,
          canal_aquisicao_id,
          estado,
          cidade,
          cep,
          cliente_nome,
          cliente_telefone,
          cliente_email,
          valor_instalacao,
          valor_frete,
          valor_venda,
          valor_credito,
          lucro_total,
          custo_total,
          frete_aprovado,
          comprovante_url,
          comprovante_nome,
          contratos_vendas (
            id,
            arquivo_url,
            nome_arquivo
          ),
          canais_aquisicao:canal_aquisicao_id (
            id,
            nome
          ),
          produtos_vendas (
            id,
            tipo_produto,
            descricao,
            valor_produto,
            valor_pintura,
            valor_instalacao,
            valor_total,
            quantidade,
            desconto_percentual,
            desconto_valor,
            tipo_desconto,
            tamanho,
            lucro_item,
            lucro_produto,
            lucro_pintura,
            custo_produto,
            custo_pintura,
            margem_produto,
            margem_pintura,
            faturamento
          )
        `)
        .order("data_venda", { ascending: false });

      if (dateRange?.from && dateRange?.to) {
        const startDate = format(dateRange.from, "yyyy-MM-dd");
        const endDate = format(dateRange.to, "yyyy-MM-dd");
        
        query = query
          .gte("data_venda", startDate + " 00:00:00")
          .lte("data_venda", endDate + " 23:59:59");
      }

      const { data: vendasData, error } = await query;

      if (error) throw error;

      if (!vendasData || vendasData.length === 0) {
        setVendas([]);
        return;
      }

      // Buscar todos os usuários para mapear atendentes
      const { data: todosUsuarios } = await supabase
        .from("admin_users")
        .select("user_id, nome, foto_perfil_url");

      const atendenteMap = new Map();
      if (todosUsuarios) {
        todosUsuarios.forEach(user => {
          atendenteMap.set(user.user_id, { nome: user.nome, foto: user.foto_perfil_url });
        });
      }

      const vendasCompletas = vendasData.map((venda: any) => {
        const atendenteData = venda.atendente_id ? atendenteMap.get(venda.atendente_id) : null;
        const portas = venda.produtos_vendas || [];
        
        // Calcular valores agregados dos produtos
        const valor_produto = portas.reduce((acc: number, p: any) => 
          acc + (p.valor_produto || 0) * (p.quantidade || 1), 0);
        const valor_pintura = portas.reduce((acc: number, p: any) => 
          acc + (p.valor_pintura || 0) * (p.quantidade || 1), 0);
        
        // Corrigir cálculo de custos: devem vir dos produtos apenas se foram faturados (lucro_item > 0)
        const portasFaturadas = portas.filter((p: any) => (p.lucro_item || 0) > 0);
        const custo_produto = portasFaturadas.reduce((acc: number, p: any) => 
          acc + ((p.custo_produto || 0) * (p.quantidade || 1)), 0);
        const custo_pintura = portasFaturadas.reduce((acc: number, p: any) => 
          acc + ((p.custo_pintura || 0) * (p.quantidade || 1)), 0);
        
        return {
          ...venda,
          atendente_nome: atendenteData?.nome || "Atendente não encontrado",
          atendente_foto: atendenteData?.foto || null,
          portas,
          valor_produto,
          valor_pintura,
          custo_produto,
          custo_pintura,
        };
      });

      setVendas(vendasCompletas);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (!dateRange?.from || !dateRange?.to) return;

      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const { data: vendasPeriodo, error } = await supabase
        .from("vendas")
        .select("valor_venda, valor_credito, custo_total, valor_instalacao, valor_frete, lucro_total, estado")
        .gte("data_venda", startDate + " 00:00:00")
        .lte("data_venda", endDate + " 23:59:59");

      if (error) throw error;

      const vendasRS = vendasPeriodo?.filter(v => v.estado === 'RS') || [];
      const vendasSC = vendasPeriodo?.filter(v => v.estado === 'SC') || [];
      const todasVendas = vendasPeriodo || [];

      const calcularStats = (vendas: any[]) => ({
        lucroProdutos: 0,
        lucroPintura: 0,
        totalInstalacoes: vendas.reduce((acc, v) => acc + (v.valor_instalacao || 0), 0),
        totalFretes: vendas.reduce((acc, v) => acc + (v.valor_frete || 0), 0),
        lucroTotal: vendas.reduce((acc, v) => acc + (v.lucro_total || 0), 0),
        faturamentoTotal: vendas.reduce((acc, v) => acc + (v.valor_venda || 0) + (v.valor_credito || 0), 0),
      });

      setStats({
        rs: calcularStats(vendasRS),
        sc: calcularStats(vendasSC),
        total: calcularStats(todasVendas),
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const handleDeleteVenda = async (vendaId: string) => {
    setIsDeletingVenda(true);
    try {
      // Usar a função RPC que exclui em cascata
      const { error } = await supabase.rpc('delete_venda_completa', {
        p_venda_id: vendaId
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Venda e todos os itens vinculados excluídos com sucesso",
      });

      setExcluirModalOpen(false);
      setVendaParaExcluir(null);
      fetchVendas();
      fetchStats();
    } catch (error) {
      console.error("Erro ao excluir venda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir venda",
      });
    } finally {
      setIsDeletingVenda(false);
    }
  };

  const handleGeneratePDF = () => {
    // Validação: limite de 1000 registros
    if (filteredVendas.length > 1000) {
      toast({
        variant: "destructive",
        title: "Muitos registros",
        description: "O PDF suporta no máximo 1000 registros. Por favor, aplique filtros para reduzir o número de vendas.",
      });
      return;
    }

    // Calcular estatísticas com base nas vendas filtradas
    const vendasFaturadas = filteredVendas.filter(isFaturada);
    
    // Usar a mesma lógica de cálculo dos indicadores (incluindo valor_credito)
    const stats = {
      faturamentoTotal: filteredVendas.reduce((acc, v) => 
        acc + ((v.valor_venda || 0) + (v.valor_credito || 0) - (v.valor_frete || 0)), 0),
      custosProducao: vendasFaturadas.reduce((acc, v) => 
        acc + (v.custo_produto || 0), 0),
      custosPintura: vendasFaturadas.reduce((acc, v) => 
        acc + (v.custo_pintura || 0), 0),
      instalacoesTotais: filteredVendas.reduce((acc, v) => 
        acc + (v.valor_instalacao || 0), 0),
      fretesTotais: filteredVendas.reduce((acc, v) => 
        acc + (v.valor_frete || 0), 0),
      quantidadePortas: filteredVendas.reduce((acc, v) => {
        const portas = v.portas || [];
        return acc + portas.reduce((sum: number, p: any) => sum + (p.quantidade || 0), 0);
      }, 0),
    // Lucros calculados usando lucro_item (corrigido) - SEM contar frete
    lucroPintura: vendasFaturadas.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas
        .filter((p: any) => p.tipo_produto === 'pintura_epoxi')
        .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
    }, 0),
    lucroPortas: vendasFaturadas.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas
        .filter((p: any) => ['porta', 'porta_enrolar'].includes(p.tipo_produto))
        .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
    }, 0),
    // Lucro Bruto Total = Lucro dos Itens + Instalações (SEM incluir frete)
    lucroBrutoTotal: vendasFaturadas.reduce((acc, v) => {
      const portas = v.portas || [];
      const lucroItens = portas.reduce((sum: number, p: any) => 
        sum + (p.lucro_item || 0), 0);
      // Instalação é considerada lucro líquido
      const valorInstalacoes = v.valor_instalacao || 0;
      // NÃO incluir frete no lucro bruto
      return acc + lucroItens + valorInstalacoes;
    }, 0),
    };

    // Preparar dados do período
    const periodo = dateRange?.from && dateRange?.to 
      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
      : undefined;

    // Chamar gerador
    generateFaturamentoPDF({
      vendas: filteredVendas,
      stats,
      filtros: {
        tab: activeTab,
        periodo,
      }
    });
    
    toast({
      title: "PDF gerado com sucesso!",
      description: "O arquivo foi baixado automaticamente.",
    });
  };

  const filteredVendas = vendas.filter(venda => {
    // Filtro de aba
    if (activeTab === 'faturadas' && !isFaturada(venda)) return false;
    if (activeTab === 'nao_faturadas' && isFaturada(venda)) return false;

    // Filtro por atendente
    if (selectedAtendente !== "todos" && venda.atendente_id !== selectedAtendente) {
      return false;
    }

    // Filtros de busca e público
    const matchesSearch = 
      (venda.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (venda.atendente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (venda.cidade?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPublico = filterPublico === "todos" || venda.publico_alvo === filterPublico;

    return matchesSearch && matchesPublico;
  });

  // Separar vendas faturadas para cálculo de indicadores
  const vendasFaturadas = filteredVendas.filter(isFaturada);
  const vendasNaoFaturadas = filteredVendas.filter(v => !isFaturada(v));

  // Selecionar vendas com base no activeTab
  const vendasParaIndicadores = 
    activeTab === 'faturadas' ? vendasFaturadas :
    activeTab === 'nao_faturadas' ? vendasNaoFaturadas :
    filteredVendas; // todas

  // Para lucros, SEMPRE usar apenas vendas faturadas, independente da aba
  const vendasParaLucros = filteredVendas.filter(isFaturada);

  // Calcular novos indicadores baseados na seleção ativa
  const indicadores = {
    quantidadePortas: vendasParaIndicadores.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas.filter((p: any) => 
        ['porta', 'porta_enrolar'].includes(p.tipo_produto)
      ).reduce((sum: number, p: any) => sum + (p.quantidade || 1), 0);
    }, 0),
    
    // Lucros calculados apenas de vendas faturadas
    // Usar lucro_item ao invés de lucro_pintura/lucro_produto pois estes estão zerados
    lucroPintura: vendasParaLucros.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas
        .filter((p: any) => p.tipo_produto === 'pintura_epoxi')
        .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
    }, 0),
    
    lucroPortas: vendasParaLucros.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas
        .filter((p: any) => ['porta', 'porta_enrolar'].includes(p.tipo_produto))
        .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
    }, 0),
    
    lucroInstalacoes: vendasParaLucros.reduce((acc, v) => 
      acc + (v.valor_instalacao || 0), 0),
    
    lucroBrutoTotal: vendasParaLucros.reduce((acc, v) => {
      const portas = v.portas || [];
      // Somar todos os lucros dos itens faturados
      const lucroItens = portas.reduce((sum: number, p: any) => 
        sum + (p.lucro_item || 0), 0);
      // Adicionar valor das instalações (que é considerado lucro)
      const valorInstalacoes = v.valor_instalacao || 0;
      
      return acc + lucroItens + valorInstalacoes;
    }, 0),
    
    faturamentoTotal: vendasParaIndicadores.reduce((acc, v) => 
      acc + ((v.valor_venda || 0) + (v.valor_credito || 0) - (v.valor_frete || 0)), 0),
    
    fretesTotais: vendasParaIndicadores.reduce((acc, v) => 
      acc + (v.valor_frete || 0), 0),
  };

  // Debug logs para verificar filtros e cálculos
  console.log('[FATURAMENTO DEBUG]', {
    totalVendas: vendas.length,
    filteredVendas: filteredVendas.length,
    vendasParaIndicadores: vendasParaIndicadores.length,
    vendasParaLucros: vendasParaLucros.length,
    activeTab,
    dateRange: {
      from: dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : null,
      to: dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : null
    },
    indicadores: {
      faturamentoTotal: indicadores.faturamentoTotal.toFixed(2),
      lucroPortas: indicadores.lucroPortas.toFixed(2),
      lucroPintura: indicadores.lucroPintura.toFixed(2),
      lucroInstalacoes: indicadores.lucroInstalacoes.toFixed(2),
      lucroBrutoTotal: indicadores.lucroBrutoTotal.toFixed(2),
      quantidadePortas: indicadores.quantidadePortas,
    }
  });

  const meses = [
    { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" }, { value: 4, label: "Abril" },
    { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
    { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faturamento</h1>
          <p className="text-muted-foreground">
            Gestão de vendas e controle financeiro
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Button onClick={handleGeneratePDF} variant="outline" size="sm" className="w-full justify-start">
            <FileText className="w-4 h-4 mr-2" />
            Gerar Relatório PDF
          </Button>
          <Button onClick={() => navigate("/dashboard/vendas/nova")} size="sm" className="w-full justify-start">
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/vendas/vincular")} size="sm" className="w-full justify-start">
            Vincular Lead
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6">
          {/* Filters and Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Histórico de Vendas</CardTitle>
                  <CardDescription>
                    {filteredVendas.length} vendas encontradas
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Período:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-64 justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                                {format(dateRange.to, "dd/MM/yyyy")}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy")
                            )
                          ) : (
                            <span>Selecione um período</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={(range) => {
                            setDateRange(range);
                          }}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setLoading(true);
                        fetchVendas();
                        fetchStats();
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>

                  <Select value={selectedAtendente} onValueChange={setSelectedAtendente}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todos os atendentes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os atendentes</SelectItem>
                      {atendentes.map(atendente => (
                        <SelectItem key={atendente.user_id} value={atendente.user_id}>
                          {atendente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente, atendente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                
                <Select value={filterPublico} onValueChange={setFilterPublico}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Público" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="serralheiro">Serralheiro</SelectItem>
                    <SelectItem value="cliente_final">Cliente Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {/* Status de Faturamento - Botões Circulares */}
          <Card>
            <CardHeader>
              <CardTitle>Status de Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Botão: Todas */}
                <button
                  onClick={() => setActiveTab('todas')}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg transition-all hover:bg-muted/50"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                    activeTab === 'todas' 
                      ? "bg-blue-600 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Todas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {filteredVendas.length}
                    </p>
                  </div>
                </button>

                {/* Botão: Faturadas */}
                <button
                  onClick={() => setActiveTab('faturadas')}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg transition-all hover:bg-muted/50"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                    activeTab === 'faturadas' 
                      ? "bg-green-600 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Faturadas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {vendasFaturadas.length}
                    </p>
                  </div>
                </button>

                {/* Botão: Não Faturadas */}
                <button
                  onClick={() => setActiveTab('nao_faturadas')}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg transition-all hover:bg-muted/50"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                    activeTab === 'nao_faturadas' 
                      ? "bg-amber-500 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Não Faturadas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {filteredVendas.length - vendasFaturadas.length}
                    </p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Indicadores em Colunas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Indicadores do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span>Faturamento Total</span>
                          <span className="text-xs font-normal text-muted-foreground">(sem frete)</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <DoorOpen className="h-4 w-4 text-slate-600" />
                          <span>Qtd Portas</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <DoorOpen className="h-4 w-4 text-amber-600" />
                          <span>Lucro Portas</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <Palette className="h-4 w-4 text-purple-600" />
                          <span>Lucro Pintura</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <Wrench className="h-4 w-4 text-cyan-600" />
                          <span>Instalações</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-indigo-600" />
                          <span>Fretes</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">
                        <div className="flex flex-col items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span>Lucro Bruto</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-center py-4 px-2 font-bold text-blue-600">
                        R$ {indicadores.faturamentoTotal.toLocaleString("pt-BR", { 
                          minimumFractionDigits: 2 
                        })}
                      </td>
                      <td className="text-center py-4 px-2 font-semibold">
                        {indicadores.quantidadePortas}
                      </td>
                      <td className="text-center py-4 px-2 font-semibold text-amber-600">
                        R$ {indicadores.lucroPortas.toLocaleString("pt-BR", { 
                          minimumFractionDigits: 2 
                        })}
                      </td>
                      <td className="text-center py-4 px-2 font-semibold text-purple-600">
                        R$ {indicadores.lucroPintura.toLocaleString("pt-BR", { 
                          minimumFractionDigits: 2 
                        })}
                      </td>
                      <td className="text-center py-4 px-2 font-semibold text-cyan-600">
                        R$ {indicadores.lucroInstalacoes.toLocaleString("pt-BR", { 
                          minimumFractionDigits: 2 
                        })}
                      </td>
                      <td className="text-center py-4 px-2 font-semibold text-indigo-600">
                        R$ {indicadores.fretesTotais.toLocaleString("pt-BR", { 
                          minimumFractionDigits: 2 
                        })}
                      </td>
                      <td className="text-center py-4 px-2 font-bold text-green-600 text-lg">
                        R$ {indicadores.lucroBrutoTotal.toLocaleString("pt-BR", { 
                          minimumFractionDigits: 2 
                        })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Relatório por Produtos */}
          <RelatorioProdutos 
            dateRange={dateRange}
            selectedAtendente={selectedAtendente}
            filterPublico={filterPublico}
          />

          {/* Tabela de Vendas */}
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Atendente</TableHead>
                      <TableHead className="text-xs">Produtos</TableHead>
                      <TableHead className="text-xs text-right">Valor Produtos</TableHead>
                      <TableHead className="text-xs text-right">Descontos</TableHead>
                      <TableHead className="text-xs text-right">% Desconto</TableHead>
                      <TableHead className="text-xs text-right">Acréscimo</TableHead>
                      <TableHead className="text-xs text-right">Custos</TableHead>
                      <TableHead className="text-xs text-right">% Margem</TableHead>
                      <TableHead className="text-xs text-right">Instalação</TableHead>
                      <TableHead className="text-xs text-right">Frete</TableHead>
                      <TableHead className="text-xs text-right">Lucro Bruto</TableHead>
                      <TableHead className="text-xs text-right">Valor Final</TableHead>
                      <TableHead className="text-xs text-right">Valor Final c/ Frete</TableHead>
                      <TableHead className="text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendas.map((venda) => (
                      <TableRow 
                        key={venda.id}
                        onDoubleClick={() => handleRowDoubleClick(venda)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        title="Clique duas vezes para ver todos os detalhes"
                      >
                        <TableCell>
                          <StatusBadge 
                            isFaturada={isFaturada(venda)}
                          />
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-medium">{venda.cliente_nome || '-'}</span>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={venda.atendente_foto || undefined} alt={venda.atendente_nome} />
                              <AvatarFallback className="text-[10px]">
                                {venda.atendente_nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{venda.atendente_nome}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <ProductIconsSummary venda={venda} />
                        </TableCell>

                        <TableCell className="text-right text-xs font-medium">
                          R$ {((venda.valor_produto || 0) + (venda.valor_pintura || 0))
                            .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          {calculateTotalDiscount(venda) > 0 ? (
                            <Badge variant="destructive" className="text-[10px] font-medium px-1.5 py-0.5">
                              - R$ {calculateTotalDiscount(venda).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          {(() => {
                            const desconto = calculateTotalDiscount(venda);
                            const valorProdutos = (venda.valor_produto || 0) + (venda.valor_pintura || 0);
                            const valorOriginal = valorProdutos + desconto;
                            const percentualDesconto = valorOriginal > 0 ? (desconto / valorOriginal) * 100 : 0;
                            
                            return desconto > 0 ? (
                              <span className="font-medium text-red-600">
                                {percentualDesconto.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          {(venda.valor_credito || 0) > 0 ? (
                            <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0.5 text-emerald-600 border-emerald-600">
                              + R$ {(venda.valor_credito || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          <span className="font-medium text-orange-600">
                            R$ {((venda.custo_produto || 0) + (venda.custo_pintura || 0))
                              .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          {(() => {
                            const custosTotais = (venda.custo_produto || 0) + (venda.custo_pintura || 0);
                            const valorVendaTotal = (venda.valor_venda || 0) + (venda.valor_credito || 0);
                            const valorFinal = valorVendaTotal - (venda.valor_frete || 0);
                            const margem = custosTotais > 0 ? ((valorFinal - custosTotais) / custosTotais) * 100 : 0;
                            
                            if (custosTotais === 0) {
                              return <span className="text-muted-foreground">-</span>;
                            }
                            
                            const margemColor = margem >= 0 ? 'text-green-600' : 'text-red-600';
                            
                            return (
                              <span className={`font-semibold ${margemColor}`}>
                                {margem >= 0 ? '+' : ''}{margem.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          R$ {(venda.valor_instalacao || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          R$ {(venda.valor_frete || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell className="text-right text-xs font-semibold text-green-600">
                          {isFaturada(venda) ? (
                            `R$ ${(venda.lucro_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs font-semibold text-primary">
                          {(() => {
                            const valorVendaTotal = (venda.valor_venda || 0) + (venda.valor_credito || 0);
                            return `R$ ${(valorVendaTotal - (venda.valor_frete || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                          })()}
                        </TableCell>

                        <TableCell className="text-right text-xs font-semibold">
                          R$ {((venda.valor_venda || 0) + (venda.valor_credito || 0))
                            .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Botão Criar Pedido - apenas para vendas faturadas sem pedido */}
                            {isFaturada(venda) && !(venda as any).pedido_id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    title="Criar pedido de produção"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Package className="w-4 h-4 text-blue-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Criar Pedido de Produção</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Deseja criar um pedido de produção para esta venda?
                                      Cliente: {venda.cliente_nome}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={async () => {
                                        const pedidoId = await createPedidoFromVenda(venda.id);
                                        if (pedidoId) {
                                          fetchVendas();
                                        }
                                      }}
                                    >
                                      Criar Pedido
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            {/* Botão Acessar Pedido - se houver pedido */}
                            {(venda as any).pedido_id && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/pedido/${(venda as any).pedido_id}/view`);
                                }}
                                title="Ver pedido de produção"
                              >
                                <Package className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}

                            {/* Botão Visualizar Comprovante */}
                            {venda.comprovante_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(venda.comprovante_url!, '_blank');
                                }}
                                title="Visualizar comprovante"
                              >
                                <Paperclip className="w-4 h-4 text-green-600" />
                              </Button>
                            )}

                            {/* Botão Visualizar Contrato */}
                            {venda.contratos_vendas && venda.contratos_vendas.length > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(venda.contratos_vendas![0].arquivo_url, '_blank');
                                }}
                                title="Visualizar contrato"
                              >
                                <FileText className="w-4 h-4 text-purple-600" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/administrativo/financeiro/faturamento/${venda.id}/editar`);
                              }}
                              title="Editar faturamento"
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Excluir venda"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVendaParaExcluir({ id: venda.id, clienteNome: venda.cliente_nome || 'Cliente' });
                                setExcluirModalOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="upload">
          <BulkUploadVendas onUploadComplete={() => {
            fetchVendas();
            fetchStats();
          }} />
        </TabsContent>
      </Tabs>

      <VendaDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        venda={selectedVenda}
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
          onConfirm={() => handleDeleteVenda(vendaParaExcluir.id)}
          isDeleting={isDeletingVenda}
        />
      )}
    </div>
  );
}