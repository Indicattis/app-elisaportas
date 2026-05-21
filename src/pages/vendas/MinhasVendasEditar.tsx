import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanEditVenda } from "@/hooks/useCanEditVenda";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar as CalendarIcon, User, MapPin, CreditCard, Truck, MessageSquare, Store, Percent, Save, Loader2, Paperclip, FileText, ExternalLink, CheckCircle, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ComprovanteUploadModal } from "@/components/vendas/ComprovanteUploadModal";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { useProdutosVenda } from "@/hooks/useProdutosVenda";
import { ProdutoVendaForm } from "@/components/vendas/ProdutoVendaForm";
import { SelecionarAcessoriosModal } from "@/components/vendas/SelecionarAcessoriosModal";
import { DescontoVendaModal } from "@/components/vendas/DescontoVendaModal";
import { CreditoVendaModal } from "@/components/vendas/CreditoVendaModal";
import { ProdutosVendaTable } from "@/components/vendas/ProdutosVendaTable";
import { VendaResumo } from "@/components/vendas/VendaResumo";
import { PinturaItemCatalogoModal } from "@/components/vendas/PinturaItemCatalogoModal";
import { PinturaRapidaModal } from "@/components/vendas/PinturaRapidaModal";
import type { ProdutoVenda } from "@/hooks/useVendas";
import { useCanaisAquisicao } from "@/hooks/useCanaisAquisicao";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { VendaBloqueadaDialog } from "@/components/vendas/VendaBloqueadaDialog";
import { validarDesconto, getTipoAutorizacaoNecessaria } from "@/utils/descontoVendasRules";
import { useConfiguracoesVendasPublicas } from "@/hooks/useConfiguracoesVendasPublicas";
import { AutorizacaoDescontoModal } from "@/components/vendas/AutorizacaoDescontoModal";

