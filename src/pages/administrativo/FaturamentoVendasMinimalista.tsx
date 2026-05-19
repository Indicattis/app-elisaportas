import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useConfiguracoesVendas } from "@/hooks/useConfiguracoesVendas";
import { IndicadorExpandivel } from "@/components/direcao/IndicadorExpandivel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, DollarSign, TrendingUp, CalendarIcon, Download,
  CheckCircle2, Clock, Truck, Wrench, Paintbrush, Target,
  Calculator, AlertCircle, Plus, Minus, Pencil, MessageSquare,
  ArrowUpDown, ArrowUp, ArrowDown, Check, X, Hammer,
  Package, PlusCircle, Filter, PanelRight, Info, FileSignature, FileCheck, FileX
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { isVendaFaturada } from "@/lib/faturamentoStatus";
import { useToast } from "@/hooks/use-toast";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { ColumnManager } from "@/components/ColumnManager";
import { useColumnConfig, ColumnConfig } from "@/hooks/useColumnConfig";
import { generateFaturamentoPDF } from "@/utils/faturamentoPDFGenerator";
import { AnexarContratoModal } from "@/components/vendas/AnexarContratoModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface PagamentoInfo {
  id: string;
  data_vencimento: string;
  metodo_pagamento: string | null;
  status: string;
  observacoes: string | null;
  data_pagamento: string | null;
  valor_parcela: number;
  numero_parcela: number;
}

interface Venda {
  id: string;
  data_venda: string;
  atendente_id: string;
  atendente_nome: string;
  atendente_foto?: string | null;
  publico_alvo: string | null;
  estado: string | null;
  cidade: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
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
  metodo_pagamento?: string | null;
  forma_pagamento?: string | null;
  venda_presencial?: boolean;
  portas?: any[];
  produtos?: any[];
  justificativa_nao_faturada?: string | null;
  data_pagamento_1?: string | null;
  data_pagamento_2?: string | null;
  pagamento_1?: PagamentoInfo | null;
  pagamento_2?: PagamentoInfo | null;
  data_prevista_entrega?: string | null;
  tipo_entrega?: string | null;
  lucro_instalacao?: number;
}

