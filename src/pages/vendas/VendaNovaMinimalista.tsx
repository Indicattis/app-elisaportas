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
import { Plus, CalendarIcon, CheckCircle2, ShieldCheck, Lock, Package, CreditCard, FileText, Truck, Wrench, Settings, Building2, MapPin } from 'lucide-react';
import { ProdutoVendaForm } from '@/components/vendas/ProdutoVendaForm';
import { ProdutosVendaTable } from '@/components/vendas/ProdutosVendaTable';
import { VendaResumo } from '@/components/vendas/VendaResumo';
import { ResumoDescontosSection } from '@/components/vendas/ResumoDescontosSection';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SelecionarAcessoriosModal } from '@/components/vendas/SelecionarAcessoriosModal';
import { CreditoVendaModal } from '@/components/vendas/CreditoVendaModal';
import { AutorizacaoDescontoModal } from '@/components/vendas/AutorizacaoDescontoModal';
import { DescontoAcrescimoSection, AjusteGlobal } from '@/components/vendas/DescontoAcrescimoSection';
import { PinturaRapidaModal } from '@/components/vendas/PinturaRapidaModal';
import { PinturaItemCatalogoModal } from '@/components/vendas/PinturaItemCatalogoModal';
import { validarDesconto, getTipoAutorizacaoNecessaria, ConfigLimites } from '@/utils/descontoVendasRules';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { useRegrasVendas } from '@/hooks/useRegrasVendas';
import { useAuth } from '@/hooks/useAuth';
import { useFretesCidades } from '@/hooks/useFretesCidades';
import { calcularFretePorPorta, FRETE_POR_PORTA_REGIAO } from '@/utils/fretePorPorta';
import { useFretePorPortaRegiao } from '@/hooks/useFretePorPortaRegiao';
import { getRegiao } from '@/utils/regioesBrasil';
import { Checkbox } from '@/components/ui/checkbox';
import { PagamentoSection, PagamentoData, createEmptyPagamentoData } from '@/components/vendas/PagamentoSection';
import { ComprovantesUploadBlock } from '@/components/vendas/ComprovantesUploadBlock';
import { validarRegraBoleto } from '@/utils/boletoRegra';
import { validarDatasPagamento } from '@/utils/dataPagamentoRegra';
import { ClienteVendaSection } from '@/components/vendas/ClienteVendaSection';
import { MinimalistLayout } from '@/components/MinimalistLayout';

// Estilos alinhados ao padrão de /vendas/minhas-vendas (glass branco neutro).
const sectionWrapperClass = "p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10";
const cardClass = "bg-transparent border-0 shadow-none";
const labelClass = "text-xs font-semibold text-white/60 uppercase tracking-wider";
const inputClass = "h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-white/30 focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all";
const textareaClass = "bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-white/30 focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all resize-none";

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className={sectionWrapperClass}>
    <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const ProductButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 w-full"
  >
    <Plus className="w-4 h-4 text-blue-400 group-hover:text-blue-300 shrink-0" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const SophisticatedCheckbox = ({ id, checked, onCheckedChange, label, description }: { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void; label: string; description?: string }) => (
  <label
    htmlFor={id}
    className={cn(
      "flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
      checked
        ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
    )}
  >
    <div className={cn(
      "flex items-center justify-center w-5 h-5 rounded border-2 transition-all",
      checked ? "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 shadow-lg shadow-blue-500/50" : "bg-transparent border-white/30"
    )}>
      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </div>
    <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} className="sr-only" />
    <div className="flex-1">
      <span className="text-sm font-medium text-white">{label}</span>
      {description && <span className="text-xs text-white/60 ml-2">{description}</span>}
    </div>
  </label>
);

