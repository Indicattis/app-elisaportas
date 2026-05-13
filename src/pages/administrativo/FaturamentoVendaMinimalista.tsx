import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Package, 
  Undo2, 
  ArrowLeft, 
  Edit, 
  CheckCircle2,
  ExternalLink,
  Receipt,
  Minus,
  Plus,
  Calculator,
  Wrench,
  CalendarIcon,
  CreditCard,
  Trash2,
  FileText,
  Eye,
  Image,
  FileSignature
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useProdutosVenda } from "@/hooks/useProdutosVenda";
import { useFaturamento } from "@/hooks/useFaturamento";
import { LucroItemModal } from "@/components/vendas/LucroItemModal";
import { ConfirmarFaturamentoDialog } from "@/components/vendas/ConfirmarFaturamentoDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePedidoCreation } from "@/hooks/usePedidoCreation";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { FloatingProfileMenu } from "@/components/FloatingProfileMenu";
import { useConfiguracoesVendas } from "@/hooks/useConfiguracoesVendas";
import { PagamentoSection, PagamentoData, createEmptyPagamentoData } from "@/components/vendas/PagamentoSection";
import { MetodoPagamento, createEmptyMetodo } from "@/components/vendas/MetodoPagamentoCard";

const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const datePart = dateStr.substring(0, 10);
  const date = new Date(`${datePart}T12:00:00`);
  return isNaN(date.getTime()) ? null : date;
};

