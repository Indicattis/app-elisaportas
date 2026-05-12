import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmarExclusaoVendaModal } from "@/components/vendas/ConfirmarExclusaoVendaModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  Package, 
  Truck, 
  Wrench, 
  User, 
  MapPin, 
  Calendar, 
  CreditCard, 
  FileText,
  Edit,
  ExternalLink,
  ArrowDown,
  ArrowUp,
  Trash2,
  Pencil,
  Settings
} from "lucide-react";
import { agruparItensCatalogo } from "@/utils/agruparItensCatalogo";

interface Produto {
  id: string;
  tipo_produto: string;
  largura: number;
  altura: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  desconto_percentual: number;
  desconto_valor?: number;
  descricao?: string | null;
  catalogo_cores?: { nome: string; codigo_hex: string } | null;
}

interface AutorizacaoDesconto {
  id: string;
  percentual_desconto: number;
  tipo_autorizacao: string;
  autorizador: {
    nome: string;
    foto_perfil_url: string | null;
  } | null;
}

interface Atendente {
  id: string;
  nome: string;
  foto_perfil_url: string | null;
}

interface Venda {
  id: string;
  data_venda: string;
  valor_venda: number;
  valor_produtos: number | null;
  valor_instalacao: number | null;
  valor_frete: number | null;
  forma_pagamento: string | null;
  previsao_entrega: string | null;
  publico_alvo: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cpf_cliente: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  cep: string | null;
  endereco: string | null;
  observacoes_venda: string | null;
  comprovante_url: string | null;
  atendente_id: string | null;
  tipo_entrega: 'entrega' | 'instalacao' | 'manutencao' | null;
  produtos?: Produto[];
  atendente?: Atendente;
}