export default function MinhasVendasEditar() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Tables<"vendas"> | null>(null);
  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [tipoInicial, setTipoInicial] = useState<'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao'>('porta_enrolar');
  const [permitirTrocaTipo, setPermitirTrocaTipo] = useState(true);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [descontoModalOpen, setDescontoModalOpen] = useState(false);
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const [pinturaItemModalOpen, setPinturaItemModalOpen] = useState(false);
  const [pinturaRapidaOpen, setPinturaRapidaOpen] = useState(false);
  const [portaRecemAdicionada, setPortaRecemAdicionada] = useState<{ largura: number; altura: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [isSavingObservacoes, setIsSavingObservacoes] = useState(false);
  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteEdit, setClienteEdit] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    cliente_email: "",
    cpf_cliente: "",
    estado: "",
    cidade: "",
    bairro: "",
    cep: "",
  });
  const [isSavingCliente, setIsSavingCliente] = useState(false);
  const { produtos, isLoading: isLoadingProdutos, addProduto, deleteProduto, updateProduto } = useProdutosVenda(id);
  const { canais } = useCanaisAquisicao();

  const { user, isAdmin } = useAuth();
  const { canEdit, loading: loadingPermission, isFaturada, hasPedido, pedidoId, blockReason } = useCanEditVenda({
    atendenteId: venda?.atendente_id,
    vendaId: id,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCadastrando, setIsCadastrando] = useState(false);
  const { configuracoesPublicas, limites: limitesConfig } = useConfiguracoesVendasPublicas();
  const [autorizacaoDescontoOpen, setAutorizacaoDescontoOpen] = useState(false);
  const [tipoAutorizacaoNecessaria, setTipoAutorizacaoNecessaria] = useState<'responsavel_setor' | 'master' | null>(null);
  const [autorizacaoPendente, setAutorizacaoPendente] = useState<{
    autorizadoPor: string;
    senhaUsada: string;
    percentualDesconto: number;
    tipo: 'responsavel_setor' | 'master';
  } | null>(null);
  const [percentualDescontoAtual, setPercentualDescontoAtual] = useState(0);
  const [limitePermitidoAtual, setLimitePermitidoAtual] = useState(0);

  // Se não pode editar, mostrar dialog
  useEffect(() => {
    if (!loadingPermission && !canEdit && blockReason) {
      setShowBlockedDialog(true);
    }
  }, [loadingPermission, canEdit, blockReason]);

  const handleBlockedDialogClose = (open: boolean) => {
    setShowBlockedDialog(open);
    if (!open) {
      navigate('/vendas/minhas-vendas');
    }
  };

  useEffect(() => {
    if (id) {
      fetchVenda();
    }
  }, [id]);

  const fetchVenda = async () => {
    if (!id) return;
    
    try {
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .select("*")
        .eq("id", id)
        .single();

      if (vendaError) throw vendaError;
      
      setVenda(vendaData);
      setObservacoes(vendaData.observacoes_venda || "");
    } catch (error) {
      console.error("Erro ao buscar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados da venda",
      });
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "R$ 0,00";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const getPublicoAlvoLabel = (value: string | null | undefined) => {
    const labels: Record<string, string> = {
      'cliente_final': 'Cliente Final',
      'serralheiro': 'Serralheiro',
      'empresa': 'Empresa',
    };
    return value ? labels[value] || value : "-";
  };

  const getTipoEntregaLabel = (value: string | null | undefined) => {
    const labels: Record<string, string> = {
      'instalacao': 'Instalação',
      'retirada': 'Retirada',
      'entrega': 'Entrega',
      'correcao': 'Correção',
      'servico': 'Serviço',
    };
    return value ? labels[value] || value : "-";
  };

  const getCanalNome = (canalId: string | null | undefined) => {
    if (!canalId) return "-";
    const canal = canais.find(c => c.id === canalId);
    return canal?.nome || "-";
  };

  const produtosFormatados: ProdutoVenda[] = (produtos || []).map(p => ({
    tipo_produto: p.tipo_produto as 'porta' | 'acessorio' | 'adicional',
    tamanho: p.tamanho || '',
    largura: p.largura || undefined,
    altura: p.altura || undefined,
    cor_id: p.cor_id || '',
    acessorio_id: p.acessorio_id || '',
    adicional_id: p.adicional_id || '',
    valor_produto: p.valor_produto,
    valor_pintura: p.valor_pintura,
    valor_instalacao: p.valor_instalacao,
    valor_frete: p.valor_frete,
    tipo_desconto: p.tipo_desconto as 'percentual' | 'valor',
    desconto_percentual: p.desconto_percentual,
    desconto_valor: p.desconto_valor,
    quantidade: p.quantidade,
    descricao: p.descricao || '',
    unidade: (p as any).unidade || 'Unitário'
  }));

  const calcularValorTotalProdutos = () => {
    return produtosFormatados.reduce((acc, p) => {
      const valorBase = (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1);
      const desconto = p.tipo_desconto === 'valor' ? (p.desconto_valor || 0) : valorBase * ((p.desconto_percentual || 0) / 100);
      return acc + valorBase - desconto;
    }, 0);
  };

  const temDesconto = produtosFormatados.some(p => (p.desconto_valor || 0) > 0 || (p.desconto_percentual || 0) > 0);
  const valorCreditoAtual = venda?.valor_credito || 0;
  const percentualCreditoAtual = venda?.percentual_credito || 0;

  const handleAplicarDesconto = async (produtosAtualizados: ProdutoVenda[]) => {
    if (!id || !produtos) return;
    
    setIsSaving(true);
    try {
      for (let i = 0; i < produtosAtualizados.length; i++) {
        const produtoOriginal = produtos[i];
        const produtoAtualizado = produtosAtualizados[i];
        
        if (produtoOriginal?.id) {
          await updateProduto({
            produtoId: produtoOriginal.id,
            updates: {
              tipo_desconto: produtoAtualizado.tipo_desconto,
              desconto_percentual: produtoAtualizado.desconto_percentual,
              desconto_valor: produtoAtualizado.desconto_valor
            }
          });
        }
      }
      
      await supabase
        .from('vendas')
        .update({ valor_credito: 0, percentual_credito: 0 })
        .eq('id', id);
      
      setVenda(prev => prev ? { ...prev, valor_credito: 0, percentual_credito: 0 } : null);
      
      toast({
        title: "Desconto aplicado",
        description: "Os descontos foram aplicados aos produtos"
      });
      
      setDescontoModalOpen(false);
    } catch (error) {
      console.error('Erro ao aplicar desconto:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível aplicar o desconto"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAplicarCredito = async (novoValorCredito: number, novoPercentualCredito: number) => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      await supabase
        .from('vendas')
        .update({ 
          valor_credito: novoValorCredito, 
          percentual_credito: novoPercentualCredito 
        })
        .eq('id', id);
      
      setVenda(prev => prev ? { ...prev, valor_credito: novoValorCredito, percentual_credito: novoPercentualCredito } : null);
      
      toast({
        title: "Crédito aplicado",
        description: `Crédito de R$ ${novoValorCredito.toFixed(2)} aplicado com sucesso`
      });
      
      setCreditoModalOpen(false);
    } catch (error) {
      console.error('Erro ao aplicar crédito:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível aplicar o crédito"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoverDesconto = async (index: number) => {
    const produto = produtos?.[index];
    if (!produto?.id) return;
    
    try {
      await updateProduto({
        produtoId: produto.id,
        updates: {
          tipo_desconto: 'percentual',
          desconto_percentual: 0,
          desconto_valor: 0
        }
      });
      
      toast({
        title: "Desconto removido",
        description: "O desconto foi removido do produto"
      });
    } catch (error) {
      console.error('Erro ao remover desconto:', error);
    }
  };

  const handleRemoverCredito = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      await supabase
        .from('vendas')
        .update({ valor_credito: 0, percentual_credito: 0 })
        .eq('id', id);
      
      setVenda(prev => prev ? { ...prev, valor_credito: 0, percentual_credito: 0 } : null);
      
      toast({
        title: "Crédito removido",
        description: "O crédito foi removido da venda"
      });
    } catch (error) {
      console.error('Erro ao remover crédito:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o crédito"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateQuantidade = async (index: number, quantidade: number) => {
    const produto = produtos?.[index];
    if (!produto?.id) return;
    
    try {
      await updateProduto({
        produtoId: produto.id,
        updates: { quantidade }
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
    }
  };

  const ProductButton = ({ 
    label, 
    onClick 
  }: { 
    label: string; 
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 h-10 px-4 rounded-lg
                 bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/25 text-blue-200
                 hover:from-blue-500/20 hover:to-blue-600/10 hover:text-white hover:border-blue-400/40 
                 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
    >
      <Plus className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  const handleSalvarObservacoes = async () => {
    if (!id) return;
    
    setIsSavingObservacoes(true);
    try {
      await supabase
        .from('vendas')
        .update({ observacoes_venda: observacoes })
        .eq('id', id);
      
      setVenda(prev => prev ? { ...prev, observacoes_venda: observacoes } : null);
      
      toast({
        title: "Observações salvas",
        description: "As observações foram atualizadas com sucesso"
      });
    } catch (error) {
      console.error('Erro ao salvar observações:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as observações"
      });
    } finally {
      setIsSavingObservacoes(false);
    }
  };

  const handleIniciarEdicaoCliente = () => {
    if (!venda) return;
    setClienteEdit({
      cliente_nome: venda.cliente_nome || "",
      cliente_telefone: venda.cliente_telefone || "",
      cliente_email: venda.cliente_email || "",
      cpf_cliente: venda.cpf_cliente || "",
      estado: venda.estado || "",
      cidade: venda.cidade || "",
      bairro: venda.bairro || "",
      cep: venda.cep || "",
    });
    setEditandoCliente(true);
  };

  const handleSalvarCliente = async () => {
    if (!id) return;
    setIsSavingCliente(true);
    try {
      const { error } = await supabase
        .from('vendas')
        .update({
          cliente_nome: clienteEdit.cliente_nome,
          cliente_telefone: clienteEdit.cliente_telefone,
          cliente_email: clienteEdit.cliente_email || null,
          cpf_cliente: clienteEdit.cpf_cliente || null,
          estado: clienteEdit.estado || null,
          cidade: clienteEdit.cidade || null,
          bairro: clienteEdit.bairro || null,
          cep: clienteEdit.cep || null,
        })
        .eq('id', id);
      if (error) throw error;
      setVenda(prev => prev ? {
        ...prev,
        cliente_nome: clienteEdit.cliente_nome,
        cliente_telefone: clienteEdit.cliente_telefone,
        cliente_email: clienteEdit.cliente_email || null,
        cpf_cliente: clienteEdit.cpf_cliente || null,
        estado: clienteEdit.estado || null,
        cidade: clienteEdit.cidade || null,
        bairro: clienteEdit.bairro || null,
        cep: clienteEdit.cep || null,
      } : null);
      setEditandoCliente(false);
      toast({ title: "Dados do cliente atualizados" });
    } catch (error) {
      console.error('Erro ao salvar dados do cliente:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar os dados do cliente" });
    } finally {
      setIsSavingCliente(false);
    }
  };

  const handleSalvar = () => {
    toast({
      title: "Alterações salvas",
      description: "As alterações foram salvas automaticamente"
    });
    navigate('/vendas/minhas-vendas');
  };

  const handleCadastrarVenda = async (
    autorizacaoOverride?: typeof autorizacaoPendente,
  ) => {
    if (!id || !venda) return;

    const autorizacaoParaUsar = autorizacaoOverride ?? autorizacaoPendente;

    // Validações obrigatórias
    const erros: string[] = [];
    if (!venda.estado) erros.push("Estado");
    if (!venda.cidade) erros.push("Cidade");
    if (!venda.cep) erros.push("CEP");
    if (!venda.bairro) erros.push("Bairro");
    
    if (erros.length > 0) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios faltando",
        description: `Preencha: ${erros.join(", ")}`,
      });
      return;
    }

    if (!produtosFormatados || produtosFormatados.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum produto",
        description: "Adicione pelo menos um produto à venda",
      });
      return;
    }

    // Validação de desconto
    if (!autorizacaoParaUsar) {
      const configLimites = configuracoesPublicas ? {
        avista: configuracoesPublicas.limite_desconto_avista,
        presencial: configuracoesPublicas.limite_desconto_presencial,
        adicionalResponsavel: configuracoesPublicas.limite_adicional_responsavel,
      } : undefined;

      const validacao = validarDesconto(
        produtosFormatados,
        venda.forma_pagamento || '',
        venda.venda_presencial || false,
        configLimites
      );

      const tipoAutorizacao = getTipoAutorizacaoNecessaria(validacao);

      if (tipoAutorizacao) {
        setPercentualDescontoAtual(validacao.percentualDesconto);
        setLimitePermitidoAtual(validacao.limitePermitido);
        setTipoAutorizacaoNecessaria(tipoAutorizacao);
        setAutorizacaoDescontoOpen(true);
        return;
      }
    }

    setIsCadastrando(true);
    try {
      const valorProdutos = calcularValorTotalProdutos();
      const valorFrete = venda.valor_frete || 0;
      const valorCredito = venda.valor_credito || 0;
      const valorVenda = valorProdutos + valorFrete + valorCredito;
      const valorAReceber = valorVenda;

      const { data, error } = await supabase
        .from('vendas')
        .update({
          is_rascunho: false,
          valor_venda: valorVenda,
          valor_a_receber: valorAReceber,
        })
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Não foi possível registrar a venda. Verifique suas permissões.');

      // Persistir auditoria de autorização de desconto, se houver
      if (autorizacaoParaUsar && user) {
        const { error: autErr } = await supabase
          .from('vendas_autorizacoes_desconto')
          .insert({
            venda_id: id,
            autorizado_por: autorizacaoParaUsar.autorizadoPor,
            solicitado_por: user.id,
            percentual_desconto: autorizacaoParaUsar.percentualDesconto,
            senha_usada: autorizacaoParaUsar.senhaUsada,
            tipo_autorizacao: autorizacaoParaUsar.tipo,
          } as any);
        if (autErr) {
          console.error('Erro ao registrar autorização de desconto:', autErr);
        }
        setAutorizacaoPendente(null);
      }

      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['rascunhos-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-vendas'] });

      toast({
        title: "Venda cadastrada!",
        description: "O rascunho foi convertido em venda com sucesso.",
      });
      navigate('/vendas/minhas-vendas');
    } catch (error) {
      console.error('Erro ao cadastrar venda:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cadastrar a venda",
      });
    } finally {
      setIsCadastrando(false);
    }
  };

  // Estilos azuis consistentes com a área de vendas
  const cardClass = "bg-gradient-to-br from-blue-500/5 to-blue-900/10 border-blue-500/20 backdrop-blur-xl";

  if (!canEdit && !loadingPermission) {
    return (
      <MinimalistLayout 
        title="Editar Venda" 
        backPath="/vendas/minhas-vendas"
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Vendas", path: "/vendas" },
          { label: "Minhas Vendas", path: "/vendas/minhas-vendas" },
          { label: "Editar" }
        ]}
      >
        <VendaBloqueadaDialog
          open={showBlockedDialog}
          onOpenChange={handleBlockedDialogClose}
          blockReason={blockReason}
          pedidoId={pedidoId}
        />
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-white">Acesso Negado</CardTitle>
            <CardDescription className="text-blue-300/60">
              {isFaturada 
                ? "Esta venda já foi totalmente faturada e não pode mais ser editada por atendentes."
                : hasPedido
                  ? "Esta venda possui um pedido de produção vinculado e não pode ser editada."
                  : "Você não tem permissão para editar esta venda."}
            </CardDescription>
          </CardHeader>
        </Card>
      </MinimalistLayout>
    );
  }

  if (!venda) {
    return (
      <MinimalistLayout 
        title="Editar Venda" 
        backPath="/vendas/minhas-vendas"
        breadcrumbItems={[
          { label: "Home", path: "/home" },
          { label: "Vendas", path: "/vendas" },
          { label: "Minhas Vendas", path: "/vendas/minhas-vendas" },
          { label: "Editar" }
        ]}
      >
        <Card className={cardClass}>
          <CardContent className="py-8 text-center text-blue-300/60">
            Carregando dados da venda...
          </CardContent>
        </Card>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout 
      title="Editar Venda" 
      subtitle="Gerencie os produtos desta venda" 
      backPath="/vendas/minhas-vendas"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Minhas Vendas", path: "/vendas/minhas-vendas" },
        { label: "Editar" }
      ]}
    >
      <VendaBloqueadaDialog
        open={showBlockedDialog}
        onOpenChange={handleBlockedDialogClose}
        blockReason={blockReason}
        pedidoId={pedidoId}
      />

      <div className="space-y-6">
        {/* Dados da Venda - Somente Visualização */}
        <Card className={cardClass}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Dados da Venda</CardTitle>
                <CardDescription className="text-blue-300/60">
                  {editandoCliente ? "Editando dados do cliente" : "Informações da venda"}
                </CardDescription>
              </div>
              {venda.is_rascunho && !editandoCliente && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleIniciarEdicaoCliente}
                  className="border-blue-500/30 text-blue-200 hover:bg-blue-500/20"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar Cliente
                </Button>
              )}
              {editandoCliente && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditandoCliente(false)}
                    className="border-blue-500/30 text-blue-200 hover:bg-blue-500/20"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarCliente}
                    disabled={isSavingCliente}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSavingCliente ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Cliente */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                {editandoCliente ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do cliente"
                      value={clienteEdit.cliente_nome}
                      onChange={e => setClienteEdit(prev => ({ ...prev, cliente_nome: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                    <Input
                      placeholder="Telefone"
                      value={clienteEdit.cliente_telefone}
                      onChange={e => setClienteEdit(prev => ({ ...prev, cliente_telefone: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                    <Input
                      placeholder="Email"
                      value={clienteEdit.cliente_email}
                      onChange={e => setClienteEdit(prev => ({ ...prev, cliente_email: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                    <Input
                      placeholder="CPF"
                      value={clienteEdit.cpf_cliente}
                      onChange={e => setClienteEdit(prev => ({ ...prev, cpf_cliente: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-white">{venda.cliente_nome || "-"}</p>
                    <p className="text-sm text-blue-300/60">{venda.cliente_telefone || "-"}</p>
                    {venda.cliente_email && (
                      <p className="text-sm text-blue-300/60">{venda.cliente_email}</p>
                    )}
                    {venda.cpf_cliente && (
                      <p className="text-sm text-blue-300/60">CPF: {venda.cpf_cliente}</p>
                    )}
                  </>
                )}
              </div>

              {/* Data e Público */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  <CalendarIcon className="h-4 w-4" />
                  Data da Venda
                </div>
                <p className="font-medium text-white">{formatDate(venda.data_venda)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-500/30">
                    {getPublicoAlvoLabel(venda.publico_alvo)}
                  </Badge>
                  {venda.venda_presencial && (
                    <Badge variant="outline" className="flex items-center gap-1 border-blue-500/30 text-blue-200">
                      <Store className="h-3 w-3" />
                      Presencial
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pagamento */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  <CreditCard className="h-4 w-4" />
                  Pagamento
                </div>
                <p className="font-medium text-white">{venda.forma_pagamento || "-"}</p>
                {venda.valor_entrada != null && venda.valor_entrada > 0 && (
                  <p className="text-sm text-blue-300/60">
                    Entrada: {formatCurrency(venda.valor_entrada)}
                  </p>
                )}
                {venda.numero_parcelas && (
                  <p className="text-sm text-blue-300/60">
                    {venda.numero_parcelas}x parcelas
                  </p>
                )}
              </div>

              {/* Entrega */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  <Truck className="h-4 w-4" />
                  Entrega
                </div>
                <p className="font-medium text-white">{getTipoEntregaLabel(venda.tipo_entrega)}</p>
                {venda.valor_frete != null && venda.valor_frete > 0 && (
                  <p className="text-sm text-blue-300/60">
                    Frete: {formatCurrency(venda.valor_frete)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal h-8 text-sm",
                          !venda.data_prevista_entrega && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {venda.data_prevista_entrega
                          ? `Previsão: ${formatDateOnly(venda.data_prevista_entrega)}`
                          : "Definir data de entrega"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={venda.data_prevista_entrega ? new Date(venda.data_prevista_entrega + 'T12:00:00') : undefined}
                        onSelect={async (date) => {
                          if (!date || !id) return;
                          const formatted = format(date, 'yyyy-MM-dd') + 'T12:00:00.000Z';
                          const { error } = await supabase
                            .from('vendas')
                            .update({ data_prevista_entrega: formatted })
                            .eq('id', id);
                          if (error) {
                            toast({ title: "Erro ao atualizar data", description: error.message, variant: "destructive" });
                          } else {
                            setVenda(prev => prev ? { ...prev, data_prevista_entrega: formatted } : prev);
                            toast({ title: "Data de entrega atualizada" });
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </div>
                {editandoCliente ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Estado"
                      value={clienteEdit.estado}
                      onChange={e => setClienteEdit(prev => ({ ...prev, estado: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                    <Input
                      placeholder="Cidade"
                      value={clienteEdit.cidade}
                      onChange={e => setClienteEdit(prev => ({ ...prev, cidade: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                    <Input
                      placeholder="Bairro"
                      value={clienteEdit.bairro}
                      onChange={e => setClienteEdit(prev => ({ ...prev, bairro: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                    <Input
                      placeholder="CEP"
                      value={clienteEdit.cep}
                      onChange={e => setClienteEdit(prev => ({ ...prev, cep: e.target.value }))}
                      className="bg-blue-500/10 border-blue-500/20 text-white placeholder:text-blue-300/40"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-white">
                      {venda.cidade && venda.estado 
                        ? `${venda.cidade} - ${venda.estado}` 
                        : venda.cidade || venda.estado || "-"}
                    </p>
                    {venda.bairro && (
                      <p className="text-sm text-blue-300/60">{venda.bairro}</p>
                    )}
                    {venda.cep && (
                      <p className="text-sm text-blue-300/60">CEP: {venda.cep}</p>
                    )}
                  </>
                )}
              </div>

              {/* Canal de Aquisição */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  Canal de Aquisição
                </div>
                <p className="font-medium text-white">{getCanalNome(venda.canal_aquisicao_id)}</p>
              </div>
            </div>

            {/* Observações - Editável */}
            <div className="mt-6 pt-4 border-t border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70">
                  <MessageSquare className="h-4 w-4" />
                  Observações
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSalvarObservacoes}
                  disabled={isSavingObservacoes || observacoes === (venda.observacoes_venda || "")}
                  className="text-blue-300 hover:text-blue-100 hover:bg-blue-500/20"
                >
                  {isSavingObservacoes ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Informações adicionais sobre a venda..."
                rows={3}
                className="bg-blue-500/10 border-blue-500/20 text-blue-100/90 placeholder:text-blue-300/40 focus:border-blue-400/50 focus:ring-blue-400/20"
              />
            </div>

            {/* Comprovante de Pagamento */}
            <div className="mt-6 pt-4 border-t border-blue-500/20">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-300/70 mb-3">
                <Paperclip className="h-4 w-4" />
                Comprovante de Pagamento
              </div>
              
              {venda.comprovante_url ? (
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <FileText className="h-5 w-5 text-blue-300" />
                  <span className="text-sm text-blue-100 truncate flex-1">
                    {venda.comprovante_nome || 'Comprovante'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(venda.comprovante_url!, '_blank')}
                    className="text-blue-300 hover:text-blue-100 hover:bg-blue-500/20"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setComprovanteModalOpen(true)}
                    className="text-blue-300 hover:text-blue-100 hover:bg-blue-500/20"
                  >
                    Alterar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComprovanteModalOpen(true)}
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Anexar Comprovante
                </Button>
              )}
            </div>

            {/* Modal de Comprovante */}
            <ComprovanteUploadModal
              open={comprovanteModalOpen}
              onOpenChange={(open) => {
                setComprovanteModalOpen(open);
                if (!open) fetchVenda();
              }}
              venda={venda ? {
                id: venda.id,
                cliente_nome: venda.cliente_nome || '',
                comprovante_url: venda.comprovante_url,
                comprovante_nome: venda.comprovante_nome
              } : null}
            />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-white">Produtos da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <ProductButton 
                label="Porta de Enrolar"
                onClick={() => {
                  setTipoInicial('porta_enrolar');
                  setPermitirTrocaTipo(false);
                  setShowProdutoForm(true);
                }}
              />
              <ProductButton 
                label="Porta Social"
                onClick={() => {
                  setTipoInicial('porta_social');
                  setPermitirTrocaTipo(false);
                  setShowProdutoForm(true);
                }}
              />
              <ProductButton 
                label="Pintura Eletrostática"
                onClick={() => {
                  setPinturaItemModalOpen(true);
                }}
              />
              <ProductButton 
                label="Serviços"
                onClick={() => {
                  setTipoInicial('manutencao');
                  setPermitirTrocaTipo(false);
                  setShowProdutoForm(true);
                }}
              />
              <ProductButton 
                label="Catálogo"
                onClick={() => setAcessoriosModalOpen(true)}
              />
            </div>

            <ProdutoVendaForm 
              open={showProdutoForm}
              onOpenChange={setShowProdutoForm}
              onAddProduto={async (produto: ProdutoVenda) => {
                if (!id) return;
                await addProduto({ ...produto, venda_id: id });
                setShowProdutoForm(false);
                if (produto.tipo_produto === 'porta_enrolar' && produto.largura && produto.altura) {
                  setPortaRecemAdicionada({ largura: produto.largura, altura: produto.altura });
                  setPinturaRapidaOpen(true);
                }
              }}
              tipoInicial={tipoInicial}
              permitirTrocaTipo={permitirTrocaTipo}
            />

            <SelecionarAcessoriosModal
              open={acessoriosModalOpen}
              onOpenChange={setAcessoriosModalOpen}
              onConfirm={async (produtosSelecionados) => {
                if (!id) return;
                for (const produto of produtosSelecionados) {
                  await addProduto({ ...produto, venda_id: id });
                }
                setAcessoriosModalOpen(false);
              }}
            />

            <PinturaItemCatalogoModal
              open={pinturaItemModalOpen}
              onOpenChange={setPinturaItemModalOpen}
              portas={produtosFormatados}
              onConfirm={async (pinturas) => {
                if (!id) return;
                for (const pintura of pinturas) {
                  await addProduto({ ...pintura, venda_id: id });
                }
                setPinturaItemModalOpen(false);
              }}
            />

            {portaRecemAdicionada && (
              <PinturaRapidaModal
                open={pinturaRapidaOpen}
                onOpenChange={(open) => {
                  setPinturaRapidaOpen(open);
                  if (!open) setPortaRecemAdicionada(null);
                }}
                largura={portaRecemAdicionada.largura}
                altura={portaRecemAdicionada.altura}
                onConfirm={async (pintura) => {
                  if (!id) return;
                  await addProduto({ ...pintura, venda_id: id });
                  setPinturaRapidaOpen(false);
                  setPortaRecemAdicionada(null);
                }}
                onSkip={() => {
                  setPinturaRapidaOpen(false);
                  setPortaRecemAdicionada(null);
                }}
              />
            )}

            <DescontoVendaModal
              open={descontoModalOpen}
              onOpenChange={setDescontoModalOpen}
              produtos={produtosFormatados}
              onAplicarDesconto={handleAplicarDesconto}
              formaPagamento={venda.forma_pagamento || ''}
              vendaPresencial={venda.venda_presencial || false}
            />

            <CreditoVendaModal
              open={creditoModalOpen}
              onOpenChange={setCreditoModalOpen}
              valorTotalVenda={calcularValorTotalProdutos()}
              temDesconto={temDesconto}
              valorCreditoAtual={valorCreditoAtual}
              percentualCreditoAtual={percentualCreditoAtual}
              onAplicarCredito={handleAplicarCredito}
            />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-blue-200/80">Produtos Adicionados</h3>
              {isLoadingProdutos ? (
                <div className="text-center py-8 text-blue-300/60">
                  Carregando produtos...
                </div>
              ) : (
                <ProdutosVendaTable 
                  produtos={produtosFormatados} 
                  onRemoveProduto={async (index: number) => {
                    const produto = produtos?.[index];
                    if (produto?.id) {
                      await deleteProduto(produto.id);
                    }
                  }}
                  onRemoverDesconto={handleRemoverDesconto}
                  onUpdateQuantidade={handleUpdateQuantidade}
                />
              )}
            </div>

            {/* Resumo da Venda com visualização de crédito */}
            {produtosFormatados.length > 0 && (
              <VendaResumo
                produtos={produtosFormatados}
                valorFrete={venda.valor_frete || 0}
                valorCredito={valorCreditoAtual}
                percentualCredito={percentualCreditoAtual}
                onRemoverCredito={valorCreditoAtual > 0 ? handleRemoverCredito : undefined}
              />
            )}

            {/* Botões de Desconto, Crédito e Salvar */}
            <div className="flex justify-end gap-2 pt-4 border-t border-blue-500/20">
              {produtosFormatados.length > 0 && valorCreditoAtual === 0 && (
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDescontoModalOpen(true)}
                  disabled={isSaving}
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  <Percent className="w-3.5 h-3.5 mr-1.5" />
                  {temDesconto ? 'Editar Desconto' : 'Adicionar Desconto'}
                </Button>
              )}
              {produtosFormatados.length > 0 && (!temDesconto || valorCreditoAtual > 0) && (
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-blue-400/50 text-blue-300 hover:bg-blue-500/10"
                  onClick={() => setCreditoModalOpen(true)}
                  disabled={isSaving}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {valorCreditoAtual > 0 ? 'Editar Crédito' : 'Adicionar Crédito'}
                </Button>
              )}
              <Button 
                type="button"
                size="sm"
                onClick={handleSalvar}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
              {venda.is_rascunho && (
                <Button 
                  type="button"
                  size="sm"
                  onClick={() => handleCadastrarVenda()}
                  disabled={isCadastrando}
                  className="bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800"
                >
                  {isCadastrando ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isCadastrando ? 'Cadastrando...' : 'Cadastrar Venda'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {tipoAutorizacaoNecessaria && (
        <AutorizacaoDescontoModal
          open={autorizacaoDescontoOpen}
          onOpenChange={setAutorizacaoDescontoOpen}
          onAutorizado={(autorizadorId, senhaDigitada) => {
            const novaAutorizacao = {
              autorizadoPor: autorizadorId,
              senhaUsada: senhaDigitada,
              percentualDesconto: percentualDescontoAtual,
              tipo: tipoAutorizacaoNecessaria,
            };
            setAutorizacaoPendente(novaAutorizacao);
            setAutorizacaoDescontoOpen(false);
            // Encadeia direto, sem setTimeout, e passa a autorização recém-obtida
            void handleCadastrarVenda(novaAutorizacao);
          }}
          percentualDesconto={percentualDescontoAtual}
          tipoAutorizacao={tipoAutorizacaoNecessaria}
          limitePermitido={limitePermitidoAtual}
        />
      )}
    </MinimalistLayout>
  );
}
