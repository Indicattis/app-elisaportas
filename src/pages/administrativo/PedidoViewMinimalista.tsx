import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, User, Package, FileText, CheckCircle2, Clock, AlertCircle, XCircle, Edit, RefreshCw, Save, Hammer, Paintbrush, Truck, FileDown, Printer, ClipboardList, MessageSquare, AlertTriangle, Pencil, Check, X, ArrowLeft } from "lucide-react";
import { FichaVisitaUpload } from "@/components/pedidos/FichaVisitaUpload";
import { toast as sonnerToast } from "sonner";
import { useCatalogoCores } from "@/hooks/useCatalogoCores";
import { baixarPedidoProducaoPDF, imprimirPedidoProducaoPDF, type PedidoProducaoPDFData } from "@/utils/pedidoProducaoPDFGenerator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PedidoFluxogramaMap } from "@/components/pedidos/PedidoFluxogramaMap";
import { PedidoHistoricoMovimentacoes } from "@/components/pedidos/PedidoHistoricoMovimentacoes";
import { PedidoLinhasEditor } from "@/components/pedidos/PedidoLinhasEditor";
import { usePedidoLinhas, type PedidoLinhaUpdate, type PedidoLinha } from "@/hooks/usePedidoLinhas";
import { usePedidoPortaObservacoes } from "@/hooks/usePedidoPortaObservacoes";
import { usePedidoPortaSocialObservacoes } from "@/hooks/usePedidoPortaSocialObservacoes";
import { usePedidosEtapas } from "@/hooks/usePedidosEtapas";
import { ObservacoesPortaForm } from "@/components/pedidos/ObservacoesPortaForm";
import { ObservacoesPortaSocialForm } from "@/components/pedidos/ObservacoesPortaSocialForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { expandirPortasPorQuantidade, getLabelPortaExpandida } from "@/utils/expandirPortas";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { MedidasPortasSection } from "@/components/pedidos/MedidasPortasSection";
import { PortaFolderCard } from "@/components/pedidos/PortaFolderCard";
import { getLabelProdutoExpandido } from "@/utils/tipoProdutoLabels";
import { PreenchimentoParaleloModal } from "@/components/pedidos/PreenchimentoParaleloModal";

interface Ordem {
  id: string;
  tipo: string;
  numero_ordem: string;
  status: string;
  capturado_por?: { nome: string; foto_perfil_url?: string } | null;
  concluido_por?: { nome: string; foto_perfil_url?: string } | null;
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
    observacoes_venda?: string;
    produtos?: any[];
  };
}

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

