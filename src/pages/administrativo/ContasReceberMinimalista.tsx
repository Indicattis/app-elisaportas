import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft, HandCoins, Check, CalendarIcon, Paperclip,
  MoreHorizontal, Download, Filter, PanelRight, X, Search, Trash2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { format, parseISO, isBefore, isToday, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { cn } from "@/lib/utils";
import { useAllUsers } from "@/hooks/useAllUsers";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import * as XLSX from "xlsx";

interface ContaReceber {
  id: string;
  venda_id: string;
  created_at: string;
  numero_parcela: number;
  valor_parcela: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  metodo_pagamento: string | null;
  empresa_receptora_id: string | null;
  observacoes: string | null;
  comprovante_url: string | null;
  venda?: {
    cliente_nome: string;
    cliente_telefone: string;
    valor_venda: number;
    atendente_id: string | null;
  };
  empresa?: {
    nome: string;
  };
}

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "vencido", label: "Vencido" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

const METODO_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
];

export default function ContasReceberMinimalista() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Search & date range
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Filters
  const [filtroStatus, setFiltroStatus] = useState<string[]>(["pendente", "vencido"]);
  const [filtroMetodo, setFiltroMetodo] = useState<string[]>([]);
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [dialogPagarOpen, setDialogPagarOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaReceber | null>(null);
  const [valorPago, setValorPago] = useState("");
  const [dataPagamento, setDataPagamento] = useState<Date | undefined>(new Date());

  // Historico edit
  const [editingHistoricoId, setEditingHistoricoId] = useState<string | null>(null);
  const [historicoValue, setHistoricoValue] = useState("");

  // Mobile sheets
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: allUsers = [] } = useAllUsers();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ['contas-receber-min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      const vendaIds = [...new Set((data || []).map(c => c.venda_id))];
      const empresaIds = [...new Set((data || []).map(c => c.empresa_receptora_id).filter(Boolean))];

      let vendasMap: Record<string, any> = {};
      if (vendaIds.length > 0) {
        const { data: vendas } = await supabase
          .from('vendas')
          .select('id, cliente_nome, cliente_telefone, valor_venda, atendente_id')
          .in('id', vendaIds);
        (vendas || []).forEach(v => { vendasMap[v.id] = v; });
      }

      let empresasMap: Record<string, any> = {};
      if (empresaIds.length > 0) {
        const { data: empresas } = await supabase
          .from('empresas_emissoras')
          .select('id, nome')
          .in('id', empresaIds);
        (empresas || []).forEach(e => { empresasMap[e.id] = e; });
      }

      return (data || []).map(conta => ({
        ...conta,
        venda: vendasMap[conta.venda_id],
        empresa: conta.empresa_receptora_id ? empresasMap[conta.empresa_receptora_id] : undefined
      })) as ContaReceber[];
    }
  });

  // Get unique vendedores from contas
  const vendedores = useMemo(() => {
    const atendenteIds = new Set<string>();
    contas.forEach(c => {
      if (c.venda?.atendente_id) atendenteIds.add(c.venda.atendente_id);
    });
    return allUsers.filter(u => atendenteIds.has(u.user_id));
  }, [contas, allUsers]);

  const hoje = new Date();

  const getComputedStatus = useCallback((conta: ContaReceber) => {
    if (conta.status === 'pago') return 'pago';
    if (conta.status === 'cancelado') return 'cancelado';
    const dataVenc = parseISO(conta.data_vencimento);
    if (isBefore(dataVenc, hoje) && !isToday(dataVenc)) return 'vencido';
    return 'pendente';
  }, [hoje]);

  const contasFiltradas = useMemo(() => {
    return contas.filter(conta => {
      // Search text
      if (searchText) {
        const nome = (conta.venda?.cliente_nome || 'venda removida').toLowerCase();
        if (!nome.includes(searchText.toLowerCase())) return false;
      }

      // Date range
      if (dateRange.from) {
        const venc = parseISO(conta.data_vencimento);
        if (venc < startOfDay(dateRange.from)) return false;
      }
      if (dateRange.to) {
        const venc = parseISO(conta.data_vencimento);
        if (venc > endOfDay(dateRange.to)) return false;
      }

      // Status filter
      if (filtroStatus.length > 0) {
        const computed = getComputedStatus(conta);
        if (!filtroStatus.includes(computed)) return false;
      }

      // Metodo filter
      if (filtroMetodo.length > 0) {
        if (!conta.metodo_pagamento || !filtroMetodo.includes(conta.metodo_pagamento)) return false;
      }

      // Valor range
      if (filtroValorMin) {
        const min = parseFloat(filtroValorMin.replace(',', '.'));
        if (!isNaN(min) && conta.valor_parcela < min) return false;
      }
      if (filtroValorMax) {
        const max = parseFloat(filtroValorMax.replace(',', '.'));
        if (!isNaN(max) && conta.valor_parcela > max) return false;
      }

      // Vendedor
      if (filtroVendedor !== "todos") {
        if (conta.venda?.atendente_id !== filtroVendedor) return false;
      }

      return true;
    });
  }, [contas, searchText, dateRange, filtroStatus, filtroMetodo, filtroValorMin, filtroValorMax, filtroVendedor, getComputedStatus]);

  const sortedContas = useMemo(() => {
    return [...contasFiltradas].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  }, [contasFiltradas]);

  // Summary
  const summaryData = useMemo(() => {
    const source = selectedIds.size > 0
      ? contasFiltradas.filter(c => selectedIds.has(c.id))
      : contasFiltradas;
    return {
      count: source.length,
      total: source.reduce((s, c) => s + c.valor_parcela, 0),
      isSelection: selectedIds.size > 0,
    };
  }, [contasFiltradas, selectedIds]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getStatusBadge = (conta: ContaReceber) => {
    const status = getComputedStatus(conta);
    if (status === 'pago') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pago</Badge>;
    if (status === 'cancelado') return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Cancelado</Badge>;
    if (status === 'vencido') return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Vencido</Badge>;
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pendente</Badge>;
  };

  // Mutations
  const marcarPagoMutation = useMutation({
    mutationFn: async ({ id, valorPago, dataPagamento }: { id: string; valorPago: number; dataPagamento: string }) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'pago', valor_pago: valorPago, data_pagamento: dataPagamento })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber-min'] });
      toast({ title: "Conta marcada como paga!" });
      setDialogPagarOpen(false);
      setContaSelecionada(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'cancelado' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber-min'] });
      toast({ title: "Conta cancelada" });
    }
  });

  const updateVencimentoMutation = useMutation({
    mutationFn: async ({ id, data_vencimento }: { id: string; data_vencimento: string }) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ data_vencimento })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber-min'] });
      toast({ title: "Vencimento atualizado" });
    }
  });

  const updateObservacoesMutation = useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes: string }) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ observacoes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber-min'] });
      toast({ title: "Histórico atualizado" });
      setEditingHistoricoId(null);
    }
  });

  const deletarSelecionadosMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('contas_receber')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber-min'] });
      toast({ title: `${selectedIds.size} parcela(s) excluída(s)` });
      setSelectedIds(new Set());
      setConfirmDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    }
  });

  const handleMarcarPago = (conta: ContaReceber) => {
    setContaSelecionada(conta);
    setValorPago(conta.valor_parcela.toString());
    setDataPagamento(new Date());
    setDialogPagarOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedContas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedContas.map(c => c.id)));
    }
  };

  const toggleFilterStatus = (val: string) => {
    setFiltroStatus(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const toggleFilterMetodo = (val: string) => {
    setFiltroMetodo(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const clearFilters = () => {
    setFiltroStatus([]);
    setFiltroMetodo([]);
    setFiltroValorMin("");
    setFiltroValorMax("");
    setFiltroVendedor("todos");
  };

  const hasFilters = filtroStatus.length > 0 || filtroMetodo.length > 0 || filtroValorMin || filtroValorMax || filtroVendedor !== "todos";

  const handleExport = () => {
    const source = selectedIds.size > 0
      ? sortedContas.filter(c => selectedIds.has(c.id))
      : sortedContas;
    const rows = source.map(c => ({
      Cliente: c.venda?.cliente_nome || 'Venda removida',
      "Forma Pagamento": c.metodo_pagamento || '—',
      Vencimento: format(parseISO(c.data_vencimento), 'dd/MM/yyyy'),
      Valor: c.valor_parcela,
      Status: getComputedStatus(c),
      Histórico: c.observacoes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Receber");
    XLSX.writeFile(wb, "contas-a-receber.xlsx");
  };

  // Filter sidebar content (shared between desktop and mobile)
  const filterContent = (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Status</p>
        <div className="space-y-2">
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white transition-colors">
              <Checkbox
                checked={filtroStatus.includes(opt.value)}
                onCheckedChange={() => toggleFilterStatus(opt.value)}
                className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Forma de pagamento */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Forma de Pagamento</p>
        <div className="space-y-2">
          {METODO_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white transition-colors">
              <Checkbox
                checked={filtroMetodo.includes(opt.value)}
                onCheckedChange={() => toggleFilterMetodo(opt.value)}
                className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Intervalo de valor */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Intervalo de Valor</p>
        <div className="space-y-2">
          <Input
            placeholder="Mínimo"
            value={filtroValorMin}
            onChange={e => setFiltroValorMin(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
          />
          <Input
            placeholder="Máximo"
            value={filtroValorMax}
            onChange={e => setFiltroValorMax(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
          />
        </div>
      </div>

      {/* Vendedor */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Vendedor</p>
        <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {vendedores.map(v => (
              <SelectItem key={v.user_id} value={v.user_id}>{v.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="w-full text-white/50 hover:text-white hover:bg-white/5" onClick={clearFilters}>
          Limpar Filtros
        </Button>
      )}
    </div>
  );

  // Right sidebar content
  const rightContent = (
    <div className="space-y-6">
      {/* Actions */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Ações</p>
        <Button
          size="sm"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          {selectedIds.size > 0 ? "Baixar Selecionados" : "Baixar Todos"}
        </Button>
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full mt-2"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Selecionados ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Summary */}
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          {summaryData.isSelection ? "Selecionados" : "Total Filtrado"}
        </p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/50">Quantidade</p>
            <p className="text-lg font-bold text-white">{summaryData.count}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/50">Valor Total</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(summaryData.total)}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Caixa", path: "/administrativo/financeiro/caixa" },
          { label: "Contas a Receber" }
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/administrativo/financeiro/caixa')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-20px)', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms' }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 mb-6"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
              <HandCoins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Contas a Receber</h1>
              <p className="text-white/60 text-sm">Gestão de parcelas e recebimentos</p>
            </div>
          </div>

          {/* Mobile buttons for sheets */}
          <div className="flex gap-2 lg:hidden">
            <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-zinc-950 border-white/10 w-[280px]">
                <SheetTitle className="text-white mb-4">Filtros</SheetTitle>
                {filterContent}
              </SheetContent>
            </Sheet>
            <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <PanelRight className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-zinc-950 border-white/10 w-[280px]">
                <SheetTitle className="text-white mb-4">Resumo</SheetTitle>
                {rightContent}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* 3-panel layout */}
        <div
          className="flex gap-4"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms' }}
        >
          {/* Left sidebar - desktop only */}
          <aside className="hidden lg:block w-[250px] shrink-0">
            <div className="sticky top-24 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-semibold text-white mb-4">Filtros</p>
              {filterContent}
            </div>
          </aside>

          {/* Main table */}
          <main className="flex-1 min-w-0">
            {/* Search + Date Range bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  placeholder="Buscar por cliente..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 shrink-0 bg-white/5 border-white/10 text-white hover:bg-white/10",
                      (dateRange.from || dateRange.to) && "border-purple-500/50 text-purple-300"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
                      : dateRange.from
                        ? `${format(dateRange.from, 'dd/MM/yy')} - ...`
                        : "Datas"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="flex gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Data Inicial</p>
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(d) => setDateRange(prev => ({ ...prev, from: d }))}
                        locale={ptBR}
                        className="p-3 pointer-events-auto"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Data Final</p>
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(d) => setDateRange(prev => ({ ...prev, to: d }))}
                        locale={ptBR}
                        className="p-3 pointer-events-auto"
                      />
                    </div>
                  </div>
                  {(dateRange.from || dateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-muted-foreground"
                      onClick={() => setDateRange({ from: undefined, to: undefined })}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpar datas
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                </div>
              ) : sortedContas.length === 0 ? (
                <div className="text-center py-12 text-white/50">Nenhuma conta encontrada</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === sortedContas.length && sortedContas.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                      </TableHead>
                      <TableHead className="text-white/60">Cliente</TableHead>
                      <TableHead className="text-white/60">Histórico</TableHead>
                      <TableHead className="text-white/60">Forma Pgto</TableHead>
                      <TableHead className="text-white/60">Vencimento</TableHead>
                      <TableHead className="text-white/60">Valor</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                      <TableHead className="text-white/60 w-10"></TableHead>
                      <TableHead className="text-white/60 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedContas.map((conta) => (
                      <TableRow key={conta.id} className={cn("border-white/10", selectedIds.has(conta.id) && "bg-purple-500/10")}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(conta.id)}
                            onCheckedChange={() => toggleSelect(conta.id)}
                            className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                        </TableCell>
                        <TableCell className={cn("text-sm", conta.venda?.cliente_nome ? "text-white font-medium" : "text-white/40 italic")}>
                          {conta.venda?.cliente_nome || 'Venda removida'}
                        </TableCell>
                        <TableCell>
                          <Popover
                            open={editingHistoricoId === conta.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingHistoricoId(conta.id);
                                setHistoricoValue(conta.observacoes || "");
                              } else {
                                setEditingHistoricoId(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button className="text-left text-sm text-white/70 hover:text-white truncate max-w-[180px] block transition-colors">
                                {conta.observacoes || <span className="text-white/30 italic">Adicionar...</span>}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                              <div className="space-y-2">
                                <Label className="text-xs">Histórico</Label>
                                <Input
                                  value={historicoValue}
                                  onChange={e => setHistoricoValue(e.target.value)}
                                  placeholder="Digite aqui..."
                                  className="h-8 text-sm"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      updateObservacoesMutation.mutate({ id: conta.id, observacoes: historicoValue });
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  onClick={() => updateObservacoesMutation.mutate({ id: conta.id, observacoes: historicoValue })}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-white/70 text-sm">{conta.metodo_pagamento || '—'}</TableCell>
                        <TableCell className="text-sm">
                          <Popover>
                            <PopoverTrigger asChild>
                              <span className="text-white hover:text-purple-300 cursor-pointer transition-colors">
                                {format(parseISO(conta.data_vencimento), 'dd/MM/yyyy')}
                              </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={parseISO(conta.data_vencimento + 'T12:00:00')}
                                onSelect={(date) => {
                                  if (date) {
                                    const formatted = format(date, 'yyyy-MM-dd') + 'T12:00:00.000Z';
                                    updateVencimentoMutation.mutate({ id: conta.id, data_vencimento: formatted });
                                  }
                                }}
                                locale={ptBR}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-white font-medium text-sm">{formatCurrency(conta.valor_parcela)}</TableCell>
                        <TableCell>{getStatusBadge(conta)}</TableCell>
                        <TableCell>
                          {conta.comprovante_url ? (
                            <a href={conta.comprovante_url} target="_blank" rel="noopener noreferrer">
                              <Paperclip className="h-4 w-4 text-purple-400 hover:text-purple-300 transition-colors" />
                            </a>
                          ) : (
                            <Paperclip className="h-4 w-4 text-white/15" />
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/10">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {conta.status === 'pendente' && (
                                <DropdownMenuItem onClick={() => handleMarcarPago(conta)}>
                                  <Check className="h-4 w-4 mr-2 text-emerald-500" /> Marcar como Pago
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-rose-500 focus:text-rose-500"
                                onClick={() => cancelarMutation.mutate(conta.id)}
                              >
                                <X className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </main>

          {/* Right sidebar - desktop only */}
          <aside className="hidden lg:block w-[250px] shrink-0">
            <div className="sticky top-24 p-4 rounded-xl bg-white/5 border border-white/10">
              {rightContent}
            </div>
          </aside>
        </div>
      </div>

      {/* Dialog Marcar Pago */}
      <Dialog open={dialogPagarOpen} onOpenChange={setDialogPagarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como Pago</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor Pago</Label>
              <Input type="number" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataPagamento ? format(dataPagamento, 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataPagamento} onSelect={setDataPagamento} /></PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPagarOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (contaSelecionada && dataPagamento) {
                marcarPagoMutation.mutate({
                  id: contaSelecionada.id,
                  valorPago: parseFloat(valorPago),
                  dataPagamento: format(dataPagamento, 'yyyy-MM-dd')
                });
              }
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parcelas selecionadas?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir {selectedIds.size} parcela(s) selecionada(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletarSelecionadosMutation.mutate([...selectedIds])}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
