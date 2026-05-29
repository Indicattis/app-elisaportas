import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Download, Package, Paintbrush, Wrench, Percent, TrendingUp } from 'lucide-react';
import { ProdutoVendaForm } from '@/components/vendas/ProdutoVendaForm';
import { ProdutosOrcamentoTable } from './ProdutosOrcamentoTable';
import { OrcamentoResumo } from './OrcamentoResumo';
import { SelecionarAcessoriosModal } from '@/components/vendas/SelecionarAcessoriosModal';
import { ClienteOrcamentoSection } from './ClienteOrcamentoSection';
import { DescontoVendaModal } from '@/components/vendas/DescontoVendaModal';
import { CreditoVendaModal } from '@/components/vendas/CreditoVendaModal';
import { FormaPagamentoSelect } from '@/components/FormaPagamentoSelect';
import { useToast } from '@/hooks/use-toast';
import { generateOrcamentoPDF } from '@/utils/orcamentoPDFGenerator';
import type { OrcamentoFormData } from '@/types/orcamento';
import type { OrcamentoProduto } from '@/types/produto';
import type { ProdutoVenda } from '@/hooks/useVendas';
import type { Cliente } from '@/hooks/useClientes';

interface NovoOrcamentoFormProps {
  onSubmit?: (data: OrcamentoFormData, produtos: OrcamentoProduto[], valorTotal: number) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  leadId?: string | null;
  initialData?: any;
  isEdit?: boolean;
}

