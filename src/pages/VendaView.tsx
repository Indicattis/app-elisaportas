import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, DollarSign, Package, User, Calendar, CreditCard, FileText, Home, CheckCircle2, Clock, AlertCircle, XCircle, Banknote, QrCode, Wallet, ExternalLink, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Parcela {
  id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  valor_pago?: number;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  etapa: string;
  ordens?: any[];
}

interface Instalacao {
  id: string;
  nome_cliente: string;
  data_instalacao?: string;
}

interface Venda {
  id: string;
  cliente_nome: string;
  cpf_cliente?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  cidade?: string;
  estado?: string;
  bairro?: string;
  cep?: string;
  valor_venda: number;
  valor_instalacao?: number;
  valor_frete?: number;
  valor_credito?: number;
  percentual_credito?: number;
  forma_pagamento?: string;
  data_venda: string;
  data_prevista_entrega?: string;
  tipo_entrega?: string;
  numero_parcelas?: number;
  valor_entrada?: number;
  publico_alvo?: string;
  temperatura?: boolean;
  pagamento_na_entrega?: boolean;
  frete_aprovado?: boolean;
  canal_aquisicao?: { nome: string };
  atendente?: { nome: string; foto_perfil_url?: string };
  observacoes_venda?: string;
  created_at: string;
  produtos: any[];
  parcelas: Parcela[];
  pedido?: Pedido;
  instalacao?: Instalacao;
  // Novos campos de pagamento
  metodo_pagamento?: string;
  quantidade_parcelas?: number;
  intervalo_boletos?: number;
  pago_na_instalacao?: boolean;
  parcelas_dinheiro?: number;
  valor_entrada_dinheiro?: number;
  restante_na_instalacao?: boolean;
  comprovante_url?: string;
  comprovante_nome?: string;
  empresa_receptora_id?: string;
  empresa_receptora?: { nome: string };
}

