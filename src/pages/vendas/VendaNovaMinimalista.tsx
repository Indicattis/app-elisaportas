import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendas, VendaFormData, ProdutoVenda } from '@/hooks/useVendas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Plus, CalendarIcon, Percent, CheckCircle2, ShieldCheck, Lock, Package, CreditCard, FileText, Truck, Wrench, Settings } from 'lucide-react';
import { ProdutoVendaForm } from '@/components/vendas/ProdutoVendaForm';
import { ProdutosVendaTable } from '@/components/vendas/ProdutosVendaTable';
import { VendaResumo } from '@/components/vendas/VendaResumo';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SelecionarAcessoriosModal } from '@/components/vendas/SelecionarAcessoriosModal';
import { DescontoVendaModal } from '@/components/vendas/DescontoVendaModal';
import { CreditoVendaModal } from '@/components/vendas/CreditoVendaModal';
import { AutorizacaoDescontoModal } from '@/components/vendas/AutorizacaoDescontoModal';
import { PinturaRapidaModal } from '@/components/vendas/PinturaRapidaModal';
import { PinturaItemCatalogoModal } from '@/components/vendas/PinturaItemCatalogoModal';
import { validarDesconto, getTipoAutorizacaoNecessaria, ConfigLimites } from '@/utils/descontoVendasRules';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { useAuth } from '@/hooks/useAuth';
import { useFretesCidades } from '@/hooks/useFretesCidades';
import { Checkbox } from '@/components/ui/checkbox';
import { PagamentoSection, PagamentoData, createEmptyPagamentoData } from '@/components/vendas/PagamentoSection';
import { ClienteVendaSection } from '@/components/vendas/ClienteVendaSection';
import { MinimalistLayout } from '@/components/MinimalistLayout';

// Estilos sofisticados (fora do componente para estabilidade de referência)
const sectionWrapperClass = "p-1.5 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-900/10 backdrop-blur-xl border border-blue-500/20";
const cardClass = "bg-transparent border-0 shadow-none";
const labelClass = "text-xs font-semibold text-blue-300/80 uppercase tracking-wider";
const inputClass = "h-10 bg-blue-500/5 border-blue-500/20 text-white placeholder:text-blue-200/30 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:bg-blue-500/10 transition-all";
const textareaClass = "bg-blue-500/5 border-blue-500/20 text-white placeholder:text-blue-200/30 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:bg-blue-500/10 transition-all resize-none";

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className={sectionWrapperClass}>
    <div className="px-4 py-3 border-b border-blue-500/10 bg-gradient-to-r from-blue-500/10 to-transparent">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-blue-100 tracking-wide">{title}</h3>
      </div>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ProductButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/25 text-blue-200 hover:from-blue-500/20 hover:to-blue-600/10 hover:text-white hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
  >
    <Plus className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const SophisticatedCheckbox = ({ id, checked, onCheckedChange, label, description }: { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void; label: string; description?: string }) => (
  <label
    htmlFor={id}
    className={cn(
      "flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
      checked
        ? "bg-gradient-to-r from-blue-500/20 to-blue-600/10 border-blue-400/50 shadow-lg shadow-blue-500/10"
        : "bg-blue-500/5 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/10"
    )}
  >
    <div className={cn(
      "flex items-center justify-center w-5 h-5 rounded border-2 transition-all",
      checked ? "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 shadow-lg shadow-blue-500/50" : "bg-transparent border-blue-400/40"
    )}>
      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </div>
    <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} className="sr-only" />
    <div className="flex-1">
      <span className="text-sm font-medium text-blue-100">{label}</span>
      {description && <span className="text-xs text-blue-300/60 ml-2">{description}</span>}
    </div>
  </label>
);

const GradientButton = ({ children, onClick, variant = 'blue', className: extraClassName = '', type = 'button', disabled = false, size = 'default' }: { children: React.ReactNode; onClick?: () => void; variant?: 'blue' | 'amber' | 'outline' | 'ghost'; className?: string; type?: 'button' | 'submit'; disabled?: boolean; size?: 'sm' | 'default' }) => {
  const baseClass = size === 'sm' ? "h-9 px-4 text-sm" : "h-11 px-5";
  if (variant === 'outline') {
    return (<button type={type} onClick={onClick} disabled={disabled} className={cn(baseClass, "rounded-lg font-medium border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 hover:border-blue-400/50 transition-all duration-200 disabled:opacity-50", extraClassName)}>{children}</button>);
  }
  if (variant === 'ghost') {
    return (<button type={type} onClick={onClick} disabled={disabled} className={cn(baseClass, "rounded-lg font-medium text-blue-300/70 hover:bg-blue-500/10 hover:text-blue-200 transition-all duration-200 disabled:opacity-50", extraClassName)}>{children}</button>);
  }
  const gradientClass = variant === 'amber' 
    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-amber-300/50 shadow-lg shadow-amber-500/20"
    : "bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400/30 shadow-lg shadow-blue-500/30";
  return (<button type={type} onClick={onClick} disabled={disabled} className={cn(baseClass, "rounded-lg font-medium text-white border hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100", gradientClass, extraClassName)}>{children}</button>);
};

