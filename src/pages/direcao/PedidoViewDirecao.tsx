import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, User, Package, CheckCircle2, Clock, AlertCircle, XCircle, RefreshCw, Hammer, Paintbrush, Truck, FileDown, Printer, ExternalLink, FileText, FolderOpen, Folder, ClipboardList, Trash2, Wrench, Mail, Phone, IdCard, Home, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { SETOR_LABELS } from "@/utils/setorMapping";
import { ExcluirPedidoModal } from "@/components/pedidos/ExcluirPedidoModal";
import { toast as sonnerToast } from "sonner";
import { baixarPedidoProducaoPDF, imprimirPedidoProducaoPDF, type PedidoProducaoPDFData } from "@/utils/pedidoProducaoPDFGenerator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PedidoHistoricoMovimentacoes } from "@/components/pedidos/PedidoHistoricoMovimentacoes";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { getLabelTipoProduto } from "@/utils/tipoProdutoLabels";
import { formatarDimensoes } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { FichaVisitaUpload } from "@/components/pedidos/FichaVisitaUpload";
import { useIsMobile } from "@/hooks/use-mobile";

const calcularPeso = (produto: any) => {
  if (produto.largura && produto.altura) {
    return (((produto.largura * produto.altura * 12) * 2) * 0.3).toFixed(1);
  }
  if (produto.tamanho) {
    const match = produto.tamanho.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
    if (match) {
      const largura = parseFloat(match[1]);
      const altura = parseFloat(match[2]);
      return (((largura * altura * 12) * 2) * 0.3).toFixed(1);
    }
  }
  return null;
};

const calcularMeiaCanas = (produto: any) => {
  if (produto.altura) {
    return (produto.altura / 0.076).toFixed(2);
  }
  if (produto.tamanho) {
    const match = produto.tamanho.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
    if (match) {
      const altura = parseFloat(match[2]);
      return (altura / 0.076).toFixed(2);
    }
  }
  return null;
};

const getInicialNome = (nome?: string | null) =>
  (nome?.trim()?.charAt(0) || '?').toUpperCase();

