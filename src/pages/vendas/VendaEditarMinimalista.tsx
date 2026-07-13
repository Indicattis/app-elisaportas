import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanEditVenda } from "@/hooks/useCanEditVenda";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, Calendar, User, MapPin, CreditCard, Truck, MessageSquare, Store, Percent, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useProdutosVenda } from "@/hooks/useProdutosVenda";
import { ProdutoVendaForm } from "@/components/vendas/ProdutoVendaForm";
import { SelecionarAcessoriosModal } from "@/components/vendas/SelecionarAcessoriosModal";
import { DescontoVendaModal } from "@/components/vendas/DescontoVendaModal";
import { CreditoVendaModal } from "@/components/vendas/CreditoVendaModal";
import { ProdutosVendaTable } from "@/components/vendas/ProdutosVendaTable";
import type { ProdutoVenda } from "@/hooks/useVendas";
import { useCanaisAquisicao } from "@/hooks/useCanaisAquisicao";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MinimalistLayout } from "@/components/MinimalistLayout";

export default function VendaEditarMinimalista() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Tables<"vendas"> | null>(null);
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

  const handleSalvar = () => {
    toast({
      title: "Alterações salvas",
      description: "As alterações foram salvas automaticamente"
    });
    navigate('/vendas/minhas-vendas');
  };

  const cardClass = "bg-primary/5 border-primary/10 backdrop-blur-xl";

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
                 hover:from-blue-500/20 hover:to-blue-600/10 hover:text-white hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10
                 transition-all duration-200"
    >
      <Plus className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  if (!canEdit && !loadingPermission) {
    return (
      <MinimalistLayout title="Editar Venda" backPath="/vendas/minhas-vendas">
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-white">Acesso Negado</CardTitle>
            <CardDescription className="text-white/60">
              {isFaturada 
                ? "Esta venda já foi totalmente faturada e não pode mais ser editada por atendentes."
                : "Você não tem permissão para editar esta venda."}
            </CardDescription>
          </CardHeader>
        </Card>
      </MinimalistLayout>
    );
  }

  if (!venda) {
    return (
      <MinimalistLayout title="Editar Venda" backPath="/vendas/minhas-vendas">
        <Card className={cardClass}>
          <CardContent className="py-8 text-center text-white/60">
            Carregando dados da venda...
          </CardContent>
        </Card>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout title="Editar Venda" subtitle="Gerencie os produtos desta venda" backPath="/vendas/minhas-vendas">
      <div className="space-y-6">
        {/* Dados da Venda - Somente Visualização */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-white">Dados da Venda</CardTitle>
            <CardDescription className="text-white/60">
              Informações da venda (somente visualização)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Cliente */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                <p className="font-medium text-white">{venda.cliente_nome || "-"}</p>
                <p className="text-sm text-white/60">{venda.cliente_telefone || "-"}</p>
                {venda.cliente_email && (
                  <p className="text-sm text-white/60">{venda.cliente_email}</p>
                )}
                {venda.cpf_cliente && (
                  <p className="text-sm text-white/60">CPF: {venda.cpf_cliente}</p>
                )}
              </div>

              {/* Data e Público */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <Calendar className="h-4 w-4" />
                  Data da Venda
                </div>
                <p className="font-medium text-white">{formatDate(venda.data_venda)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{getPublicoAlvoLabel(venda.publico_alvo)}</Badge>
                  {venda.temperatura && (
                    <Badge variant="outline" className="flex items-center gap-1 border-primary/30">
                      <Store className="h-3 w-3" />
                      Fria
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pagamento */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <CreditCard className="h-4 w-4" />
                  Pagamento
                </div>
                <p className="font-medium text-white">{venda.forma_pagamento || "-"}</p>
                {venda.valor_entrada != null && venda.valor_entrada > 0 && (
                  <p className="text-sm text-white/60">
                    Entrada: {formatCurrency(venda.valor_entrada)}
                  </p>
                )}
                {venda.numero_parcelas && (
                  <p className="text-sm text-white/60">
                    {venda.numero_parcelas}x parcelas
                  </p>
                )}
              </div>

              {/* Entrega */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <Truck className="h-4 w-4" />
                  Entrega
                </div>
                <p className="font-medium text-white">{getTipoEntregaLabel(venda.tipo_entrega)}</p>
                {venda.valor_frete != null && venda.valor_frete > 0 && (
                  <p className="text-sm text-white/60">
                    Frete: {formatCurrency(venda.valor_frete)}
                  </p>
                )}
                {venda.data_prevista_entrega && (
                  <p className="text-sm text-white/60">
                    Previsão: {formatDateOnly(venda.data_prevista_entrega)}
                  </p>
                )}
              </div>

              {/* Endereço */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </div>
                <p className="font-medium text-white">
                  {venda.cidade && venda.estado 
                    ? `${venda.cidade} - ${venda.estado}` 
                    : venda.cidade || venda.estado || "-"}
                </p>
                {venda.bairro && (
                  <p className="text-sm text-white/60">{venda.bairro}</p>
                )}
                {venda.cep && (
                  <p className="text-sm text-white/60">CEP: {venda.cep}</p>
                )}
              </div>

              {/* Canal de Aquisição */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                  Canal de Aquisição
                </div>
                <p className="font-medium text-white">{getCanalNome(venda.canal_aquisicao_id)}</p>
              </div>
            </div>

            {/* Observações */}
            {venda.observacoes_venda && (
              <div className="mt-6 pt-4 border-t border-primary/10">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  Observações
                </div>
                <p className="text-sm bg-primary/10 p-3 rounded-md text-white/80">{venda.observacoes_venda}</p>
              </div>
            )}
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
                  setTipoInicial('pintura_epoxi');
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
              <h3 className="text-sm font-medium text-white/80">Produtos Adicionados</h3>
              {isLoadingProdutos ? (
                <div className="text-center py-8 text-white/60">
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

            {/* Botões de Desconto, Crédito e Salvar */}
            <div className="flex justify-end gap-2 pt-4 border-t border-primary/10">
              {produtosFormatados.length > 0 && valorCreditoAtual === 0 && (
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDescontoModalOpen(true)}
                  disabled={isSaving}
                  className="border-primary/30 text-white hover:bg-primary/10"
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
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
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
    </MinimalistLayout>
  );
}
