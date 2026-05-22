import { useState } from 'react';
import { Search, Plus, AlertCircle, RefreshCw, Trash2, Calendar, DollarSign, AlertTriangle, AlertOctagon, CheckCircle2, ChevronRight } from 'lucide-react';
import { format, parseISO, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useMultas, Multa } from '@/hooks/useMultas';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useMultasEtapaResponsaveis, MultaStatus } from '@/hooks/useMultasEtapaResponsaveis';
import { useAuth } from '@/hooks/useAuth';
import { SelecionarResponsavelMultaModal } from '@/components/multas/SelecionarResponsavelMultaModal';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const ETAPAS: {
  value: MultaStatus;
  label: string;
  icon: any;
  pill: string;
  ring: string;
  avatarBorder: string;
  iconWrap: string;
  iconColor: string;
}[] = [
  {
    value: 'aberta',
    label: 'Aberta',
    icon: AlertCircle,
    pill: 'bg-blue-500/20 text-blue-400',
    ring: 'data-[state=active]:bg-blue-500/15 data-[state=active]:border-blue-400/50 data-[state=active]:shadow-[0_0_0_1px_rgba(96,165,250,0.3)] hover:border-blue-400/30',
    avatarBorder: 'border-blue-500/30',
    iconWrap: 'bg-blue-500/10 border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    value: 'advertida',
    label: 'Advertida',
    icon: AlertTriangle,
    pill: 'bg-amber-500/20 text-amber-400',
    ring: 'data-[state=active]:bg-amber-500/15 data-[state=active]:border-amber-400/50 data-[state=active]:shadow-[0_0_0_1px_rgba(251,191,36,0.3)] hover:border-amber-400/30',
    avatarBorder: 'border-amber-500/30',
    iconWrap: 'bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    value: 'paga',
    label: 'Paga',
    icon: DollarSign,
    pill: 'bg-green-500/20 text-green-400',
    ring: 'data-[state=active]:bg-green-500/15 data-[state=active]:border-green-400/50 data-[state=active]:shadow-[0_0_0_1px_rgba(74,222,128,0.3)] hover:border-green-400/30',
    avatarBorder: 'border-green-500/30',
    iconWrap: 'bg-green-500/10 border-green-500/30',
    iconColor: 'text-green-400',
  },
  {
    value: 'concluida',
    label: 'Concluída',
    icon: CheckCircle2,
    pill: 'bg-emerald-500/20 text-emerald-400',
    ring: 'data-[state=active]:bg-emerald-500/15 data-[state=active]:border-emerald-400/50 data-[state=active]:shadow-[0_0_0_1px_rgba(52,211,153,0.3)] hover:border-emerald-400/30',
    avatarBorder: 'border-emerald-500/30',
    iconWrap: 'bg-emerald-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
];

function getNextEtapa(status: MultaStatus): MultaStatus | null {
  const idx = ETAPAS.findIndex((e) => e.value === status);
  if (idx < 0 || idx >= ETAPAS.length - 1) return null;
  return ETAPAS[idx + 1].value;
}

function MultaCard({
  multa,
  podeAvancar,
  proximaLabel,
  responsavelNome,
  onAvancar,
  onExcluir,
}: {
  multa: Multa;
  podeAvancar: boolean;
  proximaLabel: string | null;
  responsavelNome: string | null;
  onAvancar: () => void;
  onExcluir: () => void;
}) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = parseISO(multa.data_vencimento + 'T12:00:00');
  const vencido = isBefore(venc, hoje);
  const venceHoje = isToday(venc);

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          {(vencido || venceHoje) && multa.status !== 'paga' && multa.status !== 'concluida' && (
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-[10px] px-1.5 py-0 ${vencido ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                {vencido ? 'Vencida' : 'Vence Hoje'}
              </Badge>
            </div>
          )}
          <h3 className="text-white font-medium truncate">{multa.usuario_nome}</h3>
          {multa.descricao && (
            <p className="text-sm text-white/50 mt-1 truncate">{multa.descricao}</p>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="text-center">
            <div className="text-xs text-white/50 mb-0.5">Vencimento</div>
            <div className={`text-sm font-medium flex items-center gap-1 ${vencido ? 'text-red-400' : venceHoje ? 'text-amber-400' : 'text-white'}`}>
              <Calendar className="w-3 h-3" />
              {format(venc, 'dd/MM/yyyy', { locale: ptBR })}
            </div>
          </div>

          <div className="text-right min-w-[100px]">
            <div className="text-xs text-white/50 mb-0.5">Valor</div>
            <div className="text-base font-semibold text-amber-400 flex items-center justify-end gap-1">
              <DollarSign className="w-4 h-4" />
              {formatCurrency(multa.valor).replace('R$', '').trim()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {proximaLabel && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onAvancar}
                        disabled={!podeAvancar}
                        className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {proximaLabel}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {podeAvancar
                      ? `Avançar para ${proximaLabel}`
                      : responsavelNome
                        ? `Somente ${responsavelNome} pode avançar`
                        : 'Atribua um responsável para avançar'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button size="icon" variant="ghost" onClick={onExcluir} className="text-red-400 hover:text-red-300 hover:bg-red-500/20" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MultasMinimalista() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataVencimento, setDataVencimento] = useState<Date>();
  const [statusAtivo, setStatusAtivo] = useState<MultaStatus>('aberta');
  const [respModalEtapa, setRespModalEtapa] = useState<MultaStatus | null>(null);

  const { data: multas, isLoading, refetch, isRefetching, createMulta, updateStatus, deleteMulta } = useMultas();
  const { data: users } = useAllUsers();
  const { getResponsavel, atribuirResponsavel, removerResponsavel, isAtribuindo } = useMultasEtapaResponsaveis();
  const { user } = useAuth();

  const respAtual = getResponsavel(statusAtivo);
  const podeAvancar = !!user && !!respAtual && respAtual.user_id === user.id;

  const filtered = multas?.filter(m => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return m.usuario_nome?.toLowerCase().includes(s) || m.descricao?.toLowerCase().includes(s);
  }) || [];

  const contadores: Record<MultaStatus, number> = {
    aberta: filtered.filter(m => m.status === 'aberta').length,
    advertida: filtered.filter(m => m.status === 'advertida').length,
    paga: filtered.filter(m => m.status === 'paga').length,
    concluida: filtered.filter(m => m.status === 'concluida').length,
  };
  const totalPendente = filtered
    .filter(m => m.status === 'aberta' || m.status === 'advertida')
    .reduce((sum, m) => sum + Number(m.valor), 0);

  const multasEtapa = filtered.filter(m => m.status === statusAtivo);

  const handleSubmit = () => {
    if (!usuarioId || !valor || !dataVencimento) return;
    const dataStr = format(dataVencimento, 'yyyy-MM-dd');
    createMulta.mutate(
      { usuario_id: usuarioId, valor: Number(valor), data_vencimento: dataStr, descricao: descricao || undefined },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setUsuarioId('');
          setValor('');
          setDescricao('');
          setDataVencimento(undefined);
        },
      }
    );
  };

  return (
    <MinimalistLayout
      title="Multas"
      subtitle="Cadastro e controle de multas por colaborador"
      backPath="/administrativo"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Administrativo', path: '/administrativo' },
        { label: 'Multas' },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Multa
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Cadastrar Multa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Colaborador</label>
                  <select
                    value={usuarioId}
                    onChange={e => setUsuarioId(e.target.value)}
                    className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-white text-sm"
                  >
                    <option value="" className="bg-zinc-900">Selecione...</option>
                    {users?.map(u => (
                      <option key={u.id} value={u.id} className="bg-zinc-900">{u.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Valor (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    placeholder="0,00"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Data de Vencimento</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10", !dataVencimento && "text-white/40")}>
                        <Calendar className="w-4 h-4 mr-2" />
                        {dataVencimento ? format(dataVencimento, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataVencimento}
                        onSelect={setDataVencimento}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Descrição (opcional)</label>
                  <Input
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Motivo da multa..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <Button onClick={handleSubmit} disabled={!usuarioId || !valor || !dataVencimento || createMulta.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {createMulta.isPending ? 'Salvando...' : 'Cadastrar Multa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Total Pendente</div>
            <div className="text-xl font-bold text-amber-400">{formatCurrency(totalPendente)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Total de Multas</div>
            <div className="text-xl font-bold text-white">{filtered.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Concluídas</div>
            <div className="text-xl font-bold text-emerald-400">{contadores.concluida}</div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por colaborador ou descrição..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Tabs de etapas */}
        <Tabs value={statusAtivo} onValueChange={(v) => setStatusAtivo(v as MultaStatus)}>
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-[85px] p-1.5 gap-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl">
            <div className="flex gap-1 border-2 border-blue-500/50 rounded-lg p-1 h-full">
              {ETAPAS.map((etapa) => {
                const resp = getResponsavel(etapa.value);
                const Icon = etapa.icon;
                return (
                  <TabsTrigger
                    key={etapa.value}
                    value={etapa.value}
                    className={cn(
                      'flex-shrink-0 flex-row items-center justify-start h-full min-w-[150px] px-3 py-2 gap-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl text-white/70 transition-all data-[state=active]:text-white',
                      etapa.ring,
                    )}
                  >
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRespModalEtapa(etapa.value);
                      }}
                      className="flex-shrink-0 cursor-pointer"
                      title={resp ? `Responsável: ${resp.nome}` : 'Atribuir responsável'}
                    >
                      {resp ? (
                        <Avatar className={cn('h-9 w-9 border', etapa.avatarBorder)}>
                          <AvatarImage src={resp.foto_perfil_url || undefined} />
                          <AvatarFallback className={`text-xs ${etapa.pill}`}>
                            {resp.nome.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={cn('h-9 w-9 rounded-full border flex items-center justify-center', etapa.iconWrap)}>
                          <Icon className={cn('h-4 w-4', etapa.iconColor)} />
                        </div>
                      )}
                    </span>
                    <div className="flex flex-col items-start gap-1 min-w-0">
                      <span className="text-xs font-medium leading-tight truncate">{etapa.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${etapa.pill}`}>
                        {contadores[etapa.value]}
                      </span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </div>
          </TabsList>

          {ETAPAS.map((etapa) => (
            <TabsContent key={etapa.value} value={etapa.value} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
                </div>
              ) : multasEtapa.length === 0 && statusAtivo === etapa.value ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/50">
                  <AlertOctagon className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma multa em "{etapa.label}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {multasEtapa.map((multa) => {
                    const proxima = getNextEtapa(multa.status as MultaStatus);
                    const proximaLabel = proxima ? ETAPAS.find((e) => e.value === proxima)!.label : null;
                    return (
                      <MultaCard
                        key={multa.id}
                        multa={multa}
                        podeAvancar={podeAvancar && !!proxima}
                        proximaLabel={proximaLabel}
                        responsavelNome={respAtual?.nome || null}
                        onAvancar={() => proxima && updateStatus.mutate({ id: multa.id, status: proxima })}
                        onExcluir={() => deleteMulta.mutate(multa.id)}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {respModalEtapa && (
          <SelecionarResponsavelMultaModal
            open={!!respModalEtapa}
            onOpenChange={(o) => { if (!o) setRespModalEtapa(null); }}
            etapaLabel={ETAPAS.find((e) => e.value === respModalEtapa)!.label}
            responsavelAtualId={getResponsavel(respModalEtapa)?.user_id || null}
            onConfirm={(userId) => atribuirResponsavel({ status: respModalEtapa, responsavelId: userId })}
            onRemover={() => removerResponsavel(respModalEtapa)}
            isLoading={isAtribuindo}
          />
        )}
      </div>
    </MinimalistLayout>
  );
}
