import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  CheckCircle2, 
  Clock,
  Truck,
  Wrench,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Package
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConfiguracoesVendasPublicas } from '@/hooks/useConfiguracoesVendasPublicas';
import {
  calcularDebitoMasterLucro,
  obterPercentualMaster,
} from '@/utils/descontoMasterLucro';

interface VendaDetalhes {
  id: string;
  cliente_nome: string;
  cidade: string | null;
  estado: string | null;
  data_venda: string;
  data_prevista_entrega: string | null;
  tipo_entrega: string | null;
  valor_venda: number;
  valor_credito: number;
  valor_frete: number;
  valor_instalacao: number;
  lucro_instalacao: number | null;
  custo_instalacao: number | null;
  instalacao_faturada: boolean;
  frete_aprovado: boolean;
  atendente_id: string;
  produtos_vendas: ProdutoVenda[];
  autorizacao_desconto: AutorizacaoDesconto[];
}

interface ProdutoVenda {
  id: string;
  tipo_produto: string;
  descricao: string;
  quantidade: number;
  valor_produto: number;
  valor_pintura: number;
  valor_instalacao: number;
  valor_total: number;
  desconto_valor: number;
  custo_producao: number;
  custo_produto: number;
  custo_pintura: number;
  lucro_item: number;
  faturamento: boolean;
  catalogo_cores: { nome: string; codigo_hex: string } | null;
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
  user_id: string;
  nome: string;
  foto_perfil_url: string | null;
}