const formatarCpfCnpj = (valor?: string | null) => {
  if (!valor) return null;
  const nums = valor.replace(/\D/g, '');
  if (nums.length === 11) {
    return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (nums.length === 14) {
    return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return valor;
};

const formatarCep = (cep?: string | null) => {
  if (!cep) return null;
  const nums = cep.replace(/\D/g, '');
  if (nums.length === 8) return nums.replace(/(\d{5})(\d{3})/, '$1-$2');
  return cep;
};

const chipClass = (cor: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'pink' | 'slate') => {
  const map: Record<string, string> = {
    blue: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    purple: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    cyan: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    pink: 'bg-pink-500/15 border-pink-500/30 text-pink-300',
    slate: 'bg-white/5 border-white/10 text-white/70',
  };
  return `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${map[cor]}`;
};

interface PortaInfo {
  id: string;
  tipo_produto: string;
  largura: number | null;
  altura: number | null;
}

interface PortaGrupo {
  key: string;
  label: string;
  dimensoes: string;
  linhas: PedidoLinha[];
}

interface OrdemLinha {
  id: string;
  item: string;
  quantidade: number;
  tamanho?: string | null;
  concluida: boolean;
}

interface Ordem {
  id: string;
  tipo: string;
  numero_ordem: string;
  status: string;
  capturado_por_nome?: string | null;
  linhas?: OrdemLinha[];
}

interface PedidoLinha {
  id: string;
  nome_produto: string;
  descricao_produto?: string | null;
  quantidade: number;
  tamanho?: string | null;
  indice_porta?: number | null;
  produto_venda_id?: string | null;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  etapa_atual: string;
  created_at: string;
  venda_id?: string;
  ficha_visita_url?: string | null;
  ficha_visita_nome?: string | null;
  observacoes?: string | null;
  updated_at?: string;
  cliente_nome?: string;
  cliente_telefone?: string | null;
  cliente_email?: string | null;
  cliente_cpf?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_cep?: string | null;
  cidade?: string;
  estado?: string;
  valor_venda?: number;
  forma_pagamento?: string;
  tipo_entrega?: string;
  data_prevista_entrega?: string;
  linhas: PedidoLinha[];
  ordens: Ordem[];
  produtos_venda?: any[];
  is_correcao?: boolean;
}

interface CorrecaoData {
  custo_correcao: number | null;
  setor_causador: string | null;
  justificativa: string | null;
  etapa_causadora: string | null;
  linhas: { id: string; descricao: string; quantidade: number | null }[];
}

export default function PedidoViewDirecao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [portasInfo, setPortasInfo] = useState<Map<string, PortaInfo>>(new Map());
  const [pastaAberta, setPastaAberta] = useState<string | null>(null);
  const [showExcluir, setShowExcluir] = useState(false);
  const [isExcluindo, setIsExcluindo] = useState(false);
  const [correcaoData, setCorrecaoData] = useState<CorrecaoData | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleExcluirPedido = async () => {
    if (!id) return;
    setIsExcluindo(true);
    try {
      const { error } = await supabase.rpc('deletar_pedido_completo', { p_pedido_id: id });
      if (error) throw error;
      sonnerToast.success("Pedido excluído com sucesso");
      navigate('/direcao/gestao-fabrica');
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      sonnerToast.error("Erro ao excluir pedido", { description: error.message });
    } finally {
      setIsExcluindo(false);
      setShowExcluir(false);
    }
  };

  const fetchPedidoDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Buscar pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos_producao')
        .select(`
          id, numero_pedido, etapa_atual, created_at, venda_id,
          ficha_visita_url, ficha_visita_nome, observacoes, updated_at, is_correcao,
          endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep,
          cliente_email, cliente_cpf,
          vendas!inner(id, cliente_nome, cliente_telefone, cliente_email, cpf_cliente, cep, bairro, cidade, estado, valor_venda, forma_pagamento, tipo_entrega, data_prevista_entrega)
        `)
        .eq('id', id)
        .single();
      
      if (pedidoError) throw pedidoError;

      // Buscar produtos da venda
      let produtosVenda: any[] = [];
      const vendaObj = (pedidoData as any).vendas;
      if (vendaObj?.id) {
        const { data: produtos } = await supabase
          .from('produtos_vendas')
          .select(`*, cor:catalogo_cores(nome), pedido_correcao_id`)
          .eq('venda_id', vendaObj.id)
          .order('created_at');
        produtosVenda = produtos || [];
      }

      // Buscar linhas do pedido
      const { data: linhasData } = await supabase
        .from('pedido_linhas')
        .select('id, nome_produto, descricao_produto, quantidade, tamanho, indice_porta, produto_venda_id')
        .eq('pedido_id', id)
        .order('ordem', { ascending: true });

      // Buscar dados das portas (tipo_produto, largura, altura)
      const uniquePortaIds = [...new Set(
        (linhasData || [])
          .map(l => l.produto_venda_id)
          .filter((id): id is string => id !== null && id !== undefined)
      )];

      const newPortasInfo = new Map<string, PortaInfo>();
      if (uniquePortaIds.length > 0) {
        const { data: portasData } = await supabase
          .from('produtos_vendas')
          .select('id, tipo_produto, largura, altura')
          .in('id', uniquePortaIds);
        
        (portasData || []).forEach((p: any) => {
          newPortasInfo.set(p.id, {
            id: p.id,
            tipo_produto: p.tipo_produto,
            largura: p.largura,
            altura: p.altura,
          });
        });
      }
      setPortasInfo(newPortasInfo);

      // Buscar ordens de forma simples
      const ordensResult: Ordem[] = [];
      const ordemTables = ['ordens_soldagem', 'ordens_perfiladeira', 'ordens_separacao', 'ordens_qualidade', 'ordens_pintura', 'ordens_carregamento'];
      const tiposOrdem = ['Soldagem', 'Perfiladeira', 'Separação', 'Qualidade', 'Pintura', 'Carregamento'];

      for (let i = 0; i < ordemTables.length; i++) {
        const table = ordemTables[i];
        const tipo = tiposOrdem[i];
        
        const { data: ordemData } = await supabase
          .from(table as any)
          .select('id, numero_ordem, status')
          .eq('pedido_id', id)
          .maybeSingle();
        
        if (ordemData) {
          ordensResult.push({
            id: (ordemData as any).id,
            tipo,
            numero_ordem: (ordemData as any).numero_ordem || '',
            status: (ordemData as any).status || 'pendente',
            linhas: [],
          });
        }
      }

      // Buscar linhas de cada ordem
      for (const ordem of ordensResult) {
        const { data: linhasOrdem } = await supabase
          .from('linhas_ordens')
          .select('id, item, quantidade, tamanho, concluida')
          .eq('ordem_id', ordem.id)
          .eq('tipo_ordem', ordem.tipo.toLowerCase())
          .order('created_at', { ascending: true });
        
        ordem.linhas = (linhasOrdem as OrdemLinha[]) || [];
      }

      const venda = vendaObj;
      const isCorrecao = !!(pedidoData as any).is_correcao;

      // Buscar dados de correção se for pedido de correção
      let correcaoInfo: CorrecaoData | null = null;
      if (isCorrecao) {
        const { data: correcaoRow } = await supabase
          .from('correcoes')
          .select('id, custo_correcao, setor_causador, justificativa, etapa_causadora')
          .eq('pedido_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (correcaoRow) {
          const { data: correcaoLinhas } = await supabase
            .from('correcao_linhas')
            .select('id, descricao, quantidade')
            .eq('correcao_id', correcaoRow.id)
            .order('created_at', { ascending: true });

          correcaoInfo = {
            custo_correcao: correcaoRow.custo_correcao,
            setor_causador: correcaoRow.setor_causador,
            justificativa: correcaoRow.justificativa,
            etapa_causadora: correcaoRow.etapa_causadora,
            linhas: (correcaoLinhas || []) as any,
          };
        }
      }
      setCorrecaoData(correcaoInfo);
      
      setPedido({
        id: pedidoData.id,
        numero_pedido: pedidoData.numero_pedido,
        etapa_atual: pedidoData.etapa_atual,
        created_at: pedidoData.created_at,
        venda_id: pedidoData.venda_id || undefined,
        ficha_visita_url: pedidoData.ficha_visita_url,
        ficha_visita_nome: (pedidoData as any).ficha_visita_nome,
        observacoes: pedidoData.observacoes,
        updated_at: pedidoData.updated_at,
        cliente_nome: venda?.cliente_nome,
        cliente_telefone: venda?.cliente_telefone,
        cliente_email: (pedidoData as any).cliente_email ?? venda?.cliente_email ?? null,
        cliente_cpf: (pedidoData as any).cliente_cpf ?? venda?.cpf_cliente ?? null,
        endereco_rua: (pedidoData as any).endereco_rua ?? null,
        endereco_numero: (pedidoData as any).endereco_numero ?? null,
        endereco_bairro: (pedidoData as any).endereco_bairro ?? venda?.bairro ?? null,
        endereco_cidade: (pedidoData as any).endereco_cidade ?? venda?.cidade ?? null,
        endereco_estado: (pedidoData as any).endereco_estado ?? venda?.estado ?? null,
        endereco_cep: (pedidoData as any).endereco_cep ?? venda?.cep ?? null,
        cidade: venda?.cidade,
        estado: venda?.estado,
        valor_venda: venda?.valor_venda,
        forma_pagamento: venda?.forma_pagamento,
        tipo_entrega: venda?.tipo_entrega,
        data_prevista_entrega: venda?.data_prevista_entrega,
        linhas: ((linhasData as any) || []) as PedidoLinha[],
        ordens: ordensResult,
        produtos_venda: produtosVenda,
        is_correcao: isCorrecao,
      });
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do pedido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidoDetails();
  }, [id]);

  // Agrupar linhas por porta (incluindo produtos sem linhas)
  const gruposPortas = useMemo((): PortaGrupo[] => {
    if (!pedido) return [];
    const map = new Map<string, PortaGrupo>();
    
    // 1. Agrupar linhas existentes por produto_venda_id
    pedido.linhas.forEach((linha) => {
      const key = linha.produto_venda_id
        ? `${linha.produto_venda_id}_${linha.indice_porta ?? 0}`
        : 'sem_porta';
      
      if (!map.has(key)) {
        let label = 'Sem produto';
        let dimensoes = '';
        
        if (linha.produto_venda_id) {
          const porta = portasInfo.get(linha.produto_venda_id);
          const idx = linha.indice_porta ?? 0;
          if (porta) {
            label = `${getLabelTipoProduto(porta.tipo_produto)} #${idx + 1}`;
            dimensoes = formatarDimensoes(porta.largura, porta.altura);
          } else {
            label = `Porta #${idx + 1}`;
          }
        }
        
        map.set(key, { key, label, dimensoes, linhas: [] });
      }
      
      map.get(key)!.linhas.push(linha);
    });
    
    // 2. Criar pastas para produtos da venda que não possuem linhas
    const produtosVenda = pedido.produtos_venda || [];
    produtosVenda.forEach((pv: any) => {
      const key = `${pv.id}_0`;
      if (!map.has(key)) {
        const tipoLabel = getLabelTipoProduto(pv.tipo_produto);
        const dimensoes = formatarDimensoes(pv.largura, pv.altura);
        const corNome = pv.cor?.nome;
        const dimensoesComCor = [dimensoes, corNome].filter(Boolean).join(' • ');
        map.set(key, { key, label: `${tipoLabel} #0`, dimensoes: dimensoesComCor, linhas: [] });
      }
    });
    
    const grupos = [...map.values()];

    // Renumerar sequencialmente por tipo para evitar duplicatas
    const contadorPorTipo = new Map<string, number>();
    grupos.forEach(grupo => {
      if (grupo.key === 'sem_porta') return;
      const match = grupo.label.match(/^(.+) #\d+$/);
      if (match) {
        const tipo = match[1];
        const count = (contadorPorTipo.get(tipo) || 0) + 1;
        contadorPorTipo.set(tipo, count);
        grupo.label = `${tipo} #${count}`;
      }
    });

    return grupos;
  }, [pedido, portasInfo]);

  // Agrupar acessórios e adicionais idênticos somando quantidades
  const produtosVendaAgrupados = useMemo(() => {
    if (!pedido?.produtos_venda) return [];
    const tiposAgrupaveis = new Set(['acessorio', 'acessorios', 'adicional', 'adicionais']);
    const agrupados: any[] = [];
    const grupoMap = new Map<string, any>();

    pedido.produtos_venda.forEach((produto: any) => {
      const tipo = produto.tipo_produto;
      if (!tiposAgrupaveis.has(tipo)) {
        agrupados.push(produto);
        return;
      }
      // Não agrupar itens de correção (mantém visibilidade individual)
      if (produto.pedido_correcao_id) {
        agrupados.push(produto);
        return;
      }
      const chave = [
        tipo,
        produto.acessorio_id || '',
        produto.adicional_id || '',
        produto.descricao || '',
        produto.tamanho || '',
        produto.cor?.nome || '',
        produto.tipo_fabricacao || '',
      ].join('|');

      const existente = grupoMap.get(chave);
      if (existente) {
        existente.quantidade = (existente.quantidade || 0) + (produto.quantidade || 0);
        existente._agrupados = (existente._agrupados || 1) + 1;
      } else {
        const clone = { ...produto, _agrupados: 1 };
        grupoMap.set(chave, clone);
        agrupados.push(clone);
      }
    });

    return agrupados;
  }, [pedido?.produtos_venda]);

  const getEtapaLabel = (etapa: string) => {
    const labels: Record<string, string> = {
      aberto: 'Aberto',
      em_producao: 'Em Produção',
      inspecao_qualidade: 'Inspeção de Qualidade',
      aguardando_pintura: 'Aguardando Pintura',
      aguardando_coleta: 'Aguardando Coleta',
      aguardando_instalacao: 'Expedição Instalação',
      instalacoes: 'Instalações',
      correcoes: 'Correções',
      finalizado: 'Finalizado',
    };
    return labels[etapa] || etapa;
  };

  const getEtapaBadgeColor = (etapa: string) => {
    const colors: Record<string, string> = {
      aberto: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      em_producao: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      inspecao_qualidade: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      aguardando_pintura: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      aguardando_coleta: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      aguardando_instalacao: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      instalacoes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      correcoes: 'bg-red-500/20 text-red-400 border-red-500/30',
      finalizado: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return colors[etapa] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getOrdemStatusIcon = (status: string) => {
    switch (status) {
      case 'finalizada':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'em_andamento':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'pendente':
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOrdemIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'soldagem':
        return <Hammer className="w-4 h-4" />;
      case 'pintura':
        return <Paintbrush className="w-4 h-4" />;
      case 'carregamento':
        return <Truck className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const prepararDadosPDF = (): PedidoProducaoPDFData | null => {
    if (!pedido) return null;
    return {
      pedido: {
        id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        etapa_atual: pedido.etapa_atual,
        created_at: pedido.created_at,
      },
      cliente: pedido.cliente_nome ? {
        nome: pedido.cliente_nome,
        cidade: pedido.cidade,
        estado: pedido.estado,
        valor_venda: pedido.valor_venda,
        forma_pagamento: pedido.forma_pagamento,
        tipo_entrega: pedido.tipo_entrega,
        data_prevista_entrega: pedido.data_prevista_entrega,
      } : undefined,
      produtos: [],
      linhas: pedido.linhas.map((l) => ({ 
        nome_produto: l.nome_produto, 
        descricao_produto: l.descricao_produto || undefined, 
        quantidade: l.quantidade, 
        tamanho: l.tamanho || undefined 
      })),
      observacoes: [],
      ordens: pedido.ordens.map((o) => ({ tipo: o.tipo, numero_ordem: o.numero_ordem, status: o.status })),
    };
  };

  if (loading) {
    return (
      <MinimalistLayout title="Carregando..." backPath="/direcao/gestao-fabrica">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MinimalistLayout>
    );
  }

  if (!pedido) {
    return (
      <MinimalistLayout title="Pedido não encontrado" backPath="/direcao/gestao-fabrica">
        <div className="text-center py-8">
          <p className="text-white/60">Pedido não encontrado</p>
        </div>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout 
      title={`Pedido #${pedido.numero_pedido}`}
      subtitle={`Cadastrado em ${format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}`}
      backPath="/direcao/gestao-fabrica"
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchPedidoDetails()} className="text-white/70 hover:text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {pedido.is_correcao && (
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs px-2 py-0.5">
              <Wrench className="w-3 h-3 mr-1" />
              Correção
            </Badge>
          )}
          <Badge variant="outline" className={`${getEtapaBadgeColor(pedido.etapa_atual)} text-xs px-2 py-0.5`}>
            {getEtapaLabel(pedido.etapa_atual)}
          </Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Card principal do Cliente */}
        {(() => {
          const enderecoLinha1 = [pedido.endereco_rua, pedido.endereco_numero].filter(Boolean).join(', ');
          const enderecoLinha2 = [pedido.endereco_bairro, [pedido.endereco_cidade, pedido.endereco_estado].filter(Boolean).join('/')]
            .filter(Boolean).join(' — ');
          const cepFmt = formatarCep(pedido.endereco_cep);
          const temEndereco = !!(enderecoLinha1 || enderecoLinha2 || cepFmt);
          const cpfFmt = formatarCpfCnpj(pedido.cliente_cpf);
          const cpfLabel = pedido.cliente_cpf && pedido.cliente_cpf.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF';
          const mapsQuery = encodeURIComponent([enderecoLinha1, pedido.endereco_bairro, pedido.endereco_cidade, pedido.endereco_estado].filter(Boolean).join(', '));
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base border-2 border-white/20 shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 shrink-0">
                    {getInicialNome(pedido.cliente_nome)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-semibold text-base truncate">{pedido.cliente_nome || 'Cliente não informado'}</h2>
                      <span className={chipClass('slate')}>#{pedido.numero_pedido}</span>
                      {pedido.is_correcao && (
                        <span className={chipClass('purple')}>
                          <Wrench className="w-3 h-3" /> Correção
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      {pedido.endereco_cidade && pedido.endereco_estado && (
                        <span className={chipClass('blue')}>
                          <MapPin className="w-3 h-3" />
                          {pedido.endereco_cidade}, {pedido.endereco_estado}
                        </span>
                      )}
                      {(pedido.is_correcao && correcaoData) ? (
                        <span className={chipClass('purple')}>
                          R$ {Number(correcaoData.custo_correcao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : pedido.valor_venda ? (
                        <span className={chipClass('emerald')}>
                          R$ {Number(pedido.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : null}
                      {pedido.forma_pagamento && (
                        <span className={`${chipClass('cyan')} capitalize`}>{pedido.forma_pagamento}</span>
                      )}
                      {pedido.tipo_entrega && (
                        <span className={`${chipClass('amber')} capitalize`}>{pedido.tipo_entrega}</span>
                      )}
                      {pedido.data_prevista_entrega && (
                        <span className={chipClass('pink')}>
                          <Clock className="w-3 h-3" />
                          Prev: {format(new Date(pedido.data_prevista_entrega), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações rápidas em barra */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {pedido.venda_id && (
                    <Button size="sm" variant="outline"
                      className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-1.5"
                      onClick={() => window.open(`/direcao/vendas/${pedido.venda_id}`, '_blank')}>
                      <ExternalLink className="w-4 h-4" /> Ver Venda
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-1.5"
                    onClick={() => { const pdfData = prepararDadosPDF(); if (pdfData) baixarPedidoProducaoPDF(pdfData); }}>
                    <FileDown className="w-4 h-4" /> PDF
                  </Button>
                  <Button size="sm" variant="outline"
                    className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 gap-1.5"
                    onClick={() => { const pdfData = prepararDadosPDF(); if (pdfData) imprimirPedidoProducaoPDF(pdfData); }}>
                    <Printer className="w-4 h-4" /> Imprimir
                  </Button>
                  <Button size="sm" variant="outline"
                    className="rounded-full bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 gap-1.5"
                    onClick={() => setShowExcluir(true)}>
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                </div>
              </div>

              {/* Dados cadastrais */}
              <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <IdCard className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-white/40">{cpfLabel}</p>
                    <p className="text-white/90 font-medium truncate">{cpfFmt || <span className="text-white/30">Não informado</span>}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-white/40">Telefone</p>
                    {pedido.cliente_telefone ? (
                      <a href={`tel:${pedido.cliente_telefone}`} className="text-white/90 font-medium hover:text-blue-300 truncate block">
                        {pedido.cliente_telefone}
                      </a>
                    ) : (
                      <p className="text-white/30">Não informado</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Mail className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-white/40">E-mail</p>
                    {pedido.cliente_email ? (
                      <a href={`mailto:${pedido.cliente_email}`} className="text-white/90 font-medium hover:text-blue-300 truncate block">
                        {pedido.cliente_email}
                      </a>
                    ) : (
                      <p className="text-white/30">Não informado</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-4">
                  <Home className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Endereço</p>
                      {temEndereco && mapsQuery && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Google Maps
                        </a>
                      )}
                    </div>
                    {temEndereco ? (
                      <div className="text-white/90 font-medium leading-snug">
                        {enderecoLinha1 && <p>{enderecoLinha1}</p>}
                        {enderecoLinha2 && <p className="text-white/70 font-normal">{enderecoLinha2}</p>}
                        {cepFmt && <p className="text-white/50 font-normal text-xs">CEP {cepFmt}</p>}
                      </div>
                    ) : (
                      <p className="text-white/30">Não informado</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Ficha de Visita Técnica */}
        {pedido.ficha_visita_url && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <ClipboardList className="w-4 h-4" />
                Ficha de Visita Técnica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FichaVisitaUpload
                fichaUrl={pedido.ficha_visita_url}
                fichaNome={pedido.ficha_visita_nome}
                onFichaChange={() => {}}
                disabled={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Correção: Itens e Detalhes */}
        {pedido.is_correcao && correcaoData && (
          <>
            <Card className="bg-purple-500/5 border-purple-500/20 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Wrench className="w-4 h-4 text-purple-400" />
                  Itens da Correção
                </CardTitle>
              </CardHeader>
              <CardContent>
                {correcaoData.linhas.length > 0 ? (
                  <div className="space-y-2">
                    {correcaoData.linhas.map((linha) => (
                      <div key={linha.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 text-sm">
                        <p className="font-medium text-white">{linha.descricao}</p>
                        <Badge variant="outline" className="text-xs bg-white/5 text-white/70 border-white/20">
                          Qtd: {linha.quantidade ?? 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40 text-center italic py-4">Nenhum item de correção cadastrado</p>
                )}
              </CardContent>
            </Card>

            {(correcaoData.setor_causador || correcaoData.etapa_causadora || correcaoData.justificativa) && (
              <Card className="bg-purple-500/5 border-purple-500/20 backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Detalhes da Correção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {correcaoData.setor_causador && (
                      <div>
                        <p className="text-xs text-white/50">Setor Responsável</p>
                        <p className="font-medium text-white">{SETOR_LABELS[correcaoData.setor_causador as keyof typeof SETOR_LABELS] || correcaoData.setor_causador}</p>
                      </div>
                    )}
                    {correcaoData.etapa_causadora && (
                      <div>
                        <p className="text-xs text-white/50">Etapa Causadora</p>
                        <p className="font-medium text-white capitalize">{correcaoData.etapa_causadora.replace(/_/g, ' ')}</p>
                      </div>
                    )}
                    {correcaoData.justificativa && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-white/50">Justificativa</p>
                        <p className="font-medium text-white/80 whitespace-pre-wrap">{correcaoData.justificativa}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Produtos da Venda */}
        {pedido.produtos_venda && pedido.produtos_venda.length > 0 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                Produtos da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isMobile ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-xs">
                        <th className="text-left p-2 font-medium text-white/50">Tipo</th>
                        <th className="text-left p-2 font-medium text-white/50">Descrição</th>
                        <th className="text-left p-2 font-medium text-white/50">Tamanho</th>
                        <th className="text-left p-2 font-medium text-white/50">Cor</th>
                        <th className="text-left p-2 font-medium text-white/50">Fabricação</th>
                        <th className="text-right p-2 font-medium text-white/50">Peso (kg)</th>
                        <th className="text-right p-2 font-medium text-white/50">M. Canas</th>
                        <th className="text-center p-2 font-medium text-white/50">Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                       {produtosVendaAgrupados.map((produto: any) => {
                        const isCorrecaoItem = !!produto.pedido_correcao_id;
                        return (
                          <tr key={produto.id} className={cn(
                            "border-b transition-colors",
                            isCorrecaoItem
                              ? "border-purple-500/10 bg-purple-500/10 hover:bg-purple-500/15"
                              : "border-white/5 hover:bg-white/5"
                          )}>
                            <td className="p-2 text-xs text-white/80">
                              <span className="flex items-center gap-1.5">
                                {produto.tipo_produto || '-'}
                                {isCorrecaoItem && (
                                  <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    Correção
                                  </Badge>
                                )}
                              </span>
                            </td>
                            <td className="p-2 text-xs text-white/80">{produto.descricao || '-'}</td>
                            <td className="p-2 text-xs text-white/80">{produto.tamanho || '-'}</td>
                            <td className="p-2 text-xs text-white/80">{produto.cor?.nome || '-'}</td>
                            <td className="p-2 text-xs">
                              <Badge variant={produto.tipo_fabricacao === 'terceirizado' ? 'secondary' : 'outline'} className={`text-xs ${produto.tipo_fabricacao === 'terceirizado' ? 'bg-orange-500/20 text-orange-400' : 'border-white/20 text-white/60'}`}>
                                {produto.tipo_fabricacao === 'terceirizado' ? 'Terceirizado' : 'Interno'}
                              </Badge>
                            </td>
                            <td className="p-2 text-xs text-right text-white/80">{calcularPeso(produto) || '-'}</td>
                            <td className="p-2 text-xs text-right text-white/80">{calcularMeiaCanas(produto) || '-'}</td>
                            <td className="p-2 text-center">
                              <Badge variant="secondary" className="text-xs bg-white/10 text-white">{produto.quantidade}x</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {produtosVendaAgrupados.map((produto: any) => {
                    const isCorrecaoItem = !!produto.pedido_correcao_id;
                    return (
                      <div key={produto.id} className={cn(
                        "p-3 border rounded-lg space-y-2",
                        isCorrecaoItem ? "border-purple-500/20 bg-purple-500/10" : "border-white/10"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-white flex items-center gap-1.5">
                            {produto.tipo_produto || '-'}
                            {isCorrecaoItem && (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                                Correção
                              </Badge>
                            )}
                          </span>
                          <Badge variant="secondary" className="text-xs bg-white/10 text-white">{produto.quantidade}x</Badge>
                        </div>
                        {produto.descricao && <p className="text-xs text-white/50">{produto.descricao}</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-white/50">Tamanho: </span><span className="font-medium text-white/80">{produto.tamanho || '-'}</span></div>
                          <div><span className="text-white/50">Cor: </span><span className="font-medium text-white/80">{produto.cor?.nome || '-'}</span></div>
                          <div><span className="text-white/50">Peso: </span><span className="font-medium text-white/80">{calcularPeso(produto) || '-'} kg</span></div>
                          <div><span className="text-white/50">M. Canas: </span><span className="font-medium text-white/80">{calcularMeiaCanas(produto) || '-'}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Itens do Pedido */}
        {gruposPortas.length > 0 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                Itens do Pedido ({pedido.linhas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {gruposPortas.map((grupo) => {
                  const isOpen = pastaAberta === grupo.key;
                  const isSemProduto = grupo.key === 'sem_porta';
                  return (
                    <div
                      key={grupo.key}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all border-2",
                        isSemProduto ? "border-dashed" : "",
                        isOpen
                          ? "border-blue-500/50 bg-blue-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      )}
                      onClick={() => setPastaAberta(isOpen ? null : grupo.key)}
                    >
                      <div className="flex items-start gap-2">
                        {isOpen ? (
                          <FolderOpen className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        ) : (
                          <Folder className="h-5 w-5 text-white/50 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-semibold text-white leading-tight truncate">{grupo.label}</p>
                          {grupo.dimensoes && (
                            <p className="text-xs font-medium text-white/80">{grupo.dimensoes}</p>
                          )}
                          <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/70 border-white/20">
                            {grupo.linhas.length} {grupo.linhas.length === 1 ? 'item' : 'itens'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pastaAberta && (() => {
                const grupo = gruposPortas.find(g => g.key === pastaAberta);
                if (!grupo) return null;
                return (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <p className="text-xs text-white/50 font-medium">{grupo.label}</p>
                    {grupo.linhas.length === 0 ? (
                      <div className="p-3 rounded-lg bg-white/5 text-sm text-white/40 text-center italic">
                        Nenhum item de produção vinculado
                      </div>
                    ) : (
                      grupo.linhas.map((linha) => (
                        <div key={linha.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                          <div className="flex-1">
                            <p className="font-medium text-white">{linha.nome_produto}</p>
                            {linha.descricao_produto && (
                              <p className="text-xs text-white/60">{linha.descricao_produto}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-white/60 text-xs">
                            {linha.tamanho && <span>{linha.tamanho}</span>}
                            <span>Qtd: {linha.quantidade}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}



        {/* Observações do Pedido */}
        {pedido.observacoes && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <FileText className="w-4 h-4" />
                  Observações do Pedido
                </CardTitle>
                {pedido.updated_at && (
                  <span className="text-xs text-white/50">
                    Atualizado em {format(new Date(pedido.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 whitespace-pre-wrap">
                {pedido.observacoes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ordens de Produção */}
        {pedido.ordens.length > 0 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Hammer className="w-4 h-4" />
                Ordens de Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pedido.ordens.map((ordem) => (
                  <div key={ordem.id} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getOrdemIcon(ordem.tipo)}
                        <span className="font-medium text-white text-sm">{ordem.tipo}</span>
                      </div>
                      {getOrdemStatusIcon(ordem.status)}
                    </div>
                    <p className="text-xs text-white/60">#{ordem.numero_ordem}</p>
                    
                    {/* Linhas da ordem */}
                    {ordem.linhas && ordem.linhas.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                        {ordem.linhas.map((linha) => (
                          <div key={linha.id} className="flex items-center justify-between text-xs">
                            <span className="text-white/70 truncate flex-1">{linha.item}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-white/50">{linha.quantidade}x</span>
                              {linha.concluida && (
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico de Movimentações */}
        <PedidoHistoricoMovimentacoes pedidoId={pedido.id} />
      </div>

      {/* Modal de Exclusão */}
      <ExcluirPedidoModal
        open={showExcluir}
        onOpenChange={setShowExcluir}
        onConfirmar={handleExcluirPedido}
        pedido={{
          numero_pedido: pedido.numero_pedido,
          created_at: pedido.created_at,
          vendas: { cliente_nome: pedido.cliente_nome },
        }}
        isLoading={isExcluindo}
      />
    </MinimalistLayout>
  );
}