export default function VendaDetalhesDirecao() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleDeleteVenda = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_venda_completa', {
        p_venda_id: id
      });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Venda e todos os itens vinculados excluídos com sucesso',
      });
      navigate('/direcao/vendas');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir venda',
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
      setExcluirModalOpen(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVendaDetails();
    }
  }, [id]);

  const fetchVendaDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);

      // Buscar venda com produtos e autorização de desconto
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .select(`
          *,
          produtos:produtos_vendas(
            id,
            tipo_produto,
            largura,
            altura,
            quantidade,
            valor_produto,
            valor_total,
            desconto_percentual,
            desconto_valor,
            descricao,
            catalogo_cores(nome, codigo_hex)
          ),
          autorizacao_desconto:vendas_autorizacoes_desconto(
            id,
            percentual_desconto,
            tipo_autorizacao,
            autorizador:admin_users!vendas_autorizacoes_desconto_autorizado_por_fkey(
              nome,
              foto_perfil_url
            )
          )
        `)
        .eq("id", id)
        .single();

      if (vendaError) throw vendaError;
      
      // Buscar atendente separadamente se existir atendente_id
      if (vendaData?.atendente_id) {
        const { data: atendenteData } = await supabase
          .from("admin_users")
          .select("id, nome, foto_perfil_url")
          .eq("id", vendaData.atendente_id)
          .single();
        
        setVenda({ ...vendaData, atendente: atendenteData });
      } else {
        setVenda(vendaData);
      }

      if (vendaError) throw vendaError;
      setVenda(vendaData);
    } catch (error) {
      console.error("Erro ao buscar detalhes da venda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar detalhes da venda",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getTipoProdutoBadge = (tipo: string) => {
    const tipos: Record<string, { label: string; color: string }> = {
      'porta_enrolar': { label: 'Porta Enrolar', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'porta_seccionada': { label: 'Porta Seccionada', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      'porta_rapida': { label: 'Porta Rápida', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      'servico': { label: 'Serviço', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      'acessorio': { label: 'Acessório', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    };
    const info = tipos[tipo] || { label: tipo, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    return <Badge className={`${info.color} border`}>{info.label}</Badge>;
  };

  if (loading) {
    return (
      <MinimalistLayout title="Detalhes da Venda" backPath="/direcao/vendas">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-white/60">Carregando detalhes da venda...</p>
          </div>
        </div>
      </MinimalistLayout>
    );
  }

  if (!venda) {
    return (
      <MinimalistLayout title="Detalhes da Venda" backPath="/direcao/vendas">
        <div className="text-center py-8">
          <p className="text-white/60">Venda não encontrada</p>
          <Button onClick={() => navigate("/direcao/vendas")} className="mt-4">
            Voltar para Vendas
          </Button>
        </div>
      </MinimalistLayout>
    );
  }

  const cardClass = "bg-white/5 border border-blue-500/10 backdrop-blur-xl rounded-xl p-4";

  const tipoEntregaInfo: Record<string, { label: string; icon: typeof Wrench; color: string }> = {
    entrega: { label: 'Entrega', icon: Truck, color: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
    instalacao: { label: 'Instalação', icon: Wrench, color: 'bg-orange-500/20 text-orange-300 border-orange-400/30' },
    manutencao: { label: 'Manutenção', icon: Settings, color: 'bg-green-500/20 text-green-300 border-green-400/30' },
  };
  const tipoOp = venda.tipo_entrega ? tipoEntregaInfo[venda.tipo_entrega] : null;

  return (
    <MinimalistLayout 
      title="Detalhes da Venda" 
      subtitle={venda.cliente_nome}
      backPath="/direcao/vendas"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Vendas", path: "/direcao/vendas" },
        { label: "Detalhes" },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          {tipoOp && (
            <Badge className={`${tipoOp.color} border h-10 px-3 rounded-lg flex items-center gap-1.5 text-xs`}>
              <tipoOp.icon className="w-4 h-4" />
              {tipoOp.label}
            </Badge>
          )}
          {isAdmin && (
            <Button 
              onClick={() => navigate(`/direcao/vendas/${id}/editar`)}
              size="sm"
              className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 border border-blue-400/30 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          )}
          <Button 
            onClick={() => setExcluirModalOpen(true)}
            size="sm"
            variant="destructive"
            className="h-10 px-5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 text-xs gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Cards financeiros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${cardClass} border-l-4 border-l-green-500`}>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Valor Total
            </div>
            <p className="text-xl font-bold text-green-400">{formatCurrency((venda.valor_venda || 0) + (venda.valor_credito || 0))}</p>
          </div>
          
          <div className={`${cardClass} border-l-4 border-l-blue-500`}>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <Package className="w-4 h-4" />
              Produtos
            </div>
            <p className="text-xl font-bold text-blue-400">{formatCurrency(venda.valor_produtos || 0)}</p>
          </div>
          
          <div className={`${cardClass} border-l-4 border-l-orange-500`}>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <Wrench className="w-4 h-4" />
              Instalação
            </div>
            <p className="text-xl font-bold text-orange-400">{formatCurrency(venda.valor_instalacao || 0)}</p>
          </div>
          
          <div className={`${cardClass} border-l-4 border-l-purple-500`}>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <Truck className="w-4 h-4" />
              Frete
            </div>
            <p className="text-xl font-bold text-purple-400">{formatCurrency(venda.valor_frete || 0)}</p>
          </div>
        </div>

        {/* Descontos e Acréscimos */}
        {(() => {
          const totalDescontos = venda.produtos?.reduce(
            (acc: number, p: Produto) => acc + (p.desconto_valor || 0), 
            0
          ) || 0;
          const totalAcrescimos = venda.valor_credito || 0;
          const autorizacao = (venda.autorizacao_desconto as AutorizacaoDesconto[] | undefined)?.[0];
          
          if (totalDescontos > 0 || totalAcrescimos > 0) {
            return (
              <div className={cardClass}>
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Descontos e Acréscimos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card de Descontos */}
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDown className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Descontos</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                      -{formatCurrency(totalDescontos)}
                    </p>
                    {autorizacao && (
                      <div className="mt-3 pt-3 border-t border-red-500/20 space-y-1">
                        <p className="text-xs text-white/50">
                          Percentual: {autorizacao.percentual_desconto?.toFixed(2) || 0}%
                        </p>
                        <p className="text-xs text-white/50">
                          Tipo: {autorizacao.tipo_autorizacao === 'master' 
                            ? 'Senha Master' : 'Responsável do Setor'}
                        </p>
                        <p className="text-xs text-white/50">
                          Autorizado por: {autorizacao.autorizador?.nome || 'Não informado'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Card de Acréscimos */}
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Acréscimos</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      +{formatCurrency(totalAcrescimos)}
                    </p>
                    {totalAcrescimos > 0 && (
                      <p className="mt-2 text-xs text-white/50">Crédito do cliente</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Produtos da Venda */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
              Produtos da Venda
            </h2>
            <span className="text-xs text-white/40 ml-1">
              ({venda.produtos?.length || 0})
            </span>
          </div>
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="border-blue-500/10 hover:bg-white/5">
                      <TableHead className="text-xs text-white/70">Tipo</TableHead>
                      <TableHead className="text-xs text-white/70">Produto</TableHead>
                      <TableHead className="text-xs text-white/70">Cor</TableHead>
                      <TableHead className="text-xs text-white/70">Qtd</TableHead>
                      <TableHead className="text-xs text-white/70">Medidas (L × A)</TableHead>
                      <TableHead className="text-xs text-white/70 text-right">Valor Unit.</TableHead>
                      <TableHead className="text-xs text-white/70 text-right">Desconto</TableHead>
                      <TableHead className="text-xs text-white/70 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!venda.produtos || venda.produtos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-white/50">
                          Nenhum produto cadastrado nesta venda
                        </TableCell>
                      </TableRow>
                    )}
                    {agruparItensCatalogo(venda.produtos)?.map((produto: Produto) => (
                      <TableRow key={produto.id} className="border-blue-500/10 hover:bg-white/5">
                        <TableCell>{getTipoProdutoBadge(produto.tipo_produto)}</TableCell>
                        <TableCell className="text-white/80 max-w-[260px]">
                          <span className="block truncate" title={produto.descricao || ''}>
                            {produto.descricao && produto.descricao.trim().length > 0 ? (
                              produto.descricao
                            ) : (
                              <span className="text-white/40">—</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {produto.catalogo_cores ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: produto.catalogo_cores.codigo_hex }}
                              />
                              <span className="text-white/80">{produto.catalogo_cores.nome}</span>
                            </div>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-white/80">{produto.quantidade}x</TableCell>
                        <TableCell className="text-white/80">
                          {produto.largura > 0 && produto.altura > 0
                            ? `${produto.largura.toFixed(2)} × ${produto.altura.toFixed(2)} m`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-white/80">
                          {formatCurrency((produto as any).valor_produto || produto.valor_unitario || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {produto.desconto_percentual > 0 ? (
                            <span className="text-orange-400">-{produto.desconto_percentual}%</span>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-white font-medium">
                          {formatCurrency(produto.valor_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid cliente e informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cliente */}
          <div className={cardClass}>
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Cliente
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wide">Nome</p>
                <p className="text-white">{venda.cliente_nome}</p>
              </div>
              {venda.cliente_telefone && (
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Telefone</p>
                  <p className="text-white">{venda.cliente_telefone}</p>
                </div>
              )}
              {venda.cliente_email && (
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Email</p>
                  <p className="text-white">{venda.cliente_email}</p>
                </div>
              )}
              {venda.cpf_cliente && (
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">CPF/CNPJ</p>
                  <p className="text-white">{venda.cpf_cliente}</p>
                </div>
              )}
              {(venda.cidade || venda.estado) && (
                <div className="flex items-center gap-2 text-white/80 pt-2 border-t border-primary/10">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{[venda.cidade, venda.estado].filter(Boolean).join(' - ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informações da Venda */}
          <div className={cardClass}>
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Informações
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="w-4 h-4" />
                  Data da Venda
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 text-white hover:text-primary transition-colors group">
                      <span>{formatDate(venda.data_venda)}</span>
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={new Date(venda.data_venda + (venda.data_venda.includes('T') ? '' : 'T12:00:00'))}
                      onSelect={async (date) => {
                        if (!date || !venda) return;
                        const dataFormatada = format(date, 'yyyy-MM-dd') + 'T12:00:00.000Z';
                        const { error } = await supabase
                          .from('vendas')
                          .update({ data_venda: dataFormatada })
                          .eq('id', venda.id);
                        if (error) {
                          toast({ variant: "destructive", title: "Erro", description: "Erro ao atualizar data da venda" });
                        } else {
                          setVenda({ ...venda, data_venda: dataFormatada });
                          queryClient.invalidateQueries({ queryKey: ['vendas'] });
                          toast({ title: "Data atualizada com sucesso" });
                        }
                      }}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {venda.previsao_entrega && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <Truck className="w-4 h-4" />
                    Previsão Entrega
                  </div>
                  <p className="text-white">{formatDate(venda.previsao_entrega)}</p>
                </div>
              )}
              {tipoOp && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <tipoOp.icon className="w-4 h-4" />
                    Tipo de Operação
                  </div>
                  <Badge className={`${tipoOp.color} border`}>{tipoOp.label}</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/60">
                  <CreditCard className="w-4 h-4" />
                  Pagamento
                </div>
                <p className="text-white">{venda.forma_pagamento || 'Não informado'}</p>
              </div>
              {venda.publico_alvo && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Público Alvo</span>
                  <Badge variant="outline" className="text-white/80 border-primary/30">
                    {venda.publico_alvo}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vendedor */}
        {venda.atendente && (
          <div className={cardClass}>
            <h3 className="text-white font-medium mb-3">Vendedor Responsável</h3>
            <div className="flex items-center gap-3">
              {venda.atendente.foto_perfil_url ? (
                <img 
                  src={venda.atendente.foto_perfil_url} 
                  alt={venda.atendente.nome}
                  className="w-10 h-10 rounded-full object-cover border border-primary/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
              <span className="text-white">{venda.atendente.nome}</span>
            </div>
          </div>
        )}

        {/* Comprovante */}
        {venda.comprovante_url && (
          <div className={cardClass}>
            <h3 className="text-white font-medium mb-3">Comprovante</h3>
            <a 
              href={venda.comprovante_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver comprovante anexado
            </a>
          </div>
        )}

        {/* Observações */}
        {venda.observacoes_venda && (
          <div className={cardClass}>
            <h3 className="text-white font-medium mb-3">Observações</h3>
            <p className="text-white/80 bg-primary/5 p-3 rounded-lg border border-primary/10">
              {venda.observacoes_venda}
            </p>
          </div>
        )}
      </div>

      <ConfirmarExclusaoVendaModal
        open={excluirModalOpen}
        onOpenChange={setExcluirModalOpen}
        vendaId={id || ''}
        clienteNome={venda?.cliente_nome || ''}
        onConfirm={handleDeleteVenda}
        isDeleting={isDeleting}
      />
    </MinimalistLayout>
  );
}
