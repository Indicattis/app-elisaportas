import { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Calendar, User, Package, FileText, CheckCircle2, Clock, AlertCircle, XCircle, Edit, RefreshCw, Save, Hammer, Paintbrush, Truck, FileDown, Printer, ClipboardList, MessageSquare } from "lucide-react";
import { FichaVisitaUpload } from "@/components/pedidos/FichaVisitaUpload";
import { toast as sonnerToast } from "sonner";
import { baixarPedidoProducaoPDF, imprimirPedidoProducaoPDF, type PedidoProducaoPDFData } from "@/utils/pedidoProducaoPDFGenerator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PedidoFluxogramaMap } from "@/components/pedidos/PedidoFluxogramaMap";
import { PedidoHistoricoMovimentacoes } from "@/components/pedidos/PedidoHistoricoMovimentacoes";
import { PedidoLinhasEditor } from "@/components/pedidos/PedidoLinhasEditor";
import { usePedidoLinhas, type PedidoLinhaUpdate, type PedidoLinha } from "@/hooks/usePedidoLinhas";
import { useValidacaoLinhasPorPorta } from "@/hooks/useValidacaoLinhasPorPorta";
import { usePedidoPortaObservacoes } from "@/hooks/usePedidoPortaObservacoes";
import { usePedidoPortaSocialObservacoes } from "@/hooks/usePedidoPortaSocialObservacoes";
import { usePedidosEtapas } from "@/hooks/usePedidosEtapas";
import { LinhasAgrupadasPorPorta } from "@/components/pedidos/LinhasAgrupadasPorPorta";
import { ObservacoesPortaForm } from "@/components/pedidos/ObservacoesPortaForm";
import { ObservacoesPortaSocialForm } from "@/components/pedidos/ObservacoesPortaSocialForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { expandirPortasPorQuantidade, getLabelPortaExpandida } from "@/utils/expandirPortas";

interface Ordem {
  id: string;
  tipo: string;
  numero_ordem: string;
  status: string;
  capturado_por?: {
    nome: string;
    foto_perfil_url?: string;
  } | null;
  concluido_por?: {
    nome: string;
    foto_perfil_url?: string;
  } | null;
  capturada_em?: string | null;
  data_conclusao?: string | null;
  tempo_conclusao_segundos?: number | null;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  etapa_atual: string;
  status?: string;
  created_at: string;
  venda_id?: string;
  linhas: PedidoLinha[];
  ordens: Ordem[];
  ficha_visita_url?: string | null;
  ficha_visita_nome?: string | null;
  observacoes?: string | null;
  venda?: {
    id: string;
    cliente_nome: string;
    cidade?: string;
    estado?: string;
    valor_venda?: number;
    forma_pagamento?: string;
    tipo_entrega?: string;
    data_prevista_entrega?: string;
    produtos?: any[];
  };
}

// Funções auxiliares para cálculos
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

