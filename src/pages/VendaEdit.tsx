
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanEditVenda } from "@/hooks/useCanEditVenda";
import { CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, ShoppingCart, Calendar, User, MapPin, CreditCard, Truck, MessageSquare, Store, Percent, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useProdutosVenda } from "@/hooks/useProdutosVenda";
import { ProdutoVendaForm } from "@/components/vendas/ProdutoVendaForm";
import { SelecionarAcessoriosModal } from "@/components/vendas/SelecionarAcessoriosModal";
import { DescontoVendaModal } from "@/components/vendas/DescontoVendaModal";
import { CreditoVendaModal } from "@/components/vendas/CreditoVendaModal";
import { ProdutosVendaTable } from "@/components/vendas/ProdutosVendaTable";
import type { ProdutoVenda } from "@/hooks/useVendas";
import { useCanaisAquisicao } from "@/hooks/useCanaisAquisicao";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
}

export default function VendaEdit() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Tables<"vendas"> | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [tipoInicial, setTipoInicial] = useState<'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao'>('porta_enrolar');
  const [permitirTrocaTipo, setPermitirTrocaTipo] = useState(true);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [descontoModalOpen, setDescontoModalOpen] = useState(false);
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { produtos, isLoading: isLoadingProdutos, addProduto, deleteProduto, updateProduto } = useProdutosVenda(id);
  const { canais } = useCanaisAquisicao();

  const { user, isAdmin } = useAuth();
  const { canEdit, loading: loadingPermission, isFaturada } = useCanEditVenda({
    atendenteId: venda?.atendente_id,
    vendaId: id,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

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
    } catch (error) {
      console.error("Erro ao buscar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados da venda",
      });
    }
  };

  const { data: produtosAvulsos = [] } = useQuery({
    queryKey: ['produtos-comercializaveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('ativo', true)
        .order('nome_produto');
      
      if (error) throw error;
      return data;
    }
  });

  const handleAdicionarProdutoAvulso = async (produtoEstoque: any) => {
    if (!id) return;
    
    try {
      await addProduto({
        venda_id: id,
        tipo_produto: 'adicional',
        descricao: produtoEstoque.nome_produto,
        valor_produto: produtoEstoque.custo_unitario,
        quantidade: 1,
        valor_pintura: 0,
        valor_instalacao: 0,
        valor_frete: 0,
        tipo_desconto: 'percentual',
        desconto_percentual: 0,
        desconto_valor: 0,
      });
      
      toast({
        title: "Produto adicionado",
        description: `${produtoEstoque.nome_produto} foi adicionado à venda`
      });
    } catch (error) {
      console.error('Erro ao adicionar produto avulso:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o produto"
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

  // Converter produtos do banco para formato ProdutoVenda
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
    descricao: p.descricao || ''
  }));

  // Calcular valores para o modal de crédito
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

  // Handler para aplicar desconto
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
      
      // Remover crédito ao aplicar desconto
      await supabase
        .from('vendas')
        .update({ valor_credito: 0, percentual_credito: 0 })
        .eq('id', id);
      
      // Atualizar estado local
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

  // Handler para aplicar crédito
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
      
      // Atualizar estado local
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

  // Handler para remover desconto de um produto
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

  // Handler para salvar (navegar de volta)
  const handleSalvar = () => {
    toast({
      title: "Alterações salvas",
      description: "As alterações foram salvas automaticamente"
    });
    navigate(-1);
  };

  if (!canEdit && !loadingPermission) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              {isFaturada 
                ? "Esta venda já foi totalmente faturada e não pode mais ser editada por atendentes."
                : "Você não tem permissão para editar esta venda."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando dados da venda...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Venda</h1>
          <p className="text-muted-foreground">Gerencie os produtos desta venda</p>
        </div>
      </div>

      {lead && (
        <Card>
          <CardHeader>
            <CardTitle>Dados do Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Nome:</strong> {lead.nome}</div>
              <div><strong>Email:</strong> {lead.email}</div>
              <div><strong>Telefone:</strong> {lead.telefone}</div>
              <div><strong>Cidade:</strong> {lead.cidade}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados da Venda - Somente Visualização */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Venda</CardTitle>
          <CardDescription>
            Informações da venda (somente visualização)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cliente */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Cliente
              </div>
              <p className="font-medium">{venda.cliente_nome || "-"}</p>
              <p className="text-sm text-muted-foreground">{venda.cliente_telefone || "-"}</p>
              {venda.cliente_email && (
                <p className="text-sm text-muted-foreground">{venda.cliente_email}</p>
              )}
              {venda.cpf_cliente && (
                <p className="text-sm text-muted-foreground">CPF: {venda.cpf_cliente}</p>
              )}
            </div>

            {/* Data e Público */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Data da Venda
              </div>
              <p className="font-medium">{formatDate(venda.data_venda)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{getPublicoAlvoLabel(venda.publico_alvo)}</Badge>
                {venda.temperatura != null && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Store className="h-3 w-3" />
                    {venda.temperatura ? 'Quente' : 'Fria'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Pagamento */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Pagamento
              </div>
              <p className="font-medium">{venda.forma_pagamento || "-"}</p>
              {venda.valor_entrada != null && venda.valor_entrada > 0 && (
                <p className="text-sm text-muted-foreground">
                  Entrada: {formatCurrency(venda.valor_entrada)}
                </p>
              )}
              {venda.numero_parcelas && (
                <p className="text-sm text-muted-foreground">
                  {venda.numero_parcelas}x parcelas
                </p>
              )}
            </div>

            {/* Entrega */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Truck className="h-4 w-4" />
                Entrega
              </div>
              <p className="font-medium">{getTipoEntregaLabel(venda.tipo_entrega)}</p>
              {venda.valor_frete != null && venda.valor_frete > 0 && (
                <p className="text-sm text-muted-foreground">
                  Frete: {formatCurrency(venda.valor_frete)}
                </p>
              )}
              {venda.data_prevista_entrega && (
                <p className="text-sm text-muted-foreground">
                  Previsão: {formatDateOnly(venda.data_prevista_entrega)}
                </p>
              )}
            </div>

            {/* Endereço */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Endereço
              </div>
              <p className="font-medium">
                {venda.cidade && venda.estado 
                  ? `${venda.cidade} - ${venda.estado}` 
                  : venda.cidade || venda.estado || "-"}
              </p>
              {venda.bairro && (
                <p className="text-sm text-muted-foreground">{venda.bairro}</p>
              )}
              {venda.cep && (
                <p className="text-sm text-muted-foreground">CEP: {venda.cep}</p>
              )}
            </div>

            {/* Canal de Aquisição */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                Canal de Aquisição
              </div>
              <p className="font-medium">{getCanalNome(venda.canal_aquisicao_id)}</p>
            </div>
          </div>

          {/* Observações */}
          {venda.observacoes_venda && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <MessageSquare className="h-4 w-4" />
                Observações
              </div>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{venda.observacoes_venda}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos da Venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            <Button 
              type="button"
              size="sm"
              onClick={() => {
                setTipoInicial('porta_enrolar');
                setPermitirTrocaTipo(false);
                setShowProdutoForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Porta de Enrolar
            </Button>
            <Button 
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setTipoInicial('porta_social');
                setPermitirTrocaTipo(false);
                setShowProdutoForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Porta Social
            </Button>
            <Button 
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setTipoInicial('pintura_epoxi');
                setPermitirTrocaTipo(false);
                setShowProdutoForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Pintura Eletrostática
            </Button>
            <Button 
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setTipoInicial('manutencao');
                setPermitirTrocaTipo(false);
                setShowProdutoForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Serviço
            </Button>
            <Button 
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAcessoriosModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Catálogo
            </Button>
          </div>

          <ProdutoVendaForm 
            open={showProdutoForm}
            onOpenChange={setShowProdutoForm}
            onAddProduto={async (produto: ProdutoVenda) => {
              if (!id) return;
              await addProduto({ ...produto, venda_id: id });
              setShowProdutoForm(false);
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

          <DescontoVendaModal
            open={descontoModalOpen}
            onOpenChange={setDescontoModalOpen}
            produtos={produtosFormatados}
            onAplicarDesconto={handleAplicarDesconto}
            formaPagamento={venda.forma_pagamento || ''}
            vendaPresencial={venda.temperatura || false}
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
            <h3 className="text-sm font-medium">Produtos Adicionados</h3>
            {isLoadingProdutos ? (
              <div className="text-center py-8 text-muted-foreground">
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
              />
            )}
          </div>

          {/* Botões de Desconto, Crédito e Salvar */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {produtosFormatados.length > 0 && valorCreditoAtual === 0 && (
              <Button 
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDescontoModalOpen(true)}
                disabled={isSaving}
              >
                <Percent className="w-3.5 h-3.5 mr-1.5" />
                Adicionar Desconto
              </Button>
            )}
            {produtosFormatados.length > 0 && !temDesconto && (
              <Button 
                type="button"
                size="sm"
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
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
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
