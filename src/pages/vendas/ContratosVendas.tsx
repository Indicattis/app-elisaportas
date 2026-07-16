import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSignature, Search, Download, Trash2, FileText, FileClock, FileCheck2, Upload, Loader2, Undo2, Eye, ArrowRight, FileX } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContratosVendas } from '@/hooks/useContratosVendas';
import { isVendaFaturada } from '@/lib/faturamentoStatus';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { GerarContratoElisaModal } from '@/components/contratos/GerarContratoElisaModal';
import { GerarContratoAvulsoModal } from '@/components/contratos/GerarContratoAvulsoModal';
import { AnexarContratoModal } from '@/components/vendas/AnexarContratoModal';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
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
  contrato_liberado_faturamento: boolean | null;
  contrato_dispensado?: boolean | null;
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

interface ContratosVendasProps {
  scope?: 'all' | 'meus';
}

export default function ContratosVendas({ scope = 'all' }: ContratosVendasProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMeus = scope === 'meus';
  const backPath = isMeus ? '/vendas' : '/direcao/vendas';
  const breadcrumbItems = isMeus
    ? [
        { label: 'Home', path: '/home' },
        { label: 'Vendas', path: '/vendas' },
        { label: 'Meus Contratos' },
      ]
    : [
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Vendas', path: '/direcao/vendas' },
        { label: 'Contratos' },
      ];
  const pageTitle = isMeus ? 'Meus Contratos' : 'Contratos';
  const pageSubtitle = isMeus
    ? 'Acompanhe o ciclo de contratos das suas vendas.'
    : 'Acompanhe o ciclo de contratos de cada venda.';
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
  const [dispensarVenda, setDispensarVenda] = useState<VendaRow | null>(null);
  const [dispensandoId, setDispensandoId] = useState<string | null>(null);
  const [avulsoOpen, setAvulsoOpen] = useState(false);
  const [liberarVenda, setLiberarVenda] = useState<VendaRow | null>(null);

  const { contratos, deleteContrato, isDeleting } = useContratosVendas({});

  type TabKey = 'pendentes' | 'gerados' | 'assinados' | 'liberadas';
  const [activeTab, setActiveTab] = useState<TabKey>('pendentes');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingVendas(true);
      let query = supabase
        .from('vendas')
        .select('id, cliente_nome, cpf_cliente, cidade, data_venda, valor_venda, atendente_id, contrato_url, contrato_assinado_em, contrato_liberado_faturamento, contrato_dispensado, frete_aprovado, produtos_vendas(faturamento), pedidos_producao(id)')
        .eq('is_rascunho', false)
        .eq('contrato_dispensado', false)
        .eq('dispensada_sistema', false)
        .neq('status_aprovacao', 'reprovado')
        // Mostra liberadas somente se ainda estiverem "presas" (sem contrato/dispensa)
        .or('contrato_liberado_faturamento.eq.false,contrato_url.is.null')
        .order('data_venda', { ascending: false })
        .limit(5000);

      if (isMeus) {
        if (!user?.id) {
          setVendas([]);
          setLoadingVendas(false);
          return;
        }
        query = query.eq('atendente_id', user.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        const filtered = (data as any[]).filter((v) => {
          // Aligne com Gestão de Fábrica: oculta vendas já faturadas ou com pedido vinculado
          if (isVendaFaturada(v)) return false;
          if ((v.pedidos_producao || []).length > 0) return false;
          if (v.contrato_url === 'legado') return false;
          return true;
        });
        const rows = filtered as any as VendaRow[];
        setVendas(rows);

        const atendenteIds = Array.from(
          new Set(rows.map(r => r.atendente_id).filter(Boolean) as string[])
        );
        const vendaIds = rows.map(r => r.id);

        const [vendRes, balRes] = await Promise.all([
          atendenteIds.length
            ? supabase
                .from('admin_users')
                .select('id, user_id, nome, foto_perfil_url')
                .or(`id.in.(${atendenteIds.join(',')}),user_id.in.(${atendenteIds.join(',')})`)
            : Promise.resolve({ data: [] as any[] }),
          vendaIds.length
            ? supabase
                .from('vendas_balanco_desconto')
                .select('venda_id, desconto_dado, tipo')
                .in('venda_id', vendaIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const vMap: Record<string, VendedorInfo> = {};
        (vendRes.data || []).forEach((v: any) => {
          if (v.id) vMap[v.id] = v;
          if (v.user_id) vMap[v.user_id] = v;
        });
        setVendedores(vMap);

        const bMap: Record<string, BalancoInfo> = {};
        (balRes.data || []).forEach((b: any) => {
          bMap[b.venda_id] = { desconto_dado: b.desconto_dado, tipo: b.tipo };
        });
        setBalancos(bMap);
      }
      setLoadingVendas(false);
    })();
  }, [user, refreshKey, isMeus]);

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

  const { pendentes, gerados, assinados, liberadas } = useMemo(() => {
    const pendentes: VendaRow[] = [];
    const gerados: VendaRow[] = [];
    const assinados: VendaRow[] = [];
    const liberadas: VendaRow[] = [];
    vendas.filter(matchesSearch).forEach(v => {
      const hasContratoUrl = !!v.contrato_url && v.contrato_url !== 'legado';
      const hasGerado = ((contratosByVenda as any)[v.id] || []).length > 0;
      const isLiberada = !!v.contrato_liberado_faturamento && !hasContratoUrl && !v.contrato_dispensado;
      if (isLiberada) liberadas.push(v);
      else if (hasContratoUrl) assinados.push(v);
      else if (hasGerado) gerados.push(v);
      else pendentes.push(v);
    });
    return { pendentes, gerados, assinados, liberadas };
  }, [vendas, contratosByVenda, search]);

  const renderContratoFiles = (vendaId: string, allowDelete: boolean) => {
    const vContratos = (contratosByVenda as any)[vendaId] || [];
    if (vContratos.length === 0) return null;
    return (
      <>
        {vContratos.map((c: any) => (
          <div key={c.id} className="contents">
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
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
      </>
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
        .update({ contrato_url: null, contrato_assinado_em: null, contrato_liberado_faturamento: false })
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

  const handleLiberarFaturamento = async (v: VendaRow) => {
    setRevertingVendaId(v.id);
    const { error } = await supabase
      .from('vendas')
      .update({
        contrato_liberado_faturamento: true,
        contrato_liberado_em: new Date().toISOString(),
        contrato_liberado_por: user?.id ?? null,
      })
      .eq('id', v.id);
    setRevertingVendaId(null);
    if (error) {
      toast.error('Erro ao liberar venda');
      return;
    }
    setVendas(prev => prev.filter(x => x.id !== v.id));
    toast.success('Venda liberada para Pend. Faturamento');
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

  const VendedorAvatar = ({ vendedor }: { vendedor: VendedorInfo | undefined }) => {
    const initials = (vendedor?.nome || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const [imgError, setImgError] = useState(false);
    return (
      <div className="h-7 w-7 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/70">
        {vendedor?.foto_perfil_url && !imgError ? (
          <img
            src={vendedor.foto_perfil_url}
            alt={vendedor?.nome || ''}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  };

  const renderVendedor = (atendenteId: string | null) => {
    if (!atendenteId) return <span className="text-white/30">—</span>;
    const v = vendedores[atendenteId];
    return (
      <div className="flex items-center gap-2 min-w-0">
        <VendedorAvatar vendedor={v} />
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
            {!isMeus && <th className="px-3 py-2 font-medium">Vendedor</th>}
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">CPF/CNPJ</th>
            <th className="px-3 py-2 font-medium">Cidade</th>
            <th className="px-3 py-2 font-medium text-right">Valor</th>
            <th className="px-3 py-2 font-medium text-right">Desc./Acréscimo</th>
            {(onAction || extraRow) && <th className="px-3 py-2 font-medium text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(v => (
            <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors align-middle">
              {!isMeus && <td className="px-3 py-2">{renderVendedor(v.atendente_id)}</td>}
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
              {(onAction || extraRow) && (
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                    {extraRow?.(v)}
                    {onAction && ActionIcon && (
                      <Button
                        size="icon"
                        className={actionClass}
                        disabled={generatingVendaId === v.id || revertingVendaId === v.id}
                        onClick={() => onAction(v)}
                        title={actionLabel}
                      >
                        {generatingVendaId === v.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ActionIcon className="w-4 h-4" />
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
        items={breadcrumbItems}
        mounted={mounted}
      />

      <button
        onClick={() => navigate(backPath)}
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
            <h1 className="text-2xl font-semibold text-white">{pageTitle}</h1>
            <p className="text-sm text-white/60">{pageSubtitle}</p>
          </div>
          {!isMeus && (
            <div className="ml-auto">
              <Button
                onClick={() => setAvulsoOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Gerar Contrato Avulso
              </Button>
            </div>
          )}
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
                    extraRow={(v) => (
                      <Button
                        size="icon"
                        variant="outline"
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30"
                        title="Dispensar Contrato"
                        disabled={dispensandoId === v.id || generatingVendaId === v.id}
                        onClick={() => setDispensarVenda(v)}
                      >
                        {dispensandoId === v.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileX className="w-4 h-4" />
                        )}
                      </Button>
                    )}
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
                      <>
                        {renderContratoFiles(v.id, true)}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                          disabled={revertingVendaId === v.id}
                          onClick={() => handleRetornarParaPendente(v)}
                          title="Retornar para Pendente"
                        >
                          {revertingVendaId === v.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Undo2 className="w-4 h-4" />
                          )}
                        </Button>
                      </>
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
                    actionLabel={isMeus ? undefined : "Liberar para Pend. Faturamento"}
                    actionIcon={isMeus ? undefined : ArrowRight}
                    actionClass="bg-gradient-to-r from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 text-white border border-yellow-400/30"
                    onAction={isMeus ? undefined : (v) => setLiberarVenda(v)}
                    extraRow={(v) => (
                      <>
                        {renderContratoFiles(v.id, false)}
                        {v.contrato_url && v.contrato_url !== 'legado' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 border border-emerald-400/30"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('contratos-vendas')
                                .createSignedUrl(v.contrato_url as string, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
                              else toast.error('Não foi possível abrir o contrato assinado');
                            }}
                            title="Visualizar contrato assinado"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {v.contrato_url && v.contrato_url !== 'legado' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 border border-white/10"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('contratos-vendas')
                                .createSignedUrl(v.contrato_url as string, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}
                            title="Baixar contrato assinado"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {v.contrato_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                            disabled={revertingVendaId === v.id}
                            onClick={() => handleRetornarParaGerado(v)}
                            title="Retornar para Gerado"
                          >
                            {revertingVendaId === v.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Undo2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </>
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

      <GerarContratoAvulsoModal open={avulsoOpen} onOpenChange={setAvulsoOpen} />

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

      <AlertDialog
        open={!!dispensarVenda}
        onOpenChange={(o) => { if (!o && !dispensandoId) setDispensarVenda(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispensar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda de <strong>{dispensarVenda?.cliente_nome || 'cliente'}</strong> será enviada para <strong>Pendente de Faturamento</strong> sem contrato assinado. Esta ação ficará registrada e pode ser revertida pela equipe administrativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!dispensandoId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!dispensandoId}
              onClick={async (e) => {
                e.preventDefault();
                if (!dispensarVenda) return;
                setDispensandoId(dispensarVenda.id);
                const { error } = await supabase
                  .from('vendas')
                  .update({
                    contrato_dispensado: true,
                    contrato_dispensado_em: new Date().toISOString(),
                    contrato_dispensado_por: user?.id ?? null,
                    contrato_liberado_faturamento: true,
                    contrato_liberado_em: new Date().toISOString(),
                    contrato_liberado_por: user?.id ?? null,
                  })
                  .eq('id', dispensarVenda.id);
                setDispensandoId(null);
                if (error) {
                  toast.error('Erro ao dispensar contrato');
                  return;
                }
                setVendas((prev) => prev.filter((x) => x.id !== dispensarVenda.id));
                setDispensarVenda(null);
                toast.success('Contrato dispensado. Venda enviada para Pendente de Faturamento.');
              }}
            >
              {dispensandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Dispensar contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!liberarVenda}
        onOpenChange={(o) => { if (!o && !revertingVendaId) setLiberarVenda(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar para Pend. Faturamento?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda de <strong>{liberarVenda?.cliente_nome || 'cliente'}</strong>
              {liberarVenda?.valor_venda ? <> no valor de <strong>{formatCurrency(liberarVenda.valor_venda)}</strong></> : null}
              {' '}será movida para <strong>Pend. Faturamento</strong> na Gestão de Pedidos. Confirma a liberação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!revertingVendaId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!revertingVendaId}
              onClick={async (e) => {
                e.preventDefault();
                if (!liberarVenda) return;
                const v = liberarVenda;
                await handleLiberarFaturamento(v);
                setLiberarVenda(null);
              }}
            >
              {revertingVendaId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar liberação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}