const COLUNAS_DISPONIVEIS: ColumnConfig[] = [
  { id: 'vendedor', label: '-', defaultVisible: true },
  { id: 'cliente', label: 'Cliente', defaultVisible: true },
  { id: 'data', label: 'Data', defaultVisible: true },
  { id: 'cidade', label: 'Cidade', defaultVisible: true },
  { id: 'expedicao', label: 'Expedição', defaultVisible: true },
  { id: 'contrato', label: 'Contrato', defaultVisible: true },
  { id: 'tabela', label: 'Tabela', defaultVisible: true },
  { id: 'valor', label: 'Venda', defaultVisible: true },
  { id: 'desc_cartao', label: 'Cartão', defaultVisible: true },
  { id: 'desc_gelo', label: 'Gelo', defaultVisible: true },
  { id: 'desc_responsavel', label: 'Luan/Alana', defaultVisible: true },
  { id: 'lucro', label: 'Lucro', defaultVisible: true },
  { id: 'tempo_sem_faturar', label: 'Tempo s/ Faturar', defaultVisible: true },
  { id: 'justificativa', label: 'Justificativa', defaultVisible: true },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

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

export default function FaturamentoMinimalista() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { limites: configLimites } = useConfiguracoesVendas();
  const queryClient = useQueryClient();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [selectedAtendente, setSelectedAtendente] = useState<string>("todos");
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [mobileDownbarOpen, setMobileDownbarOpen] = useState(false);
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const [indicadorDrawerOpen, setIndicadorDrawerOpen] = useState(false);
  const [indicadorAtivo, setIndicadorAtivo] = useState<string | null>(null);
  const [auxCores, setAuxCores] = useState<Map<string, { nome: string; hex: string }>>(new Map());
  const [auxAcessorios, setAuxAcessorios] = useState<Map<string, string>>(new Map());
  const [auxAdicionais, setAuxAdicionais] = useState<Map<string, string>>(new Map());
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({ column: null, direction: null });
  const [justificativaDialog, setJustificativaDialog] = useState<{ open: boolean; vendaId: string; vendaCliente: string; justificativa: string }>({ 
    open: false, vendaId: '', vendaCliente: '', justificativa: '' 
  });
  const [savingJustificativa, setSavingJustificativa] = useState(false);
  const [anexarContratoOpen, setAnexarContratoOpen] = useState(false);
  const [dispensarContratoOpen, setDispensarContratoOpen] = useState(false);
  const [dispensandoContrato, setDispensandoContrato] = useState(false);

  const handleUpdatePagamento = async (contaId: string, campo: 'status' | 'observacoes', valor: string) => {
    try {
      const updateData: any = { [campo]: valor };
      if (campo === 'status' && valor === 'pago') {
        updateData.data_pagamento = new Date().toISOString().split('T')[0];
      }
      const { error } = await supabase.from('contas_receber').update(updateData).eq('id', contaId);
      if (error) throw error;
      
      // Update local state
      setVendas(prev => prev.map(v => {
        const update = (pgto: PagamentoInfo | null | undefined) => {
          if (!pgto || pgto.id !== contaId) return pgto;
          return { ...pgto, [campo]: valor, ...(campo === 'status' && valor === 'pago' ? { data_pagamento: updateData.data_pagamento } : {}) };
        };
        return { ...v, pagamento_1: update(v.pagamento_1) || null, pagamento_2: update(v.pagamento_2) || null };
      }));
      if (selectedVenda) {
        setSelectedVenda(prev => {
          if (!prev) return prev;
          const update = (pgto: PagamentoInfo | null | undefined) => {
            if (!pgto || pgto.id !== contaId) return pgto;
            return { ...pgto, [campo]: valor, ...(campo === 'status' && valor === 'pago' ? { data_pagamento: updateData.data_pagamento } : {}) };
          };
          return { ...prev, pagamento_1: update(prev.pagamento_1) || null, pagamento_2: update(prev.pagamento_2) || null };
        });
      }
      if (campo === 'status') {
        toast({ title: 'Pagamento atualizado', description: 'Marcado como pago com sucesso.' });
      }
    } catch (err) {
      console.error('Erro ao atualizar pagamento:', err);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o pagamento.', variant: 'destructive' });
    }
  };

  const {
    columns, visibleColumns, visibleIds,
    toggleColumn, setColumnOrder, resetColumns
  } = useColumnConfig('faturamento_minimalista_columns', COLUNAS_DISPONIVEIS);

  useEffect(() => {
    fetchVendas();
    fetchAtendentes();
    fetchAuxData();
  }, [dateRange]);

  const fetchAuxData = async () => {
    const [{ data: cores }, { data: acessorios }, { data: adicionais }] = await Promise.all([
      supabase.from('catalogo_cores').select('id, nome, codigo_hex'),
      supabase.from('acessorios').select('id, nome'),
      supabase.from('adicionais').select('id, nome'),
    ]);
    if (cores) setAuxCores(new Map(cores.map(c => [c.id, { nome: c.nome, hex: c.codigo_hex }])));
    if (acessorios) setAuxAcessorios(new Map(acessorios.map(a => [a.id, a.nome])));
    if (adicionais) setAuxAdicionais(new Map(adicionais.map(a => [a.id, a.nome])));
  };

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
          estado,
          cidade,
          cliente_nome,
          valor_instalacao,
          valor_frete,
          valor_venda,
          valor_credito,
          lucro_total,
          custo_total,
          frete_aprovado,
          forma_pagamento,
          venda_presencial,
          justificativa_nao_faturada,
          metodo_pagamento,
          data_prevista_entrega,
          tipo_entrega,
          lucro_instalacao,
          contrato_url,
          contrato_dispensado,
          produtos_vendas (
            id,
            tipo_produto,
            descricao,
            valor_produto,
            valor_pintura,
            valor_instalacao,
            quantidade,
            lucro_item,
            custo_produto,
            custo_pintura,
            faturamento,
            desconto_valor,
            desconto_percentual,
            tipo_desconto,
            tamanho,
            cor_id,
            acessorio_id,
            adicional_id
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

      const { data: todosUsuarios } = await supabase
        .from("admin_users")
        .select("user_id, nome, foto_perfil_url");

      const atendenteMap = new Map();
      if (todosUsuarios) {
        todosUsuarios.forEach(user => {
          atendenteMap.set(user.user_id, { nome: user.nome, foto: user.foto_perfil_url });
        });
      }

      const vendaIds = vendasData.map((v: any) => v.id);
      const { data: contasData } = await supabase
        .from('contas_receber')
        .select('id, venda_id, metodo_pagamento, data_vencimento, status, observacoes, data_pagamento, valor_parcela, numero_parcela')
        .in('venda_id', vendaIds)
        .order('numero_parcela', { ascending: true });

      const pagamentosPorVenda = new Map<string, { pgto1?: PagamentoInfo; pgto2?: PagamentoInfo; data1?: string; data2?: string }>();
      if (contasData) {
        contasData.forEach((conta: any) => {
          const existing = pagamentosPorVenda.get(conta.venda_id) || {};
          const info: PagamentoInfo = {
            id: conta.id,
            data_vencimento: conta.data_vencimento,
            metodo_pagamento: conta.metodo_pagamento,
            status: conta.status || 'pendente',
            observacoes: conta.observacoes,
            data_pagamento: conta.data_pagamento,
            valor_parcela: conta.valor_parcela || 0,
            numero_parcela: conta.numero_parcela || 1,
          };
          if (!existing.pgto1) {
            existing.pgto1 = info;
            existing.data1 = conta.data_vencimento;
          } else if (!existing.pgto2) {
            existing.pgto2 = info;
            existing.data2 = conta.data_vencimento;
          }
          pagamentosPorVenda.set(conta.venda_id, existing);
        });
      }

      const vendasCompletas = vendasData.map((venda: any) => {
        const atendenteData = venda.atendente_id ? atendenteMap.get(venda.atendente_id) : null;
        const portas = venda.produtos_vendas || [];
        const pagamentos = pagamentosPorVenda.get(venda.id);
        
        const valor_produto = portas.reduce((acc: number, p: any) => 
          acc + (p.valor_produto || 0) * (p.quantidade || 1), 0);
        const valor_pintura = portas.reduce((acc: number, p: any) => 
          acc + (p.valor_pintura || 0) * (p.quantidade || 1), 0);
        
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
          data_pagamento_1: pagamentos?.data1 || null,
          data_pagamento_2: pagamentos?.data2 || null,
          pagamento_1: pagamentos?.pgto1 || null,
          pagamento_2: pagamentos?.pgto2 || null,
        };
      });

      setVendas(vendasCompletas);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFaturada = (venda: Venda) => isVendaFaturada(venda);
  const aguardandoContrato = (venda: Venda) =>
    !isFaturada(venda) && !(venda as any).contrato_url && !(venda as any).contrato_dispensado;

  const calcularLucroVenda = (venda: Venda) => {
    const portas = venda.portas || [];
    const lucroProdutos = portas.reduce((acc: number, p: any) => acc + (p.lucro_item || 0), 0);
    // lucro_instalacao é legado - para vendas novas, instalação é produto separado com lucro_item
    const lucroInstalacao = venda.lucro_instalacao || 0;
    return lucroProdutos + lucroInstalacao;
  };

  const calcDescontoTiers = useCallback((venda: Venda) => {
    const totalDesconto = (venda.portas || []).reduce((acc: number, p: any) => acc + (p.desconto_valor || 0), 0);
    if (totalDesconto === 0) return { cartao: 0, gelo: 0, responsavel: 0, total: 0 };

    const tabelaTotal = (venda.portas || []).reduce((acc: number, p: any) => {
      const qty = p.quantidade || 1;
      return acc + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
    }, 0);
    if (tabelaTotal === 0) return { cartao: 0, gelo: 0, responsavel: 0, total: totalDesconto };

    const pctTotal = (totalDesconto / tabelaTotal) * 100;
    const isCartao = venda.forma_pagamento === 'cartao_credito';
    const isPresencial = venda.venda_presencial === true;

    const limAvista = configLimites.avista;
    const limPresencial = configLimites.presencial;

    let pctCartao = 0;
    let pctGelo = 0;
    let pctResp = 0;

    if (!isCartao) {
      pctCartao = Math.min(pctTotal, limAvista);
    }
    const restante1 = pctTotal - pctCartao;
    if (isPresencial && restante1 > 0) {
      pctGelo = Math.min(restante1, limPresencial);
    }
    pctResp = Math.max(0, pctTotal - pctCartao - pctGelo);

    return {
      cartao: tabelaTotal * (pctCartao / 100),
      gelo: tabelaTotal * (pctGelo / 100),
      responsavel: tabelaTotal * (pctResp / 100),
      total: totalDesconto,
    };
  }, [configLimites]);

  const filteredVendas = useMemo(() => {
    return vendas.filter(venda => {
      if (filtroStatus.length > 0) {
        const faturada = isFaturada(venda);
        const matchStatus = filtroStatus.some(s => {
          if (s === 'faturadas') return faturada;
          if (s === 'nao_faturadas') return !faturada;
          return false;
        });
        if (!matchStatus) return false;
      }
      if (selectedAtendente !== "todos" && venda.atendente_id !== selectedAtendente) return false;
      const matchesSearch = 
        (venda.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (venda.atendente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (venda.cidade?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [vendas, filtroStatus, selectedAtendente, searchTerm]);

  const sortedVendas = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) return filteredVendas;
    return [...filteredVendas].sort((a, b) => {
      const getValue = (venda: Venda) => {
        switch (sortConfig.column) {
          case 'data': return new Date(venda.data_venda).getTime();
          case 'cliente': return venda.cliente_nome?.toLowerCase() || '';
          case 'vendedor': return venda.atendente_nome.toLowerCase();
          case 'cidade': return venda.cidade?.toLowerCase() || '';
          case 'valor': return (venda.valor_venda || 0) + (venda.valor_credito || 0);
          case 'tabela':
            return (venda.portas || []).reduce((acc: number, p: any) => {
              const qty = p.quantidade || 1;
              return acc + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
            }, 0);
          case 'lucro': return calcularLucroVenda(venda);
          case 'expedicao': return venda.tipo_entrega || '';
          case 'tempo_sem_faturar':
            if (isFaturada(venda)) return -1;
            return differenceInDays(new Date(), new Date(venda.data_venda));
          case 'faturada': return isFaturada(venda) ? 1 : 0;
          case 'desc_cartao':
          case 'desc_gelo':
          case 'desc_responsavel':
            const tiers = calcDescontoTiers(venda);
            if (sortConfig.column === 'desc_cartao') return tiers.cartao;
            if (sortConfig.column === 'desc_gelo') return tiers.gelo;
            return tiers.responsavel;
          default: return 0;
        }
      };
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
  }, [filteredVendas, sortConfig]);

  const handleSort = useCallback((columnId: string) => {
    setSortConfig(prev => {
      if (prev.column !== columnId) return { column: columnId, direction: 'asc' };
      if (prev.direction === 'asc') return { column: columnId, direction: 'desc' };
      return { column: null, direction: null };
    });
  }, []);

  const stats = useMemo(() => {
    const faturadas = filteredVendas.filter(isFaturada);
    const naoFaturadas = filteredVendas.filter(v => !isFaturada(v));
    return {
      faturamento: filteredVendas.reduce((acc, v) => acc + ((v.valor_venda || 0) + (v.valor_credito || 0) - (v.valor_frete || 0)), 0),
      faturadas: faturadas.length,
      naoFaturadas: naoFaturadas.length,
    };
  }, [filteredVendas]);

  const indicadores = useMemo(() => {
    const vendasFaturadas = filteredVendas.filter(isFaturada);
    const valorBrutoPortas = filteredVendas.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas.filter((p: any) => ['porta', 'porta_enrolar', 'porta_social'].includes(p.tipo_produto))
        .reduce((sum: number, p: any) => sum + (p.valor_produto || 0), 0);
    }, 0);
    const valorBrutoPintura = filteredVendas.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas.filter((p: any) => p.tipo_produto === 'pintura_epoxi')
        .reduce((sum: number, p: any) => sum + (p.valor_pintura || 0), 0);
    }, 0);
    const valorBrutoInstalacoes = filteredVendas.reduce((acc, v) => {
      // Novo: instalação como produto separado
      const portas = v.portas || [];
      const valorInstalacaoProdutos = portas.filter((p: any) => p.tipo_produto === 'instalacao')
        .reduce((sum: number, p: any) => sum + (p.valor_produto || 0) * (p.quantidade || 1), 0);
      // Legado: valor_instalacao da venda
      return acc + valorInstalacaoProdutos + (valorInstalacaoProdutos === 0 ? (v.valor_instalacao || 0) : 0);
    }, 0);
    const valorBrutoAcessorios = filteredVendas.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas.filter((p: any) => p.tipo_produto === 'acessorio')
        .reduce((sum: number, p: any) => sum + (p.valor_produto || 0), 0);
    }, 0);
    const valorBrutoAdicionais = filteredVendas.reduce((acc, v) => {
      const portas = v.portas || [];
      return acc + portas.filter((p: any) => ['adicional', 'manutencao'].includes(p.tipo_produto))
        .reduce((sum: number, p: any) => sum + (p.valor_produto || 0), 0);
    }, 0);

    return {
      faturamentoTotal: filteredVendas.reduce((acc, v) => acc + (v.valor_venda || 0) + (v.valor_credito || 0) - (v.valor_frete || 0), 0),
      quantidadePortas: filteredVendas.reduce((acc, v) => {
        const portas = v.portas || [];
        return acc + portas.filter((p: any) => ['porta', 'porta_enrolar', 'porta_social'].includes(p.tipo_produto))
          .reduce((sum: number, p: any) => sum + (p.quantidade || 1), 0);
      }, 0),
      valorBrutoPortas,
      lucroPortas: vendasFaturadas.reduce((acc, v) => {
        const portas = v.portas || [];
        return acc + portas.filter((p: any) => ['porta', 'porta_enrolar', 'porta_social'].includes(p.tipo_produto))
          .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
      }, 0),
      valorBrutoPintura,
      lucroPintura: vendasFaturadas.reduce((acc, v) => {
        const portas = v.portas || [];
        return acc + portas.filter((p: any) => p.tipo_produto === 'pintura_epoxi')
          .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
      }, 0),
      valorBrutoInstalacoes,
      lucroInstalacoes: vendasFaturadas.reduce((acc, v) => {
        const portas = v.portas || [];
        const lucroInstalacaoProdutos = portas.filter((p: any) => p.tipo_produto === 'instalacao')
          .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
        return acc + lucroInstalacaoProdutos + (lucroInstalacaoProdutos === 0 ? (v.lucro_instalacao || 0) : 0);
      }, 0),
      valorBrutoAcessorios,
      lucroAcessorios: vendasFaturadas.reduce((acc, v) => {
        const portas = v.portas || [];
        return acc + portas.filter((p: any) => p.tipo_produto === 'acessorio')
          .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
      }, 0),
      valorBrutoAdicionais,
      lucroAdicionais: vendasFaturadas.reduce((acc, v) => {
        const portas = v.portas || [];
        return acc + portas.filter((p: any) => ['adicional', 'manutencao'].includes(p.tipo_produto))
          .reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
      }, 0),
      fretesTotais: filteredVendas.reduce((acc, v) => acc + (v.valor_frete || 0), 0),
      lucroLiquidoTotal: vendasFaturadas.reduce((acc, v) => {
        const portas = v.portas || [];
        const lucroItens = portas.reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
        const lucroInstalacao = v.lucro_instalacao || 0;
        return acc + lucroItens + lucroInstalacao;
      }, 0),
    };
  }, [filteredVendas]);

  // Ranking data for indicator drawer
  const rankingData = useMemo(() => {
    if (!indicadorAtivo) return [];
    const map = new Map<string, { nome: string; quantidade: number; valor_total: number; cor_hex?: string }>();
    if (indicadorAtivo === 'portas') {
      filteredVendas.forEach(v => {
        (v.portas || []).filter((p: any) => ['porta', 'porta_enrolar', 'porta_social'].includes(p.tipo_produto)).forEach((p: any) => {
          const key = p.tamanho || 'Sem tamanho';
          const cur = map.get(key) || { nome: key, quantidade: 0, valor_total: 0 };
          cur.quantidade += p.quantidade || 1;
          cur.valor_total += p.valor_produto || 0;
          map.set(key, cur);
        });
      });
    } else if (indicadorAtivo === 'pintura') {
      filteredVendas.forEach(v => {
        (v.portas || []).filter((p: any) => p.tipo_produto === 'pintura_epoxi').forEach((p: any) => {
          const corInfo = p.cor_id ? auxCores.get(p.cor_id) : null;
          const key = p.cor_id || 'sem_cor';
          const nome = corInfo?.nome || 'Cor não especificada';
          const cur = map.get(key) || { nome, quantidade: 0, valor_total: 0, cor_hex: corInfo?.hex };
          cur.quantidade += p.quantidade || 1;
          cur.valor_total += p.valor_pintura || 0;
          map.set(key, cur);
        });
      });
    } else if (indicadorAtivo === 'instalacoes') {
      filteredVendas.filter(v => (v.valor_instalacao || 0) > 0).forEach(v => {
        const key = v.cidade || 'Sem cidade';
        const cur = map.get(key) || { nome: key, quantidade: 0, valor_total: 0 };
        cur.quantidade += 1;
        cur.valor_total += v.valor_instalacao || 0;
        map.set(key, cur);
      });
    } else if (indicadorAtivo === 'acessorios') {
      filteredVendas.forEach(v => {
        (v.portas || []).filter((p: any) => p.tipo_produto === 'acessorio').forEach((p: any) => {
          const key = p.acessorio_id || p.descricao || 'sem_id';
          const nome = p.acessorio_id ? (auxAcessorios.get(p.acessorio_id) || p.descricao || 'Acessório') : (p.descricao || 'Acessório');
          const cur = map.get(key) || { nome, quantidade: 0, valor_total: 0 };
          cur.quantidade += p.quantidade || 1;
          cur.valor_total += p.valor_produto || 0;
          map.set(key, cur);
        });
      });
    } else if (indicadorAtivo === 'adicionais') {
      filteredVendas.forEach(v => {
        (v.portas || []).filter((p: any) => ['adicional', 'manutencao'].includes(p.tipo_produto)).forEach((p: any) => {
          const key = p.adicional_id || p.descricao || 'sem_id';
          const nome = p.adicional_id ? (auxAdicionais.get(p.adicional_id) || p.descricao || 'Adicional') : (p.descricao || 'Adicional');
          const cur = map.get(key) || { nome, quantidade: 0, valor_total: 0 };
          cur.quantidade += p.quantidade || 1;
          cur.valor_total += p.valor_produto || 0;
          map.set(key, cur);
        });
      });
    }
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredVendas, indicadorAtivo, auxCores, auxAcessorios, auxAdicionais]);

  const indicadorTitulos: Record<string, string> = {
    portas: 'Portas', pintura: 'Pintura', instalacoes: 'Instalações',
    acessorios: 'Acessórios', adicionais: 'Adicionais',
  };
  const indicadorIcons: Record<string, React.ReactNode> = {
    portas: <DollarSign className="h-4 w-4 text-blue-400" />,
    pintura: <Paintbrush className="h-4 w-4 text-orange-400" />,
    instalacoes: <Wrench className="h-4 w-4 text-cyan-400" />,
    acessorios: <Package className="h-4 w-4 text-pink-400" />,
    adicionais: <PlusCircle className="h-4 w-4 text-indigo-400" />,
  };

  const handleGeneratePDF = () => {
    if (filteredVendas.length > 1000) {
      toast({ variant: "destructive", title: "Muitos registros", description: "O PDF suporta no máximo 1000 registros." });
      return;
    }
    const vendasParaLucros = filteredVendas.filter(isFaturada);
    const faturamentoTotal = filteredVendas.reduce((acc, v) => acc + ((v.valor_venda || 0) + (v.valor_credito || 0) - (v.valor_frete || 0)), 0);
    const lucroBrutoTotal = vendasParaLucros.reduce((acc, v) => {
      const portas = v.portas || [];
      const lucroItens = portas.reduce((sum: number, p: any) => sum + (p.lucro_item || 0), 0);
      return acc + lucroItens + (v.valor_instalacao || 0);
    }, 0);
    const pdfStats = {
      faturamentoTotal,
      custosProducao: vendasParaLucros.reduce((acc, v) => acc + (v.custo_produto || 0), 0),
      custosPintura: vendasParaLucros.reduce((acc, v) => acc + (v.custo_pintura || 0), 0),
      instalacoesTotais: filteredVendas.reduce((acc, v) => acc + (v.valor_instalacao || 0), 0),
      fretesTotais: filteredVendas.reduce((acc, v) => acc + (v.valor_frete || 0), 0),
      quantidadePortas: indicadores.quantidadePortas,
      lucroPintura: indicadores.lucroPintura,
      lucroPortas: indicadores.lucroPortas,
      lucroBrutoTotal,
    };
    const periodo = dateRange?.from && dateRange?.to 
      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}` : undefined;
    const activeTab = filtroStatus.length === 1 ? (filtroStatus[0] === 'faturadas' ? 'faturadas' : 'nao_faturadas') : 'todas';
    generateFaturamentoPDF({ vendas: filteredVendas, stats: pdfStats, filtros: { tab: activeTab, periodo } });
    toast({ title: "PDF gerado com sucesso!", description: "O arquivo foi baixado automaticamente." });
  };

  const handleOpenJustificativaDialog = (venda: Venda, e: React.MouseEvent) => {
    e.stopPropagation();
    setJustificativaDialog({
      open: true, vendaId: venda.id,
      vendaCliente: venda.cliente_nome || 'Cliente não informado',
      justificativa: venda.justificativa_nao_faturada || ''
    });
  };

  const handleSaveJustificativa = async () => {
    setSavingJustificativa(true);
    try {
      const { error } = await supabase
        .from('vendas')
        .update({ justificativa_nao_faturada: justificativaDialog.justificativa.trim() || null })
        .eq('id', justificativaDialog.vendaId);
      if (error) throw error;
      setVendas(prev => prev.map(v => 
        v.id === justificativaDialog.vendaId 
          ? { ...v, justificativa_nao_faturada: justificativaDialog.justificativa.trim() || null } : v
      ));
      toast({ title: "Justificativa salva", description: "A justificativa foi atualizada com sucesso." });
      setJustificativaDialog({ open: false, vendaId: '', vendaCliente: '', justificativa: '' });
    } catch (error) {
      console.error('Erro ao salvar justificativa:', error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar a justificativa." });
    } finally {
      setSavingJustificativa(false);
    }
  };

  const getSortIcon = (columnId: string) => {
    if (sortConfig.column !== columnId) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 ml-1 text-blue-400" />;
    return <ArrowDown className="h-3 w-3 ml-1 text-blue-400" />;
  };

  const getColumnResponsiveClass = (columnId: string) => {
    const hiddenOnMobile = ['cidade', 'expedicao', 'desc_cartao', 'desc_gelo', 'desc_responsavel', 'tempo_sem_faturar', 'justificativa', 'lucro', 'tabela', 'contrato'];
    if (hiddenOnMobile.includes(columnId)) return 'hidden md:table-cell';
    return '';
  };

  const getColumnAlignment = (columnId: string) => {
    const rightAligned = ['valor', 'lucro', 'desc_cartao', 'desc_gelo', 'desc_responsavel', 'tabela'];
    const centerAligned = ['faturada', 'tempo_sem_faturar', 'expedicao', 'contrato'];
    if (rightAligned.includes(columnId)) return 'text-right';
    if (centerAligned.includes(columnId)) return 'text-center';
    return 'text-left';
  };

  const renderCell = (venda: Venda, columnId: string) => {
    switch (columnId) {
      case 'vendedor':
        return (
          <Avatar className="h-6 w-6">
            <AvatarImage src={venda.atendente_foto || undefined} />
            <AvatarFallback className="text-[10px] bg-blue-500/20 text-blue-400">
              {venda.atendente_nome?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      case 'cliente':
        const nome = venda.cliente_nome || "Não informado";
        return <span className="text-white font-medium" title={nome}>{nome.length > 10 ? nome.slice(0, 10) + '...' : nome}</span>;
      case 'data':
        return <span className="text-white/80">{format(new Date(venda.data_venda), "dd/MM/yy", { locale: ptBR })}</span>;
      case 'cidade':
        return <span className="text-white/60">{venda.cidade}{venda.estado ? `/${venda.estado}` : ''}</span>;
      case 'expedicao':
        if (venda.tipo_entrega === 'instalacao') return <Hammer className="h-4 w-4 text-cyan-400 mx-auto" />;
        return <Truck className="h-4 w-4 text-orange-400 mx-auto" />;
      case 'contrato': {
        if ((venda as any).contrato_url) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <FileCheck className="h-4 w-4 text-blue-400 mx-auto" />
              </TooltipTrigger>
              <TooltipContent>Contrato anexado</TooltipContent>
            </Tooltip>
          );
        }
        if ((venda as any).contrato_dispensado || isFaturada(venda)) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/15 text-white/60 text-[10px] font-medium">
                  <FileX className="h-3 w-3" />
                  Dispensado
                </span>
              </TooltipTrigger>
              <TooltipContent>Contrato dispensado — venda pode ser faturada</TooltipContent>
            </Tooltip>
          );
        }
        return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-medium">
                  <FileSignature className="h-3 w-3" />
                  Aguardando
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Aguardando assinatura do contrato — não pode ser faturada
              </TooltipContent>
            </Tooltip>
        );
      }
      case 'tabela':
        const tabelaTotal = (venda.portas || []).reduce((acc: number, p: any) => {
          const qty = p.quantidade || 1;
          return acc + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
        }, 0);
        return <span className="text-blue-400 font-medium">{formatCurrency(tabelaTotal)}</span>;
      case 'desc_cartao':
      case 'desc_gelo':
      case 'desc_responsavel': {
        const tiers = calcDescontoTiers(venda);
        const val = columnId === 'desc_cartao' ? tiers.cartao : columnId === 'desc_gelo' ? tiers.gelo : tiers.responsavel;
        if (val === 0) return <span className="text-white/30">-</span>;
        return <span className="text-red-400">-{formatCurrency(val)}</span>;
      }
      case 'tempo_sem_faturar':
        if (isFaturada(venda)) return <span className="text-green-400/60 text-xs">Faturada</span>;
        const dias = differenceInDays(new Date(), new Date(venda.data_venda));
        let colorClass = 'text-white/60';
        if (dias >= 30) colorClass = 'text-red-400';
        else if (dias >= 14) colorClass = 'text-amber-400';
        return <span className={`${colorClass} text-xs`}>{formatarTempoSemFaturar(dias)}</span>;
      case 'justificativa':
        if (isFaturada(venda)) return <span className="text-white/30">-</span>;
        return venda.justificativa_nao_faturada ? (
          <div className="flex items-center gap-1.5 max-w-[180px]">
            <span className="text-white/70 text-xs truncate" title={venda.justificativa_nao_faturada}>
              {venda.justificativa_nao_faturada}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 hover:bg-white/10"
              onClick={(e) => handleOpenJustificativaDialog(venda, e)}>
              <Pencil className="h-3 w-3 text-white/40" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm"
            className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            onClick={(e) => handleOpenJustificativaDialog(venda, e)}>
            <MessageSquare className="h-3 w-3 mr-1" />
            Informar
          </Button>
        );
      case 'lucro':
        return isFaturada(venda) 
          ? <span className="text-emerald-400 font-medium">{formatCurrency(calcularLucroVenda(venda))}</span>
          : <span className="text-white/30">-</span>;
      case 'valor':
        return <span className="text-white font-medium">{formatCurrency(venda.valor_venda || 0)}</span>;
      case 'faturada':
        return isFaturada(venda) 
          ? <Check className="h-4 w-4 text-green-400 mx-auto" />
          : <X className="h-4 w-4 text-white/30 mx-auto" />;
      default:
        return null;
    }
  };

  const toggleFilterStatus = (val: string) => {
    setFiltroStatus(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const clearFilters = () => {
    setFiltroStatus([]);
    setSelectedAtendente("todos");
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  };

  const hasFilters = filtroStatus.length > 0 || selectedAtendente !== "todos";

  const STATUS_OPTIONS = [
    { value: "faturadas", label: "Faturadas" },
    { value: "nao_faturadas", label: "Não Faturadas" },
  ];

  // Filter sidebar content
  const filterContent = (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Status</p>
        <div className="space-y-2">
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white transition-colors">
              <Checkbox
                checked={filtroStatus.includes(opt.value)}
                onCheckedChange={() => toggleFilterStatus(opt.value)}
                className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Vendedor</p>
        <Select value={selectedAtendente} onValueChange={setSelectedAtendente}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {atendentes.map((atendente: any) => (
              <SelectItem key={atendente.user_id} value={atendente.user_id}>{atendente.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Período</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-9 bg-white/5 border-white/10 text-white hover:bg-white/10 justify-start",
                dateRange?.from && "border-blue-500/50 text-blue-300"
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, 'dd/MM', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}`
                : "Selecionar período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="w-full text-white/50 hover:text-white hover:bg-white/5" onClick={clearFilters}>
          Limpar Filtros
        </Button>
      )}
    </div>
  );

  // Venda detail helper
  const getVendaDetailValues = (venda: Venda) => {
    const portas = venda.portas || [];
    const valorPortas = portas.filter((p: any) => ['porta', 'porta_enrolar'].includes(p.tipo_produto))
      .reduce((sum: number, p: any) => sum + (p.valor_produto || 0), 0);
    const valorPintura = portas.filter((p: any) => p.tipo_produto === 'pintura_epoxi')
      .reduce((sum: number, p: any) => sum + (p.valor_pintura || 0), 0);
    const valorAcessorios = portas.filter((p: any) => p.tipo_produto === 'acessorio')
      .reduce((sum: number, p: any) => sum + (p.valor_produto || 0), 0);
    const valorAdicionais = portas.filter((p: any) => ['adicional', 'manutencao'].includes(p.tipo_produto))
      .reduce((sum: number, p: any) => sum + (p.valor_produto || 0), 0);
    return { valorPortas, valorPintura, valorAcessorios, valorAdicionais };
  };

  // Right sidebar content
  const defaultRightContent = (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Resumo</p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/50">Faturamento</p>
            <p className="text-lg font-bold text-white">{formatCurrency(stats.faturamento)}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/50">Faturadas</p>
            <p className="text-lg font-bold text-green-400">{stats.faturadas}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/50">Pendentes</p>
            <p className="text-lg font-bold text-amber-400">{stats.naoFaturadas}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/50">Lucro Líquido</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(indicadores.lucroLiquidoTotal)}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Colunas</p>
        <ColumnManager
          columns={columns}
          visibleIds={visibleIds}
          onToggle={toggleColumn}
          onReorder={setColumnOrder}
          onReset={resetColumns}
        />
      </div>
    </div>
  );

  const selectedVendaContent = selectedVenda ? (() => {
    const { valorPortas, valorPintura, valorAcessorios, valorAdicionais } = getVendaDetailValues(selectedVenda);
    const detailItems = [
      { label: 'Vl. Portas', value: valorPortas, icon: <DollarSign className="h-3.5 w-3.5" />, color: 'text-blue-400' },
      { label: 'Vl. Pintura', value: valorPintura, icon: <Paintbrush className="h-3.5 w-3.5" />, color: 'text-orange-400' },
      { label: 'Instalação', value: selectedVenda.valor_instalacao || 0, icon: <Wrench className="h-3.5 w-3.5" />, color: 'text-cyan-400' },
      { label: 'Frete', value: selectedVenda.valor_frete || 0, icon: <Truck className="h-3.5 w-3.5" />, color: 'text-amber-400' },
      { label: 'Acessórios', value: valorAcessorios, icon: <Package className="h-3.5 w-3.5" />, color: 'text-pink-400' },
      { label: 'Adicionais', value: valorAdicionais, icon: <PlusCircle className="h-3.5 w-3.5" />, color: 'text-indigo-400' },
    ];
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selectedVenda.cliente_nome}</p>
            <p className="text-xs text-white/50 mt-0.5">Venda #{selectedVenda.id.substring(0, 8)}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setSelectedVenda(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Valores</p>
          <div className="grid grid-cols-2 gap-2">
            {detailItems.map((item) => (
              <div key={item.label} className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={item.color}>{item.icon}</span>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">{item.label}</p>
                </div>
                <p className={cn("text-sm font-semibold", item.value > 0 ? 'text-white' : 'text-white/20')}>
                  {item.value > 0 ? formatCurrency(item.value) : '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Datas</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-white/40" />
                <p className="text-xs text-white/50">Previsão Entrega</p>
              </div>
              <p className="text-xs font-semibold text-white">
                {selectedVenda.data_prevista_entrega 
                  ? format(new Date(selectedVenda.data_prevista_entrega + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })
                  : '-'}
              </p>
            </div>
            {[selectedVenda.pagamento_1, selectedVenda.pagamento_2].map((pgto, idx) => {
              if (!pgto) return (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-white/40" />
                    <p className="text-xs text-white/50">Pgto {idx + 1}</p>
                  </div>
                  <p className="text-xs text-white/30">-</p>
                </div>
              );
              const isPago = pgto.status === 'pago';
              return (
                <div key={pgto.id} className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-white/40" />
                      <p className="text-xs text-white/50">Pgto {idx + 1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        isPago ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      )}>
                        {isPago ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-semibold">
                      {format(new Date(pgto.data_vencimento + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                    <span className="text-white/50">
                      {pgto.metodo_pagamento ? (() => {
                        const labels: Record<string, string> = { boleto: 'Boleto', a_vista: 'À Vista', cartao_credito: 'Cartão', dinheiro: 'Dinheiro' };
                        return labels[pgto.metodo_pagamento] || pgto.metodo_pagamento;
                      })() : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed"
          disabled={aguardandoContrato(selectedVenda)}
          title={aguardandoContrato(selectedVenda) ? "Anexe ou dispense o contrato para faturar." : undefined}
          onClick={() => navigate(`/administrativo/financeiro/faturamento/${selectedVenda.id}?from=vendas`)}
        >
          Abrir Faturamento
        </Button>
        {(selectedVenda as any).contrato_url ? (
          <Button
            variant="outline"
            className="w-full bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
            onClick={async () => {
              const path = (selectedVenda as any).contrato_url as string;
              const { data, error } = await supabase.storage
                .from('contratos-vendas')
                .createSignedUrl(path, 3600);
              if (error || !data?.signedUrl) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível abrir o contrato.' });
                return;
              }
              window.open(data.signedUrl, '_blank');
            }}
          >
            <FileCheck className="h-4 w-4 mr-2 text-blue-400" />
            Ver Contrato
          </Button>
        ) : ((selectedVenda as any).contrato_dispensado || isFaturada(selectedVenda)) ? (
          <>
            <div className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/15 text-white/70 text-xs flex items-center justify-center gap-2">
              <FileX className="h-4 w-4" />
              Contrato dispensado
            </div>
            <Button
              variant="outline"
              disabled
              className="w-full bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Ver Contrato
            </Button>
          </>
        ) : (
          <>
            <Button
              className="w-full bg-amber-500/15 border border-amber-400/30 text-amber-200 hover:bg-amber-500/25 hover:text-amber-100"
              onClick={() => setAnexarContratoOpen(true)}
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Anexar Contrato
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setDispensarContratoOpen(true)}
            >
              <FileX className="h-4 w-4 mr-2" />
              Dispensar Contrato
            </Button>
          </>
        )}
      </div>
    );
  })() : null;

  const rightContent = selectedVenda ? selectedVendaContent : defaultRightContent;

  if (loading) {
    return (
      <MinimalistLayout 
        title="Faturamento por Venda" 
        backPath="/administrativo/financeiro/faturamento"
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Faturamento", path: "/administrativo/financeiro/faturamento" },
          { label: "Por Venda" }
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
      title="Faturamento por Venda" 
      subtitle="Controle de faturamento individual por venda"
      backPath="/administrativo/financeiro/faturamento"
      fullWidth
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Administrativo", path: "/administrativo" },
        { label: "Financeiro", path: "/administrativo/financeiro" },
        { label: "Faturamento", path: "/administrativo/financeiro/faturamento" },
        { label: "Por Venda" }
      ]}
      headerActions={
        <Button onClick={handleGeneratePDF} size="sm" className="bg-white/10 hover:bg-white/20 border border-white/20">
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      }
    >
      {/* Indicadores do Período */}
      <Card className="rounded-xl bg-white/5 border border-white/10 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white/80 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-400" />
              Indicadores do Período
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {(() => {
              const calcMargem = (lucro: number, bruto: number) =>
                bruto > 0 ? ((lucro / bruto) * 100).toFixed(1) + '%' : '0%';
              const faturamentoTotal = indicadores.valorBrutoPortas + indicadores.valorBrutoPintura + indicadores.valorBrutoInstalacoes + indicadores.valorBrutoAcessorios + indicadores.valorBrutoAdicionais + indicadores.fretesTotais;
              return [
                { key: 'portas', icon: <DollarSign className="h-3 w-3 text-blue-400" />, label: 'Portas', valor: formatCurrency(indicadores.valorBrutoPortas), lucro: formatCurrency(indicadores.lucroPortas), margemLucro: calcMargem(indicadores.lucroPortas, indicadores.valorBrutoPortas), colorClass: 'text-blue-400', qtd: filteredVendas.filter(v => (v.portas || []).some((p: any) => ['porta', 'porta_enrolar', 'porta_social'].includes(p.tipo_produto))).length },
                { key: 'pintura', icon: <Paintbrush className="h-3 w-3 text-orange-400" />, label: 'Pintura', valor: formatCurrency(indicadores.valorBrutoPintura), lucro: formatCurrency(indicadores.lucroPintura), margemLucro: calcMargem(indicadores.lucroPintura, indicadores.valorBrutoPintura), colorClass: 'text-orange-400', qtd: filteredVendas.filter(v => (v.portas || []).some((p: any) => p.tipo_produto === 'pintura_epoxi')).length },
                { key: 'instalacoes', icon: <Wrench className="h-3 w-3 text-cyan-400" />, label: 'Instalações', valor: formatCurrency(indicadores.valorBrutoInstalacoes), lucro: formatCurrency(indicadores.lucroInstalacoes), margemLucro: calcMargem(indicadores.lucroInstalacoes, indicadores.valorBrutoInstalacoes), colorClass: 'text-cyan-400', qtd: filteredVendas.filter(v => (v.valor_instalacao || 0) > 0).length },
                { key: 'acessorios', icon: <Package className="h-3 w-3 text-pink-400" />, label: 'Acessórios', valor: formatCurrency(indicadores.valorBrutoAcessorios), lucro: formatCurrency(indicadores.lucroAcessorios), margemLucro: calcMargem(indicadores.lucroAcessorios, indicadores.valorBrutoAcessorios), colorClass: 'text-pink-400', qtd: filteredVendas.filter(v => (v.portas || []).some((p: any) => p.tipo_produto === 'acessorio')).length },
                { key: 'adicionais', icon: <PlusCircle className="h-3 w-3 text-indigo-400" />, label: 'Adicionais', valor: formatCurrency(indicadores.valorBrutoAdicionais), lucro: formatCurrency(indicadores.lucroAdicionais), margemLucro: calcMargem(indicadores.lucroAdicionais, indicadores.valorBrutoAdicionais), colorClass: 'text-indigo-400', qtd: filteredVendas.filter(v => (v.portas || []).some((p: any) => ['adicional', 'manutencao'].includes(p.tipo_produto))).length },
                { key: 'fretes', icon: <Truck className="h-3 w-3 text-amber-400" />, label: 'Fretes', valor: formatCurrency(indicadores.fretesTotais), colorClass: 'text-amber-400', qtd: filteredVendas.filter(v => (v.valor_frete || 0) > 0).length },
                { key: 'lucro', icon: <TrendingUp className="h-3 w-3 text-green-400" />, label: 'Lucro Líquido', valor: formatCurrency(indicadores.lucroLiquidoTotal), margemLucro: calcMargem(indicadores.lucroLiquidoTotal, faturamentoTotal), colorClass: 'text-green-400', qtd: filteredVendas.filter(isFaturada).length },
              ].map((ind) => {
                const clickableKeys = ['portas', 'pintura', 'instalacoes', 'acessorios', 'adicionais'];
                return (
                  <IndicadorExpandivel
                    key={ind.key}
                    icon={ind.icon}
                    label={ind.label}
                    valor={ind.valor}
                    lucro={'lucro' in ind ? (ind as any).lucro : undefined}
                    margemLucro={ind.margemLucro}
                    colorClass={ind.colorClass}
                    quantidadeVendas={ind.qtd}
                    onClick={clickableKeys.includes(ind.key) ? () => {
                      setIndicadorAtivo(ind.key);
                      setIndicadorDrawerOpen(true);
                    } : undefined}
                  />
                );
              });
            })()}
            <div className="text-center p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-center gap-1 text-white/50 text-xs mb-2">
                <Target className="h-3 w-3 text-purple-400" />
                Qtd Portas
              </div>
              <p className="text-purple-400 font-bold text-lg">
                {indicadores.quantidadePortas}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3-panel layout */}
      <div className="flex gap-4">
        {/* Left sidebar - desktop only */}
        <aside className="hidden lg:block w-[250px] shrink-0">
          <div className="sticky top-24 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm font-semibold text-white mb-4">Filtros</p>
            {filterContent}
          </div>
        </aside>

        {/* Main table */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Buscar cliente, vendedor, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
            <TooltipProvider delayDuration={200}>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="w-8 text-center text-white/60" />
                    {visibleColumns.map((column) => (
                      <TableHead 
                        key={column.id}
                        className={`text-white/60 cursor-pointer hover:text-white/80 transition-colors ${getColumnResponsiveClass(column.id)} ${getColumnAlignment(column.id)}`}
                        onClick={() => handleSort(column.id)}
                      >
                        <div className={`flex items-center ${getColumnAlignment(column.id) === 'text-right' ? 'justify-end' : getColumnAlignment(column.id) === 'text-center' ? 'justify-center' : ''}`}>
                          {['desc_cartao', 'desc_gelo', 'desc_responsavel'].includes(column.id) ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-0.5">
                                  {column.label}
                                  <Info className="h-3 w-3 text-white/30" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] text-xs">
                                {column.id === 'desc_cartao' && `Desconto à vista (até ${configLimites.avista}%) — pagamento fora do cartão`}
                                {column.id === 'desc_gelo' && `Desconto presencial (até ${configLimites.presencial}%) — venda presencial`}
                                {column.id === 'desc_responsavel' && `Desconto c/ senha (até ${configLimites.adicionalResponsavel}%) — requer autorização`}
                              </TooltipContent>
                            </Tooltip>
                          ) : column.label}
                          {getSortIcon(column.id)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-white/40">
                        Nenhuma venda encontrada no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedVendas.map((venda) => (
                      <TableRow 
                        key={venda.id} 
                        className={cn(
                          "border-white/10 hover:bg-white/5 cursor-pointer",
                          selectedVenda?.id === venda.id && "bg-blue-500/10 border-l-2 border-l-blue-500",
                          aguardandoContrato(venda) && selectedVenda?.id !== venda.id && "border-l-2 border-l-amber-500/60"
                        )}
                        onClick={() => {
                          setSelectedVenda(venda);
                          if (isMobile) setMobileDownbarOpen(true);
                        }}
                      >
                        <TableCell className="w-8 text-center">
                          <div className={cn(
                            "h-3 w-3 rounded-full border-2 mx-auto transition-colors",
                            selectedVenda?.id === venda.id 
                              ? "bg-blue-500 border-blue-500" 
                              : "border-white/20"
                          )} />
                        </TableCell>
                        {visibleColumns.map((column) => (
                          <TableCell 
                            key={column.id}
                            className={`${getColumnResponsiveClass(column.id)} ${getColumnAlignment(column.id)}`}
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
        </main>

        {/* Right sidebar - desktop only */}
        <aside className="hidden lg:block w-[250px] shrink-0">
          <div className="sticky top-24 p-4 rounded-xl bg-white/5 border border-white/10">
            {rightContent}
          </div>
        </aside>
      </div>

      {/* Mobile Downbar */}
      {isMobile && (
        <Drawer open={mobileDownbarOpen} onOpenChange={(open) => {
          setMobileDownbarOpen(open);
          if (!open) setSelectedVenda(null);
        }}>
          <DrawerContent className="max-h-[85vh] bg-zinc-900 border-t border-white/10">
            <ScrollArea className="h-[75vh] px-4 py-4">
              {selectedVenda && selectedVendaContent}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      )}

      {/* Indicator Ranking Drawer */}
      <Drawer open={indicadorDrawerOpen} onOpenChange={setIndicadorDrawerOpen}>
        <DrawerContent className="max-h-[85vh] bg-zinc-900 border-t border-white/10">
          <div className="mx-auto w-full max-w-lg">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              {indicadorAtivo && indicadorIcons[indicadorAtivo]}
              <h3 className="text-white font-semibold">Ranking - {indicadorAtivo ? indicadorTitulos[indicadorAtivo] : ''}</h3>
            </div>
            <ScrollArea className="h-[65vh] px-4 pb-4">
              {rankingData.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">Nenhum dado encontrado</p>
              ) : (
                rankingData.map((item, index) => (
                  <div key={item.nome} className="flex items-center justify-between py-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-sm w-6">{index + 1}.</span>
                      {item.cor_hex && (
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.cor_hex }} />
                      )}
                      <span className="text-white text-sm">{item.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">{item.quantidade}x</p>
                      <p className="text-white/50 text-xs">{formatCurrency(item.valor_total)}</p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Dialog de Justificativa */}
      <Dialog 
        open={justificativaDialog.open} 
        onOpenChange={(open) => !savingJustificativa && setJustificativaDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg">Justificativa de Não Faturamento</DialogTitle>
            <p className="text-sm text-white/60">Cliente: {justificativaDialog.vendaCliente}</p>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Informe o motivo da venda ainda não estar faturada..."
              value={justificativaDialog.justificativa}
              onChange={(e) => setJustificativaDialog(prev => ({ ...prev, justificativa: e.target.value }))}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[120px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJustificativaDialog({ open: false, vendaId: '', vendaCliente: '', justificativa: '' })}
              disabled={savingJustificativa} className="text-white/70 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={handleSaveJustificativa} disabled={savingJustificativa}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {savingJustificativa ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedVenda && (
        <AnexarContratoModal
          open={anexarContratoOpen}
          onOpenChange={setAnexarContratoOpen}
          vendaId={selectedVenda.id}
          clienteNome={selectedVenda.cliente_nome}
        />
      )}

      <AlertDialog open={dispensarContratoOpen} onOpenChange={(o) => !dispensandoContrato && setDispensarContratoOpen(o)}>
        <AlertDialogContent className="bg-slate-950/90 backdrop-blur-xl border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <FileX className="h-5 w-5 text-white/70" />
              Dispensar contrato?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {selectedVenda ? (
                <>Cliente: <span className="text-white/90 font-medium">{selectedVenda.cliente_nome}</span><br /></>
              ) : null}
              A venda poderá ser faturada sem contrato assinado. Você poderá reverter depois anexando o contrato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dispensandoContrato} className="bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={dispensandoContrato || !selectedVenda}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async (e) => {
                e.preventDefault();
                if (!selectedVenda) return;
                try {
                  setDispensandoContrato(true);
                  const { data: userData } = await supabase.auth.getUser();
                  const userId = userData.user?.id ?? null;
                  const { error } = await supabase
                    .from('vendas')
                    .update({
                      contrato_dispensado: true,
                      contrato_dispensado_em: new Date().toISOString(),
                      contrato_dispensado_por: userId,
                    } as any)
                    .eq('id', selectedVenda.id);
                  if (error) throw error;
                  toast({ title: 'Contrato dispensado', description: 'A venda já pode ser faturada.' });
                  setSelectedVenda((prev) => prev ? ({ ...(prev as any), contrato_dispensado: true } as Venda) : prev);
                  setVendas((prev) => prev.map((v) => v.id === selectedVenda.id ? ({ ...(v as any), contrato_dispensado: true } as Venda) : v));
                  queryClient.invalidateQueries({ queryKey: ['vendas-assinatura-contrato'] });
                  queryClient.invalidateQueries({ queryKey: ['vendas-pendente-faturamento'] });
                  queryClient.invalidateQueries({ queryKey: ['vendas-pendente-pedido'] });
                  setDispensarContratoOpen(false);
                } catch (err: any) {
                  console.error('Erro ao dispensar contrato:', err);
                  toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Não foi possível dispensar o contrato.' });
                } finally {
                  setDispensandoContrato(false);
                }
              }}
            >
              {dispensandoContrato ? 'Dispensando...' : 'Confirmar dispensa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
