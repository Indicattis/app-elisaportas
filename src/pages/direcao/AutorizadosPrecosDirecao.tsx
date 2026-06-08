import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, MoreHorizontal, Check, X, CheckCircle2, XCircle, ChevronLeft, ChevronRight, CalendarDays, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { useEstadosCidades } from '@/hooks/useEstadosCidades';
import { SortableEstadoCard } from '@/components/autorizados/EstadoCard';
import { NovoEstadoDialog } from '@/components/autorizados/NovoEstadoDialog';
import { useAcordosAutorizados, type AcordoAutorizado, type NovoAcordo } from '@/hooks/useAcordosAutorizados';
import { NovoAcordoDialog } from '@/components/autorizados/NovoAcordoDialog';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';

interface Props {
  contexto?: 'direcao' | 'logistica' | 'home';
}

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos os Status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
];

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  concluido: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};

const PORTA_COLORS: Record<string, string> = {
  P: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  G: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  GG: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
};

export default function AutorizadosPrecosDirecao({ contexto = 'direcao' }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  // Estados
  const { estados, loading: loadingEstados, criarEstado, editarEstado, reordenarEstados } = useEstadosCidades();
  const [novoEstadoOpen, setNovoEstadoOpen] = useState(false);
  const [estadoParaEditar, setEstadoParaEditar] = useState<typeof estados[0] | null>(null);

  // Acordos
  const { acordos, loading: loadingAcordos, createAcordo, updateAcordo, deleteAcordo, refetch } = useAcordosAutorizados();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [acordoDialogOpen, setAcordoDialogOpen] = useState(false);
  const [acordoParaEditar, setAcordoParaEditar] = useState<AcordoAutorizado | null>(null);
  const [acordoParaDeletar, setAcordoParaDeletar] = useState<AcordoAutorizado | null>(null);
  const [precosMap, setPrecosMap] = useState<Map<string, { P: number; G: number; GG: number }>>(new Map());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);

  // Buscar preços padrões dos autorizados
  useEffect(() => {
    if (acordos.length === 0) return;
    const autorizadoIds = [...new Set(acordos.map(a => a.autorizado_id))];
    supabase
      .from('autorizado_precos_portas')
      .select('autorizado_id, tamanho, valor')
      .in('autorizado_id', autorizadoIds)
      .then(({ data }) => {
        const map = new Map<string, { P: number; G: number; GG: number }>();
        data?.forEach((row) => {
          const existing = map.get(row.autorizado_id) || { P: 0, G: 0, GG: 0 };
          existing[row.tamanho as 'P' | 'G' | 'GG'] = Number(row.valor);
          map.set(row.autorizado_id, existing);
        });
        setPrecosMap(map);
      });
  }, [acordos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const backPath = contexto === 'logistica' ? '/logistica' : contexto === 'home' ? '/home' : '/direcao';
  const breadcrumbLabel = contexto === 'logistica' ? 'Logística' : contexto === 'home' ? 'Home' : 'Direção';
  const routePrefix = contexto === 'home' ? '/autorizados' : `/${contexto}/autorizados`;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = estados.findIndex(e => e.id === active.id);
      const newIndex = estados.findIndex(e => e.id === over?.id);
      const newOrder = arrayMove(estados, oldIndex, newIndex);
      reordenarEstados(newOrder);
    }
  };

  const handleCloseEstadoDialog = (open: boolean) => {
    setNovoEstadoOpen(open);
    if (!open) setEstadoParaEditar(null);
  };

  // Acordos logic
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const acordosPorMes = useMemo(() => {
    const map: Record<number, AcordoAutorizado[]> = {};
    for (let i = 0; i < 12; i++) map[i] = [];
    acordos.forEach((acordo) => {
      const data = new Date(acordo.data_acordo);
      if (data.getFullYear() === anoSelecionado) {
        map[data.getMonth()].push(acordo);
      }
    });
    return map;
  }, [acordos, anoSelecionado]);

  const acordosDoMesFiltrados = useMemo(() => {
    if (mesSelecionado === null) return [];
    const acordosDoMes = acordosPorMes[mesSelecionado] || [];
    return acordosDoMes.filter((acordo) => {
      const matchSearch =
        acordo.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acordo.autorizado_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acordo.cliente_cidade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || acordo.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [acordosPorMes, mesSelecionado, searchTerm, filterStatus]);

  const handleNovoAcordo = () => {
    setAcordoParaEditar(null);
    setAcordoDialogOpen(true);
  };

  const handleEditarAcordo = (acordo: AcordoAutorizado) => {
    setAcordoParaEditar(acordo);
    setAcordoDialogOpen(true);
  };

  const handleSalvarAcordo = async (novoAcordo: NovoAcordo) => {
    if (acordoParaEditar) {
      await updateAcordo(acordoParaEditar.id, novoAcordo);
    } else {
      await createAcordo(novoAcordo);
    }
  };

  const handleConfirmarDelete = async () => {
    if (acordoParaDeletar) {
      await deleteAcordo(acordoParaDeletar.id);
      setAcordoParaDeletar(null);
    }
  };

  const getResumoPortasBadges = (acordo: AcordoAutorizado) => {
    const resumo = acordo.portas.reduce((acc, p) => {
      acc[p.tamanho] = (acc[p.tamanho] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(resumo).map(([tam, qtd]) => (
      <Badge
        key={tam}
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${PORTA_COLORS[tam] || 'bg-white/10 text-white/70 border-white/20'}`}
      >
        {qtd}{tam}
      </Badge>
    ));
  };

  const handleAprovar = useCallback(async (acordoId: string) => {
    try {
      setApprovingId(acordoId);
      const { error } = await supabase
        .from('acordos_instalacao_autorizados')
        .update({
          aprovado_direcao: true,
          aprovado_direcao_por: user?.id,
          aprovado_direcao_em: new Date().toISOString(),
        } as any)
        .eq('id', acordoId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Acordo aprovado com sucesso' });
      await refetch();
    } catch (error: any) {
      console.error('Erro ao aprovar acordo:', error);
      toast({ title: 'Erro', description: 'Não foi possível aprovar o acordo', variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  }, [user?.id, toast]);

  const handleReprovar = useCallback(async (acordoId: string) => {
    try {
      setRejectingId(acordoId);
      const { error } = await supabase
        .from('acordos_instalacao_autorizados')
        .update({
          reprovado_direcao: true,
        } as any)
        .eq('id', acordoId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Acordo reprovado' });
      await refetch();
    } catch (error: any) {
      console.error('Erro ao reprovar acordo:', error);
      toast({ title: 'Erro', description: 'Não foi possível reprovar o acordo', variant: 'destructive' });
    } finally {
      setRejectingId(null);
    }
  }, [toast]);

  const handleMarcarPago = useCallback(async (acordoId: string, pagoAtual: boolean) => {
    try {
      const { error } = await supabase
        .from('acordos_instalacao_autorizados')
        .update({
          pago: !pagoAtual,
          pago_em: !pagoAtual ? new Date().toISOString() : null,
          pago_por: !pagoAtual ? user?.id : null,
        } as any)
        .eq('id', acordoId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: !pagoAtual ? 'Acordo marcado como pago' : 'Pagamento desmarcado' });
      await refetch();
    } catch (error: any) {
      console.error('Erro ao atualizar pagamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o pagamento', variant: 'destructive' });
    }
  }, [user?.id, toast, refetch]);

  const headerActions = (
    <>
      <Button
        size="sm"
        onClick={() => navigate(`${routePrefix}/novo`)}
        className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/20 text-white shadow-lg shadow-blue-500/10 hover:from-blue-500/30 hover:to-blue-600/30 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Novo Autorizado</span>
      </Button>
      <Button
        size="sm"
        onClick={() => setNovoEstadoOpen(true)}
        className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/20 text-white shadow-lg shadow-blue-500/10 hover:from-blue-500/30 hover:to-blue-600/30 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Novo Estado</span>
      </Button>
      {contexto === 'logistica' && (
        <Button
          size="sm"
          onClick={handleNovoAcordo}
          className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 border border-blue-400/30 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Acordo</span>
        </Button>
      )}
    </>
  );

  return (
    <MinimalistLayout
      title="Gestão de Autorizados"
      subtitle={`${estados.length} estados cadastrados`}
      backPath={backPath}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: breadcrumbLabel, path: backPath },
        { label: "Autorizados" }
      ]}
      headerActions={headerActions}
    >
      <div className="space-y-8">
          {/* Seção Estados */}
          {loadingEstados ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-medium text-white/70 mb-3">Estados Cadastrados</h2>
              {estados.length === 0 ? (
                <div className="text-center py-8 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-white/60 mb-4">Nenhum estado cadastrado</p>
                  <Button onClick={() => setNovoEstadoOpen(true)} variant="outline" className="bg-primary/10 border-primary/20">
                    <Plus className="h-4 w-4 mr-1" />
                    Cadastrar Estado
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={estados.map(e => e.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {estados.map(estado => (
                        <SortableEstadoCard
                          key={estado.id}
                          estado={estado}
                          onClick={() => navigate(`${routePrefix}/estado/${estado.id}`)}
                          isSelected={false}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {/* Separador */}
          <div className="border-t border-blue-500/10" />

              {/* Seção Acordos - Grid de Meses */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-white/70">Acordos com Autorizados</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnoSelecionado(prev => prev - 1)}
                      className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold text-white/90 min-w-[4rem] text-center">{anoSelecionado}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnoSelecionado(prev => prev + 1)}
                      className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {loadingAcordos ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {MESES.map((mes, index) => {
                      const acordosDoMes = acordosPorMes[index] || [];
                      const total = acordosDoMes.length;
                      const valorTotal = acordosDoMes.reduce((sum, a) => sum + a.valor_acordado, 0);
                      const pendentes = acordosDoMes.filter(a => !a.aprovado_direcao && !a.reprovado_direcao).length;
                      const mesAtual = new Date().getMonth() === index && new Date().getFullYear() === anoSelecionado;

                      return (
                        <Card
                          key={index}
                          onClick={() => { setMesSelecionado(index); setSearchTerm(''); setFilterStatus('todos'); }}
                          className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] backdrop-blur-xl border ${
                            mesAtual
                              ? 'bg-blue-500/10 border-blue-400/30 shadow-lg shadow-blue-500/10'
                              : total > 0
                                ? 'bg-white/5 border-blue-500/10 hover:bg-white/10'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                          }`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${mesAtual ? 'text-blue-300' : 'text-white/80'}`}>
                                {mes}
                              </span>
                              {pendentes > 0 && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
                                  {pendentes} pendente{pendentes > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-end justify-between">
                              <span className="text-lg font-bold text-white/90">{total}</span>
                              {valorTotal > 0 && (
                                <span className="text-xs text-green-400/80">{formatCurrency(valorTotal)}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

        {/* Dialog do mês selecionado */}
        <Dialog open={mesSelecionado !== null} onOpenChange={(open) => { if (!open) setMesSelecionado(null); }}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-black/95 border-white/10 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-400" />
                {mesSelecionado !== null ? `${MESES[mesSelecionado]} ${anoSelecionado}` : ''}
              </DialogTitle>
            </DialogHeader>

            {/* Filtros dentro do dialog */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar por cliente, autorizado ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {acordosDoMesFiltrados.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/60">Nenhum acordo encontrado neste mês</p>
              </div>
            ) : (
              <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="border-blue-500/10 hover:bg-white/5">
                          <TableHead className="text-xs text-white/70 text-center">Portas</TableHead>
                          <TableHead className="text-xs text-white/70 text-center">Medidas</TableHead>
                          <TableHead className="text-xs text-white/70">Autorizado</TableHead>
                          <TableHead className="text-xs text-white/70">Cliente</TableHead>
                          <TableHead className="text-xs text-white/70">Cidade</TableHead>
                          <TableHead className="text-xs text-white/70 text-center">Data</TableHead>
                          <TableHead className="text-xs text-white/70 text-right">Valor</TableHead>
                          <TableHead className="text-xs text-white/70 text-right">Valor excesso</TableHead>
                          <TableHead className="text-xs text-white/70 text-center">Status</TableHead>
                          <TableHead className="text-xs text-white/70 text-center">Pagamento</TableHead>
                          <TableHead className="text-xs text-white/70">Observações</TableHead>
                          {contexto === 'direcao' && (
                            <TableHead className="text-xs text-white/70 text-center">Aprovação</TableHead>
                          )}
                          {contexto === 'logistica' && (
                            <TableHead className="text-right text-xs text-white/70">Ações</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TooltipProvider>
                        {acordosDoMesFiltrados.map((acordo) => {
                          const precos = precosMap.get(acordo.autorizado_id);
                          return (
                          <Tooltip key={acordo.id}>
                            <TooltipTrigger asChild>
                              <TableRow className="border-blue-500/10 hover:bg-white/5 text-white/90 cursor-default">
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {getResumoPortasBadges(acordo)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-white/70 text-xs">
                                  {acordo.portas.map(p =>
                                    p.largura && p.altura ? `${p.largura}m × ${p.altura}m` : '-'
                                  ).join(', ')}
                                </TableCell>
                                <TableCell className="text-white/70">
                                  {acordo.autorizado_nome}
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{acordo.cliente_nome}</span>
                                </TableCell>
                                <TableCell className="text-white/70">
                                  {acordo.cliente_cidade} - {acordo.cliente_estado}
                                </TableCell>
                                <TableCell className="text-center text-white/60">
                                  {format(new Date(acordo.data_acordo), 'dd/MM/yy', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-400">
                                  {formatCurrency(acordo.valor_acordado)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {acordo.portas.length > 0 ? (() => {
                                    const totalRef = acordo.portas.reduce((sum, p) => sum + p.valor_unitario, 0);
                                    const excesso = acordo.valor_acordado - totalRef;
                                    return (
                                      <span className={excesso > 0 ? 'text-red-400' : 'text-green-400'}>
                                        {excesso > 0 ? '+' : ''}{formatCurrency(excesso)}
                                      </span>
                                    );
                                  })() : <span className="text-white/40">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={STATUS_COLORS[acordo.status]}>
                                    {STATUS_LABELS[acordo.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {acordo.pago ? (
                                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      Pago
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10">
                                      Pendente
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-white/60 max-w-[200px] truncate" title={acordo.observacoes || ''}>
                                  {acordo.observacoes || '—'}
                                </TableCell>
                                {contexto === 'direcao' && (
                                  <TableCell className="text-center">
                                    {acordo.aprovado_direcao ? (
                                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Aprovado
                                      </Badge>
                                    ) : acordo.reprovado_direcao ? (
                                      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                                        <XCircle className="h-3 w-3" />
                                        Reprovado
                                      </Badge>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1">
                                        <Button
                                          size="sm"
                                          disabled={approvingId === acordo.id}
                                          onClick={(e) => { e.stopPropagation(); handleAprovar(acordo.id); }}
                                          className="h-7 px-2 text-xs bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 gap-1"
                                        >
                                          <Check className="h-3 w-3" />
                                          Aprovar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          disabled={rejectingId === acordo.id}
                                          onClick={(e) => { e.stopPropagation(); handleReprovar(acordo.id); }}
                                          className="h-7 px-2 text-xs border border-red-500/30 text-red-400 hover:bg-red-500/20 gap-1"
                                        >
                                          <X className="h-3 w-3" />
                                          Reprovar
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                )}
                                {contexto === 'logistica' && (
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                                          <MoreHorizontal className="h-4 w-4 text-white/60" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                                        <DropdownMenuItem className="text-white hover:bg-zinc-700 cursor-pointer" onClick={() => handleEditarAcordo(acordo)}>
                                          <Edit2 className="h-4 w-4 mr-2" /> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer hover:bg-zinc-700" onClick={() => handleMarcarPago(acordo.id, acordo.pago)}>
                                          <DollarSign className={`h-4 w-4 mr-2 ${acordo.pago ? 'text-yellow-400' : 'text-green-400'}`} />
                                          <span className={acordo.pago ? 'text-yellow-400' : 'text-green-400'}>
                                            {acordo.pago ? 'Desmarcar Pago' : 'Marcar como Pago'}
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/20 cursor-pointer" onClick={() => setAcordoParaDeletar(acordo)}>
                                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                )}
                              </TableRow>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-zinc-900 border-zinc-700">
                              <div className="space-y-1 text-xs">
                                <p className="font-semibold text-white/80 border-b border-zinc-700 pb-1 mb-1">Preços Padrão</p>
                                {precos ? (
                                  <>
                                    <div className="flex items-center justify-between gap-6">
                                      <span className="text-white/60">Porta P</span>
                                      <span className="text-white font-medium">{formatCurrency(precos.P)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6">
                                      <span className="text-white/60">Porta G</span>
                                      <span className="text-white font-medium">{formatCurrency(precos.G)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6">
                                      <span className="text-white/60">Porta GG</span>
                                      <span className="text-white font-medium">{formatCurrency(precos.GG)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-white/40">Sem preços cadastrados</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          );
                        })}
                        </TooltipProvider>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
           </DialogContent>
        </Dialog>
      </div>

      <NovoEstadoDialog
        open={novoEstadoOpen}
        onOpenChange={handleCloseEstadoDialog}
        onSave={criarEstado}
        estadoParaEditar={estadoParaEditar}
        onUpdate={editarEstado}
        estadosCadastrados={estados.map(e => e.sigla)}
      />

      {contexto === 'logistica' && (
        <>
          <NovoAcordoDialog
            open={acordoDialogOpen}
            onOpenChange={setAcordoDialogOpen}
            onSave={handleSalvarAcordo}
            acordoParaEditar={acordoParaEditar}
          />

          <AlertDialog open={!!acordoParaDeletar} onOpenChange={() => setAcordoParaDeletar(null)}>
            <AlertDialogContent className="bg-black/90 border-white/10 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  Tem certeza que deseja excluir o acordo com <strong>{acordoParaDeletar?.cliente_nome}</strong>?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/20 bg-white/10 text-white hover:bg-white/15">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmarDelete} className="bg-red-500/80 hover:bg-red-500 text-white">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </MinimalistLayout>
  );
}