export default function PedidoView() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [linhasEditadas, setLinhasEditadas] = useState<Map<string, PedidoLinhaUpdate>>(new Map());
  const [salvando, setSalvando] = useState(false);
  const [mostrarModalAvancar, setMostrarModalAvancar] = useState(false);
  const [editandoObservacoes, setEditandoObservacoes] = useState(false);
  const [observacoesTemp, setObservacoesTemp] = useState('');
  const [salvandoObservacoes, setSalvandoObservacoes] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isProducao = location.pathname.startsWith('/producao');

  // Hooks para edição (apenas se pedido estiver aberto)
  const { linhas, adicionarLinha, removerLinha, atualizarCheckbox, atualizarLinhasEmLote, atualizarLinha } = usePedidoLinhas(id || "");
  const { moverParaProximaEtapa } = usePedidosEtapas();
  const { salvarObservacao, getObservacoesPorPorta } = usePedidoPortaObservacoes(id || "");
  const { salvarObservacao: salvarObservacaoSocial, getObservacoesPorPorta: getObservacoesSocialPorPorta } = usePedidoPortaSocialObservacoes(id || "");

  // Sincronizar linhas do hook com o estado local do pedido
  useEffect(() => {
    if (pedido && linhas) {
      setPedido(prev => prev ? { ...prev, linhas } : null);
    }
  }, [linhas]);

  // Buscar usuários ativos para select de observações
  const { data: usuarios = [] } = useQuery({
    queryKey: ['admin-users-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Buscar autorizados ativos para select de observações
  const { data: autorizados = [] } = useQuery({
    queryKey: ['autorizados-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autorizados')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Filtrar e expandir portas do tipo "porta_enrolar" por quantidade
  const portasEnrolarRaw = pedido?.venda?.produtos?.filter(
    (p: any) => p.tipo_produto === 'porta_enrolar'
  ) || [];
  const portasEnrolar = expandirPortasPorQuantidade(portasEnrolarRaw);

  // Filtrar e expandir portas do tipo "porta_social" por quantidade
  const portasSocialRaw = pedido?.venda?.produtos?.filter(
    (p: any) => p.tipo_produto === 'porta_social'
  ) || [];
  const portasSocial = expandirPortasPorQuantidade(portasSocialRaw);

  // Validação de linhas por porta
  const validacao = useValidacaoLinhasPorPorta(portasEnrolar, linhas);

  // Verificar se todas as ordens foram concluídas
  const todasOrdensConcluidas = pedido?.ordens && pedido.ordens.length > 0 && pedido.ordens.every((o) => o.status === "concluido");

  useEffect(() => {
    if (id) fetchPedidoDetails();
  }, [id]);

  const fetchPedidoDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Buscar pedido principal
      const { data: pedidoData, error: pedidoError } = await supabase
        .from("pedidos_producao")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (pedidoError) throw pedidoError;
      if (!pedidoData) {
        toast({ variant: "destructive", title: "Erro", description: "Pedido não encontrado" });
        setLoading(false);
        return;
      }

      // Buscar venda relacionada separadamente com produtos
      let vendaData = null;
      let produtosVenda = [];
      if (pedidoData.venda_id) {
        const { data } = await supabase
          .from("vendas")
          .select(`
            id, 
            cliente_nome, 
            cidade, 
            estado,
            valor_venda,
            forma_pagamento,
            tipo_entrega,
            data_prevista_entrega,
            atendente_id
          `)
          .eq("id", pedidoData.venda_id)
          .maybeSingle();
        vendaData = data;

        // Buscar produtos da venda com cor
        if (data) {
          const { data: produtos } = await supabase
            .from("produtos_vendas")
            .select(`
              *,
              cor:catalogo_cores(nome)
            `)
            .eq("venda_id", data.id)
            .order("created_at");
          produtosVenda = produtos || [];
        }
      }


      // Buscar linhas do pedido
      const { data: linhasData } = await supabase
        .from("pedido_linhas")
        .select("*")
        .eq("pedido_id", id)
        .order("created_at");

      // Buscar ordens de produção com dados dos usuários
      const ordens: Ordem[] = [];
      
      const { data: ordensPerfiladeira } = await supabase
        .from("ordens_perfiladeira")
        .select(`
          id, 
          numero_ordem, 
          status,
          created_by,
          responsavel_id,
          capturada_em,
          data_conclusao,
          tempo_conclusao_segundos
        `)
        .eq("pedido_id", id);
      
      const { data: ordensSeparacao } = await supabase
        .from("ordens_separacao")
        .select(`
          id, 
          numero_ordem, 
          status,
          created_by,
          responsavel_id,
          capturada_em,
          data_conclusao,
          tempo_conclusao_segundos
        `)
        .eq("pedido_id", id);
      
      const { data: ordensSoldagem } = await supabase
        .from("ordens_soldagem")
        .select(`
          id, 
          numero_ordem, 
          status,
          created_by,
          responsavel_id,
          capturada_em,
          data_conclusao,
          tempo_conclusao_segundos
        `)
        .eq("pedido_id", id);
      
      const { data: ordensPintura } = await supabase
        .from("ordens_pintura")
        .select(`
          id, 
          numero_ordem, 
          status,
          created_by,
          responsavel_id,
          capturada_em,
          data_conclusao,
          tempo_conclusao_segundos
        `)
        .eq("pedido_id", id);
      
      const { data: ordensQualidade } = await supabase
        .from("ordens_qualidade")
        .select(`
          id, 
          numero_ordem, 
          status,
          created_by,
          responsavel_id,
          capturada_em,
          data_conclusao,
          tempo_conclusao_segundos,
          capturado_por:admin_users!ordens_qualidade_created_by_fkey(nome, foto_perfil_url),
          concluido_por:admin_users!ordens_qualidade_responsavel_id_fkey(nome, foto_perfil_url)
        `)
        .eq("pedido_id", id);

      const { data: ordensTerceirizacao } = await supabase
        .from("ordens_terceirizacao")
        .select(`
          id, 
          numero_ordem, 
          status,
          created_by,
          responsavel_id,
          capturada_em,
          data_conclusao,
          tempo_conclusao_segundos,
          descricao_produto
        `)
        .eq("pedido_id", id);
      
      // Resolver nomes dos usuários (tabelas sem FK para admin_users)
      {
        const semFk = [ordensPerfiladeira, ordensSeparacao, ordensSoldagem, ordensPintura];
        const ids = new Set<string>();
        semFk.forEach(l => (l || []).forEach((o: any) => { if (o.created_by) ids.add(o.created_by); if (o.responsavel_id) ids.add(o.responsavel_id); }));
        if (ids.size) {
          const { data: users } = await supabase.from("admin_users").select("user_id, nome, foto_perfil_url").in("user_id", Array.from(ids));
          const map = new Map((users || []).map((u: any) => [u.user_id, { nome: u.nome, foto_perfil_url: u.foto_perfil_url }]));
          semFk.forEach(l => (l || []).forEach((o: any) => {
            o.capturado_por = o.created_by ? map.get(o.created_by) || null : null;
            o.concluido_por = o.responsavel_id ? map.get(o.responsavel_id) || null : null;
          }));
        }
      }

      // Ordens instalacao removidas - agora usa tabela instalacoes diretamente

      if (ordensPerfiladeira) {
        ordensPerfiladeira.forEach((o: any) => ordens.push({ 
          id: o.id,
          numero_ordem: o.numero_ordem,
          status: o.status,
          tipo: "Perfiladeira",
          capturado_por: o.capturado_por,
          concluido_por: o.concluido_por,
          capturada_em: o.capturada_em,
          data_conclusao: o.data_conclusao,
          tempo_conclusao_segundos: o.tempo_conclusao_segundos
        }));
      }
      if (ordensSeparacao) {
        ordensSeparacao.forEach((o: any) => ordens.push({ 
          id: o.id,
          numero_ordem: o.numero_ordem,
          status: o.status,
          tipo: "Separação",
          capturado_por: o.capturado_por,
          concluido_por: o.concluido_por,
          capturada_em: o.capturada_em,
          data_conclusao: o.data_conclusao,
          tempo_conclusao_segundos: o.tempo_conclusao_segundos
        }));
      }
      if (ordensSoldagem) {
        ordensSoldagem.forEach((o: any) => ordens.push({ 
          id: o.id,
          numero_ordem: o.numero_ordem,
          status: o.status,
          tipo: "Soldagem",
          capturado_por: o.capturado_por,
          concluido_por: o.concluido_por,
          capturada_em: o.capturada_em,
          data_conclusao: o.data_conclusao,
          tempo_conclusao_segundos: o.tempo_conclusao_segundos
        }));
      }
      if (ordensPintura) {
        ordensPintura.forEach((o: any) => ordens.push({ 
          id: o.id,
          numero_ordem: o.numero_ordem,
          status: o.status,
          tipo: "Pintura",
          capturado_por: o.capturado_por,
          concluido_por: o.concluido_por,
          capturada_em: o.capturada_em,
          data_conclusao: o.data_conclusao,
          tempo_conclusao_segundos: o.tempo_conclusao_segundos
        }));
      }
      if (ordensQualidade) {
        ordensQualidade.forEach((o: any) => ordens.push({ 
          id: o.id,
          numero_ordem: o.numero_ordem,
          status: o.status,
          tipo: "Qualidade",
          capturado_por: o.capturado_por,
          concluido_por: o.concluido_por,
          capturada_em: o.capturada_em,
          data_conclusao: o.data_conclusao,
          tempo_conclusao_segundos: o.tempo_conclusao_segundos
        }));
      }
      if (ordensTerceirizacao) {
        ordensTerceirizacao.forEach((o: any) => ordens.push({ 
          id: o.id,
          numero_ordem: o.numero_ordem,
          status: o.status,
          tipo: "Terceirização",
          capturado_por: null,
          concluido_por: null,
          capturada_em: o.capturada_em,
          data_conclusao: o.data_conclusao,
          tempo_conclusao_segundos: o.tempo_conclusao_segundos
        }));
      }
      // Instalações agora são buscadas diretamente da tabela instalacoes, não mais de ordens_instalacao

      setPedido({
        ...pedidoData as any,
        linhas: linhasData || [],
        ordens,
        venda: vendaData ? { ...vendaData, produtos: produtosVenda } : undefined,
      });
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar pedido" });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarAlteracoes = async () => {
    if (linhasEditadas.size === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Não há alterações para salvar.",
      });
      return;
    }

    setSalvando(true);
    try {
      const updates = Array.from(linhasEditadas.values());
      await atualizarLinhasEmLote(updates);
      setLinhasEditadas(new Map());
      setMostrarModalAvancar(true);
      fetchPedidoDetails();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSalvando(false);
    }
  };

  const handleAvancarEtapa = async () => {
    if (!pedido) return;
    
    try {
      await moverParaProximaEtapa.mutateAsync({
        pedidoId: pedido.id,
        skipCheckboxValidation: pedido.etapa_atual === 'aberto',
      });
      setMostrarModalAvancar(false);
      navigate('/dashboard/fabrica/pedidos');
    } catch (error) {
      console.error("Erro ao avançar etapa:", error);
      setMostrarModalAvancar(false);
    }
  };

  const handleSalvarObservacoes = async () => {
    if (!pedido) return;
    
    setSalvandoObservacoes(true);
    try {
      const { error } = await supabase
        .from('pedidos_producao')
        .update({ observacoes: observacoesTemp || null })
        .eq('id', pedido.id);
      
      if (error) {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar observações" });
        return;
      }
      
      setPedido(prev => prev ? { ...prev, observacoes: observacoesTemp || null } : null);
      setEditandoObservacoes(false);
      sonnerToast.success('Observações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar observações:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar observações" });
    } finally {
      setSalvandoObservacoes(false);
    }
  };

  const getEtapaLabel = (etapa: string) => {
    const etapas: Record<string, string> = {
      aberto: "Aberto",
      em_producao: "Em Produção",
      inspecao_qualidade: "Inspeção de Qualidade",
      aguardando_pintura: "Aguardando Pintura",
      aguardando_coleta: "Expedição Coleta",
      aguardando_instalacao: "Expedição Instalação",
      finalizado: "Finalizado",
    };
    return etapas[etapa] || etapa;
  };

  const getEtapaBadgeColor = (etapa: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      em_producao: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      inspecao_qualidade: "bg-purple-500/10 text-purple-700 border-purple-500/20",
      aguardando_pintura: "bg-orange-500/10 text-orange-700 border-orange-500/20",
      aguardando_coleta: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
      aguardando_instalacao: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
      finalizado: "bg-green-500/10 text-green-700 border-green-500/20",
    };
    return colors[etapa] || "";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      em_andamento: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      concluido: "bg-green-500/10 text-green-700 border-green-500/20",
      cancelado: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return colors[status] || "";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "em_andamento":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "cancelado":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const prepararDadosPDF = (): PedidoProducaoPDFData | null => {
    if (!pedido) return null;
    
    const observacoesData = portasEnrolar.map((porta: any, idx: number) => {
      const obs = getObservacoesPorPorta(porta._originalId, porta._indicePorta);
      const responsavel = usuarios.find((u: any) => u.id === obs?.responsavel_medidas_id);
      
      // Construir descrição das observações baseado nos campos disponíveis
      const detalhes: string[] = [];
      if (obs) {
        if (obs.interna_externa) detalhes.push(obs.interna_externa === 'porta_interna' ? 'Interna' : 'Externa');
        if (obs.opcao_tubo && obs.opcao_tubo !== 'sem_tubo') detalhes.push('Com tubo');
        if (obs.posicao_guia) detalhes.push(obs.posicao_guia === 'guia_dentro_vao' ? 'Guia dentro' : 'Guia fora');
        if (obs.opcao_guia) detalhes.push(obs.opcao_guia === 'guia_aparente' ? 'Aparente' : obs.opcao_guia);
        if (obs.lado_motor) detalhes.push(`Motor ${obs.lado_motor}`);
      }
      
      return {
        porta_descricao: getLabelPortaExpandida(idx, porta._totalNoGrupo, porta._indicePorta) + ` - ${Number(porta.largura).toFixed(2)}m × ${Number(porta.altura).toFixed(2)}m`,
        local_instalacao: obs?.interna_externa === 'porta_interna' ? 'Interna' : obs?.interna_externa === 'porta_externa' ? 'Externa' : '',
        observacoes: detalhes.join(' | '),
        responsavel_nome: responsavel?.nome || '',
      };
    }).filter((o: any) => o.observacoes || o.responsavel_nome);
    
    return {
      pedido: {
        id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        etapa_atual: pedido.etapa_atual,
        status: pedido.status,
        created_at: pedido.created_at,
      },
      cliente: pedido.venda ? {
        nome: pedido.venda.cliente_nome,
        cidade: pedido.venda.cidade,
        estado: pedido.venda.estado,
        valor_venda: pedido.venda.valor_venda,
        forma_pagamento: pedido.venda.forma_pagamento,
        tipo_entrega: pedido.venda.tipo_entrega,
        data_prevista_entrega: pedido.venda.data_prevista_entrega,
      } : undefined,
      produtos: (pedido.venda?.produtos || []).map((p: any) => ({
        tipo_produto: p.tipo_produto,
        descricao: p.descricao,
        tamanho: p.tamanho,
        cor: p.cor?.nome,
        quantidade: p.quantidade || 1,
        peso: calcularPeso(p),
        meiaCanas: calcularMeiaCanas(p),
      })),
      linhas: pedido.linhas.map((l: any) => ({
        nome_produto: l.nome_produto,
        descricao_produto: l.descricao_produto,
        quantidade: l.quantidade,
        tamanho: l.tamanho,
      })),
      observacoes: observacoesData,
      ordens: pedido.ordens.map((o: any) => ({
        tipo: o.tipo,
        numero_ordem: o.numero_ordem,
        status: o.status,
      })),
    };
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!pedido) return <div className="text-center py-8"><p>Pedido não encontrado</p></div>;

  const isAberto = pedido.etapa_atual === 'aberto';
  const isEditavel = isAberto || pedido.etapa_atual === 'aprovacao_ceo';
  const temPendentesSalvamento = linhasEditadas.size > 0;

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-3 sm:space-y-4 max-w-7xl">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link to="/dashboard/fabrica">Fábrica</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard/fabrica/pedidos">Pedidos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>#{pedido.numero_pedido}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0"
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate(isProducao ? '/producao/controle' : '/dashboard/fabrica/pedidos');
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">Pedido #{pedido.numero_pedido}</h1>
            <p className="text-xs text-muted-foreground">
              Cadastrado em {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPedidoDetails()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Badge variant="outline" className={`${getEtapaBadgeColor(pedido.etapa_atual)} text-xs px-2 py-0.5`}>
            {getEtapaLabel(pedido.etapa_atual)}
          </Badge>
        </div>
      </div>

      {/* Grid: Informações do Cliente e Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Informações do Cliente */}
        {pedido.venda && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{pedido.venda.cliente_nome}</p>
                </div>
                {pedido.venda.cidade && pedido.venda.estado && (
                  <div>
                    <p className="text-xs text-muted-foreground">Localização</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs">{pedido.venda.cidade}, {pedido.venda.estado}</span>
                    </div>
                  </div>
                )}
                {pedido.venda.valor_venda && (
                  <div>
                    <p className="text-xs text-muted-foreground">Valor da Venda</p>
                    <p className="font-medium">R$ {Number(pedido.venda.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {pedido.venda.forma_pagamento && (
                  <div>
                    <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                    <p className="font-medium capitalize">{pedido.venda.forma_pagamento}</p>
                  </div>
                )}
                {pedido.venda.tipo_entrega && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Entrega</p>
                    <p className="font-medium capitalize">{pedido.venda.tipo_entrega}</p>
                  </div>
                )}
                {pedido.venda.data_prevista_entrega && (
                  <div>
                    <p className="text-xs text-muted-foreground">Data Prevista</p>
                    <p className="font-medium">{format(new Date(pedido.venda.data_prevista_entrega), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Ações Rápidas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pedido.venda_id && (
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm h-9" 
                onClick={() => navigate(`/dashboard/vendas/${pedido.venda_id}/view`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver Venda
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-start text-sm h-9" 
              onClick={() => {
                const pdfData = prepararDadosPDF();
                if (pdfData) baixarPedidoProducaoPDF(pdfData);
              }}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-sm h-9" 
              onClick={() => {
                const pdfData = prepararDadosPDF();
                if (pdfData) imprimirPedidoProducaoPDF(pdfData);
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ficha de Visita Técnica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Ficha de Visita Técnica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FichaVisitaUpload
            fichaUrl={pedido.ficha_visita_url}
            fichaNome={pedido.ficha_visita_nome}
            onFichaChange={async (url, nome) => {
              const { error } = await supabase
                .from('pedidos_producao')
                .update({ ficha_visita_url: url, ficha_visita_nome: nome })
                .eq('id', pedido.id);
              
              if (error) {
                sonnerToast.error('Erro ao salvar ficha de visita');
                console.error(error);
                return;
              }
              
              setPedido(prev => prev ? { ...prev, ficha_visita_url: url, ficha_visita_nome: nome } : null);
              sonnerToast.success('Ficha de visita anexada com sucesso');
            }}
            onFichaRemove={async () => {
              // Extrair nome do arquivo da URL para deletar do storage
              if (pedido.ficha_visita_url) {
                const urlParts = pedido.ficha_visita_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                
                await supabase.storage
                  .from('fichas-visita-tecnica')
                  .remove([fileName]);
              }
              
              const { error } = await supabase
                .from('pedidos_producao')
                .update({ ficha_visita_url: null, ficha_visita_nome: null })
                .eq('id', pedido.id);
              
              if (error) {
                sonnerToast.error('Erro ao remover ficha de visita');
                console.error(error);
                return;
              }
              
              setPedido(prev => prev ? { ...prev, ficha_visita_url: null, ficha_visita_nome: null } : null);
              sonnerToast.success('Ficha de visita removida');
            }}
          />
        </CardContent>
      </Card>

      {/* Observações Gerais do Pedido */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações Gerais do Pedido
            </CardTitle>
            {!editandoObservacoes && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setObservacoesTemp(pedido.observacoes || '');
                  setEditandoObservacoes(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Essas observações serão exibidas nas ordens de produção
          </p>
        </CardHeader>
        <CardContent>
          {editandoObservacoes ? (
            <div className="space-y-3">
              <Textarea
                value={observacoesTemp}
                onChange={(e) => setObservacoesTemp(e.target.value)}
                placeholder="Digite observações importantes para a produção..."
                rows={4}
                className="resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditandoObservacoes(false)}
                  disabled={salvandoObservacoes}
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSalvarObservacoes}
                  disabled={salvandoObservacoes}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {salvandoObservacoes ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {pedido.observacoes || 'Nenhuma observação registrada. Clique no ícone de edição para adicionar.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Produtos da Venda */}
      {pedido.venda?.produtos && pedido.venda.produtos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos da Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Versão Desktop - Tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs">
                    <th className="text-left p-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Descrição</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Tamanho</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Cor</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Fabricação</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Peso (kg)</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">M. Canas</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.venda.produtos.map((produto: any) => {
                    const peso = calcularPeso(produto);
                    const meiaCanas = calcularMeiaCanas(produto);
                    return (
                      <tr key={produto.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-2 text-xs">{produto.tipo_produto || '-'}</td>
                        <td className="p-2 text-xs">{produto.descricao || '-'}</td>
                        <td className="p-2 text-xs">{produto.tamanho || '-'}</td>
                        <td className="p-2 text-xs">{produto.cor?.nome || '-'}</td>
                        <td className="p-2 text-xs">
                          <Badge 
                            variant={produto.tipo_fabricacao === 'terceirizado' ? 'secondary' : 'outline'} 
                            className={`text-xs ${produto.tipo_fabricacao === 'terceirizado' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' : ''}`}
                          >
                            {produto.tipo_fabricacao === 'terceirizado' ? 'Terceirizado' : 'Interno'}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-right">{peso || '-'}</td>
                        <td className="p-2 text-xs text-right">{meiaCanas || '-'}</td>
                        <td className="p-2 text-center">
                          <Badge variant="secondary" className="text-xs">{produto.quantidade}x</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Versão Mobile - Cards */}
            <div className="md:hidden space-y-3">
              {pedido.venda.produtos.map((produto: any) => {
                const peso = calcularPeso(produto);
                const meiaCanas = calcularMeiaCanas(produto);
                return (
                  <div key={produto.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{produto.tipo_produto || '-'}</span>
                      <Badge variant="secondary" className="text-xs">{produto.quantidade}x</Badge>
                    </div>
                    {produto.descricao && (
                      <p className="text-xs text-muted-foreground">{produto.descricao}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tamanho: </span>
                        <span className="font-medium">{produto.tamanho || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cor: </span>
                        <span className="font-medium">{produto.cor?.nome || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fabricação: </span>
                        <Badge 
                          variant={produto.tipo_fabricacao === 'terceirizado' ? 'secondary' : 'outline'} 
                          className={`text-xs ${produto.tipo_fabricacao === 'terceirizado' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' : ''}`}
                        >
                          {produto.tipo_fabricacao === 'terceirizado' ? 'Terceirizado' : 'Interno'}
                        </Badge>
                      </div>
                      {peso && (
                        <div>
                          <span className="text-muted-foreground">Peso: </span>
                          <span className="font-medium">{peso} kg</span>
                        </div>
                      )}
                      {meiaCanas && (
                        <div>
                          <span className="text-muted-foreground">M. Canas: </span>
                          <span className="font-medium">{meiaCanas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itens do Pedido */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Itens do Pedido {pedido.linhas.length > 0 && `(${pedido.linhas.length})`}
            </CardTitle>
            {isEditavel && (
              <div className="flex items-center gap-2">
                {!modoEdicao ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModoEdicao(true)}
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setModoEdicao(false);
                        setLinhasEditadas(new Map());
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSalvarAlteracoes}
                      disabled={!temPendentesSalvamento || salvando}
                    >
                      {salvando ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-2" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <PedidoLinhasEditor
            linhas={pedido.linhas}
            isReadOnly={!isEditavel || !modoEdicao}
            vendaId={pedido.venda_id}
            temPortasEnrolar={portasEnrolar.length > 0}
            onAdicionarLinha={adicionarLinha}
            onRemoverLinha={removerLinha}
            onAtualizarLinha={(linhaId: string, campo: 'quantidade' | 'tamanho', valor: number | string) => {
              setLinhasEditadas(prev => {
                const novoMapa = new Map(prev);
                const linhaExistente = novoMapa.get(linhaId) || { id: linhaId };
                novoMapa.set(linhaId, {
                  ...linhaExistente,
                  [campo]: valor,
                });
                return novoMapa;
              });
            }}
            onAtualizarLinhaCompleta={async (linhaId, dados) => {
              await atualizarLinha({ id: linhaId, ...dados });
            }}
          />
        </CardContent>
      </Card>

      {/* Observações da Visita Técnica */}
      {portasEnrolar.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Observações da visita técnica ({portasEnrolar.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portasEnrolar.map((porta: any, idx: number) => (
                <ObservacoesPortaForm
                  key={porta._virtualKey}
                  porta={porta}
                  portaIndex={idx}
                  usuarios={usuarios}
                  autorizados={autorizados}
                  valoresIniciais={getObservacoesPorPorta(porta._originalId, porta._indicePorta)}
                  onSalvar={salvarObservacao}
                  pedidoId={id || ''}
                  isReadOnly={!isEditavel}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Especificações Porta Social */}
      {portasSocial.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Especificações Porta Social ({portasSocial.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portasSocial.map((porta: any, idx: number) => (
                <ObservacoesPortaSocialForm
                  key={porta._virtualKey}
                  porta={porta}
                  portaIndex={idx}
                  valoresIniciais={getObservacoesSocialPorPorta(porta._originalId, porta._indicePorta)}
                  onSalvar={salvarObservacaoSocial}
                  pedidoId={id || ''}
                  isReadOnly={!isEditavel}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Movimentações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PedidoHistoricoMovimentacoes pedidoId={pedido.id} />
        </CardContent>
      </Card>

      {/* Fluxograma */}
      <PedidoFluxogramaMap pedidoSelecionado={pedido} onClose={() => {}} />

      {/* Ordens de Produção */}
      {pedido.ordens.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hammer className="w-4 h-4" />
              Ordens de Produção ({pedido.ordens.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Versão Desktop - Tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs">
                    <th className="text-left p-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Número</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Capturado por</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Concluído por</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Data Conclusão</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Tempo Produção</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.ordens.map((ordem) => (
                    <tr key={ordem.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {ordem.tipo === 'Perfiladeira' && <Hammer className="w-3 h-3 text-muted-foreground" />}
                          {ordem.tipo === 'Separação' && <Package className="w-3 h-3 text-muted-foreground" />}
                          {ordem.tipo === 'Soldagem' && <Hammer className="w-3 h-3 text-muted-foreground" />}
                          {ordem.tipo === 'Pintura' && <Paintbrush className="w-3 h-3 text-muted-foreground" />}
                          {ordem.tipo === 'Qualidade' && <CheckCircle2 className="w-3 h-3 text-muted-foreground" />}
                          {ordem.tipo === 'Instalação' && <Truck className="w-3 h-3 text-muted-foreground" />}
                          <span className="text-sm font-medium">{ordem.tipo}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {ordem.numero_ordem !== "N/A" ? `#${ordem.numero_ordem}` : '-'}
                      </td>
                      <td className="p-2">
                        {ordem.status !== "N/A" ? (
                          <Badge variant="outline" className={`${getStatusBadgeColor(ordem.status)} text-xs`}>
                            {ordem.status === "aberto" && "Aberto"}
                            {ordem.status === "em_andamento" && "Em Andamento"}
                            {ordem.status === "concluido" && "Concluído"}
                            {ordem.status === "cancelado" && "Cancelado"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {ordem.capturado_por ? (
                          <div className="flex items-center gap-2">
                            {ordem.capturado_por.foto_perfil_url ? (
                              <img 
                                src={ordem.capturado_por.foto_perfil_url} 
                                alt={ordem.capturado_por.nome}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-xs">{ordem.capturado_por.nome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {ordem.concluido_por ? (
                          <div className="flex items-center gap-2">
                            {ordem.concluido_por.foto_perfil_url ? (
                              <img 
                                src={ordem.concluido_por.foto_perfil_url} 
                                alt={ordem.concluido_por.nome}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-xs">{ordem.concluido_por.nome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {ordem.data_conclusao ? (
                          <span className="text-xs">
                            {format(new Date(ordem.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {ordem.tempo_conclusao_segundos ? (
                          <span className="text-xs font-medium">
                            {Math.floor(ordem.tempo_conclusao_segundos / 3600)}h {Math.floor((ordem.tempo_conclusao_segundos % 3600) / 60)}min
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Versão Mobile - Cards */}
            <div className="md:hidden space-y-3">
              {pedido.ordens.map((ordem) => (
                <div key={ordem.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ordem.tipo === 'Perfiladeira' && <Hammer className="w-4 h-4 text-muted-foreground" />}
                      {ordem.tipo === 'Separação' && <Package className="w-4 h-4 text-muted-foreground" />}
                      {ordem.tipo === 'Soldagem' && <Hammer className="w-4 h-4 text-muted-foreground" />}
                      {ordem.tipo === 'Pintura' && <Paintbrush className="w-4 h-4 text-muted-foreground" />}
                      {ordem.tipo === 'Qualidade' && <CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
                      {ordem.tipo === 'Instalação' && <Truck className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-medium text-sm">{ordem.tipo}</span>
                    </div>
                    {ordem.status !== "N/A" && (
                      <Badge variant="outline" className={`${getStatusBadgeColor(ordem.status)} text-xs`}>
                        {ordem.status === "aberto" && "Aberto"}
                        {ordem.status === "em_andamento" && "Em Andamento"}
                        {ordem.status === "concluido" && "Concluído"}
                        {ordem.status === "cancelado" && "Cancelado"}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {ordem.numero_ordem !== "N/A" ? `#${ordem.numero_ordem}` : '-'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {ordem.capturado_por && (
                      <div>
                        <span className="text-muted-foreground block">Capturado por:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {ordem.capturado_por.foto_perfil_url ? (
                            <img 
                              src={ordem.capturado_por.foto_perfil_url} 
                              alt={ordem.capturado_por.nome}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-2.5 h-2.5 text-muted-foreground" />
                            </div>
                          )}
                          <span>{ordem.capturado_por.nome}</span>
                        </div>
                      </div>
                    )}
                    {ordem.concluido_por && (
                      <div>
                        <span className="text-muted-foreground block">Concluído por:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {ordem.concluido_por.foto_perfil_url ? (
                            <img 
                              src={ordem.concluido_por.foto_perfil_url} 
                              alt={ordem.concluido_por.nome}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-2.5 h-2.5 text-muted-foreground" />
                            </div>
                          )}
                          <span>{ordem.concluido_por.nome}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {(ordem.data_conclusao || ordem.tempo_conclusao_segundos) && (
                    <div className="flex justify-between text-xs pt-1 border-t">
                      {ordem.data_conclusao && (
                        <span className="text-muted-foreground">
                          {format(new Date(ordem.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {ordem.tempo_conclusao_segundos && (
                        <span className="font-medium">
                          {Math.floor(ordem.tempo_conclusao_segundos / 3600)}h {Math.floor((ordem.tempo_conclusao_segundos % 3600) / 60)}min
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Confirmação para Avançar Etapa */}
      <Dialog open={mostrarModalAvancar} onOpenChange={setMostrarModalAvancar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterações Salvas!</DialogTitle>
            <DialogDescription>
              As alterações foram salvas com sucesso. Deseja avançar o pedido para a etapa de produção?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMostrarModalAvancar(false);
                setModoEdicao(false);
              }}
            >
              Não, continuar editando
            </Button>
            <Button onClick={handleAvancarEtapa}>
              Sim, avançar para produção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