export default function VendaView() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) fetchVendaDetails();
  }, [id]);

  const fetchVendaDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .select(`
          *,
          produtos:produtos_vendas(*,cor:catalogo_cores(nome, codigo_hex))
        `)
        .eq("id", id)
        .maybeSingle();

      if (vendaError) throw vendaError;
      if (!vendaData) {
        toast({ variant: "destructive", title: "Erro", description: "Venda não encontrada" });
        setLoading(false);
        return;
      }

      // Buscar relações separadamente para evitar problemas com foreign keys
      const { data: parcelasData } = await supabase
        .from("contas_receber")
        .select("*")
        .eq("venda_id", id)
        .order("numero_parcela", { ascending: true });

      const { data: pedidoData } = await supabase
        .from("pedidos_producao")
        .select("id, numero_pedido, etapa_atual")
        .eq("venda_id", id)
        .maybeSingle();

      // Se houver pedido, buscar suas ordens
      let ordensData: any[] = [];
      if (pedidoData?.id) {
        // Buscar ordem de soldagem
        const { data: soldagem } = await supabase
          .from("ordens_soldagem")
          .select("id, numero_ordem, status")
          .eq("pedido_id", pedidoData.id)
          .maybeSingle();
        if (soldagem) ordensData.push({ ...soldagem, tipo: "Soldagem" });

        // Buscar ordem de perfiladeira
        const { data: perfiladeira } = await supabase
          .from("ordens_perfiladeira")
          .select("id, numero_ordem, status")
          .eq("pedido_id", pedidoData.id)
          .maybeSingle();
        if (perfiladeira) ordensData.push({ ...perfiladeira, tipo: "Perfiladeira" });

        // Buscar ordem de separação
        const { data: separacao } = await supabase
          .from("ordens_separacao")
          .select("id, numero_ordem, status")
          .eq("pedido_id", pedidoData.id)
          .maybeSingle();
        if (separacao) ordensData.push({ ...separacao, tipo: "Separação" });

        // Buscar ordem de qualidade
        const { data: qualidade } = await supabase
          .from("ordens_qualidade")
          .select("id, numero_ordem, status")
          .eq("pedido_id", pedidoData.id)
          .maybeSingle();
        if (qualidade) ordensData.push({ ...qualidade, tipo: "Qualidade" });

        // Buscar ordem de pintura
        const { data: pintura } = await supabase
          .from("ordens_pintura")
          .select("id, numero_ordem, status")
          .eq("pedido_id", pedidoData.id)
          .maybeSingle();
        if (pintura) ordensData.push({ ...pintura, tipo: "Pintura" });
      }

      const { data: instalacaoData } = await supabase
        .from("instalacoes")
        .select("id, nome_cliente, data_instalacao")
        .eq("venda_id", id)
        .maybeSingle();

      const { data: canalData } = await supabase
        .from("canais_aquisicao")
        .select("nome")
        .eq("id", vendaData.canal_aquisicao_id)
        .maybeSingle();

      const { data: atendenteData } = await supabase
        .from("admin_users")
        .select("nome, foto_perfil_url")
        .eq("user_id", vendaData.atendente_id)
        .maybeSingle();

      // Buscar empresa receptora se existir
      let empresaReceptoraData = null;
      if (vendaData.empresa_receptora_id) {
        const { data } = await supabase
          .from("empresas_emissoras")
          .select("nome")
          .eq("id", vendaData.empresa_receptora_id)
          .maybeSingle();
        empresaReceptoraData = data;
      }

      setVenda({
        ...vendaData,
        parcelas: parcelasData || [],
        pedido: pedidoData ? { ...pedidoData, etapa: pedidoData.etapa_atual, ordens: ordensData } : undefined,
        instalacao: instalacaoData || undefined,
        canal_aquisicao: canalData || undefined,
        atendente: atendenteData || undefined,
        empresa_receptora: empresaReceptoraData || undefined,
      } as any);
    } catch (error) {
      console.error("Erro ao buscar venda:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar venda" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getEtapaLabel = (etapa: string) => {
    const labels: Record<string, string> = {
      aberto: "Aberto",
      em_producao: "Em Produção",
      finalizado: "Finalizado",
      cancelado: "Cancelado",
    };
    return labels[etapa] || etapa;
  };

  const getEtapaBadgeColor = (etapa: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      em_producao: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      finalizado: "bg-green-500/10 text-green-700 border-green-500/20",
      cancelado: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return colors[etapa] || "";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido":
      case "pronta":
        return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case "em_andamento":
        return <Clock className="w-3 h-3 text-blue-600" />;
      case "cancelado":
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <AlertCircle className="w-3 h-3 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberto: "Aberto",
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
      pronta: "Pronta",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      pendente: "bg-gray-500/10 text-gray-700 border-gray-500/20",
      em_andamento: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      concluido: "bg-green-500/10 text-green-700 border-green-500/20",
      pronta: "bg-green-500/10 text-green-700 border-green-500/20",
      cancelado: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return colors[status] || "";
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!venda) return <div className="text-center py-8"><p>Venda não encontrada</p></div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/vendas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Venda - {venda.cliente_nome}</h1>
            <p className="text-sm text-muted-foreground">
              Cadastrada em {format(new Date(venda.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Pedido Vinculado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Pedido de Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {venda.pedido ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    venda.pedido.etapa === 'finalizado' ? 'bg-green-500' :
                    venda.pedido.etapa === 'em_producao' ? 'bg-blue-500' :
                    venda.pedido.etapa === 'aberto' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <div>
                    <p className="text-sm text-muted-foreground">Pedido #{venda.pedido.numero_pedido}</p>
                    <p className="font-semibold text-lg">{getEtapaLabel(venda.pedido.etapa)}</p>
                  </div>
                  <Badge variant="outline" className={`${getEtapaBadgeColor(venda.pedido.etapa)} px-3 py-1`}>
                    {getEtapaLabel(venda.pedido.etapa)}
                  </Badge>
                </div>
                <Button onClick={() => navigate(`/dashboard/pedido/${venda.pedido?.id}/view`)}>
                  Ver Pedido
                </Button>
              </div>

              {/* Ordens de Produção */}
              {venda.pedido.ordens && venda.pedido.ordens.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Ordens de Produção ({venda.pedido.ordens.length})</h3>
                  <div className="space-y-2">
                    {venda.pedido.ordens.map((ordem: any) => (
                      <div key={ordem.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ordem.status)}
                          <div>
                            <p className="font-medium text-sm">{ordem.tipo}</p>
                            <p className="text-xs text-muted-foreground">#{ordem.numero_ordem}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${getStatusColor(ordem.status)} text-xs`}>
                          {getStatusLabel(ordem.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-muted-foreground">Nenhum pedido vinculado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(venda.valor_venda)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency((venda.valor_venda || 0) - (venda.valor_frete || 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Instalação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency(venda.valor_instalacao || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Frete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency(venda.valor_frete || 0)}</p>
          </CardContent>
        </Card>
        <Card className={(venda.valor_credito ?? 0) > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-semibold ${(venda.valor_credito ?? 0) > 0 ? "text-amber-600" : ""}`}>
              {formatCurrency(venda.valor_credito || 0)}
            </p>
            {(venda.percentual_credito ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ({venda.percentual_credito?.toFixed(2)}%)
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Final</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency((venda.valor_venda || 0) - (venda.valor_credito || 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes da Venda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Detalhes da Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Data da Venda</p>
              <p className="font-medium">{format(new Date(venda.data_venda), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            {venda.data_prevista_entrega && (
              <div>
                <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                <p className="font-medium">{format(new Date(venda.data_prevista_entrega), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Entrega</p>
              <p className="font-medium">{venda.tipo_entrega === 'instalacao' ? 'Instalação' : venda.tipo_entrega === 'retirada' ? 'Retirada' : 'Não informado'}</p>
            </div>
            {venda.publico_alvo && (
              <div>
                <p className="text-sm text-muted-foreground">Público Alvo</p>
                <p className="font-medium capitalize">{venda.publico_alvo.replace('_', ' ')}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Temperatura</p>
              <Badge variant={venda.temperatura ? "default" : "secondary"} className="mt-1">
                {venda.temperatura == null ? '—' : venda.temperatura ? 'Quente' : 'Fria'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frete Aprovado</p>
              <Badge variant={venda.frete_aprovado ? "default" : "secondary"} className="mt-1">
                {venda.frete_aprovado ? "Sim" : "Não"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes do Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Forma de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Ícone e Nome do Método */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              {venda.forma_pagamento === 'boleto' && <Banknote className="w-6 h-6 text-blue-600" />}
              {venda.forma_pagamento === 'a_vista' && <QrCode className="w-6 h-6 text-green-600" />}
              {venda.forma_pagamento === 'cartao_credito' && <CreditCard className="w-6 h-6 text-purple-600" />}
              {venda.forma_pagamento === 'dinheiro' && <Wallet className="w-6 h-6 text-amber-600" />}
              {!venda.forma_pagamento && <DollarSign className="w-6 h-6 text-muted-foreground" />}
              
              <div className="flex-1">
                <p className="font-semibold text-lg">
                  {venda.forma_pagamento === 'boleto' && 'Boleto Bancário'}
                  {venda.forma_pagamento === 'a_vista' && 'À Vista (PIX/Débito)'}
                  {venda.forma_pagamento === 'cartao_credito' && 'Cartão de Crédito'}
                  {venda.forma_pagamento === 'dinheiro' && 'Dinheiro'}
                  {!venda.forma_pagamento && 'Não informado'}
                </p>
                {venda.metodo_pagamento && (
                  <p className="text-sm text-muted-foreground capitalize">{venda.metodo_pagamento.replace('_', ' ')}</p>
                )}
              </div>

              {/* Badges de Status */}
              <div className="flex gap-2">
                {venda.pago_na_instalacao && (
                  <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                    Pago na Instalação
                  </Badge>
                )}
                {venda.restante_na_instalacao && (
                  <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                    Restante na Instalação
                  </Badge>
                )}
                {venda.pagamento_na_entrega && (
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                    Pagamento na Entrega
                  </Badge>
                )}
              </div>
            </div>

            {/* Detalhes específicos por forma de pagamento */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Boleto */}
              {venda.forma_pagamento === 'boleto' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade de Boletos</p>
                    <p className="font-medium">{venda.quantidade_parcelas || venda.numero_parcelas || 1}</p>
                  </div>
                  {venda.intervalo_boletos && (
                    <div>
                      <p className="text-sm text-muted-foreground">Intervalo entre Boletos</p>
                      <p className="font-medium">{venda.intervalo_boletos} dias</p>
                    </div>
                  )}
                </>
              )}

              {/* Cartão de Crédito */}
              {venda.forma_pagamento === 'cartao_credito' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Parcelas</p>
                    <p className="font-medium">{venda.quantidade_parcelas || venda.numero_parcelas || 1}x</p>
                  </div>
                  {(venda.quantidade_parcelas || venda.numero_parcelas) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valor por Parcela</p>
                      <p className="font-medium">
                        {formatCurrency(venda.valor_venda / (venda.quantidade_parcelas || venda.numero_parcelas || 1))}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Dinheiro */}
              {venda.forma_pagamento === 'dinheiro' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Parcelas em Dinheiro</p>
                    <p className="font-medium">{venda.parcelas_dinheiro || 1}x</p>
                  </div>
                  {venda.valor_entrada_dinheiro !== undefined && venda.valor_entrada_dinheiro > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valor de Entrada</p>
                      <p className="font-medium text-green-600">{formatCurrency(venda.valor_entrada_dinheiro)}</p>
                    </div>
                  )}
                  {venda.parcelas_dinheiro === 2 && venda.valor_entrada_dinheiro && (
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Restante</p>
                      <p className="font-medium">{formatCurrency(venda.valor_venda - venda.valor_entrada_dinheiro)}</p>
                    </div>
                  )}
                </>
              )}

              {/* À Vista */}
              {venda.forma_pagamento === 'a_vista' && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-green-600">{formatCurrency(venda.valor_venda)}</p>
                </div>
              )}

              {/* Valor de Entrada (genérico) */}
              {venda.valor_entrada !== undefined && venda.valor_entrada > 0 && venda.forma_pagamento !== 'dinheiro' && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor de Entrada</p>
                  <p className="font-medium text-green-600">{formatCurrency(venda.valor_entrada)}</p>
                </div>
              )}

              {/* Empresa Receptora */}
              {venda.empresa_receptora && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Empresa que Recebe
                  </p>
                  <p className="font-medium">{venda.empresa_receptora.nome}</p>
                </div>
              )}
            </div>

            {/* Comprovante de Pagamento */}
            {venda.comprovante_url && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">Comprovante de Pagamento</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(venda.comprovante_url!, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {venda.comprovante_nome || 'Ver Comprovante'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{venda.cliente_nome}</p>
            </div>
            {venda.cpf_cliente && (
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{venda.cpf_cliente}</p>
              </div>
            )}
            {venda.cliente_telefone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{venda.cliente_telefone}</p>
              </div>
            )}
            {venda.cliente_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{venda.cliente_email}</p>
              </div>
            )}
          </div>
          {venda.cidade && venda.estado && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Endereço</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p>{venda.cidade}, {venda.estado}</p>
                    {venda.bairro && <p className="text-sm text-muted-foreground">{venda.bairro}</p>}
                    {venda.cep && <p className="text-sm text-muted-foreground">CEP: {venda.cep}</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Produtos */}
      {venda.produtos && venda.produtos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos ({venda.produtos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {venda.produtos.map((produto) => (
                <div key={produto.id} className="p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{produto.descricao || produto.tipo_produto}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {produto.tipo_produto}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {produto.cor && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              borderColor: produto.cor.codigo_hex,
                              color: produto.cor.codigo_hex
                            }}
                          >
                            {produto.cor.nome}
                          </Badge>
                        )}
                        {produto.tamanho && (
                          <span className="text-[10px] text-muted-foreground">{produto.tamanho}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">Qtd: {produto.quantidade}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-[11px]">
                        {produto.valor_produto > 0 && (
                          <div>
                            <span className="text-muted-foreground">Produto:</span>
                            <span className="ml-1 font-medium">{formatCurrency(produto.valor_produto)}</span>
                          </div>
                        )}
                        {produto.valor_instalacao > 0 && (
                          <div>
                            <span className="text-muted-foreground">Instalação:</span>
                            <span className="ml-1 font-medium">{formatCurrency(produto.valor_instalacao)}</span>
                          </div>
                        )}
                        {produto.valor_pintura > 0 && (
                          <div>
                            <span className="text-muted-foreground">Pintura:</span>
                            <span className="ml-1 font-medium">{formatCurrency(produto.valor_pintura)}</span>
                          </div>
                        )}
                        {(produto.desconto_valor > 0 || produto.desconto_percentual > 0) && (
                          <div>
                            <span className="text-muted-foreground">Desconto:</span>
                            <span className="ml-1 font-medium text-red-600">
                              {produto.desconto_valor > 0 
                                ? formatCurrency(produto.desconto_valor)
                                : `${produto.desconto_percentual}%`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base">{formatCurrency(produto.valor_total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parcelas */}
      {venda.parcelas && venda.parcelas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Parcelas de Pagamento ({venda.parcelas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {venda.parcelas.map((parcela) => (
                <div key={parcela.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold min-w-[60px]">
                      Parcela {parcela.numero_parcela}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        parcela.status === 'pago' 
                          ? 'bg-green-500/10 text-green-700 border-green-500/20' 
                          : parcela.status === 'pago_parcial'
                          ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                          : 'bg-red-500/10 text-red-700 border-red-500/20'
                      }`}
                    >
                      {parcela.status === 'pago' 
                        ? 'Pago' 
                        : parcela.status === 'pago_parcial'
                        ? 'Pago Parcial'
                        : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(parcela.valor_parcela)}</p>
                    <p className="text-xs text-muted-foreground">
                      Venc: {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}
                    </p>
                    {parcela.data_pagamento && (
                      <p className="text-xs text-green-600">
                        Pago: {format(new Date(parcela.data_pagamento), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Adicionais */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Vendedor/Atendente */}
        {venda.atendente && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Atendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {venda.atendente.foto_perfil_url && (
                  <img 
                    src={venda.atendente.foto_perfil_url} 
                    alt={venda.atendente.nome}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <p className="font-medium">{venda.atendente.nome}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Canal de Aquisição */}
        {venda.canal_aquisicao && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Canal de Aquisição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{venda.canal_aquisicao.nome}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Documentos Relacionados */}
      {(venda.pedido || venda.instalacao) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos Relacionados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {venda.pedido && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/dashboard/pedido/${venda.pedido?.id}/view`)}
              >
                <Package className="w-4 h-4 mr-2" />
                Pedido de Produção #{venda.pedido.numero_pedido}
              </Button>
            )}
            {venda.instalacao && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/dashboard/instalacoes`)}
              >
                <Home className="w-4 h-4 mr-2" />
                Instalação - {venda.instalacao.nome_cliente}
                {venda.instalacao.data_instalacao && (
                  <span className="ml-auto text-sm text-muted-foreground">
                    {format(new Date(venda.instalacao.data_instalacao), 'dd/MM/yyyy')}
                  </span>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {venda.observacoes_venda && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{venda.observacoes_venda}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => navigate(`/dashboard/vendas/${id}/edit`)}>
            Editar Venda
          </Button>
          {venda.pedido && (
            <Button variant="outline" onClick={() => navigate(`/dashboard/pedido/${venda.pedido.id}/view`)}>
              Ver Pedido
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
