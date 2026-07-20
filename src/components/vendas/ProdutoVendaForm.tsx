import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ProdutoVenda } from '@/hooks/useVendas';
import { buscarPrecosPorMedidas } from '@/utils/tabelaPrecosHelper';
import { toast } from 'sonner';
import { Loader2, Package, Ruler, Wallet, Paintbrush, Wrench, Sparkles, DoorOpen } from 'lucide-react';
import { getUnidade } from '@/utils/unidadesMedida';

interface ProdutoVendaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduto: (produto: ProdutoVenda) => void;
  produtoEditando?: ProdutoVenda;
  indexEditando?: number;
  tipoInicial?: 'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao';
  permitirTrocaTipo?: boolean;
}

export function ProdutoVendaForm({ 
  open, 
  onOpenChange, 
  onAddProduto,
  produtoEditando,
  indexEditando,
  tipoInicial,
  permitirTrocaTipo = true
}: ProdutoVendaFormProps) {
  const [formData, setFormData] = useState<ProdutoVenda>({
    tipo_produto: tipoInicial || 'porta_enrolar',
    tamanho: '',
    largura: undefined,
    altura: undefined,
    cor_id: '',
    acessorio_id: '',
    adicional_id: '',
    tipo_pintura: '',
    valor_produto: 0,
    valor_pintura: 0,
    valor_instalacao: 0,
    valor_frete: 0,
    tipo_desconto: 'percentual',
    desconto_percentual: 0,
    desconto_valor: 0,
    quantidade: 1,
    descricao: ''
  });

  const [incluirInstalacao, setIncluirInstalacao] = useState(false);
  const [carregandoPrecos, setCarregandoPrecos] = useState(false);
  const [itemTabelaEncontrado, setItemTabelaEncontrado] = useState<string>('');
  const [tipoPortaPintura, setTipoPortaPintura] = useState<'porta_enrolar' | 'porta_social'>('porta_enrolar');

  // Atualizar formulário quando um produto for passado para edição
  useEffect(() => {
    if (produtoEditando) {
      setFormData(produtoEditando);
      setIncluirInstalacao(false); // Instalação agora é produto separado
    } else {
      // Resetar formulário quando não há produto para editar
      setFormData({
        tipo_produto: tipoInicial || 'porta_enrolar',
        tamanho: '',
        largura: undefined,
        altura: undefined,
        cor_id: '',
        acessorio_id: '',
        adicional_id: '',
        tipo_pintura: '',
        valor_produto: 0,
        valor_pintura: 0,
        valor_instalacao: 0,
        valor_frete: 0,
        tipo_desconto: 'percentual',
        desconto_percentual: 0,
        desconto_valor: 0,
        quantidade: 1,
        descricao: ''
      });
      setIncluirInstalacao(false);
      setTipoPortaPintura('porta_enrolar');
    }
  }, [produtoEditando, tipoInicial]);

  const { data: cores } = useQuery({
    queryKey: ['cores-catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_cores')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  // Buscar itens da Estratégia de Custos (substitui o antigo vendas_catalogo).
  // Tanto "Acessórios" quanto "Adicionais" agora vêm da mesma fonte; o vendedor escolhe
  // pelo dropdown apropriado e o tipo_produto é definido pelo handler.
  const { data: itensCustos } = useQuery({
    queryKey: ['custos-itens-venda-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_itens')
        .select('id, descricao, preco_venda, categoria, unidade, ordem')
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true })
        .order('descricao', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });
  const acessorios = itensCustos;
  const adicionais = itensCustos;

  // Zerar valor de pintura se a cor for "Aço galvanizado"
  useEffect(() => {
    if (formData.cor_id && cores) {
      const corSelecionada = cores.find(c => c.id === formData.cor_id);
      if (corSelecionada && corSelecionada.nome.toLowerCase() === 'aço galvanizado') {
        setFormData(prev => ({ ...prev, valor_pintura: 0 }));
      }
    }
  }, [formData.cor_id, cores]);

  // Buscar preços na tabela de preços quando largura e altura forem informados
  const buscarPrecos = async () => {
    if (!formData.largura || !formData.altura) return;
    
    // Para porta social, usar valores fixos e validar dimensões
    if (formData.tipo_produto === 'porta_social') {
      // Validar dimensões máximas
      if (formData.largura > 1.20) {
        toast.error('Porta social: largura máxima é 1,20m');
        return;
      }
      if (formData.altura > 2.50) {
        toast.error('Porta social: altura máxima é 2,50m');
        return;
      }
      
      const tamanho = `${formData.largura}x${formData.altura}`;
      setItemTabelaEncontrado('Porta Social - Valores Fixos');
      
      setFormData(prev => ({
        ...prev,
        valor_produto: 1500,
        tamanho,
        valor_instalacao: incluirInstalacao ? 1000 : 0
      }));
      toast.success('Valores definidos para porta social');
      return;
    }
    
    // Para pintura de porta social, usar valor fixo
    if (formData.tipo_produto === 'pintura_epoxi' && tipoPortaPintura === 'porta_social') {
      const tamanho = `${formData.largura}x${formData.altura}`;
      setItemTabelaEncontrado('Pintura Porta Social - Valor Fixo');
      
      setFormData(prev => ({
        ...prev,
        valor_pintura: 500,
        tamanho
      }));
      toast.success('Valor fixo definido para pintura de porta social');
      return;
    }
    
    setCarregandoPrecos(true);
    try {
      const item = await buscarPrecosPorMedidas(formData.largura, formData.altura);
      
      if (item) {
        const tamanho = `${formData.largura}x${formData.altura}`;
        setItemTabelaEncontrado(`Tabela: ${item.largura}m x ${item.altura}m`);
        
        if (formData.tipo_produto === 'porta_enrolar') {
          setFormData(prev => ({
            ...prev,
            valor_produto: item.valor_porta,
            tamanho,
            valor_instalacao: incluirInstalacao ? item.valor_instalacao : 0,
            tabela_precos_porta_id: item.id,
          }));
          toast.success(`Preço encontrado para ${item.largura}x${item.altura}m`);
        } else if (formData.tipo_produto === 'pintura_epoxi') {
          setFormData(prev => ({
            ...prev,
            valor_pintura: item.valor_pintura,
            tamanho,
            tabela_precos_porta_id: item.id,
          }));
          toast.success(`Preço de pintura encontrado para ${item.largura}x${item.altura}m`);
        }
      } else {
        setItemTabelaEncontrado('');
        setFormData(prev => ({ ...prev, tabela_precos_porta_id: null }));
        toast.error('Preço não encontrado na tabela para essas medidas');
      }
    } catch (error) {
      console.error('Erro ao buscar preços:', error);
      toast.error('Erro ao buscar preços');
    } finally {
      setCarregandoPrecos(false);
    }
  };

  // Atualizar valor de instalação quando o checkbox mudar
  useEffect(() => {
    const atualizarInstalacao = async () => {
      if ((formData.tipo_produto === 'porta_enrolar' || formData.tipo_produto === 'porta_social') && formData.largura && formData.altura) {
        if (incluirInstalacao) {
          // Para porta social, usar valor fixo de instalação
          if (formData.tipo_produto === 'porta_social') {
            setFormData(prev => ({ ...prev, valor_instalacao: 1000 }));
          } else {
            const item = await buscarPrecosPorMedidas(formData.largura, formData.altura);
            if (item) {
              setFormData(prev => ({ ...prev, valor_instalacao: item.valor_instalacao }));
            }
          }
        } else {
          setFormData(prev => ({ ...prev, valor_instalacao: 0 }));
        }
      }
    };
    atualizarInstalacao();
  }, [incluirInstalacao, formData.largura, formData.altura, formData.tipo_produto]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if ((formData.tipo_produto === 'porta_enrolar' || formData.tipo_produto === 'porta_social')) {
      if (!formData.largura || !formData.altura) {
        toast.error('Informe largura e altura da porta');
        return;
      }
    }
    
    if (formData.tipo_produto === 'pintura_epoxi') {
      if (!formData.largura || !formData.altura) {
        toast.error('Informe largura e altura para pintura');
        return;
      }
      if (!formData.cor_id) {
        toast.error('Selecione a cor da pintura');
        return;
      }
    }
    
    if (formData.tipo_produto === 'acessorio' && !formData.acessorio_id && !formData.custos_itens_id) {
      toast.error('Selecione um acessório');
      return;
    }
    
    if (formData.tipo_produto === 'adicional' && !formData.adicional_id && !formData.custos_itens_id) {
      toast.error('Selecione um adicional');
      return;
    }
    
    if (formData.tipo_produto === 'manutencao' && !formData.descricao) {
      return;
    }
    
    const produtoFinal = { ...formData, valor_instalacao: 0 };

    // Se for pintura, incluir nome da cor na descrição
    if (produtoFinal.tipo_produto === 'pintura_epoxi' && produtoFinal.cor_id && cores) {
      const corSelecionada = cores.find(c => c.id === produtoFinal.cor_id);
      if (corSelecionada) {
        produtoFinal.descricao = corSelecionada.nome;
      }
    }

    onAddProduto(produtoFinal);

    // Se incluir instalação, criar produto separado de instalação
    if (incluirInstalacao && (formData.tipo_produto === 'porta_enrolar' || formData.tipo_produto === 'porta_social') && formData.valor_instalacao > 0) {
      const tipoPortaLabel = formData.tipo_produto === 'porta_social' ? 'Porta Social' : 'Porta de Enrolar';
      const dimensoes = formData.largura && formData.altura ? ` ${Number(formData.largura).toFixed(2)}x${Number(formData.altura).toFixed(2)}m` : '';
      const produtoInstalacao: ProdutoVenda = {
        tipo_produto: 'instalacao',
        tamanho: formData.tamanho,
        largura: formData.largura,
        altura: formData.altura,
        valor_produto: formData.valor_instalacao,
        valor_pintura: 0,
        valor_instalacao: 0,
        valor_frete: 0,
        tipo_desconto: 'percentual',
        desconto_percentual: 0,
        desconto_valor: 0,
        quantidade: formData.quantidade,
        descricao: `Instalação - ${tipoPortaLabel}${dimensoes}`,
      };
      onAddProduto(produtoInstalacao);
    }

    onOpenChange(false);
  };

  const handleNumberChange = (field: keyof ProdutoVenda, value: string) => {
    setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleAcessorioChange = (estoqueId: string) => {
    const acessorio = acessorios?.find(a => a.id === estoqueId);
    if (acessorio) {
      setFormData(prev => ({
        ...prev,
        tipo_produto: 'acessorio',
        descricao: acessorio.descricao,
        valor_produto: Number(acessorio.preco_venda),
        custos_itens_id: acessorio.id,
        unidade: acessorio.unidade || undefined,
      }));
    }
  };

  const handleAdicionalChange = (estoqueId: string) => {
    const adicional = adicionais?.find(a => a.id === estoqueId);
    if (adicional) {
      setFormData(prev => ({
        ...prev,
        tipo_produto: 'adicional',
        descricao: adicional.descricao,
        valor_produto: Number(adicional.preco_venda),
        custos_itens_id: adicional.id,
        unidade: adicional.unidade || undefined,
      }));
    }
  };

  const tipoLabel = (() => {
    switch (formData.tipo_produto) {
      case 'porta_enrolar': return 'Porta de Enrolar';
      case 'porta_social': return 'Porta Social';
      case 'pintura_epoxi': return 'Pintura Epóxi';
      case 'acessorio': return 'Acessório';
      case 'adicional': return 'Item Avulso';
      case 'manutencao': return 'Serviço';
      default: return 'Produto';
    }
  })();
  const TipoIcon = formData.tipo_produto === 'pintura_epoxi' ? Paintbrush
    : formData.tipo_produto === 'manutencao' ? Wrench
    : (formData.tipo_produto === 'porta_enrolar' || formData.tipo_produto === 'porta_social') ? DoorOpen
    : Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/60">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/50 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <TipoIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {produtoEditando ? 'Editar Produto' : 'Adicionar Produto'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{tipoLabel}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(92vh-92px)]">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Campos específicos por tipo */}
          {(formData.tipo_produto === 'porta_enrolar' || formData.tipo_produto === 'porta_social') && (
            <>
              {/* Seção: Medidas */}
              <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Medidas</h3>
                    <p className="text-xs text-muted-foreground">Informe as dimensões da porta</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="largura" className="text-base">
                      Largura (m) * {formData.tipo_produto === 'porta_social' && <span className="text-muted-foreground font-normal">(máx 1,20m)</span>}
                    </Label>
                    <Input
                      id="largura"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.tipo_produto === 'porta_social' ? 1.20 : undefined}
                      value={formData.largura || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, largura: parseFloat(e.target.value) || undefined }))}
                      onBlur={buscarPrecos}
                      placeholder={formData.tipo_produto === 'porta_social' ? "Ex: 1.00" : "Ex: 2.50"}
                      className="h-12 text-lg"
                      disabled={!!produtoEditando}
                      required
                    />
                    {produtoEditando && (
                      <p className="text-xs text-muted-foreground">Não é possível alterar medidas ao editar</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="altura" className="text-base">
                      Altura (m) * {formData.tipo_produto === 'porta_social' && <span className="text-muted-foreground font-normal">(máx 2,50m)</span>}
                    </Label>
                    <Input
                      id="altura"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.tipo_produto === 'porta_social' ? 2.50 : undefined}
                      value={formData.altura || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, altura: parseFloat(e.target.value) || undefined }))}
                      onBlur={buscarPrecos}
                      placeholder={formData.tipo_produto === 'porta_social' ? "Ex: 2.10" : "Ex: 3.00"}
                      className="h-12 text-lg"
                      disabled={!!produtoEditando}
                      required
                    />
                    {produtoEditando && (
                      <p className="text-xs text-muted-foreground">Não é possível alterar medidas ao editar</p>
                    )}
                  </div>
                </div>

                {carregandoPrecos && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando preços na tabela...
                  </div>
                )}

                {itemTabelaEncontrado && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-md p-3">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-medium text-primary">{itemTabelaEncontrado}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Valores</h3>
                    <p className="text-xs text-muted-foreground">Valores obtidos da tabela de preços</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3">
                    <Label className="text-sm text-muted-foreground">Valor do Produto</Label>
                    <span className="text-xl font-bold tabular-nums text-primary">
                      R$ {formData.valor_produto.toFixed(2)}
                    </span>
                  </div>

                  <label
                    htmlFor="incluir_instalacao"
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${incluirInstalacao ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:bg-muted/40'}`}
                  >
                    <Checkbox
                      id="incluir_instalacao"
                      checked={incluirInstalacao}
                      onCheckedChange={(checked) => setIncluirInstalacao(checked as boolean)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Incluir Instalação</span>
                      <p className="text-xs text-muted-foreground">Adiciona a instalação como item separado</p>
                    </div>
                  </label>

                  {incluirInstalacao && (
                    <div className="flex justify-between items-center rounded-lg bg-muted/40 px-4 py-3">
                      <Label className="text-sm text-muted-foreground">Valor da Instalação</Label>
                      <span className="text-lg font-semibold tabular-nums">
                        R$ {formData.valor_instalacao.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </>
          )}

          {formData.tipo_produto === 'pintura_epoxi' && (
            <>
              {/* Seção: Tipo de Porta */}
              <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <DoorOpen className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Tipo de Porta</h3>
                    <p className="text-xs text-muted-foreground">Selecione o tipo que será pintado</p>
                  </div>
                </div>
                
                <RadioGroup
                  value={tipoPortaPintura}
                  onValueChange={(value: 'porta_enrolar' | 'porta_social') => {
                    setTipoPortaPintura(value);
                    // Resetar valores ao trocar tipo
                    setFormData(prev => ({
                      ...prev,
                      largura: undefined,
                      altura: undefined,
                      valor_pintura: 0,
                      tamanho: ''
                    }));
                    setItemTabelaEncontrado('');
                  }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="porta_enrolar" id="porta_enrolar_pintura" />
                    <Label htmlFor="porta_enrolar_pintura" className="cursor-pointer flex-1">
                      <span className="font-medium">Porta de Enrolar</span>
                      <p className="text-xs text-muted-foreground">Preço por tabela</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="porta_social" id="porta_social_pintura" />
                    <Label htmlFor="porta_social_pintura" className="cursor-pointer flex-1">
                      <span className="font-medium">Porta Social</span>
                      <p className="text-xs text-muted-foreground">Valor fixo: R$ 500,00</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Seção: Medidas */}
              <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Medidas</h3>
                    <p className="text-xs text-muted-foreground">Área a ser pintada</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="largura_pintura" className="text-base">Largura (m) *</Label>
                    <Input
                      id="largura_pintura"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.largura || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, largura: parseFloat(e.target.value) || undefined }))}
                      onBlur={buscarPrecos}
                      placeholder="Ex: 2.00"
                      className="h-12 text-lg"
                      disabled={!!produtoEditando}
                      required
                    />
                    {produtoEditando && (
                      <p className="text-xs text-muted-foreground">Não é possível alterar medidas ao editar</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="altura_pintura" className="text-base">Altura (m) *</Label>
                    <Input
                      id="altura_pintura"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.altura || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, altura: parseFloat(e.target.value) || undefined }))}
                      onBlur={buscarPrecos}
                      placeholder="Ex: 2.50"
                      className="h-12 text-lg"
                      disabled={!!produtoEditando}
                      required
                    />
                    {produtoEditando && (
                      <p className="text-xs text-muted-foreground">Não é possível alterar medidas ao editar</p>
                    )}
                  </div>
                </div>

                {carregandoPrecos && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando preços na tabela...
                  </div>
                )}

                {itemTabelaEncontrado && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-md p-3">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-medium text-primary">{itemTabelaEncontrado}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Valores</h3>
                    <p className="text-xs text-muted-foreground">
                      {tipoPortaPintura === 'porta_social' 
                        ? 'Valor fixo para porta social' 
                        : 'Valores obtidos da tabela de preços'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3">
                  <Label className="text-sm text-muted-foreground">Valor da Pintura</Label>
                  <span className="text-xl font-bold tabular-nums text-primary">
                    R$ {formData.valor_pintura.toFixed(2)}
                  </span>
                </div>
                  {tipoPortaPintura === 'porta_social' && formData.valor_pintura > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Valor fixo não alterável para pintura de porta social
                    </p>
                  )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/50 p-5">
                <div className="space-y-2">
                  <Label htmlFor="cor" className="text-base">Cor da Pintura *</Label>
                  <Select
                    value={formData.cor_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cor_id: value }))}
                    required
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione a cor" />
                    </SelectTrigger>
                    <SelectContent>
                      {cores?.map((cor) => (
                        <SelectItem key={cor.id} value={cor.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: cor.codigo_hex }}
                            />
                            {cor.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {formData.tipo_produto === 'acessorio' && (
            <div className="space-y-2">
              <Label htmlFor="acessorio">Acessório *</Label>
              <Select
                value={formData.custos_itens_id}
                onValueChange={handleAcessorioChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um acessório" />
                </SelectTrigger>
                <SelectContent>
                  {acessorios?.map((acessorio) => (
                    <SelectItem key={acessorio.id} value={acessorio.id}>
                      {acessorio.descricao} - R$ {Number(acessorio.preco_venda).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.tipo_produto === 'adicional' && (
            <div className="space-y-2">
              <Label htmlFor="adicional">Adicional *</Label>
              <Select
                value={formData.custos_itens_id}
                onValueChange={handleAdicionalChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um adicional" />
                </SelectTrigger>
                <SelectContent>
                  {adicionais?.map((adicional) => (
                    <SelectItem key={adicional.id} value={adicional.id}>
                      {adicional.descricao} - R$ {Number(adicional.preco_venda).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(formData.tipo_produto === 'acessorio' || formData.tipo_produto === 'adicional') && formData.custos_itens_id && (() => {
            const unidadeInfo = getUnidade(formData.unidade);
            const isDecimal = !unidadeInfo.discreta;
            return (
              <div className="space-y-2">
                <Label htmlFor="quantidade_catalogo">
                  Quantidade {isDecimal ? `(${unidadeInfo.abreviacao})` : ''} *
                </Label>
                <Input
                  id="quantidade_catalogo"
                  type="number"
                  min={isDecimal ? '0.01' : '1'}
                  step={isDecimal ? '0.01' : '1'}
                  value={formData.quantidade}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = isDecimal ? parseFloat(raw) : parseInt(raw);
                    setFormData(prev => ({ ...prev, quantidade: isNaN(parsed) ? 0 : parsed }));
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Total: R$ {((formData.valor_produto || 0) * (formData.quantidade || 0)).toFixed(2)}
                </p>
              </div>
            );
          })()}

          {formData.tipo_produto === 'manutencao' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_servico">Tipo de Serviço *</Label>
                <Select
                  value={formData.tipo_servico || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_servico: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="instalacao_avulsa">Instalação Avulsa</SelectItem>
                    <SelectItem value="suporte">Suporte Técnico</SelectItem>
                    <SelectItem value="visita_tecnica">Visita Técnica</SelectItem>
                    <SelectItem value="reparo">Reparo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricao_manutencao">Descrição do Serviço *</Label>
                <Textarea
                  id="descricao_manutencao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o serviço a ser realizado"
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          {/* Valores manuais para outros tipos de produto */}
           {formData.tipo_produto !== 'porta_enrolar' && 
           formData.tipo_produto !== 'porta_social' && 
           formData.tipo_produto !== 'pintura_epoxi' && (
            <div className="space-y-2">
              <Label htmlFor="valor_produto">
                Valor {formData.tipo_produto === 'manutencao' ? 'do Serviço' : 'do Produto'} (R$) *
              </Label>
              <Input
                id="valor_produto"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_produto}
                onChange={(e) => {
                  const valor = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, valor_produto: valor }));
                }}
                disabled={!!produtoEditando && (formData.tipo_produto === 'acessorio' || formData.tipo_produto === 'adicional')}
                required
              />
              {produtoEditando && (formData.tipo_produto === 'acessorio' || formData.tipo_produto === 'adicional') && (
                <p className="text-xs text-muted-foreground">Não é possível alterar valores ao editar</p>
              )}
            </div>
          )}



          </div>

          <div className="px-6 py-4 border-t border-border/50 bg-muted/20 backdrop-blur flex items-center gap-3">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-11 text-base shadow-lg shadow-primary/20">
              {produtoEditando ? 'Salvar Alterações' : 'Adicionar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