export default function PedidoViewMinimalista() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [linhasEditadas, setLinhasEditadas] = useState<Map<string, PedidoLinhaUpdate>>(new Map());
  const [salvando, setSalvando] = useState(false);
  const [mostrarModalAvancar, setMostrarModalAvancar] = useState(false);
  const [observacoesTexto, setObservacoesTexto] = useState("");
  const [salvandoObservacoes, setSalvandoObservacoes] = useState(false);
  const [editandoProduto, setEditandoProduto] = useState<string | null>(null);
  const [editLargura, setEditLargura] = useState<number>(0);
  const [editAltura, setEditAltura] = useState<number>(0);
  const [editCorId, setEditCorId] = useState<string>("");
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  const [pastaObsAberta, setPastaObsAberta] = useState<string | null>(null);
  const [pastaSocialAberta, setPastaSocialAberta] = useState<string | null>(null);
  const [mostrarPreenchimento, setMostrarPreenchimento] = useState(false);
  const [editandoEndereco, setEditandoEndereco] = useState(false);
  const [enderecoForm, setEnderecoForm] = useState({
    endereco_rua: '',
    endereco_numero: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_cep: '',
  });
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { coresAtivas } = useCatalogoCores();

  const { linhas, adicionarLinha, removerLinha, atualizarCheckbox, atualizarLinhasEmLote, atualizarLinhasComPropagacao, atualizarLinha } = usePedidoLinhas(id || "");
  const { moverParaProximaEtapa } = usePedidosEtapas();
  const { salvarObservacao, getObservacoesPorPorta } = usePedidoPortaObservacoes(id || "");
  const { salvarObservacao: salvarObservacaoSocial, getObservacoesPorPorta: getObservacoesSocialPorPorta } = usePedidoPortaSocialObservacoes(id || "");

  useEffect(() => {
    if (pedido && linhas) {
      setPedido(prev => prev ? { ...prev, linhas } : null);
    }
  }, [linhas]);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['admin-users-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_users').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: autorizados = [] } = useQuery({
    queryKey: ['autorizados-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('autorizados').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const portasEnrolarRaw = pedido?.venda?.produtos?.filter((p: any) => p.tipo_produto === 'porta_enrolar') || [];
  const portasEnrolar = expandirPortasPorQuantidade(portasEnrolarRaw);
  const portasSocialRaw = pedido?.venda?.produtos?.filter((p: any) => p.tipo_produto === 'porta_social') || [];
  const portasSocial = expandirPortasPorQuantidade(portasSocialRaw);
  const todasOrdensConcluidas = pedido?.ordens && pedido.ordens.length > 0 && pedido.ordens.every((o) => o.status === "concluido");

  useEffect(() => {
    if (id) fetchPedidoDetails();
  }, [id]);

  useEffect(() => {
    if (pedido?.observacoes !== undefined) {
      setObservacoesTexto(pedido.observacoes || "");
    }
  }, [pedido?.observacoes]);

  useEffect(() => {
    if (pedido) {
      setEnderecoForm({
        endereco_rua: (pedido as any).endereco_rua || '',
        endereco_numero: (pedido as any).endereco_numero || '',
        endereco_bairro: (pedido as any).endereco_bairro || '',
        endereco_cidade: (pedido as any).endereco_cidade || '',
        endereco_estado: (pedido as any).endereco_estado || '',
        endereco_cep: (pedido as any).endereco_cep || '',
      });
    }
  }, [pedido?.id]);

  const fetchPedidoDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
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

      let vendaData = null;
      let produtosVenda: any[] = [];
      if (pedidoData.venda_id) {
        const { data } = await supabase
          .from("vendas")
          .select(`id, cliente_nome, cidade, estado, valor_venda, forma_pagamento, tipo_entrega, data_prevista_entrega, atendente_id, observacoes_venda`)
          .eq("id", pedidoData.venda_id)
          .maybeSingle();
        vendaData = data;

        if (data) {
          const { data: produtos } = await supabase
            .from("produtos_vendas")
            .select(`*, cor:catalogo_cores(nome)`)
            .eq("venda_id", data.id)
            .order("created_at");
          produtosVenda = produtos || [];
        }
      }

      const { data: linhasData } = await supabase.from("pedido_linhas").select("*").eq("pedido_id", id).order("created_at");

      const ordens: Ordem[] = [];
      
      const { data: ordensPerfiladeira } = await supabase.from("ordens_perfiladeira").select(`id, numero_ordem, status, capturada_em, data_conclusao, tempo_conclusao_segundos, capturado_por:admin_users!ordens_perfiladeira_created_by_fkey(nome, foto_perfil_url), concluido_por:admin_users!ordens_perfiladeira_responsavel_id_fkey(nome, foto_perfil_url)`).eq("pedido_id", id);
      const { data: ordensSeparacao } = await supabase.from("ordens_separacao").select(`id, numero_ordem, status, capturada_em, data_conclusao, tempo_conclusao_segundos, capturado_por:admin_users!ordens_separacao_created_by_fkey(nome, foto_perfil_url), concluido_por:admin_users!ordens_separacao_responsavel_id_fkey(nome, foto_perfil_url)`).eq("pedido_id", id);
      const { data: ordensSoldagem } = await supabase.from("ordens_soldagem").select(`id, numero_ordem, status, capturada_em, data_conclusao, tempo_conclusao_segundos, capturado_por:admin_users!ordens_soldagem_created_by_fkey(nome, foto_perfil_url), concluido_por:admin_users!ordens_soldagem_responsavel_id_fkey(nome, foto_perfil_url)`).eq("pedido_id", id);
      const { data: ordensPintura } = await supabase.from("ordens_pintura").select(`id, numero_ordem, status, capturada_em, data_conclusao, tempo_conclusao_segundos, capturado_por:admin_users!ordens_pintura_created_by_fkey(nome, foto_perfil_url), concluido_por:admin_users!ordens_pintura_responsavel_id_fkey(nome, foto_perfil_url)`).eq("pedido_id", id);
      const { data: ordensQualidade } = await supabase.from("ordens_qualidade").select(`id, numero_ordem, status, capturada_em, data_conclusao, tempo_conclusao_segundos, capturado_por:admin_users!ordens_qualidade_created_by_fkey(nome, foto_perfil_url), concluido_por:admin_users!ordens_qualidade_responsavel_id_fkey(nome, foto_perfil_url)`).eq("pedido_id", id);
      const { data: ordensTerceirizacao } = await supabase.from("ordens_terceirizacao").select(`id, numero_ordem, status, capturada_em, data_conclusao, tempo_conclusao_segundos`).eq("pedido_id", id);

      if (ordensPerfiladeira) ordensPerfiladeira.forEach((o: any) => ordens.push({ id: o.id, numero_ordem: o.numero_ordem, status: o.status, tipo: "Perfiladeira", capturado_por: o.capturado_por, concluido_por: o.concluido_por, capturada_em: o.capturada_em, data_conclusao: o.data_conclusao, tempo_conclusao_segundos: o.tempo_conclusao_segundos }));
      if (ordensSeparacao) ordensSeparacao.forEach((o: any) => ordens.push({ id: o.id, numero_ordem: o.numero_ordem, status: o.status, tipo: "Separação", capturado_por: o.capturado_por, concluido_por: o.concluido_por, capturada_em: o.capturada_em, data_conclusao: o.data_conclusao, tempo_conclusao_segundos: o.tempo_conclusao_segundos }));
      if (ordensSoldagem) ordensSoldagem.forEach((o: any) => ordens.push({ id: o.id, numero_ordem: o.numero_ordem, status: o.status, tipo: "Soldagem", capturado_por: o.capturado_por, concluido_por: o.concluido_por, capturada_em: o.capturada_em, data_conclusao: o.data_conclusao, tempo_conclusao_segundos: o.tempo_conclusao_segundos }));
      if (ordensPintura) ordensPintura.forEach((o: any) => ordens.push({ id: o.id, numero_ordem: o.numero_ordem, status: o.status, tipo: "Pintura", capturado_por: o.capturado_por, concluido_por: o.concluido_por, capturada_em: o.capturada_em, data_conclusao: o.data_conclusao, tempo_conclusao_segundos: o.tempo_conclusao_segundos }));
      if (ordensQualidade) ordensQualidade.forEach((o: any) => ordens.push({ id: o.id, numero_ordem: o.numero_ordem, status: o.status, tipo: "Qualidade", capturado_por: o.capturado_por, concluido_por: o.concluido_por, capturada_em: o.capturada_em, data_conclusao: o.data_conclusao, tempo_conclusao_segundos: o.tempo_conclusao_segundos }));
      if (ordensTerceirizacao) ordensTerceirizacao.forEach((o: any) => ordens.push({ id: o.id, numero_ordem: o.numero_ordem, status: o.status, tipo: "Terceirização", capturado_por: null, concluido_por: null, capturada_em: o.capturada_em, data_conclusao: o.data_conclusao, tempo_conclusao_segundos: o.tempo_conclusao_segundos }));

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

  const handleSalvarEndereco = async () => {
    if (!pedido) return;
    setSalvandoEndereco(true);
    try {
      const { error } = await supabase
        .from('pedidos_producao')
        .update(enderecoForm)
        .eq('id', pedido.id);
      if (error) throw error;
      setPedido(prev => prev ? { ...prev, ...enderecoForm } as any : null);
      setEditandoEndereco(false);
      sonnerToast.success("Endereço salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
      sonnerToast.error("Erro ao salvar endereço");
    } finally {
      setSalvandoEndereco(false);
    }
  };

  const handleSalvarAlteracoes = async () => {
    if (linhasEditadas.size === 0) {
      toast({ title: "Nenhuma alteração", description: "Não há alterações para salvar." });
      return;
    }

    setSalvando(true);
    try {
      const updates = Array.from(linhasEditadas.values());
      
      // Se está em produção, usar propagação para ordens
      if (pedido?.etapa_atual === 'em_producao') {
        await atualizarLinhasComPropagacao(updates);
        setLinhasEditadas(new Map());
        fetchPedidoDetails();
      } else {
        // Se está aberto, usar atualização normal
        await atualizarLinhasEmLote(updates);
        setLinhasEditadas(new Map());
        setMostrarModalAvancar(true);
        fetchPedidoDetails();
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarObservacoes = async () => {
    if (!pedido) return;
    
    setSalvandoObservacoes(true);
    try {
      const { error } = await supabase
        .from('pedidos_producao')
        .update({ observacoes: observacoesTexto.trim() || null })
        .eq('id', pedido.id);
      
      if (error) throw error;
      
      setPedido(prev => prev ? { ...prev, observacoes: observacoesTexto.trim() || null } : null);
      sonnerToast.success('Observação salva com sucesso');
    } catch (error) {
      console.error('Erro ao salvar observação:', error);
      sonnerToast.error('Erro ao salvar observação');
    } finally {
      setSalvandoObservacoes(false);
    }
  };

  const handleIniciarEdicaoProduto = (produto: any) => {
    setEditandoProduto(produto.id);
    if (produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social') {
      setEditLargura(produto.largura || 0);
      setEditAltura(produto.altura || 0);
    } else if (produto.tipo_produto === 'pintura_epoxi') {
      setEditCorId(produto.cor_id || "");
    }
  };

  const handleCancelarEdicaoProduto = () => {
    setEditandoProduto(null);
  };

  const handleSalvarProduto = async (produto: any) => {
    setSalvandoProduto(true);
    try {
      const isPorta = produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social';
      const isPintura = produto.tipo_produto === 'pintura_epoxi';

      if (isPorta) {
        const { error } = await supabase
          .from('produtos_vendas')
          .update({
            largura: editLargura,
            altura: editAltura,
            tamanho: `${editLargura}x${editAltura}`,
          })
          .eq('id', produto.id);
        if (error) throw error;
      } else if (isPintura) {
        const corSelecionada = coresAtivas.find(c => c.id === editCorId);
        const { error } = await supabase
          .from('produtos_vendas')
          .update({
            cor_id: editCorId,
            descricao: corSelecionada?.nome || produto.descricao,
          })
          .eq('id', produto.id);
        if (error) throw error;
      }

      setEditandoProduto(null);
      sonnerToast.success('Produto atualizado com sucesso');
      fetchPedidoDetails();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      sonnerToast.error('Erro ao salvar produto');
    } finally {
      setSalvandoProduto(false);
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
      navigate('/administrativo/pedidos');
    } catch (error) {
      console.error("Erro ao avançar etapa:", error);
      setMostrarModalAvancar(false);
    }
  };

  const getEtapaLabel = (etapa: string) => {
    const etapas: Record<string, string> = {
      aberto: "Aberto", aprovacao_ceo: "Aprovação CEO", em_producao: "Em Produção", inspecao_qualidade: "Inspeção de Qualidade",
      aguardando_pintura: "Aguardando Pintura", aguardando_coleta: "Expedição Coleta",
      aguardando_instalacao: "Expedição Instalação", finalizado: "Finalizado",
    };
    return etapas[etapa] || etapa;
  };

  const getEtapaBadgeColor = (etapa: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      aprovacao_ceo: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      em_producao: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      inspecao_qualidade: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      aguardando_pintura: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      aguardando_coleta: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      aguardando_instalacao: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      finalizado: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    return colors[etapa] || "";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      em_andamento: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      concluido: "bg-green-500/20 text-green-400 border-green-500/30",
      cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "";
  };

  const prepararDadosPDF = (): PedidoProducaoPDFData | null => {
    if (!pedido) return null;
    
    const observacoesData = portasEnrolar.map((porta: any, idx: number) => {
      const obs = getObservacoesPorPorta(porta._originalId, porta._indicePorta);
      const responsavel = usuarios.find((u: any) => u.id === obs?.responsavel_medidas_id);
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
      pedido: { id: pedido.id, numero_pedido: pedido.numero_pedido, etapa_atual: pedido.etapa_atual, status: pedido.status, created_at: pedido.created_at },
      cliente: pedido.venda ? { nome: pedido.venda.cliente_nome, cidade: pedido.venda.cidade, estado: pedido.venda.estado, valor_venda: pedido.venda.valor_venda, forma_pagamento: pedido.venda.forma_pagamento, tipo_entrega: pedido.venda.tipo_entrega, data_prevista_entrega: pedido.venda.data_prevista_entrega } : undefined,
      produtos: (pedido.venda?.produtos || []).map((p: any) => ({ tipo_produto: p.tipo_produto, descricao: p.descricao, tamanho: p.tamanho, cor: p.cor?.nome, quantidade: p.quantidade || 1, peso: calcularPeso(p), meiaCanas: calcularMeiaCanas(p) })),
      linhas: pedido.linhas.map((l: any) => ({ nome_produto: l.nome_produto, descricao_produto: l.descricao_produto, quantidade: l.quantidade, tamanho: l.tamanho })),
      observacoes: observacoesData,
      ordens: pedido.ordens.map((o: any) => ({ tipo: o.tipo, numero_ordem: o.numero_ordem, status: o.status })),
    };
  };

  if (loading) {
    return (
      <MinimalistLayout title="Carregando..." backPath="/fabrica/montagem-pedidos">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </MinimalistLayout>
    );
  }

  if (!pedido) {
    return (
      <MinimalistLayout title="Pedido não encontrado" backPath="/fabrica/montagem-pedidos">
        <div className="text-center py-8">
          <p className="text-white/60">Pedido não encontrado</p>
        </div>
      </MinimalistLayout>
    );
  }

  const isAberto = pedido.etapa_atual === 'aberto';
  const isAprovacaoCeo = pedido.etapa_atual === 'aprovacao_ceo';
  const isEmProducao = pedido.etapa_atual === 'em_producao';
  const podeEditarLinhas = isAberto || isAprovacaoCeo || isEmProducao;
  const podeEditarObservacoes = isAberto || isAprovacaoCeo || isEmProducao;
  const temPendentesSalvamento = linhasEditadas.size > 0;

  return (
    <MinimalistLayout 
      title={`Pedido #${pedido.numero_pedido}`}
      subtitle={`Cadastrado em ${format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}`}
      backPath="/fabrica/montagem-pedidos"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Administrativo', path: '/administrativo' },
        { label: 'Pedidos', path: '/administrativo/pedidos' },
        { label: `Pedido #${pedido.numero_pedido}` }
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          {podeEditarLinhas && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarPreenchimento(true)}
              className="text-white/70 hover:text-white hover:bg-white/10 gap-1"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Preencher</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => fetchPedidoDetails()} className="text-white/70 hover:text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Badge variant="outline" className={`${getEtapaBadgeColor(pedido.etapa_atual)} text-xs px-2 py-0.5`}>
            {getEtapaLabel(pedido.etapa_atual)}
          </Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Grid: Informações do Cliente e Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {pedido.venda && (
            <Card className="lg:col-span-2 bg-white/5 border-blue-500/10 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <User className="w-4 h-4" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-white/50">Cliente</p>
                    <p className="font-medium text-white">{pedido.venda.cliente_nome}</p>
                  </div>
                  {pedido.venda.cidade && pedido.venda.estado && (
                    <div>
                      <p className="text-xs text-white/50">Localização</p>
                      <div className="flex items-center gap-1 text-white/80">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{pedido.venda.cidade}, {pedido.venda.estado}</span>
                      </div>
                    </div>
                  )}
                  {pedido.venda.valor_venda && (
                    <div>
                      <p className="text-xs text-white/50">Valor da Venda</p>
                      <p className="font-medium text-white">R$ {Number(pedido.venda.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  {pedido.venda.forma_pagamento && (
                    <div>
                      <p className="text-xs text-white/50">Forma de Pagamento</p>
                      <p className="font-medium capitalize text-white">{pedido.venda.forma_pagamento}</p>
                    </div>
                  )}
                  {pedido.venda.tipo_entrega && (
                    <div>
                      <p className="text-xs text-white/50">Tipo de Entrega</p>
                      <p className="font-medium capitalize text-white">{pedido.venda.tipo_entrega}</p>
                    </div>
                  )}
                  {pedido.venda.data_prevista_entrega && (
                    <div>
                      <p className="text-xs text-white/50">Data Prevista</p>
                      <p className="font-medium text-white">{format(new Date(pedido.venda.data_prevista_entrega), "dd/MM/yyyy")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pedido.venda_id && (
                <Button variant="outline" className="w-full justify-start text-sm h-9 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => navigate(`/administrativo/vendas/${pedido.venda_id}`)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Venda
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start text-sm h-9 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => { const pdfData = prepararDadosPDF(); if (pdfData) baixarPedidoProducaoPDF(pdfData); }}>
                <FileDown className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm h-9 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => { const pdfData = prepararDadosPDF(); if (pdfData) imprimirPedidoProducaoPDF(pdfData); }}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir PDF
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Endereço */}
        <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4" />
                Endereço
              </CardTitle>
              {!editandoEndereco && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10" onClick={() => setEditandoEndereco(true)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editandoEndereco ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-white/50 mb-1 block">Rua</label>
                    <Input className="h-8 text-xs bg-white/5 border-white/10 text-white" value={enderecoForm.endereco_rua} onChange={e => setEnderecoForm(f => ({ ...f, endereco_rua: e.target.value }))} placeholder="Nome da rua" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Número</label>
                    <Input className="h-8 text-xs bg-white/5 border-white/10 text-white" value={enderecoForm.endereco_numero} onChange={e => setEnderecoForm(f => ({ ...f, endereco_numero: e.target.value }))} placeholder="Nº" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Bairro</label>
                    <Input className="h-8 text-xs bg-white/5 border-white/10 text-white" value={enderecoForm.endereco_bairro} onChange={e => setEnderecoForm(f => ({ ...f, endereco_bairro: e.target.value }))} placeholder="Bairro" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Cidade</label>
                    <Input className="h-8 text-xs bg-white/5 border-white/10 text-white" value={enderecoForm.endereco_cidade} onChange={e => setEnderecoForm(f => ({ ...f, endereco_cidade: e.target.value }))} placeholder="Cidade" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">UF</label>
                      <Input className="h-8 text-xs bg-white/5 border-white/10 text-white" value={enderecoForm.endereco_estado} onChange={e => setEnderecoForm(f => ({ ...f, endereco_estado: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF" maxLength={2} />
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">CEP</label>
                      <Input className="h-8 text-xs bg-white/5 border-white/10 text-white" value={enderecoForm.endereco_cep} onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                        const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
                        setEnderecoForm(f => ({ ...f, endereco_cep: formatted }));
                      }} placeholder="00000-000" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10" onClick={() => {
                    setEditandoEndereco(false);
                    if (pedido) {
                      setEnderecoForm({
                        endereco_rua: (pedido as any).endereco_rua || '',
                        endereco_numero: (pedido as any).endereco_numero || '',
                        endereco_bairro: (pedido as any).endereco_bairro || '',
                        endereco_cidade: (pedido as any).endereco_cidade || '',
                        endereco_estado: (pedido as any).endereco_estado || '',
                        endereco_cep: (pedido as any).endereco_cep || '',
                      });
                    }
                  }}>
                    <X className="w-3 h-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleSalvarEndereco} disabled={salvandoEndereco}>
                    <Save className="w-3 h-3 mr-1" />
                    {salvandoEndereco ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/80">
                {(() => {
                  const p = pedido as any;
                  const parts = [
                    p.endereco_rua && `${p.endereco_rua}${p.endereco_numero ? `, ${p.endereco_numero}` : ''}`,
                    p.endereco_bairro,
                    (p.endereco_cidade || pedido.venda?.cidade) && (p.endereco_estado || pedido.venda?.estado)
                      ? `${p.endereco_cidade || pedido.venda?.cidade}/${p.endereco_estado || pedido.venda?.estado}`
                      : p.endereco_cidade || pedido.venda?.cidade || p.endereco_estado || pedido.venda?.estado,
                    p.endereco_cep && `CEP ${p.endereco_cep}`,
                  ].filter(Boolean);
                  return parts.length > 0 ? parts.join(' - ') : <span className="text-white/40 italic">Nenhum endereço cadastrado</span>;
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {pedido.venda?.produtos && pedido.venda.produtos.length > 0 && (
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                Produtos da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden md:block overflow-x-auto">
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
                      <th className="text-center p-2 font-medium text-white/50">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.venda.produtos.map((produto: any) => {
                      const isEditing = editandoProduto === produto.id;
                      const isPintura = produto.tipo_produto === 'pintura_epoxi';

                      return (
                        <tr key={produto.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-2 text-xs text-white/80">{produto.tipo_produto || '-'}</td>
                          <td className="p-2 text-xs text-white/80">{produto.descricao || '-'}</td>
                          <td className="p-2 text-xs text-white/80">{produto.tamanho || '-'}</td>
                          <td className="p-2 text-xs text-white/80">
                            {isEditing && isPintura ? (
                              <Select value={editCorId} onValueChange={setEditCorId}>
                                <SelectTrigger className="h-7 w-32 text-xs">
                                  <SelectValue placeholder="Cor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {coresAtivas.map(cor => (
                                    <SelectItem key={cor.id} value={cor.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: cor.codigo_hex }} />
                                        {cor.nome}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              produto.cor?.nome || '-'
                            )}
                          </td>
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
                          <td className="p-2 text-center">
                            {isPintura && !isEditing && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleIniciarEdicaoProduto(produto)}>
                                <Pencil className="w-3 h-3 text-white/60" />
                              </Button>
                            )}
                            {isEditing && (
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={() => handleSalvarProduto(produto)} disabled={salvandoProduto}>
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={handleCancelarEdicaoProduto} disabled={salvandoProduto}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="md:hidden space-y-3">
                {pedido.venda.produtos.map((produto: any) => {
                  const isEditing = editandoProduto === produto.id;
                  const isPintura = produto.tipo_produto === 'pintura_epoxi';

                  return (
                    <div key={produto.id} className="p-3 border border-white/10 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-white">{produto.tipo_produto || '-'}</span>
                        <div className="flex items-center gap-2">
                          {isPintura && !isEditing && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleIniciarEdicaoProduto(produto)}>
                              <Pencil className="w-3 h-3 text-white/60" />
                            </Button>
                          )}
                          {isEditing && (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400" onClick={() => handleSalvarProduto(produto)} disabled={salvandoProduto}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={handleCancelarEdicaoProduto} disabled={salvandoProduto}>
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Badge variant="secondary" className="text-xs bg-white/10 text-white">{produto.quantidade}x</Badge>
                        </div>
                      </div>
                      {produto.descricao && <p className="text-xs text-white/50">{produto.descricao}</p>}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/50">Tamanho: </span>
                          <span className="font-medium text-white/80">{produto.tamanho || '-'}</span>
                        </div>
                        <div>
                          <span className="text-white/50">Cor: </span>
                          {isEditing && isPintura ? (
                            <Select value={editCorId} onValueChange={setEditCorId}>
                              <SelectTrigger className="h-7 text-xs mt-1">
                                <SelectValue placeholder="Cor" />
                              </SelectTrigger>
                              <SelectContent>
                                {coresAtivas.map(cor => (
                                  <SelectItem key={cor.id} value={cor.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: cor.codigo_hex }} />
                                      {cor.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="font-medium text-white/80">{produto.cor?.nome || '-'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observação da Venda */}
        {pedido.venda?.observacoes_venda && (
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <FileText className="w-4 h-4" />
                Observação da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 whitespace-pre-wrap bg-white/5 p-3 rounded-md">
                {pedido.venda.observacoes_venda}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Medidas das Portas de Enrolar */}
        {pedido.venda?.produtos && pedido.venda.produtos.some((p: any) => p.tipo_produto === 'porta_enrolar') && (
          <MedidasPortasSection
            produtos={pedido.venda.produtos}
            onRefresh={fetchPedidoDetails}
          />
        )}

        {/* Itens do Pedido */}
        <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                Itens do Pedido {pedido.linhas.length > 0 && `(${pedido.linhas.length})`}
              </CardTitle>
              {podeEditarLinhas && temPendentesSalvamento && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setLinhasEditadas(new Map())} className="text-white/70 hover:text-white hover:bg-white/10">Cancelar</Button>
                  <Button variant="default" size="sm" onClick={handleSalvarAlteracoes} disabled={salvando}>
                    {salvando ? <><RefreshCw className="w-3 h-3 mr-2 animate-spin" />Salvando...</> : <><Save className="w-3 h-3 mr-2" />Salvar</>}
                  </Button>
                </div>
              )}
            </div>
            {isEmProducao && podeEditarLinhas && (
              <div className="mt-3 p-2 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <p className="text-xs text-orange-300">
                  Alterações serão propagadas para as ordens de produção e linhas já concluídas serão desmarcadas.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <PedidoLinhasEditor
              linhas={pedido.linhas}
              isReadOnly={!podeEditarLinhas}
              vendaId={pedido.venda_id}
              temPortasEnrolar={portasEnrolar.length > 0}
              onAdicionarLinha={adicionarLinha}
              onRemoverLinha={removerLinha}
              onAtualizarLinha={(linhaId: string, campo: 'quantidade' | 'tamanho', valor: number | string) => {
                setLinhasEditadas(prev => {
                  const novoMapa = new Map(prev);
                  const linhaExistente = novoMapa.get(linhaId) || { id: linhaId };
                  novoMapa.set(linhaId, { ...linhaExistente, [campo]: valor });
                  return novoMapa;
                });
              }}
              onAtualizarLinhaCompleta={async (linhaId, dados) => { await atualizarLinha({ id: linhaId, ...dados }); }}
            />
          </CardContent>
        </Card>

        {/* Observações da Visita Técnica */}
        {portasEnrolar.length > 0 && (
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <FileText className="w-4 h-4" />
                Observações da visita técnica ({portasEnrolar.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pastaObsAberta ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {portasEnrolar.map((porta: any, idx: number) => {
                    const obs = getObservacoesPorPorta(porta._originalId, porta._indicePorta);
                    const preenchido = !!obs?.responsavel_medidas_id;
                    const dimensoes = porta.largura && porta.altura
                      ? `${porta.largura.toFixed(2)}m × ${porta.altura.toFixed(2)}m`
                      : porta.tamanho || undefined;
                    return (
                      <PortaFolderCard
                        key={porta._virtualKey}
                        label={getLabelProdutoExpandido(idx, porta.tipo_produto, null, null, porta._totalNoGrupo, porta._indicePorta)}
                        dimensoes={dimensoes}
                        statusBadge={preenchido ? 'Preenchido' : 'Pendente'}
                        statusVariant={preenchido ? 'default' : 'outline'}
                        isOpen={false}
                        onClick={() => setPastaObsAberta(porta._virtualKey)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-3 text-muted-foreground"
                    onClick={() => setPastaObsAberta(null)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar às pastas
                  </Button>
                  {portasEnrolar.map((porta: any, idx: number) =>
                    porta._virtualKey === pastaObsAberta ? (
                      <ObservacoesPortaForm
                        key={porta._virtualKey}
                        porta={porta}
                        portaIndex={idx}
                        usuarios={usuarios}
                        autorizados={autorizados}
                        valoresIniciais={getObservacoesPorPorta(porta._originalId, porta._indicePorta)}
                        onSalvar={salvarObservacao}
                        pedidoId={id || ''}
                        defaultOpen={true}
                        isReadOnly={!podeEditarObservacoes}
                      />
                    ) : null
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Especificações Porta Social */}
        {portasSocial.length > 0 && (
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                Especificações Porta Social ({portasSocial.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pastaSocialAberta ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {portasSocial.map((porta: any, idx: number) => {
                    const obs = getObservacoesSocialPorPorta(porta._originalId, porta._indicePorta);
                    const preenchido = !!(obs?.lado_fechadura || obs?.lado_abertura || obs?.acabamento);
                    const dimensoes = porta.largura && porta.altura
                      ? `${porta.largura.toFixed(2)}m × ${porta.altura.toFixed(2)}m`
                      : porta.tamanho || undefined;
                    return (
                      <PortaFolderCard
                        key={porta._virtualKey}
                        label={getLabelProdutoExpandido(idx, porta.tipo_produto, null, null, porta._totalNoGrupo, porta._indicePorta)}
                        dimensoes={dimensoes}
                        statusBadge={preenchido ? 'Preenchido' : 'Pendente'}
                        statusVariant={preenchido ? 'default' : 'outline'}
                        isOpen={false}
                        onClick={() => setPastaSocialAberta(porta._virtualKey)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-3 text-muted-foreground"
                    onClick={() => setPastaSocialAberta(null)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar às pastas
                  </Button>
                  {portasSocial.map((porta: any, idx: number) =>
                    porta._virtualKey === pastaSocialAberta ? (
                      <ObservacoesPortaSocialForm
                        key={porta._virtualKey}
                        porta={porta}
                        portaIndex={idx}
                        valoresIniciais={getObservacoesSocialPorPorta(porta._originalId, porta._indicePorta)}
                        onSalvar={salvarObservacaoSocial}
                        pedidoId={id || ''}
                        defaultOpen={true}
                        isReadOnly={!podeEditarObservacoes}
                      />
                    ) : null
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Observações da Venda */}
        {pedido.venda?.observacoes_venda && (
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <FileText className="w-4 h-4" />
                Observações da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{pedido.venda.observacoes_venda}</p>
            </CardContent>
          </Card>
        )}

        {/* Observações do Pedido */}
        <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
              <MessageSquare className="w-4 h-4" />
              Observações do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder="Adicione observações sobre este pedido..."
                value={observacoesTexto}
                onChange={(e) => setObservacoesTexto(e.target.value)}
                className="min-h-[100px] bg-white/5 border-blue-500/10 text-white placeholder:text-white/40 resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSalvarObservacoes}
                  disabled={salvandoObservacoes || observacoesTexto === (pedido.observacoes || "")}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {salvandoObservacoes ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Observação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ficha de Visita Técnica */}
        <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
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
              onFichaChange={async (url, nome) => {
                const { error } = await supabase.from('pedidos_producao').update({ ficha_visita_url: url, ficha_visita_nome: nome }).eq('id', pedido.id);
                if (error) { sonnerToast.error('Erro ao salvar ficha de visita'); return; }
                setPedido(prev => prev ? { ...prev, ficha_visita_url: url, ficha_visita_nome: nome } : null);
                sonnerToast.success('Ficha de visita anexada com sucesso');
              }}
              onFichaRemove={async () => {
                if (pedido.ficha_visita_url) {
                  const urlParts = pedido.ficha_visita_url.split('/');
                  const fileName = urlParts[urlParts.length - 1];
                  await supabase.storage.from('fichas-visita-tecnica').remove([fileName]);
                }
                const { error } = await supabase.from('pedidos_producao').update({ ficha_visita_url: null, ficha_visita_nome: null }).eq('id', pedido.id);
                if (error) { sonnerToast.error('Erro ao remover ficha de visita'); return; }
                setPedido(prev => prev ? { ...prev, ficha_visita_url: null, ficha_visita_nome: null } : null);
                sonnerToast.success('Ficha de visita removida');
              }}
            />
          </CardContent>
        </Card>

        {/* Histórico de Movimentações */}
        <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-white">
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
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <Hammer className="w-4 h-4" />
                Ordens de Produção ({pedido.ordens.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-xs">
                      <th className="text-left p-2 font-medium text-white/50">Tipo</th>
                      <th className="text-left p-2 font-medium text-white/50">Número</th>
                      <th className="text-left p-2 font-medium text-white/50">Status</th>
                      <th className="text-left p-2 font-medium text-white/50">Capturado por</th>
                      <th className="text-left p-2 font-medium text-white/50">Concluído por</th>
                      <th className="text-left p-2 font-medium text-white/50">Data Conclusão</th>
                      <th className="text-right p-2 font-medium text-white/50">Tempo Produção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.ordens.map((ordem) => (
                      <tr key={ordem.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {ordem.tipo === 'Perfiladeira' && <Hammer className="w-3 h-3 text-white/50" />}
                            {ordem.tipo === 'Separação' && <Package className="w-3 h-3 text-white/50" />}
                            {ordem.tipo === 'Soldagem' && <Hammer className="w-3 h-3 text-white/50" />}
                            {ordem.tipo === 'Pintura' && <Paintbrush className="w-3 h-3 text-white/50" />}
                            {ordem.tipo === 'Qualidade' && <CheckCircle2 className="w-3 h-3 text-white/50" />}
                            {ordem.tipo === 'Instalação' && <Truck className="w-3 h-3 text-white/50" />}
                            <span className="text-sm font-medium text-white">{ordem.tipo}</span>
                          </div>
                        </td>
                        <td className="p-2 text-sm text-white/50">{ordem.numero_ordem !== "N/A" ? `#${ordem.numero_ordem}` : '-'}</td>
                        <td className="p-2">
                          {ordem.status !== "N/A" ? (
                            <Badge variant="outline" className={`${getStatusBadgeColor(ordem.status)} text-xs`}>
                              {ordem.status === "aberto" && "Aberto"}
                              {ordem.status === "em_andamento" && "Em Andamento"}
                              {ordem.status === "concluido" && "Concluído"}
                              {ordem.status === "cancelado" && "Cancelado"}
                            </Badge>
                          ) : <span className="text-xs text-white/50">-</span>}
                        </td>
                        <td className="p-2">
                          {ordem.capturado_por ? (
                            <div className="flex items-center gap-2">
                              {ordem.capturado_por.foto_perfil_url ? (
                                <img src={ordem.capturado_por.foto_perfil_url} alt={ordem.capturado_por.nome} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><User className="w-3 h-3 text-white/50" /></div>
                              )}
                              <span className="text-xs text-white/80">{ordem.capturado_por.nome}</span>
                            </div>
                          ) : <span className="text-xs text-white/50">-</span>}
                        </td>
                        <td className="p-2">
                          {ordem.concluido_por ? (
                            <div className="flex items-center gap-2">
                              {ordem.concluido_por.foto_perfil_url ? (
                                <img src={ordem.concluido_por.foto_perfil_url} alt={ordem.concluido_por.nome} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><User className="w-3 h-3 text-white/50" /></div>
                              )}
                              <span className="text-xs text-white/80">{ordem.concluido_por.nome}</span>
                            </div>
                          ) : <span className="text-xs text-white/50">-</span>}
                        </td>
                        <td className="p-2">
                          {ordem.data_conclusao ? (
                            <span className="text-xs text-white/80">{format(new Date(ordem.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                          ) : <span className="text-xs text-white/50">-</span>}
                        </td>
                        <td className="p-2 text-right">
                          {ordem.tempo_conclusao_segundos ? (
                            <span className="text-xs font-medium text-white">{Math.floor(ordem.tempo_conclusao_segundos / 3600)}h {Math.floor((ordem.tempo_conclusao_segundos % 3600) / 60)}min</span>
                          ) : <span className="text-xs text-white/50">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="md:hidden space-y-3">
                {pedido.ordens.map((ordem) => (
                  <div key={ordem.id} className="p-3 border border-white/10 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ordem.tipo === 'Perfiladeira' && <Hammer className="w-4 h-4 text-white/50" />}
                        {ordem.tipo === 'Separação' && <Package className="w-4 h-4 text-white/50" />}
                        {ordem.tipo === 'Soldagem' && <Hammer className="w-4 h-4 text-white/50" />}
                        {ordem.tipo === 'Pintura' && <Paintbrush className="w-4 h-4 text-white/50" />}
                        {ordem.tipo === 'Qualidade' && <CheckCircle2 className="w-4 h-4 text-white/50" />}
                        {ordem.tipo === 'Instalação' && <Truck className="w-4 h-4 text-white/50" />}
                        <span className="font-medium text-sm text-white">{ordem.tipo}</span>
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
                    <div className="text-xs text-white/50">{ordem.numero_ordem !== "N/A" ? `#${ordem.numero_ordem}` : '-'}</div>
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
              <DialogDescription>As alterações foram salvas com sucesso. Deseja avançar o pedido para a etapa de produção?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setMostrarModalAvancar(false); }}>Não, continuar editando</Button>
              <Button onClick={handleAvancarEtapa}>Sim, avançar para produção</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Preenchimento Paralelo */}
        <PreenchimentoParaleloModal
          open={mostrarPreenchimento}
          onOpenChange={setMostrarPreenchimento}
          pedidoId={id || ''}
          vendaId={pedido.venda_id}
          produtos={pedido.venda?.produtos || []}
          linhas={pedido.linhas}
          portasEnrolar={portasEnrolar}
          portasSocial={portasSocial}
          observacoesTexto={observacoesTexto}
          observacoesPedido={pedido.observacoes || null}
          onAdicionarLinha={adicionarLinha}
          onRemoverLinha={removerLinha}
          onAtualizarLinha={(linhaId, campo, valor) => {
            setLinhasEditadas(prev => {
              const novoMapa = new Map(prev);
              const linhaExistente = novoMapa.get(linhaId) || { id: linhaId };
              novoMapa.set(linhaId, { ...linhaExistente, [campo]: valor });
              return novoMapa;
            });
          }}
          onAtualizarLinhaCompleta={async (linhaId, dados) => { await atualizarLinha({ id: linhaId, ...dados }); }}
          onRefresh={fetchPedidoDetails}
          usuarios={usuarios}
          autorizados={autorizados}
          getObservacoesPorPorta={getObservacoesPorPorta}
          getObservacoesSocialPorPorta={getObservacoesSocialPorPorta}
          salvarObservacao={salvarObservacao}
          salvarObservacaoSocial={salvarObservacaoSocial}
          onSalvarObservacoes={async (texto) => {
            const { error } = await supabase
              .from('pedidos_producao')
              .update({ observacoes: texto.trim() || null })
              .eq('id', pedido.id);
            if (error) throw error;
            setPedido(prev => prev ? { ...prev, observacoes: texto.trim() || null } : null);
            setObservacoesTexto(texto);
            sonnerToast.success('Observação salva com sucesso');
          }}
        />
      </div>
    </MinimalistLayout>
  );
}
