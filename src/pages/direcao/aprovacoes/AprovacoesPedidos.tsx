import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePedidosAprovacaoDiretor, PedidoAprovacaoDiretor } from '@/hooks/usePedidosAprovacaoDiretor';
import { getLabelTipoProduto } from '@/utils/tipoProdutoLabels';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function classifySize(largura?: number, altura?: number): string {
  if (!largura || !altura) return '—';
  const area = largura * altura;
  if (area <= 6) return 'P';
  if (area <= 12) return 'G';
  return 'GG';
}

export default function AprovacoesPedidos() {
  const navigate = useNavigate();
  const { pedidos, isLoading, refetch, aprovarPedido, reprovarPedido } = usePedidosAprovacaoDiretor();
  const [expandedPedido, setExpandedPedido] = useState<string | null>(null);
  const [pedidoParaReprovar, setPedidoParaReprovar] = useState<string | null>(null);

  const handleAprovar = async (pedidoId: string) => {
    await aprovarPedido.mutateAsync(pedidoId);
  };

  const handleReprovar = async () => {
    if (!pedidoParaReprovar) return;
    await reprovarPedido.mutateAsync(pedidoParaReprovar);
    setPedidoParaReprovar(null);
  };

  const portas = (p: PedidoAprovacaoDiretor) =>
    p.produtos.filter(pr => pr.tipo_produto === 'porta_enrolar');
  const outrosItens = (p: PedidoAprovacaoDiretor) =>
    p.produtos.filter(pr => pr.tipo_produto !== 'porta_enrolar');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/direcao/aprovacoes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                Aprovações Pedidos
              </h1>
              <p className="text-xs text-muted-foreground">{pedidos.length} pendente(s)</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum pedido aguardando aprovação</p>
          </div>
        ) : (
          pedidos.map((pedido) => {
            const isExpanded = expandedPedido === pedido.id;
            const portasList = portas(pedido);
            const outros = outrosItens(pedido);
            const totalPortas = portasList.reduce((s, p) => s + (p.quantidade || 1), 0);

            return (
              <div
                key={pedido.id}
                className="bg-card border rounded-xl overflow-hidden"
              >
                {/* Summary row */}
                <button
                  className="w-full text-left p-4 flex items-center gap-3"
                  onClick={() => setExpandedPedido(isExpanded ? null : pedido.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold">#{pedido.numero_pedido}</span>
                      <Badge variant="outline" className="text-xs">
                        {totalPortas} porta{totalPortas !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">{pedido.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {pedido.venda?.cidade}{pedido.venda?.estado ? ` - ${pedido.venda.estado}` : ''}
                      {' · '}
                      {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(pedido.venda?.valor_venda || 0)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    {/* Portas */}
                    {portasList.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Portas de Enrolar</h4>
                        <div className="space-y-1.5">
                          {portasList.map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                              <div>
                                <span className="font-medium">
                                  {p.largura && p.altura
                                    ? `${p.largura.toFixed(2)}m × ${p.altura.toFixed(2)}m`
                                    : p.tamanho || `Porta #${i + 1}`}
                                </span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {classifySize(p.largura, p.altura)}
                                </Badge>
                                {p.cor && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    Pintura: {p.cor.nome}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-2">
                                  Qtd: {p.quantidade || 1}
                                </span>
                              </div>
                              <div className="text-right">
                                {p.preco_producao != null && p.preco_producao > 0 && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(p.preco_producao * (p.quantidade || 1))}
                                  </p>
                                )}
                                <p className="font-medium">{formatCurrency(p.valor)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outros itens */}
                    {outros.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Outros Itens</h4>
                        <div className="space-y-1.5">
                          {outros.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                              <div>
                                <span className="font-medium">
                                  {p.acessorio?.nome || p.custos_itens?.descricao || p.descricao || getLabelTipoProduto(p.tipo_produto)}
                                </span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {getLabelTipoProduto(p.tipo_produto)}
                                </Badge>
                              </div>
                              <div className="text-right">
                                {p.preco_producao != null && p.preco_producao > 0 && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(p.preco_producao * (p.quantidade || 1))}
                                  </p>
                                )}
                                <p className="font-medium">{formatCurrency(p.valor)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAprovar(pedido.id)}
                        disabled={aprovarPedido.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setPedidoParaReprovar(pedido.id)}
                        disabled={reprovarPedido.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reprovar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirm rejection dialog */}
      <AlertDialog open={!!pedidoParaReprovar} onOpenChange={(open) => !open && setPedidoParaReprovar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda será marcada como "Reprovada" e o pedido será arquivado. Esta ação pode ser revertida manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReprovar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
