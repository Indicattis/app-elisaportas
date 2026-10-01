import { InfoAutorizadoVenda } from '@/components/vendas/InfoAutorizadoVenda';
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Calendar, DollarSign, FileText, History, Edit, Package } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { MinimalistLayout } from "@/components/MinimalistLayout";

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
}

interface Orcamento {
  id: string;
  valor_produto: number;
  valor_pintura: number;
  valor_frete: number;
  valor_instalacao: number;
  valor_total: number;
  status: string;
  forma_pagamento: string;
  desconto_percentual: number;
  created_at: string;
  data_aprovacao: string | null;
}

interface HistoricoItem {
  id: string;
  acao: string;
  created_at: string;
  observacoes: string | null;
  atendente_nome: string;
}

interface ProdutoVendaWithRelations {
  id: string;
  tipo_produto: string;
  largura: number | null;
  altura: number | null;
  quantidade: number | null;
  valor_total: number;
  valor_produto: number;
  valor_pintura: number;
  valor_instalacao: number;
  descricao: string | null;
  acessorio_id: string | null;
  adicional_id: string | null;
  catalogo_cores: { nome: string; codigo_hex: string } | null;
  acessorios: { nome: string } | null;
  adicionais: { nome: string } | null;
}

export default function VendaDetalhesMinimalista() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Tables<"vendas"> | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [produtos, setProdutos] = useState<ProdutoVendaWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchVendaDetails();
    }
  }, [id]);

  const fetchVendaDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);

      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .select("*")
        .eq("id", id)
        .single();

      if (vendaError) throw vendaError;
      setVenda(vendaData);

      // Buscar produtos da venda com relacionamentos
      const { data: produtosData, error: produtosError } = await supabase
        .from("produtos_vendas")
        .select(`
          *,
          catalogo_cores(nome, codigo_hex),
          acessorios(nome),
          adicionais(nome)
        `)
        .eq("venda_id", id)
        .order("created_at", { ascending: true });

      if (produtosError) throw produtosError;
      setProdutos((produtosData as ProdutoVendaWithRelations[]) || []);
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
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pendente': { label: 'Pendente', variant: 'secondary' as const },
      'aprovado': { label: 'Aprovado', variant: 'default' as const },
      'rejeitado': { label: 'Rejeitado', variant: 'destructive' as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getTipoProdutoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'porta_enrolar': 'Porta de Enrolar',
      'porta_social': 'Porta Social',
      'porta_automacao': 'Automação',
      'manutencao': 'Manutenção',
      'acessorio': 'Acessório',
      'adicional': 'Adicional',
      'pintura_epoxi': 'Pintura Epóxi',
      'instalacao': 'Instalação',
      'outro': 'Outro'
    };
    return tipos[tipo] || tipo;
  };

  const cardClass = "bg-primary/5 border-primary/10 backdrop-blur-xl";

  if (loading) {
    return (
      <MinimalistLayout title="Detalhes da Venda" backPath="/vendas/minhas-vendas">
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
      <MinimalistLayout title="Detalhes da Venda" backPath="/vendas/minhas-vendas">
        <div className="text-center py-8">
          <p className="text-white/60">Venda não encontrada</p>
          <Button onClick={() => navigate("/vendas/minhas-vendas")} className="mt-4">
            Voltar para Minhas Vendas
          </Button>
        </div>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout 
      title="Detalhes da Venda" 
      backPath="/vendas/minhas-vendas"
      headerActions={
        isAdmin && (
          <Button 
            onClick={() => navigate(`/vendas/minhas-vendas/${id}/editar`)}
            size="sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Venda
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações da Venda */}
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="w-4 h-4" />
                Informações da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-white/60">Valor da Venda</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(venda.valor_venda)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/60">Data da Venda</p>
                  <p className="font-medium text-white">{formatDate(venda.data_venda)}</p>
                </div>
              </div>
              
              <Separator className="bg-primary/10" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-white/60">Canal de Aquisição</p>
                  <p className="font-medium text-white">{venda.canal_aquisicao_id || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/60">Forma de Pagamento</p>
                  <p className="font-medium text-white">{venda.forma_pagamento || "Não informado"}</p>
                </div>
              </div>

              {(venda.estado || venda.cidade || venda.bairro || venda.cep) && (
                <>
                  <Separator className="bg-primary/10" />
                  <div>
                    <p className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Endereço
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
                      {venda.estado && <p><strong>Estado:</strong> {venda.estado}</p>}
                      {venda.cidade && <p><strong>Cidade:</strong> {venda.cidade}</p>}
                      {venda.bairro && <p><strong>Bairro:</strong> {venda.bairro}</p>}
                      {venda.cep && <p><strong>CEP:</strong> {venda.cep}</p>}
                    </div>
                  </div>
                </>
              )}

              <InfoAutorizadoVenda vendaId={venda.id} />
              {venda.observacoes_venda && (
                <>
                  <Separator className="bg-primary/10" />
                  <div>
                    <p className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Observações
                    </p>
                    <p className="text-sm bg-primary/10 p-3 rounded-md text-white/80">{venda.observacoes_venda}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Informações do Lead/Cliente */}
          {lead && (
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-white/60">Nome</p>
                  <p className="font-medium text-white">{lead.nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/60">Email</p>
                  <p className="font-medium text-white">{lead.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/60">Telefone</p>
                  <p className="font-medium text-white">{lead.telefone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/60">Cidade</p>
                  <p className="font-medium text-white">{lead.cidade}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Se não tem lead, mostrar dados do cliente da venda */}
          {!lead && venda.cliente_nome && (
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-white/60">Nome</p>
                  <p className="font-medium text-white">{venda.cliente_nome}</p>
                </div>
                {venda.cliente_telefone && (
                  <div>
                    <p className="text-sm font-medium text-white/60">Telefone</p>
                    <p className="font-medium text-white">{venda.cliente_telefone}</p>
                  </div>
                )}
                {venda.cliente_email && (
                  <div>
                    <p className="text-sm font-medium text-white/60">Email</p>
                    <p className="font-medium text-white">{venda.cliente_email}</p>
                  </div>
                )}
                {venda.cpf_cliente && (
                  <div>
                    <p className="text-sm font-medium text-white/60">CPF/CNPJ</p>
                    <p className="font-medium text-white">{venda.cpf_cliente}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Orçamentos */}
        {orcamentos.length > 0 && (
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-white">Orçamentos Relacionados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orcamentos.map((orcamento) => (
                  <div key={orcamento.id} className="border border-primary/10 rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">Orçamento</span>
                        {getStatusBadge(orcamento.status)}
        </div>

        {/* Produtos da Venda */}
        {produtos.length > 0 && (
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="w-4 h-4" />
                Produtos da Venda ({produtos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {produtos.map((produto, index) => (
                  <div key={produto.id} className="border border-primary/10 rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-white border-primary/30">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium text-white">
                          {getTipoProdutoLabel(produto.tipo_produto)}
                        </span>
                        {produto.catalogo_cores && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-white/20" 
                              style={{ backgroundColor: produto.catalogo_cores.codigo_hex }}
                            />
                            <span className="text-sm text-white/70">{produto.catalogo_cores.nome}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          {formatCurrency(produto.valor_total)}
                        </p>
                        <p className="text-xs text-white/60">
                          {produto.quantidade || 1}x {formatCurrency(produto.valor_produto)}
                        </p>
                      </div>
                    </div>
                    
                    {(produto.largura || produto.altura) && (
                      <div className="flex gap-4 text-sm mb-3">
                        {produto.largura && (
                          <div>
                            <span className="text-white/60">Largura:</span>{" "}
                            <span className="text-white font-medium">{produto.largura}mm</span>
                          </div>
                        )}
                        {produto.altura && (
                          <div>
                            <span className="text-white/60">Altura:</span>{" "}
                            <span className="text-white font-medium">{produto.altura}mm</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Acessório */}
                    {produto.acessorios && (
                      <div className="mb-2">
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-white/80">
                          Acessório: {produto.acessorios.nome}
                        </Badge>
                      </div>
                    )}

                    {/* Adicional */}
                    {produto.adicionais && (
                      <div className="mb-2">
                        <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                          Adicional: {produto.adicionais.nome}
                        </Badge>
                      </div>
                    )}

                    {produto.descricao && (
                      <p className="text-sm text-white/60 bg-primary/10 p-2 rounded mt-2">
                        {produto.descricao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          {formatCurrency(orcamento.valor_total)}
                        </p>
                        <p className="text-xs text-white/60">
                          {formatDate(orcamento.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Produto</p>
                        <p className="font-medium text-white">{formatCurrency(orcamento.valor_produto)}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Pintura</p>
                        <p className="font-medium text-white">{formatCurrency(orcamento.valor_pintura)}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Frete</p>
                        <p className="font-medium text-white">{formatCurrency(orcamento.valor_frete)}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Instalação</p>
                        <p className="font-medium text-white">{formatCurrency(orcamento.valor_instalacao)}</p>
                      </div>
                    </div>
                    
                    {orcamento.desconto_percentual > 0 && (
                      <p className="text-sm text-orange-400 mt-2">
                        Desconto aplicado: {orcamento.desconto_percentual}%
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-white/60">
                        Forma de Pagamento: {orcamento.forma_pagamento}
                      </span>
                      {orcamento.data_aprovacao && (
                        <span className="text-white/60">
                          Aprovado em: {formatDate(orcamento.data_aprovacao)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <History className="w-4 h-4" />
                Histórico de Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historico.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 border-l-2 border-primary/30 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize text-white">
                          {item.acao.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-white/60">
                          por {item.atendente_nome}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mb-1">
                        {formatDate(item.created_at)}
                      </p>
                      {item.observacoes && (
                        <p className="text-sm bg-primary/10 p-2 rounded-md text-white/80">
                          {item.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MinimalistLayout>
  );
}
