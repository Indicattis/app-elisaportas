import { useMemo, useState } from 'react';
import { Gavel, Plus, Trash2, MessageSquarePlus, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import {
  useProcessosJustica,
  useProcessoAtualizacoes,
  ProcessoJustica,
  ProcessoModelo,
  ProcessoStatus,
} from '@/hooks/useProcessosJustica';

const formatBRL = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const modeloLabel: Record<ProcessoModelo, string> = {
  trabalhista: 'Trabalhista',
  judicial: 'Judicial',
};

const statusLabel: Record<ProcessoStatus, string> = {
  em_andamento: 'Em andamento',
  encerrado: 'Encerrado',
};

type FormState = {
  modelo: ProcessoModelo;
  nome: string;
  acordo_sugerido_valor: string;
  acordo_sugerido_texto: string;
  acordo_proposto_valor: string;
  sem_acordo: boolean;
  valor_final: string;
  status: ProcessoStatus;
};

const emptyForm: FormState = {
  modelo: 'trabalhista',
  nome: '',
  acordo_sugerido_valor: '',
  acordo_sugerido_texto: '',
  acordo_proposto_valor: '',
  sem_acordo: false,
  valor_final: '',
  status: 'em_andamento',
};

const parseNum = (v: string): number | null => {
  const clean = v.replace(/\./g, '').replace(',', '.').trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

export default function ProcessosJusticaDirecao() {
  const { userRole } = useAuth();
  const { processos, isLoading, criar, atualizar, excluir } = useProcessosJustica();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selecionado, setSelecionado] = useState<ProcessoJustica | null>(null);

  const totais = useMemo(() => {
    return processos.reduce(
      (acc, p) => {
        acc.sugerido += Number(p.acordo_sugerido_valor) || 0;
        acc.proposto += Number(p.acordo_proposto_valor) || 0;
        acc.final += Number(p.valor_final) || 0;
        return acc;
      },
      { sugerido: 0, proposto: 0, final: 0 },
    );
  }, [processos]);

  const [inlineOpen, setInlineOpen] = useState(false);
  const [inline, setInline] = useState<FormState>(emptyForm);

  const salvarInline = async () => {
    if (!inline.nome.trim()) return;
    await criar.mutateAsync({
      modelo: inline.modelo,
      nome: inline.nome.trim(),
      acordo_sugerido_valor: parseNum(inline.acordo_sugerido_valor),
      acordo_sugerido_texto: inline.acordo_sugerido_texto.trim() || null,
      acordo_proposto_valor: inline.sem_acordo ? null : parseNum(inline.acordo_proposto_valor),
      sem_acordo: inline.sem_acordo,
      valor_final: parseNum(inline.valor_final),
      status: inline.status,
    });
    setInline({ ...emptyForm, modelo: inline.modelo });
  };

  const onInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      salvarInline();
    } else if (e.key === 'Escape') {
      setInlineOpen(false);
    }
  };

  const abrirNovo = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const abrirEdicao = (p: ProcessoJustica) => {
    setEditingId(p.id);
    setForm({
      modelo: p.modelo,
      nome: p.nome,
      acordo_sugerido_valor:
        p.acordo_sugerido_valor !== null ? String(p.acordo_sugerido_valor) : '',
      acordo_sugerido_texto: p.acordo_sugerido_texto || '',
      acordo_proposto_valor:
        p.acordo_proposto_valor !== null ? String(p.acordo_proposto_valor) : '',
      sem_acordo: !!p.sem_acordo,
      valor_final: p.valor_final !== null ? String(p.valor_final) : '',
      status: p.status,
    });
    setDialogOpen(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    const payload = {
      modelo: form.modelo,
      nome: form.nome.trim(),
      acordo_sugerido_valor: parseNum(form.acordo_sugerido_valor),
      acordo_sugerido_texto: form.acordo_sugerido_texto.trim() || null,
      acordo_proposto_valor: form.sem_acordo ? null : parseNum(form.acordo_proposto_valor),
      sem_acordo: form.sem_acordo,
      valor_final: parseNum(form.valor_final),
      status: form.status,
    };
    if (editingId) {
      await atualizar.mutateAsync({ id: editingId, ...payload });
    } else {
      await criar.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const headerActions = (
    <Button onClick={abrirNovo} className="gap-2">
      <Plus className="w-4 h-4" />
      Novo Processo
    </Button>
  );

  return (
    <MinimalistLayout
      title="Processos Justiça"
      subtitle="Processos trabalhistas e judiciais da empresa"
      backPath="/direcao"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Processos Justiça' },
      ]}
      headerActions={headerActions}
      fullWidth
    >
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Processos', valor: String(processos.length) },
            { label: 'Acordo Sugerido', valor: formatBRL(totais.sugerido) },
            { label: 'Acordo Proposto', valor: formatBRL(totais.proposto) },
            { label: 'Valor Final', valor: formatBRL(totais.final) },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4"
            >
              <p className="text-[11px] uppercase tracking-wide text-white/40">{c.label}</p>
              <p className="text-lg font-semibold text-white mt-1">{c.valor}</p>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-500/10 text-white/70 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-4 py-3">Modelo</th>
                  <th className="text-left font-medium px-4 py-3">Nome</th>
                  <th className="text-right font-medium px-4 py-3">Acordo Sugerido</th>
                  <th className="text-right font-medium px-4 py-3">Acordo Proposto</th>
                  <th className="text-right font-medium px-4 py-3">Valor Final</th>
                  <th className="text-center font-medium px-4 py-3">Status</th>
                  <th className="text-center font-medium px-4 py-3">Atualizações</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!isLoading && processos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                      Nenhum processo cadastrado
                    </td>
                  </tr>
                )}
                {processos.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelecionado(p)}
                    className={`cursor-pointer border-t border-white/5 hover:bg-white/10 transition-colors ${
                      i % 2 === 1 ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] border ${
                          p.modelo === 'trabalhista'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-400/30'
                        }`}
                      >
                        {modeloLabel[p.modelo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{p.nome}</td>
                    <td className="px-4 py-3 text-right text-white/80">
                      {p.acordo_sugerido_valor !== null
                        ? formatBRL(p.acordo_sugerido_valor)
                        : p.acordo_sugerido_texto || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.sem_acordo ? (
                        <span className="text-red-300/80">Sem acordo</span>
                      ) : (
                        <span className="text-white/80">{formatBRL(p.acordo_proposto_valor)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      {formatBRL(p.valor_final)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] border ${
                          p.status === 'encerrado'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                            : 'bg-orange-500/15 text-orange-300 border-orange-400/30'
                        }`}
                      >
                        {statusLabel[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white/60">
                      {p.atualizacoes_count || 0}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirEdicao(p);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Excluir este processo e suas atualizações?')) {
                            excluir.mutate(p.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {inlineOpen ? (
                  <tr className="border-t border-blue-400/30 bg-blue-500/[0.06]">
                    <td className="px-2 py-2">
                      <Select
                        value={inline.modelo}
                        onValueChange={(v) =>
                          setInline((f) => ({ ...f, modelo: v as ProcessoModelo }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trabalhista">Trabalhista</SelectItem>
                          <SelectItem value="judicial">Judicial</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        autoFocus
                        value={inline.nome}
                        onChange={(e) => setInline((f) => ({ ...f, nome: e.target.value }))}
                        onKeyDown={onInlineKeyDown}
                        placeholder="Nome do processo / parte"
                        className="h-8 text-xs bg-white/5 border-white/10"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        inputMode="decimal"
                        value={inline.acordo_sugerido_valor}
                        onChange={(e) =>
                          setInline((f) => ({ ...f, acordo_sugerido_valor: e.target.value }))
                        }
                        onKeyDown={onInlineKeyDown}
                        placeholder="0,00"
                        className="h-8 text-xs text-right bg-white/5 border-white/10"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          inputMode="decimal"
                          disabled={inline.sem_acordo}
                          value={inline.sem_acordo ? '' : inline.acordo_proposto_valor}
                          onChange={(e) =>
                            setInline((f) => ({ ...f, acordo_proposto_valor: e.target.value }))
                          }
                          onKeyDown={onInlineKeyDown}
                          placeholder={inline.sem_acordo ? 'Sem acordo' : '0,00'}
                          className="h-8 text-xs text-right bg-white/5 border-white/10"
                        />
                        <button
                          type="button"
                          title="Sem acordo"
                          onClick={() => setInline((f) => ({ ...f, sem_acordo: !f.sem_acordo }))}
                          className={`shrink-0 px-2 h-8 rounded-md text-[10px] border transition-colors ${
                            inline.sem_acordo
                              ? 'bg-red-500/20 text-red-300 border-red-400/30'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}
                        >
                          S/A
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        inputMode="decimal"
                        value={inline.valor_final}
                        onChange={(e) => setInline((f) => ({ ...f, valor_final: e.target.value }))}
                        onKeyDown={onInlineKeyDown}
                        placeholder="0,00"
                        className="h-8 text-xs text-right bg-white/5 border-white/10"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={inline.status}
                        onValueChange={(v) =>
                          setInline((f) => ({ ...f, status: v as ProcessoStatus }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="encerrado">Encerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2 text-center text-white/30 text-xs">—</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        className="h-8 px-2"
                        onClick={salvarInline}
                        disabled={!inline.nome.trim() || criar.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => setInlineOpen(false)}
                      >
                        <X className="w-4 h-4 text-white/50" />
                      </Button>
                    </td>
                  </tr>
                ) : (
                  <tr
                    className="border-t border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors"
                    onClick={() => {
                      setInline(emptyForm);
                      setInlineOpen(true);
                    }}
                  >
                    <td colSpan={8} className="px-4 py-3 text-xs text-white/40">
                      <span className="inline-flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar linha rapidamente
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
              {processos.length > 0 && (
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/[0.04] font-medium text-white">
                    <td className="px-4 py-3" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right">{formatBRL(totais.sugerido)}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(totais.proposto)}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(totais.final)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-4 h-4" />
              {editingId ? 'Editar Processo' : 'Novo Processo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={form.modelo}
                  onValueChange={(v) => setForm((f) => ({ ...f, modelo: v as ProcessoModelo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trabalhista">Trabalhista</SelectItem>
                    <SelectItem value="judicial">Judicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProcessoStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do processo / parte"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Acordo Sugerido (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.acordo_sugerido_valor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, acordo_sugerido_valor: e.target.value }))
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Observação do sugerido</Label>
                <Input
                  value={form.acordo_sugerido_texto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, acordo_sugerido_texto: e.target.value }))
                  }
                  placeholder="Texto (opcional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Acordo Proposto (R$)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sem acordo</span>
                  <Switch
                    checked={form.sem_acordo}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, sem_acordo: v }))}
                  />
                </div>
              </div>
              <Input
                inputMode="decimal"
                disabled={form.sem_acordo}
                value={form.sem_acordo ? '' : form.acordo_proposto_valor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, acordo_proposto_valor: e.target.value }))
                }
                placeholder={form.sem_acordo ? 'Sem acordo' : '0,00'}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Final (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.valor_final}
                onChange={(e) => setForm((f) => ({ ...f, valor_final: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!form.nome.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes + atualizações */}
      <ProcessoDetalhesSheet
        processo={selecionado}
        onOpenChange={(open) => !open && setSelecionado(null)}
        autorNome={userRole?.nome || null}
      />
    </MinimalistLayout>
  );
}

function ProcessoDetalhesSheet({
  processo,
  onOpenChange,
  autorNome,
}: {
  processo: ProcessoJustica | null;
  onOpenChange: (open: boolean) => void;
  autorNome: string | null;
}) {
  const { atualizacoes, adicionar, excluir } = useProcessoAtualizacoes(processo?.id);
  const [comentario, setComentario] = useState('');

  const enviar = async () => {
    if (!comentario.trim()) return;
    await adicionar.mutateAsync({ comentario: comentario.trim(), autorNome });
    setComentario('');
  };

  return (
    <Sheet open={!!processo} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{processo?.nome}</SheetTitle>
        </SheetHeader>

        {processo && (
          <div className="space-y-5 mt-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Modelo" value={modeloLabel[processo.modelo]} />
              <Info label="Status" value={statusLabel[processo.status]} />
              <Info
                label="Acordo Sugerido"
                value={
                  processo.acordo_sugerido_valor !== null
                    ? formatBRL(processo.acordo_sugerido_valor)
                    : processo.acordo_sugerido_texto || '—'
                }
              />
              <Info
                label="Acordo Proposto"
                value={processo.sem_acordo ? 'Sem acordo' : formatBRL(processo.acordo_proposto_valor)}
              />
              <Info label="Valor Final" value={formatBRL(processo.valor_final)} />
              <Info
                label="Cadastrado em"
                value={format(new Date(processo.created_at), "dd/MM/yyyy", { locale: ptBR })}
              />
            </div>

            {processo.acordo_sugerido_valor !== null && processo.acordo_sugerido_texto && (
              <p className="text-xs text-muted-foreground">{processo.acordo_sugerido_texto}</p>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                Nova atualização
              </Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Descreva o andamento do processo..."
                rows={3}
              />
              <Button
                onClick={enviar}
                disabled={!comentario.trim() || adicionar.isPending}
                className="w-full"
              >
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Atualizações ({atualizacoes.length})
              </p>
              {atualizacoes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
              )}
              {atualizacoes.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {a.autor_nome ? ` · ${a.autor_nome}` : ''}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => excluir.mutate(a.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{a.comentario}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