export function NovoOrcamentoForm({
  onSubmit,
  onCancel,
  loading,
  leadId,
  initialData,
  isEdit
}: NovoOrcamentoFormProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<OrcamentoFormData>({
    lead_id: leadId || '',
    cliente_id: '',
    cliente_nome: '',
    cliente_cpf: '',
    cliente_telefone: '',
    cliente_email: '',
    cliente_estado: '',
    cliente_cidade: '',
    cliente_bairro: '',
    cliente_cep: '',
    cliente_endereco: '',
    valor_frete: '0',
    publico_alvo: '',
    tipo_entrega: 'instalacao',
    forma_pagamento: '',
    desconto_total_percentual: 0,
    requer_analise: false,
    motivo_analise: '',
    canal_aquisicao_id: '',
    data_orcamento: '',
    observacoes: ''
  });

  const [produtos, setProdutos] = useState<OrcamentoProduto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVenda | undefined>(undefined);
  const [indexEditando, setIndexEditando] = useState<number | undefined>(undefined);
  const [tipoInicial, setTipoInicial] = useState<'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao' | undefined>(undefined);
  
  // Estados para desconto e crédito
  const [descontoModalOpen, setDescontoModalOpen] = useState(false);
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const [valorCredito, setValorCredito] = useState(0);
  const [percentualCredito, setPercentualCredito] = useState(0);

  // Carregar dados iniciais se estiver editando
  useEffect(() => {
    if (initialData && isEdit) {
      setFormData({
        lead_id: initialData.lead_id || '',
        cliente_id: initialData.cliente_id || '',
        cliente_nome: initialData.cliente_nome || '',
        cliente_cpf: initialData.cliente_cpf || '',
        cliente_telefone: initialData.cliente_telefone || '',
        cliente_email: initialData.cliente_email || '',
        cliente_estado: initialData.cliente_estado || '',
        cliente_cidade: initialData.cliente_cidade || '',
        cliente_bairro: initialData.cliente_bairro || '',
        cliente_cep: initialData.cliente_cep || '',
        cliente_endereco: initialData.cliente_endereco || '',
        valor_frete: String(initialData.valor_frete || 0),
        publico_alvo: initialData.publico_alvo || '',
        tipo_entrega: initialData.tipo_entrega || 'instalacao',
        forma_pagamento: initialData.forma_pagamento || '',
        desconto_total_percentual: initialData.desconto_total_percentual || 0,
        requer_analise: initialData.requer_analise || false,
        motivo_analise: initialData.motivo_analise || '',
        canal_aquisicao_id: initialData.canal_aquisicao_id || '',
        data_orcamento: initialData.data_orcamento || '',
        observacoes: initialData.observacoes || ''
      });
      
      if (initialData.produtos) {
        setProdutos(initialData.produtos);
      }
      
      if (initialData.valor_credito) {
        setValorCredito(initialData.valor_credito);
        setPercentualCredito(initialData.percentual_credito || 0);
      }
    }
  }, [initialData, isEdit]);

  // Handler para mudança de dados do cliente
  const handleClienteChange = (dados: any) => {
    setFormData(prev => ({
      ...prev,
      cliente_nome: dados.cliente_nome ?? prev.cliente_nome,
      cliente_telefone: dados.cliente_telefone ?? prev.cliente_telefone,
      cliente_estado: dados.estado ?? prev.cliente_estado,
      cliente_cidade: dados.cidade ?? prev.cliente_cidade,
    }));
  };

  // Handler para seleção de cliente existente
  const handleClienteSelecionado = (cliente: Cliente | null) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente?.id || ''
    }));
  };

  const handleAddProduto = (produto: ProdutoVenda) => {
    // Normalizar tipo_produto para os tipos permitidos em orçamentos
    let tipoProduto = produto.tipo_produto;
    if (tipoProduto === 'porta') {
      tipoProduto = 'porta_enrolar'; // Converter tipo legado
    }
    
    const orcamentoProduto: OrcamentoProduto = {
      tipo_produto: tipoProduto as 'porta_enrolar' | 'porta_social' | 'acessorio' | 'manutencao' | 'adicional' | 'pintura_epoxi',
      medidas: produto.tamanho,
      largura: produto.largura,
      altura: produto.altura,
      cor_id: produto.cor_id,
      acessorio_id: produto.acessorio_id,
      adicional_id: produto.adicional_id,
      descricao: produto.descricao,
      valor: produto.valor_produto,
      quantidade: produto.quantidade || 1,
      preco_instalacao: produto.valor_instalacao || 0,
      valor_pintura: produto.valor_pintura || 0,
      desconto_percentual: produto.tipo_desconto === 'percentual' ? produto.desconto_percentual : 0,
      desconto_valor: produto.tipo_desconto === 'valor' ? produto.desconto_valor : 0,
      tipo_desconto: produto.tipo_desconto || 'percentual',
      tamanho: produto.tamanho
    };

    setProdutos(prev => {
      if (indexEditando !== undefined) {
        const newProdutos = [...prev];
        newProdutos[indexEditando] = orcamentoProduto;
        return newProdutos;
      }
      return [...prev, orcamentoProduto];
    });

    setProdutoEditando(undefined);
    setIndexEditando(undefined);
  };

  const handleAddAcessorios = (produtosVenda: ProdutoVenda[]) => {
    const orcamentoProdutos: OrcamentoProduto[] = produtosVenda.map(produto => {
      // Normalizar tipo_produto
      let tipoProduto = produto.tipo_produto;
      if (tipoProduto === 'porta') {
        tipoProduto = 'porta_enrolar';
      }
      
      return {
        tipo_produto: tipoProduto as 'porta_enrolar' | 'porta_social' | 'acessorio' | 'manutencao' | 'adicional' | 'pintura_epoxi',
        descricao: produto.descricao,
        valor: produto.valor_produto,
        quantidade: produto.quantidade || 1,
        tipo_desconto: 'percentual',
        desconto_percentual: 0,
        desconto_valor: 0
      };
    });

    setProdutos(prev => [...prev, ...orcamentoProdutos]);
  };

  const handleEditProduto = (index: number) => {
    const produto = produtos[index];
    
    // Converter OrcamentoProduto para ProdutoVenda
    const produtoVenda: ProdutoVenda = {
      tipo_produto: produto.tipo_produto,
      tamanho: produto.medidas || produto.tamanho || '',
      largura: produto.largura,
      altura: produto.altura,
      cor_id: produto.cor_id || '',
      acessorio_id: produto.acessorio_id || '',
      adicional_id: produto.adicional_id || '',
      tipo_pintura: '',
      valor_produto: produto.valor,
      valor_pintura: produto.valor_pintura || 0,
      valor_instalacao: produto.preco_instalacao || 0,
      valor_frete: 0,
      tipo_desconto: produto.tipo_desconto || 'percentual',
      desconto_percentual: produto.desconto_percentual || 0,
      desconto_valor: produto.desconto_valor || 0,
      quantidade: produto.quantidade || 1,
      descricao: produto.descricao || ''
    };

    setProdutoEditando(produtoVenda);
    setIndexEditando(index);
    setDialogOpen(true);
  };

  const handleRemoveProduto = (index: number) => {
    setProdutos(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantidade = (index: number, novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    
    setProdutos(prev => {
      const newProdutos = [...prev];
      newProdutos[index] = { ...newProdutos[index], quantidade: novaQuantidade };
      return newProdutos;
    });
  };

  const handleRemoverDesconto = (index: number) => {
    setProdutos(prev => {
      const newProdutos = [...prev];
      newProdutos[index] = {
        ...newProdutos[index],
        desconto_valor: 0,
        desconto_percentual: 0
      };
      return newProdutos;
    });
    
    toast({ title: "Desconto removido com sucesso" });
  };

  // Converter OrcamentoProduto[] para ProdutoVenda[] para o modal de desconto
  const produtosParaDesconto = (): ProdutoVenda[] => {
    return produtos.map(p => ({
      tipo_produto: p.tipo_produto,
      tamanho: p.medidas || p.tamanho || '',
      largura: p.largura,
      altura: p.altura,
      cor_id: p.cor_id || '',
      acessorio_id: p.acessorio_id || '',
      adicional_id: p.adicional_id || '',
      tipo_pintura: '',
      valor_produto: p.valor,
      valor_pintura: p.valor_pintura || 0,
      valor_instalacao: p.preco_instalacao || 0,
      valor_frete: 0,
      tipo_desconto: p.tipo_desconto || 'percentual',
      desconto_percentual: p.desconto_percentual || 0,
      desconto_valor: p.desconto_valor || 0,
      quantidade: p.quantidade || 1,
      descricao: p.descricao || ''
    }));
  };

  // Handler para aplicar desconto
  const handleAplicarDesconto = (produtosAtualizados: ProdutoVenda[]) => {
    const novoProdutos = produtosAtualizados.map(p => ({
      tipo_produto: p.tipo_produto as 'porta_enrolar' | 'porta_social' | 'acessorio' | 'manutencao' | 'adicional' | 'pintura_epoxi',
      medidas: p.tamanho,
      largura: p.largura,
      altura: p.altura,
      cor_id: p.cor_id,
      acessorio_id: p.acessorio_id,
      adicional_id: p.adicional_id,
      descricao: p.descricao,
      valor: p.valor_produto,
      quantidade: p.quantidade || 1,
      preco_instalacao: p.valor_instalacao || 0,
      valor_pintura: p.valor_pintura || 0,
      desconto_percentual: p.tipo_desconto === 'percentual' ? p.desconto_percentual : 0,
      desconto_valor: p.tipo_desconto === 'valor' ? p.desconto_valor : 0,
      tipo_desconto: p.tipo_desconto || 'percentual',
      tamanho: p.tamanho
    }));
    
    setProdutos(novoProdutos);
    toast({ title: "Desconto aplicado com sucesso" });
  };

  // Handler para aplicar crédito
  const handleAplicarCredito = (valor: number, percentual: number) => {
    setValorCredito(valor);
    setPercentualCredito(percentual);
    toast({ title: "Crédito aplicado com sucesso" });
  };

  // Handler para remover crédito
  const handleRemoverCredito = () => {
    setValorCredito(0);
    setPercentualCredito(0);
    toast({ title: "Crédito removido com sucesso" });
  };

  // Verificar se tem desconto aplicado (para desabilitar crédito)
  const temDesconto = produtos.some(p => (p.desconto_valor || 0) > 0 || (p.desconto_percentual || 0) > 0);

  const calcularValorTotal = () => {
    const totalProdutos = produtos.reduce((acc, p) => {
      const valorBase = (p.valor + (p.valor_pintura || 0) + (p.preco_instalacao || 0)) * (p.quantidade || 1);
      const desconto = p.tipo_desconto === 'valor' 
        ? (p.desconto_valor || 0)
        : valorBase * ((p.desconto_percentual || 0) / 100);
      return acc + valorBase - desconto;
    }, 0);

    return totalProdutos + parseFloat(formData.valor_frete || '0') + valorCredito;
  };

  const calcularValorTotalSemCredito = () => {
    const totalProdutos = produtos.reduce((acc, p) => {
      const valorBase = (p.valor + (p.valor_pintura || 0) + (p.preco_instalacao || 0)) * (p.quantidade || 1);
      const desconto = p.tipo_desconto === 'valor' 
        ? (p.desconto_valor || 0)
        : valorBase * ((p.desconto_percentual || 0) / 100);
      return acc + valorBase - desconto;
    }, 0);

    return totalProdutos + parseFloat(formData.valor_frete || '0');
  };

  const handleDownloadPDF = async () => {
    if (produtos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Adicione pelo menos um produto antes de gerar o PDF'
      });
      return;
    }

    try {
      await generateOrcamentoPDF({
        ...formData,
        produtos
      }, calcularValorTotal());
      toast({
        title: 'Sucesso',
        description: 'PDF gerado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao gerar PDF'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (produtos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'É necessário adicionar pelo menos um produto'
      });
      return;
    }

    if (!formData.cliente_estado || !formData.cliente_cidade) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Estado e cidade são obrigatórios.'
      });
      return;
    }


    const valorTotal = calcularValorTotal();

    if (onSubmit) {
      await onSubmit({
        ...formData,
        valor_credito: valorCredito,
        percentual_credito: percentualCredito,
        data_orcamento: new Date().toISOString()
      }, produtos, valorTotal);
    }
  };

  // Dados do cliente para o componente ClienteOrcamentoSection
  const dadosCliente = {
    cliente_nome: formData.cliente_nome,
    cliente_telefone: formData.cliente_telefone,
    estado: formData.cliente_estado,
    cidade: formData.cliente_cidade,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cliente - usando componente simplificado */}
      <ClienteOrcamentoSection
        dados={dadosCliente}
        onChange={handleClienteChange}
        onClienteSelecionado={handleClienteSelecionado}
      />

      {/* Dados do Orçamento */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base font-semibold">Dados do Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="forma_pagamento" className="text-xs font-medium">Forma de Pagamento *</Label>
              <FormaPagamentoSelect
                value={formData.forma_pagamento}
                onValueChange={(value) => setFormData(prev => ({ ...prev, forma_pagamento: value }))}
                required
                showLabel={false}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="valor_frete" className="text-xs font-medium">Valor do Frete</Label>
              <Input
                id="valor_frete"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_frete}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_frete: e.target.value }))}
                placeholder="0.00"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Tipo de Entrega</Label>
              <RadioGroup
                value={formData.tipo_entrega}
                onValueChange={(value: 'instalacao' | 'entrega') => setFormData(prev => ({ ...prev, tipo_entrega: value }))}
                className="flex gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="instalacao" id="instalacao" />
                  <Label htmlFor="instalacao" className="cursor-pointer font-normal">Instalação</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entrega" id="entrega" />
                  <Label htmlFor="entrega" className="cursor-pointer font-normal">Entrega</Label>
                </div>
              </RadioGroup>
            </div>
          </div>


          <div className="space-y-1">
            <Label htmlFor="observacoes" className="text-xs font-medium">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais sobre o orçamento..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Produtos */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base font-semibold">Produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setTipoInicial('porta_enrolar');
                setProdutoEditando(undefined);
                setIndexEditando(undefined);
                setDialogOpen(true);
              }}
            >
              <Package className="w-4 h-4 mr-2" />
              Porta de Enrolar
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTipoInicial('porta_social');
                setProdutoEditando(undefined);
                setIndexEditando(undefined);
                setDialogOpen(true);
              }}
            >
              <Package className="w-4 h-4 mr-2" />
              Porta Social
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTipoInicial('pintura_epoxi');
                setProdutoEditando(undefined);
                setIndexEditando(undefined);
                setDialogOpen(true);
              }}
            >
              <Paintbrush className="w-4 h-4 mr-2" />
              Pintura Eletrostática
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTipoInicial('manutencao');
                setProdutoEditando(undefined);
                setIndexEditando(undefined);
                setDialogOpen(true);
              }}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Manutenção
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setAcessoriosModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Acessório/Adicional
            </Button>
          </div>

          <ProdutosOrcamentoTable
            produtos={produtos}
            onRemoveProduto={handleRemoveProduto}
            onEditProduto={handleEditProduto}
            onUpdateQuantidade={handleUpdateQuantidade}
            onRemoverDesconto={handleRemoverDesconto}
          />

          {/* Botões de Desconto e Crédito */}
          {produtos.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDescontoModalOpen(true)}
                disabled={valorCredito > 0}
              >
                <Percent className="w-4 h-4 mr-2" />
                Aplicar Desconto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreditoModalOpen(true)}
                disabled={temDesconto}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Aplicar Crédito
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      <OrcamentoResumo 
        produtos={produtos} 
        valorFrete={parseFloat(formData.valor_frete || '0')}
        valorCredito={valorCredito}
        percentualCredito={percentualCredito}
        onRemoverCredito={valorCredito > 0 ? handleRemoverCredito : undefined}
      />

      {/* Ações */}
      <div className="flex justify-between items-center pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={loading || produtos.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>

          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : (isEdit ? 'Atualizar Orçamento' : 'Criar Orçamento')}
          </Button>
        </div>
      </div>

      {/* Modals */}
      <ProdutoVendaForm
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setProdutoEditando(undefined);
            setIndexEditando(undefined);
            setTipoInicial(undefined);
          }
        }}
        onAddProduto={handleAddProduto}
        produtoEditando={produtoEditando}
        indexEditando={indexEditando}
        tipoInicial={tipoInicial}
        permitirTrocaTipo={false}
      />

      <SelecionarAcessoriosModal
        open={acessoriosModalOpen}
        onOpenChange={setAcessoriosModalOpen}
        onConfirm={handleAddAcessorios}
      />

      <DescontoVendaModal
        open={descontoModalOpen}
        onOpenChange={setDescontoModalOpen}
        produtos={produtosParaDesconto()}
        onAplicarDesconto={handleAplicarDesconto}
        formaPagamento={formData.forma_pagamento}
        vendaPresencial={false}
      />

      <CreditoVendaModal
        open={creditoModalOpen}
        onOpenChange={setCreditoModalOpen}
        valorTotalVenda={calcularValorTotalSemCredito()}
        temDesconto={temDesconto}
        valorCreditoAtual={valorCredito}
        percentualCreditoAtual={percentualCredito}
        onAplicarCredito={handleAplicarCredito}
      />
    </form>
  );
}
