import { useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, Trash2, Calendar, AlertOctagon, User, ArrowUpDown, Pencil, Check, Clock, ChevronsUpDown, FileDown } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
import { cn } from '@/lib/utils';

import { useMultas, Multa } from '@/hooks/useMultas';
import { useAllUsers } from '@/hooks/useAllUsers';
import { exportMultasPDF } from '@/utils/multasPDFGenerator';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type SortKey = 'data_ocorrido' | 'descricao' | 'status' | 'aceite' | 'condutor' | 'pagador' | 'dias' | 'valor' | 'acrescimo' | 'total';

const MULTIPLICADOR_ACRESCIMO = 3;
const semCondutor = (m: Multa) => !m.usuario_id && !m.terceiro_nome;
const acrescimoMulta = (m: Multa) => (semCondutor(m) ? Number(m.valor) * MULTIPLICADOR_ACRESCIMO : 0);
const totalMulta = (m: Multa) => Number(m.valor) + acrescimoMulta(m);
type SortDir = 'asc' | 'desc';

const COLUNAS: { key: SortKey; label: string; className: string }[] = [
  { key: 'data_ocorrido', label: 'Data do ocorrido', className: 'w-[140px]' },
  { key: 'descricao', label: 'Descrição', className: '' },
  { key: 'status', label: 'Status de pagamento', className: 'w-[170px]' },
  { key: 'aceite', label: 'Aceite do condutor', className: 'w-[150px]' },
  { key: 'condutor', label: 'Condutor', className: 'w-[220px]' },
  { key: 'pagador', label: 'Responsável pelo pagamento', className: 'w-[200px]' },
  { key: 'dias', label: 'Dias desde a criação', className: 'w-[160px] text-right' },
  { key: 'valor', label: 'Valor da multa', className: 'w-[140px] text-right' },
  { key: 'acrescimo', label: 'Acréscimo (3x)', className: 'w-[140px] text-right' },
  { key: 'total', label: 'Valor com acréscimo', className: 'w-[160px] text-right' },
];

const parseData = (d: string) => parseISO(d + 'T12:00:00');

interface CondutorCellProps {
  multa: Multa;
  users: { id: string; nome: string }[];
  onSelect: (patch: { usuario_id: string | null; terceiro_nome: string | null }) => void;
}