interface Venda {
  id: string;
  cliente_nome: string;
  valor_venda: number;
  valor_frete: number;
  valor_instalacao: number;
  valor_credito?: number;
  lucro_total: number;
  frete_aprovado: boolean;
  comprovante_url?: string;
  comprovante_nome?: string;
  lucro_instalacao?: number;
  custo_instalacao?: number;
  instalacao_faturada?: boolean;
  metodo_pagamento?: string;
  numero_parcelas?: number;
  intervalo_boletos?: number;
  empresa_receptora_id?: string;
  data_venda?: string;
  forma_pagamento?: string;
  venda_presencial?: boolean;
  pagamento_na_entrega?: boolean;
  valor_entrada?: number;
  valor_a_receber?: number;
  quantidade_parcelas?: number;
  data_pagamento?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function FaturamentoVendaMinimalista() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const autoFaturadosRef = useRef<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduto, setSelectedProduto] = useState<any | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPedidoDialog, setShowPedidoDialog] = useState(false); // kept for potential future use
  const [showPedidoDuplicadoDialog, setShowPedidoDuplicadoDialog] = useState(false);
  const [showRemoverFaturamentoDialog, setShowRemoverFaturamentoDialog] = useState(false);
  const [showRegenerarParcelasDialog, setShowRegenerarParcelasDialog] = useState(false);
  const [pedidoExistenteId, setPedidoExistenteId] = useState<string | null>(null);
  const [checkingPedido, setCheckingPedido] = useState(false);
  const [hasPedido, setHasPedido] = useState<boolean | null>(null);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [pagamentoData, setPagamentoData] = useState<PagamentoData>(createEmptyPagamentoData());
  const [showRegenerarAposSalvarDialog, setShowRegenerarAposSalvarDialog] = useState(false);
  const [salvandoFormaPagamento, setSalvandoFormaPagamento] = useState(false);
  const { createPedidoFromVenda, checkExistingPedido } = usePedidoCreation();
  const { removerFaturamento, isRemovendo } = useFaturamento();
  const { configuracoes: configVendas, limites: limitesVendas } = useConfiguracoesVendas();
  const configLimites = {
    avista: configVendas?.limite_desconto_avista ?? 3,
    presencial: configVendas?.limite_desconto_presencial ?? 5,
  };
  // Limite máximo de desconto (com senha do responsável) — definido em /direcao/vendas/regras-vendas.
  // Acima desse percentual o excedente é abatido do lucro.
  const LIMITE_DESCONTO_LUCRO = limitesVendas.totalComResponsavel;

  const {
    produtos,
    isLoading: isLoadingProdutos,
    updateLucroItem,
    isUpdatingLucro,
    finalizarFaturamento,
    isFinalizandoFaturamento,
  } = useProdutosVenda(id);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (id) {
      fetchVenda();
      checkPedidoExistente();
      fetchContasReceber();
    }
  }, [id]);

  const checkPedidoExistente = async () => {
    if (!id) return;
    const pedidoId = await checkExistingPedido(id);
    setHasPedido(!!pedidoId);
    if (pedidoId) {
      setPedidoExistenteId(pedidoId);
    }
  };

  const fetchContasReceber = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('contas_receber')
      .select('id, venda_id, metodo_pagamento, data_vencimento, status, observacoes, data_pagamento, valor_parcela, numero_parcela')
      .eq('venda_id', id)
      .order('numero_parcela');
    if (!error && data) setContasReceber(data);
  };

  const handleRegenerarParcelas = async () => {
    if (!id) return;
    // Deletar parcelas existentes
    const { error: deleteError } = await supabase
      .from('contas_receber')
      .delete()
      .eq('venda_id', id);
    if (deleteError) {
      toast({ variant: 'destructive', title: 'Erro ao remover parcelas existentes' });
      return;
    }
    setContasReceber([]);
    setShowRegenerarParcelasDialog(false);
    // Gerar novas
    await handleGerarParcelas();
  };

  const handleGerarParcelas = async () => {
    if (!venda || !id) return;
    const metodo = venda.metodo_pagamento || 'boleto';
    const numParcelas = venda.numero_parcelas || venda.quantidade_parcelas || 1;
    const intervalo = venda.intervalo_boletos || 30;
    const valorTotal = (venda.valor_venda || 0) + (venda.valor_credito || 0) + (venda.valor_frete || 0);
    const dataBase = safeParseDate(venda.data_venda) || new Date();
    const parcelas: any[] = [];

    // Suporte a 2 métodos de pagamento (entrada à vista + saldo parcelado)
    const valorEntrada = venda.valor_entrada || 0;
    const valorAReceber = venda.valor_a_receber || 0;
    const usarDoisMetodos = valorEntrada > 0 && valorAReceber > 0;

    const gerarParcelasParaMetodo = (
      metodoTipo: string,
      valorBase: number,
      qtdParcelas: number,
      offsetNumero: number,
      intervaloDias: number,
    ) => {
      if (metodoTipo === 'boleto' || metodoTipo === 'cartao_credito') {
        const valorParcela = valorBase / qtdParcelas;
        const intervaloEfetivo = metodoTipo === 'cartao_credito' ? 30 : intervaloDias;
        for (let i = 0; i < qtdParcelas; i++) {
          parcelas.push({
            venda_id: id,
            numero_parcela: offsetNumero + i + 1,
            valor_parcela: valorParcela,
            data_vencimento: addDays(dataBase, intervaloEfetivo * i).toISOString().split('T')[0],
            metodo_pagamento: metodoTipo,
            empresa_receptora_id: venda.empresa_receptora_id || null,
            status: 'pendente',
          });
        }
      } else {
        // dinheiro, a_vista, pix - parcela única
        parcelas.push({
          venda_id: id,
          numero_parcela: offsetNumero + 1,
          valor_parcela: valorBase,
          data_vencimento: dataBase.toISOString().split('T')[0],
          metodo_pagamento: metodoTipo,
          empresa_receptora_id: venda.empresa_receptora_id || null,
          status: 'pendente',
        });
      }
    };

    if (usarDoisMetodos) {
      // Entrada (à vista, parcela única)
      gerarParcelasParaMetodo('a_vista', valorEntrada, 1, 0, 0);
      // Saldo (parcelado conforme método principal)
      gerarParcelasParaMetodo(metodo, valorAReceber, numParcelas, 1, intervalo);
    } else {
      gerarParcelasParaMetodo(metodo, valorTotal, numParcelas, 0, intervalo);
    }

    if (parcelas.length > 0) {
      const { data, error } = await supabase.from('contas_receber').insert(parcelas).select();
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao gerar parcelas' });
        return;
      }
      if (data) setContasReceber(data);
      toast({ title: `${parcelas.length} parcela(s) gerada(s) com sucesso` });
    }
  };

  const handleAddParcela = async () => {
    const maxNumero = Math.max(0, ...contasReceber.map(p => p.numero_parcela || 0));
    const metodo = contasReceber[0]?.metodo_pagamento || 'boleto';
    const { data, error } = await supabase
      .from('contas_receber')
      .insert({
        venda_id: id,
        metodo_pagamento: metodo,
        valor_parcela: 0,
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'pendente',
        numero_parcela: maxNumero + 1,
      })
      .select()
      .single();
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar parcela' });
      return;
    }
    if (data) setContasReceber(prev => [...prev, data]);
    toast({ title: 'Parcela adicionada' });
  };

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleRemoveParcela = async (parcelaId: string) => {
    const { error } = await supabase.from('contas_receber').delete().eq('id', parcelaId);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover parcela' });
      return;
    }
    setContasReceber(prev => prev.filter(p => p.id !== parcelaId));
    setConfirmRemoveId(null);
    toast({ title: 'Parcela removida' });
  };

  const handleUpdatePagamento = async (pagamentoId: string, field: string, value: string | number | null) => {
    const updates: any = { [field]: value };
    if (field === 'status' && value === 'pago') {
      updates.data_pagamento = new Date().toISOString().split('T')[0];
    } else if (field === 'status' && value === 'pendente') {
      updates.data_pagamento = null;
    }
    const { error } = await supabase
      .from('contas_receber')
      .update(updates)
      .eq('id', pagamentoId);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar parcela' });
      return;
    }
    setContasReceber(prev => prev.map(p => p.id === pagamentoId ? { ...p, ...updates } : p));
    if (field === 'status') {
      toast({ title: 'Parcela atualizada com sucesso' });
    }
  };

  const handleUpdateMetodoGrupo = async (parcelas: any[], novoMetodo: string) => {
    const ids = parcelas.map(p => p.id);
    const { error } = await supabase
      .from('contas_receber')
      .update({ metodo_pagamento: novoMetodo })
      .in('id', ids);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao alterar método de pagamento' });
      return;
    }
    await fetchContasReceber();
    toast({ title: 'Método de pagamento atualizado' });
  };

  const handleUpdateMetodoParcela = async (parcelaId: string, novoMetodo: string) => {
    const { error } = await supabase
      .from('contas_receber')
      .update({ metodo_pagamento: novoMetodo })
      .eq('id', parcelaId);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao alterar método de pagamento' });
      return;
    }
    await fetchContasReceber();
    toast({ title: 'Método da parcela atualizado' });
  };

  const handleUpdateMetodoVenda = async (novoMetodo: string) => {
    if (!id) return;
    const { error } = await supabase
      .from('vendas')
      .update({ metodo_pagamento: novoMetodo })
      .eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao alterar método de pagamento da venda' });
      return;
    }
    setVenda(prev => prev ? { ...prev, metodo_pagamento: novoMetodo } : prev);
    toast({ title: 'Método de pagamento da venda atualizado' });
  };

  // Sincroniza o estado da seção de Forma de Pagamento com os dados atuais da venda.
  // Prioriza a fonte da verdade: as parcelas reais em `contasReceber`. Caso não existam,
  // faz fallback para as colunas escalares da tabela `vendas`.
  useEffect(() => {
    if (!venda) return;

    const tipoVenda = (venda.metodo_pagamento || '') as MetodoPagamento['tipo'];
    const valorTotal = (venda.valor_venda || 0) + (venda.valor_credito || 0) + (venda.valor_frete || 0);
    const dataBase = safeParseDate(venda.data_venda) || new Date();
    const empresaId = venda.empresa_receptora_id || '';
    const numParcelas = venda.numero_parcelas || venda.quantidade_parcelas || 1;
    const intervalo = venda.intervalo_boletos || 30;

    // ---- Caminho A: hidratar a partir de contasReceber (fonte da verdade) ----
    if (contasReceber && contasReceber.length > 0) {
      // Agrupa por método_pagamento, ordenando cada grupo por data_vencimento asc
      const groups = new Map<string, any[]>();
      [...contasReceber]
        .sort((a, b) => {
          const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : 0;
          const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : 0;
          return da - db;
        })
        .forEach((p: any) => {
          const key = p.metodo_pagamento || 'a_vista';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(p);
        });

      // Constrói uma "unidade" por grupo (já consolidando soma, datas, etc.)
      const buildFromGroup = (tipo: string, parcelas: any[]): MetodoPagamento => {
        const soma = parcelas.reduce((s, p) => s + (Number(p.valor_parcela) || 0), 0);
        const primeira = parcelas[0];
        const dataPag = primeira?.data_vencimento
          ? safeParseDate(primeira.data_vencimento) || dataBase
          : dataBase;
        const empresa = primeira?.empresa_receptora_id || empresaId;
        let intervaloCalc = intervalo;
        if (parcelas.length >= 2 && parcelas[0]?.data_vencimento && parcelas[1]?.data_vencimento) {
          const d1 = new Date(parcelas[0].data_vencimento).getTime();
          const d2 = new Date(parcelas[1].data_vencimento).getTime();
          const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
          if (diff > 0) intervaloCalc = diff;
        }
        const todasPagas = parcelas.every(p => p.status === 'pago');
        return {
          ...createEmptyMetodo(),
          tipo: (tipo as MetodoPagamento['tipo']) || 'a_vista',
          valor: soma,
          data_pagamento: dataPag,
          empresa_receptora_id: empresa,
          parcelas_cartao: tipo === 'cartao_credito' ? parcelas.length : 1,
          parcelas_boleto: tipo === 'boleto' ? parcelas.length : 1,
          intervalo_boletos: intervaloCalc,
          ja_pago: todasPagas,
        };
      };

      const entries = Array.from(groups.entries());
      // Considera "split" quando temos métodos distintos OU quando o mesmo método
      // foi quebrado em parcelas de valores claramente desiguais (ex: entrada + saldo).
      const isUniformParcelas = (parcelas: any[]) => {
        if (parcelas.length < 2) return true;
        const valores = parcelas.map(p => Number(p.valor_parcela) || 0);
        const max = Math.max(...valores);
        const min = Math.min(...valores);
        // Tolerância de 1 centavo (arredondamento)
        return max - min <= 0.01;
      };

      let m1: MetodoPagamento;
      let m2: MetodoPagamento;
      let usarDois: boolean;

      if (entries.length >= 2) {
        // Dois (ou mais) métodos distintos — pega os 2 maiores por valor total.
        const ordenados = entries
          .map(([tipo, parcelas]) => ({
            tipo,
            parcelas,
            soma: parcelas.reduce((s, p) => s + (Number(p.valor_parcela) || 0), 0),
          }))
          .sort((a, b) => b.soma - a.soma)
          .slice(0, 2)
          // Reordena: o de menor data_vencimento primeiro (entrada)
          .sort((a, b) => {
            const da = a.parcelas[0]?.data_vencimento ? new Date(a.parcelas[0].data_vencimento).getTime() : 0;
            const db = b.parcelas[0]?.data_vencimento ? new Date(b.parcelas[0].data_vencimento).getTime() : 0;
            return da - db;
          });
        m1 = buildFromGroup(ordenados[0].tipo, ordenados[0].parcelas);
        m2 = buildFromGroup(ordenados[1].tipo, ordenados[1].parcelas);
        usarDois = true;
      } else {
        const [tipoUnico, parcelasUnicas] = entries[0];
        if (parcelasUnicas.length >= 2 && !isUniformParcelas(parcelasUnicas)) {
          // Mesmo método, mas parcelas de valores distintos → tratar como split (entrada + saldo)
          const [primeira, ...resto] = parcelasUnicas;
          m1 = buildFromGroup(tipoUnico, [primeira]);
          m2 = buildFromGroup(tipoUnico, resto);
          usarDois = true;
        } else {
          m1 = buildFromGroup(tipoUnico, parcelasUnicas);
          m2 = createEmptyMetodo();
          usarDois = false;
        }
      }

      setPagamentoData({
        usar_dois_metodos: usarDois,
        metodos: [m1, m2],
        pagamento_na_entrega: !!venda.pagamento_na_entrega,
      });
      return;
    }

    // ---- Caminho B (fallback): hidratar a partir das colunas escalares de `vendas` ----
    const usarDois = !!(venda.valor_entrada && venda.valor_entrada > 0 && venda.valor_a_receber && venda.valor_a_receber > 0);

    const metodo1: MetodoPagamento = {
      ...createEmptyMetodo(),
      tipo: usarDois ? 'a_vista' : tipoVenda,
      valor: usarDois ? (venda.valor_entrada || 0) : valorTotal,
      data_pagamento: dataBase,
      empresa_receptora_id: empresaId,
      parcelas_cartao: tipoVenda === 'cartao_credito' ? numParcelas : 1,
      parcelas_boleto: tipoVenda === 'boleto' ? numParcelas : 1,
      intervalo_boletos: intervalo,
      ja_pago: false,
    };

    const metodo2: MetodoPagamento = usarDois
      ? {
          ...createEmptyMetodo(),
          tipo: tipoVenda || 'boleto',
          valor: venda.valor_a_receber || 0,
          data_pagamento: dataBase,
          empresa_receptora_id: empresaId,
          parcelas_cartao: tipoVenda === 'cartao_credito' ? numParcelas : 1,
          parcelas_boleto: tipoVenda === 'boleto' ? numParcelas : 1,
          intervalo_boletos: intervalo,
        }
      : createEmptyMetodo();

    setPagamentoData({
      usar_dois_metodos: usarDois,
      metodos: [metodo1, metodo2],
      pagamento_na_entrega: !!venda.pagamento_na_entrega,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venda?.id, contasReceber]);

  const consolidarVendaFromPagamento = (data: PagamentoData) => {
    const m1 = data.metodos[0];
    const m2 = data.metodos[1];
    const usarDois = data.usar_dois_metodos;

    // Tipo "principal" da venda: se usar 2 métodos, prevalece o do saldo (geralmente parcelado)
    const tipoPrincipal = (usarDois ? (m2.tipo || m1.tipo) : m1.tipo) || '';

    const numeroParcelas =
      tipoPrincipal === 'cartao_credito'
        ? (usarDois ? m2.parcelas_cartao : m1.parcelas_cartao)
        : tipoPrincipal === 'boleto'
        ? (usarDois ? m2.parcelas_boleto : m1.parcelas_boleto)
        : 1;

    const intervaloBoletos = tipoPrincipal === 'boleto'
      ? (usarDois ? m2.intervalo_boletos : m1.intervalo_boletos)
      : null;

    const empresaReceptora = (usarDois ? (m2.empresa_receptora_id || m1.empresa_receptora_id) : m1.empresa_receptora_id) || null;

    return {
      metodo_pagamento: tipoPrincipal,
      numero_parcelas: numeroParcelas,
      quantidade_parcelas: numeroParcelas,
      intervalo_boletos: intervaloBoletos,
      empresa_receptora_id: empresaReceptora,
      valor_entrada: usarDois ? m1.valor : 0,
      valor_a_receber: usarDois ? m2.valor : 0,
      pagamento_na_entrega: data.pagamento_na_entrega,
    };
  };

  const handleSalvarFormaPagamento = async () => {
    if (!id || !venda) return;
    setSalvandoFormaPagamento(true);
    try {
      const updates = consolidarVendaFromPagamento(pagamentoData);
      const { error } = await supabase.from('vendas').update(updates).eq('id', id);
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao salvar forma de pagamento', description: error.message });
        return;
      }
      setVenda(prev => prev ? { ...prev, ...updates } as Venda : prev);
      toast({ title: 'Forma de pagamento atualizada' });
      // Pergunta se deseja regenerar parcelas
      setShowRegenerarAposSalvarDialog(true);
    } finally {
      setSalvandoFormaPagamento(false);
    }
  };

  // Auto-faturar produtos pintura_epoxi com 30% de lucro
  useEffect(() => {
    if (!produtos || produtos.length === 0 || isUpdatingLucro) return;
    
    const produtosPinturaParaAutoFaturar = produtos.filter(p => 
      p.tipo_produto === 'pintura_epoxi' && 
      (p.lucro_item === null || p.lucro_item === undefined || p.lucro_item === 0) &&
      !p.faturamento &&
      !autoFaturadosRef.current.has(p.id)
    );
    
    if (produtosPinturaParaAutoFaturar.length === 0) return;
    
    // Auto-preencher lucro para cada produto de pintura: (altura x largura) x 25
    produtosPinturaParaAutoFaturar.forEach(async (produto) => {
      autoFaturadosRef.current.add(produto.id);
      
      // Extrair dimensoes do campo tamanho (formato "6.35x4.9") quando altura/largura forem nulos
      let altura = produto.altura || 0;
      let largura = produto.largura || 0;
      
      if ((!altura || !largura) && produto.tamanho) {
        const partes = produto.tamanho.split('x');
        if (partes.length === 2) {
          largura = parseFloat(partes[0]) || 0;
          altura = parseFloat(partes[1]) || 0;
        }
      }
      
      const lucroPintura = (altura * largura) * 25;
      const custoCalculado = produto.valor_total - lucroPintura;
      await updateLucroItem({ 
        produtoId: produto.id, 
        lucroItem: lucroPintura,
        custoProducao: custoCalculado 
      });
    });
  }, [produtos]);

  // Auto-faturar produtos porta_enrolar com lucro da tabela de preços
  useEffect(() => {
    if (!produtos || produtos.length === 0 || isUpdatingLucro) return;
    
    const portasParaAutoFaturar = produtos.filter(p => 
      p.tipo_produto === 'porta_enrolar' && 
      (p.lucro_item === null || p.lucro_item === undefined || p.lucro_item === 0) &&
      !p.faturamento &&
      !autoFaturadosRef.current.has(p.id)
    );
    
    if (portasParaAutoFaturar.length === 0) return;
    
    portasParaAutoFaturar.forEach(async (produto) => {
      autoFaturadosRef.current.add(produto.id);
      
      let altura = produto.altura || 0;
      let largura = produto.largura || 0;
      
      if ((!altura || !largura) && produto.tamanho) {
        const partes = produto.tamanho.split('x');
        if (partes.length === 2) {
          largura = parseFloat(partes[0]) || 0;
          altura = parseFloat(partes[1]) || 0;
        }
      }
      
      if (!largura || !altura) return;
      
      const TOLERANCIA = 0.15;
      
      try {
        const { data: itens, error } = await supabase
          .from('tabela_precos_portas')
          .select('lucro')
          .eq('ativo', true)
          .gte('largura', largura - TOLERANCIA)
          .gte('altura', altura - TOLERANCIA)
          .order('largura', { ascending: true })
          .order('altura', { ascending: true })
          .limit(1);
        
        if (error || !itens || itens.length === 0) return;
        
        const lucroTabela = itens[0].lucro * produto.quantidade;
        const custoCalculado = produto.valor_total - lucroTabela;
        
        await updateLucroItem({ 
          produtoId: produto.id, 
          lucroItem: lucroTabela,
          custoProducao: custoCalculado 
        });
      } catch (err) {
        console.error('Erro ao buscar lucro da tabela para porta:', err);
      }
    });
  }, [produtos]);

  // Auto-faturar produtos instalacao com 30% de lucro
  useEffect(() => {
    if (!produtos || produtos.length === 0 || isUpdatingLucro) return;
    
    const instalacoesParaAutoFaturar = produtos.filter(p => 
      p.tipo_produto === 'instalacao' && 
      !p.faturamento &&
      !autoFaturadosRef.current.has(p.id)
    );
    
    if (instalacoesParaAutoFaturar.length === 0) return;
    
    instalacoesParaAutoFaturar.forEach(async (produto) => {
      autoFaturadosRef.current.add(produto.id);
      
      const lucroInstalacao = produto.valor_total * 0.40;
      const custoCalculado = produto.valor_total - lucroInstalacao;
      
      await updateLucroItem({ 
        produtoId: produto.id, 
        lucroItem: lucroInstalacao,
        custoProducao: custoCalculado,
        faturamento: true,
      });
    });
  }, [produtos]);

  // Auto-calcular lucro de itens de catálogo (acessorio/adicional/manutencao)
  // baseado em (preco_venda - custo_produto) cadastrados em vendas_catalogo.
  // Itens sem custo_produto cadastrado ficam pendentes para preenchimento manual.
  useEffect(() => {
    if (!produtos || produtos.length === 0 || isUpdatingLucro) return;

    const candidatos = produtos.filter((p: any) =>
      ['acessorio', 'adicional', 'manutencao'].includes(p.tipo_produto) &&
      p.vendas_catalogo_id &&
      !p.faturamento &&
      (!p.lucro_item || p.lucro_item === 0) &&
      !autoFaturadosRef.current.has(p.id)
    );

    if (candidatos.length === 0) return;

    (async () => {
      const ids = Array.from(new Set(candidatos.map((p: any) => p.vendas_catalogo_id)));
      const { data: catalogo, error } = await supabase
        .from('vendas_catalogo')
        .select('id, preco_venda, custo_produto')
        .in('id', ids);

      if (error || !catalogo) return;

      const map = new Map(catalogo.map((c: any) => [c.id, c]));

      for (const produto of candidatos) {
        const cat: any = map.get((produto as any).vendas_catalogo_id);
        if (!cat || !cat.custo_produto || cat.custo_produto <= 0) continue;

        autoFaturadosRef.current.add(produto.id);

        const quantidade = Number(produto.quantidade) || 1;
        // Para itens medidos por unidades decimais (Metro/Kg/Litro), o tamanho unitário
        // é armazenado em `tamanho`. Custo = custo_unitario * quantidade * tamanho.
        const tamanhoUnit = parseFloat((produto as any).tamanho || '') || 0;
        const fatorTamanho = tamanhoUnit > 0 ? tamanhoUnit : 1;
        const custoTotal = Number(cat.custo_produto) * quantidade * fatorTamanho;
        const valorTotal = Number(produto.valor_total) || 0;
        const lucroCalculado = Math.max(0, valorTotal - custoTotal);

        await updateLucroItem({
          produtoId: produto.id,
          lucroItem: lucroCalculado,
          custoProducao: custoTotal,
          faturamento: true,
        });
      }
    })();
  }, [produtos]);

  const fetchVenda = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vendas")
        .select("id, cliente_nome, valor_venda, valor_frete, valor_instalacao, valor_credito, lucro_total, frete_aprovado, comprovante_url, comprovante_nome, lucro_instalacao, custo_instalacao, instalacao_faturada, metodo_pagamento, numero_parcelas, intervalo_boletos, empresa_receptora_id, data_venda, forma_pagamento, venda_presencial, pagamento_na_entrega, valor_entrada, valor_a_receber, quantidade_parcelas, contrato_url")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVenda(data);
    } catch (error) {
      console.error("Erro ao buscar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar venda",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLucroItem = async (produtoId: string, lucro: number) => {
    const produto = produtos?.find(p => p.id === produtoId);
    if (!produto) return;

    // Se o item pertence a um grupo visual (acessorio/adicional/manutencao com mesma descrição),
    // distribuir lucro proporcionalmente ao valor_total de cada linha do grupo.
    const grupo = produtosAgrupados.find(g => g.ids.includes(produtoId));
    if (grupo && grupo.ids.length > 1) {
      const itensGrupo = produtos!.filter(p => grupo.ids.includes(p.id));
      const somaValor = itensGrupo.reduce((acc, p) => acc + (p.valor_total || 0), 0);
      await Promise.all(itensGrupo.map(p => {
        const proporcao = somaValor > 0 ? (p.valor_total || 0) / somaValor : 1 / itensGrupo.length;
        const lucroItem = lucro * proporcao;
        const custoProducao = (p.valor_total || 0) - lucroItem;
        return updateLucroItem({ produtoId: p.id, lucroItem, custoProducao });
      }));
      return;
    }

    const custoCalculado = produto.valor_total - lucro;
    await updateLucroItem({ 
      produtoId, 
      lucroItem: lucro,
      custoProducao: custoCalculado 
    });
  };

  const handleFaturar = async () => {
    if (!venda || !produtos) return;
    
    const produtosComLucroZero = produtos.filter(p => 
      (p.lucro_item === 0 || p.lucro_item === null || p.lucro_item === undefined)
    );
    
    if (produtosComLucroZero.length > 0) {
      setShowConfirmDialog(true);
      return;
    }
    
    await executarFaturamento();
  };

  const executarFaturamento = async () => {
    if (!venda || !produtos) return;
    
    const custoTotal = produtos.reduce((acc, p) => 
      acc + (p.custo_producao || 0), 0  // valor já é o total da linha
    );
    const lucroTotal = produtos.reduce((acc, p) => 
      acc + (p.lucro_item || 0), 0  // valor já é o total da linha
    );
    
    // Instalação legada (não migrada como produto separado)
    const temProdutoInstalacaoLocal = produtos.some(p => p.tipo_produto === 'instalacao');
    const valorInstalacaoLocal = temProdutoInstalacaoLocal ? 0 : (venda.valor_instalacao || 0);
    const lucroInstalacao = valorInstalacaoLocal > 0 ? valorInstalacaoLocal * 0.40 : 0;
    const custoInstalacao = valorInstalacaoLocal - lucroInstalacao;
    
    const produtosIds = produtos.map(p => p.id);
    
    try {
      await finalizarFaturamento({
        vendaId: venda.id,
        custoTotal,
        lucroTotal,
        produtosIds,
        lucroInstalacao,
        custoInstalacao,
      });
      
      setShowConfirmDialog(false);
      await fetchVenda();

      // NÃO criar pedido automaticamente — o Diretor cria manualmente
      // a partir da aba "Aprovação Diretor" em /direcao/gestao-fabrica.
      const pedidoExistente = await checkExistingPedido(venda.id);
      if (pedidoExistente) {
        setHasPedido(true);
        setPedidoExistenteId(pedidoExistente);
      }

      toast({
        title: "Venda faturada com sucesso!",
        description: "Aguardando criação do pedido pela Direção.",
      });
    } catch (error) {
      console.error('Erro ao finalizar faturamento:', error);
    }
  };

  const handleRemoverFaturamento = async () => {
    if (!venda || !id) return;

    try {
      const pedido = await checkExistingPedido(venda.id);
      if (pedido) {
        toast({
          variant: "destructive",
          title: "Não é possível remover o faturamento",
          description: "Existe um pedido de produção vinculado a esta venda. Exclua o pedido primeiro.",
        });
        setShowRemoverFaturamentoDialog(false);
        return;
      }

      await removerFaturamento(id);
      setShowRemoverFaturamentoDialog(false);
      await fetchVenda();
      
      toast({
        title: "Faturamento removido",
        description: "O faturamento foi removido com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao remover faturamento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover faturamento",
        description: error.message || "Ocorreu um erro ao remover o faturamento.",
      });
    }
  };

  // Cálculos
  const todosProdutosFaturados = produtos?.every(p => p.faturamento === true) || false;

  // Agrupamento visual: itens do tipo acessorio/adicional/manutencao com a mesma descrição
  // são exibidos em uma única linha (somando quantidade, valores, lucro e desconto).
  // Portas, pintura e instalação NÃO são agrupadas (precisam de medidas/lucro individuais).
  const produtosAgrupados = useMemo(() => {
    if (!produtos) return [] as Array<any & { ids: string[] }>;
    const TIPOS_AGRUPAVEIS = new Set(['acessorio', 'adicional', 'manutencao']);
    const grupos = new Map<string, any>();
    const resultado: any[] = [];

    produtos.forEach((p: any) => {
      if (!TIPOS_AGRUPAVEIS.has(p.tipo_produto)) {
        resultado.push({ ...p, ids: [p.id] });
        return;
      }
      // Agrupa também por tamanho — itens com tamanhos unitários diferentes ficam em linhas distintas.
      const chave = `${p.tipo_produto}|${(p.descricao || '').trim()}|${p.acessorio_id || ''}|${p.adicional_id || ''}|${p.tamanho || ''}`;
      const existente = grupos.get(chave);
      if (!existente) {
        const novo = { ...p, ids: [p.id] };
        grupos.set(chave, novo);
        resultado.push(novo);
      } else {
        existente.quantidade = (existente.quantidade || 0) + (p.quantidade || 0);
        existente.valor_total = (existente.valor_total || 0) + (p.valor_total || 0);
        // valor_produto/pintura/instalacao são UNITÁRIOS — não somar entre linhas iguais.
        // O total agregado já é refletido em valor_total e quantidade.
        existente.desconto_valor = (existente.desconto_valor || 0) + (p.desconto_valor || 0);
        const lucroExistente = existente.lucro_item;
        const lucroAtual = p.lucro_item;
        if (lucroExistente != null || lucroAtual != null) {
          existente.lucro_item = (lucroExistente || 0) + (lucroAtual || 0);
        }
        existente.custo_producao = (existente.custo_producao || 0) + (p.custo_producao || 0);
        // faturamento: só marca como faturado se TODAS as linhas do grupo estiverem faturadas
        existente.faturamento = existente.faturamento && p.faturamento;
        existente.ids.push(p.id);
      }
    });
    return resultado;
  }, [produtos]);

  const vendaFaturada = todosProdutosFaturados && venda?.frete_aprovado === true;
  const aguardandoContrato = !vendaFaturada && !((venda as any)?.contrato_url);
  const lucroProdutos = produtos?.reduce((acc, p) => acc + (p.lucro_item || 0), 0) || 0;  // valor já é o total da linha
  
  // Instalação: para vendas novas, é um produto separado tipo 'instalacao' com lucro_item
  // Para vendas legadas não migradas, usa valor_instalacao da venda
  const temProdutoInstalacao = produtos?.some(p => p.tipo_produto === 'instalacao') || false;
  const valorInstalacao = temProdutoInstalacao ? 0 : (venda?.valor_instalacao || 0);
  const lucroInstalacaoCalculado = valorInstalacao > 0 ? valorInstalacao * 0.40 : 0;
  const lucroInstalacao = temProdutoInstalacao ? 0 : (venda?.instalacao_faturada 
    ? (venda.lucro_instalacao || 0) 
    : lucroInstalacaoCalculado);
  
  const totalDescontosCalc = produtos?.reduce((acc, p) => {
    const qty = p.quantidade || 1;
    if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
      const base = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
      return acc + base * (p.desconto_percentual / 100);
    }
    if (p.desconto_valor && p.desconto_valor > 0) return acc + p.desconto_valor;
    return acc;
  }, 0) || 0;
  const totalCreditosProdutos = produtos?.reduce((acc, p) => {
    if (p.desconto_valor && p.desconto_valor < 0) return acc + Math.abs(p.desconto_valor);
    return acc;
  }, 0) || 0;
  const _valorTabelaParaExcedente = produtos?.reduce((acc: number, p: any) => {
    const qty = p.quantidade || 1;
    return acc + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
  }, 0) || 0;
  const pctDescontoTotal = _valorTabelaParaExcedente > 0
    ? (totalDescontosCalc / _valorTabelaParaExcedente) * 100
    : 0;
  const excedentePct = Math.max(0, pctDescontoTotal - LIMITE_DESCONTO_LUCRO);
  const excedenteValor = _valorTabelaParaExcedente * (excedentePct / 100);
  const totalLucro = lucroProdutos + lucroInstalacao - excedenteValor + totalCreditosProdutos + (venda?.valor_credito || 0);
  const margem = venda && venda.valor_venda > 0 ? (totalLucro / venda.valor_venda) * 100 : 0;
  // Só conta como faturado se lucro_item > 0 OU se o faturamento já foi finalizado
  const produtosFaturados = produtos?.filter(p => 
    p.faturamento === true || (p.lucro_item !== null && p.lucro_item !== undefined && p.lucro_item > 0)
  ).length || 0;
  // Contabilizar instalação legada se houver (não migrada)
  const temInstalacaoLegada = valorInstalacao > 0;
  const totalProdutos = (produtos?.length || 0) + (temInstalacaoLegada ? 1 : 0);
  const totalFaturados = produtosFaturados + (temInstalacaoLegada && (venda?.instalacao_faturada || lucroInstalacaoCalculado > 0) ? 1 : 0);

  // Descontos e acréscimos (considera tanto desconto percentual quanto valor)
  const totalDescontos = totalDescontosCalc;
  const valorCredito = venda?.valor_credito || 0;

  // Valor de tabela (soma bruta antes de descontos)
  const valorTabela = produtos?.reduce((acc: number, p: any) => {
    const qty = p.quantidade || 1;
    return acc + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
  }, 0) || 0;

  // Desconto tiers (Cartão / Gelo / Luan-Alana)
  const descontoTiers = (() => {
    const totalDesc = produtos?.reduce((acc: number, p: any) => {
      const qty = p.quantidade || 1;
      if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
        const base = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
        return acc + base * (p.desconto_percentual / 100);
      }
      if (p.desconto_valor && p.desconto_valor > 0) return acc + p.desconto_valor;
      return acc;
    }, 0) || 0;
    if (totalDesc === 0 || valorTabela === 0) return { cartao: 0, gelo: 0, responsavel: 0, total: totalDesc };
    const pctTotal = (totalDesc / valorTabela) * 100;
    const isCartao = venda?.forma_pagamento === 'cartao_credito';
    const isPresencial = venda?.venda_presencial === true;
    let pctCartao = 0, pctGelo = 0;
    if (!isCartao) pctCartao = Math.min(pctTotal, configLimites.avista);
    const restante1 = pctTotal - pctCartao;
    if (isPresencial && restante1 > 0) pctGelo = Math.min(restante1, configLimites.presencial);
    const pctResp = Math.max(0, pctTotal - pctCartao - pctGelo);
    return {
      cartao: valorTabela * (pctCartao / 100),
      gelo: valorTabela * (pctGelo / 100),
      responsavel: valorTabela * (pctResp / 100),
      total: totalDesc,
    };
  })();

  const getTipoProdutoLabel = (tipo?: string) => {
    const tipos: Record<string, string> = {
      'porta_enrolar': 'Porta Enrolar',
      'porta_social': 'Porta Social',
      'acessorio': 'Acessório',
      'manutencao': 'Manutenção',
      'adicional': 'Adicional',
      'pintura_epoxi': 'Pintura Epóxi',
      'instalacao': 'Instalação',
    };
    return tipos[tipo || ''] || tipo || '-';
  };

  const breadcrumbItems = [
    { label: "Home", path: "/home" },
    { label: "Administrativo", path: "/administrativo" },
    { label: "Financeiro", path: "/administrativo/financeiro" },
    { label: "Faturamento", path: "/administrativo/financeiro/faturamento" },
    { label: "Por Venda", path: "/administrativo/financeiro/faturamento/vendas" },
    { label: "Faturando venda" },
  ];

  if (loading || isLoadingProdutos) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Venda não encontrada</h2>
          <Button 
            variant="outline" 
            onClick={() => navigate('/administrativo/financeiro/faturamento/vendas')}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb items={breadcrumbItems} mounted={mounted} />
      <FloatingProfileMenu mounted={mounted} />

      <div className="max-w-[1600px] mx-auto p-6 pt-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/administrativo/financeiro/faturamento/vendas')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Faturamento</h1>
                {vendaFaturada && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Faturada
                  </Badge>
                )}
              </div>
              <p className="text-white/60">Cliente: {venda.cliente_nome}</p>
            </div>
          </div>

          {vendaFaturada && (
            <div className="flex gap-2">
              {/* Botão Criar Pedido - só aparece se não tem pedido */}
              {hasPedido === false && (
                <Button
                  variant="outline"
                  className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  onClick={() => setShowPedidoDialog(true)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Criar Pedido
                </Button>
              )}
              
              {/* Botão Acessar Pedido - só aparece se já tem pedido */}
              {hasPedido === true && pedidoExistenteId && (
                <Button
                  variant="outline"
                  className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                  onClick={() => navigate(`/fabrica/montagem-pedidos/${pedidoExistenteId}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Pedido
                </Button>
              )}
              
              {/* Botão Remover Faturamento */}
              <Button
                variant="outline"
                className="bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                onClick={() => setShowRemoverFaturamentoDialog(true)}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Remover Faturamento
              </Button>
            </div>
          )}
        </div>

        {aguardandoContrato && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200">
            <FileSignature className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-400" />
            <div className="text-sm">
              <p className="font-semibold text-amber-300">Aguardando assinatura do contrato</p>
              <p className="text-amber-200/80">
                Esta venda só poderá ser faturada após o contrato ser anexado em
                {" "}<strong>Gestão da Fábrica → Assinatura de Contrato</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Indicadores Financeiros */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-9">
          {/* Valor de Tabela */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Tabela</p>
            <p className="text-sm font-bold text-blue-400">{formatCurrency(valorTabela)}</p>
          </div>

          {/* Desconto Cartão */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Desc. Cartão</p>
            <p className={cn("text-sm font-bold", descontoTiers.cartao > 0 ? "text-red-400" : "text-white/30")}>
              {descontoTiers.cartao > 0 ? `-${formatCurrency(descontoTiers.cartao)}` : '-'}
            </p>
          </div>

          {/* Desconto Gelo */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Desc. Gelo</p>
            <p className={cn("text-sm font-bold", descontoTiers.gelo > 0 ? "text-red-400" : "text-white/30")}>
              {descontoTiers.gelo > 0 ? `-${formatCurrency(descontoTiers.gelo)}` : '-'}
            </p>
          </div>

          {/* Desconto Luan/Alana */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Luan/Alana</p>
            <p className={cn("text-sm font-bold", descontoTiers.responsavel > 0 ? "text-orange-400" : "text-white/30")}>
              {descontoTiers.responsavel > 0 ? `-${formatCurrency(descontoTiers.responsavel)}` : '-'}
            </p>
          </div>

          <div
            className="bg-white/5 border border-white/10 rounded-lg p-3"
            title={`Desconto acima de ${LIMITE_DESCONTO_LUCRO}% do valor de tabela — abatido do lucro`}
          >
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Excedente &gt;{LIMITE_DESCONTO_LUCRO}%</p>
            <p className={cn("text-sm font-bold", excedenteValor > 0 ? "text-red-500" : "text-white/30")}>
              {excedenteValor > 0 ? `-${formatCurrency(excedenteValor)}` : '-'}
            </p>
            {excedenteValor > 0 && (
              <p className="text-[10px] text-red-400/80 mt-0.5">+{excedentePct.toFixed(1)}% acima de {LIMITE_DESCONTO_LUCRO}%</p>
            )}
          </div>

          {/* Crédito */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Crédito</p>
            <p className={cn("text-sm font-bold", valorCredito > 0 ? "text-emerald-400" : "text-white/30")}>
              {valorCredito > 0 ? `+${formatCurrency(valorCredito)}` : '-'}
            </p>
          </div>

          {/* Frete */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Frete</p>
            <p className={cn("text-sm font-bold", (venda.valor_frete || 0) > 0 ? "text-white" : "text-white/30")}>
              {(venda.valor_frete || 0) > 0 ? formatCurrency(venda.valor_frete) : '-'}
            </p>
          </div>

          {/* Valor da Venda */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Venda</p>
            <p className="text-sm font-bold text-white">{formatCurrency((venda.valor_venda || 0) + valorCredito)}</p>
          </div>

          {/* Lucro */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Lucro</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalLucro)}</p>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">Produtos da Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70 text-xs">Tipo</TableHead>
                    <TableHead className="text-white/70 text-xs">Produto</TableHead>
                    <TableHead className="text-white/70 text-xs">Tamanho</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Tabela</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Valor Unit.</TableHead>
                    <TableHead className="text-white/70 text-center text-xs">Qtd</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Valor Total</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Desc./Créd.</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Lucro</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Margem %</TableHead>
                    <TableHead className="text-white/70 text-right text-xs">Status</TableHead>
                    <TableHead className="text-white/70 text-center text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosAgrupados.map((produto) => {
                    const temLucro = produto.lucro_item !== null && produto.lucro_item !== undefined;
                    const valorTotalLinha = produto.valor_total;
                    const valorUnitario = produto.quantidade > 0 ? produto.valor_total / produto.quantidade : 0;
                    const hasDesconto = (produto.desconto_percentual && produto.desconto_percentual > 0) || (produto.desconto_valor && produto.desconto_valor > 0);
                    const hasCredito = (produto.desconto_percentual && produto.desconto_percentual < 0) || (produto.desconto_valor && produto.desconto_valor < 0);
                    const descontoLabel = produto.desconto_percentual 
                      ? `${Math.abs(produto.desconto_percentual)}%` 
                      : produto.desconto_valor 
                        ? formatCurrency(Math.abs(produto.desconto_valor))
                        : '-';
                    const isNegative = (produto.desconto_percentual && produto.desconto_percentual < 0) || (produto.desconto_valor && produto.desconto_valor < 0);
                    // Calcular desconto em valor absoluto para subtrair do lucro
                    const descontoValorAbs = (() => {
                      const qty = produto.quantidade || 1;
                      if (produto.tipo_desconto === 'percentual' && produto.desconto_percentual > 0) {
                        const base = ((produto.valor_produto || 0) + (produto.valor_pintura || 0) + (produto.valor_instalacao || 0)) * qty;
                        return base * (produto.desconto_percentual / 100);
                      }
                      if (produto.desconto_valor && produto.desconto_valor > 0) return produto.desconto_valor;
                      return 0;
                    })();
                    // Crédito (valor negativo no desconto = acréscimo ao lucro)
                    const creditoValorAbs = (() => {
                      if (produto.desconto_valor && produto.desconto_valor < 0) return Math.abs(produto.desconto_valor);
                      return 0;
                    })();
                    // O desconto só abate o lucro na parcela que excede o limite máximo configurado em
                    // /direcao/vendas/regras-vendas (LIMITE_DESCONTO_LUCRO). Distribui o excedente
                    // proporcionalmente ao desconto de cada item.
                    const parcelaExcedenteItem = excedenteValor > 0 && totalDescontosCalc > 0
                      ? excedenteValor * (descontoValorAbs / totalDescontosCalc)
                      : 0;
                    const lucroAjustado = temLucro ? (produto.lucro_item! - parcelaExcedenteItem + creditoValorAbs) : null;
                    return (
                      <TableRow key={produto.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white/80">{getTipoProdutoLabel(produto.tipo_produto)}</TableCell>
                        <TableCell className="font-medium text-white">{produto.descricao}</TableCell>
                        <TableCell className="text-white/60">
                          {produto.tamanho
                            ? (['acessorio', 'adicional', 'manutencao'].includes(produto.tipo_produto)
                                ? `${produto.tamanho}${(produto as any).unidade?.toLowerCase() === 'metro' ? ' m' : (produto as any).unidade?.toLowerCase() === 'kg' ? ' kg' : (produto as any).unidade?.toLowerCase() === 'litro' ? ' L' : ''}`
                                : produto.tamanho)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-blue-400">
                          {formatCurrency(((produto.valor_produto || 0) + (produto.valor_pintura || 0) + (produto.tipo_produto !== 'porta_enrolar' ? (produto.valor_instalacao || 0) : 0)) * (produto.quantidade || 1))}
                        </TableCell>
                        <TableCell className="text-right text-white/80">{formatCurrency(valorUnitario)}</TableCell>
                        <TableCell className="text-center text-white/80">
                          {Number.isInteger(produto.quantidade)
                            ? produto.quantidade
                            : Number(produto.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-white">{formatCurrency(valorTotalLinha)}</TableCell>
                        <TableCell className={`text-right ${isNegative ? 'text-green-400' : (hasDesconto ? 'text-red-400' : 'text-white/40')}`}>
                          {hasDesconto || hasCredito ? (
                            <span>{isNegative ? '+' : '-'}{descontoLabel}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className={`text-right ${lucroAjustado !== null ? (lucroAjustado >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white/40'}`}>{lucroAjustado !== null ? formatCurrency(lucroAjustado) : '-'}</TableCell>
                        <TableCell className="text-right text-white/80">{lucroAjustado !== null && valorTotalLinha > 0 ? `${((lucroAjustado / valorTotalLinha) * 100).toFixed(1)}%` : '-'}</TableCell>
                        <TableCell className="text-right">
                          {produto.faturamento ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Faturado</Badge>
                          ) : temLucro ? (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{produto.tipo_produto === 'porta_enrolar' ? 'Tabela' : produto.tipo_produto === 'pintura_epoxi' ? 'Fórmula' : 'Informado'}</Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'pintura_epoxi') ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedProduto(produto)} className="text-white/70 hover:text-white hover:bg-white/10"><Edit className="h-4 w-4" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {valorInstalacao > 0 && (
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-cyan-400">Instalação</TableCell>
                      <TableCell className="font-medium text-white">Serviço de Instalação</TableCell>
                      <TableCell className="text-white/60">-</TableCell>
                      <TableCell className="text-right text-white/60">-</TableCell>
                      <TableCell className="text-right text-white/80">{formatCurrency(valorInstalacao)}</TableCell>
                      <TableCell className="text-center text-white/80">1</TableCell>
                      <TableCell className="text-right font-medium text-white">{formatCurrency(valorInstalacao)}</TableCell>
                      <TableCell className="text-right text-white/60">-</TableCell>
                      <TableCell className="text-right text-white/80">{formatCurrency(lucroInstalacaoCalculado)}</TableCell>
                      <TableCell className="text-right text-white/80">30.0%</TableCell>
                      <TableCell className="text-right">
                        {venda.instalacao_faturada ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Faturado</Badge>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">30%</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-emerald-400/50 mx-auto" /></TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-white/5 border-white/10">
                    <TableCell colSpan={6} className="font-semibold text-white">Frete</TableCell>
                    <TableCell className="text-right font-semibold text-white">{formatCurrency(venda.valor_frete)}</TableCell>
                    <TableCell colSpan={5} className="text-white/50">Apenas visualização</TableCell>
                  </TableRow>
                  {(venda.valor_credito != null && venda.valor_credito !== 0) && (
                    <TableRow className="bg-white/5 border-white/10">
                      <TableCell colSpan={6} className="font-semibold text-white">Crédito / Acréscimo</TableCell>
                      <TableCell className="text-right font-semibold text-white">{formatCurrency(venda.valor_credito)}</TableCell>
                      <TableCell colSpan={5} className="text-white/50">Apenas visualização</TableCell>
                    </TableRow>
                  )}
                  {(() => {
                    const totalValor = (produtos?.reduce((acc, p) => acc + (p.valor_total || 0), 0) || 0) + (venda.valor_frete || 0) + (venda.valor_credito || 0);
                    const totalDesconto = produtos?.reduce((acc, p) => {
                      const qty = p.quantidade || 1;
                      if (p.tipo_desconto === 'valor') return acc + (p.desconto_valor || 0);
                      if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
                        const base = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
                        return acc + base * (p.desconto_percentual / 100);
                      }
                      if (p.desconto_valor) return acc + p.desconto_valor;
                      return acc;
                    }, 0) || 0;
                    const totalLucroGeral = totalLucro;
                    const margemGeral = totalValor > 0 ? (totalLucroGeral / totalValor) * 100 : 0;
                    const totalTabela = (produtos?.reduce((acc, p) => {
                      const qty = p.quantidade || 1;
                      return acc + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
                    }, 0) || 0);
                    return (
                      <TableRow className="bg-white/10 border-t border-white/20">
                        <TableCell colSpan={3} className="font-bold text-white text-sm">Total Geral</TableCell>
                        <TableCell className="text-right font-bold text-blue-400">{formatCurrency(totalTabela)}</TableCell>
                        <TableCell colSpan={2} />
                        <TableCell className="text-right font-bold text-white">{formatCurrency(totalValor)}</TableCell>
                        <TableCell className="text-right font-bold text-red-400">{totalDesconto > 0 ? formatCurrency(totalDesconto) : '-'}</TableCell>
                        <TableCell className={`text-right font-bold ${totalLucroGeral >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totalLucroGeral)}</TableCell>
                        <TableCell className={`text-right font-bold ${margemGeral >= 0 ? 'text-green-400' : 'text-red-400'}`}>{margemGeral.toFixed(1)}%</TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>


        {/* Forma de Pagamento (sessão dedicada — mesmo padrão de /vendas/minhas-vendas/nova) */}
        {venda && (
          <div className="space-y-3">
            <PagamentoSection
              paymentData={pagamentoData}
              onChange={setPagamentoData}
              valorTotal={(venda.valor_venda || 0) + (venda.valor_credito || 0)}
            />
            <div className="flex items-center justify-end gap-3">
              <p className="text-xs text-white/50 mr-auto">
                Alterações aqui podem regenerar as parcelas. Para ajustes finos, use o card Parcelas abaixo.
              </p>
              <Button
                onClick={handleSalvarFormaPagamento}
                disabled={salvandoFormaPagamento}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {salvandoFormaPagamento ? 'Salvando...' : 'Salvar Forma de Pagamento'}
              </Button>
            </div>
          </div>
        )}

        {/* Outras Informações da Venda */}
        {venda && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Receipt className="h-4 w-4 text-blue-400" />
                Outras Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {venda.data_venda && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/50">Data da Venda</p>
                    <p className="text-sm font-medium text-white">
                      {(() => { const d = safeParseDate(venda.data_venda); return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "-"; })()}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-white/50">Tipo de Venda</p>
                  <p className="text-sm font-medium">
                    {venda.venda_presencial ? (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">🔥 Venda Quente</Badge>
                    ) : (
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">❄️ Venda Gelo</Badge>
                    )}
                  </p>
                </div>
              </div>

              {/* Comprovante */}
              <div className="space-y-2">
                <p className="text-xs text-white/50">Comprovante</p>
                {venda.comprovante_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                      {venda.comprovante_nome?.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                        <Image className="w-5 h-5 text-blue-400 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                      )}
                      <span className="text-sm text-white/70 flex-1 truncate">{venda.comprovante_nome || 'Comprovante'}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-white/20 text-white hover:bg-white/10"
                        asChild
                      >
                        <a href={venda.comprovante_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" /> Visualizar
                        </a>
                      </Button>
                    </div>
                    {venda.comprovante_nome?.match(/\.(png|jpg|jpeg|webp)$/i) && (
                      <a href={venda.comprovante_url} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
                        <img
                          src={venda.comprovante_url}
                          alt="Preview do comprovante"
                          className="rounded-lg border border-white/10 w-full h-auto object-contain max-h-48"
                        />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">Nenhum comprovante anexado</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parcelas / Contas a Receber */}
        {contasReceber.length >= 0 && venda && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                  Parcelas / Contas a Receber
                </CardTitle>
                {contasReceber.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-white/20 text-white hover:bg-white/10" onClick={handleAddParcela}>
                      <Plus className="h-3 w-3 mr-1" /> Parcela
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={() => setShowRegenerarParcelasDialog(true)}>
                      <Calculator className="h-3 w-3 mr-1" /> Regenerar
                    </Button>
                    {(() => {
                      const pendentes = contasReceber.filter(p => p.status !== 'pago');
                      const ultima = pendentes.length > 0 ? pendentes[pendentes.length - 1] : null;
                      return ultima ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setConfirmRemoveId(ultima.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {contasReceber.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <CreditCard className="h-10 w-10 text-white/20" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-white/60">Nenhuma parcela cadastrada</p>
                    <p className="text-xs text-white/40">Gere as parcelas com base nos dados de pagamento da venda</p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    onClick={handleGerarParcelas}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Gerar Parcelas
                  </Button>
                </div>
              ) : (
              <>
              {(() => {
                const metodoLabels: Record<string, string> = {
                  boleto: 'Boleto', a_vista: 'À Vista', cartao_credito: 'Cartão', dinheiro: 'Dinheiro', pix: 'Pix'
                };
                const grouped = contasReceber.reduce((acc, parcela) => {
                  const key = parcela.metodo_pagamento || 'outros';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(parcela);
                  return acc;
                }, {} as Record<string, any[]>);

                return Object.entries(grouped).map(([metodo, parcelas]: [string, any[]]) => {
                  const subtotal = parcelas.reduce((sum: number, p: any) => sum + (p.valor_parcela || 0), 0);
                  const pagasCount = parcelas.filter((p: any) => p.status === 'pago').length;
                  return (
                    <div key={metodo} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Select
                            value={metodo}
                            onValueChange={(v) => handleUpdateMetodoGrupo(parcelas, v)}
                          >
                            <SelectTrigger className="h-7 w-[170px] bg-white/5 border-white/10 text-white text-sm font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boleto">Boleto</SelectItem>
                              <SelectItem value="a_vista">À Vista</SelectItem>
                              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="pix">Pix</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                            {pagasCount}/{parcelas.length} pagas
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-white/80">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/10 overflow-hidden">
                        {/* Header da lista */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-medium text-white/40 uppercase tracking-wider">
                          <span className="w-10">#</span>
                          <span className="w-[130px]">Vencimento</span>
                          <span className="flex-1 text-right">Valor</span>
                          <span className="w-[80px] text-center">Status</span>
                          <span className="w-[140px] text-center">Método</span>
                          <span className="w-6"></span>
                        </div>
                        {parcelas.map((parcela: any, idx: number) => {
                          const isPago = parcela.status === 'pago';
                          const isLast = idx === parcelas.length - 1;
                          return (
                            <div
                              key={parcela.id}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5 group",
                                !isLast && "border-b border-white/5",
                                isPago && "bg-emerald-500/[0.03]"
                              )}
                            >
                              <span className="text-sm font-mono font-medium text-white/50 w-10">{parcela.numero_parcela}</span>
                              <div className="relative flex items-center gap-1.5 w-[130px] shrink-0">
                                <CalendarIcon className="h-3.5 w-3.5 text-white/30" />
                                <span className="text-sm text-white/80 pointer-events-none">
                                  {parcela.data_vencimento ? parcela.data_vencimento.split('-').reverse().join('/') : '—'}
                                </span>
                                <input
                                  type="date"
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
                                  defaultValue={parcela.data_vencimento}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    if (newVal && newVal !== parcela.data_vencimento) {
                                      handleUpdatePagamento(parcela.id, 'data_vencimento', newVal);
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex-1 flex items-center justify-end">
                                <span className="text-white/30 text-sm mr-1">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-[100px] text-sm font-semibold text-white bg-transparent border-none focus:outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  defaultValue={Number(parcela.valor_parcela).toFixed(2)}
                                  onBlur={(e) => {
                                    const newVal = parseFloat(e.target.value);
                                    if (!isNaN(newVal) && newVal !== parcela.valor_parcela) {
                                      handleUpdatePagamento(parcela.id, 'valor_parcela', newVal);
                                    }
                                  }}
                                />
                              </div>
                              <div className="w-[80px] flex justify-center">
                                <button
                                  onClick={() => handleUpdatePagamento(parcela.id, 'status', isPago ? 'pendente' : 'pago')}
                                  className={cn(
                                    "text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all",
                                    isPago
                                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/20"
                                      : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 ring-1 ring-amber-500/20"
                                  )}
                                >
                                  {isPago ? '✓ Pago' : 'Pendente'}
                                </button>
                              </div>
                              <div className="w-[140px]">
                                <Select
                                  value={parcela.metodo_pagamento || ''}
                                  onValueChange={(v) => handleUpdateMetodoParcela(parcela.id, v)}
                                >
                                  <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white/70 text-xs">
                                    <SelectValue placeholder="Método" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="boleto">Boleto</SelectItem>
                                    <SelectItem value="a_vista">À Vista</SelectItem>
                                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="pix">Pix</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                onClick={() => setConfirmRemoveId(parcela.id)}
                                className="w-6 flex justify-center text-white/0 group-hover:text-red-400/60 hover:!text-red-400 transition-colors"
                                title="Excluir parcela"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <textarea
                        className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/30"
                        placeholder="Observação do grupo..."
                        rows={2}
                        defaultValue={parcelas[0]?.observacoes || ''}
                        onBlur={async (e) => {
                          const newVal = e.target.value;
                          // Salva a observação em todas as parcelas do grupo
                          for (const parcela of parcelas) {
                            if (newVal !== (parcela.observacoes || '')) {
                              await handleUpdatePagamento(parcela.id, 'observacoes', newVal);
                            }
                          }
                        }}
                      />
                    </div>
                  );
                });
              })()}
              {/* Validação: total parcelas vs valor venda */}
              {(() => {
                const totalParcelas = contasReceber.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
                const valorVenda = (venda.valor_venda || 0) + (venda.valor_credito || 0) + (venda.valor_frete || 0);
                const match = Math.abs(totalParcelas - valorVenda) < 0.01;
                return (
                  <div className={cn(
                    "mt-4 px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-between",
                    match 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  )}>
                    <span>Total parcelas: {formatCurrency(totalParcelas)}</span>
                    <span>Valor venda: {formatCurrency(valorVenda)}</span>
                    {!match && (
                      <span className="text-xs">Diferença: {formatCurrency(totalParcelas - valorVenda)}</span>
                    )}
                  </div>
                );
              })()}
              </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirm remove parcela dialog */}
        <AlertDialog open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
          <AlertDialogContent className="bg-zinc-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Remover parcela?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                A parcela selecionada será removida permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => confirmRemoveId && handleRemoveParcela(confirmRemoveId)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm regenerar parcelas dialog */}
        <AlertDialog open={showRegenerarParcelasDialog} onOpenChange={setShowRegenerarParcelasDialog}>
          <AlertDialogContent className="bg-zinc-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Regenerar parcelas?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Todas as parcelas existentes serão removidas e novas parcelas serão geradas com base no valor atual da venda ({formatCurrency((venda?.valor_venda || 0) + (venda?.valor_credito || 0))}). Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-orange-600 hover:bg-orange-700" onClick={handleRegenerarParcelas}>Regenerar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pergunta sobre regenerar após salvar Forma de Pagamento */}
        <AlertDialog open={showRegenerarAposSalvarDialog} onOpenChange={setShowRegenerarAposSalvarDialog}>
          <AlertDialogContent className="bg-zinc-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Regenerar parcelas com a nova forma de pagamento?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                A forma de pagamento da venda foi atualizada. Deseja regenerar as parcelas (contas a receber) com base na nova configuração? As parcelas existentes serão removidas e novas serão criadas. Caso prefira manter as parcelas atuais, escolha "Manter parcelas".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Manter parcelas</AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-600 hover:bg-orange-700"
                onClick={async () => {
                  setShowRegenerarAposSalvarDialog(false);
                  await handleRegenerarParcelas();
                }}
              >
                Regenerar parcelas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/administrativo/financeiro/faturamento')}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            Voltar
          </Button>
          {!vendaFaturada && (
            <Button
              size="lg"
              onClick={handleFaturar}
              disabled={isFinalizandoFaturamento || aguardandoContrato}
              title={aguardandoContrato ? "Anexe o contrato em Gestão da Fábrica > Assinatura de Contrato antes de faturar." : undefined}
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFinalizandoFaturamento ? "Faturando..." : aguardandoContrato ? "Aguardando contrato" : "Faturar"}
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Lucro */}
      {selectedProduto && (
        <LucroItemModal
          isOpen={!!selectedProduto}
          onClose={() => setSelectedProduto(null)}
          produto={selectedProduto}
          onSave={handleSaveLucroItem}
          isSaving={isUpdatingLucro}
        />
      )}

      {/* Modal de Confirmação */}
      <ConfirmarFaturamentoDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        produtosComLucroZero={produtos?.filter(p => 
          (p.lucro_item === 0 || p.lucro_item === null || p.lucro_item === undefined)
        ).length || 0}
        onConfirmar={executarFaturamento}
      />


      {/* Modal de Pedido Duplicado */}
      <AlertDialog open={showPedidoDuplicadoDialog} onOpenChange={setShowPedidoDuplicadoDialog}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Pedido Existente</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Já existe um pedido vinculado a esta venda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => navigate('/administrativo/financeiro/faturamento')}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (pedidoExistenteId) {
                  navigate(`/fabrica/montagem-pedidos/${pedidoExistenteId}`);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Acessar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Remover Faturamento */}
      <AlertDialog open={showRemoverFaturamentoDialog} onOpenChange={setShowRemoverFaturamentoDialog}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-400">
              Remover Faturamento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-white/60">
                Você está prestes a <strong className="text-white">remover o faturamento</strong> desta venda.
              </p>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-md p-3 text-sm">
                <p className="font-medium text-orange-400 mb-2">Isso irá:</p>
                <ul className="list-disc list-inside text-orange-300/80 space-y-1">
                  <li>Resetar todos os valores de lucro dos produtos</li>
                  <li>Resetar os custos de produção</li>
                  <li>Permitir que a venda seja editada novamente</li>
                </ul>
              </div>
              <p className="text-sm text-white/50">
                Esta ação não pode ser desfeita automaticamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isRemovendo}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoverFaturamento}
              disabled={isRemovendo}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRemovendo ? "Removendo..." : "Sim, Remover Faturamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