export default function VendaNovaMinimalista() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orcamentoId = searchParams.get('orcamento_id');
  const { toast } = useToast();
  const { createVenda, createRascunho, isCreating, isCreatingRascunho } = useVendas();
  const { user } = useAuth();
  const { limites: configLimites } = useConfiguracoesVendas();
  const { fretes } = useFretesCidades();
  
  const [dataEntrega, setDataEntrega] = useState<Date | undefined>();
  const [dataVenda, setDataVenda] = useState<Date>(new Date());
  
  const [formData, setFormData] = useState<VendaFormData>({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    cpf_cliente: '',
    estado: '',
    cidade: '',
    cep: '',
    bairro: '',
    endereco: '',
    publico_alvo: '',
    forma_pagamento: '',
    observacoes_venda: '',
    valor_frete: 0,
    valor_entrada: 0,
    valor_a_receber: 0,
    data_prevista_entrega: '',
    tipo_entrega: 'instalacao',
    venda_presencial: false
  });

  const [portas, setPortas] = useState<ProdutoVenda[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVenda | undefined>(undefined);
  const [indexEditando, setIndexEditando] = useState<number | undefined>(undefined);
  const [tipoInicial, setTipoInicial] = useState<'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao' | undefined>(undefined);
  const [permitirTrocaTipo, setPermitirTrocaTipo] = useState(true);
  const [descontoModalOpen, setDescontoModalOpen] = useState(false);
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const [autorizacaoDescontoOpen, setAutorizacaoDescontoOpen] = useState(false);
  const [produtosComDesconto, setProdutosComDesconto] = useState<ProdutoVenda[]>([]);
  const [autorizadorId, setAutorizadorId] = useState<string | null>(null);
  const [tipoAutorizacaoNecessaria, setTipoAutorizacaoNecessaria] = useState<'responsavel_setor' | 'master' | null>(null);
  const [limitePermitido, setLimitePermitido] = useState<number>(10);
  
  const [valorCredito, setValorCredito] = useState<number>(0);
  const [percentualCredito, setPercentualCredito] = useState<number>(0);

  const [pinturaRapidaOpen, setPinturaRapidaOpen] = useState(false);
  const [portaRecemAdicionada, setPortaRecemAdicionada] = useState<{largura: number, altura: number} | null>(null);
  const [pinturaItemModalOpen, setPinturaItemModalOpen] = useState(false);

  const [pagamentoData, setPagamentoData] = useState<PagamentoData>(createEmptyPagamentoData());

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

  const { data: orcamentoData, isLoading: isLoadingOrcamento } = useQuery({
    queryKey: ['orcamento-para-venda', orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return null;
      
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          orcamento_produtos (*),
          admin_users (id, nome)
        `)
        .eq('id', orcamentoId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orcamentoId
  });

  const isFromOrcamento = !!orcamentoId && !!orcamentoData;

  useEffect(() => {
    if (orcamentoData) {
      setFormData(prev => ({
        ...prev,
        cliente_nome: orcamentoData.cliente_nome || '',
        cliente_telefone: orcamentoData.cliente_telefone || '',
        cliente_email: orcamentoData.cliente_email || '',
        cpf_cliente: orcamentoData.cliente_cpf || '',
        estado: orcamentoData.cliente_estado || '',
        cidade: orcamentoData.cliente_cidade || '',
        cep: orcamentoData.cliente_cep || '',
        bairro: orcamentoData.cliente_bairro || '',
        endereco: '',
        publico_alvo: orcamentoData.publico_alvo || '',
        canal_aquisicao_id: orcamentoData.canal_aquisicao_id || '',
        valor_frete: orcamentoData.valor_frete || 0,
        tipo_entrega: 'instalacao',
        orcamento_id: orcamentoData.id,
      }));

      if (orcamentoData.orcamento_produtos && orcamentoData.orcamento_produtos.length > 0) {
        const produtosConvertidos: ProdutoVenda[] = orcamentoData.orcamento_produtos.map((p: any) => ({
          tipo_produto: p.tipo_produto || 'porta_enrolar',
          largura: p.medidas?.largura || 0,
          altura: p.medidas?.altura || 0,
          cor_id: p.cor_id || '',
          valor_produto: p.valor || 0,
          valor_pintura: p.preco_producao || 0,
          valor_instalacao: p.preco_instalacao || 0,
          valor_frete: 0,
          quantidade: p.quantidade || 1,
          descricao: p.descricao || '',
          desconto_percentual: p.desconto_percentual || 0,
          desconto_valor: 0,
          tipo_desconto: 'percentual' as const,
          valor_credito: 0,
        }));
        setPortas(produtosConvertidos);
      }

      const formaPagamento = orcamentoData.forma_pagamento;
      if (formaPagamento === 'a_vista' || formaPagamento === 'boleto' || formaPagamento === 'cartao_credito' || formaPagamento === 'dinheiro') {
        setPagamentoData(prev => ({
          ...prev,
          metodo_pagamento: formaPagamento
        }));
      }
    }
  }, [orcamentoData]);

  const recalcularValorTotal = (produtos: ProdutoVenda[], credito: number = valorCredito) => {
    const valorProdutos = produtos.reduce((acc, p) => {
      const valorBase = (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1);
      const desconto = p.tipo_desconto === 'valor' ? (p.desconto_valor || 0) : valorBase * ((p.desconto_percentual || 0) / 100);
      return acc + valorBase - desconto;
    }, 0);
    return valorProdutos + credito + (formData.valor_frete || 0);
  };

  // Memoized values to prevent re-renders that cause focus loss
  const valorTotalMemo = useMemo(() => {
    return portas.reduce((acc, p) => {
      const valorBase = (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1);
      const desconto = p.tipo_desconto === 'valor' ? (p.desconto_valor || 0) : valorBase * ((p.desconto_percentual || 0) / 100);
      const credito = (p.valor_credito || 0) * (p.quantidade || 1);
      return acc + valorBase - desconto + credito;
    }, 0) + (formData.valor_frete || 0) + valorCredito;
  }, [portas, formData.valor_frete, valorCredito]);

  const configLimitesObj: ConfigLimites = useMemo(() => ({
    avista: configLimites.avista,
    presencial: configLimites.presencial,
    adicionalResponsavel: configLimites.adicionalResponsavel
  }), [configLimites]);

  const validacaoDescontoMemo = useMemo(() => {
    return validarDesconto(portas, formData.forma_pagamento, formData.venda_presencial, configLimitesObj);
  }, [portas, formData.forma_pagamento, formData.venda_presencial, configLimitesObj]);

  const tipoAutorizacaoNecessariaMemo = useMemo(() => {
    return getTipoAutorizacaoNecessaria(validacaoDescontoMemo);
  }, [validacaoDescontoMemo]);

  // Sugestão de frete baseada na cidade/estado
  const freteSugerido = useMemo(() => {
    if (!formData.estado || !formData.cidade || !fretes) return null;
    return fretes.find(
      f => f.ativo && 
           f.estado === formData.estado && 
           f.cidade === formData.cidade
    );
  }, [formData.estado, formData.cidade, fretes]);

  // Auto-preenche o valor do frete quando há frete cadastrado para a cidade/estado
  useEffect(() => {
    if (freteSugerido && formData.valor_frete !== freteSugerido.valor_frete) {
      setFormData(prev => ({ ...prev, valor_frete: freteSugerido.valor_frete }));
    }
  }, [freteSugerido?.valor_frete]);

  const handleAddPorta = (produto: ProdutoVenda) => {
    setPortas(prev => {
      let newPortas;
      
      if (indexEditando !== undefined) {
        newPortas = [...prev];
        newPortas[indexEditando] = produto;
      } else {
        newPortas = [...prev, produto];
      }
      
      const valorTotal = recalcularValorTotal(newPortas);
      
      setFormData(prev => ({
        ...prev,
        valor_a_receber: valorTotal - (prev.valor_entrada || 0)
      }));
      
      setProdutoEditando(undefined);
      setIndexEditando(undefined);
      
      return newPortas;
    });

    if (produto.tipo_produto === 'porta_enrolar' && indexEditando === undefined && produto.largura && produto.altura) {
      setPortaRecemAdicionada({ largura: produto.largura, altura: produto.altura });
      setPinturaRapidaOpen(true);
    }
  };

  const handleAddPinturaRapida = (pintura: ProdutoVenda) => {
    setPortas(prev => {
      const newPortas = [...prev, pintura];
      const valorTotal = recalcularValorTotal(newPortas);
      
      setFormData(prevForm => ({
        ...prevForm,
        valor_a_receber: valorTotal - (prevForm.valor_entrada || 0)
      }));
      
      return newPortas;
    });
    setPortaRecemAdicionada(null);
  };

  const handleAddAcessorios = (produtos: ProdutoVenda[]) => {
    setPortas(prev => {
      const newPortas = [...prev, ...produtos];
      
      const valorTotal = recalcularValorTotal(newPortas);
      
      setFormData(prev => ({
        ...prev,
        valor_a_receber: valorTotal - (prev.valor_entrada || 0)
      }));
      
      return newPortas;
    });
  };

  const handleEditPorta = (index: number) => {
    setProdutoEditando(portas[index]);
    setIndexEditando(index);
    setDialogOpen(true);
  };

  const handleRemovePorta = (index: number) => {
    setPortas(prev => {
      const newPortas = prev.filter((_, i) => i !== index);
      const valorTotal = recalcularValorTotal(newPortas);
      
      setFormData(prev => ({
        ...prev,
        valor_a_receber: valorTotal - (prev.valor_entrada || 0)
      }));
      
      return newPortas;
    });
  };

  const handleUpdateQuantidade = (index: number, novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    
    setPortas(prev => {
      const newPortas = [...prev];
      newPortas[index] = { ...newPortas[index], quantidade: novaQuantidade };
      
      const valorTotal = recalcularValorTotal(newPortas);
      
      setFormData(prev => ({
        ...prev,
        valor_a_receber: valorTotal - (prev.valor_entrada || 0)
      }));
      
      return newPortas;
    });
  };

  const handleAplicarDesconto = (produtosAtualizados: ProdutoVenda[]) => {
    setPortas(produtosAtualizados);
    
    setValorCredito(0);
    setPercentualCredito(0);
    
    const valorTotal = recalcularValorTotal(produtosAtualizados, 0);
    
    setFormData(prev => ({
      ...prev,
      valor_a_receber: valorTotal - (prev.valor_entrada || 0)
    }));
  };

  const handleAplicarCredito = (novoValorCredito: number, novoPercentualCredito: number) => {
    setValorCredito(novoValorCredito);
    setPercentualCredito(novoPercentualCredito);
    
    const valorTotal = recalcularValorTotal(portas, novoValorCredito);
    
    setFormData(prev => ({
      ...prev,
      valor_a_receber: valorTotal - (prev.valor_entrada || 0)
    }));
    
    toast({ title: "Crédito aplicado com sucesso" });
  };

  const handleRemoverDesconto = (index: number) => {
    setPortas(prev => {
      const newPortas = [...prev];
      newPortas[index] = {
        ...newPortas[index],
        desconto_valor: 0,
        desconto_percentual: 0
      };
      
      const valorTotal = recalcularValorTotal(newPortas);
      
      setFormData(prev => ({
        ...prev,
        valor_a_receber: valorTotal - (prev.valor_entrada || 0)
      }));
      
      return newPortas;
    });
    
    toast({ title: "Desconto removido com sucesso" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Coleta granular de campos obrigatórios faltantes / inválidos
    const faltantes: string[] = [];

    // Cliente
    if (!formData.cliente_nome?.trim()) faltantes.push('Nome do cliente');
    if (!formData.cliente_telefone?.trim()) faltantes.push('Telefone do cliente');

    // Localização
    if (!formData.estado) faltantes.push('Estado');
    if (!formData.cidade) faltantes.push('Cidade');
    if (!formData.cep) faltantes.push('CEP');
    if (!formData.bairro) {
      faltantes.push('Bairro');
    } else if (formData.bairro.length < 2) {
      faltantes.push('Bairro (mínimo 2 caracteres)');
    }
    if (!formData.endereco) {
      faltantes.push('Endereço');
    } else if (formData.endereco.length < 2) {
      faltantes.push('Endereço (mínimo 2 caracteres)');
    }

    // Documento (somente formato — campo opcional)
    const documentoDigitos = formData.cpf_cliente?.replace(/\D/g, '') || '';
    if (documentoDigitos && documentoDigitos.length !== 11 && documentoDigitos.length !== 14) {
      faltantes.push('CPF/CNPJ inválido (use 11 ou 14 dígitos)');
    }

    // Produtos
    if (portas.length === 0) faltantes.push('Pelo menos um produto');

    // Datas e entrega
    if (!dataEntrega) faltantes.push('Previsão de entrega');
    if (!formData.tipo_entrega) faltantes.push('Tipo de entrega');

    // Forma de pagamento
    if (!pagamentoData?.metodos?.[0]?.tipo) {
      faltantes.push('Forma de pagamento');
    }

    if (faltantes.length > 0) {
      sonnerToast.error('Campos obrigatórios não preenchidos', {
        description: (
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            {faltantes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) as any,
        duration: 6000,
      });
      // Rolar até o topo para o usuário visualizar a primeira seção do formulário
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
      return;
    }

    const validacao = validarDesconto(
      portas,
      formData.forma_pagamento,
      formData.venda_presencial,
      configLimitesObj
    );

    const tipoAutorizacao = getTipoAutorizacaoNecessaria(validacao);
    if (tipoAutorizacao) {
      setProdutosComDesconto(portas);
      setTipoAutorizacaoNecessaria(tipoAutorizacao);
      setLimitePermitido(validacao.limitePermitido);
      setAutorizacaoDescontoOpen(true);
      return;
    }

    try {
      await createVenda({ 
        vendaData: {
          ...formData,
          forma_pagamento: pagamentoData.metodos[0]?.tipo || '',
          data_venda: `${format(dataVenda, 'yyyy-MM-dd')}T12:00:00.000Z`,
        },
        portas,
        pagamentoData,
        creditoVenda: { valorCredito, percentualCredito }
      });
      navigate('/vendas/minhas-vendas');
    } catch (error) {
      console.error('Erro ao criar venda:', error);
    }
  };

  const handleAutorizacaoDesconto = async (
    autorizadorUserId: string,
    senhaDigitada: string,
  ) => {
    if (!user || !tipoAutorizacaoNecessaria) return;
    
    setAutorizadorId(autorizadorUserId);
    
    try {
      const validacao = validarDesconto(
        produtosComDesconto,
        formData.forma_pagamento,
        formData.venda_presencial,
        configLimitesObj
      );

      await createVenda({ 
        vendaData: {
          ...formData,
          forma_pagamento: pagamentoData.metodos[0]?.tipo || '',
          data_venda: `${format(dataVenda, 'yyyy-MM-dd')}T12:00:00.000Z`,
        },
        portas: produtosComDesconto,
        pagamentoData,
        autorizacaoDesconto: {
          autorizado_por: autorizadorUserId,
          solicitado_por: user.id,
          percentual_desconto: validacao.percentualDesconto,
          senha_usada: senhaDigitada,
          tipo_autorizacao: tipoAutorizacaoNecessaria
        },
        creditoVenda: { valorCredito: 0, percentualCredito: 0 }
      });
      navigate('/vendas/minhas-vendas');
    } catch (error) {
      console.error('Erro ao criar venda:', error);
    }
  };

  

  return (
    <MinimalistLayout 
      title="Nova Venda" 
      subtitle={isFromOrcamento ? `Convertido do Orçamento #${orcamentoData?.numero_orcamento || orcamentoId?.slice(-8).toUpperCase()}` : undefined}
      backPath="/vendas/minhas-vendas"
    >
      {isLoadingOrcamento && orcamentoId && (
        <div className="text-center py-8 text-white/60">
          Carregando dados do orçamento...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente - Buscar ou Cadastrar */}
        <ClienteVendaSection
          dados={{
            cliente_nome: formData.cliente_nome,
            cliente_telefone: formData.cliente_telefone,
            cliente_email: formData.cliente_email,
            cpf_cliente: formData.cpf_cliente,
            estado: formData.estado,
            cidade: formData.cidade,
            cep: formData.cep,
            endereco: formData.endereco,
            bairro: formData.bairro,
            canal_aquisicao_id: formData.canal_aquisicao_id || '',
            publico_alvo: formData.publico_alvo,
          }}
          onChange={(dados) => setFormData(prev => ({ ...prev, ...dados }))}
          onClienteSelecionado={(cliente) => {
            setFormData(prev => ({ ...prev, cliente_id: cliente?.id }));
          }}
          disabled={isFromOrcamento}
        />

        {/* Produtos */}
        <Section title="Produtos" icon={Package}>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <ProductButton 
                label="Porta de Enrolar"
                onClick={() => {
                  setProdutoEditando(undefined);
                  setIndexEditando(undefined);
                  setTipoInicial('porta_enrolar');
                  setPermitirTrocaTipo(false);
                  setDialogOpen(true);
                }}
              />
              <ProductButton 
                label="Porta Social"
                onClick={() => {
                  setProdutoEditando(undefined);
                  setIndexEditando(undefined);
                  setTipoInicial('porta_social');
                  setPermitirTrocaTipo(false);
                  setDialogOpen(true);
                }}
              />
              <ProductButton 
                label="Pintura Eletrostática"
                onClick={() => setPinturaItemModalOpen(true)}
              />
              <ProductButton 
                label="Serviços"
                onClick={() => {
                  setProdutoEditando(undefined);
                  setIndexEditando(undefined);
                  setTipoInicial('manutencao');
                  setPermitirTrocaTipo(false);
                  setDialogOpen(true);
                }}
              />
              <ProductButton 
                label="Catálogo"
                onClick={() => setAcessoriosModalOpen(true)}
              />
            </div>
            
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
              tipoInicial={tipoInicial}
              permitirTrocaTipo={permitirTrocaTipo}
              onAddProduto={(produto) => {
                handleAddPorta(produto);
                setDialogOpen(false);
              }}
              produtoEditando={produtoEditando}
              indexEditando={indexEditando}
            />
            
            <SelecionarAcessoriosModal
              open={acessoriosModalOpen}
              onOpenChange={setAcessoriosModalOpen}
              onConfirm={handleAddAcessorios}
            />
            
            <ProdutosVendaTable
              produtos={portas}
              onRemoveProduto={handleRemovePorta}
              onEditProduto={handleEditPorta}
              onUpdateQuantidade={handleUpdateQuantidade}
              onRemoverDesconto={handleRemoverDesconto}
              onUpdateObservacao={(index, observacao) => {
                setPortas(prev => prev.map((p, i) => i === index ? { ...p, observacao_item: observacao } : p));
              }}
            />
          </div>
        </Section>

        {/* Forma de Pagamento */}
        <PagamentoSection
          paymentData={pagamentoData}
          onChange={setPagamentoData}
          valorTotal={valorTotalMemo}
        />

        {/* Dados Adicionais */}
        <Section title="Dados Adicionais" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campo de Data da Venda */}
            <div className="space-y-2">
              <Label className={labelClass}>Data da Venda *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      inputClass
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-400/60" />
                    {format(dataVenda, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-blue-500/20" align="start">
                  <Calendar
                    mode="single"
                    selected={dataVenda}
                    onSelect={(date) => date && setDataVenda(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Campo de Frete - Auto-preenchido a partir de /logistica/frete/internos */}
            <div className="space-y-2">
              <Label htmlFor="valor_frete" className={labelClass}>Frete (R$)</Label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400/60" />
                <Input
                  id="valor_frete"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_frete}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor_frete: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  disabled={!!freteSugerido}
                  readOnly={!!freteSugerido}
                  className={cn(
                    inputClass,
                    "pl-10",
                    freteSugerido && "cursor-not-allowed opacity-80"
                  )}
                />
                {freteSugerido && (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400/60" />
                )}
              </div>
              {freteSugerido ? (
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-300 text-xs">
                  🔒 Frete automático para {formData.cidade}/{formData.estado}
                </Badge>
              ) : formData.cidade && formData.estado ? (
                <p className="text-xs text-amber-300/80">
                  Sem frete cadastrado para esta cidade — preencha manualmente.
                </p>
              ) : null}
            </div>

            {/* Campo de Previsão de Entrega com Calendar Popover */}
            <div className="space-y-2">
              <Label className={labelClass}>Previsão Entrega *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      inputClass,
                      !dataEntrega && "text-blue-200/30"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-400/60" />
                    {dataEntrega ? (
                      format(dataEntrega, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-blue-500/20" align="start">
                  <Calendar
                    mode="single"
                    selected={dataEntrega}
                    onSelect={(date) => {
                      setDataEntrega(date);
                      setFormData(prev => ({
                        ...prev,
                        data_prevista_entrega: date ? format(date, 'yyyy-MM-dd') : ''
                      }));
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label className={labelClass}>Tipo de Entrega *</Label>
              <RadioGroup
                value={formData.tipo_entrega}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_entrega: value }))}
                className="grid grid-cols-3 gap-3"
                required
              >
                <label
                  htmlFor="tipo-instalacao"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200",
                    "border-2",
                    formData.tipo_entrega === "instalacao"
                      ? "bg-gradient-to-r from-blue-500/20 to-blue-600/10 border-blue-400/50 shadow-lg shadow-blue-500/20"
                      : "bg-blue-500/5 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/10"
                  )}
                >
                  <RadioGroupItem value="instalacao" id="tipo-instalacao" className="sr-only" />
                  <Wrench className={cn(
                    "w-5 h-5",
                    formData.tipo_entrega === "instalacao" ? "text-blue-400" : "text-blue-300/50"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    formData.tipo_entrega === "instalacao" ? "text-blue-100" : "text-blue-200/70"
                  )}>Instalação</span>
                </label>
                <label
                  htmlFor="tipo-entrega"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200",
                    "border-2",
                    formData.tipo_entrega === "entrega"
                      ? "bg-gradient-to-r from-blue-500/20 to-blue-600/10 border-blue-400/50 shadow-lg shadow-blue-500/20"
                      : "bg-blue-500/5 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/10"
                  )}
                >
                  <RadioGroupItem value="entrega" id="tipo-entrega" className="sr-only" />
                  <Truck className={cn(
                    "w-5 h-5",
                    formData.tipo_entrega === "entrega" ? "text-blue-400" : "text-blue-300/50"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    formData.tipo_entrega === "entrega" ? "text-blue-100" : "text-blue-200/70"
                  )}>Entrega</span>
                </label>
                <label
                  htmlFor="tipo-manutencao"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200",
                    "border-2",
                    formData.tipo_entrega === "manutencao"
                      ? "bg-gradient-to-r from-blue-500/20 to-blue-600/10 border-blue-400/50 shadow-lg shadow-blue-500/20"
                      : "bg-blue-500/5 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/10"
                  )}
                >
                  <RadioGroupItem value="manutencao" id="tipo-manutencao" className="sr-only" />
                  <Settings className={cn(
                    "w-5 h-5",
                    formData.tipo_entrega === "manutencao" ? "text-blue-400" : "text-blue-300/50"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    formData.tipo_entrega === "manutencao" ? "text-blue-100" : "text-blue-200/70"
                  )}>Manutenção</span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="observacoes_venda" className={labelClass}>Observações</Label>
              <Textarea
                id="observacoes_venda"
                value={formData.observacoes_venda}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes_venda: e.target.value }))}
                rows={3}
                placeholder="Informações adicionais sobre a venda..."
                className={textareaClass}
              />
            </div>

            <div className="md:col-span-3">
              <SophisticatedCheckbox
                id="venda_presencial"
                checked={formData.venda_presencial}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, venda_presencial: checked as boolean }))}
                label="Venda Presencial"
                description="+5% limite de desconto"
              />
            </div>
          </div>
        </Section>

        {/* Resumo */}
        {portas.length > 0 && (
          <>
            <VendaResumo 
              produtos={portas} 
              valorFrete={formData.valor_frete} 
              valorCredito={valorCredito}
              percentualCredito={percentualCredito}
              onRemoverCredito={() => {
                setValorCredito(0);
                setPercentualCredito(0);
                recalcularValorTotal(portas, 0);
              }}
            />
            
            {/* Indicador de Autorização Necessária */}
            {validacaoDescontoMemo.dentroDoLimite && (
              <div className={cn(sectionWrapperClass, "border-green-500/30")}>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-300">Venda Dentro do Limite</p>
                      <p className="text-xs text-green-400/70">
                        Desconto: {validacaoDescontoMemo.percentualDesconto.toFixed(1)}% (limite: {validacaoDescontoMemo.limitePermitido.toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {tipoAutorizacaoNecessariaMemo === 'responsavel_setor' && (
              <div className={cn(sectionWrapperClass, "border-amber-500/30")}>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-300">Autorização do Líder Necessária</p>
                      <p className="text-xs text-amber-400/70">
                        Desconto: {validacaoDescontoMemo.percentualDesconto.toFixed(1)}% (excede {validacaoDescontoMemo.excedente.toFixed(1)}%, limite: {validacaoDescontoMemo.limitePermitido.toFixed(0)}%)
                      </p>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">Responsável</Badge>
                  </div>
                </div>
              </div>
            )}
              
            {tipoAutorizacaoNecessariaMemo === 'master' && (
              <div className={cn(sectionWrapperClass, "border-orange-500/30")}>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
                      <ShieldCheck className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-300">Autorização Master Necessária</p>
                      <p className="text-xs text-orange-400/70">
                        Desconto: {validacaoDescontoMemo.percentualDesconto.toFixed(1)}% (excede {validacaoDescontoMemo.excedente.toFixed(1)}%, limite: {validacaoDescontoMemo.limitePermitido.toFixed(0)}%)
                      </p>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs">Master</Badge>
                  </div>
                </div>
              </div>
            )}
            
            {formData.valor_entrada > 0 && (
              <div className={sectionWrapperClass}>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Valor de Entrada</p>
                      <p className="text-lg font-bold text-green-400">R$ {formData.valor_entrada.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Valor a Receber</p>
                      <p className="text-lg font-bold text-orange-400">R$ {formData.valor_a_receber?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ações */}
        <div className="flex flex-wrap justify-end gap-3 pt-4">
          <GradientButton 
            variant="ghost"
            onClick={() => navigate('/vendas/minhas-vendas')}
          >
            Cancelar
          </GradientButton>
          
          {portas.length > 0 && valorCredito === 0 && (
            <GradientButton 
              variant="outline"
              onClick={() => setDescontoModalOpen(true)}
            >
              <Percent className="w-4 h-4 mr-2" />
              Adicionar Desconto
            </GradientButton>
          )}
          
          {portas.length > 0 && validarDesconto(portas, formData.forma_pagamento, formData.venda_presencial).dentroDoLimite && !portas.some(p => (p.desconto_valor || 0) > 0 || (p.desconto_percentual || 0) > 0) && (
            <GradientButton 
              variant="outline"
              onClick={() => setCreditoModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {valorCredito > 0 ? 'Editar Crédito' : 'Adicionar Crédito'}
            </GradientButton>
          )}

          <GradientButton 
            variant="outline"
            disabled={isCreatingRascunho || !formData.cliente_nome}
            onClick={async () => {
              try {
                await createRascunho({
                  vendaData: {
                    ...formData,
                    forma_pagamento: pagamentoData.metodos[0]?.tipo || '',
                    data_venda: `${format(dataVenda, 'yyyy-MM-dd')}T12:00:00.000Z`,
                  },
                  portas,
                  pagamentoData,
                  creditoVenda: { valorCredito, percentualCredito }
                });
                navigate('/vendas/minhas-vendas');
              } catch (error) {
                console.error('Erro ao salvar rascunho:', error);
              }
            }}
          >
            {isCreatingRascunho ? 'Salvando...' : 'Salvar Rascunho'}
          </GradientButton>
          
          <GradientButton 
            type="submit" 
            variant="blue"
            disabled={isCreating || portas.length === 0}
          >
            {isCreating ? 'Criando...' : 'Criar Venda'}
          </GradientButton>
        </div>
      </form>

      {/* Modais */}
      <DescontoVendaModal
        open={descontoModalOpen}
        onOpenChange={setDescontoModalOpen}
        produtos={portas}
        onAplicarDesconto={handleAplicarDesconto}
        formaPagamento={formData.forma_pagamento}
        vendaPresencial={formData.venda_presencial}
      />

      <CreditoVendaModal
        open={creditoModalOpen}
        onOpenChange={setCreditoModalOpen}
        valorTotalVenda={recalcularValorTotal(portas, 0) - (formData.valor_frete || 0)}
        temDesconto={portas.some(p => (p.desconto_valor || 0) > 0 || (p.desconto_percentual || 0) > 0)}
        valorCreditoAtual={valorCredito}
        percentualCreditoAtual={percentualCredito}
        onAplicarCredito={handleAplicarCredito}
      />

      {tipoAutorizacaoNecessaria && (
        <AutorizacaoDescontoModal
          open={autorizacaoDescontoOpen}
          onOpenChange={setAutorizacaoDescontoOpen}
          onAutorizado={handleAutorizacaoDesconto}
          percentualDesconto={validarDesconto(portas, formData.forma_pagamento, formData.venda_presencial).percentualDesconto}
          tipoAutorizacao={tipoAutorizacaoNecessaria}
          limitePermitido={limitePermitido}
        />
      )}

      {portaRecemAdicionada && (
        <PinturaRapidaModal
          open={pinturaRapidaOpen}
          onOpenChange={setPinturaRapidaOpen}
          largura={portaRecemAdicionada.largura}
          altura={portaRecemAdicionada.altura}
          onConfirm={handleAddPinturaRapida}
          onSkip={() => setPortaRecemAdicionada(null)}
        />
      )}

      <PinturaItemCatalogoModal
        open={pinturaItemModalOpen}
        onOpenChange={setPinturaItemModalOpen}
        portas={portas}
        onConfirm={(pinturas) => {
          setPortas(prev => {
            const newPortas = [...prev, ...pinturas];
            const valorTotal = recalcularValorTotal(newPortas);
            setFormData(prevForm => ({
              ...prevForm,
              valor_venda: valorTotal,
            }));
            return newPortas;
          });
        }}
      />
    </MinimalistLayout>
  );
}
