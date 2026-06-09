import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSignature, Search, Download, Trash2, FileText, FileClock, FileCheck2, Upload, Loader2, Undo2, Eye, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContratosVendas } from '@/hooks/useContratosVendas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { GerarContratoElisaModal } from '@/components/contratos/GerarContratoElisaModal';
import { AnexarContratoModal } from '@/components/vendas/AnexarContratoModal';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

interface VendaRow {
  id: string;
  cliente_nome: string | null;
  cpf_cliente: string | null;
  cidade: string | null;
  data_venda: string;
  valor_venda: number | null;
  contrato_url: string | null;
  contrato_assinado_em: string | null;
  atendente_id: string | null;
}

interface VendedorInfo {
  id: string;
  nome: string | null;
  foto_perfil_url: string | null;
}

interface BalancoInfo {
  desconto_dado: number | null;
  tipo: string | null;
}

export default function ContratosVendas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(true);
  const [vendedores, setVendedores] = useState<Record<string, VendedorInfo>>({});
  const [balancos, setBalancos] = useState<Record<string, BalancoInfo>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null);
  const [anexarOpen, setAnexarOpen] = useState(false);
  const [anexarVenda, setAnexarVenda] = useState<{ id: string; nome: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [generatingVendaId, setGeneratingVendaId] = useState<string | null>(null);
  const [revertingVendaId, setRevertingVendaId] = useState<string | null>(null);

  const { contratos, deleteContrato, isDeleting } = useContratosVendas({});

  type TabKey = 'pendentes' | 'gerados' | 'assinados';
  const [activeTab, setActiveTab] = useState<TabKey>('pendentes');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingVendas(true);
      const query = supabase
        .from('vendas')
        .select('id, cliente_nome, cpf_cliente, cidade, data_venda, valor_venda, atendente_id, contrato_url, contrato_assinado_em')
        .eq('is_rascunho', false)
        .eq('contrato_dispensado', false)
        .neq('status_aprovacao', 'reprovado')
        .order('data_venda', { ascending: false })
        .limit(5000);

      const { data, error } = await query;
      if (!error && data) {
        const rows = data as any as VendaRow[];
        setVendas(rows);

        const atendenteIds = Array.from(
          new Set(rows.map(r => r.atendente_id).filter(Boolean) as string[])
        );
        const vendaIds = rows.map(r => r.id);

        const [vendRes, balRes] = await Promise.all([
          atendenteIds.length
            ? supabase
                .from('admin_users')
                .select('id, nome, foto_perfil_url')
                .in('id', atendenteIds)
            : Promise.resolve({ data: [] as any[] }),
          vendaIds.length
            ? supabase
                .from('vendas_balanco_desconto')
                .select('venda_id, desconto_dado, tipo')
                .in('venda_id', vendaIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const vMap: Record<string, VendedorInfo> = {};
        (vendRes.data || []).forEach((v: any) => { vMap[v.id] = v; });
        setVendedores(vMap);

        const bMap: Record<string, BalancoInfo> = {};
        (balRes.data || []).forEach((b: any) => {
          bMap[b.venda_id] = { desconto_dado: b.desconto_dado, tipo: b.tipo };
        });
        setBalancos(bMap);
      }
      setLoadingVendas(false);
    })();
  }, [user, refreshKey]);

  const contratosByVenda = useMemo(() => {
    const map: Record<string, typeof contratos extends (infer T)[] | undefined ? T[] : never> = {} as any;
    (contratos || []).forEach(c => {
      (map[c.venda_id] ||= [] as any).push(c);
    });
    return map;
  }, [contratos]);

  const matchesSearch = (v: VendaRow) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [v.cliente_nome, v.cpf_cliente, v.cidade].some(f =>
      (f || '').toLowerCase().includes(term)
    );
  };

  const { pendentes, gerados, assinados } = useMemo(() => {
    const pendentes: VendaRow[] = [];
    const gerados: VendaRow[] = [];
    const assinados: VendaRow[] = [];
    vendas.filter(matchesSearch).forEach(v => {
      const hasContratoUrl = !!v.contrato_url && v.contrato_url !== 'legado';
      const hasGerado = ((contratosByVenda as any)[v.id] || []).length > 0;
      if (hasContratoUrl) assinados.push(v);
      else if (hasGerado) gerados.push(v);
      else pendentes.push(v);
    });
    return { pendentes, gerados, assinados };
  }, [vendas, contratosByVenda, search]);

  const renderContratoFiles = (vendaId: string, allowDelete: boolean) => {
    const vContratos = (contratosByVenda as any)[vendaId] || [];
    if (vContratos.length === 0) return null;
    return (
      <div className="mt-3 space-y-1.5">
        {vContratos.map((c: any) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-white/50 shrink-0" />
              <span className="text-xs text-white/80 truncate">{c.nome_arquivo}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => window.open(c.arquivo_url, '_blank', 'noopener,noreferrer')}
                title="Visualizar"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = c.arquivo_url;
                  a.download = c.nome_arquivo || 'contrato.pdf';
                  a.target = '_blank';
                  a.rel = 'noopener noreferrer';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
                title="Baixar"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              {allowDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-300/70 hover:text-red-300 hover:bg-red-500/10"
                  disabled={isDeleting}
                  onClick={() => {
                    if (confirm('Excluir este contrato?')) deleteContrato(c.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleRetornarParaPendente = async (v: VendaRow) => {
    const vContratos = (contratosByVenda as any)[v.id] || [];
    if (vContratos.length === 0) return;
    if (!confirm('Isso excluirá o(s) contrato(s) gerado(s) e retornará a venda para Pendente. Continuar?')) return;
    setRevertingVendaId(v.id);
    try {
      await Promise.all(
        vContratos.map(
          (c: any) =>
            new Promise<void>((resolve, reject) => {
              deleteContrato(c.id, {
                onSuccess: () => resolve(),
                onError: (err: any) => reject(err),
              } as any);
            })
        )
      );
      setRefreshKey(k => k + 1);
      toast.success('Venda retornou para Pendente');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao retornar venda');
    } finally {
      setRevertingVendaId(null);
    }
  };

  const handleRetornarParaGerado = async (v: VendaRow) => {
    if (!v.contrato_url) return;
    if (!confirm('Isso removerá o contrato assinado e retornará a venda para Contrato Gerado. Continuar?')) return;
    setRevertingVendaId(v.id);
    try {
      if (v.contrato_url !== 'legado') {
        await supabase.storage.from('contratos-vendas').remove([v.contrato_url]);
      }
      const { error } = await supabase
        .from('vendas')
        .update({ contrato_url: null, contrato_assinado_em: null })
        .eq('id', v.id);
      if (error) throw error;
      setRefreshKey(k => k + 1);
      toast.success('Venda retornou para Contrato Gerado');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao retornar venda');
    } finally {
      setRevertingVendaId(null);
    }
  };

  const renderDescontoAcrescimo = (vendaId: string) => {
    const b = balancos[vendaId];
    if (!b || !b.desconto_dado || b.tipo === 'neutro') {
      return <span className="text-white/30">—</span>;
    }
    const valor = Math.abs(Number(b.desconto_dado) || 0);
    if (b.tipo === 'positivo') {
      return <span className="text-emerald-300">+ {formatCurrency(valor)}</span>;
    }
    return <span className="text-rose-300">- {formatCurrency(valor)}</span>;
  };

  const renderVendedor = (atendenteId: string | null) => {
    if (!atendenteId) return <span className="text-white/30">—</span>;
    const v = vendedores[atendenteId];
    const initials = (v?.nome || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/70">
          {v?.foto_perfil_url ? (
            <img src={v.foto_perfil_url} alt={v?.nome || ''} className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span className="text-xs text-white/70 truncate max-w-[140px]">{v?.nome || '—'}</span>
      </div>
    );
  };

  const TableView = ({
    rows,
    actionLabel,
    actionClass,
    actionIcon: ActionIcon,
    onAction,
    extraRow,
  }: {
    rows: VendaRow[];
    actionLabel?: string;
    actionClass?: string;
    actionIcon?: typeof FileSignature;
    onAction?: (v: VendaRow) => void;
    extraRow?: (v: VendaRow) => React.ReactNode;
  }) => (
    <div className="overflow-x-auto rounded-lg border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-white/40 border-b border-white/10">
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">CPF/CNPJ</th>
            <th className="px-3 py-2 font-medium">Cidade</th>
            <th className="px-3 py-2 font-medium text-right">Valor</th>
            <th className="px-3 py-2 font-medium text-right">Desc./Acréscimo</th>
            <th className="px-3 py-2 font-medium">Vendedor</th>
            {(onAction || extraRow) && <th className="px-3 py-2 font-medium text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(v => (
            <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors align-middle">
              <td className="px-3 py-2 text-white/80 whitespace-nowrap">
                {format(new Date(v.data_venda), 'dd/MM/yyyy', { locale: ptBR })}
              </td>
              <td className="px-3 py-2 text-white font-medium max-w-[220px] truncate">
                {v.cliente_nome || 'Sem nome'}
              </td>
              <td className="px-3 py-2 text-white/70 whitespace-nowrap">{v.cpf_cliente || '—'}</td>
              <td className="px-3 py-2 text-white/70 max-w-[160px] truncate">{v.cidade || '—'}</td>
              <td className="px-3 py-2 text-right text-blue-300 whitespace-nowrap">
                {formatCurrency(v.valor_venda || 0)}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">{renderDescontoAcrescimo(v.id)}</td>
              <td className="px-3 py-2">{renderVendedor(v.atendente_id)}</td>
              {(onAction || extraRow) && (
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    {extraRow?.(v)}
                    {onAction && ActionIcon && (
                      <Button
                        size="sm"
                        className={actionClass}
                        disabled={generatingVendaId === v.id || revertingVendaId === v.id}
                        onClick={() => onAction(v)}
                      >
                        {generatingVendaId === v.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <ActionIcon className="w-4 h-4 mr-2" />
                            {actionLabel}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const Column = ({
    title,
    icon,
    accent,
    count,
    children,
  }: {
    title: string;
    icon: React.ReactNode;
    accent: string;
    count: number;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className={`p-1.5 rounded-lg ${accent} text-white`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
        </div>
        <span className="text-xs text-white/60 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          {count}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {children}
      </div>
    </div>
  );

  const TABS: Array<{ key: TabKey; label: string; icon: typeof FileClock; count: number }> = [
    { key: 'pendentes', label: 'Pendente de Contrato', icon: FileClock, count: pendentes.length },
    { key: 'gerados', label: 'Contrato Gerado', icon: FileText, count: gerados.length },
    { key: 'assinados', label: 'Contrato Assinado', icon: FileCheck2, count: assinados.length },
  ];
  const activeIndex = Math.max(0, TABS.findIndex(t => t.key === activeTab));
  const cols = TABS.length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Contratos' },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/vendas')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 mx-auto px-[100px] pt-24 pb-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
            <FileSignature className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Contratos</h1>
            <p className="text-sm text-white/60">
              Acompanhe o ciclo de contratos de cada venda.
            </p>
          </div>
        </div>

        <div className="mb-4 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-2 px-3">
            <Search className="w-4 h-4 text-white/50" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, CPF/CNPJ ou cidade..."
              className="border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <div
            className="relative inline-grid rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(200px, 1fr))` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition-transform duration-300 ease-out"
              style={{
                width: `calc((100% - 0.5rem) / ${cols})`,
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={
                    'relative z-10 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors duration-200 ' +
                    (isActive ? 'text-white' : 'text-white/70 hover:text-white')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  <span className={
                    'ml-1 text-[11px] px-1.5 py-0.5 rounded-full border ' +
                    (isActive ? 'bg-white/15 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/60')
                  }>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loadingVendas ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-16 bg-white/5" />
            ))}
          </div>
        ) : (
          <div key={activeTab} className="animate-fade-in">
            {activeTab === 'pendentes' && (
              <Column
                title="Pendente de Contrato"
                icon={<FileClock className="w-4 h-4" strokeWidth={1.8} />}
                accent="bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20"
                count={pendentes.length}
              >
                {pendentes.length === 0 ? (
                  <div className="text-center text-white/40 text-xs py-6">Nenhuma venda</div>
                ) : (
                  <TableView
                    rows={pendentes}
                    actionLabel="Gerar Contrato"
                    actionIcon={FileSignature}
                    actionClass="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border border-blue-400/30"
                    onAction={(v) => {
                      setSelectedVendaId(v.id);
                      setGeneratingVendaId(v.id);
                      setModalOpen(true);
                    }}
                  />
                )}
              </Column>
            )}

            {activeTab === 'gerados' && (
              <Column
                title="Contrato Gerado"
                icon={<FileText className="w-4 h-4" strokeWidth={1.8} />}
                accent="bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20"
                count={gerados.length}
              >
                {gerados.length === 0 ? (
                  <div className="text-center text-white/40 text-xs py-6">Nenhuma venda</div>
                ) : (
                  <TableView
                    rows={gerados}
                    actionLabel="Anexar Assinado"
                    actionIcon={Upload}
                    actionClass="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border border-emerald-400/30"
                    onAction={(v) => {
                      setAnexarVenda({ id: v.id, nome: v.cliente_nome || 'Sem nome' });
                      setAnexarOpen(true);
                    }}
                    extraRow={(v) => (
                      <div className="space-y-1.5 w-full">
                        {renderContratoFiles(v.id, true)}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                          disabled={revertingVendaId === v.id}
                          onClick={() => handleRetornarParaPendente(v)}
                        >
                          {revertingVendaId === v.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Undo2 className="w-4 h-4 mr-2" />
                          )}
                          Retornar para Pendente
                        </Button>
                      </div>
                    )}
                  />
                )}
              </Column>
            )}

            {activeTab === 'assinados' && (
              <Column
                title="Contrato Assinado"
                icon={<FileCheck2 className="w-4 h-4" strokeWidth={1.8} />}
                accent="bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20"
                count={assinados.length}
              >
                {assinados.length === 0 ? (
                  <div className="text-center text-white/40 text-xs py-6">Nenhuma venda</div>
                ) : (
                  <TableView
                    rows={assinados}
                    extraRow={(v) => (
                      <div className="space-y-1.5">
                        {v.contrato_assinado_em && (
                          <div className="text-[11px] text-emerald-300/80 flex items-center gap-1 justify-end">
                            <FileCheck2 className="w-3 h-3" />
                            Assinado em {format(new Date(v.contrato_assinado_em), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        )}
                        {renderContratoFiles(v.id, false)}
                        {v.contrato_url && v.contrato_url !== 'legado' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-white/80 hover:text-white hover:bg-white/10 border border-white/10"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('contratos-vendas')
                                .createSignedUrl(v.contrato_url as string, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar contrato assinado
                          </Button>
                        )}
                        {v.contrato_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                            disabled={revertingVendaId === v.id}
                            onClick={() => handleRetornarParaGerado(v)}
                          >
                            {revertingVendaId === v.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Undo2 className="w-4 h-4 mr-2" />
                            )}
                            Retornar para Gerado
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 text-white border border-yellow-400/30"
                          onClick={() => navigate(`/financeiro/faturamento/${v.id}`)}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Avançar para Pend. Faturamento
                        </Button>
                      </div>
                    )}
                  />
                )}
              </Column>
            )}
          </div>
        )}
      </div>

      <GerarContratoElisaModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setGeneratingVendaId(null);
        }}
        vendaId={selectedVendaId}
        onGerado={() => {
          setRefreshKey(k => k + 1);
          setActiveTab('gerados');
          setGeneratingVendaId(null);
        }}
      />

      {anexarVenda && (
        <AnexarContratoModal
          open={anexarOpen}
          onOpenChange={(o) => {
            setAnexarOpen(o);
            if (!o) {
              setAnexarVenda(null);
              setRefreshKey(k => k + 1);
            }
          }}
          vendaId={anexarVenda.id}
          clienteNome={anexarVenda.nome}
        />
      )}
    </div>
  );
}