const GradientButton = ({ children, onClick, variant = 'blue', className: extraClassName = '', type = 'button', disabled = false, size = 'default' }: { children: React.ReactNode; onClick?: () => void; variant?: 'blue' | 'amber' | 'outline' | 'ghost'; className?: string; type?: 'button' | 'submit'; disabled?: boolean; size?: 'sm' | 'default' }) => {
  const baseClass = size === 'sm' ? "h-9 px-4 text-sm" : "h-11 px-5";
  if (variant === 'outline') {
    return (<button type={type} onClick={onClick} disabled={disabled} className={cn(baseClass, "rounded-lg font-medium border border-white/15 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 hover:border-blue-400/50 transition-all duration-200 disabled:opacity-50", extraClassName)}>{children}</button>);
  }
  if (variant === 'ghost') {
    return (<button type={type} onClick={onClick} disabled={disabled} className={cn(baseClass, "rounded-lg font-medium text-white/60 hover:bg-blue-500/10 hover:text-blue-200 transition-all duration-200 disabled:opacity-50", extraClassName)}>{children}</button>);
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
  const rascunhoId = searchParams.get('rascunhoId');
  const { toast } = useToast();
  const { createVenda, isCreating, createRascunho, isCreatingRascunho, deleteVenda } = useVendas();
  const { user } = useAuth();
  const { limites: configLimites } = useConfiguracoesVendas();
  const { limites: regrasLimites } = useRegrasVendas();
  const boletoConfig = regrasLimites.boleto;
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
    numero: '',
    publico_alvo: '',
    forma_pagamento: '',
    observacoes_venda: '',
    valor_frete: 0,
    valor_entrada: 0,
    valor_a_receber: 0,
    data_prevista_entrega: '',
    tipo_entrega: 'instalacao',
    tipo_frete: 'interno',
    temperatura: null as boolean | null
  });

  // Toggle: propagar alterações desta venda para o cadastro central do cliente.
  // Ativado por padrão para preservar o comportamento anterior.
  const [atualizarCadastroCliente, setAtualizarCadastroCliente] = useState(true);

  const [portas, setPortas] = useState<ProdutoVenda[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVenda | undefined>(undefined);
  const [indexEditando, setIndexEditando] = useState<number | undefined>(undefined);
  const [tipoInicial, setTipoInicial] = useState<'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao' | undefined>(undefined);
  const [permitirTrocaTipo, setPermitirTrocaTipo] = useState(true);
  const [creditoModalOpen, setCreditoModalOpen] = useState(false);
  const [autorizacaoDescontoOpen, setAutorizacaoDescontoOpen] = useState(false);
  const [produtosComDesconto, setProdutosComDesconto] = useState<ProdutoVenda[]>([]);
  const [autorizadorId, setAutorizadorId] = useState<string | null>(null);
  const [tipoAutorizacaoNecessaria, setTipoAutorizacaoNecessaria] = useState<'responsavel_setor' | 'master' | null>(null);
  const [limitePermitido, setLimitePermitido] = useState<number>(10);

  // Autorização concedida ao APLICAR o ajuste global (evita re-prompt no submit).
  const [autorizacaoAjuste, setAutorizacaoAjuste] = useState<{
    autorizadorId: string;
    senha: string;
    tipo: 'responsavel_setor' | 'master';
    percentualAutorizado: number;
  } | null>(null);

  // Modal de autorização disparado pela seção de Desconto/Acréscimo.
  const [aplicarAjusteAutorizacaoOpen, setAplicarAjusteAutorizacaoOpen] = useState(false);
  const [pendingAjusteRascunho, setPendingAjusteRascunho] = useState<AjusteGlobal | null>(null);
  const [pendingAjusteValidacao, setPendingAjusteValidacao] = useState<{
    percentual: number;
    limite: number;
    tipo: 'responsavel_setor' | 'master';
  } | null>(null);
  
  const [valorCredito, setValorCredito] = useState<number>(0);
  const [percentualCredito, setPercentualCredito] = useState<number>(0);

  const [pinturaRapidaOpen, setPinturaRapidaOpen] = useState(false);
  const [portaRecemAdicionada, setPortaRecemAdicionada] = useState<{largura: number, altura: number} | null>(null);
  const [pinturaItemModalOpen, setPinturaItemModalOpen] = useState(false);

  const [pagamentoData, setPagamentoData] = useState<PagamentoData>(createEmptyPagamentoData());
  const [comprovantes, setComprovantes] = useState<File[]>([]);

  // Autorização do Gerente para liberar regras de pagamento
  // (entrada de boleto, data de pagamento, intervalo de boletos).
  const [pagamentoOverride, setPagamentoOverride] = useState<{ autorizadorId: string; senha: string } | null>(null);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);

  const [ajusteGlobal, setAjusteGlobal] = useState<AjusteGlobal>({
    tipo: 'desconto',
    unidade: '%',
    valor: 0,
  });

  // Justificativa livre do desconto aplicado (Resumo dos descontos).
  const [justificativaDesconto, setJustificativaDesconto] = useState('');

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

  // Hidratação de rascunho para conversão em venda
  const { data: rascunhoData, isLoading: isLoadingRascunho } = useQuery({
    queryKey: ['rascunho-para-conversao', rascunhoId],
    enabled: !!rascunhoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*, produtos_vendas(*)')
        .eq('id', rascunhoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const isFromRascunho = !!rascunhoId && !!rascunhoData;

  useEffect(() => {
    if (!rascunhoData) return;
    const r: any = rascunhoData;
    setFormData((prev) => ({
      ...prev,
      cliente_nome: r.cliente_nome || '',
      cliente_telefone: r.cliente_telefone || '',
      cliente_email: r.cliente_email || '',
      cpf_cliente: r.cpf_cliente || '',
      estado: r.estado || '',
      cidade: r.cidade || '',
      cep: r.cep || '',
      bairro: r.bairro || '',
      endereco: r.endereco || '',
      numero: r.numero || '',
      publico_alvo: r.publico_alvo || '',
      canal_aquisicao_id: r.canal_aquisicao_id || '',
      observacoes_venda: r.observacoes_venda || '',
      forma_pagamento: r.metodo_pagamento || '',
      valor_frete: Number(r.valor_frete) || 0,
      valor_entrada: Number(r.valor_entrada) || 0,
      valor_a_receber: Number(r.valor_a_receber) || 0,
      data_prevista_entrega: r.data_prevista_entrega || '',
      tipo_entrega: r.tipo_entrega || 'instalacao',
      tipo_frete: r.tipo_frete || 'interno',
      temperatura: typeof r.temperatura === 'boolean' ? r.temperatura : null,
      cliente_id: r.cliente_id || undefined,
    }));
    if (typeof r.justificativa_desconto === 'string') {
      setJustificativaDesconto(r.justificativa_desconto);
    }
    if (r.data_venda) {
      try { setDataVenda(new Date(r.data_venda)); } catch {}
    }
    if (r.data_prevista_entrega) {
      try { setDataEntrega(new Date(r.data_prevista_entrega)); } catch {}
    }

    // Produtos: preserva todas as linhas como estão no banco, incluindo
    // linhas independentes de instalação (tipo_produto='instalacao') e pintura.
    const raw = (r.produtos_vendas || []) as any[];
    const portasHidratadas: ProdutoVenda[] = raw.map((p) => ({
      id: p.id,
      tipo_produto: p.tipo_produto,
      tamanho: p.tamanho || '',
      largura: p.largura ?? undefined,
      altura: p.altura ?? undefined,
      cor_id: p.cor_id || '',
      acessorio_id: p.acessorio_id || '',
      adicional_id: p.adicional_id || '',
      tabela_precos_porta_id: p.tabela_precos_porta_id || null,
      valor_produto: Number(p.valor_produto) || 0,
      valor_pintura: Number(p.valor_pintura) || 0,
      valor_instalacao: Number(p.valor_instalacao) || 0,
      valor_frete: Number(p.valor_frete) || 0,
      tipo_desconto: (p.tipo_desconto as any) || 'percentual',
      desconto_percentual: Number(p.desconto_percentual) || 0,
      desconto_valor: Number(p.desconto_valor) || 0,
      quantidade: Number(p.quantidade) || 1,
      descricao: p.descricao || '',
      valor_credito: Number(p.valor_credito) || 0,
      percentual_credito: Number(p.percentual_credito) || 0,
      observacao_item: p.observacao_item || null,
    }) as ProdutoVenda);
    setPortas(portasHidratadas);

    // Snapshot de pagamento
    const snap = r.rascunho_pagamento;
    if (snap && typeof snap === 'object') {
      const metodosNorm = (snap.metodos || []).map((m: any) => ({
        tipo: m.tipo || '',
        valor: Number(m.valor) || 0,
        data_pagamento: m.data_pagamento ? new Date(m.data_pagamento) : undefined,
        empresa_receptora_id: m.empresa_receptora_id || '',
        parcelas_cartao: Number(m.parcelas_cartao) || 1,
        parcelas_boleto: Number(m.parcelas_boleto) || 1,
        intervalo_boletos: Number(m.intervalo_boletos) || 21,
        ja_pago: !!m.ja_pago,
      }));
      while (metodosNorm.length < 2) metodosNorm.push({
        tipo: '', valor: 0, data_pagamento: undefined, empresa_receptora_id: '',
        parcelas_cartao: 1, parcelas_boleto: 1, intervalo_boletos: 21, ja_pago: false,
      });
      setPagamentoData({
        usar_dois_metodos: !!snap.usar_dois_metodos,
        pagamento_na_entrega: !!snap.pagamento_na_entrega,
        metodos: [metodosNorm[0], metodosNorm[1]] as any,
      });
      if (snap.credito) {
        setValorCredito(Number(snap.credito.valor) || 0);
        setPercentualCredito(Number(snap.credito.percentual) || 0);
      }
    }
    // Ajuste global (desconto/acréscimo)
    const ag = (snap && typeof snap === 'object') ? snap.ajuste_global : null;
    if (ag && typeof ag === 'object') {
      setAjusteGlobal({
        tipo: ag.tipo === 'acrescimo' ? 'acrescimo' : 'desconto',
        unidade: ag.unidade === 'R$' ? 'R$' : '%',
        valor: Number(ag.valor) || 0,
      });
    }
  }, [rascunhoData]);

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
          observacao_item: p.observacao_item || null,
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
  const subtotalProdutosMemo = useMemo(() => {
    return portas.reduce((acc, p) => {
      const valorBase = (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1);
      const desconto = p.tipo_desconto === 'valor' ? (p.desconto_valor || 0) : valorBase * ((p.desconto_percentual || 0) / 100);
      const credito = (p.valor_credito || 0) * (p.quantidade || 1);
      return acc + valorBase - desconto + credito;
    }, 0);
  }, [portas]);

  // Aplica o ajuste global (desconto/acréscimo) sobre o subtotal de produtos
  const valorAjusteGlobalSigned = useMemo(() => {
    if (!ajusteGlobal.valor || ajusteGlobal.valor <= 0) return 0;
    const abs = ajusteGlobal.unidade === '%'
      ? Math.max(0, subtotalProdutosMemo) * (ajusteGlobal.valor / 100)
      : ajusteGlobal.valor;
    return ajusteGlobal.tipo === 'desconto' ? -abs : abs;
  }, [ajusteGlobal, subtotalProdutosMemo]);

  const valorTotalMemo = useMemo(() => {
    return subtotalProdutosMemo + valorAjusteGlobalSigned + (formData.valor_frete || 0) + valorCredito;
  }, [subtotalProdutosMemo, valorAjusteGlobalSigned, formData.valor_frete, valorCredito]);

  // Preço tabelado (soma dos produtos SEM qualquer desconto/ajuste global).
  const precoTabeladoMemo = useMemo(() => {
    return portas.reduce((acc, p) => {
      const base = (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1);
      return acc + base;
    }, 0);
  }, [portas]);

  // Preço final dos produtos (após descontos linha a linha e ajuste global), sem frete/crédito.
  const precoFinalProdutosMemo = useMemo(() => {
    return Math.max(0, subtotalProdutosMemo + valorAjusteGlobalSigned);
  }, [subtotalProdutosMemo, valorAjusteGlobalSigned]);

  // Distribui o ajuste global proporcionalmente entre as portas (usado em validação e submit)
  const portasComAjusteGlobal = useMemo<ProdutoVenda[]>(() => {
    if (!ajusteGlobal.valor || ajusteGlobal.valor <= 0 || portas.length === 0) return portas;
    const ajusteAbs = ajusteGlobal.unidade === '%'
      ? Math.max(0, subtotalProdutosMemo) * (ajusteGlobal.valor / 100)
      : ajusteGlobal.valor;
    const sinal = ajusteGlobal.tipo === 'desconto' ? 1 : -1; // soma positiva ao desconto = desconto; negativo = acréscimo
    const ajusteSigned = ajusteAbs * sinal;

    // pesos proporcionais por valor base (sem desconto)
    const bases = portas.map(p => (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1));
    const totalBase = bases.reduce((a, b) => a + b, 0);
    if (totalBase <= 0) return portas;

    return portas.map((p, i) => {
      const parcela = ajusteSigned * (bases[i] / totalBase);
      const descontoBase = p.tipo_desconto === 'valor'
        ? (p.desconto_valor || 0)
        : bases[i] * ((p.desconto_percentual || 0) / 100);
      return {
        ...p,
        tipo_desconto: 'valor' as const,
        desconto_percentual: 0,
        desconto_valor: descontoBase + parcela,
      };
    });
  }, [portas, ajusteGlobal, subtotalProdutosMemo]);

  // Mantém valor_a_receber alinhado com o total (cobre alterações do ajuste global)
  useEffect(() => {
    setFormData(prev => {
      const novo = valorTotalMemo - (prev.valor_entrada || 0);
      if (prev.valor_a_receber === novo) return prev;
      return { ...prev, valor_a_receber: novo };
    });
  }, [valorTotalMemo]);

  const configLimitesObj: ConfigLimites = useMemo(() => ({
    avista: configLimites.avista,
    presencial: configLimites.presencial,
    adicionalResponsavel: configLimites.adicionalResponsavel
  }), [configLimites]);

  // A forma de pagamento exibida/escolhida pelo usuário vive em `pagamentoData.metodos[0]`.
  // `formData.forma_pagamento` só é preenchido no submit, então a validação de desconto
  // precisa derivar da seleção atual para refletir mudanças em tempo real.
  const formaPagamentoAtual = useMemo(
    () => pagamentoData.metodos[0]?.tipo || formData.forma_pagamento || '',
    [pagamentoData.metodos, formData.forma_pagamento]
  );

  const validacaoDescontoMemo = useMemo(() => {
    return validarDesconto(portasComAjusteGlobal, formaPagamentoAtual, formData.temperatura === false, configLimitesObj);
  }, [portasComAjusteGlobal, formaPagamentoAtual, formData.temperatura, configLimitesObj]);

  const tipoAutorizacaoNecessariaMemo = useMemo(() => {
    return getTipoAutorizacaoNecessaria(validacaoDescontoMemo);
  }, [validacaoDescontoMemo]);

  // Aplica um rascunho de ajuste global. Se exigir autorização, abre o modal.
  const aplicarAjusteGlobal = (rascunho: AjusteGlobal) => {
    try {
      console.log('[VendaNova] aplicarAjusteGlobal ->', {
        rascunho,
        portasLen: portas.length,
        subtotalProdutosMemo,
        formaPagamentoAtual,
        temperatura: formData.temperatura,
        configLimitesObj,
      });
    // Acréscimo, ou valor zero — sem validação.
    if (rascunho.tipo === 'acrescimo' || !rascunho.valor || rascunho.valor <= 0) {
      setAjusteGlobal(rascunho);
      setAutorizacaoAjuste(null);
      return;
    }

    // Simula portas com o rascunho aplicado para validar percentual real.
    const ajusteAbs = rascunho.unidade === '%'
      ? Math.max(0, subtotalProdutosMemo) * (rascunho.valor / 100)
      : rascunho.valor;
    const bases = portas.map(p => (p.valor_produto + p.valor_pintura + p.valor_instalacao) * (p.quantidade || 1));
    const totalBase = bases.reduce((a, b) => a + b, 0);
    const portasSimuladas: ProdutoVenda[] = totalBase > 0
      ? portas.map((p, i) => {
          const parcela = ajusteAbs * (bases[i] / totalBase);
          const descontoBase = p.tipo_desconto === 'valor'
            ? (p.desconto_valor || 0)
            : bases[i] * ((p.desconto_percentual || 0) / 100);
          return {
            ...p,
            tipo_desconto: 'valor' as const,
            desconto_percentual: 0,
            desconto_valor: descontoBase + parcela,
          };
        })
      : portas;

    const validacao = validarDesconto(
      portasSimuladas,
      formaPagamentoAtual,
      formData.temperatura === false,
      configLimitesObj
    );

    if (validacao.dentroDoLimite) {
      setAjusteGlobal(rascunho);
      setAutorizacaoAjuste(null);
      return;
    }

    const tipoAuth = getTipoAutorizacaoNecessaria(validacao);
    if (!tipoAuth) {
      setAjusteGlobal(rascunho);
      setAutorizacaoAjuste(null);
      return;
    }

    setPendingAjusteRascunho(rascunho);
    setPendingAjusteValidacao({
      percentual: validacao.percentualDesconto,
      limite: validacao.limitePermitido,
      tipo: tipoAuth,
    });
    setAplicarAjusteAutorizacaoOpen(true);
    } catch (e) {
      console.error('[VendaNova] aplicarAjusteGlobal falhou:', e);
      throw e;
    }
  };

  const limparAjusteGlobal = () => {
    setAjusteGlobal({ tipo: 'desconto', unidade: '%', valor: 0 });
    setAutorizacaoAjuste(null);
  };

  const handleAjusteAutorizado = (autorizadorUserId: string, senhaDigitada: string) => {
    if (!pendingAjusteRascunho || !pendingAjusteValidacao) return;
    setAjusteGlobal(pendingAjusteRascunho);
    setAutorizacaoAjuste({
      autorizadorId: autorizadorUserId,
      senha: senhaDigitada,
      tipo: pendingAjusteValidacao.tipo,
      percentualAutorizado: pendingAjusteValidacao.percentual,
    });
    setPendingAjusteRascunho(null);
    setPendingAjusteValidacao(null);
  };

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
    if (formData.tipo_frete === 'interno' && freteSugerido && formData.valor_frete !== freteSugerido.valor_frete) {
      setFormData(prev => ({ ...prev, valor_frete: freteSugerido.valor_frete }));
    }
  }, [freteSugerido?.valor_frete, formData.tipo_frete]);

  // Quantidade total de PORTAS (ignora pintura, instalação, acessórios e itens avulsos).
  const qtdPortasFrete = useMemo(
    () => portas
      .filter(p => p.tipo_produto === 'porta_enrolar' || p.tipo_produto === 'porta_social')
      .reduce((s, p) => s + (p.quantidade || 1), 0),
    [portas]
  );

  const { tabela: fretePorPortaTabela } = useFretePorPortaRegiao();
  const fretePorPortaCalc = useMemo(
    () => calcularFretePorPorta(formData.estado, qtdPortasFrete, fretePorPortaTabela),
    [formData.estado, qtdPortasFrete, fretePorPortaTabela]
  );

  // Auto-calcula valor do frete quando 'por_porta' está selecionado.
  useEffect(() => {
    if (formData.tipo_frete !== 'por_porta') return;
    const total = fretePorPortaCalc?.total ?? 0;
    if (formData.valor_frete !== total) {
      setFormData(prev => ({ ...prev, valor_frete: total }));
    }
  }, [formData.tipo_frete, fretePorPortaCalc?.total]);

  // Frete "por conta do cliente" (transportadora): sempre 0, pois Elisa não cobra.
  useEffect(() => {
    if (formData.tipo_frete === 'transportadora' && formData.valor_frete !== 0) {
      setFormData(prev => ({ ...prev, valor_frete: 0 }));
    }
  }, [formData.tipo_frete, formData.valor_frete]);

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
    if (!(novaQuantidade > 0)) return;
    
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

  const handleSalvarRascunho = async () => {
    if (isFromRascunho) {
      toast({
        title: 'Rascunho já existe',
        description: 'Você está convertendo este rascunho em venda. Para salvar novamente como rascunho, cancele e crie um novo.',
      });
      return;
    }
    try {
      const rascunho = await createRascunho({
        vendaData: {
          ...formData,
          forma_pagamento: pagamentoData.metodos[0]?.tipo || formData.forma_pagamento || '',
          data_venda: `${format(dataVenda, 'yyyy-MM-dd')}T12:00:00.000Z`,
          data_prevista_entrega: dataEntrega ? `${format(dataEntrega, 'yyyy-MM-dd')}T12:00:00.000Z` : undefined,
          atualizar_cadastro_cliente: atualizarCadastroCliente,
          justificativa_desconto: justificativaDesconto || null,
        },
        portas,
        pagamentoData,
        creditoVenda: { valorCredito, percentualCredito },
        ajusteGlobal,
      } as any);
      const novoId = (rascunho as any)?.id;
      if (novoId) navigate(`/vendas/minhas-vendas/rascunho/${novoId}`);
      else navigate('/vendas/minhas-vendas');
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    }
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

    // Temperatura da venda (Frio/Quente)
    if (formData.temperatura === null || formData.temperatura === undefined) {
      faltantes.push('Temperatura da venda (Frio ou Quente)');
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

    // Regra do boleto: 70% entrada à vista + 30% boleto com 21 dias
    const regraBoleto = validarRegraBoleto(pagamentoData, valorTotalMemo, boletoConfig);
    if (regraBoleto.ok === false && !pagamentoOverride) {
      sonnerToast.error('Regra do boleto não atendida', {
        description: regraBoleto.mensagem,
        duration: 6000,
      });
      return;
    }

    // Regra da janela de data de pagamento (±N dias)
    const regraDataPag = validarDatasPagamento(pagamentoData, regrasLimites.pagamentoDataJanelaDias);
    if (regraDataPag.ok === false && !pagamentoOverride) {
      sonnerToast.error('Data de pagamento fora da janela permitida', {
        description: regraDataPag.mensagem,
        duration: 6000,
      });
      return;
    }

    const validacao = validarDesconto(
      portasComAjusteGlobal,
      formaPagamentoAtual,
      formData.temperatura === false,
      configLimitesObj
    );

    const tipoAutorizacao = getTipoAutorizacaoNecessaria(validacao);
    if (tipoAutorizacao) {
      // Se o usuário já autorizou esse desconto no momento de Aplicar, reusa.
      if (
        autorizacaoAjuste &&
        user &&
        validacao.percentualDesconto <= autorizacaoAjuste.percentualAutorizado + 0.01 &&
        (autorizacaoAjuste.tipo === tipoAutorizacao || autorizacaoAjuste.tipo === 'master')
      ) {
        try {
          await createVenda({
            vendaData: {
              ...formData,
              forma_pagamento: pagamentoData.metodos[0]?.tipo || '',
              data_venda: `${format(dataVenda, 'yyyy-MM-dd')}T12:00:00.000Z`,
              atualizar_cadastro_cliente: atualizarCadastroCliente,
              justificativa_desconto: justificativaDesconto || null,
            },
            portas: portasComAjusteGlobal,
            pagamentoData,
            autorizacaoDesconto: {
              autorizado_por: autorizacaoAjuste.autorizadorId,
              solicitado_por: user.id,
              percentual_desconto: validacao.percentualDesconto,
              senha_usada: autorizacaoAjuste.senha,
              tipo_autorizacao: autorizacaoAjuste.tipo,
            },
            autorizacaoRegraPagamento: pagamentoOverride && user
              ? {
                  autorizado_por: pagamentoOverride.autorizadorId,
                  solicitado_por: user.id,
                  senha_usada: pagamentoOverride.senha,
                }
              : undefined,
            creditoVenda: { valorCredito: 0, percentualCredito: 0 },
            comprovantes,
          });
          if (rascunhoId) { try { await deleteVenda(rascunhoId); } catch (e) { console.error('Falha ao excluir rascunho:', e); } }
          navigate('/vendas/minhas-vendas');
        } catch (error) {
          console.error('Erro ao criar venda:', error);
        }
        return;
      }

      setProdutosComDesconto(portasComAjusteGlobal);
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
          atualizar_cadastro_cliente: atualizarCadastroCliente,
          justificativa_desconto: justificativaDesconto || null,
        },
        portas: portasComAjusteGlobal,
        pagamentoData,
        autorizacaoRegraPagamento: pagamentoOverride && user
          ? {
              autorizado_por: pagamentoOverride.autorizadorId,
              solicitado_por: user.id,
              senha_usada: pagamentoOverride.senha,
            }
          : undefined,
        creditoVenda: { valorCredito, percentualCredito }
        ,
        comprovantes
      });
      if (rascunhoId) { try { await deleteVenda(rascunhoId); } catch (e) { console.error('Falha ao excluir rascunho:', e); } }
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
        formaPagamentoAtual,
        formData.temperatura === false,
        configLimitesObj
      );

      await createVenda({ 
        vendaData: {
          ...formData,
          forma_pagamento: pagamentoData.metodos[0]?.tipo || '',
          data_venda: `${format(dataVenda, 'yyyy-MM-dd')}T12:00:00.000Z`,
          atualizar_cadastro_cliente: atualizarCadastroCliente,
          justificativa_desconto: justificativaDesconto || null,
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
        autorizacaoRegraPagamento: pagamentoOverride
          ? {
              autorizado_por: pagamentoOverride.autorizadorId,
              solicitado_por: user.id,
              senha_usada: pagamentoOverride.senha,
            }
          : undefined,
        creditoVenda: { valorCredito: 0, percentualCredito: 0 }
        ,
        comprovantes
      });
      if (rascunhoId) { try { await deleteVenda(rascunhoId); } catch (e) { console.error('Falha ao excluir rascunho:', e); } }
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
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Vendas', path: '/vendas' },
        { label: 'Minhas Vendas', path: '/vendas/minhas-vendas' },
        { label: 'Nova Venda' },
      ]}
    >
      {isLoadingOrcamento && orcamentoId && (
        <div className="text-center py-8 text-white/60">
          Carregando dados do orçamento...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
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
            numero: (formData as any).numero || '',
            bairro: formData.bairro,
            canal_aquisicao_id: formData.canal_aquisicao_id || '',
            publico_alvo: formData.publico_alvo,
          }}
          onChange={(dados) => setFormData(prev => ({ ...prev, ...dados }))}
          onClienteSelecionado={(cliente) => {
            setFormData(prev => ({ ...prev, cliente_id: cliente?.id }));
          }}
          disabled={isFromOrcamento}
          initialClienteId={isFromRascunho ? formData.cliente_id : undefined}
          atualizarCadastroCliente={atualizarCadastroCliente}
          onToggleAtualizarCadastro={setAtualizarCadastroCliente}
        />

        {/* Produtos */}
        <Section title="Produtos" icon={Package}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
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
          vendaPresencial={formData.temperatura}
          onVendaPresencialChange={(v) => setFormData(prev => ({ ...prev, temperatura: v }))}
          descontoInfo={{
            percentualAplicado: validacaoDescontoMemo.percentualDesconto,
            limitePermitido: validacaoDescontoMemo.limitePermitido,
            limiteMaximo: validacaoDescontoMemo.limiteMaximoResponsavel ?? validacaoDescontoMemo.limitePermitido,
          }}
          hideEmpresaReceptora
          onOverrideChange={setPagamentoOverride}
          onConfirmadoChange={setPagamentoConfirmado}
        />

        {/* Comprovantes de pagamento (opcionais) */}
        <ComprovantesUploadBlock
          files={comprovantes}
          onChange={setComprovantes}
          obrigatorio={false}
        />

        {/* Desconto / Acréscimo Global */}
        <DescontoAcrescimoSection
          ajusteAplicado={ajusteGlobal}
          onAplicar={aplicarAjusteGlobal}
          onLimpar={limparAjusteGlobal}
          valorBase={subtotalProdutosMemo}
          disabled={valorCredito > 0 && ajusteGlobal.tipo === 'desconto'}
          disabledReason={valorCredito > 0 ? 'Desconto indisponível: existe crédito aplicado à venda.' : undefined}
        />

        {/* Informações de Entrega */}
        <Section title="Informações de Entrega" icon={Truck}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelClass}>Tipo de Entrega *</Label>
              <RadioGroup
                value={formData.tipo_entrega}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_entrega: value }))}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
                required
              >
                <label
                  htmlFor="tipo-instalacao"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
                    formData.tipo_entrega === "instalacao"
                      ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <RadioGroupItem value="instalacao" id="tipo-instalacao" className="sr-only" />
                  <Wrench className={cn("w-5 h-5", formData.tipo_entrega === "instalacao" ? "text-blue-400" : "text-white/40")} />
                  <span className={cn("text-sm font-medium", formData.tipo_entrega === "instalacao" ? "text-white" : "text-white/70")}>Instalação</span>
                </label>
                <label
                  htmlFor="tipo-entrega"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
                    formData.tipo_entrega === "entrega"
                      ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <RadioGroupItem value="entrega" id="tipo-entrega" className="sr-only" />
                  <Truck className={cn("w-5 h-5", formData.tipo_entrega === "entrega" ? "text-blue-400" : "text-white/40")} />
                  <span className={cn("text-sm font-medium", formData.tipo_entrega === "entrega" ? "text-white" : "text-white/70")}>Entrega</span>
                </label>
                <label
                  htmlFor="tipo-manutencao"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
                    formData.tipo_entrega === "manutencao"
                      ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <RadioGroupItem value="manutencao" id="tipo-manutencao" className="sr-only" />
                  <Settings className={cn("w-5 h-5", formData.tipo_entrega === "manutencao" ? "text-blue-400" : "text-white/40")} />
                  <span className={cn("text-sm font-medium", formData.tipo_entrega === "manutencao" ? "text-white" : "text-white/70")}>Manutenção</span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Tipo de Frete *</Label>
              <RadioGroup
                value={formData.tipo_frete || 'interno'}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  tipo_frete: value as 'interno' | 'transportadora' | 'por_porta',
                  // Ao trocar para transportadora, zera para preenchimento manual.
                  // Para 'por_porta', o valor é recalculado pelo useEffect.
                  valor_frete: value === 'transportadora' ? 0 : prev.valor_frete,
                }))}
                className="grid grid-cols-3 gap-3"
                required
              >
                <label
                  htmlFor="frete-interno"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
                    (formData.tipo_frete || 'interno') === 'interno'
                      ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <RadioGroupItem value="interno" id="frete-interno" className="sr-only" />
                  <Truck className={cn("w-5 h-5", (formData.tipo_frete || 'interno') === 'interno' ? "text-blue-400" : "text-white/40")} />
                  <span className={cn("text-sm font-medium", (formData.tipo_frete || 'interno') === 'interno' ? "text-white" : "text-white/70")}>Frete Interno</span>
                </label>
                <label
                  htmlFor="frete-transportadora"
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
                    formData.tipo_frete === 'transportadora'
                      ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <RadioGroupItem value="transportadora" id="frete-transportadora" className="sr-only" />
                  <Building2 className={cn("w-5 h-5", formData.tipo_frete === 'transportadora' ? "text-blue-400" : "text-white/40")} />
                  <span className={cn("text-sm font-medium", formData.tipo_frete === 'transportadora' ? "text-white" : "text-white/70")}>Frete por conta do cliente</span>
                </label>
                <label
                    htmlFor="frete-por-porta"
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2",
                      formData.tipo_frete === 'por_porta'
                        ? "bg-blue-500/15 border-blue-400/40 shadow-lg shadow-blue-500/10"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                    )}
                  >
                    <RadioGroupItem value="por_porta" id="frete-por-porta" className="sr-only" />
                    <MapPin className={cn("w-5 h-5", formData.tipo_frete === 'por_porta' ? "text-blue-400" : "text-white/40")} />
                    <span className={cn("text-sm font-medium", formData.tipo_frete === 'por_porta' ? "text-white" : "text-white/70")}>Frete por Porta (Região)</span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_frete" className={labelClass}>Valor do Frete (R$)</Label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="valor_frete"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_frete}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor_frete: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  disabled={(formData.tipo_frete === 'interno' && !!freteSugerido) || formData.tipo_frete === 'por_porta' || formData.tipo_frete === 'transportadora'}
                  readOnly={(formData.tipo_frete === 'interno' && !!freteSugerido) || formData.tipo_frete === 'por_porta' || formData.tipo_frete === 'transportadora'}
                  className={cn(
                    inputClass,
                    "pl-10",
                    ((formData.tipo_frete === 'interno' && freteSugerido) || formData.tipo_frete === 'por_porta' || formData.tipo_frete === 'transportadora') && "cursor-not-allowed opacity-80"
                  )}
                />
                {((formData.tipo_frete === 'interno' && freteSugerido) || formData.tipo_frete === 'por_porta' || formData.tipo_frete === 'transportadora') && (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
                )}
              </div>
              {formData.tipo_frete === 'por_porta' ? (
                fretePorPortaCalc ? (
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-blue-500/10 border-white/15 text-blue-300 text-xs">
                      🔒 Região {fretePorPortaCalc.regiao} · {fretePorPortaCalc.quantidade} porta(s) × R$ {fretePorPortaCalc.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                    {fretePorPortaCalc.quantidade === 0 && (
                      <p className="text-xs text-amber-300/80">Adicione ao menos uma porta para calcular o frete.</p>
                    )}
                  </div>
                ) : formData.estado ? (
                  <p className="text-xs text-amber-300/80">
                    Estado {formData.estado} sem tabela de frete por porta — selecione outro tipo de frete.
                  </p>
                ) : (
                  <p className="text-xs text-white/60">Selecione o estado do cliente para calcular o frete por porta.</p>
                )
              ) : formData.tipo_frete === 'interno' ? (
                freteSugerido ? (
                  <Badge variant="outline" className="bg-blue-500/10 border-white/15 text-blue-300 text-xs">
                    🔒 Frete automático para {formData.cidade}/{formData.estado}
                  </Badge>
                ) : formData.cidade && formData.estado ? (
                  <p className="text-xs text-amber-300/80">
                    Sem frete cadastrado para esta cidade — preencha manualmente.
                  </p>
                ) : null
              ) : (
                <p className="text-xs text-white/60">
                  🔒 O frete é pago diretamente pelo cliente — valor travado em R$ 0,00.
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Dados Adicionais */}
        <Section title="Dados Adicionais" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <CalendarIcon className="mr-2 h-4 w-4 text-white/50" />
                    {format(dataVenda, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
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
                    <CalendarIcon className="mr-2 h-4 w-4 text-white/50" />
                    {dataEntrega ? (
                      format(dataEntrega, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
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

            <div className="space-y-2 md:col-span-2">
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
          </div>
        </Section>

        {/* Resumo */}
        {portas.length > 0 && (
          <>
            <VendaResumo 
              produtos={portasComAjusteGlobal}
              valorFrete={formData.valor_frete} 
              valorCredito={valorCredito}
              percentualCredito={percentualCredito}
              onRemoverCredito={() => {
                setValorCredito(0);
                setPercentualCredito(0);
                recalcularValorTotal(portas, 0);
              }}
            />

            <ResumoDescontosSection
              precoTabelado={precoTabeladoMemo}
              limitePermitidoPct={validacaoDescontoMemo.limitePermitido}
              precoFinal={precoFinalProdutosMemo}
              justificativa={justificativaDesconto}
              onChangeJustificativa={setJustificativaDesconto}
              metodos={pagamentoData.metodos.map(m => ({
                tipo: m.tipo,
                valor: m.valor,
                parcelas: m.tipo === 'boleto'
                  ? Number(m.parcelas_boleto) || 1
                  : m.tipo === 'cartao_credito'
                  ? Number(m.parcelas_cartao) || 1
                  : undefined,
              }))}
              temperatura={formData.temperatura}
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
          
          {portas.length > 0 && validacaoDescontoMemo.dentroDoLimite && ajusteGlobal.valor === 0 && (
            <GradientButton 
              variant="outline"
              onClick={() => setCreditoModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {valorCredito > 0 ? 'Editar Crédito' : 'Adicionar Crédito'}
            </GradientButton>
          )}

          {!isFromRascunho && (
            <GradientButton
              variant="outline"
              onClick={handleSalvarRascunho}
              disabled={isCreatingRascunho || portas.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              {isCreatingRascunho ? 'Salvando...' : 'Salvar como Rascunho'}
            </GradientButton>
          )}

          <GradientButton
            type="submit" 
            variant="blue"
            disabled={isCreating || portas.length === 0 || !pagamentoConfirmado}
          >
            {isCreating ? 'Criando...' : (isFromRascunho ? 'Transformar em Venda' : 'Criar Venda')}
          </GradientButton>
        </div>
      </form>

      {/* Modais */}
      <CreditoVendaModal
        open={creditoModalOpen}
        onOpenChange={setCreditoModalOpen}
        valorTotalVenda={recalcularValorTotal(portas, 0) - (formData.valor_frete || 0)}
        temDesconto={ajusteGlobal.valor > 0 && ajusteGlobal.tipo === 'desconto'}
        valorCreditoAtual={valorCredito}
        percentualCreditoAtual={percentualCredito}
        onAplicarCredito={handleAplicarCredito}
      />

      {tipoAutorizacaoNecessaria && (
        <AutorizacaoDescontoModal
          open={autorizacaoDescontoOpen}
          onOpenChange={setAutorizacaoDescontoOpen}
          onAutorizado={handleAutorizacaoDesconto}
          percentualDesconto={validarDesconto(portas, formaPagamentoAtual, formData.temperatura === false).percentualDesconto}
          tipoAutorizacao={tipoAutorizacaoNecessaria}
          limitePermitido={limitePermitido}
        />
      )}

      {pendingAjusteValidacao && (
        <AutorizacaoDescontoModal
          open={aplicarAjusteAutorizacaoOpen}
          onOpenChange={(open) => {
            setAplicarAjusteAutorizacaoOpen(open);
            if (!open) {
              setPendingAjusteRascunho(null);
              setPendingAjusteValidacao(null);
            }
          }}
          onAutorizado={handleAjusteAutorizado}
          percentualDesconto={pendingAjusteValidacao.percentual}
          tipoAutorizacao={pendingAjusteValidacao.tipo}
          limitePermitido={pendingAjusteValidacao.limite}
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