function CondutorCell({ multa, users, onSelect }: CondutorCellProps) {
  const [open, setOpen] = useState(false);
  const aguardando = !multa.usuario_id && !multa.terceiro_nome;
  const isTerceiro = !multa.usuario_id && !!multa.terceiro_nome;

  const escolher = (patch: { usuario_id: string | null; terceiro_nome: string | null }) => {
    onSelect(patch);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 min-w-0 w-full text-left rounded-md px-1 py-0.5 -mx-1 hover:bg-white/10 transition-colors">
          {multa.usuario_foto ? (
            <img src={multa.usuario_foto} alt={multa.usuario_nome} className="w-6 h-6 rounded-full object-cover border border-white/20" />
          ) : (
            <div className={cn(
              'w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/20',
              aguardando
                ? 'bg-gradient-to-br from-zinc-600 to-zinc-800'
                : isTerceiro
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                  : 'bg-gradient-to-br from-blue-500 to-blue-700'
            )}>
              {aguardando ? <Clock className="w-3 h-3" /> : isTerceiro ? <User className="w-3 h-3" /> : (multa.usuario_nome?.charAt(0) || '?').toUpperCase()}
            </div>
          )}
          <span className={cn('truncate', aguardando ? 'text-amber-300 italic' : 'text-white/85')}>{multa.usuario_nome}</span>
          {isTerceiro && (
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[9px] px-1 py-0">Terceiro</Badge>
          )}
          <ChevronsUpDown className="w-3 h-3 ml-auto shrink-0 text-white/30" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-zinc-900 border-white/10" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Buscar condutor..." className="text-white" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-white/50">Nenhum colaborador encontrado</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Aguardando transferência"
                onSelect={() => escolher({ usuario_id: null, terceiro_nome: null })}
                className="text-amber-300 aria-selected:bg-amber-500/15"
              >
                <Clock className="w-4 h-4 mr-2" />
                Aguardando transferência
                {aguardando && <Check className="w-4 h-4 ml-auto" />}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Colaboradores">
              {users.map(u => (
                <CommandItem
                  key={u.id}
                  value={u.nome}
                  onSelect={() => escolher({ usuario_id: u.id, terceiro_nome: null })}
                  className="text-white/85 aria-selected:bg-blue-500/15"
                >
                  <User className="w-4 h-4 mr-2 text-white/40" />
                  {u.nome}
                  {multa.usuario_id === u.id && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function MultasMinimalista() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Multa | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<Multa | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('data_ocorrido');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Form
  const [tipoResponsavel, setTipoResponsavel] = useState<'colaborador' | 'terceiro' | 'aguardando'>('colaborador');
  const [usuarioId, setUsuarioId] = useState('');
  const [terceiroNome, setTerceiroNome] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataOcorrido, setDataOcorrido] = useState<Date>();
  const [statusForm, setStatusForm] = useState<'pendente' | 'pago'>('pendente');
  const [responsavelPagamento, setResponsavelPagamento] = useState<'condutor' | 'empresa'>('condutor');

  const { data: multas, isLoading, refetch, isRefetching, createMulta, updateMulta, deleteMulta } = useMultas();
  const { data: users } = useAllUsers();

  const resetForm = () => {
    setEditando(null);
    setTipoResponsavel('colaborador');
    setUsuarioId('');
    setTerceiroNome('');
    setValor('');
    setDescricao('');
    setDataOcorrido(undefined);
    setStatusForm('pendente');
    setResponsavelPagamento('condutor');
  };

  const abrirNova = () => {
    resetForm();
    setDialogOpen(true);
  };

  const abrirEdicao = (m: Multa) => {
    setEditando(m);
    setTipoResponsavel(m.usuario_id ? 'colaborador' : (m.terceiro_nome ? 'terceiro' : 'aguardando'));
    setUsuarioId(m.usuario_id || '');
    setTerceiroNome(m.terceiro_nome || '');
    setValor(String(m.valor));
    setDescricao(m.descricao || '');
    setDataOcorrido(m.data_ocorrido ? parseData(m.data_ocorrido) : undefined);
    setStatusForm(m.status === 'pago' ? 'pago' : 'pendente');
    setResponsavelPagamento(m.responsavel_pagamento === 'empresa' ? 'empresa' : 'condutor');
    setDialogOpen(true);
  };

  const linhas = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    const base = (multas || []).filter(m =>
      !s || m.usuario_nome?.toLowerCase().includes(s) || m.descricao?.toLowerCase().includes(s)
    );

    const valorOrdenacao = (m: Multa) => {
      switch (sortKey) {
        case 'data_ocorrido': return m.data_ocorrido || '';
        case 'descricao': return (m.descricao || '').toLowerCase();
        case 'status': return m.status;
        case 'aceite': return m.aceite_condutor ? 1 : 0;
        case 'condutor': return (m.usuario_nome || '').toLowerCase();
        case 'pagador': return m.responsavel_pagamento === 'empresa' ? 1 : 0;
        case 'dias': return differenceInCalendarDays(new Date(), new Date(m.created_at));
        case 'valor': return Number(m.valor);
        case 'acrescimo': return acrescimoMulta(m);
        case 'total': return totalMulta(m);
      }
    };

    return [...base].sort((a, b) => {
      const va = valorOrdenacao(a);
      const vb = valorOrdenacao(b);
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [multas, searchTerm, sortKey, sortDir]);

  const totalPendente = linhas.filter(m => m.status !== 'pago').reduce((s, m) => s + totalMulta(m), 0);
  const totalPago = linhas.filter(m => m.status === 'pago').reduce((s, m) => s + totalMulta(m), 0);
  const totalAcrescimos = linhas.reduce((s, m) => s + acrescimoMulta(m), 0);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSubmit = () => {
    const isColab = tipoResponsavel === 'colaborador';
    const isAguardando = tipoResponsavel === 'aguardando';
    if (!valor || !dataOcorrido) return;
    if (isColab && !usuarioId) return;
    if (!isColab && !isAguardando && !terceiroNome.trim()) return;

    const payload = {
      usuario_id: isColab ? usuarioId : null,
      terceiro_nome: isColab || isAguardando ? null : terceiroNome.trim(),
      valor: Number(valor),
      data_ocorrido: format(dataOcorrido, 'yyyy-MM-dd'),
      descricao: descricao || null,
      status: statusForm,
      responsavel_pagamento: responsavelPagamento,
    };

    if (editando) {
      updateMulta.mutate({ id: editando.id, ...payload }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    } else {
      createMulta.mutate({ ...payload, descricao: descricao || undefined }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    }
  };

  const isSalvando = createMulta.isPending || updateMulta.isPending;

  return (
    <MinimalistLayout
      title="Multas"
      subtitle="Controle de multas em formato de planilha"
      backPath="/administrativo"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Administrativo', path: '/administrativo' },
        { label: 'Multas' },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMultasPDF(linhas)}
            disabled={linhas.length === 0}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={abrirNova} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Multa
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="text-xs text-white/50 mb-1">Total Pendente</div>
            <div className="text-xl font-bold text-amber-400">{formatCurrency(totalPendente)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="text-xs text-white/50 mb-1">Total Pago</div>
            <div className="text-xl font-bold text-emerald-400">{formatCurrency(totalPago)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="text-xs text-white/50 mb-1">Total de Multas</div>
            <div className="text-xl font-bold text-white">{linhas.length}</div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por condutor ou descrição..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Planilha */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white/10">
                  {COLUNAS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/70 border-r border-white/10 cursor-pointer select-none hover:bg-white/10 whitespace-nowrap',
                        col.className
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={cn('w-3 h-3', sortKey === col.key ? 'text-blue-400' : 'text-white/25')} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 w-[90px] text-[11px] font-semibold uppercase tracking-wide text-white/70">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUNAS.length + 1} className="py-12 text-center">
                      <RefreshCw className="w-6 h-6 text-white/40 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : linhas.length === 0 ? (
                  <tr>
                    <td colSpan={COLUNAS.length + 1} className="py-12 text-center text-white/50">
                      <AlertOctagon className="w-10 h-10 mb-3 mx-auto opacity-50" />
                      Nenhuma multa encontrada
                    </td>
                  </tr>
                ) : (
                  linhas.map((m, idx) => {
                    const pago = m.status === 'pago';
                    const dias = differenceInCalendarDays(new Date(), new Date(m.created_at));
                    const semResponsavel = semCondutor(m);
                    const acrescimo = acrescimoMulta(m);
                    return (
                      <tr
                        key={m.id}
                        className={cn(
                          'border-t border-white/5 transition-colors hover:bg-blue-500/10',
                          idx % 2 === 1 && 'bg-white/[0.02]'
                        )}
                      >
                        <td className="px-3 py-2 text-white/80 border-r border-white/5 whitespace-nowrap tabular-nums">
                          {m.data_ocorrido ? format(parseData(m.data_ocorrido), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-white/70 border-r border-white/5 max-w-[420px] truncate" title={m.descricao || ''}>
                          {m.descricao || '—'}
                        </td>
                        <td className="px-3 py-2 border-r border-white/5">
                          <button
                            onClick={() => updateMulta.mutate({ id: m.id, status: pago ? 'pendente' : 'pago' })}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors',
                              pago
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                            )}
                            title="Clique para alternar o status"
                          >
                            {pago ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                            {pago ? 'Pago' : 'Pendente'}
                          </button>
                        </td>
                        <td className="px-3 py-2 border-r border-white/5">
                          <button
                            onClick={() => updateMulta.mutate({ id: m.id, aceite_condutor: !m.aceite_condutor })}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors',
                              m.aceite_condutor
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                            )}
                            title="Clique para alternar o aceite do condutor"
                          >
                            {m.aceite_condutor ? 'Sim' : 'Não'}
                          </button>
                        </td>
                        <td className="px-3 py-2 border-r border-white/5">
                          <CondutorCell
                            multa={m}
                            users={users || []}
                            onSelect={(patch) => updateMulta.mutate({ id: m.id, ...patch })}
                          />
                        </td>
                        <td className="px-3 py-2 border-r border-white/5">
                          <button
                            onClick={() => updateMulta.mutate({ id: m.id, responsavel_pagamento: m.responsavel_pagamento === 'empresa' ? 'condutor' : 'empresa' })}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors',
                              m.responsavel_pagamento === 'empresa'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                                : 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                            )}
                            title="Clique para alternar o responsável pelo pagamento"
                          >
                            {m.responsavel_pagamento === 'empresa' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {m.responsavel_pagamento === 'empresa' ? 'Empresa' : 'Condutor'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-white/70 border-r border-white/5 tabular-nums">
                          {dias} {dias === 1 ? 'dia' : 'dias'}
                        </td>
                        <td className={cn('px-3 py-2 text-right font-semibold border-r border-white/5 tabular-nums', pago ? 'text-emerald-300' : 'text-white')}>
                          {formatCurrency(Number(m.valor))}
                        </td>
                        <td className="px-3 py-2 text-right border-r border-white/5 tabular-nums">
                          {semResponsavel ? (
                            <span className="text-red-300 font-medium">+ {formatCurrency(acrescimo)}</span>
                          ) : (
                            <span className="text-white/25">—</span>
                          )}
                        </td>
                        <td className={cn('px-3 py-2 text-right font-semibold border-r border-white/5 tabular-nums', semResponsavel ? 'text-red-300' : 'text-white/60')}>
                          {formatCurrency(totalMulta(m))}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => abrirEdicao(m)} className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setConfirmExcluir(m)} className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {linhas.length > 0 && (
                <tfoot>
                  <tr className="bg-white/10 border-t border-white/10 font-semibold text-white/80">
                    <td className="px-3 py-2" colSpan={5}>{linhas.length} multa(s)</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(linhas.reduce((s, m) => s + Number(m.valor), 0))}
                    </td>
                    <td className="px-3 py-2 text-right text-red-300 tabular-nums">{formatCurrency(totalAcrescimos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totalPendente + totalPago)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Multa' : 'Cadastrar Multa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-white/70 mb-1 block">Tipo de condutor</label>
              <div className="grid grid-cols-3 gap-2">
                {(['colaborador', 'terceiro', 'aguardando'] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoResponsavel(tipo)}
                    className={cn(
                      'h-10 rounded-md border text-xs sm:text-sm capitalize transition px-1',
                      tipoResponsavel === tipo
                        ? 'bg-blue-500/20 border-blue-400/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    )}
                  >
                    {tipo === 'aguardando' ? 'Aguardando transferência' : tipo}
                  </button>
                ))}
              </div>
            </div>

            {tipoResponsavel === 'aguardando' ? (
              <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Multa sem condutor definido — aguardando transferência de pontuação.
              </div>
            ) : tipoResponsavel === 'colaborador' ? (
              <div>
                <label className="text-sm text-white/70 mb-1 block">Condutor</label>
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
            ) : (
              <div>
                <label className="text-sm text-white/70 mb-1 block">Nome do terceiro</label>
                <Input
                  value={terceiroNome}
                  onChange={e => setTerceiroNome(e.target.value)}
                  placeholder="Ex.: Transportadora X, Fornecedor Y..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-white/70 mb-1 block">Data do ocorrido</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10', !dataOcorrido && 'text-white/40')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    {dataOcorrido ? format(dataOcorrido, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataOcorrido}
                    onSelect={setDataOcorrido}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm text-white/70 mb-1 block">Descrição</label>
              <Input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Motivo da multa..."
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <label className="text-sm text-white/70 mb-1 block">Status de pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pendente', 'pago'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusForm(st)}
                      className={cn(
                        'h-10 rounded-md border text-sm capitalize transition',
                        statusForm === st
                          ? st === 'pago'
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-white'
                            : 'bg-amber-500/20 border-amber-400/50 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={
                !valor ||
                !dataOcorrido ||
                (tipoResponsavel === 'colaborador'
                  ? !usuarioId
                  : tipoResponsavel === 'terceiro'
                    ? !terceiroNome.trim()
                    : false) ||
                isSalvando
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSalvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar Multa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmExcluir} onOpenChange={(o) => { if (!o) setConfirmExcluir(null); }}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir multa</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Deseja excluir a multa de <strong className="text-white">{confirmExcluir?.usuario_nome}</strong> no valor de{' '}
              <strong className="text-white">{confirmExcluir ? formatCurrency(Number(confirmExcluir.valor)) : ''}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmExcluir) deleteMulta.mutate(confirmExcluir.id);
                setConfirmExcluir(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
