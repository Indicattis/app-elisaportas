import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency, cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package, Phone, MapPin, Calendar, DollarSign,
  ShoppingCart, ChevronDown, User, Hammer, Truck, Wrench, Clock, CreditCard, ExternalLink,
  MessageSquare, Send, Percent
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { VendaPendentePedido } from "@/hooks/useVendasPendentePedido";
import { buscarPrecosPorMedidas } from "@/utils/tabelaPrecosHelper";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import { useConfiguracoesVendas } from "@/hooks/useConfiguracoesVendas";

interface VendaPendenteDetalhesSheetProps {
  venda: VendaPendentePedido | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
  boleto: "Boleto",
  a_vista: "À Vista (PIX, Débito)",
  cartao_credito: "Cartão de Crédito",
  dinheiro: "Dinheiro",
  avista: "À Vista",
  credito: "Cartão de Crédito",
};

function normalizarTexto(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseMedida(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function extrairDimensoesProduto(produto: {
  largura?: number | string | null;
  altura?: number | string | null;
  tamanho?: string | null;
}) {
  const largura = parseMedida(produto.largura);
  const altura = parseMedida(produto.altura);

  if (largura > 0 && altura > 0) {
    return { largura, altura };
  }

  if (produto.tamanho) {
    const match = String(produto.tamanho).match(/(\d+[.,]?\d*)\s*[xX×]\s*(\d+[.,]?\d*)/);
    if (match) {
      return {
        largura: parseFloat(match[1].replace(",", ".")),
        altura: parseFloat(match[2].replace(",", ".")),
      };
    }
  }

  return null;
}

function criarChavePrecoTabela(largura: number, altura: number) {
  return `${largura.toFixed(3)}-${altura.toFixed(3)}`;
}

export function VendaPendenteDetalhesSheet({ venda, open, onOpenChange }: VendaPendenteDetalhesSheetProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { limites: configLimites } = useConfiguracoesVendas();
  const [vendaCompleta, setVendaCompleta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [itensOpen, setItensOpen] = useState(true);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [comentariosOpen, setComentariosOpen] = useState(false);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [precosTabela, setPrecosTabela] = useState<Map<string, ItemTabelaPreco>>(new Map());
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);

  // Calculate discount tiers (Cartão / Gelo / Luan-Alana)
  const descontoTiers = useMemo(() => {
    if (!vendaCompleta || !venda) return null;
    const produtos = vendaCompleta.produtos_vendas || [];
    const valorTabela = produtos.reduce((sum: number, p: any) => {
      const qty = p.quantidade || 1;
      return sum + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
    }, 0);
    if (valorTabela === 0) return null;

    const descontoTotal = produtos.reduce((sum: number, p: any) => {
      const qty = p.quantidade || 1;
      if (p.tipo_desconto === 'valor') return sum + (p.desconto_valor || 0);
      if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
        const base = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
        return sum + base * (p.desconto_percentual / 100);
      }
      return sum;
    }, 0);
    if (descontoTotal <= 0) return null;

    const totalPct = (descontoTotal / valorTabela) * 100;
    const formaPag = vendaCompleta.forma_pagamento || '';
    const isCartao = formaPag === 'cartao_credito';
    const isPresencial = vendaCompleta.venda_presencial === true;

    const limAvista = configLimites?.avista ?? 3;
    const limPresencial = configLimites?.presencial ?? 5;

    let pctCartao = 0;
    let pctGelo = 0;
    let pctResp = 0;
    let remaining = totalPct;

    if (!isCartao) {
      pctCartao = Math.min(remaining, limAvista);
      remaining -= pctCartao;
    }
    if (isPresencial && remaining > 0) {
      pctGelo = Math.min(remaining, limPresencial);
      remaining -= pctGelo;
    }
    if (remaining > 0) {
      pctResp = remaining;
    }

    return {
      cartao: { pct: pctCartao, valor: valorTabela * (pctCartao / 100) },
      gelo: { pct: pctGelo, valor: valorTabela * (pctGelo / 100) },
      responsavel: { pct: pctResp, valor: valorTabela * (pctResp / 100) },
      totalPct,
      totalValor: descontoTotal,
    };
  }, [vendaCompleta, venda, configLimites]);

  useEffect(() => {
    if (open && venda?.id) {
      fetchVendaCompleta();
      fetchContasReceber();
      fetchComentarios();
    }
  }, [open, venda?.id]);

  const fetchVendaCompleta = async () => {
    if (!venda) return;
    setLoading(true);
    setPrecosTabela(new Map());

    try {
      const { data } = await supabase
        .from("vendas")
        .select(`
          *,
          produtos_vendas (
            id, tipo_produto, tamanho, quantidade, largura, altura,
            valor_produto, valor_pintura, valor_instalacao, valor_total,
            desconto_percentual, desconto_valor, tipo_desconto,
            descricao, faturamento,
            catalogo_cores (nome, codigo_hex),
            vendas_catalogo (nome_produto),
            custos_itens (descricao)
          )
        `)
        .eq("id", venda.id)
        .single();

      setVendaCompleta(data);

      const produtosVenda = data?.produtos_vendas || [];
      const dimensoesUnicas = new Map<string, { largura: number; altura: number }>();

      for (const produto of produtosVenda) {
        if (produto.tipo_produto !== "porta_enrolar" && produto.tipo_produto !== "pintura_epoxi") {
          continue;
        }

        const dimensoes = extrairDimensoesProduto(produto);
        if (!dimensoes) continue;

        const key = criarChavePrecoTabela(dimensoes.largura, dimensoes.altura);
        if (!dimensoesUnicas.has(key)) {
          dimensoesUnicas.set(key, dimensoes);
        }
      }

      if (dimensoesUnicas.size > 0) {
        const precoMap = new Map<string, ItemTabelaPreco>();

        await Promise.all(
          Array.from(dimensoesUnicas.entries()).map(async ([key, dimensoes]) => {
            const result = await buscarPrecosPorMedidas(dimensoes.largura, dimensoes.altura);
            if (result) {
              precoMap.set(key, result);
            }
          })
        );

        setPrecosTabela(precoMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContasReceber = async () => {
    if (!venda) return;
    try {
      const { data } = await supabase
        .from("contas_receber")
        .select("*")
        .eq("venda_id", venda.id)
        .order("numero_parcela");
      setContasReceber(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComentarios = async () => {
    if (!venda) return;
    try {
      const { data } = await (supabase
        .from("venda_comentarios" as any)
        .select("*")
        .eq("venda_id", venda.id)
        .order("created_at", { ascending: false }) as any);
      setComentarios(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnviarComentario = async () => {
    if (!novoComentario.trim() || !venda || !userRole) return;
    setEnviandoComentario(true);
    try {
      await (supabase.from("venda_comentarios" as any) as any).insert({
        venda_id: venda.id,
        autor_id: userRole.user_id,
        autor_nome: userRole.nome,
        comentario: novoComentario.trim(),
      });
      setNovoComentario("");
      fetchComentarios();
    } catch (err) {
      console.error(err);
    } finally {
      setEnviandoComentario(false);
    }
  };

  if (!venda) return null;

  const produtos = vendaCompleta?.produtos_vendas || [];
  const valorTotal = (venda.valor_venda || 0) + (venda.valor_credito || 0);
  const diasPendente = differenceInDays(new Date(), new Date(venda.data_venda));

  const tipoEntregaLabel = (() => {
    if (!venda.tipo_entrega) return null;
    const tipo = venda.tipo_entrega.toLowerCase();
    if (tipo.includes('instalacao') || tipo.includes('instalação')) return { label: 'Instalação', icon: Hammer, color: 'text-blue-400' };
    if (tipo.includes('entrega')) return { label: 'Entrega', icon: Truck, color: 'text-green-400' };
    if (tipo.includes('manutencao') || tipo.includes('manutenção')) return { label: 'Manutenção', icon: Wrench, color: 'text-orange-400' };
    return null;
  })();

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] max-w-[700px] mx-auto rounded-t-2xl overflow-hidden flex flex-col p-0 bg-zinc-900 border-t border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl border-b border-white/10 px-6 py-4">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-400" />
                Venda Pendente de Pedido
              </SheetTitle>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/financeiro/faturamento/${venda.id}?from=vendas`);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Faturamento
              </Button>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white mb-2 truncate">
                  {venda.cliente_nome || "Cliente não informado"}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                  {(venda.cidade || venda.estado) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      {[venda.cidade, venda.estado].filter(Boolean).join('/')}
                    </span>
                  )}
                  {vendaCompleta?.cliente_telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-green-400" />
                      {vendaCompleta.cliente_telefone}
                    </span>
                  )}
                  {venda.atendente_nome && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-purple-400" />
                      {venda.atendente_nome}
                    </span>
                  )}
                </div>

                {/* Cores */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {venda.cores.length > 0 ? (
                    venda.cores.map((cor) => (
                      <div key={cor.nome} className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 border border-white/20">
                        <div
                          className="w-3 h-3 rounded-full border border-white/30"
                          style={{ backgroundColor: cor.codigo_hex }}
                        />
                        <span className="text-xs text-white/80">{cor.nome}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 border border-white/20">
                      <span className="text-xs text-white/60">Galvanizada</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Valor Total</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(valorTotal)}
                </p>
                {venda.valor_credito > 0 && (
                  <p className="text-xs text-white/40 mt-0.5">
                    Crédito: {formatCurrency(venda.valor_credito)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Itens da Venda */}
          <Collapsible open={itensOpen} onOpenChange={setItensOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">Itens da Venda</span>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                    {loading ? '...' : produtos.length}
                  </Badge>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-white/60 transition-transform duration-200", itensOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 pl-0">
              {loading ? (
                <div className="text-sm text-white/50 p-2">Carregando...</div>
              ) : produtos.length > 0 ? (
                <div className="rounded-lg border border-white/10 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Produto</th>
                        <th className="text-right px-2 py-2 text-white/50 font-medium">Tabela</th>
                        <th className="text-right px-2 py-2 text-white/50 font-medium">Desc/Acrés</th>
                        <th className="text-right px-3 py-2 text-white/50 font-medium">Vendido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.map((produto: any, idx: number) => {
                        const tipo = produto.tipo_produto;
                        const qtd = produto.quantidade || 1;
                        const cor = produto.catalogo_cores;
                        const catalogoNome = produto.vendas_catalogo?.nome_produto;
                        const nomeMap: Record<string, string> = {
                          porta_enrolar: 'Porta de Enrolar',
                          pintura_epoxi: 'Pintura Epóxi',
                          motor: 'Motor',
                          acessorio: 'Acessório',
                          adicional: 'Adicional',
                          manutencao: 'Manutenção',
                        };
                        const nome = catalogoNome 
                          ? catalogoNome
                          : (tipo === 'acessorio' || tipo === 'adicional') && produto.descricao
                            ? produto.descricao
                            : (nomeMap[tipo] || tipo);

                        let tamanhoStr = '';
                        const dimensoes = extrairDimensoesProduto(produto);
                        if (tipo === 'porta_enrolar') {
                          if (dimensoes) {
                            tamanhoStr = `${dimensoes.largura.toFixed(2)} x ${dimensoes.altura.toFixed(2)}m`;
                          } else if (produto.tamanho) {
                            tamanhoStr = produto.tamanho;
                          }
                        }

                        const tipoEntregaNormalizado = normalizarTexto(vendaCompleta?.tipo_entrega || venda?.tipo_entrega);
                        const isInstalacao = tipoEntregaNormalizado === 'instalacao' || tipoEntregaNormalizado.includes('instalacao');
                        let precoTabela = produto.valor_produto || 0;

                        if (tipo === 'porta_enrolar') {
                          precoTabela = produto.valor_produto || 0;
                          if (dimensoes) {
                            const ref = precosTabela.get(criarChavePrecoTabela(dimensoes.largura, dimensoes.altura));
                            if (ref) {
                              precoTabela = ref.valor_porta;
                            }
                          }
                        } else if (tipo === 'pintura_epoxi') {
                          precoTabela = produto.valor_pintura || 0;
                          if (dimensoes) {
                            const ref = precosTabela.get(criarChavePrecoTabela(dimensoes.largura, dimensoes.altura));
                            if (ref && ref.valor_pintura > 0) {
                              precoTabela = ref.valor_pintura;
                            }
                          }
                        }
                        const valorVendido = produto.valor_total || 0;
                        const descPerc = produto.desconto_percentual || 0;
                        const descValor = produto.desconto_valor || 0;
                        const diferenca = valorVendido - precoTabela;
                        const temDesconto = descPerc > 0 || descValor > 0;
                        
                        return (
                          <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Package className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                                <div className="min-w-0">
                                <p 
                                    className="font-medium text-white text-xs truncate cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => setProdutoSelecionado(produto)}
                                  >
                                    {qtd > 1 && <span className="text-white/60">{qtd}x </span>}
                                    {nome}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {tamanhoStr && (
                                      <span className="text-[10px] text-white/40">{tamanhoStr}</span>
                                    )}
                                    {cor && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full border border-white/30" style={{ backgroundColor: cor.codigo_hex }} />
                                        <span className="text-[10px] text-white/40">{cor.nome}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="text-right px-2 py-2 text-white/50 whitespace-nowrap">
                              {formatCurrency(precoTabela)}
                            </td>
                            <td className="text-right px-2 py-2 whitespace-nowrap">
                              {temDesconto ? (
                                <span className="text-red-400">
                                  {descPerc > 0 ? `-${descPerc}%` : `-${formatCurrency(descValor)}`}
                                </span>
                              ) : diferenca !== 0 ? (
                                <span className={diferenca > 0 ? "text-green-400" : "text-red-400"}>
                                  {diferenca > 0 ? '+' : ''}{formatCurrency(diferenca)}
                                </span>
                              ) : (
                                <span className="text-white/30">—</span>
                              )}
                            </td>
                            <td className="text-right px-3 py-2 font-medium text-white whitespace-nowrap">
                              {formatCurrency(valorVendido)}
                              {produto.faturamento && (
                                <Badge className="ml-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] px-1 py-0">
                                  Fat
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {(() => {
                        let totalTabela = 0;
                        let totalVendido = 0;
                        for (const p of produtos) {
                          const qty = p.quantidade || 1;
                          totalTabela += ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
                          totalVendido += (p.valor_total || 0);
                        }
                        const totalDiferenca = totalVendido - totalTabela;
                        const valorFrete = vendaCompleta?.valor_frete || 0;
                        const totalGeral = totalVendido + valorFrete;
                        return (
                          <>
                            <tr className="bg-white/5 border-t border-white/10">
                              <td className="px-3 py-1.5 text-white/60 font-medium">Produtos</td>
                              <td className="text-right px-2 py-1.5 font-semibold text-white/50 whitespace-nowrap">
                                {formatCurrency(totalTabela)}
                              </td>
                              <td className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                                {totalDiferenca !== 0 ? (
                                  <span className={totalDiferenca > 0 ? "text-green-400" : "text-red-400"}>
                                    {totalDiferenca > 0 ? '+' : ''}{formatCurrency(totalDiferenca)}
                                  </span>
                                ) : (
                                  <span className="text-white/30">—</span>
                                )}
                              </td>
                              <td className="text-right px-3 py-1.5 font-semibold text-white whitespace-nowrap">
                                {formatCurrency(totalVendido)}
                              </td>
                            </tr>
                            {valorFrete > 0 && (
                              <tr className="bg-white/5">
                                <td className="px-3 py-1.5 text-white/60 font-medium">Frete</td>
                                <td className="text-right px-2 py-1.5 text-white/30">—</td>
                                <td className="text-right px-2 py-1.5 text-white/30">—</td>
                                <td className="text-right px-3 py-1.5 font-semibold text-white whitespace-nowrap">
                                  {formatCurrency(valorFrete)}
                                </td>
                              </tr>
                            )}
                            <tr className="bg-white/10 border-t border-white/20">
                              <td className="px-3 py-2 text-white font-bold">Total Geral</td>
                              <td className="text-right px-2 py-2"></td>
                              <td className="text-right px-2 py-2"></td>
                              <td className="text-right px-3 py-2 font-bold text-green-400 whitespace-nowrap">
                                {formatCurrency(totalGeral)}
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-white/50 p-2">Nenhum item encontrado</div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              <Calendar className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-white/50 uppercase">Data Venda</p>
              <p className="text-sm font-semibold text-white">
                {format(new Date(venda.data_venda), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              <Clock className={cn("h-4 w-4 mx-auto mb-1", diasPendente > 14 ? "text-red-400" : diasPendente > 7 ? "text-yellow-400" : "text-green-400")} />
              <p className="text-[10px] text-white/50 uppercase">Dias Pendente</p>
              <p className={cn("text-sm font-semibold", diasPendente > 14 ? "text-red-400" : diasPendente > 7 ? "text-yellow-400" : "text-white")}>
                {diasPendente} dias
              </p>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              {tipoEntregaLabel ? (
                <>
                  <tipoEntregaLabel.icon className={cn("h-4 w-4 mx-auto mb-1", tipoEntregaLabel.color)} />
                  <p className="text-[10px] text-white/50 uppercase">Tipo Entrega</p>
                  <p className="text-sm font-semibold text-white">{tipoEntregaLabel.label}</p>
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 text-white/30 mx-auto mb-1" />
                  <p className="text-[10px] text-white/50 uppercase">Tipo Entrega</p>
                  <p className="text-sm text-white/40">—</p>
                </>
              )}
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              <CreditCard className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <p className="text-[10px] text-white/50 uppercase">Pagamento</p>
              <p className="text-sm font-semibold text-white">
                {(() => {
                  const methods: string[] = [];
                  if (venda.metodo_pagamento) methods.push(FORMAS_PAGAMENTO_LABELS[venda.metodo_pagamento] || venda.metodo_pagamento);
                  if (venda.metodo_pagamento_entrega) {
                    const l2 = FORMAS_PAGAMENTO_LABELS[venda.metodo_pagamento_entrega] || venda.metodo_pagamento_entrega;
                    if (!methods.includes(l2)) methods.push(l2);
                  }
                  return methods.length > 0 ? methods.join('/') : '—';
                })()}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              <CreditCard className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-white/50 uppercase">Parcelas</p>
              <p className="text-sm font-semibold text-white">
                {venda.numero_parcelas ? `${venda.numero_parcelas}x` : '—'}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              <DollarSign className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] text-white/50 uppercase">Pago na Entrega</p>
              <p className={cn("text-sm font-semibold", venda.pagamento_na_entrega ? "text-emerald-400" : "text-white/40")}>
                {venda.pagamento_na_entrega ? 'Sim' : 'Não'}
              </p>
            </div>

            {(venda.valor_desconto_total > 0 || venda.valor_credito > 0) && (
              <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
                <DollarSign className="h-4 w-4 text-red-400 mx-auto mb-1" />
                <p className="text-[10px] text-white/50 uppercase">Desc/Crédito</p>
                <div className="space-y-0.5">
                  {venda.valor_desconto_total > 0 && (
                    <p className="text-sm font-semibold text-red-400">
                      -{formatCurrency(venda.valor_desconto_total)}
                    </p>
                  )}
                  {venda.valor_credito > 0 && (
                    <p className="text-xs text-blue-400">
                      Créd: {formatCurrency(venda.valor_credito)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
              <DollarSign className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] text-white/50 uppercase">Lucro</p>
              <p className={cn("text-sm font-semibold", venda.lucro_total && venda.lucro_total > 0 ? "text-emerald-400" : "text-white/40")}>
                {venda.lucro_total && venda.lucro_total > 0 ? formatCurrency(venda.lucro_total) : '—'}
              </p>
            </div>
          </div>

          {/* Descontos por Faixa */}
          {descontoTiers && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-red-400" />
                Descontos por Faixa ({descontoTiers.totalPct.toFixed(1)}% total)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-lg border border-white/10 p-2.5 text-center">
                  <p className="text-[9px] text-white/40 uppercase font-medium mb-1">Cartão</p>
                  <p className={cn("text-sm font-bold", descontoTiers.cartao.pct > 0 ? "text-red-400" : "text-white/20")}>
                    {descontoTiers.cartao.pct > 0 ? `${descontoTiers.cartao.pct.toFixed(1)}%` : '—'}
                  </p>
                  {descontoTiers.cartao.pct > 0 && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">-{formatCurrency(descontoTiers.cartao.valor)}</p>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg border border-white/10 p-2.5 text-center">
                  <p className="text-[9px] text-white/40 uppercase font-medium mb-1">Gelo</p>
                  <p className={cn("text-sm font-bold", descontoTiers.gelo.pct > 0 ? "text-red-400" : "text-white/20")}>
                    {descontoTiers.gelo.pct > 0 ? `${descontoTiers.gelo.pct.toFixed(1)}%` : '—'}
                  </p>
                  {descontoTiers.gelo.pct > 0 && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">-{formatCurrency(descontoTiers.gelo.valor)}</p>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg border border-white/10 p-2.5 text-center">
                  <p className="text-[9px] text-white/40 uppercase font-medium mb-1">Luan/Alana</p>
                  <p className={cn("text-sm font-bold", descontoTiers.responsavel.pct > 0 ? "text-orange-400" : "text-white/20")}>
                    {descontoTiers.responsavel.pct > 0 ? `${descontoTiers.responsavel.pct.toFixed(1)}%` : '—'}
                  </p>
                  {descontoTiers.responsavel.pct > 0 && (
                    <p className="text-[10px] text-orange-400/70 mt-0.5">-{formatCurrency(descontoTiers.responsavel.valor)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Portas Info */}
          {venda.portas_info.length > 0 && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-3">
                Portas ({venda.portas_info.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {venda.portas_info.map((porta, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-1 text-white",
                      porta.tamanho === 'P' ? "bg-blue-500/20 border-blue-500/50" : "bg-orange-500/20 border-orange-500/50"
                    )}
                  >
                    {porta.tamanho} — {porta.largura.toFixed(2)}m × {porta.altura.toFixed(2)}m ({porta.area.toFixed(1)}m²)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contas a Receber */}
          <Collapsible open={pagamentoOpen} onOpenChange={setPagamentoOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-white text-sm">Parcelas / Recebimentos</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    {contasReceber.length}
                  </Badge>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-white/60 transition-transform duration-200", pagamentoOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5 pl-2">
              {contasReceber.length > 0 ? (
                contasReceber.map((parcela: any) => (
                  <div key={parcela.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">
                        Parcela {parcela.numero_parcela}
                      </p>
                      <p className="text-white/40 text-[11px]">
                        Venc: {format(new Date(parcela.data_vencimento), "dd/MM/yyyy")}
                        {parcela.metodo_pagamento && ` • ${FORMAS_PAGAMENTO_LABELS[parcela.metodo_pagamento] || parcela.metodo_pagamento}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/80">{formatCurrency(parcela.valor_parcela)}</span>
                      <Badge className={cn(
                        "text-[10px]",
                        parcela.status === 'pago'
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      )}>
                        {parcela.status === 'pago' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/50 p-2">Nenhuma parcela gerada</div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Observações */}
          {vendaCompleta?.observacoes_venda && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">Observações</h3>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{vendaCompleta.observacoes_venda}</p>
            </div>
          )}

          {/* Comentários */}
          <Collapsible open={comentariosOpen} onOpenChange={setComentariosOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium text-white text-sm">Comentários</span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    {comentarios.length}
                  </Badge>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-white/60 transition-transform duration-200", comentariosOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 pl-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Escreva um comentário..."
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEnviarComentario()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleEnviarComentario}
                  disabled={enviandoComentario || !novoComentario.trim()}
                  className="text-yellow-400 hover:bg-yellow-500/20 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {comentarios.map((c: any) => (
                <div key={c.id} className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/80">{c.autor_nome}</span>
                    <span className="text-[10px] text-white/40">
                      {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{c.comentario}</p>
                </div>
              ))}
              {comentarios.length === 0 && (
                <div className="text-sm text-white/50 p-2">Nenhum comentário</div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>

    {/* Modal de Preço de Tabela */}
    <Dialog open={!!produtoSelecionado} onOpenChange={(open) => !open && setProdutoSelecionado(null)}>
      <DialogContent className="bg-background border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">Preço de Tabela</DialogTitle>
        </DialogHeader>
        {(() => {
          if (!produtoSelecionado) return null;
          const dims = extrairDimensoesProduto(produtoSelecionado);
          const precoTab = dims ? precosTabela.get(criarChavePrecoTabela(dims.largura, dims.altura)) : null;
          
          if (!precoTab) {
            return (
              <div className="text-white/50 text-sm py-4 text-center">
                Sem preço de tabela cadastrado para este item.
              </div>
            );
          }
          
          return (
            <div className="space-y-3">
              <div className="text-xs text-white/50 mb-2">
                {precoTab.descricao} — {precoTab.largura}m × {precoTab.altura}m
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs block mb-1">Porta</span>
                  <span className="text-white font-medium">{formatCurrency(precoTab.valor_porta)}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs block mb-1">Pintura</span>
                  <span className="text-white font-medium">{formatCurrency(precoTab.valor_pintura)}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs block mb-1">Instalação</span>
                  <span className="text-white font-medium">{formatCurrency(precoTab.valor_instalacao)}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs block mb-1">Lucro</span>
                  <span className="text-white font-medium">{formatCurrency(precoTab.lucro)}</span>
                </div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20 flex justify-between items-center">
                <span className="text-white/70 text-xs">Total Tabela</span>
                <span className="text-primary font-semibold">
                  {formatCurrency(precoTab.valor_porta + precoTab.valor_pintura + precoTab.valor_instalacao)}
                </span>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
    </>
  );
}
