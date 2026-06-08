import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Search, Edit2, Trash2, MoreHorizontal, Check, X, CheckCircle2, XCircle, CalendarDays, DollarSign, Plus, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { useAcordosAutorizados, type AcordoAutorizado, type NovoAcordo } from '@/hooks/useAcordosAutorizados';
import { NovoAcordoDialog } from '@/components/autorizados/NovoAcordoDialog';
import { formatCurrency } from '@/lib/utils';
import { criarGastoAcordoAutorizado } from '@/lib/gastoAcordoAutorizado';
import { ConfirmarPagamentoAcordoDialog } from '@/components/autorizados/ConfirmarPagamentoAcordoDialog';
import { HistoricoAcordoDialog } from '@/components/autorizados/HistoricoAcordoDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function AcordosMesAutorizados() {
  const navigate = useNavigate();
  const { ano, mes } = useParams<{ ano: string; mes: string }>();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const contexto: 'direcao' | 'logistica' | 'home' = pathname.startsWith('/direcao')
    ? 'direcao'
    : pathname.startsWith('/logistica')
      ? 'logistica'
      : 'home';

  const backPath = contexto === 'direcao' ? '/direcao/autorizados' : '/autorizados';
  const breadcrumbLabel = contexto === 'direcao' ? 'Direção' : contexto === 'logistica' ? 'Logística' : 'Home';
  const breadcrumbBack = contexto === 'direcao' ? '/direcao' : contexto === 'logistica' ? '/logistica' : '/home';

  const anoNum = Number(ano) || new Date().getFullYear();
  const mesNum = Number(mes);
  const mesValido = !isNaN(mesNum) && mesNum >= 0 && mesNum <= 11;

  const { acordos, loading, createAcordo, updateAcordo, deleteAcordo, refetch } = useAcordosAutorizados();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [acordoDialogOpen, setAcordoDialogOpen] = useState(false);
  const [acordoParaEditar, setAcordoParaEditar] = useState<AcordoAutorizado | null>(null);
  const [acordoParaDeletar, setAcordoParaDeletar] = useState<AcordoAutorizado | null>(null);
  const [precosMap, setPrecosMap] = useState<Map<string, { P: number; G: number; GG: number }>>(new Map());
  const [kmPorAutorizado, setKmPorAutorizado] = useState<Map<string, number | null>>(new Map());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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

  useEffect(() => {
    if (acordos.length === 0) return;
    const autorizadoIds = [...new Set(acordos.map(a => a.autorizado_id))];
    (async () => {
      const { data: autorizadosData } = await supabase
        .from('autorizados')
        .select('id, cidade, estado')
        .in('id', autorizadoIds);
      if (!autorizadosData || autorizadosData.length === 0) {
        setKmPorAutorizado(new Map());
        return;
      }
      const cidades = [...new Set(autorizadosData.map(a => a.cidade).filter(Boolean) as string[])];
      const estados = [...new Set(autorizadosData.map(a => a.estado).filter(Boolean) as string[])];
      const { data: fretes } = await supabase
        .from('frete_cidades')
        .select('cidade, estado, quilometragem')
        .in('cidade', cidades)
        .in('estado', estados);
      const freteMap = new Map<string, number | null>();
      fretes?.forEach((f) => {
        freteMap.set(`${f.cidade}|${f.estado}`, f.quilometragem != null ? Number(f.quilometragem) : null);
      });
      const map = new Map<string, number | null>();
      autorizadosData.forEach((a) => {
        const key = `${a.cidade}|${a.estado}`;
        map.set(a.id, freteMap.has(key) ? freteMap.get(key)! : null);
      });
      setKmPorAutorizado(map);
    })();
  }, [acordos]);

  const acordosDoMes = useMemo(() => {
    if (!mesValido) return [];
    return acordos.filter((acordo) => {
      const data = new Date(acordo.data_acordo);
      return data.getFullYear() === anoNum && data.getMonth() === mesNum;
    });
  }, [acordos, anoNum, mesNum, mesValido]);

  const acordosFiltrados = useMemo(() => {
    return acordosDoMes.filter((acordo) => {
      const matchSearch =
        acordo.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acordo.autorizado_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acordo.cliente_cidade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || acordo.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [acordosDoMes, searchTerm, filterStatus]);

  const acordosAgrupados = useMemo(() => {
    const map = new Map<string, { autorizadoId: string; autorizadoNome: string; total: number; items: AcordoAutorizado[] }>();
    acordosFiltrados.forEach((acordo) => {
      const key = acordo.autorizado_id;
      const grupo = map.get(key) ?? {
        autorizadoId: acordo.autorizado_id,
        autorizadoNome: acordo.autorizado_nome,
        total: 0,
        items: [],
      };
      grupo.items.push(acordo);
      grupo.total += acordo.valor_acordado;
      map.set(key, grupo);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.autorizadoNome.localeCompare(b.autorizadoNome, 'pt-BR')
    );
  }, [acordosFiltrados]);

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
  }, [user?.id, toast, refetch]);

  const handleReprovar = useCallback(async (acordoId: string) => {
    try {
      setRejectingId(acordoId);
      const { error } = await supabase
        .from('acordos_instalacao_autorizados')
        .update({ reprovado_direcao: true } as any)
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
  }, [toast, refetch]);

  const [pagamentoDialog, setPagamentoDialog] = useState<{ acordoId: string; clienteNome: string; valor: number; valorJaPago: number } | null>(null);
  const [historicoDialog, setHistoricoDialog] = useState<{ acordoId: string; clienteNome: string } | null>(null);

  const handleMarcarPago = useCallback(async (acordoId: string, pagoAtual: boolean) => {
    if (pagoAtual) {
      toast({
        title: 'Pagamento não reversível',
        description: 'Acordos pagos não podem ser desmarcados.',
        variant: 'destructive',
      });
      return;
    }
    const acordo = acordosDoMes.find(a => a.id === acordoId);
    if (!acordo) return;
    setPagamentoDialog({
      acordoId,
      clienteNome: acordo.cliente_nome,
      valor: acordo.valor_acordado,
      valorJaPago: acordo.valor_pago ?? 0,
    });
  }, [acordosDoMes, toast]);

  const confirmarPagamento = useCallback(async (bancoId: string, valorPagamento: number) => {
    if (!pagamentoDialog) return;
    const acordo = acordosDoMes.find(a => a.id === pagamentoDialog.acordoId);
    if (!acordo) return;
    const valorJaPago = acordo.valor_pago ?? 0;
    const novoTotalPago = +(valorJaPago + valorPagamento).toFixed(2);
    const quita = novoTotalPago >= acordo.valor_acordado - 0.001;
    try {
      const { error } = await supabase
        .from('acordos_instalacao_autorizados')
        .update({
          valor_pago: novoTotalPago,
          ...(quita ? { pago: true, pago_em: new Date().toISOString(), pago_por: user?.id } : {}),
        } as any)
        .eq('id', acordo.id);
      if (error) throw error;
      await criarGastoAcordoAutorizado({
        acordoId: acordo.id,
        valor: valorPagamento,
        clienteNome: acordo.cliente_nome,
        autorizadoNome: acordo.autorizado_nome,
        responsavelId: user?.id,
        bancoId,
        parcial: !quita,
      });
      toast({ title: 'Sucesso', description: quita ? 'Acordo quitado' : 'Pagamento parcial registrado' });
      await refetch();
    } catch (error: any) {
      console.error('Erro ao confirmar pagamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível confirmar o pagamento', variant: 'destructive' });
    }
  }, [pagamentoDialog, acordosDoMes, user?.id, toast, refetch]);

  const mesLabel = mesValido ? `${MESES[mesNum]} ${anoNum}` : 'Mês inválido';
  const totalValor = acordosDoMes.reduce((sum, a) => sum + a.valor_acordado, 0);

  const headerActions = contexto === 'logistica' || contexto === 'home' ? (
    <Button
      size="sm"
      onClick={handleNovoAcordo}
      className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 border border-blue-400/30 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Novo Acordo</span>
    </Button>
  ) : null;

  return (
    <MinimalistLayout
      title={mesLabel}
      subtitle={`${acordosDoMes.length} acordo${acordosDoMes.length === 1 ? '' : 's'} · ${formatCurrency(totalValor)}`}
      backPath={backPath}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: breadcrumbLabel, path: breadcrumbBack },
        { label: "Autorizados", path: backPath },
        { label: mesLabel },
      ]}
      headerActions={headerActions}
      fullWidth
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <CalendarDays className="h-4 w-4 text-blue-400" />
          <span>Acordos firmados com autorizados em {mesLabel}.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : acordosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
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
                      <TableHead className="text-xs text-white/70 text-center">Km</TableHead>
                      <TableHead className="text-xs text-white/70 text-center">Data</TableHead>
                      <TableHead className="text-xs text-white/70 text-right">Valor</TableHead>
                      <TableHead className="text-xs text-white/70 text-right">Valor excesso</TableHead>
                      <TableHead className="text-xs text-white/70 text-center">Status</TableHead>
                      <TableHead className="text-xs text-white/70 text-center">Pagamento</TableHead>
                      <TableHead className="text-xs text-white/70">Observações</TableHead>
                      <TableHead className="text-xs text-white/70 text-center">Histórico</TableHead>
                      {(contexto === 'direcao' || contexto === 'home') && (
                        <TableHead className="text-xs text-white/70 text-center">Aprovação</TableHead>
                      )}
                      {(contexto === 'logistica' || contexto === 'home') && (
                        <TableHead className="text-right text-xs text-white/70">Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider>
                      {(() => {
                        const colSpan =
                          13 +
                          ((contexto === 'direcao' || contexto === 'home') ? 1 : 0) +
                          ((contexto === 'logistica' || contexto === 'home') ? 1 : 0);
                        return acordosAgrupados.map((grupo, idx) => (
                          <Fragment key={grupo.autorizadoId}>
                            <TableRow className={`bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20 ${idx > 0 ? 'border-t-4 border-t-white/5' : ''}`}>
                              <TableCell colSpan={colSpan} className="py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-blue-200">
                                    {grupo.autorizadoNome}
                                    {(() => {
                                      const km = kmPorAutorizado.get(grupo.autorizadoId);
                                      return km != null ? <span className="ml-2 text-xs font-normal text-white/60">· {km} km</span> : null;
                                    })()}
                                  </span>
                                  <span className="text-xs text-white/70">
                                    {grupo.items.length} acordo{grupo.items.length === 1 ? '' : 's'} ·{' '}
                                    <span className="text-green-400 font-medium">{formatCurrency(grupo.total)}</span>
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {grupo.items.map((acordo) => {
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
                                <TableCell className="text-white/70">{acordo.autorizado_nome}</TableCell>
                                <TableCell><span className="font-medium">{acordo.cliente_nome}</span></TableCell>
                                <TableCell className="text-white/70">{acordo.cliente_cidade} - {acordo.cliente_estado}</TableCell>
                                <TableCell className="text-center text-white/70">
                                  {(() => {
                                    const km = kmPorAutorizado.get(acordo.autorizado_id);
                                    return km != null ? `${km} km` : <span className="text-white/40">—</span>;
                                  })()}
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
                                  ) : (acordo.valor_pago ?? 0) > 0 ? (
                                    <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1" title={`${formatCurrency(acordo.valor_pago)} de ${formatCurrency(acordo.valor_acordado)}`}>
                                      <DollarSign className="h-3 w-3" />
                                      Parcial · {formatCurrency(acordo.valor_pago)}
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
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHistoricoDialog({ acordoId: acordo.id, clienteNome: acordo.cliente_nome });
                                    }}
                                    title="Ver histórico"
                                  >
                                    <History className="h-4 w-4 text-blue-400/80" />
                                  </Button>
                                </TableCell>
                                {(contexto === 'direcao' || contexto === 'home') && (
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
                                {(contexto === 'logistica' || contexto === 'home') && (
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
                                        <DropdownMenuItem
                                          disabled={acordo.pago}
                                          className="cursor-pointer hover:bg-zinc-700 data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed"
                                          onClick={() => { if (!acordo.pago) handleMarcarPago(acordo.id, acordo.pago); }}
                                        >
                                          <DollarSign className="h-4 w-4 mr-2 text-green-400" />
                                          <span className="text-green-400">
                                            {acordo.pago
                                              ? 'Pago — não reversível'
                                              : (acordo.valor_pago ?? 0) > 0
                                                ? 'Continuar pagamento'
                                                : 'Registrar pagamento'}
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
                          </Fragment>
                        ));
                      })()}
                    </TooltipProvider>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {(contexto === 'logistica' || contexto === 'home') && (
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
      <ConfirmarPagamentoAcordoDialog
        open={!!pagamentoDialog}
        onOpenChange={(open) => { if (!open) setPagamentoDialog(null); }}
        clienteNome={pagamentoDialog?.clienteNome}
        valor={pagamentoDialog?.valor}
        valorJaPago={pagamentoDialog?.valorJaPago ?? 0}
        onConfirm={confirmarPagamento}
      />
      <HistoricoAcordoDialog
        open={!!historicoDialog}
        onOpenChange={(open) => { if (!open) setHistoricoDialog(null); }}
        acordoId={historicoDialog?.acordoId ?? null}
        clienteNome={historicoDialog?.clienteNome}
      />
    </MinimalistLayout>
  );
}