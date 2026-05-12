import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface ItemRequisicao {
  id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  ipi_percent: number;
  observacoes?: string | null;
  estoque?: { nome_produto?: string; sku?: string | null; unidade?: string | null } | null;
}

interface RequisicaoPendente {
  id: string;
  numero_requisicao: string;
  status: string;
  data_necessidade: string | null;
  observacoes: string | null;
  valor_total: number;
  created_at: string;
  solicitante_id: string | null;
  solicitante_nome?: string | null;
  fornecedores?: { nome?: string; cnpj?: string | null; cidade?: string | null; estado?: string | null } | null;
  itens: ItemRequisicao[];
}

export default function AprovacoesCompras() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reprovarId, setReprovarId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data: requisicoes = [], isLoading, refetch } = useQuery({
    queryKey: ['aprovacoes-compras'],
    queryFn: async (): Promise<RequisicaoPendente[]> => {
      const { data: reqData, error } = await supabase
        .from('requisicoes_compra')
        .select('*, fornecedores(nome, cnpj, cidade, estado)')
        .eq('status', 'pendente_aprovacao')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const solicitanteIds = Array.from(
        new Set((reqData || []).map((r: any) => r.solicitante_id).filter(Boolean))
      );
      const solicitanteMap: Record<string, string> = {};
      if (solicitanteIds.length > 0) {
        const { data: usersData } = await supabase
          .from('admin_users')
          .select('user_id, nome')
          .in('user_id', solicitanteIds);
        (usersData || []).forEach((u: any) => {
          if (u.user_id) solicitanteMap[u.user_id] = u.nome;
        });
      }

      const comItens = await Promise.all(
        (reqData || []).map(async (req: any) => {
          const { data: itensData } = await supabase
            .from('requisicoes_compra_itens')
            .select('*, estoque(nome_produto, sku, unidade)')
            .eq('requisicao_id', req.id);
          return {
            ...req,
            solicitante_nome: solicitanteMap[req.solicitante_id] ?? null,
            itens: (itensData || []) as ItemRequisicao[],
          } as RequisicaoPendente;
        })
      );
      return comItens;
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('requisicoes_compra')
        .update({
          status: 'aprovada',
          aprovado_por: user?.id,
          data_aprovacao: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-compras'] });
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-compras-count'] });
      queryClient.invalidateQueries({ queryKey: ['requisicoes-compra'] });
      toast({ title: 'Requisição aprovada', description: 'A compra foi aprovada com sucesso.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' });
    },
  });

  const reprovarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('requisicoes_compra')
        .update({
          status: 'rejeitada',
          motivo_rejeicao: motivo || null,
          aprovado_por: user?.id,
          data_aprovacao: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-compras'] });
      queryClient.invalidateQueries({ queryKey: ['aprovacoes-compras-count'] });
      queryClient.invalidateQueries({ queryKey: ['requisicoes-compra'] });
      toast({ title: 'Requisição reprovada' });
      setReprovarId(null);
      setMotivo('');
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao reprovar', description: e.message, variant: 'destructive' });
    },
  });

  const totalItem = (it: ItemRequisicao) => {
    const qtd = Number(it.quantidade) || 0;
    const vu = Number(it.valor_unitario) || 0;
    const ipi = Number(it.ipi_percent) || 0;
    return qtd * vu * (1 + ipi / 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/direcao/aprovacoes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                Aprovações Compras
              </h1>
              <p className="text-xs text-muted-foreground">{requisicoes.length} pendente(s)</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : requisicoes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma requisição aguardando aprovação</p>
          </div>
        ) : (
          requisicoes.map((req) => {
            const isExpanded = expandedId === req.id;
            const cidadeUf = [req.fornecedores?.cidade, req.fornecedores?.estado]
              .filter(Boolean)
              .join(' - ');

            return (
              <div key={req.id} className="bg-card border rounded-xl overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold">#{req.numero_requisicao}</span>
                      <Badge variant="outline" className="text-xs">
                        {req.itens.length} {req.itens.length === 1 ? 'item' : 'itens'}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">{req.fornecedores?.nome || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {cidadeUf || '—'}
                      {' · '}
                      {format(new Date(req.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      {req.solicitante_nome ? ` · ${req.solicitante_nome}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(req.valor_total)}</p>
                    {req.data_necessidade && (
                      <p className="text-xs text-muted-foreground">
                        até {format(new Date(req.data_necessidade + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Itens</h4>
                      <div className="space-y-1.5">
                        {req.itens.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <span className="font-medium">{it.estoque?.nome_produto || '—'}</span>
                              {it.estoque?.sku && (
                                <span className="ml-2 text-xs text-muted-foreground">SKU: {it.estoque.sku}</span>
                              )}
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Qtd: {it.quantidade} {it.estoque?.unidade || ''} ·{' '}
                                Unit.: {formatCurrency(it.valor_unitario)} ·{' '}
                                IPI: {Number(it.ipi_percent || 0).toFixed(2)}%
                              </div>
                            </div>
                            <p className="font-medium ml-3 shrink-0">{formatCurrency(totalItem(it))}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {req.observacoes && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Observações</h4>
                        <p className="text-sm bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                          {req.observacoes}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => aprovarMutation.mutate(req.id)}
                        disabled={aprovarMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setReprovarId(req.id)}
                        disabled={reprovarMutation.isPending}
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

      <AlertDialog
        open={!!reprovarId}
        onOpenChange={(open) => {
          if (!open) {
            setReprovarId(null);
            setMotivo('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar requisição?</AlertDialogTitle>
            <AlertDialogDescription>
              A requisição será marcada como rejeitada. Informe o motivo (opcional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da rejeição"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reprovarId && reprovarMutation.mutate({ id: reprovarId, motivo })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}