export default function FaturamentoVendaDirecao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venda, setVenda] = useState<VendaDetalhes | null>(null);
  const [atendente, setAtendente] = useState<Atendente | null>(null);
  const [loading, setLoading] = useState(true);
  const { limites: limitesPublicos } = useConfiguracoesVendasPublicas();

  useEffect(() => {
    if (id) {
      fetchVendaDetalhes();
    }
  }, [id]);

  const fetchVendaDetalhes = async () => {
    try {
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .select(`
          id,
          cliente_nome,
          cidade,
          estado,
          data_venda,
          data_prevista_entrega,
          tipo_entrega,
          valor_venda,
          valor_credito,
          valor_frete,
          valor_instalacao,
          lucro_instalacao,
          custo_instalacao,
          instalacao_faturada,
          frete_aprovado,
          atendente_id,
          produtos_vendas(
            id,
            tipo_produto,
            descricao,
            quantidade,
            valor_produto,
            valor_pintura,
            valor_instalacao,
            valor_total,
            desconto_valor,
            custo_producao,
            custo_produto,
            custo_pintura,
            lucro_item,
            faturamento,
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
        .eq('id', id)
        .single();

      if (vendaError) throw vendaError;
      setVenda(vendaData as VendaDetalhes);

      // Buscar atendente separadamente
      if (vendaData?.atendente_id) {
        const { data: atendenteData } = await supabase
          .from('admin_users')
          .select('user_id, nome, foto_perfil_url')
          .eq('user_id', vendaData.atendente_id)
          .maybeSingle();

        setAtendente(atendenteData);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MinimalistLayout
        title="Carregando..."
        backPath="/direcao/faturamento"
        breadcrumbItems={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Faturamento', path: '/direcao/faturamento' },
          { label: 'Detalhes' }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </MinimalistLayout>
    );
  }

  if (!venda) {
    return (
      <MinimalistLayout
        title="Venda não encontrada"
        backPath="/direcao/faturamento"
        breadcrumbItems={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Faturamento', path: '/direcao/faturamento' },
          { label: 'Erro' }
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-white/60">Não foi possível encontrar esta venda.</p>
        </div>
      </MinimalistLayout>
    );
  }

  // Cálculos
  const valorTotal = venda.valor_venda + (venda.valor_credito || 0);
  const totalDescontos = venda.produtos_vendas.reduce((acc, p) => acc + (p.desconto_valor || 0), 0);
  const totalAcrescimos = venda.valor_credito || 0;
  const totalCustoProducao = venda.produtos_vendas.reduce((acc, p) => acc + (p.custo_producao || 0), 0);
  const lucroItens = venda.produtos_vendas.reduce((acc, p) => acc + (p.lucro_item || 0), 0);
  // Legado: lucro_instalacao separado. Para vendas novas, instalação é produto com lucro_item
  const lucroInstalacao = venda.lucro_instalacao || 0;
  const lucroBruto = lucroItens + lucroInstalacao;

  // Débito do excedente quando houve senha master acima do limite
  const produtosBruto = venda.produtos_vendas.reduce(
    (acc, p) =>
      acc +
      ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) *
        (p.quantidade || 1),
    0
  );
  const percentualMaster = obterPercentualMaster(venda.autorizacao_desconto as any);
  const debitoMaster = calcularDebitoMasterLucro({
    produtosBruto,
    percentualMaster,
    limiteMaster: limitesPublicos.masterLucro,
  });
  const lucroLiquido = lucroBruto - debitoMaster.valorExcedente;
  const margemLucro = valorTotal > 0 ? (lucroLiquido / valorTotal) * 100 : 0;

  const produtosFaturados = venda.produtos_vendas.filter(p => p.faturamento).length;
  const totalProdutos = venda.produtos_vendas.length;
  // Legado: contar instalação separada apenas se não houver produto tipo 'instalacao'
  const temProdutoInstalacao = venda.produtos_vendas.some(p => p.tipo_produto === 'instalacao');
  const instalacaoContada = !temProdutoInstalacao && venda.valor_instalacao > 0 ? 1 : 0;
  const instalacaoFaturadaContada = !temProdutoInstalacao && venda.instalacao_faturada ? 1 : 0;
  const totalItens = totalProdutos + instalacaoContada;
  const itensFaturados = produtosFaturados + instalacaoFaturadaContada;

  const vendaCompleta = itensFaturados === totalItens && totalItens > 0;
  const autorizacao = venda.autorizacao_desconto?.[0];

  const valorProdutos = venda.produtos_vendas.reduce((acc, p) => acc + (p.valor_total || 0), 0);

  const formatTipoProduto = (tipo: string) => {
    const tipos: Record<string, string> = {
      'porta_enrolar': 'Porta de Enrolar',
      'porta_social': 'Porta Social',
      'pintura_epoxi': 'Pintura Epóxi',
      'servico': 'Serviço',
      'acessorio': 'Acessório',
      'adicional': 'Adicional',
      'manutencao': 'Manutenção',
      'instalacao': 'Instalação',
    };
    return tipos[tipo] || tipo;
  };

  return (
    <MinimalistLayout
      title="Detalhes da Venda"
      subtitle={venda.cliente_nome}
      backPath="/direcao/faturamento"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Faturamento', path: '/direcao/faturamento' },
        { label: venda.cliente_nome }
      ]}
      headerActions={
        <Badge 
          className={vendaCompleta 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}
        >
          {vendaCompleta ? 'Faturada' : 'Pendente'}
        </Badge>
      }
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase">Valor Total</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(valorTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase">Lucro Bruto</p>
                    <p className="text-lg font-semibold text-green-400">{formatCurrency(lucroBruto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Percent className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase">Margem</p>
                    <p className="text-lg font-semibold text-blue-400">{margemLucro.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${vendaCompleta ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    {vendaCompleta ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase">Progresso</p>
                    <p className={`text-lg font-semibold ${vendaCompleta ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {itensFaturados}/{totalItens}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Descontos e Acréscimos */}
          {(totalDescontos > 0 || totalAcrescimos > 0) && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/70 uppercase tracking-wide">
                  Descontos e Acréscimos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Descontos */}
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDown className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Descontos</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">-{formatCurrency(totalDescontos)}</p>
                    {autorizacao && (
                      <div className="mt-3 pt-3 border-t border-red-500/20 space-y-1">
                        <p className="text-xs text-white/50">
                          <span className="text-white/40">Percentual:</span>{' '}
                          {autorizacao.percentual_desconto.toFixed(2)}%
                        </p>
                        <p className="text-xs text-white/50">
                          <span className="text-white/40">Tipo:</span>{' '}
                          {autorizacao.tipo_autorizacao === 'master' ? 'Senha Master' : 'Responsável do Setor'}
                        </p>
                        <p className="text-xs text-white/50">
                          <span className="text-white/40">Autorizado por:</span>{' '}
                          {autorizacao.autorizador?.nome || 'Não informado'}
                        </p>
                      </div>
                    )}
                    {!autorizacao && totalDescontos > 0 && (
                      <p className="mt-2 text-xs text-white/40 italic">Sem autorização registrada</p>
                    )}
                  </div>

                  {/* Acréscimos */}
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Acréscimos</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(totalAcrescimos)}</p>
                    {totalAcrescimos > 0 && (
                      <p className="mt-2 text-xs text-white/50">Crédito do cliente</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela de Produtos */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/70 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/50 text-xs">Tipo</TableHead>
                      <TableHead className="text-white/50 text-xs">Descrição</TableHead>
                      <TableHead className="text-white/50 text-xs text-center">Qtd</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Valor</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Desconto</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Custo</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Lucro</TableHead>
                      <TableHead className="text-white/50 text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venda.produtos_vendas.map((produto) => (
                      <TableRow key={produto.id} className="border-white/5">
                        <TableCell className="text-sm text-white/70">
                          {formatTipoProduto(produto.tipo_produto)}
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          <div className="flex items-center gap-2">
                            {produto.catalogo_cores && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div 
                                    className="w-4 h-4 rounded-full border border-white/20"
                                    style={{ backgroundColor: produto.catalogo_cores.codigo_hex }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {produto.catalogo_cores.nome}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className="truncate max-w-[200px]">{produto.descricao}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white/70 text-center">
                          {produto.quantidade}
                        </TableCell>
                        <TableCell className="text-sm text-white text-right">
                          {formatCurrency(produto.valor_total)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {produto.desconto_valor > 0 ? (
                            <span className="text-red-400">-{formatCurrency(produto.desconto_valor)}</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-white/70 text-right">
                          {formatCurrency(produto.custo_producao || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          <span className={produto.lucro_item >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {formatCurrency(produto.lucro_item || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={produto.faturamento
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}
                          >
                            {produto.faturamento ? 'Faturado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Linha Virtual de Instalação */}
                    {venda.valor_instalacao > 0 && (
                      <TableRow className="border-white/5 bg-white/5">
                        <TableCell className="text-sm text-white/70 italic">
                          Serviço
                        </TableCell>
                        <TableCell className="text-sm text-white italic">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-blue-400" />
                            Instalação
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white/70 text-center">1</TableCell>
                        <TableCell className="text-sm text-white text-right">
                          {formatCurrency(venda.valor_instalacao)}
                        </TableCell>
                        <TableCell className="text-sm text-white/40 text-right">-</TableCell>
                        <TableCell className="text-sm text-white/70 text-right">
                          {formatCurrency(venda.custo_instalacao || venda.valor_instalacao * 0.7)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          <span className="text-emerald-400">
                            {formatCurrency(lucroInstalacao)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={venda.instalacao_faturada
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}
                          >
                            {venda.instalacao_faturada ? 'Faturado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Financeiro e Informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resumo Financeiro */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/70 uppercase tracking-wide">
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-white/60">Produtos</span>
                    <span className="text-sm text-white">{formatCurrency(valorProdutos)}</span>
                  </div>
                  {venda.valor_instalacao > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-white/60">Instalação</span>
                      <span className="text-sm text-white">{formatCurrency(venda.valor_instalacao)}</span>
                    </div>
                  )}
                  {venda.valor_frete > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-white/60">Frete</span>
                      <span className="text-sm text-white">{formatCurrency(venda.valor_frete)}</span>
                    </div>
                  )}
                  {totalDescontos > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-white/60">Descontos</span>
                      <span className="text-sm text-red-400">-{formatCurrency(totalDescontos)}</span>
                    </div>
                  )}
                  {totalAcrescimos > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-white/60">Acréscimos</span>
                      <span className="text-sm text-emerald-400">+{formatCurrency(totalAcrescimos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-white/60">Custo Total</span>
                    <span className="text-sm text-white/70">{formatCurrency(totalCustoProducao + (venda.custo_instalacao || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-base font-semibold text-white">Valor Final</span>
                    <span className="text-lg font-bold text-emerald-400">{formatCurrency(valorTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/70 uppercase tracking-wide">
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-white/40" />
                    <div>
                      <p className="text-xs text-white/40">Cliente</p>
                      <p className="text-sm text-white">{venda.cliente_nome}</p>
                    </div>
                  </div>

                  {(venda.cidade || venda.estado) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-white/40" />
                      <div>
                        <p className="text-xs text-white/40">Localização</p>
                        <p className="text-sm text-white">
                          {[venda.cidade, venda.estado].filter(Boolean).join(' / ')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <div>
                      <p className="text-xs text-white/40">Data da Venda</p>
                      <p className="text-sm text-white">
                        {format(new Date(venda.data_venda), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {venda.data_prevista_entrega && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <p className="text-xs text-white/40">Previsão de Entrega</p>
                        <p className="text-sm text-white">
                          {format(new Date(venda.data_prevista_entrega), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}

                  {venda.tipo_entrega && (
                    <div className="flex items-center gap-3">
                      {venda.tipo_entrega === 'instalacao' ? (
                        <Wrench className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Truck className="w-4 h-4 text-amber-400" />
                      )}
                      <div>
                        <p className="text-xs text-white/40">Tipo de Expedição</p>
                        <p className="text-sm text-white capitalize">
                          {venda.tipo_entrega === 'instalacao' ? 'Instalação' : 'Entrega'}
                        </p>
                      </div>
                    </div>
                  )}

                  {atendente && (
                    <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={atendente.foto_perfil_url || ''} />
                        <AvatarFallback className="bg-white/10 text-white text-xs">
                          {atendente.nome.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-white/40">Vendedor</p>
                        <p className="text-sm text-white">{atendente.nome}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    </MinimalistLayout>
  );
}
